/**
 * WorldLookReservedPanel — Reserved world domains as unavailable rows (#344 / #346).
 * Location: src/app/look/editor/inspectors/WorldLookReservedPanel.tsx
 */
import { lookCapabilityUnavailableLabel } from '../../../../domains/look/capability-metadata';
import { worldCapabilityRows } from '../look-editor-sections';

export function WorldLookReservedPanel() {
  const rows = worldCapabilityRows();
  return (
    <div className="space-y-3" data-look-inspector="world">
      <p className="text-xs text-muted-foreground">
        Welt-Domains sind vorbereitet, aber noch nicht verfügbar — keine Fake-Regler.
      </p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-md border border-border px-3 py-2"
            data-look-capability-reserved={row.id}
          >
            <p className="text-sm font-medium text-foreground">{row.labelDe}</p>
            <p className="text-xs text-muted-foreground">
              {lookCapabilityUnavailableLabel(row.id) ?? 'Noch nicht verfügbar'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
