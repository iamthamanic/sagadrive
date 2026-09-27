/**
 * LookLibraryBrowser — Bibliothek › Looks tab (#343).
 * Location: src/app/library/looks/LookLibraryBrowser.tsx
 */
import { Loader2, Plus, Search } from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { LookLibraryCard } from './LookLibraryCard';
import { useLookLibrary } from './useLookLibrary';
import { toast } from 'sonner';

export interface LookLibraryBrowserProps {
  enabled?: boolean;
  /** When false, hide create/edit/duplicate/archive. */
  canMutate?: boolean;
  onCreateLook: () => void;
  onEditLook: (profileId: string) => void;
}

export function LookLibraryBrowser({
  enabled = true,
  canMutate = true,
  onCreateLook,
  onEditLook,
}: LookLibraryBrowserProps) {
  const library = useLookLibrary({ enabled, canMutate });

  const handleDuplicate = async (profileId: string) => {
    const ok = await library.duplicateLook(profileId);
    if (ok) toast.success('Look dupliziert');
    else toast.error('Duplizieren fehlgeschlagen');
  };

  const handleArchive = async (profileId: string) => {
    if (!confirm('Diesen Look archivieren?')) return;
    const ok = await library.archiveLook(profileId);
    if (ok) toast.success('Look archiviert');
    else toast.error('Archivieren fehlgeschlagen');
  };

  return (
    <div className="space-y-4" data-look-library-browser>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Looks suchen…"
            value={library.searchQuery}
            onChange={(event) => library.setSearchQuery(event.target.value)}
            className="h-11 min-h-11 pl-10"
            aria-label="Looks suchen"
            data-look-library-search
          />
        </div>
        {canMutate ? (
          <Button type="button" onClick={onCreateLook} data-look-create>
            <Plus className="mr-2 size-4" />
            Look erstellen
          </Button>
        ) : null}
      </div>

      {library.error ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3" role="alert">
          <p className="text-sm text-destructive">{library.error}</p>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={library.refresh}>
            Erneut versuchen
          </Button>
        </div>
      ) : null}

      {library.isLoading ? (
        <div className="flex items-center justify-center py-12" data-look-library-loading>
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Lädt" />
        </div>
      ) : null}

      {!library.isLoading && !library.error && library.looks.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-border p-8 text-center"
          data-look-library-empty
        >
          <p className="text-muted-foreground">Noch keine Looks.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Erstelle einen visuellen Stil, den du für Charaktere, Welten und Sessions
            wiederverwenden kannst.
          </p>
          {canMutate ? (
            <Button type="button" className="mt-4" onClick={onCreateLook}>
              <Plus className="mr-2 size-4" />
              Ersten Look erstellen
            </Button>
          ) : null}
        </div>
      ) : null}

      {!library.isLoading && library.looks.length > 0 && library.filteredLooks.length === 0 ? (
        <div className="rounded-lg border border-border p-6 text-center" data-look-library-filtered-empty>
          <p className="text-muted-foreground">Keine Looks für diese Suche.</p>
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={library.resetFilters}>
            Filter zurücksetzen
          </Button>
        </div>
      ) : null}

      {!library.isLoading && library.filteredLooks.length > 0 ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-look-library-success
        >
          {library.filteredLooks.map((look) => (
            <LookLibraryCard
              key={look.profile.id}
              look={look}
              canMutate={canMutate}
              onEdit={onEditLook}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
