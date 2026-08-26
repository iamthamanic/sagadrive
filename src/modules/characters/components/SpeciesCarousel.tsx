/**
 * SpeciesCarousel — Swipebare Spezies-Auswahl mit Skizzen, angelehnt an ProjectCarousel (Scriptony).
 * Location: src/modules/characters/components/SpeciesCarousel.tsx
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sagaDriveRaceOptions } from '../../rulesets/characterCreation';
import { RuleHelp } from './RuleHelp';
import { getSpeciesSketchUrl } from './speciesSketches';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '../../../components/ui/carousel';

interface SpeciesCarouselProps {
  selectedRace: string;
  onSelect: (race: string) => void;
  labelledBy?: string;
}

export function SpeciesCarousel({ selectedRace, onSelect, labelledBy = 'species-label' }: SpeciesCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const skipSelectRef = useRef(false);
  const options = sagaDriveRaceOptions;

  useEffect(() => {
    if (!api) return;

    const syncIndex = () => {
      setCurrent(api.selectedScrollSnap());
    };

    syncIndex();
    api.on('select', syncIndex);
    api.on('reInit', syncIndex);

    return () => {
      api.off('select', syncIndex);
      api.off('reInit', syncIndex);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const index = options.findIndex((option) => option.value === selectedRace);
    if (index < 0 || index === api.selectedScrollSnap()) return;
    skipSelectRef.current = true;
    api.scrollTo(index);
  }, [api, options, selectedRace]);

  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      if (skipSelectRef.current) {
        skipSelectRef.current = false;
        return;
      }
      const option = options[api.selectedScrollSnap()];
      if (option && option.value !== selectedRace) onSelect(option.value);
    };

    api.on('select', handleSelect);
    return () => {
      api.off('select', handleSelect);
    };
  }, [api, onSelect, options, selectedRace]);

  const handleCardClick = (index: number) => {
    if (index === current) return;
    api?.scrollTo(index);
  };

  return (
    <div className="relative px-0 py-2 md:py-4" role="radiogroup" aria-labelledby={labelledBy}>
      <style>{`
        .species-carousel-item {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .species-carousel-item:not(.is-center) {
          opacity: 0.62;
          filter: blur(1px);
        }
        .species-carousel-item:not(.is-center) > div {
          transform: scale(0.9);
        }
        .species-carousel-item.is-center {
          opacity: 1;
          filter: blur(0);
          z-index: 10;
        }
        .species-carousel-item.is-center > div {
          transform: scale(1);
        }
        .species-carousel-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
        }
        .species-carousel-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: hsl(var(--primary));
          opacity: 0.3;
          transition: opacity 0.3s ease;
          cursor: pointer;
        }
        .species-carousel-dot.active {
          opacity: 1;
        }
        .species-carousel-nav-buttons {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 20;
        }
        .species-carousel-nav-button {
          pointer-events: auto;
          position: absolute;
          cursor: pointer;
        }
      `}</style>

      <Carousel
        setApi={setApi}
        opts={{
          align: 'center',
          loop: true,
          skipSnaps: false,
          dragFree: false,
          containScroll: 'trimSnaps',
          duration: 25,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-1.5">
          {options.map((option, index) => {
            const isCenter = index === current;
            const isSelected = selectedRace === option.value;
            return (
              <CarouselItem
                key={option.value}
                className={`species-carousel-item basis-[64%] pl-1.5 sm:basis-[52%] md:basis-[40%] lg:basis-[34%] ${isCenter ? 'is-center' : ''}`}
              >
                <div className="w-full transition-all duration-300">
                    <Card
                      role="radio"
                      aria-label={option.label}
                      aria-checked={isSelected && isCenter}
                      tabIndex={isCenter ? 0 : -1}
                      className={`overflow-hidden transition-all duration-300 ${isCenter ? 'cursor-default border-primary/60 shadow-lg' : 'cursor-pointer'} ${isSelected && isCenter ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => handleCardClick(index)}
                      onKeyDown={(event) => {
                        if (!isCenter) return;
                        if (event.key === 'ArrowLeft') {
                          event.preventDefault();
                          api?.scrollPrev();
                        }
                        if (event.key === 'ArrowRight') {
                          event.preventDefault();
                          api?.scrollNext();
                        }
                      }}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-background">
                        <img
                          src={getSpeciesSketchUrl(option.value)}
                          alt={`Skizze: ${option.label}`}
                          className="absolute inset-0 h-full w-full object-contain p-3"
                          draggable={false}
                        />
                        {isSelected && isCenter && (
                          <Badge className="absolute right-2 top-2 border-0 bg-primary text-primary-foreground shadow-sm">
                            Gewählt
                          </Badge>
                        )}
                      </div>
                      <CardHeader className="space-y-2 p-3 md:p-4">
                        <div className="flex items-center gap-1">
                          <CardTitle className="text-sm md:text-base">{option.label}</CardTitle>
                          <span className="inline-flex" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                            <RuleHelp label={option.label}>{option.description}</RuleHelp>
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">{option.description}</p>
                      </CardHeader>
                    </Card>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {options.length > 1 && (
        <div className="species-carousel-nav-buttons">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="species-carousel-nav-button left-0 top-[32%] h-10 w-10 rounded-full border-2 bg-background/95 shadow-xl backdrop-blur-sm md:left-2 md:h-11 md:w-11"
            onClick={() => api?.scrollPrev()}
            aria-label="Vorherige Spezies"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="species-carousel-nav-button right-0 top-[32%] h-10 w-10 rounded-full border-2 bg-background/95 shadow-xl backdrop-blur-sm md:right-2 md:h-11 md:w-11"
            onClick={() => api?.scrollNext()}
            aria-label="Nächste Spezies"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      )}

      {options.length > 1 && (
        <div className="species-carousel-dots">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              className={`species-carousel-dot ${index === current ? 'active' : ''}`}
              onClick={() => api?.scrollTo(index)}
              aria-label={`${option.label} anzeigen`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
