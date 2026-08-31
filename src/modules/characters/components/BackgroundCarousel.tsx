/**
 * BackgroundCarousel — Swipebare Hintergrund-Auswahl (Templates + Custom), analog zum Archetyp-Karussell.
 * Location: src/modules/characters/components/BackgroundCarousel.tsx
 */
import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
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
  getSagaDriveSkill,
  type SagaDriveSkillKey,
} from '../../rulesets/characterCreation';
import type { SagaDriveBackgroundTemplate } from '../../rulesets/backgroundTemplates';
import type { CarouselScrollPhase } from './ArchetypeCarousel';
import { RuleHelp } from './RuleHelp';

export type BackgroundCarouselSelection = string | null;

type BackgroundCarouselOption =
  | { kind: 'template'; id: string; template: SagaDriveBackgroundTemplate }
  | { kind: 'custom'; id: null };

interface BackgroundCarouselProps {
  templates: readonly SagaDriveBackgroundTemplate[];
  selectedId: string | null | undefined;
  onSelect: (value: BackgroundCarouselSelection) => void;
  labelledBy?: string;
  onScrollPhaseChange?: (phase: CarouselScrollPhase) => void;
}

function buildOptions(templates: readonly SagaDriveBackgroundTemplate[]): BackgroundCarouselOption[] {
  return [
    ...templates.map((template) => ({ kind: 'template' as const, id: template.id, template })),
    { kind: 'custom', id: null },
  ];
}

function optionMatches(option: BackgroundCarouselOption, selectedId: string | null | undefined): boolean {
  if (selectedId === undefined) return false;
  return option.id === selectedId;
}

function skillLabels(skills: readonly SagaDriveSkillKey[]): string {
  return skills.map((skill) => getSagaDriveSkill(skill).label).join(' · ');
}

export function BackgroundCarousel({
  templates,
  selectedId,
  onSelect,
  labelledBy = 'background-competency-heading',
  onScrollPhaseChange,
}: BackgroundCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const skipSelectRef = useRef(false);
  const options = buildOptions(templates);

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

  useEffect(() => {
    if (!api || !onScrollPhaseChange) return;
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

  // Wie Archetyp: zentrierte Option wird beim Mount übernommen, damit Connector
  // und Skill-Nodes sofort greifen. Embla schluckt oft den reinen Center-Click.
  useEffect(() => {
    if (!api || selectedId !== undefined) return;
    const option = options[api.selectedScrollSnap()];
    if (option) onSelect(option.id);
  }, [api, onSelect, options, selectedId]);

  useEffect(() => {
    if (!api || selectedId === undefined) return;
    const index = options.findIndex((option) => optionMatches(option, selectedId));
    if (index < 0 || index === api.selectedScrollSnap()) return;
    skipSelectRef.current = true;
    api.scrollTo(index);
  }, [api, options, selectedId]);

  useEffect(() => {
    if (!api) return;
    const handleSelect = () => {
      if (skipSelectRef.current) {
        skipSelectRef.current = false;
        return;
      }
      const option = options[api.selectedScrollSnap()];
      if (!option) return;
      if (selectedId === undefined || option.id !== selectedId) onSelect(option.id);
    };
    api.on('select', handleSelect);
    return () => {
      api.off('select', handleSelect);
    };
  }, [api, onSelect, options, selectedId]);

  const handleCardClick = (index: number) => {
    if (index === current) {
      const option = options[index];
      if (option && (selectedId === undefined || option.id !== selectedId)) onSelect(option.id);
      return;
    }
    api?.scrollTo(index);
  };

  return (
    <div className="relative px-0" role="radiogroup" aria-labelledby={labelledBy}>
      <style>{`
        .background-carousel-item { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .background-carousel-item:not(.is-center) { opacity: 0.62; filter: blur(1px); }
        .background-carousel-item:not(.is-center) > div { transform: scale(0.9); }
        .background-carousel-item.is-center { opacity: 1; filter: blur(0); z-index: 10; }
        .background-carousel-item.is-center > div { transform: scale(1); }
        .background-carousel-nav-buttons {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; z-index: 20;
        }
        .background-carousel-nav-button { pointer-events: auto; position: absolute; cursor: pointer; }
      `}</style>

      <Carousel
        setApi={setApi}
        opts={{ align: 'center', loop: true, skipSnaps: false, dragFree: false, containScroll: 'trimSnaps', duration: 25 }}
        className="w-full"
      >
        <CarouselContent className="-ml-1.5">
          {options.map((option, index) => {
            const isCenter = index === current;
            const isSelected = optionMatches(option, selectedId);
            const title = option.kind === 'template' ? option.template.name : 'Eigener Hintergrund';
            const summary = option.kind === 'template'
              ? option.template.description
              : 'Wähle selbst vier passende Fertigkeiten. Training und Spezialisierung folgen denselben Regeln.';
            const playstyle = option.kind === 'template' ? option.template.playstyle : 'Volle Freiheit · gleiche Regeln';
            const poolPreview = option.kind === 'template' ? skillLabels(option.template.skillPool) : 'Vier freie Pool-Fertigkeiten';

            return (
              <CarouselItem
                key={option.kind === 'template' ? option.template.id : 'custom'}
                className={`background-carousel-item basis-[64%] pl-1.5 sm:basis-[52%] md:basis-[40%] lg:basis-[34%] ${isCenter ? 'is-center' : ''}`}
              >
                <div className="w-full transition-all duration-300">
                  <Card
                    role="radio"
                    aria-label={title}
                    aria-checked={isSelected && isCenter}
                    tabIndex={isCenter ? 0 : -1}
                    className={`overflow-hidden transition-all duration-300 gap-3 ${isCenter ? 'cursor-default border-primary/60 shadow-lg' : 'cursor-pointer'} ${isSelected && isCenter ? 'border-primary bg-primary/5' : ''} ${option.kind === 'custom' && !(isSelected && isCenter) ? 'border-dashed' : ''}`}
                    onClick={() => handleCardClick(index)}
                    onKeyDown={(event) => {
                      if (!isCenter) return;
                      if (event.key === 'ArrowLeft') { event.preventDefault(); api?.scrollPrev(); }
                      if (event.key === 'ArrowRight') { event.preventDefault(); api?.scrollNext(); }
                    }}
                  >
                    <div className="relative flex aspect-[8/5] items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 via-muted/50 to-accent/10">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl md:h-16 md:w-16 ${isCenter ? 'bg-primary/20 text-primary' : 'bg-muted/70 text-muted-foreground'}`}>
                        {option.kind === 'custom'
                          ? <Sparkles className="h-7 w-7 md:h-8 md:w-8" aria-hidden="true" />
                          : <BookOpen className="h-7 w-7 md:h-8 md:w-8" aria-hidden="true" />}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                      {isSelected && isCenter ? (
                        <Badge className="absolute right-2 top-2 border-0 bg-primary text-primary-foreground shadow-sm">Gewählt</Badge>
                      ) : null}
                    </div>
                    <CardHeader className="space-y-1.5 p-3 md:p-3.5">
                      <div className="flex items-center gap-1">
                        <CardTitle className="text-sm md:text-base">{title}</CardTitle>
                        <span className="inline-flex" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                          <RuleHelp label={title}>
                            {option.kind === 'template'
                              ? `${option.template.description} Playstyle: ${option.template.playstyle}`
                              : 'Eigener Hintergrund: vier freie Pool-Fertigkeiten, zwei Trainings mit Hintergrund +1, eine Spezialisierung.'}
                          </RuleHelp>
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">{summary}</p>
                      <p className="text-[11px] font-medium text-muted-foreground">{playstyle}</p>
                      {isCenter ? (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {option.kind === 'template'
                            ? option.template.skillPool.map((skill) => (
                              <Badge key={skill} variant="outline">{getSagaDriveSkill(skill).label}</Badge>
                            ))
                            : <Badge variant="secondary">Volle Freiheit</Badge>}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{poolPreview}</p>
                      )}
                    </CardHeader>
                  </Card>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {options.length > 1 ? (
        <div className="background-carousel-nav-buttons">
          <Button type="button" variant="outline" size="icon" className="background-carousel-nav-button left-0 top-[28%] h-10 w-10 rounded-full border-2 bg-background/95 shadow-xl backdrop-blur-sm md:left-2 md:h-11 md:w-11" onClick={() => api?.scrollPrev()} aria-label="Vorheriger Hintergrund">
            <ChevronLeft className="size-5" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="background-carousel-nav-button right-0 top-[28%] h-10 w-10 rounded-full border-2 bg-background/95 shadow-xl backdrop-blur-sm md:right-2 md:h-11 md:w-11" onClick={() => api?.scrollNext()} aria-label="Nächster Hintergrund">
            <ChevronRight className="size-5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
