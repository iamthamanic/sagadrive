/**
 * AdvancedLookAdaptionPanel — Look Editor Advanced capability status UI (#356).
 * Location: src/app/look/editor/inspectors/AdvancedLookAdaptionPanel.tsx
 *
 * Shows Basic vs Advanced copy and separate Rendered/Live rows from the
 * provider registry. Unavailable modes stay disabled — no fake execution.
 */
import { useEffect, useState } from 'react';
import { Button } from '../../../../shared/ui/button';
import {
  buildAdvancedLookCapabilityStatusView,
  type AdvancedLookCapabilityStatusView,
} from '../../../../domains/look/advanced-look-capability-status';
import { listAdvancedLookProviders } from '../../../../domains/look/advanced-look-provider-registry';

export function AdvancedLookAdaptionPanel() {
  const [view, setView] = useState<AdvancedLookCapabilityStatusView>(() =>
    buildAdvancedLookCapabilityStatusView(listAdvancedLookProviders()),
  );

  useEffect(() => {
    const refresh = () => {
      setView(buildAdvancedLookCapabilityStatusView(listAdvancedLookProviders()));
    };
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <div className="space-y-4" data-look-advanced-adaption="v1">
      <div>
        <h3 className="text-sm font-medium">Adaptionsstufen</h3>
        <p className="mt-1 text-xs text-muted-foreground" data-look-advanced-basic-summary>
          {view.basicSummaryDe}
        </p>
        <p className="mt-2 text-xs text-muted-foreground" data-look-advanced-summary>
          {view.advancedSummaryDe}
        </p>
        <p className="mt-2 text-xs text-muted-foreground" data-look-advanced-provider-count>
          Registrierte Advanced-Provider: {view.providerCount}
        </p>
      </div>

      <ul className="space-y-3" data-look-advanced-modes>
        {view.rows.map((row) => (
          <li
            key={row.mode}
            className="rounded-md border border-border p-3"
            data-look-advanced-mode={row.mode}
            data-look-advanced-status={row.status}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.labelDe}</p>
                <p
                  className="text-xs text-muted-foreground"
                  data-look-advanced-status-label
                >
                  {row.statusLabelDe}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{row.hintDe}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 shrink-0"
                disabled
                title={row.hintDe}
                data-look-advanced-run={row.mode}
              >
                {row.runLabelDe}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Standard-UI zeigt keine Provider-Secrets und keine Roh-Node-/Prompt-Parameter.
      </p>
    </div>
  );
}
