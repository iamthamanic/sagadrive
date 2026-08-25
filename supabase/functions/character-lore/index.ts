import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  buildCharacterLorePrompt,
  type CharacterLorePromptContext,
  type CharacterLoreReferenceContext,
} from '../_shared/character-lore-prompt.ts';
import {
  generateCharacterLore,
  resolveCharacterLoreProviderConfig,
} from '../_shared/character-lore-provider.ts';

type JsonRecord = Record<string, unknown>;

interface RateLimitEntry {
  startedAt: number;
  count: number;
}

interface ParsedRequest {
  context: CharacterLorePromptContext;
  projectId?: string;
  worldId?: string;
  currentBackgroundStory?: string;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  world_id: string | null;
  gm_user_id: string;
}

interface WorldRow {
  id: string;
  creator_user_id: string | null;
  name: string;
  lore: string | null;
  setting_type: string | null;
}

const rateLimits = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 6;
const MAX_STORY_LENGTH = 12_000;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function getCorsHeaders(request: Request): HeadersInit {
  const allowedOrigin = Deno.env.get('CHARACTER_AI_ALLOWED_ORIGIN')?.trim() || '*';
  const requestOrigin = request.headers.get('Origin');
  const origin = allowedOrigin === '*' ? '*' : requestOrigin === allowedOrigin ? allowedOrigin : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };
}

function jsonResponse(request: Request, body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(request),
  });
}

function readString(record: JsonRecord, key: string, maxLength: number): string {
  const value = record[key];
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function readOptionalString(record: JsonRecord, key: string, maxLength: number): string | undefined {
  const value = readString(record, key, maxLength);
  return value || undefined;
}

function readNumber(record: JsonRecord, key: string, min: number, max: number, fallback: number): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function readStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .slice(0, maxItems)
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim().slice(0, maxLength))
        .filter(Boolean),
    ),
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseAttributes(value: unknown): CharacterLorePromptContext['attributes'] | null {
  if (!isRecord(value)) return null;
  return {
    strength: readNumber(value, 'strength', 1, 30, 10),
    dexterity: readNumber(value, 'dexterity', 1, 30, 10),
    constitution: readNumber(value, 'constitution', 1, 30, 10),
    intelligence: readNumber(value, 'intelligence', 1, 30, 10),
    wisdom: readNumber(value, 'wisdom', 1, 30, 10),
    charisma: readNumber(value, 'charisma', 1, 30, 10),
  };
}

function parseAppearance(value: unknown): CharacterLorePromptContext['appearance'] | null {
  if (!isRecord(value)) return null;
  return {
    bodySize: readNumber(value, 'bodySize', 0, 100, 50),
    height: readNumber(value, 'height', 0, 100, 50),
    face: readString(value, 'face', 120),
    hairStyle: readString(value, 'hairStyle', 120),
    hairColor: readString(value, 'hairColor', 32),
    skinTone: readString(value, 'skinTone', 32),
    clothing: readString(value, 'clothing', 120),
    accessory: readOptionalString(value, 'accessory', 120),
  };
}

function parseTraits(value: unknown): CharacterLorePromptContext['traits'] | null {
  if (!isRecord(value)) return null;
  return {
    personality: readStringArray(value.personality, 12, 160),
    ideals: readStringArray(value.ideals, 12, 160),
    bonds: readStringArray(value.bonds, 12, 160),
    flaws: readStringArray(value.flaws, 12, 160),
  };
}

function parseAbilities(value: unknown): CharacterLorePromptContext['abilities'] {
  if (!Array.isArray(value)) return [];
  const abilities: CharacterLorePromptContext['abilities'] = [];
  for (const entry of value.slice(0, 30)) {
    if (!isRecord(entry)) continue;
    const type = entry.type;
    if (type !== 'combat' && type !== 'magic' && type !== 'skill') continue;
    abilities.push({
      name: readString(entry, 'name', 120),
      description: readString(entry, 'description', 600),
      type,
      cost: readNumber(entry, 'cost', 0, 10_000, 0),
      effect: readString(entry, 'effect', 600),
    });
  }
  return abilities.filter((ability) => ability.name.length > 0);
}

function parseInventory(value: unknown): CharacterLorePromptContext['inventory'] {
  if (!Array.isArray(value)) return [];
  const items: CharacterLorePromptContext['inventory'] = [];
  for (const entry of value.slice(0, 30)) {
    if (!isRecord(entry)) continue;
    const type = entry.type;
    if (type !== 'weapon' && type !== 'armor' && type !== 'consumable' && type !== 'misc') continue;
    items.push({
      name: readString(entry, 'name', 120),
      description: readString(entry, 'description', 600),
      type,
      quantity: Math.round(readNumber(entry, 'quantity', 1, 999, 1)),
    });
  }
  return items.filter((item) => item.name.length > 0);
}

function parseRequestBody(value: unknown): ParsedRequest | null {
  if (!isRecord(value) || value.action !== 'generate-background' || !isRecord(value.context)) return null;
  const source = value.context;
  const ruleset = source.ruleset;
  if (ruleset !== 'sagadrive-core' && ruleset !== 'dnd-5.5e') return null;

  const attributes = parseAttributes(source.attributes);
  const appearance = parseAppearance(source.appearance);
  const traits = parseTraits(source.traits);
  if (!attributes || !appearance || !traits) return null;

  const projectId = readOptionalString(source, 'projectId', 64);
  const worldId = readOptionalString(source, 'worldId', 64);
  if ((projectId && !isUuid(projectId)) || (worldId && !isUuid(worldId))) return null;

  const currentBackgroundStory = readOptionalString(value, 'currentBackgroundStory', 8_000);

  return {
    context: {
      ruleset,
      name: readString(source, 'name', 120),
      description: readString(source, 'description', 2_000),
      characterClass: readString(source, 'characterClass', 120),
      raceOrSpecies: readString(source, 'raceOrSpecies', 120),
      setting: readOptionalString(source, 'setting', 160),
      essenceProfile: readOptionalString(source, 'essenceProfile', 160),
      dndBackground: readOptionalString(source, 'dndBackground', 160),
      level: Math.round(readNumber(source, 'level', 1, 20, 1)),
      attributes,
      abilities: parseAbilities(source.abilities),
      inventory: parseInventory(source.inventory),
      appearance,
      traits,
    },
    projectId,
    worldId,
    currentBackgroundStory,
  };
}

function getRateLimit(): number {
  const configured = Number.parseInt(Deno.env.get('CHARACTER_AI_RATE_LIMIT_PER_MINUTE') || '', 10);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 60) : DEFAULT_RATE_LIMIT;
}

function consumeRateLimit(userId: string): boolean {
  const now = Date.now();
  const current = rateLimits.get(userId);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= getRateLimit()) return false;
  current.count += 1;
  return true;
}

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = Deno.env.get('SUPABASE_URL')?.trim();
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
  return url && anonKey ? { url: url.replace(/\/+$/, ''), anonKey } : null;
}

async function fetchJson(url: string, authorization: string, anonKey: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Authorization: authorization,
      apikey: anonKey,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Supabase lookup failed with ${response.status}`);
  return response.json();
}

async function authenticate(request: Request): Promise<string | null> {
  const config = getSupabaseConfig();
  const authorization = request.headers.get('Authorization');
  if (!config || !authorization?.startsWith('Bearer ')) return null;

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      Authorization: authorization,
      apikey: config.anonKey,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const body: unknown = await response.json();
  return isRecord(body) && typeof body.id === 'string' ? body.id : null;
}

function parseProjectRow(value: unknown): ProjectRow | null {
  if (!isRecord(value)) return null;
  return typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.description === 'string' || value.description === null) &&
    (typeof value.world_id === 'string' || value.world_id === null) &&
    typeof value.gm_user_id === 'string'
    ? {
        id: value.id,
        name: value.name,
        description: value.description,
        world_id: value.world_id,
        gm_user_id: value.gm_user_id,
      }
    : null;
}

function parseWorldRow(value: unknown): WorldRow | null {
  if (!isRecord(value)) return null;
  return typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.creator_user_id === 'string' || value.creator_user_id === null) &&
    (typeof value.lore === 'string' || value.lore === null) &&
    (typeof value.setting_type === 'string' || value.setting_type === null)
    ? {
        id: value.id,
        creator_user_id: value.creator_user_id,
        name: value.name,
        lore: value.lore,
        setting_type: value.setting_type,
      }
    : null;
}

async function getAuthorizedReferenceContext(
  request: Request,
  userId: string,
  projectId?: string,
  directWorldId?: string,
): Promise<CharacterLoreReferenceContext> {
  if (!projectId && !directWorldId) return {};
  const config = getSupabaseConfig();
  const authorization = request.headers.get('Authorization');
  if (!config || !authorization) throw new Error('Supabase reference lookup is not configured');

  let project: ProjectRow | null = null;
  let projectAuthorized = false;
  if (projectId) {
    const projectBody = await fetchJson(
      `${config.url}/rest/v1/projects?select=id,name,description,world_id,gm_user_id&id=eq.${projectId}&limit=1`,
      authorization,
      config.anonKey,
    );
    const firstProject = Array.isArray(projectBody) ? projectBody[0] : undefined;
    project = parseProjectRow(firstProject);
    if (!project) throw new Error('Project not found');

    if (project.gm_user_id === userId) {
      projectAuthorized = true;
    } else {
      const memberBody = await fetchJson(
        `${config.url}/rest/v1/project_members?select=id&project_id=eq.${projectId}&user_id=eq.${userId}&status=eq.active&limit=1`,
        authorization,
        config.anonKey,
      );
      projectAuthorized = Array.isArray(memberBody) && memberBody.length > 0;
    }
    if (!projectAuthorized) throw new Error('Project access denied');
  }

  const worldId = directWorldId || project?.world_id || undefined;
  if (directWorldId && project?.world_id && directWorldId !== project.world_id) {
    throw new Error('World does not belong to project');
  }

  let world: WorldRow | null = null;
  if (worldId) {
    const worldBody = await fetchJson(
      `${config.url}/rest/v1/worlds?select=id,creator_user_id,name,lore,setting_type&id=eq.${worldId}&limit=1`,
      authorization,
      config.anonKey,
    );
    const firstWorld = Array.isArray(worldBody) ? worldBody[0] : undefined;
    world = parseWorldRow(firstWorld);
    if (!world) throw new Error('World not found');
    if (!projectAuthorized && world.creator_user_id !== userId) throw new Error('World access denied');
  }

  return {
    projectName: project?.name,
    projectDescription: project?.description?.slice(0, 2_000) || undefined,
    worldName: world?.name,
    worldSettingType: world?.setting_type || undefined,
    worldLore: world?.lore?.slice(0, 12_000) || undefined,
  };
}

serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }
  if (request.method !== 'POST') {
    return jsonResponse(request, { status: 'error', message: 'Method not allowed' }, 405);
  }

  const userId = await authenticate(request);
  if (!userId) {
    return jsonResponse(request, { status: 'error', message: 'Authentication required' }, 401);
  }

  if (!consumeRateLimit(userId)) {
    return jsonResponse(request, { status: 'error', message: 'Zu viele Generierungen. Bitte warte kurz und versuche es erneut.' }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const parsed = parseRequestBody(body);
  if (!parsed) {
    return jsonResponse(request, { status: 'error', message: 'Ungültige Character-Daten für die Generierung.' }, 400);
  }

  const providerConfig = resolveCharacterLoreProviderConfig();
  if (!providerConfig) {
    return jsonResponse(request, {
      status: 'not-configured',
      message: 'Character-AI ist noch nicht konfiguriert. Hinterlege Provider, Modell und gegebenenfalls API-Key in der Server-Umgebung.',
    });
  }

  try {
    const reference = await getAuthorizedReferenceContext(
      request,
      userId,
      parsed.projectId,
      parsed.worldId,
    );
    const prompt = buildCharacterLorePrompt(
      parsed.context,
      reference,
      parsed.currentBackgroundStory,
    );
    const story = await generateCharacterLore(providerConfig, prompt);
    if (!story || story.length > MAX_STORY_LENGTH) {
      throw new Error('Generated story length is invalid');
    }

    return jsonResponse(request, {
      status: 'ok',
      story,
      provider: providerConfig.provider,
      model: providerConfig.model,
      promptVersion: prompt.version,
    });
  } catch (error) {
    console.error(
      'Character lore generation failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return jsonResponse(request, {
      status: 'error',
      message: 'Hintergrundgeschichte konnte nicht generiert werden. Prüfe Provider, Modell und den Lore-Kontext.',
    }, 500);
  }
});
