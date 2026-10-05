/**
 * LookEditScreen — Canonical Look bearbeiten route; mounts Look Editor workspace (#344).
 * Location: src/app/look/LookEditScreen.tsx
 */
import { LookEditorWorkspace } from './editor/LookEditorWorkspace';

export interface LookEditScreenProps {
  lookId: string;
  onBack: () => void;
  onNavigateToLookEdit?: (lookId: string) => void;
}

export function LookEditScreen({ lookId, onBack, onNavigateToLookEdit }: LookEditScreenProps) {
  return (
    <div className="h-full min-h-0" data-look-edit-screen>
      <LookEditorWorkspace
        mode="edit"
        lookId={lookId}
        onBack={onBack}
        onCreated={onNavigateToLookEdit}
      />
    </div>
  );
}
