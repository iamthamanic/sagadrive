import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { buildCharacterBackgroundExamples } from '../lore/examples';
import { characterLoreService } from '../lore/service';
import type { CharacterLoreContext } from '../lore/types';

interface CharacterBackgroundComposerProps {
  value: string;
  context: CharacterLoreContext;
  onChange: (value: string) => void;
}

const EXAMPLE_ROTATION_MS = 5_000;
const EXAMPLE_FADE_MS = 180;

export function CharacterBackgroundComposer({
  value,
  context,
  onChange,
}: CharacterBackgroundComposerProps) {
  const examples = useMemo(() => buildCharacterBackgroundExamples(context), [context]);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [exampleVisible, setExampleVisible] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');

  useEffect(() => {
    setExampleIndex(0);
    setExampleVisible(true);
  }, [examples]);

  useEffect(() => {
    if (value.trim() || examples.length < 2) return undefined;

    let fadeTimer: number | undefined;
    const rotationTimer = window.setInterval(() => {
      setExampleVisible(false);
      fadeTimer = window.setTimeout(() => {
        setExampleIndex((current) => (current + 1) % examples.length);
        setExampleVisible(true);
      }, EXAMPLE_FADE_MS);
    }, EXAMPLE_ROTATION_MS);

    return () => {
      window.clearInterval(rotationTimer);
      if (fadeTimer !== undefined) window.clearTimeout(fadeTimer);
    };
  }, [examples, value]);

  const currentExample = examples[exampleIndex] ?? examples[0] ?? '';

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedDraft('');
    try {
      const result = await characterLoreService.generateBackground({
        context,
        currentBackgroundStory: value.trim() || undefined,
      });
      setGeneratedDraft(result.story);
      toast.success('Neue Hintergrundgeschichte erstellt');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Hintergrundgeschichte konnte nicht generiert werden');
    } finally {
      setGenerating(false);
    }
  };

  const acceptGeneratedDraft = () => {
    if (!generatedDraft.trim()) return;
    onChange(generatedDraft);
    setGeneratedDraft('');
    toast.success('KI-Variante übernommen');
  };

  const acceptExample = () => {
    if (!currentExample) return;
    onChange(currentExample);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="backgroundStory">Hintergrundgeschichte</Label>
      <div className="overflow-hidden rounded-md border border-foreground/20 bg-input-background transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
        <div className="flex min-h-11 items-center justify-end border-b border-border px-2 py-1.5">
          <Button type="button" size="sm" onClick={handleGenerate} disabled={generating}>
            <Sparkles className="size-4" />
            {generating ? 'Generiert...' : 'Generieren'}
          </Button>
        </div>
        <div className="relative">
          <Textarea
            id="backgroundStory"
            rows={8}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="relative z-10 min-h-[190px] resize-y rounded-none border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
          {!value.trim() && currentExample && (
            <p
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-3 top-3 z-0 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground transition-opacity duration-200 ${exampleVisible ? 'opacity-70' : 'opacity-0'}`}
            >
              {currentExample}
            </p>
          )}
        </div>
        {!value.trim() && currentExample && (
          <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Beispiel {exampleIndex + 1} von {examples.length}. Wechselt alle 5 Sekunden.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={acceptExample}>
              Beispiel übernehmen
            </Button>
          </div>
        )}
      </div>

      {generatedDraft && (
        <div className="rounded-md border border-accent/50 bg-accent/5 p-3" aria-live="polite">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Neue KI-Variante</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setGeneratedDraft('')}
              aria-label="KI-Variante verwerfen"
            >
              <X className="size-4" />
            </Button>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{generatedDraft}</p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setGeneratedDraft('')}>
              Verwerfen
            </Button>
            <Button type="button" size="sm" onClick={acceptGeneratedDraft}>
              Übernehmen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
