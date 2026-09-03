/**
 * AttributeSkillsCarousel — Swipebare Attribut-Gruppen für den Skills-Tab,
 * analog zu Hintergrund-/Essenz-Karussell.
 * Location: src/app/character/progression/AttributeSkillsCarousel.tsx
 */
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Eye,
  HeartPulse,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  sagaDriveAttributeDefinitions,
  sagaDriveSkillDefinitions,
  type SagaDriveAttributeKey,
} from '../../../modules/rulesets/characterCreation';
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

const ATTRIBUTE_ICONS: Readonly<Record<SagaDriveAttributeKey, LucideIcon>> = {
  strength: Dumbbell,
  dexterity: Zap,
  endurance: HeartPulse,
  mind: Brain,
  perception: Eye,
  charisma: Sparkles,
};

interface AttributeSkillsCarouselProps {
  selectedAttribute: SagaDriveAttributeKey;
  onSelect: (value: SagaDriveAttributeKey) => void;
  labelledBy?: string;
  onScrollPhaseChange?: (phase: CarouselScrollPhase) => void;
}

export function AttributeSkillsCarousel({
  selectedAttribute,
  onSelect,
  labelledBy = 'attribute-skills-heading',
  onScrollPhaseChange,
}: AttributeSkillsCarouselProps) {
  const options = sagaDriveAttributeDefinitions;

  const {
    setApi,
    current,
    handleCardClick,
    scrollPrev,
    scrollNext,
  } = useCarouselScrollSync({
    optionsLength: options.length,
    getSelectedIndex: () => options.findIndex((option) => option.key === selectedAttribute),
    getValueAtIndex: (index) => options[index]?.key,
    isSelectionUnset: () => false,
    shouldSyncScrollToSelection: () => true,
    selectionSyncKey: selectedAttribute,
    shouldEmitSelect: (_index, value) => value !== selectedAttribute,
    onSelect,
    onScrollPhaseChange,
    selectOnCenterClick: false,
  });

  return (
    <div
      className="relative px-0"
      role="radiogroup"
      aria-labelledby={labelledBy}
      data-attribute-skills-carousel
    >
      <style>{`
        .attribute-carousel-item { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .attribute-carousel-item:not(.is-center) { opacity: 0.62; filter: blur(1px); }
        .attribute-carousel-item:not(.is-center) > div { transform: scale(0.9); }
        .attribute-carousel-item.is-center { opacity: 1; filter: blur(0); z-index: 10; }
        .attribute-carousel-item.is-center > div { transform: scale(1); }
        .attribute-carousel-nav-buttons {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; z-index: 20;
        }
        .attribute-carousel-nav-button { pointer-events: auto; position: absolute; cursor: pointer; }
      `}</style>

      <Carousel
        setApi={setApi}
        opts={{ align: 'center', loop: true, skipSnaps: false, dragFree: false, containScroll: 'trimSnaps', duration: 25 }}
        className="w-full"
      >
        <CarouselContent className="-ml-1.5">
          {options.map((option, index) => {
            const isCenter = index === current;
            const isSelected = selectedAttribute === option.key;
            const skillCount = sagaDriveSkillDefinitions.filter((skill) => skill.attribute === option.key).length;
            const AttributeIcon = ATTRIBUTE_ICONS[option.key];

            return (
              <CarouselItem
                key={option.key}
                className={`attribute-carousel-item basis-[64%] pl-1.5 sm:basis-[52%] md:basis-[40%] lg:basis-[34%] ${isCenter ? 'is-center' : ''}`}
              >
                <div className="w-full transition-all duration-300">
                  <Card
                    role="radio"
                    aria-label={option.label}
                    aria-checked={isSelected && isCenter}
                    tabIndex={isCenter ? 0 : -1}
                    data-attribute-carousel-card={option.key}
                    className={`overflow-hidden transition-all duration-300 gap-3 ${isCenter ? 'cursor-default border-primary/60 shadow-lg' : 'cursor-pointer'} ${isSelected && isCenter ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => handleCardClick(index)}
                    onKeyDown={(event) => {
                      if (!isCenter) return;
                      if (event.key === 'ArrowLeft') { event.preventDefault(); scrollPrev(); }
                      if (event.key === 'ArrowRight') { event.preventDefault(); scrollNext(); }
                    }}
                  >
                    <div className="relative flex aspect-[8/5] items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 via-muted/50 to-accent/10">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl md:h-16 md:w-16 ${isCenter ? 'bg-primary/20 text-primary' : 'bg-muted/70 text-muted-foreground'}`}
                      >
                        <AttributeIcon className="h-7 w-7 md:h-8 md:w-8" aria-hidden="true" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                      {isSelected && isCenter ? (
                        <Badge className="absolute right-2 top-2 border-0 bg-primary text-primary-foreground shadow-sm">Aktiv</Badge>
                      ) : null}
                    </div>
                    <CardHeader className="space-y-1.5 p-3 md:p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Attribut · {option.shortLabel}
                      </p>
                      <div className="flex items-center gap-1">
                        <CardTitle className="text-sm md:text-base">{option.label}</CardTitle>
                        <span className="inline-flex" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                          <RuleHelp label={option.label}>{option.description}</RuleHelp>
                        </span>
                      </div>
                      {isCenter ? (
                        <p className="text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                      ) : (
                        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{option.description}</p>
                      )}
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {skillCount === 0
                          ? 'Kein Standard-Skill-Cluster'
                          : `${skillCount} Fertigkeit${skillCount === 1 ? '' : 'en'}`}
                      </p>
                    </CardHeader>
                  </Card>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {options.length > 1 ? (
        <div className="attribute-carousel-nav-buttons">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="attribute-carousel-nav-button left-0 top-[28%] h-10 w-10 rounded-full border-2 bg-background/95 shadow-xl backdrop-blur-sm md:left-2 md:h-11 md:w-11"
            onClick={scrollPrev}
            aria-label="Vorheriges Attribut"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="attribute-carousel-nav-button right-0 top-[28%] h-10 w-10 rounded-full border-2 bg-background/95 shadow-xl backdrop-blur-sm md:right-2 md:h-11 md:w-11"
            onClick={scrollNext}
            aria-label="Nächstes Attribut"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
