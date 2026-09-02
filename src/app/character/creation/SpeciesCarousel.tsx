/**
 * SpeciesCarousel — Swipebare Spezies-Auswahl mit Skizzen, angelehnt an ProjectCarousel (Scriptony).
 * Location: src/modules/characters/components/SpeciesCarousel.tsx
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sagaDriveRaceOptions } from '../../../modules/rulesets/characterCreation';
import { RuleHelp } from '../shared/RuleHelp';
import { SpeciesBannerFlag } from './SpeciesBannerFlag';
import { getSpeciesColorway } from './speciesBanners';
import { getSpeciesSketchUrl } from './speciesSketches';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '../../../components/ui/carousel';
import { useCarouselScrollSync } from '../../../modules/characters/hooks/useCarouselScrollSync';

interface SpeciesCarouselProps {
  selectedRace: string;
  onSelect: (race: string) => void;
  labelledBy?: string;
}

export function SpeciesCarousel({ selectedRace, onSelect, labelledBy = 'species-label' }: SpeciesCarouselProps) {
  const options = sagaDriveRaceOptions;

  const {
    setApi,
    current,
    handleCardClick,
    scrollPrev,
    scrollNext,
  } = useCarouselScrollSync({
    optionsLength: options.length,
    getSelectedIndex: () => options.findIndex((option) => option.value === selectedRace),
    getValueAtIndex: (index) => options[index]?.value,
    isSelectionUnset: () => false,
    shouldSyncScrollToSelection: () => true,
    selectionSyncKey: selectedRace,
    shouldEmitSelect: (_index, value) => value !== selectedRace,
    onSelect,
    selectOnCenterClick: false,
  });

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
        .species-banner-flag-wrap {
          position: relative;
        }
        .species-banner-shimmer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            105deg,
            transparent 35%,
            color-mix(in srgb, var(--species-shimmer-soft) 18%, transparent) 42%,
            color-mix(in srgb, var(--species-shimmer) 48%, transparent) 50%,
            color-mix(in srgb, var(--species-shimmer-soft) 18%, transparent) 58%,
            transparent 65%
          );
          background-size: 220% 100%;
          animation: species-banner-shimmer 2.8s ease-in-out infinite;
          mix-blend-mode: overlay;
        }
        @keyframes species-banner-shimmer {
          0%, 100% {
            background-position: 180% 0;
          }
          50% {
            background-position: -80% 0;
          }
        }
        .species-card-header {
          border-top-width: 2px;
          border-top-style: solid;
          background-color: var(--species-header-bg);
        }
        .species-card-header.is-selected {
          animation: species-header-pulse 2.8s ease-in-out infinite;
        }
        @keyframes species-header-pulse {
          0%, 100% {
            background-color: var(--species-header-bg);
          }
          50% {
            background-color: var(--species-header-bg-pulse);
          }
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
            const colorway = getSpeciesColorway(option.value);
            const headerStyle = {
              '--species-header-bg': colorway.headerBg,
              '--species-header-bg-pulse': colorway.headerBgPulse,
              '--species-accent': colorway.accent,
              '--species-text': colorway.text,
              '--species-border': colorway.border,
              borderTopColor: colorway.border,
            } as React.CSSProperties;
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
                          scrollPrev();
                        }
                        if (event.key === 'ArrowRight') {
                          event.preventDefault();
                          scrollNext();
                        }
                      }}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-background">
                        <SpeciesBannerFlag species={option.value} isSelected={isSelected} />
                        <img
                          src={getSpeciesSketchUrl(option.value)}
                          alt={`Skizze: ${option.label}`}
                          className="absolute inset-0 z-10 h-full w-full object-contain p-3"
                          draggable={false}
                        />
                        {isSelected && isCenter && (
                          <Badge className="absolute right-2 top-2 border-0 bg-primary text-primary-foreground shadow-sm">
                            Gewählt
                          </Badge>
                        )}
                      </div>
                      <CardHeader
                        className={`species-card-header space-y-2 p-3 md:p-4 ${isSelected ? 'is-selected' : ''}`}
                        style={headerStyle}
                      >
                        <div className="flex items-center gap-1">
                          <CardTitle className="text-sm md:text-base" style={{ color: colorway.accent }}>
                            {option.label}
                          </CardTitle>
                          <span className="inline-flex" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                            <RuleHelp label={option.label}>{option.description}</RuleHelp>
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed line-clamp-3" style={{ color: colorway.text }}>
                          {option.description}
                        </p>
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
            onClick={scrollPrev}
            aria-label="Vorherige Spezies"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="species-carousel-nav-button right-0 top-[32%] h-10 w-10 rounded-full border-2 bg-background/95 shadow-xl backdrop-blur-sm md:right-2 md:h-11 md:w-11"
            onClick={scrollNext}
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
              onClick={() => handleCardClick(index)}
              aria-label={`${option.label} anzeigen`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
