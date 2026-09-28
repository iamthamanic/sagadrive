/**
 * StartingTemplatePicker — lists the ten SagaDrive Level-1 system starttemplates (#464).
 * Location: src/app/character/creation/StartingTemplatePicker.tsx
 */
import { listSagaDriveStartingTemplates } from '../../../domains/rules/sagadrive/starting-templates';
import type { SagaDriveStartingTemplateKey } from '../../../domains/rules/sagadrive/starting-templates';

type StartingTemplatePickerProps = {
  onSelect: (templateKey: SagaDriveStartingTemplateKey) => void;
};

export function StartingTemplatePicker({ onSelect }: StartingTemplatePickerProps) {
  const templates = listSagaDriveStartingTemplates();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">SagaDrive-Starttemplates</p>
      <ul className="max-h-64 space-y-2 overflow-y-auto" aria-label="SagaDrive-Starttemplates">
        {templates.map((template) => (
          <li key={template.key}>
            <button
              type="button"
              onClick={() => onSelect(template.key)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary"
            >
              <span className="font-medium">{template.labelDe}</span>
              <span className="text-xs text-muted-foreground">Stufe 1</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
