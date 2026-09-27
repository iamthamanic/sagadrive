/**
 * look-service — app-facing facade for LookProfile persistence (#340).
 * App slices must not query look_* tables directly.
 * Location: src/infrastructure/look/look-service.ts
 */

import type {
  AppendLookProfileVersionInput,
  CreateLookProfileInput,
  DuplicateLookProfileInput,
  LookProfileRecord,
  LookProfileVersion,
} from '../../domains/look';
import { supabaseLookProfileRepository } from './supabase-look.repository';

export async function listLookProfiles(options?: {
  includeArchived?: boolean;
}): Promise<LookProfileRecord[]> {
  return supabaseLookProfileRepository.listProfiles(options);
}

export async function getLookProfile(
  profileId: string,
): Promise<LookProfileRecord | null> {
  return supabaseLookProfileRepository.getProfileById(profileId);
}

export async function createLookProfile(
  input: CreateLookProfileInput,
): Promise<LookProfileRecord> {
  return supabaseLookProfileRepository.createProfile(input);
}

export async function appendLookProfileVersion(
  input: AppendLookProfileVersionInput,
): Promise<LookProfileRecord> {
  return supabaseLookProfileRepository.appendVersion(input);
}

export async function archiveLookProfile(
  profileId: string,
): Promise<LookProfileRecord> {
  return supabaseLookProfileRepository.archiveProfile(profileId);
}

export async function duplicateLookProfile(
  input: DuplicateLookProfileInput,
): Promise<LookProfileRecord> {
  return supabaseLookProfileRepository.duplicateProfile(input);
}

export async function listLookProfileVersions(
  profileId: string,
): Promise<LookProfileVersion[]> {
  return supabaseLookProfileRepository.listVersions(profileId);
}
