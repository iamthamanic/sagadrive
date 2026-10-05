/**
 * LookCreateScreen — Canonical Look erstellen route; mounts Look Editor workspace (#344).
 * Location: src/app/look/LookCreateScreen.tsx
 */
import { LookEditorWorkspace } from './editor/LookEditorWorkspace';

export interface LookCreateScreenProps {
  onBack: () => void;
  onCreated?: (lookId: string) => void;
}

export function LookCreateScreen({ onBack, onCreated }: LookCreateScreenProps) {
  return (
    <div className="h-full min-h-0" data-look-create-screen>
      <LookEditorWorkspace mode="create" onBack={onBack} onCreated={onCreated} />
    </div>
  );
}
