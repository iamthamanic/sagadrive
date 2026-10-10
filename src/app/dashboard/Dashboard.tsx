/**
 * Dashboard — Authenticated home hub: four primary entry actions.
 * Saga create → /sagas/new; resume → saga overview (#489).
 * Location: src/app/dashboard/Dashboard.tsx
 */
import { useState } from 'react';
import { BookOpen, BookPlus, LogIn, Radio, UserPlus } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { AdaptivePage } from '../../shared/ui/adaptive';
import { CreateCharacterEntryDialog } from '../character';
import { useProjectSummaries } from '../project';
import { pathForSagaNew, pathForSagaSection } from '../shell';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

const actionButtonClass =
  'h-auto min-h-14 w-full flex-col gap-2 px-4 py-6 text-base sm:min-h-28 sm:text-lg';

export function Dashboard({ onNavigate }: DashboardProps) {
  const [createCharacterOpen, setCreateCharacterOpen] = useState(false);
  const { projects } = useProjectSummaries();
  const resumeSagaId =
    projects.find((p) => p.status === 'active' && p.publicId)?.publicId ??
    projects.find((p) => Boolean(p.publicId))?.publicId ??
    null;

  return (
    <AdaptivePage data-au-surface="dashboard" className="h-full w-full">
      <div className="mx-auto flex max-w-3xl flex-col justify-center gap-4 py-4 sm:gap-5 md:min-h-[60vh]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <Button
            type="button"
            variant="outline"
            className={actionButtonClass}
            onClick={() => setCreateCharacterOpen(true)}
            aria-label="Spieler Charakter erstellen"
            data-dashboard-character-create
          >
            <UserPlus className="size-7 sm:size-8" />
            <span className="text-center whitespace-normal leading-snug">
              Spieler Charakter erstellen
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className={actionButtonClass}
            onClick={() => onNavigate('/session-join?intent=join')}
            aria-label="Session beitreten"
            data-dashboard-session-join
          >
            <LogIn className="size-7 sm:size-8" />
            <span className="text-center whitespace-normal leading-snug">Session beitreten</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className={actionButtonClass}
            onClick={() => onNavigate(pathForSagaNew())}
            aria-label="Saga erstellen"
            data-dashboard-saga-create
          >
            <BookPlus className="size-7 sm:size-8" />
            <span className="text-center whitespace-normal leading-snug">Saga erstellen</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className={actionButtonClass}
            onClick={() => onNavigate('/session-join')}
            aria-label="Session starten"
            data-dashboard-session-host
          >
            <Radio className="size-7 sm:size-8" />
            <span className="text-center whitespace-normal leading-snug">Session starten</span>
          </Button>
        </div>

        {resumeSagaId ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full gap-2 text-muted-foreground"
            onClick={() => onNavigate(pathForSagaSection(resumeSagaId, 'overview'))}
            aria-label="Letzte Saga öffnen"
            data-dashboard-saga-open={resumeSagaId}
          >
            <BookOpen className="size-4 shrink-0" />
            Letzte Saga öffnen
          </Button>
        ) : null}
      </div>

      <CreateCharacterEntryDialog
        open={createCharacterOpen}
        onOpenChange={setCreateCharacterOpen}
        onNavigateToEditor={() => onNavigate('character-editor')}
      />
    </AdaptivePage>
  );
}
