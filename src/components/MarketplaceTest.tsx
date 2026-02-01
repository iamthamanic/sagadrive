import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { createMarketplaceItem } from '../modules/marketplace';
import { toast } from 'sonner';
import type { MarketplaceItemType } from '../modules/marketplace';

/**
 * Test Component to create sample marketplace items
 * Remove this in production!
 */
export function MarketplaceTest() {
  const [type, setType] = useState<MarketplaceItemType>('world');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSample = async () => {
    if (!title.trim()) {
      toast.error('Titel ist erforderlich');
      return;
    }

    setIsCreating(true);
    try {
      await createMarketplaceItem({
        type,
        title,
        description: description || undefined,
        price: parseFloat(price) || 0,
        data: {
          sampleData: true,
          createdFrom: 'test-component',
        },
      });

      toast.success('Test-Item erstellt!');
      setTitle('');
      setDescription('');
      setPrice('0');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen');
    } finally {
      setIsCreating(false);
    }
  };

  const createQuickSamples = async () => {
    setIsCreating(true);
    try {
      const samples = [
        {
          type: 'world' as MarketplaceItemType,
          title: 'Die vergessenen Königreiche',
          description: 'Eine epische Fantasy-Welt voller Magie und Abenteuer',
          price: 0,
          data: { terrain: 'mixed', size: 'large' },
        },
        {
          type: 'adventure' as MarketplaceItemType,
          title: 'Der Fluch des Nekromanten',
          description: 'Ein düsteres Abenteuer für Level 5-8',
          price: 4.99,
          data: { level: '5-8', encounters: 12 },
        },
        {
          type: 'character' as MarketplaceItemType,
          title: 'Elfen-Bogenschütze Paket',
          description: '5 vorgefertigte Elfen mit Hintergrundgeschichten',
          price: 0,
          data: { count: 5, race: 'elf', class: 'ranger' },
        },
        {
          type: 'ruleset' as MarketplaceItemType,
          title: 'Homebrew Magie System',
          description: '50+ neue Zauber und erweiterte Ritualmagie',
          price: 2.99,
          data: { spells: 50, rituals: true },
        },
        {
          type: 'item' as MarketplaceItemType,
          title: 'Magische Artefakte Pack',
          description: '100+ einzigartige magische Gegenstände',
          price: 3.99,
          data: { items: 100, rarity: 'mixed' },
        },
      ];

      for (const sample of samples) {
        await createMarketplaceItem(sample);
      }

      toast.success(`${samples.length} Test-Items erstellt!`);
    } catch (error) {
      toast.error('Fehler beim Erstellen der Samples');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl mb-2">Marketplace Test</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Erstelle Test-Daten für den Marketplace (nur für Entwicklung!)
          </p>
        </div>

        {/* Quick Samples */}
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Schnell-Start</CardTitle>
            <CardDescription>
              Erstelle 5 Beispiel-Items mit einem Klick
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={createQuickSamples}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Erstelle...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  5 Beispiel-Items erstellen
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Manual Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manuelles Test-Item</CardTitle>
            <CardDescription>
              Erstelle ein individuelles Test-Item
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Typ</Label>
              <Select value={type} onValueChange={(v) => setType(v as MarketplaceItemType)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="world">Welt</SelectItem>
                  <SelectItem value="adventure">Abenteuer</SelectItem>
                  <SelectItem value="character">Charakter</SelectItem>
                  <SelectItem value="item">Item</SelectItem>
                  <SelectItem value="ruleset">Regelset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                placeholder="z.B. Meine Fantasy Welt"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                placeholder="Beschreibe dein Item..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preis (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleCreateSample}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Erstelle...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Test-Item erstellen
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Warning */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              ⚠️ Diese Komponente ist nur für Testing! 
              In Production sollte sie entfernt werden.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
