/**
 * npc-creature controller persistence helpers (#200).
 * Location: src/infrastructure/npc-creature/npc-creature-controller.persistence.ts
 */
import type { NpcControllerAssignment } from '../../domains/npc-creature';

export interface NpcControllerAssignmentRow {
  project_id: string;
  definition_id: string;
  controller_user_id: string | null;
  assigned_by: string;
  updated_at: string;
}

export function toNpcControllerAssignment(
  row: NpcControllerAssignmentRow,
): NpcControllerAssignment {
  return {
    projectId: row.project_id,
    definitionId: row.definition_id,
    controllerUserId: row.controller_user_id,
  };
}
