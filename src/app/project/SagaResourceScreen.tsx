/**
 * SagaResourceScreen — Canonical /sagas/** workspace shell (#276 / #489).
 * Location: src/app/project/SagaResourceScreen.tsx
 *
 * List + create are real product surfaces; section shells host existing panels
 * or clear empty/unavailable states. Internal domain remains „project“.
 */
import { Button } from '../../shared/ui/button';
import { AdaptivePage } from '../../shared/ui/adaptive';
import { buildSessionJoinPath } from '../../domains/session/contracts/session-entry-routing';
import type { SagaSectionId } from '../shell';
import { pathForSagaList, pathForSagaSection } from '../shell';
import { SagaCreateForm } from './SagaCreateForm';
import { SagaListPanel } from './SagaListPanel';
import { SagaWorkspaceNav } from './SagaWorkspaceNav';
import { SagaVisualStyleSettings } from './SagaVisualStyleSettings';
import { WorldLookPreviewPanel } from './WorldLookPreviewPanel';

type SagaResourceScreenProps = {
  mode: 'list' | 'new' | 'section';
  sagaPublicId?: string | null;
  section?: SagaSectionId;
  onNavigateHome: () => void;
  onNavigate?: (view: string) => void;
};

const SECTION_LABELS: Record<SagaSectionId, string> = {
  overview: 'Übersicht',
  characters: 'Charaktere',
  world: 'Welt',
  'npc-creatures': 'NSCs / Kreaturen',
  items: 'Gegenstände',
  quests: 'Quests',
  sessions: 'Sessions',
  settings: 'Einstellungen',
};

const UNAVAILABLE_COPY: Partial<Record<SagaSectionId, string>> = {
  characters: 'Charakterverwaltung öffnest du über die Bibliothek — hier folgt später die Saga-Zuordnung.',
  'npc-creatures': 'NSC-/Kreatur-Werkzeuge findest du in der Bibliothek.',
  items: 'Gegenstände verwaltest du in der Bibliothek / Item-Workbench.',
  quests: 'Quest-Werkzeuge sind in dieser Saga-Ansicht noch nicht verfügbar.',
};

export function SagaResourceScreen({
  mode,
  sagaPublicId,
  section = 'overview',
  onNavigateHome,
  onNavigate,
}: SagaResourceScreenProps) {
  const navigate = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
      return;
    }
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', view.startsWith('/') ? view : `/${view}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const goSessionJoin = () => {
    navigate(
      buildSessionJoinPath({
        sagaPublicId: sagaPublicId ?? null,
        intent: 'create',
      }),
    );
  };

  if (mode === 'list') {
    return (
      <AdaptivePage data-au-surface="saga-list" className="h-full w-full">
        <SagaListPanel onNavigate={navigate} onNavigateHome={onNavigateHome} />
      </AdaptivePage>
    );
  }

  if (mode === 'new') {
    return (
      <AdaptivePage data-au-surface="saga-new" className="h-full w-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-6" data-saga-new>
          <h1 className="text-2xl font-semibold text-foreground">Neue Saga</h1>
          <p className="text-sm text-muted-foreground">
            Nach dem Erstellen öffnet sich die Saga-Übersicht. Die Public ID (SA-XXXXX) wird
            serverseitig vergeben.
          </p>
          <SagaCreateForm
            onCancel={() => navigate(pathForSagaList())}
            onCreated={(publicId) => navigate(pathForSagaSection(publicId, 'overview'))}
          />
        </div>
      </AdaptivePage>
    );
  }

  const id = sagaPublicId?.trim() || null;

  const header = (
    <div className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Saga</p>
        <h1 className="text-2xl font-semibold text-foreground">
          {id ?? 'Unbekannte Saga'}
          {section !== 'overview' ? ` · ${SECTION_LABELS[section]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Berechtigungen kommen aus Membership/RLS — nicht aus der URL.
        </p>
      </div>
      {id ? (
        <SagaWorkspaceNav sagaPublicId={id} active={section} onNavigate={navigate} />
      ) : null}
    </div>
  );

  if (!id) {
    return (
      <AdaptivePage data-au-surface="saga-section" className="h-full w-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
          {header}
          <p className="text-sm text-destructive" role="alert">
            Diese Saga-URL ist ungültig oder die Saga existiert nicht.
          </p>
          <Button type="button" variant="ghost" className="min-h-11 self-start" onClick={onNavigateHome}>
            Zurück
          </Button>
        </div>
      </AdaptivePage>
    );
  }

  if (section === 'settings') {
    return (
      <AdaptivePage data-au-surface="saga-section" className="h-full w-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6" data-saga-section="settings">
          {header}
          <SagaVisualStyleSettings sagaPublicId={id} onNavigate={onNavigate} />
          <Button type="button" variant="ghost" className="min-h-11 self-start" onClick={onNavigateHome}>
            Zurück
          </Button>
        </div>
      </AdaptivePage>
    );
  }

  if (section === 'world') {
    return (
      <AdaptivePage data-au-surface="saga-section" className="h-full w-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6" data-saga-section="world">
          {header}
          <WorldLookPreviewPanel sagaPublicId={id} onNavigate={onNavigate} />
          <Button type="button" variant="ghost" className="min-h-11 self-start" onClick={onNavigateHome}>
            Zurück
          </Button>
        </div>
      </AdaptivePage>
    );
  }

  if (section === 'sessions') {
    return (
      <AdaptivePage data-au-surface="saga-section" className="h-full w-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-6" data-saga-section="sessions">
          {header}
          <p className="text-sm text-muted-foreground">
            Starte oder betrete eine Spielsession über die Session-UI.
          </p>
          <Button type="button" className="min-h-11 self-start" onClick={goSessionJoin} data-saga-sessions-join>
            Session starten / beitreten
          </Button>
          <Button type="button" variant="ghost" className="min-h-11 self-start" onClick={onNavigateHome}>
            Zurück
          </Button>
        </div>
      </AdaptivePage>
    );
  }

  if (section === 'overview') {
    return (
      <AdaptivePage data-au-surface="saga-section" className="h-full w-full">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-6" data-saga-section="overview">
          {header}
          <p className="text-sm text-muted-foreground">
            Wähle einen Bereich oben oder starte direkt eine Session.
          </p>
          <Button type="button" className="min-h-11 self-start" onClick={goSessionJoin} data-saga-session-start>
            Session starten
          </Button>
          <Button type="button" variant="ghost" className="min-h-11 self-start" onClick={onNavigateHome}>
            Zurück
          </Button>
        </div>
      </AdaptivePage>
    );
  }

  return (
    <AdaptivePage data-au-surface="saga-section" className="h-full w-full">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-6" data-saga-section={section}>
        {header}
        <p className="text-sm text-muted-foreground" data-saga-section-unavailable>
          {UNAVAILABLE_COPY[section] ??
            `Bereich „${SECTION_LABELS[section]}“ ist noch nicht verfügbar.`}
        </p>
        <Button type="button" variant="ghost" className="min-h-11 self-start" onClick={onNavigateHome}>
          Zurück
        </Button>
      </div>
    </AdaptivePage>
  );
}
