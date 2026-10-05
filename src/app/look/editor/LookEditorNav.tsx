/**
 * LookEditorNav — Left section navigation for Look Editor (#344).
 * Location: src/app/look/editor/LookEditorNav.tsx
 */
import { Button } from '../../../shared/ui/button';
import { LOOK_EDITOR_NAV, type LookEditorSectionId } from './look-editor-sections';

type LookEditorNavProps = {
  section: LookEditorSectionId;
  onSectionChange: (section: LookEditorSectionId) => void;
};

export function LookEditorNav({ section, onSectionChange }: LookEditorNavProps) {
  return (
    <nav className="flex flex-col gap-1 p-2" aria-label="Look-Bereiche" data-look-editor-nav>
      {LOOK_EDITOR_NAV.map((item) => (
        <Button
          key={item.id}
          type="button"
          variant={section === item.id ? 'default' : 'ghost'}
          className="min-h-11 justify-start"
          aria-current={section === item.id ? 'page' : undefined}
          data-look-editor-nav-item={item.id}
          onClick={() => onSectionChange(item.id)}
        >
          <span>{item.labelDe}</span>
          {item.reserved ? (
            <span className="ml-auto text-[10px] text-muted-foreground">bald</span>
          ) : null}
        </Button>
      ))}
    </nav>
  );
}
