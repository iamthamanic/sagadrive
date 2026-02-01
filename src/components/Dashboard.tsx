import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Plus, Users, Gamepad2, TrendingUp, Calendar } from 'lucide-react';
import { useProjects } from '../modules/projects';
import { useCharacters } from '../modules/characters';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { projects, isLoading: projectsLoading } = useProjects();
  const { characters, isLoading: charactersLoading } = useCharacters();

  const activeProjects = projects.filter(p => p.status === 'active');
  const totalSessions = projects.reduce((sum, p) => sum + p.totalSessions, 0);
  const totalMembers = projects.reduce((sum, p) => sum + p.members.length, 0);

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Willkommen zurück! Starte ein neues Projekt oder arbeite an deinen Inhalten.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs md:text-sm">Aktive Projekte</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{activeProjects.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs md:text-sm">Sessions gespielt</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{totalSessions}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs md:text-sm">Mitspieler</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{totalMembers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs md:text-sm">Charaktere</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{characters.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg md:text-xl mb-4">Schnellaktionen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <Card 
              className="cursor-pointer hover:bg-accent/10 hover:border-accent/40 transition-all" 
              onClick={() => onNavigate('project-join')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Gamepad2 className="w-5 h-5" />
                  Projekt starten
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Erstelle ein neues Projekt oder trete einem bei
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-accent/10 hover:border-accent/40 transition-all" 
              onClick={() => {
                console.log('🎯 Dashboard: "Neuer Charakter" clicked!');
                console.log('🔄 Dashboard: Calling onNavigate("character-editor")');
                onNavigate('character-editor');
                console.log('✅ Dashboard: onNavigate called');
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Plus className="w-5 h-5" />
                  Neuer Charakter
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Erstelle einen Charakter für deine Abenteuer
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-accent/10 hover:border-accent/40 transition-all" 
              onClick={() => onNavigate('marketplace')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <TrendingUp className="w-5 h-5" />
                  Marktplatz
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Entdecke Community-Inhalte
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Active Projects Section */}
        {activeProjects.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl">Deine Projekte</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onNavigate('library')}
              >
                Alle anzeigen
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {activeProjects.slice(0, 6).map((project) => (
                <Card key={project.id} className="hover:bg-accent/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-base md:text-lg">{project.name}</CardTitle>
                    <CardDescription className="text-xs md:text-sm line-clamp-2">
                      {project.description || 'Keine Beschreibung'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {project.members.length}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {project.totalSessions}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {project.code}
                      </span>
                    </div>
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => {
                        const userMember = project.members.find(m => m.role === 'gm');
                        if (userMember) {
                          onNavigate('gamemaster');
                        } else {
                          onNavigate('player-view');
                        }
                      }}
                    >
                      Öffnen
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Characters */}
        {characters.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl">Deine Charaktere</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onNavigate('library')}
              >
                Alle anzeigen
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
              {characters.slice(0, 6).map((character) => (
                <Card 
                  key={character.id} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onNavigate('character-editor')}
                >
                  <CardHeader className="p-4">
                    <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                      <span className="text-2xl md:text-3xl">
                        {character.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <CardTitle className="text-sm md:text-base truncate">
                      {character.name}
                    </CardTitle>
                    <CardDescription className="text-xs truncate">
                      {character.race} {character.class}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeProjects.length === 0 && characters.length === 0 && !projectsLoading && !charactersLoading && (
          <Card className="border-dashed">
            <CardHeader className="text-center py-12">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <CardTitle>Bereit für dein erstes Abenteuer?</CardTitle>
              <CardDescription className="mt-2">
                Erstelle ein Projekt oder einen Charakter, um loszulegen.
              </CardDescription>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <Button onClick={() => onNavigate('project-join')}>
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Projekt erstellen
                </Button>
                <Button variant="outline" onClick={() => onNavigate('character-editor')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Charakter erstellen
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
