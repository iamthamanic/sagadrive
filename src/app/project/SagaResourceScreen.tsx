/**
 * SagaResourceScreen — foundation shell for /sagas/** resource routes (#276).
 * Location: src/app/project/SagaResourceScreen.tsx
 *
 * Deep-linkable Saga sections; full redesign is out of scope for this issue.
 */
import { Button } from '../../shared/ui/button';
import type { SagaSectionId } from '../shell';

type SagaResourceScreenProps = {
  mode: 'list' | 'new' | 'section';
  sagaPublicId?: string | null;
  section?: SagaSectionId;
  onNavigateHome: () => void;
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

export function SagaResourceScreen({
  mode,
  sagaPublicId,
  section = 'overview',
  onNavigateHome,
}: SagaResourceScreenProps) {
  if (mode === 'list') {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold text-foreground">Sagas</h1>
        <p className="text-sm text-muted-foreground">
          Stabile Saga-URLs nutzen öffentliche IDs im Format SA-XXXXX. Interne UUIDs
          und Join-Codes bleiben unverändert.
        </p>
        <Button variant="ghost" className="self-start" onClick={onNavigateHome}>
          Zurück zum Dashboard
        </Button>
        <p className="text-xs text-muted-foreground">
          Öffne eine Saga über Deep Link, z. B.
          {' '}
          <code className="rounded bg-muted px-1">/sagas/SA-K7M4Q</code>
          .
        </p>
      </div>
    );
  }

  if (mode === 'new') {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold text-foreground">Neue Saga</h1>
        <p className="text-sm text-muted-foreground">
          Neue Sagas erhalten serverseitig eine unveränderliche Public ID (SA-XXXXX).
        </p>
        <Button variant="ghost" className="self-start" onClick={onNavigateHome}>
          Abbrechen
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Saga</p>
      <h1 className="text-2xl font-semibold text-foreground">
        {sagaPublicId ?? 'Unbekannte Saga'}
      </h1>
      <p className="text-sm text-muted-foreground">
        Bereich:
        {' '}
        <strong>{SECTION_LABELS[section]}</strong>
        . Reload und Deep Links stellen denselben Kontext wieder her. Berechtigungen
        kommen aus Membership/RLS — nicht aus der URL.
      </p>
      <Button variant="ghost" className="self-start" onClick={onNavigateHome}>
        Zurück
      </Button>
    </div>
  );
}
