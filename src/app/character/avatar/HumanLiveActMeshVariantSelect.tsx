/**
 * HumanLiveActMeshVariantSelect — SagaDrive Human vs Golden Reference VRM.
 * Location: src/app/character/avatar/HumanLiveActMeshVariantSelect.tsx
 *
 * Shown under Vorlage anpassen when species is human. Diagnostic-only reference path.
 */

import {
  listLiveActHumanMeshVariantOptions,
  type LiveActHumanMeshVariantId,
} from '../../../domains/character/avatar';

interface HumanLiveActMeshVariantSelectProps {
  value: LiveActHumanMeshVariantId;
  onChange: (next: LiveActHumanMeshVariantId) => void;
  disabled?: boolean;
}

export function HumanLiveActMeshVariantSelect({
  value,
  onChange,
  disabled = false,
}: HumanLiveActMeshVariantSelectProps) {
  const options = listLiveActHumanMeshVariantOptions();
  const selected = options.find((o) => o.id === value);

  return (
    <div className="space-y-1.5" data-testid="human-liveact-mesh-variant">
      <label className="text-xs font-medium text-foreground" htmlFor="human-mesh-variant">
        Vorlage
      </label>
      <select
        id="human-mesh-variant"
        data-testid="human-liveact-mesh-variant-select"
        className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground disabled:opacity-50"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value as LiveActHumanMeshVariantId)}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.labelDe}
          </option>
        ))}
      </select>
      {selected?.hintDe ? (
        <p className="text-[10px] text-muted-foreground" data-testid="human-liveact-mesh-variant-hint">
          {selected.hintDe}
        </p>
      ) : null}
    </div>
  );
}
