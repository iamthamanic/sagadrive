/**
 * EntityBrowser — shared browse shell for the Library entity tabs (Charaktere, später Abenteuer/Welten).
 * Renders a Scriptony-style carousel (center-focus, dots, chevron navigation) or a compact list view,
 * persists the chosen view mode per storageKey in localStorage and falls back safely
 * (desktop = list, mobile = carousel) when localStorage is unavailable (private mode).
 * Location: src/components/EntityBrowser.tsx.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import { Button } from './ui/button';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from './ui/carousel';
import { cn } from './ui/utils';

export type EntityBrowserViewMode = 'carousel' | 'list';

export type EntityBrowserRenderContext = {
  variant: EntityBrowserViewMode;
  isCenter: boolean;
  /** Carousel: side card click scrolls to center, center card click activates. List: activates. */
  onActivate: () => void;
};

type EntityBrowserProps<T extends { id: string }> = {
  storageKey: string;
  items: T[];
  getId: (item: T) => string;
  renderItem: (item: T, context: EntityBrowserRenderContext) => ReactNode;
  onOpenItem?: (item: T) => void;
  toolbarLeft?: ReactNode;
  toolbarRight?: ReactNode;
  emptyState?: ReactNode;
};

const VIEW_MODES: readonly EntityBrowserViewMode[] = ['carousel', 'list'];

function isViewMode(value: unknown): value is EntityBrowserViewMode {
  return typeof value === 'string' && (VIEW_MODES as readonly string[]).includes(value);
}

function loadInitialViewMode(storageKey: string): EntityBrowserViewMode {
  const fallback: EntityBrowserViewMode = window.innerWidth >= 768 ? 'list' : 'carousel';
  try {
    const saved = window.localStorage.getItem(storageKey);
    return isViewMode(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

function CarouselViewModeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-4" aria-hidden="true">
      <rect x="1" y="4" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="6" y="2" width="4" height="12" rx="0.5" fill="currentColor" />
      <rect x="12" y="4" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export function EntityBrowser<T extends { id: string }>({
  storageKey,
  items,
  getId,
  renderItem,
  onOpenItem,
  toolbarLeft,
  toolbarRight,
  emptyState,
}: EntityBrowserProps<T>) {
  const [viewMode, setViewMode] = useState<EntityBrowserViewMode>(() => loadInitialViewMode(storageKey));
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const hasInitialized = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, viewMode);
    } catch {
      // Private mode / storage disabled: keep in-memory preference only.
    }
  }, [storageKey, viewMode]);

  useEffect(() => {
    if (!api) return;

    if (!hasInitialized.current) {
      const timeout = window.setTimeout(() => {
        api.scrollTo(0, true);
        hasInitialized.current = true;
      }, 100);
      return () => window.clearTimeout(timeout);
    }

    const updateState = () => setCurrent(api.selectedScrollSnap());
    updateState();
    api.on('select', updateState);
    api.on('reInit', updateState);

    return () => {
      api.off('select', updateState);
    };
  }, [api]);

  useEffect(() => {
    if (api && hasInitialized.current) {
      const timeout = window.setTimeout(() => api.scrollTo(0, true), 100);
      return () => window.clearTimeout(timeout);
    }
  }, [items.length, api]);

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const activateItem = (item: T, index: number) => {
    if (viewMode === 'list') {
      onOpenItem?.(item);
      return;
    }
    if (index === current) {
      onOpenItem?.(item);
    } else {
      api?.scrollTo(index);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 text-sm text-muted-foreground">{toolbarLeft}</div>
        <div className="flex items-center gap-2">
          {toolbarRight}
          <div className="flex items-center gap-1 rounded-lg border p-1" role="group" aria-label="Ansicht wählen">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Karussell-Ansicht"
              aria-pressed={viewMode === 'carousel'}
              onClick={() => setViewMode('carousel')}
              className={cn('h-8 w-8 p-0', viewMode === 'carousel' && 'bg-background shadow-sm')}
            >
              <CarouselViewModeIcon />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Listenansicht"
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              className={cn('h-8 w-8 p-0', viewMode === 'list' && 'bg-background shadow-sm')}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'carousel' ? (
        <div className="relative py-3 pb-12">
          <style>{`
            .entity-browser-carousel-item { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
            .entity-browser-carousel-item:not(.is-center) { opacity: 0.5; filter: blur(2px); }
            .entity-browser-carousel-item:not(.is-center) > div { transform: scale(0.94); }
            .entity-browser-carousel-item.is-center { opacity: 1; filter: blur(0); z-index: 10; }
            .entity-browser-carousel-item.is-center > div { transform: scale(1); }
            .entity-browser-nav { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1000; }
            .entity-browser-nav > * { pointer-events: auto; }
          `}</style>

          <Carousel
            setApi={setApi}
            opts={{
              align: 'center',
              loop: items.length > 1,
              skipSnaps: false,
              dragFree: false,
              containScroll: 'trimSnaps',
              duration: 25,
            }}
            className="w-full"
          >
            <CarouselContent className={items.length === 1 ? '' : '-ml-4 md:-ml-0'}>
              {items.map((item, index) => (
                <CarouselItem
                  key={getId(item)}
                  className={cn(
                    items.length === 1 ? '' : 'pl-4 md:pl-0 basis-[85%] sm:basis-[70%] md:basis-[38%] lg:basis-[36%]',
                    'entity-browser-carousel-item',
                    index === current && 'is-center',
                  )}
                >
                  <div className="flex justify-center transition-all duration-300">
                    <div className="w-full">
                      {renderItem(item, {
                        variant: 'carousel',
                        isCenter: index === current,
                        onActivate: () => activateItem(item, index),
                      })}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {items.length > 1 && (
            <div className="entity-browser-nav">
              <Button
                variant="outline"
                size="icon"
                className="absolute top-[30%] left-1 md:left-4 h-10 w-10 md:h-12 md:w-12 rounded-full bg-background/95 backdrop-blur-sm hover:bg-background shadow-xl border-2 transition-transform hover:scale-110"
                aria-label="Vorheriges Element"
                onClick={() => api?.scrollPrev()}
              >
                <ChevronLeft className="size-5 md:size-6" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute top-[30%] right-1 md:right-4 h-10 w-10 md:h-12 md:w-12 rounded-full bg-background/95 backdrop-blur-sm hover:bg-background shadow-xl border-2 transition-transform hover:scale-110"
                aria-label="Nächstes Element"
                onClick={() => api?.scrollNext()}
              >
                <ChevronRight className="size-5 md:size-6" />
              </Button>
            </div>
          )}

          {items.length > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {items.map((item, index) => (
                <button
                  key={getId(item)}
                  type="button"
                  aria-label={`Zu Element ${index + 1} springen`}
                  className={cn(
                    'h-2 w-2 rounded-full p-0 transition-opacity',
                    index === current ? 'bg-primary opacity-100' : 'bg-primary opacity-30',
                  )}
                  onClick={() => api?.scrollTo(index)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={getId(item)}>
              {renderItem(item, {
                variant: 'list',
                isCenter: false,
                onActivate: () => activateItem(item, 0),
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}