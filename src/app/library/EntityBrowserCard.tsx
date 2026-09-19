/**
 * EntityBrowserCard — shared card body for EntityBrowser carousel and list views.
 * Renders a thumbnail slot (image with graceful initials/icon fallback on error or missing URL),
 * title, meta line and optional meta chips; `variant="list"` gives a compact horizontal row,
 * `variant="carousel"` a larger centered card with action buttons.
 * Thumbnail click opens a reusable image lightbox when an image URL is present.
 * Location: src/app/library/EntityBrowserCard.tsx
 */
import { useState, type MouseEvent } from 'react';
import { ImageOff } from 'lucide-react';
import { Badge } from '../../shared/ui/badge';
import { Card, CardContent } from '../../shared/ui/card';
import {
  ImageLightboxDialog,
  useImageLightbox,
} from '../../shared/ui';
import { cn } from '../../shared/ui/utils';

type EntityBrowserCardProps = {
  title: string;
  meta?: string;
  metaChips?: readonly string[];
  /** Optional status badges (e.g. incomplete character draft). */
  badges?: readonly { label: string; variant?: 'destructive' | 'secondary' | 'outline' }[];
  imageUrl?: string;
  imageAlt: string;
  imageFallback: string;
  /** How the thumbnail image fills its square. Default `cover`. Use `contain` for icons. */
  imageObjectFit?: 'cover' | 'contain';
  /** Click thumbnail to enlarge. Default true when `imageUrl` is set. */
  imageEnlargeable?: boolean;
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
  imageObjectFit = 'cover',
  enlargeable = false,
  onEnlarge,
}: {
  imageUrl?: string;
  imageAlt: string;
  imageFallback: string;
  rounded: string;
  className?: string;
  imageObjectFit?: 'cover' | 'contain';
  enlargeable?: boolean;
  onEnlarge?: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = initialsFrom(imageFallback);
  const showImage = Boolean(imageUrl) && !imageFailed;
  const canEnlarge = enlargeable && showImage && Boolean(onEnlarge);

  const handleThumbClick = (event: MouseEvent) => {
    if (!canEnlarge) return;
    event.stopPropagation();
    onEnlarge?.();
  };

  return (
    <div
      className={cn(
        'relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden bg-muted md:h-20 md:w-20',
        rounded,
        canEnlarge && 'cursor-zoom-in ring-offset-background transition hover:ring-2 hover:ring-primary/40',
        className,
      )}
      role={canEnlarge ? 'button' : undefined}
      tabIndex={canEnlarge ? 0 : undefined}
      aria-label={canEnlarge ? `${imageAlt} vergrößern` : undefined}
      data-entity-thumbnail-enlarge={canEnlarge ? true : undefined}
      onClick={canEnlarge ? handleThumbClick : undefined}
      onKeyDown={
        canEnlarge
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                onEnlarge?.();
              }
            }
          : undefined
      }
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          loading="lazy"
          className={cn(
            'pointer-events-none h-full w-full',
            imageObjectFit === 'contain' ? 'object-contain p-1' : 'object-cover',
          )}
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
  badges,
  imageUrl,
  imageAlt,
  imageFallback,
  imageObjectFit = 'cover',
  imageEnlargeable,
  variant,
  isCenter = false,
  actions,
  onOpen,
}: EntityBrowserCardProps) {
  const lightbox = useImageLightbox();
  const enlargeable = imageEnlargeable ?? Boolean(imageUrl);

  const openEnlarge = () => {
    if (!imageUrl) return;
    lightbox.openImage({
      src: imageUrl,
      alt: imageAlt,
      title,
    });
  };

  const thumb = (
    <EntityThumbnail
      imageUrl={imageUrl}
      imageAlt={imageAlt}
      imageFallback={imageFallback}
      imageObjectFit={imageObjectFit}
      enlargeable={enlargeable}
      onEnlarge={openEnlarge}
      rounded={variant === 'list' ? 'rounded-lg' : 'rounded-xl'}
      className={variant === 'carousel' ? 'h-20 w-20 md:h-24 md:w-24' : undefined}
    />
  );

  const lightboxNode = (
    <ImageLightboxDialog
      open={lightbox.open}
      target={lightbox.target}
      onOpenChange={lightbox.onOpenChange}
    />
  );

  if (variant === 'list') {
    return (
      <>
        <Card
          className={cn(
            'group/card overflow-hidden transition-colors hover:border-primary/40',
            onOpen && 'cursor-pointer',
          )}
          onClick={onOpen}
        >
          <div className="flex items-center gap-3 p-3">
            {thumb}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-semibold">{title}</p>
                {badges?.map((badge) => (
                  <Badge key={badge.label} variant={badge.variant ?? 'secondary'} className="text-[10px]">
                    {badge.label}
                  </Badge>
                ))}
              </div>
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
        {lightboxNode}
      </>
    );
  }

  return (
    <>
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
            {thumb}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-semibold md:text-base">{title}</p>
                {badges?.map((badge) => (
                  <Badge key={badge.label} variant={badge.variant ?? 'secondary'} className="text-[10px]">
                    {badge.label}
                  </Badge>
                ))}
              </div>
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
      {lightboxNode}
    </>
  );
}
