import { useState } from 'react';
import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { CHARACTER_STUDIO_DEMO_URL, normalizeAvatarModelUrl } from './avatar';

function getCharacterStudioUrl(): string {
  const configuredUrl = import.meta.env.VITE_CHARACTER_STUDIO_URL;
  return normalizeAvatarModelUrl(configuredUrl ?? '') ?? CHARACTER_STUDIO_DEMO_URL;
}

export function CharacterStudioPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const studioUrl = getCharacterStudioUrl();

  return (
    <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">3D Character Studio</p>
          <p className="text-sm text-muted-foreground">
            Erstelle deinen Avatar mit M3 CharacterStudio und exportiere ihn als VRM oder GLB.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(studioUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Neues Fenster
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsOpen((current) => !current)}
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <Minimize2 className="w-4 h-4 mr-2" />
            ) : (
              <Maximize2 className="w-4 h-4 mr-2" />
            )}
            {isOpen ? 'Studio schließen' : 'Studio öffnen'}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-border bg-background">
          <iframe
            src={studioUrl}
            title="M3 CharacterStudio"
            className="w-full h-[620px]"
            loading="lazy"
            sandbox="allow-downloads allow-forms allow-modals allow-pointer-lock allow-same-origin allow-scripts"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
