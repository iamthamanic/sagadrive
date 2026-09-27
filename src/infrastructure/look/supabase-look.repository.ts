/**
 * supabase-look.repository — owner-scoped LookProfile CRUD + append-only versions (#340).
 * Owner always from authenticated session. RLS remains authority.
 * Location: src/infrastructure/look/supabase-look.repository.ts
 */

import {
  normalizeLookProfileWriteDraft,
  type AppendLookProfileVersionInput,
  type CreateLookProfileInput,
  type DuplicateLookProfileInput,
  type LookProfileRecord,
  type LookProfileRepository,
  type LookProfileVersion,
  type LookProfileWriteDraft,
} from '../../domains/look';
import { getAuthenticatedUserId } from '../../lib/authenticatedUser';
import { raceWithTimeoutReject, SUPABASE_QUERY_TIMEOUT_MS } from '../../lib/networkTimeout';
import { supabase } from '../../lib/supabase';
import {
  LOOK_PROFILE_COLUMNS,
  LOOK_PROFILE_VERSION_COLUMNS,
  mapLookProfileRecord,
  mapLookProfileVersionRow,
  resolveOwnerScope,
  toPersistedVersionInsert,
  type LookProfileDto,
  type LookProfileVersionDto,
} from './look.persistence';

const PROFILES = 'look_profiles';
const VERSIONS = 'look_profile_versions';

function newLookProfileId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `look:${rand}`;
}

function assertProfileId(profileId: string): string {
  const trimmed = profileId.trim();
  if (trimmed.length < 8 || trimmed.length > 160) {
    throw new Error('Ungültige LookProfile-ID.');
  }
  return trimmed;
}

function requireDraft(raw: unknown): LookProfileWriteDraft {
  const normalized = normalizeLookProfileWriteDraft(raw);
  if (normalized.ok === false) {
    throw new Error(normalized.error.message);
  }
  return normalized.draft;
}

export class SupabaseLookProfileRepository implements LookProfileRepository {
  async listProfiles(options?: {
    includeArchived?: boolean;
  }): Promise<LookProfileRecord[]> {
    await getAuthenticatedUserId();
    let query = supabase.from(PROFILES).select(LOOK_PROFILE_COLUMNS);
    if (!options?.includeArchived) {
      query = query.eq('status', 'active');
    }
    const { data, error } = await raceWithTimeoutReject(
      query.order('updated_at', { ascending: false }),
      SUPABASE_QUERY_TIMEOUT_MS,
      'LookProfiles konnten nicht geladen werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`LookProfiles konnten nicht geladen werden: ${error.message}`);
    }
    const rows = (data ?? []) as LookProfileDto[];
    const out: LookProfileRecord[] = [];
    for (const row of rows) {
      const record = await this.loadRecord(row.id);
      if (record) out.push(record);
    }
    return out;
  }

  async getProfileById(profileId: string): Promise<LookProfileRecord | null> {
    await getAuthenticatedUserId();
    return this.loadRecord(assertProfileId(profileId));
  }

  async createProfile(input: CreateLookProfileInput): Promise<LookProfileRecord> {
    const userId = await getAuthenticatedUserId();
    const draft = requireDraft(input.draft);
    const profileId = newLookProfileId();
    const ownerScope = resolveOwnerScope(draft);
    const createdAt = new Date().toISOString();

    const { error: profileError } = await raceWithTimeoutReject(
      supabase.from(PROFILES).insert({
        id: profileId,
        owner_user_id: userId,
        owner_scope: ownerScope,
        current_version: 1,
        status: 'active',
      }),
      SUPABASE_QUERY_TIMEOUT_MS,
      'LookProfile konnte nicht angelegt werden (Zeitüberschreitung).',
    );
    if (profileError) {
      throw new Error(`LookProfile konnte nicht angelegt werden: ${profileError.message}`);
    }

    const versionInsert = toPersistedVersionInsert(profileId, 1, draft, createdAt);
    const { error: versionError } = await raceWithTimeoutReject(
      supabase.from(VERSIONS).insert(versionInsert),
      SUPABASE_QUERY_TIMEOUT_MS,
      'LookProfile-Version konnte nicht angelegt werden (Zeitüberschreitung).',
    );
    if (versionError) {
      throw new Error(
        `LookProfile-Version konnte nicht angelegt werden: ${versionError.message}`,
      );
    }

    const record = await this.loadRecord(profileId);
    if (!record) {
      throw new Error('LookProfile nach Create nicht lesbar.');
    }
    return record;
  }

  async appendVersion(input: AppendLookProfileVersionInput): Promise<LookProfileRecord> {
    const userId = await getAuthenticatedUserId();
    const profileId = assertProfileId(input.profileId);
    const draft = requireDraft(input.draft);
    const existing = await this.loadRecord(profileId);
    if (!existing) {
      throw new Error('LookProfile nicht gefunden.');
    }
    if (existing.profile.ownerId !== userId) {
      throw new Error('Keine Berechtigung für dieses LookProfile.');
    }
    if (existing.status === 'archived') {
      throw new Error('Archivierte Looks können nicht versioniert werden. Bitte duplizieren.');
    }

    const nextVersion = existing.profile.currentVersion + 1;
    const createdAt = new Date().toISOString();
    const versionInsert = toPersistedVersionInsert(profileId, nextVersion, draft, createdAt);

    const { error: versionError } = await raceWithTimeoutReject(
      supabase.from(VERSIONS).insert(versionInsert),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Neue Look-Version konnte nicht geschrieben werden (Zeitüberschreitung).',
    );
    if (versionError) {
      if (/duplicate|unique|conflict/i.test(versionError.message)) {
        throw new Error(
          'Konflikt: diese Look-Version existiert bereits (gleichzeitiges Update). Bitte erneut versuchen.',
        );
      }
      throw new Error(`Neue Look-Version fehlgeschlagen: ${versionError.message}`);
    }

    const { error: bumpError } = await raceWithTimeoutReject(
      supabase
        .from(PROFILES)
        .update({ current_version: nextVersion })
        .eq('id', profileId)
        .eq('owner_user_id', userId)
        .eq('current_version', existing.profile.currentVersion),
      SUPABASE_QUERY_TIMEOUT_MS,
      'LookProfile-Versionzeiger konnte nicht aktualisiert werden (Zeitüberschreitung).',
    );
    if (bumpError) {
      throw new Error(`LookProfile-Versionzeiger fehlgeschlagen: ${bumpError.message}`);
    }

    const record = await this.loadRecord(profileId);
    if (!record || record.profile.currentVersion !== nextVersion) {
      throw new Error(
        'Konflikt: LookProfile wurde parallel aktualisiert. Bitte erneut versuchen.',
      );
    }
    return record;
  }

  async archiveProfile(profileId: string): Promise<LookProfileRecord> {
    const userId = await getAuthenticatedUserId();
    const id = assertProfileId(profileId);
    const { error } = await raceWithTimeoutReject(
      supabase
        .from(PROFILES)
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('owner_user_id', userId),
      SUPABASE_QUERY_TIMEOUT_MS,
      'LookProfile konnte nicht archiviert werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`LookProfile konnte nicht archiviert werden: ${error.message}`);
    }
    const record = await this.loadRecord(id);
    if (!record) {
      throw new Error('LookProfile nach Archivierung nicht lesbar.');
    }
    return record;
  }

  async duplicateProfile(input: DuplicateLookProfileInput): Promise<LookProfileRecord> {
    const userId = await getAuthenticatedUserId();
    const sourceId = assertProfileId(input.sourceProfileId);
    const source = await this.loadRecord(sourceId);
    if (!source) {
      throw new Error('Quell-LookProfile nicht gefunden.');
    }
    if (source.profile.ownerId !== userId) {
      throw new Error('Keine Berechtigung zum Duplizieren dieses Looks.');
    }

    const displayName =
      typeof input.displayName === 'string' && input.displayName.trim().length > 0
        ? input.displayName.trim()
        : `${source.current.displayName} (Kopie)`;

    return this.createProfile({
      draft: {
        displayName,
        source: source.current.source,
        references: source.current.references,
        capabilities: source.current.capabilities,
        executionModes: source.current.executionModes,
        ownerScope: source.profile.ownerScope,
      },
    });
  }

  async listVersions(profileId: string): Promise<LookProfileVersion[]> {
    await getAuthenticatedUserId();
    const id = assertProfileId(profileId);
    const { data, error } = await raceWithTimeoutReject(
      supabase
        .from(VERSIONS)
        .select(LOOK_PROFILE_VERSION_COLUMNS)
        .eq('profile_id', id)
        .order('version', { ascending: true }),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Look-Versionen konnten nicht geladen werden (Zeitüberschreitung).',
    );
    if (error) {
      throw new Error(`Look-Versionen konnten nicht geladen werden: ${error.message}`);
    }
    return ((data ?? []) as LookProfileVersionDto[])
      .map(mapLookProfileVersionRow)
      .filter((row): row is LookProfileVersion => row !== null);
  }

  private async loadRecord(profileId: string): Promise<LookProfileRecord | null> {
    const { data: profileData, error: profileError } = await raceWithTimeoutReject(
      supabase.from(PROFILES).select(LOOK_PROFILE_COLUMNS).eq('id', profileId).maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS,
      'LookProfile konnte nicht geladen werden (Zeitüberschreitung).',
    );
    if (profileError) {
      throw new Error(`LookProfile konnte nicht geladen werden: ${profileError.message}`);
    }
    if (!profileData) return null;
    const profileRow = profileData as LookProfileDto;

    const { data: versionData, error: versionError } = await raceWithTimeoutReject(
      supabase
        .from(VERSIONS)
        .select(LOOK_PROFILE_VERSION_COLUMNS)
        .eq('profile_id', profileId)
        .eq('version', profileRow.current_version)
        .maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS,
      'LookProfile-Version konnte nicht geladen werden (Zeitüberschreitung).',
    );
    if (versionError) {
      throw new Error(
        `LookProfile-Version konnte nicht geladen werden: ${versionError.message}`,
      );
    }
    if (!versionData) return null;
    return mapLookProfileRecord(profileRow, versionData as LookProfileVersionDto);
  }
}

export const supabaseLookProfileRepository = new SupabaseLookProfileRepository();
