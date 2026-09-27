/**
 * LookLibraryCard — card for a LookProfile in Bibliothek › Looks (#343).
 * Location: src/app/library/looks/LookLibraryCard.tsx
 */
import { Archive, Copy, Edit, Palette } from 'lucide-react';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import {
  lookPreviewUri,
  lookStatusLabel,
  lookStyleFamilyLabel,
  type LookProfileRecord,
} from '../../../domains/look';

export interface LookLibraryCardProps {
  look: LookProfileRecord;
  canMutate: boolean;
  onEdit: (profileId: string) => void;
  onDuplicate: (profileId: string) => void;
  onArchive: (profileId: string) => void;
}

export function LookLibraryCard({
  look,
  canMutate,
  onEdit,
  onDuplicate,
  onArchive,
}: LookLibraryCardProps) {
  const preview = lookPreviewUri(look);
  const isArchived = look.status === 'archived';

  return (
    <article
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4"
      data-look-library-card={look.profile.id}
    >
      <div className="flex min-h-28 items-center justify-center overflow-hidden rounded-md bg-muted">
        {preview && /^https?:\/\//i.test(preview) ? (
          <img
            src={preview}
            alt={`Vorschau ${look.current.displayName}`}
            width={320}
            height={112}
            loading="lazy"
            className="max-h-28 w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Palette className="size-8" aria-hidden="true" />
            <span className="text-xs">Keine Vorschau</span>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-1">
        <h3 className="truncate text-base font-medium">{look.current.displayName}</h3>
        <p className="text-sm text-muted-foreground">
          {lookStyleFamilyLabel(look.current.source)} · v{look.profile.currentVersion}
        </p>
        <Badge variant={isArchived ? 'secondary' : 'default'}>
          {lookStatusLabel(look.status)}
        </Badge>
      </div>

      {canMutate ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onEdit(look.profile.id)}
            data-look-action="edit"
          >
            <Edit className="mr-1.5 size-4" />
            Bearbeiten
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDuplicate(look.profile.id)}
            data-look-action="duplicate"
          >
            <Copy className="mr-1.5 size-4" />
            Duplizieren
          </Button>
          {!isArchived ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onArchive(look.profile.id)}
              data-look-action="archive"
            >
              <Archive className="mr-1.5 size-4" />
              Archivieren
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
