/**
 * EssenceCarousel — Swipebare Primär-Essenz-Auswahl, analog zu Archetyp-/Spezies-Karussell.
 * Location: src/app/character/creation/EssenceCarousel.tsx
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sagaDriveEssenceOptions, type SagaDriveEssenceKey } from '../../../modules/rulesets/characterCreation';
import { EssenceIcon } from './EssenceIcon';
import { RuleHelp } from '../shared/RuleHelp';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '../../../components/ui/carousel';
import type { CarouselScrollPhase } from '../../../modules/characters/hooks/carousel.types';
import { useCarouselScrollSync } from '../../../modules/characters/hooks/useCarouselScrollSync';

export type { CarouselScrollPhase } from '../../../modules/characters/hooks/carousel.types';

interface EssenceCarouselProps {
  selectedEssence?: SagaDriveEssenceKey;
  onSelect: (value: SagaDriveEssenceKey) => void;
  labelledBy?: string;
  onScrollPhaseChange?: (phase: CarouselScrollPhase) => void;
}

export function EssenceCarousel({
  selectedEssence,
  onSelect,
  labelledBy = 'essence-label',
  onScrollPhaseChange,
}: EssenceCarouselProps) {
  const options = sagaDriveEssenceOptions;

  const {
    setApi,
    current,
    handleCardClick,
    scrollPrev,
    scrollNext,
  } = useCarouselScrollSync({
    optionsLength: options.length,
    getSelectedIndex: () => options.findIndex((option) => option.value === selectedEssence),
    getValueAtIndex: (index) => options[index]?.value,
    isSelectionUnset: () => !selectedEssence,
    shouldSyncScrollToSelection: () => true,
    selectionSyncKey: selectedEssence,
    shouldEmitSelect: (_index, value) => value !== selectedEssence,
    onSelect,
    onScrollPhaseChange,
    selectOnCenterClick: false,
  });

  return (
    <div className="relative px-0" role="radiogroup" aria-labelledby={labelledBy}>
      <style>{`
        .essence-carousel-item { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .essence-carousel-item:not(.is-center) { opacity: 0.62; filter: blur(1px); }
        .essence-carousel-item:not(.is-center) > div { transform: scale(0.9); }
        .essence-carousel-item.is-center { opacity: 1; filter: blur(0); z-index: 10; }
        .essence-carousel-item.is-center > div { transform: scale(1); }
        .essence-carousel-nav-buttons {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; z-index: 20;
        }
        .essence-carousel-nav-button { pointer-events: auto; position: absolute; cursor: pointer; }
      `}</style>

      <Carousel
        setApi={setApi}
        opts={{ align: 'center', loop: true, skipSnaps: false, dragFree: false, containScroll: 'trimSnaps', duration: 25 }}
        className="w-full"
      >
        <CarouselContent className="-ml-1.5">
          {options.map((option, index) => {
            const isCenter = index === current;
            const isSelected = selectedEssence === option.value;
            return (
              <CarouselItem
                key={option.value}
                className={`essence-carousel-item basis-[64%] pl-1.5 sm:basis-[52%] md:basis-[40%] lg:basis-[34%] ${isCenter ? 'is-center' : ''}`}
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
                      if (event.key === 'ArrowLeft') { event.preventDefault(); scrollPrev(); }
                      if (event.key === 'ArrowRight') { event.preventDefault(); scrollNext(); }
                    }}
                  >
                    <div className="relative flex aspect-[8/7] items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 via-muted/50 to-accent/10">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl md:h-20 md:w-20 ${isCenter ? 'bg-primary/20 text-primary' : 'bg-muted/70 text-muted-foreground'}`}>
                        <EssenceIcon essenceKey={option.value} className="h-8 w-8 md:h-10 md:w-10" />
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
                            Die Essenz beschreibt, wie besondere Fähigkeiten entstehen. Sie ist unabhängig vom Archetyp.
                          </RuleHelp>
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.summary}</p>
                      {isCenter ? (
                        <div
                          className="space-y-2 pt-1"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <p className="text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                          {isSelected ? (
                            <div className="rounded-lg border border-border bg-muted/15 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">Essenz-Manifestation</Badge>
                                <Badge variant="secondary">Rang I · geplant</Badge>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">
                                Die konkrete Rang-I-Manifestation für „{option.label}“ wird ergänzt, sobald der verbindliche Core-Fähigkeitskatalog vorliegt. Die Kernfähigkeit deines Archetyps bleibt davon getrennt.
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{option.description}</p>
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
        <div className="essence-carousel-nav-buttons">
          <Button type="button" variant="outline" size="icon" className="essence-carousel-nav-button left-0 top-[28%] h-10 w-10 rounded-full border-2 bg-background/95 shadow-xl backdrop-blur-sm md:left-2 md:h-11 md:w-11" onClick={scrollPrev} aria-label="Vorherige Essenz">
            <ChevronLeft className="size-5" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="essence-carousel-nav-button right-0 top-[28%] h-10 w-10 rounded-full border-2 bg-background/95 shadow-xl backdrop-blur-sm md:right-2 md:h-11 md:w-11" onClick={scrollNext} aria-label="Nächste Essenz">
            <ChevronRight className="size-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
