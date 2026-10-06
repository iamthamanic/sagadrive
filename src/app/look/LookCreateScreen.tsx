/**
 * LookCreateScreen — Create chooser + Preset / Referenzbilder / Duplizieren (#353).
 * Location: src/app/look/LookCreateScreen.tsx
 */
import { useState } from 'react';
import { LookCreateChooser, type LookCreatePath } from './create/LookCreateChooser';
import { LookDuplicatePicker } from './create/LookDuplicatePicker';
import { LookReferenceAdaptionFlow } from './create/LookReferenceAdaptionFlow';
import { LookEditorWorkspace } from './editor/LookEditorWorkspace';
import type { LookEditorUiDraft } from './editor/look-editor-draft';

export interface LookCreateScreenProps {
  onBack: () => void;
  onCreated?: (lookId: string) => void;
}

type CreatePhase = 'chooser' | LookCreatePath | 'editor';

export function LookCreateScreen({ onBack, onCreated }: LookCreateScreenProps) {
  const [phase, setPhase] = useState<CreatePhase>('chooser');
  const [initialDraft, setInitialDraft] = useState<LookEditorUiDraft | null>(null);

  if (phase === 'chooser') {
    return (
      <div className="h-full min-h-0" data-look-create-screen>
        <LookCreateChooser
          onBack={onBack}
          onChoose={(path) => {
            if (path === 'preset') {
              setInitialDraft(null);
              setPhase('editor');
              return;
            }
            setPhase(path);
          }}
        />
      </div>
    );
  }

  if (phase === 'references') {
    return (
      <div className="h-full min-h-0" data-look-create-screen>
        <LookReferenceAdaptionFlow
          onBack={() => setPhase('chooser')}
          onAnalyzed={(draft) => {
            setInitialDraft(draft);
            setPhase('editor');
          }}
        />
      </div>
    );
  }

  if (phase === 'duplicate') {
    return (
      <div className="h-full min-h-0" data-look-create-screen>
        <LookDuplicatePicker
          onBack={() => setPhase('chooser')}
          onDuplicated={(lookId) => onCreated?.(lookId)}
        />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0" data-look-create-screen>
      <LookEditorWorkspace
        mode="create"
        initialDraft={initialDraft}
        onBack={() => {
          setInitialDraft(null);
          setPhase('chooser');
        }}
        onCreated={onCreated}
      />
    </div>
  );
}
