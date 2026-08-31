/**
 * ArchetypeCarousel — Swipebare Archetyp-Auswahl mit Icon und Kernfähigkeit, analog zum Spezies-Karussell.
 * Location: src/modules/characters/components/ArchetypeCarousel.tsx
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { sagaDriveArchetypeOptions, type SagaDriveArchetypeKey } from '../../rulesets/characterCreation';
import { ArchetypeIcon } from './ArchetypeIcon';
import { RuleHelp } from './RuleHelp';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '../../../components/ui/carousel';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../components/ui/collapsible';

export type CarouselScrollPhase = 'scrolling' | 'settled';

interface ArchetypeCarouselProps {
  selectedArchetype?: SagaDriveArchetypeKey;
  onSelect: (value: SagaDriveArchetypeKey) => void;
  labelledBy?: string;
  onScrollPhaseChange?: (phase: CarouselScrollPhase) => void;
}

export function ArchetypeCarousel({ selectedArchetype, onSelect, labelledBy = 'archetype-label', onScrollPhaseChange }: ArchetypeCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const skipSelectRef = useRef(false);
  const options = sagaDriveArchetypeOptions;

  useEffect(() => {
    if (!api) return;
    const syncIndex = () => setCurrent(api.selectedScrollSnap());
    syncIndex();
    api.on('select', syncIndex);
    api.on('reInit', syncIndex);
    return () => {
      api.off('select', syncIndex);
      api.off('reInit', syncIndex);
    };
  }, [api]);

  // Embla feuert 'select' beim Scroll-Start und 'settle' nach Slide-Ende —
  // abgeleitete UI (Connector-Fade) koppelt sich an diese Phasen.
  useEffect(() => {
    if (!api || !onScrollPhaseChange) return;
    // Bewegungs-Debounce: 'scroll' feuert kontinuierlich waehrend der Bewegung.
    // 'settled' geht erst raus, wenn 120ms lang kein scroll-Event mehr kam —
    // also exakt, wenn das Karussell wirklich steht (inkl. Ease-out-Schwanz),
    // nicht schon bei ~86% wie beim reinen Timer-Raten.
    let quietTimer: ReturnType<typeof setTimeout> | undefined;
    const onScrolling = () => {
      if (quietTimer) clearTimeout(quietTimer);
      onScrollPhaseChange('scrolling');
    };
    const onScrollActivity = () => {
      if (quietTimer) clearTimeout(quietTimer);
      quietTimer = setTimeout(() => onScrollPhaseChange('settled'), 120);
    };
    api.on('select', onScrolling);
    api.on('scroll', onScrollActivity);
    return () => {
      api.off('select', onScrolling);
      api.off('scroll', onScrollActivity);
      if (quietTimer) clearTimeout(quietTimer);
    };
  }, [api, onScrollPhaseChange]);

  useEffect(() => {
    if (!api || selectedArchetype) return;
    const option = options[api.selectedScrollSnap()];
    if (option) onSelect(option.value);
  }, [api, onSelect, options, selectedArchetype]);

  useEffect(() => {
    if (!api) return;
    const index = options.findIndex((option) => option.value === selectedArchetype);
    if (index < 0 || index === api.selectedScrollSnap()) return;
    skipSelectRef.current = true;
    api.scrollTo(index);
  }, [api, options, selectedArchetype]);

  useEffect(() => {
    if (!api) return;
    const handleSelect = () => {
      if (skipSelectRef.current) {
        skipSelectRef.current = false;
        return;
      }
      const option = options[api.selectedScrollSnap()];
      if (option && option.value !== selectedArchetype) onSelect(option.value);
    };
    api.on('select', handleSelect);
    return () => {
      api.off('select', handleSelect);
    };
  }, [api, onSelect, options, selectedArchetype]);

  const handleCardClick = (index: number) => {
    if (index === current) return;
    api?.scrollTo(index);
  };

  return (
    <div className="relative px-0" role="radiogroup" aria-labelledby={labelledBy}>
      <style>{`
        .archetype-carousel-item { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .archetype-carousel-item:not(.is-center) { opacity: 0.62; filter: blur(1px); }
        .archetype-carousel-item:not(.is-center) > div { transform: scale(0.9); }
        .archetype-carousel-item.is-center { opacity: 1; filter: blur(0); z-index: 10; }
        .archetype-carousel-item.is-center > div { transform: scale(1); }
        .archetype-carousel-nav-buttons {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; z-index: 20;
        }
        .archetype-carousel-nav-button { pointer-events: auto; position: absolute; cursor: pointer; }
      `}</style>

      <Carousel
        setApi={setApi}
        opts={{ align: 'center', loop: true, skipSnaps: false, dragFree: false, containScroll: 'trimSnaps', duration: 25 }}
        className="w-full"
      >
        <CarouselContent className="-ml-1.5">
          {options.map((option, index) => {
            const isCenter = index === current;
            const isSelected = selectedArchetype === option.value;
            const ability = option.coreAbility;
            return (
              <CarouselItem
                key={option.value}
                className={`archetype-carousel-item basis-[64%] pl-1.5 sm:basis-[52%] md:basis-[40%] lg:basis-[34%] ${isCenter ? 'is-center' : ''}`}
              >
                <div className="w-full transition-all duration-300">
                    <Card
                      role="radio"
                      aria-label={option.label}
                      aria-checked={isSelected && isCenter}
                      tabIndex={isCenter ? 0 : -1}
                      className={`overflow-hidden transition-all duration-300 gap-3 ${isCenter ? 'cursor-default border-primary/60 shadow-lg' : 'cursor-pointer'} ${isSelected && isCenter ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => handleCardClick(index)}
                      onKeyDown={(event) => {
                        if (!isCenter) return;
                        if (event.key === 'ArrowLeft') { event.preventDefault(); api?.scrollPrev(); }
                        if (event.key === 'ArrowRight') { event.preventDefault(); api?.scrollNext(); }
                      }}
                    >
                      <div className="relative flex aspect-[8/7] items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 via-muted/50 to-accent/10">
                        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl md:h-20 md:w-20 ${isCenter ? 'bg-primary/20 text-primary' : 'bg-muted/70 text-muted-foreground'}`}>
                          <ArchetypeIcon archetypeKey={option.value} className="h-8 w-8 md:h-10 md:w-10" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                        {isSelected && isCenter && (
                          <Badge className="absolute right-2 top-2 border-0 bg-primary text-primary-foreground shadow-sm">Gewählt</Badge>
                        )}
                      </div>
                      <CardHeader className="space-y-1.5 p-3 md:p-3.5">
                        <div className="flex items-center gap-1">
                          <CardTitle className="text-sm md:text-base">{option.label}</CardTitle>
                          <span className="inline-flex" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                            <RuleHelp label={option.label}>
                              Der Archetyp beschreibt, was dein Charakter besonders gut tut. Er bestimmt die Kernfähigkeit und typische Fertigkeiten.
                            </RuleHelp>
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{option.summary}</p>
                        {!isCenter && <p className="text-xs">Kernfähigkeit: {ability.name}</p>}
                        {isCenter && (
                          <div
                            className="space-y-1.5"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <p className="text-xs font-medium text-muted-foreground">
                              {ability.actionType}-Skill
                            </p>
                            <Collapsible defaultOpen={false}>
                              <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-left transition-colors hover:bg-primary/10">
                                <span className="text-sm font-semibold">{ability.name}</span>
                                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <article className="mt-1.5 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge variant="outline">{option.label}</Badge>
                                    <Badge>Rang {ability.rank}</Badge>
                                    <Badge variant="secondary">{ability.actionType}</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{ability.description}</p>
                                  <p className="text-xs leading-relaxed">{ability.effect}</p>
                                </article>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        )}
                      </CardHeader>
                    </Card>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {options.length > 1 && (
        <div className="archetype-carousel-nav-buttons">
          <Button type="button" variant="outline" size="icon" className="archetype-carousel-nav-button left-0 top-[28%] h-10 w-10 rounded-full border-2 bg-background/95 shadow-xl backdrop-blur-sm md:left-2 md:h-11 md:w-11" onClick={() => api?.scrollPrev()} aria-label="Vorheriger Archetyp">
            <ChevronLeft className="size-5" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="archetype-carousel-nav-button right-0 top-[28%] h-10 w-10 rounded-full border-2 bg-background/95 shadow-xl backdrop-blur-sm md:right-2 md:h-11 md:w-11" onClick={() => api?.scrollNext()} aria-label="Nächster Archetyp">
            <ChevronRight className="size-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
