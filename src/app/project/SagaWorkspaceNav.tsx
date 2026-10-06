/**
 * SagaWorkspaceNav — Section links inside a Saga (#489).
 * Location: src/app/project/SagaWorkspaceNav.tsx
 */
import { Button } from '../../shared/ui/button';
import type { SagaSectionId } from '../shell';
import { pathForSagaSection } from '../shell';

const SECTIONS: readonly { id: SagaSectionId; label: string }[] = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'characters', label: 'Charaktere' },
  { id: 'world', label: 'Welt' },
  { id: 'npc-creatures', label: 'NSCs / Kreaturen' },
  { id: 'items', label: 'Gegenstände' },
  { id: 'quests', label: 'Quests' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'settings', label: 'Einstellungen' },
];

export type SagaWorkspaceNavProps = {
  sagaPublicId: string;
  active: SagaSectionId;
  onNavigate: (view: string) => void;
};

export function SagaWorkspaceNav({
  sagaPublicId,
  active,
  onNavigate,
}: SagaWorkspaceNavProps) {
  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label="Saga-Bereiche"
      data-saga-workspace-nav
    >
      {SECTIONS.map((section) => (
        <Button
          key={section.id}
          type="button"
          size="sm"
          variant={active === section.id ? 'default' : 'outline'}
          className="min-h-11"
          onClick={() => onNavigate(pathForSagaSection(sagaPublicId, section.id))}
          data-saga-nav={section.id}
          aria-current={active === section.id ? 'page' : undefined}
        >
          {section.label}
        </Button>
      ))}
    </nav>
  );
}
