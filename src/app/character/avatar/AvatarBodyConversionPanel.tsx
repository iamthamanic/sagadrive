/**
 * AvatarBodyConversionPanel — optional Standard/Compact/Heavy conversion after import (#263).
 * Location: src/app/character/avatar/AvatarBodyConversionPanel.tsx
 *
 * Recommendation is a hint only. Original stays untouched until caller applies conversion.
 */

import { useState } from 'react';
import {
  listBodyConversionFamilyOptions,
  planBodyConversion,
  type BodyConversionResultV1,
  type BodyConversionTargetFamily,
  type ImportAnalysisSummaryV1,
  type ImportOriginalKeepSeedV1,
} from '../../../domains/character/avatar';
import { Button } from '../../../shared/ui/button';

interface AvatarBodyConversionPanelProps {
  summary: ImportAnalysisSummaryV1;
  keepSeed: ImportOriginalKeepSeedV1;
  disabled?: boolean;
  onConverted: (result: BodyConversionResultV1) => void;
}

export function AvatarBodyConversionPanel({
  summary,
  keepSeed,
  disabled = false,
  onConverted,
}: AvatarBodyConversionPanelProps) {
  const options = listBodyConversionFamilyOptions({
    recommendedFamily: summary.recommendedFamily,
    anatomy: summary.anatomy,
  });
  const initial =
    options.find((o) => o.recommended)?.familyId ??
    ('standard' as BodyConversionTargetFamily);
  const [targetFamily, setTargetFamily] = useState<BodyConversionTargetFamily>(initial);
  const [open, setOpen] = useState(false);
  const [errorDe, setErrorDe] = useState<string | null>(null);

  const selected = options.find((o) => o.familyId === targetFamily) ?? options[0];

  const confirm = () => {
    setErrorDe(null);
    const result = planBodyConversion({
      sourceArtifactId: keepSeed.artifactId,
      sourceImportAssetId: keepSeed.importAssetId,
      sourceModelUrl: keepSeed.modelUrl,
      anatomy: summary.anatomy,
      modularity: summary.modularity,
      recommendedFamily: summary.recommendedFamily,
      targetFamily,
      identityFidelityEstimate:
        summary.anatomy === 'humanoid' && summary.flowStatus === 'ready-humanoid'
          ? 0.72
          : 0.45,
    });
    if (result.status === 'failed') {
      setErrorDe(result.limitationsDe[0] ?? 'Conversion fehlgeschlagen.');
      return;
    }
    onConverted(result);
  };

  return (
    <section
      className="space-y-2 rounded-lg border border-border bg-muted/10 p-3"
      aria-label="Auf SagaDrive-Körper übertragen"
      data-avatar-body-conversion-panel
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="min-h-11"
          data-avatar-conversion-open
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Auf SagaDrive-Körper übertragen
        </Button>
      </div>
      {open ? (
        <div className="space-y-3" data-avatar-conversion-chooser>
          <p className="text-xs text-muted-foreground">
            Look wird übertragen; Proportionen können sich verändern — dafür volle SagaDrive-Kleidung
            und Körperbearbeitung. Das Original bleibt erhalten.
          </p>
          {summary.anatomy === 'custom-creature' ? (
            <p
              className="text-xs text-amber-800 dark:text-amber-200"
              data-avatar-conversion-custom-warn
              role="status"
            >
              Humanoide Interpretation — die Silhouette ändert sich deutlich.
            </p>
          ) : null}
          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Ziel-Körper"
          >
            {options.map((option) => {
              const selectedOpt = option.familyId === targetFamily;
              return (
                <Button
                  key={option.familyId}
                  type="button"
                  role="radio"
                  aria-checked={selectedOpt}
                  variant={selectedOpt ? 'default' : 'outline'}
                  disabled={disabled}
                  data-avatar-conversion-family={option.familyId}
                  data-recommended={option.recommended ? 'true' : 'false'}
                  className="h-auto min-h-11 flex-col items-start gap-1 whitespace-normal px-3 py-3 text-left"
                  onClick={() => setTargetFamily(option.familyId)}
                >
                  <span className="font-medium">
                    {option.labelDe}
                    {option.recommended ? ' · Empfohlen' : ''}
                  </span>
                  <span className="text-xs opacity-80">{option.previewHintDe}</span>
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground" data-avatar-conversion-tradeoff>
            {selected?.previewHintDe}
          </p>
          {errorDe ? (
            <p className="text-xs text-destructive" role="alert">
              {errorDe}
            </p>
          ) : null}
          <Button
            type="button"
            disabled={disabled}
            className="min-h-11"
            data-avatar-conversion-confirm
            onClick={confirm}
          >
            Übertragung bestätigen ({FAMILY_LABEL(targetFamily)})
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function FAMILY_LABEL(family: BodyConversionTargetFamily): string {
  if (family === 'compact') return 'Compact';
  if (family === 'heavy') return 'Heavy';
  return 'Standard';
}
