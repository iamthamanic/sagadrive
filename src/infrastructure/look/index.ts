/**
 * look infrastructure barrel (#340 / #342 runtime).
 * Location: src/infrastructure/look/index.ts
 */

export {
  archiveLookProfile,
  appendLookProfileVersion,
  createLookProfile,
  duplicateLookProfile,
  getLookProfile,
  listLookProfileVersions,
  listLookProfiles,
} from './look-service';

export {
  LOOK_PROFILE_COLUMNS,
  LOOK_PROFILE_VERSION_COLUMNS,
  mapLookProfileRecord,
  mapLookProfileVersionRow,
  toPersistedVersionInsert,
} from './look.persistence';

export { supabaseLookProfileRepository } from './supabase-look.repository';

export { createLookRuntime, LookRuntime, type LookRuntimeOptions } from './look-runtime';
export { classifyLookMaterialRole, isTintableLookMaterialRole } from './look-material-roles';
export type {
  LookMaterialRole,
  LookRuntimeApplyResult,
  LookRuntimeTarget,
  LookStyleAdapter,
  LookStyleProviderId,
} from './look-runtime-types';
export { createHostMtoonLookAdapter } from './adapters/host-mtoon-look-adapter';
export { createToonLabLookAdapter } from './adapters/toonlab-look-adapter';
