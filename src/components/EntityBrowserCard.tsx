/**
 * EntityBrowserCard — shared card body for EntityBrowser carousel and list views.
 * Renders a thumbnail slot (image with graceful initials/icon fallback on error or missing URL),
 * title, meta line and optional meta chips; `variant="list"` gives a compact horizontal row,
 * `variant="carousel"` a larger centered card with action buttons.
 * Location: src/components/EntityBrowserCard.tsx.
 */
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { cn } from './ui/utils';

type EntityBrowserCardProps = {
  title: string;
  meta?: string;
  metaChips?: readonly string[];
  imageUrl?: string;
  imageAlt: string;
  imageFallback: string;
  variant: 'carousel' | 'list';
  /** Marks the carousel center card with a subtle primary border for focus feedback. */
  isCenter?: boolean;
  actions?: React.ReactNode;
  onOpen?: () => void;
};

const FALLBACK_COLOR_CLASSES: readonly string[] = [
  'bg-primary/15 text-primary',
  'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
];

function fallbackColorClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }
  const index = hash % FALLBACK_COLOR_CLASSES.length;
  return FALLBACK_COLOR_CLASSES[index] ?? FALLBACK_COLOR_CLASSES[0];
}

function initialsFrom(imageFallback: string): string[] {
  return imageFallback
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .filter(Boolean);
}

function EntityThumbnail({
  imageUrl,
  imageAlt,
  imageFallback,
  rounded,
  className,
}: {
  imageUrl?: string;
  imageAlt: string;
  imageFallback: string;
  rounded: string;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = initialsFrom(imageFallback);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <div
      className={cn(
        'relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden bg-muted md:h-20 md:w-20',
        rounded,
        className,
      )}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          className={cn(
            'flex h-full w-full items-center justify-center text-sm font-semibold select-none',
            fallbackColorClass(imageFallback),
          )}
        >
          {initials.length > 0 ? (
            initials.join('')
          ) : (
            <ImageOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          )}
        </span>
      )}
    </div>
  );
}

export function EntityBrowserCard({
  title,
  meta,
  metaChips,
  imageUrl,
  imageAlt,
  imageFallback,
  variant,
  isCenter = false,
  actions,
  onOpen,
}: EntityBrowserCardProps) {
  if (variant === 'list') {
    return (
      <Card
        className={cn(
          'group/card overflow-hidden transition-colors hover:border-primary/40',
          onOpen && 'cursor-pointer',
        )}
        onClick={onOpen}
      >
        <div className="flex items-center gap-3 p-3">
          <EntityThumbnail
            imageUrl={imageUrl}
            imageAlt={imageAlt}
            imageFallback={imageFallback}
            rounded="rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
            {metaChips && metaChips.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {metaChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
          {actions && (
            <div
              className="flex flex-shrink-0 items-center gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'mx-auto w-full max-w-sm overflow-hidden transition-colors',
        isCenter ? 'border-primary/50' : 'hover:border-primary/40',
        onOpen && 'cursor-pointer',
      )}
      onClick={onOpen}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <EntityThumbnail
            imageUrl={imageUrl}
            imageAlt={imageAlt}
            imageFallback={imageFallback}
            rounded="rounded-xl"
            className="h-20 w-20 md:h-24 md:w-24"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold md:text-base">{title}</p>
            {meta && <p className="truncate text-xs text-muted-foreground md:text-sm">{meta}</p>}
            {metaChips && metaChips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {metaChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  );
}