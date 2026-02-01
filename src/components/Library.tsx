import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Plus, Search, User, BookOpen, Edit, Trash2, Loader2 } from 'lucide-react';
import { useCharacters } from '../modules/characters';
import { toast } from 'sonner';

interface LibraryProps {
  onNavigate: (view: string) => void;
}

export function Library({ onNavigate }: LibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { characters, isLoading, error, deleteCharacter } = useCharacters();

  const handleDeleteCharacter = async (id: string, name: string) => {
    if (!confirm(`Möchtest du "${name}" wirklich löschen?`)) {
      return;
    }

    const success = await deleteCharacter(id);
    if (success) {
      toast.success('Charakter gelöscht');
    } else {
      toast.error('Fehler beim Löschen');
    }
  };

  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    char.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
    char.race.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl">Meine Bibliothek</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Verwalte deine Charaktere und Abenteuer
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Suche in deiner Bibliothek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="characters" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="characters">
              <User className="w-4 h-4 mr-2" />
              Charaktere
            </TabsTrigger>
            <TabsTrigger value="adventures">
              <BookOpen className="w-4 h-4 mr-2" />
              Abenteuer
            </TabsTrigger>
          </TabsList>

          {/* Characters Tab */}
          <TabsContent value="characters" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Lädt...' : `${filteredCharacters.length} Charakter${filteredCharacters.length !== 1 ? 'e' : ''}`}
              </p>
              <Button size="sm" onClick={() => onNavigate('character-editor')}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Neuer Charakter</span>
                <span className="sm:hidden">Neu</span>
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCharacters.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Keine Charaktere gefunden' : 'Noch keine Charaktere erstellt'}
                </p>
                <Button onClick={() => onNavigate('character-editor')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ersten Charakter erstellen
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredCharacters.map((char) => (
                  <Card key={char.id} className="hover:border-primary transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm md:text-base truncate">{char.name}</CardTitle>
                          <CardDescription className="text-xs md:text-sm">
                            Level {char.level} {char.race} {char.class}
                          </CardDescription>
                        </div>
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => onNavigate('character-editor')}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          <span className="text-xs">Bearbeiten</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteCharacter(char.id, char.name)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Adventures Tab */}
          <TabsContent value="adventures" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">2 Abenteuer</p>
              <Button size="sm" onClick={() => onNavigate('adventure-editor')}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Neues Abenteuer</span>
                <span className="sm:hidden">Neu</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {[
                { title: 'Das vergessene Königreich', genre: 'Fantasy', scenes: 5 },
                { title: 'Schatten über Neverwinter', genre: 'Fantasy', scenes: 8 },
              ].map((adv, i) => (
                <Card key={i} className="hover:border-primary transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm md:text-base">{adv.title}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      {adv.genre} • {adv.scenes} Szenen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="w-3 h-3 mr-1" />
                        <span className="text-xs">Bearbeiten</span>
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
