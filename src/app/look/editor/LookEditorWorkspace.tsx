/**
 * LookEditorWorkspace — Canonical 3-column Look Editor (#344 / #353).
 * Location: src/app/look/editor/LookEditorWorkspace.tsx
 *
 * Desktop: left nav / center preview stub / right inspector.
 * Phone: stacked via AdaptiveLiveStage rails.
 */
import { useState } from 'react';
import { AdaptiveLiveStage, useAdaptiveBand } from '../../../shared/ui/adaptive';
import { Button } from '../../../shared/ui/button';
import { LookReferenceAdaptionFlow } from '../create/LookReferenceAdaptionFlow';
import { LookEditorInspector } from './LookEditorInspector';
import { LookEditorNav } from './LookEditorNav';
import { LookPreviewStage } from './LookPreviewStage';
import type { LookEditorUiDraft } from './look-editor-draft';
import type { LookEditorSectionId } from './look-editor-sections';
import { useLookEditor, type LookEditorMode } from './useLookEditor';

export type LookEditorWorkspaceProps = {
  mode: LookEditorMode;
  lookId?: string | null;
  initialDraft?: LookEditorUiDraft | null;
  onBack: () => void;
  onCreated?: (lookId: string) => void;
};

export function LookEditorWorkspace({
  mode,
  lookId = null,
  initialDraft = null,
  onBack,
  onCreated,
}: LookEditorWorkspaceProps) {
  const band = useAdaptiveBand();
  const phone = band === 'phone';
  const [section, setSection] = useState<LookEditorSectionId>('overview');
  const [showReanalyze, setShowReanalyze] = useState(false);
  const editor = useLookEditor({ mode, lookId, initialDraft, onCreated });

  const versionLabel = editor.record
    ? `Version ${editor.record.profile.currentVersion}${editor.dirty ? ' · ungespeichert' : ''}`
    : mode === 'create'
      ? 'Neuer Look'
      : '—';

  if (showReanalyze) {
    return (
      <LookReferenceAdaptionFlow
        title="Look neu analysieren"
        displayNameHint={editor.draft.displayName}
        onBack={() => setShowReanalyze(false)}
        onAnalyzed={(draft) => {
          editor.applyAnalysisDraft(draft);
          setShowReanalyze(false);
        }}
      />
    );
  }

  const topbar = (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2"
      data-look-editor-topbar
    >
      <Button type="button" variant="ghost" className="min-h-11" onClick={onBack}>
        Zurück
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold md:text-lg">
          {editor.draft.displayName || 'Look Editor'}
        </h1>
        <p className="text-xs text-muted-foreground" data-look-editor-version>
          {versionLabel}
          {editor.readOnly ? ' · nur lesen' : ''}
          {editor.dirty ? ' · geändert' : ''}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={editor.readOnly || !editor.dirty || editor.saving}
        onClick={() => editor.reset()}
      >
        Zurücksetzen
      </Button>
      {mode === 'edit' && lookId ? (
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={editor.readOnly || editor.saving}
            onClick={() => setShowReanalyze(true)}
            data-look-reanalyze
          >
            Neu analysieren
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={editor.saving}
            onClick={() => void editor.duplicate()}
          >
            Duplizieren
          </Button>
        </>
      ) : null}
      <Button
        type="button"
        className="min-h-11"
        disabled={editor.readOnly || editor.saving || (!editor.dirty && mode === 'edit')}
        onClick={() => void editor.save()}
        data-look-editor-save
      >
        {editor.saving ? 'Speichert…' : 'Speichern'}
      </Button>
    </div>
  );

  if (editor.loading) {
    return (
      <div className="flex h-full items-center justify-center p-6" data-look-editor-workspace="loading">
        <p className="text-sm text-muted-foreground">Look wird geladen…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-look-editor-workspace="v1">
      {topbar}
      {editor.error ? (
        <p className="px-3 py-2 text-sm text-destructive" role="alert">
          {editor.error}
        </p>
      ) : null}
      {editor.statusMessage ? (
        <p className="px-3 py-1 text-xs text-muted-foreground" role="status">
          {editor.statusMessage}
        </p>
      ) : null}
      <AdaptiveLiveStage
        className="min-h-0 flex-1"
        leftRail={
          phone ? undefined : (
            <div className="h-full" data-look-editor-rail="nav">
              <LookEditorNav section={section} onSectionChange={setSection} />
            </div>
          )
        }
        stage={
          <div className="flex h-full min-h-0 flex-col">
            {phone ? (
              <div className="border-b border-border">
                <LookEditorNav section={section} onSectionChange={setSection} />
              </div>
            ) : null}
            <LookPreviewStage
              draft={editor.draft}
              baseline={editor.baseline}
              versions={editor.versions}
              displayName={editor.draft.displayName}
              versionLabel={versionLabel}
            />
          </div>
        }
        rightRail={
          phone ? undefined : (
            <div className="h-full overflow-y-auto" data-look-editor-rail="inspector">
              <LookEditorInspector
                section={section}
                draft={editor.draft}
                disabled={editor.readOnly}
                versions={editor.versions}
                currentVersion={editor.record?.profile.currentVersion ?? null}
                onChange={editor.patchDraft}
                onRestoreVersion={editor.restoreVersion}
              />
            </div>
          )
        }
        bottomRail={
          phone ? (
            <div className="max-h-[40vh] overflow-y-auto">
              <LookEditorInspector
                section={section}
                draft={editor.draft}
                disabled={editor.readOnly}
                versions={editor.versions}
                currentVersion={editor.record?.profile.currentVersion ?? null}
                onChange={editor.patchDraft}
                onRestoreVersion={editor.restoreVersion}
              />
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
