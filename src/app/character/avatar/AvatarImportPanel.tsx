/**
 * AvatarImportPanel — Look-tab CTA to import owner-scoped VRM/GLB models (#5).
 * Location: src/app/character/avatar/AvatarImportPanel.tsx
 *
 * Early UX checks client-side; authoritative validation runs in import service before storage.
 * On error, does not clear the previous model URL (caller keeps prior avatar).
 */

import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import {
  earlyCheckAvatarImportFile,
  type AvatarImportUiStatus,
} from '../../../domains/character/avatar';
import {
  avatarImportLimits,
  importCharacterAvatarModel,
} from '../../../infrastructure/character/avatar/character-avatar-import-service';
import { Button } from '../../../shared/ui/button';

interface AvatarImportPanelProps {
  characterId?: string | null;
  /** Called only after a confirmed successful import. */
  onImported: (modelUrl: string) => void;
}

const STATUS_LABEL: Record<AvatarImportUiStatus, string> = {
  idle: 'Bereit für Import',
  validating: 'Datei wird geprüft …',
  uploading: 'Upload läuft …',
  analyzing: 'Für Rig-Analyse vorgemerkt …',
  success: 'Import erfolgreich',
  error: 'Import fehlgeschlagen',
  'unsupported-capabilities': 'Eingeschränkte Fähigkeiten',
};

export function AvatarImportPanel({ characterId, onImported }: AvatarImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<AvatarImportUiStatus>('idle');
  const [message, setMessage] = useState('VRM oder GLB auswählen — max. 150 MB.');
  const [dragOver, setDragOver] = useState(false);
  const busy = status === 'validating' || status === 'uploading' || status === 'analyzing';
  const limits = avatarImportLimits();

  const runImport = async (file: File) => {
    const early = earlyCheckAvatarImportFile({ fileName: file.name, byteSize: file.size });
    if (!early.ok) {
      setStatus('error');
      setMessage(early.message ?? 'Datei ungültig.');
      return;
    }
    try {
      const artifact = await importCharacterAvatarModel(file, {
        characterId,
        onProgress: (progress) => {
          setStatus(progress.status);
          setMessage(progress.message);
        },
      });
      onImported(artifact.modelUrl);
      if (artifact.rigAnalysisStatus === 'unsupported') {
        setStatus('unsupported-capabilities');
        setMessage('Import ok, aber Fähigkeiten sind eingeschränkt. Rig-Analyse folgt.');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Import fehlgeschlagen.');
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void runImport(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void runImport(file);
  };

  return (
    <div className="space-y-3" data-avatar-import-panel>
      <div
        data-avatar-import-dropzone
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-lg border border-dashed p-4 transition ${
          dragOver ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'
        }`}
      >
        <p className="text-sm font-medium">3D-Charakter importieren</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Eigene .vrm / .glb Dateien. Endgültige Freigabe erst nach Server-Prüfung.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            aria-busy={busy}
            data-avatar-import-cta
          >
            <Upload className="mr-2 h-4 w-4" />
            3D-Charakter importieren
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={limits.accept}
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>

      <div
        className={`rounded-md border px-3 py-2 text-xs ${
          status === 'error'
            ? 'border-red-400/40 bg-red-500/10 text-red-950 dark:text-red-100'
            : status === 'success'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100'
              : 'border-border bg-background text-muted-foreground'
        }`}
        role="status"
        aria-live="polite"
        data-avatar-import-status={status}
      >
        <span className="font-medium">{STATUS_LABEL[status]}</span>
        <span className="mt-0.5 block">{message}</span>
      </div>
    </div>
  );
}
