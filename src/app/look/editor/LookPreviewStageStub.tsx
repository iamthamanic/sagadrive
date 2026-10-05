/**
 * LookPreviewStageStub — Center preview placeholder until #345 (#344).
 * Location: src/app/look/editor/LookPreviewStageStub.tsx
 */
type LookPreviewStageStubProps = {
  displayName: string;
  versionLabel: string;
};

export function LookPreviewStageStub({ displayName, versionLabel }: LookPreviewStageStubProps) {
  return (
    <div
      className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 bg-muted/30 p-6 text-center"
      data-look-preview-stage="stub"
      data-look-preview-pending="345"
    >
      <p className="text-sm font-medium text-foreground">{displayName || 'Look-Vorschau'}</p>
      <p className="text-xs text-muted-foreground">{versionLabel}</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Die interaktive Preview-Stage (Normal / PBR Neutral / Vergleich) kommt mit Issue #345.
        Regler links/rechts ändern bereits den speicherbaren Look-Entwurf.
      </p>
    </div>
  );
}
