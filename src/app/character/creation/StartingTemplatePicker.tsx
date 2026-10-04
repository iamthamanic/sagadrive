/**
 * StartingTemplatePicker — lists the ten SagaDrive Level-1 system starttemplates (#464).
 * Location: src/app/character/creation/StartingTemplatePicker.tsx
 */
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  getSagaDriveArchetype,
  getSagaDriveEssence,
} from '../../../domains/rules/sagadrive/character-creation';
import { listSagaDriveStartingTemplates } from '../../../domains/rules/sagadrive/starting-templates';
import type {
  SagaDriveStartingTemplate,
  SagaDriveStartingTemplateKey,
} from '../../../domains/rules/sagadrive/starting-templates';
import { Badge } from '../../../shared/ui/badge';
import { getStartingTemplateSketchUrl } from './startingTemplateSketches';

type StartingTemplatePickerProps = {
  onSelect: (templateKey: SagaDriveStartingTemplateKey) => void;
};

type PreviewState = {
  labelDe: string;
  sketchUrl: string;
} | null;

function StartingTemplateOption({
  template,
  onSelect,
  onPreview,
}: {
  template: SagaDriveStartingTemplate;
  onSelect: (templateKey: SagaDriveStartingTemplateKey) => void;
  onPreview: (preview: PreviewState) => void;
}) {
  const archetypeLabel = getSagaDriveArchetype(template.archetype)?.label ?? template.archetype;
  const essenceLabel = getSagaDriveEssence(template.essence)?.label ?? template.essence;
  const sketchUrl = getStartingTemplateSketchUrl(template.key);

  return (
    <li>
      <div className="flex w-full gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left transition-colors hover:border-primary sm:px-4">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreview({ labelDe: template.labelDe, sketchUrl });
          }}
          className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border/60 bg-[#0B1F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Skizze vergrößern: ${template.labelDe}`}
        >
          <img
            src={sketchUrl}
            alt=""
            className="h-full w-full object-cover object-center"
            draggable={false}
            loading="lazy"
          />
        </button>
        <button
          type="button"
          onClick={() => onSelect(template.key)}
          className="min-w-0 flex-1 space-y-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="font-medium leading-tight">{template.labelDe}</p>
              <p className="text-xs text-muted-foreground">
                {archetypeLabel} · {essenceLabel}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant="secondary" className="rounded-md font-normal">
                SagaDrive
              </Badge>
              <span className="text-xs text-muted-foreground">Stufe 1</span>
            </div>
          </div>
          <p className="text-sm leading-snug text-muted-foreground">{template.playstyleDe}</p>
        </button>
      </div>
    </li>
  );
}

function StartingTemplateSketchPreview({
  preview,
  onClose,
}: {
  preview: NonNullable<PreviewState>;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Skizze: ${preview.labelDe}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="truncate text-sm font-medium">{preview.labelDe}</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Vorschau schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="bg-[#0B1F3A] p-2">
          <img
            src={preview.sketchUrl}
            alt={`Skizze groß: ${preview.labelDe}`}
            className="h-auto w-full object-contain"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}

export function StartingTemplatePicker({ onSelect }: StartingTemplatePickerProps) {
  const templates = listSagaDriveStartingTemplates();
  const [preview, setPreview] = useState<PreviewState>(null);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">SagaDrive-Starttemplates</p>
      <ul className="max-h-80 space-y-2 overflow-y-auto" aria-label="SagaDrive-Starttemplates">
        {templates.map((template) => (
          <StartingTemplateOption
            key={template.key}
            template={template}
            onSelect={onSelect}
            onPreview={setPreview}
          />
        ))}
      </ul>
      {preview ? (
        <StartingTemplateSketchPreview preview={preview} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}
