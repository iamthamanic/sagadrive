import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, LogIn, Copy, Check, ArrowLeft, Globe2, User } from 'lucide-react';
import { useProjects } from '../modules/projects';
import { useWorldProfiles } from '../modules/worlds';
import { useCharacters } from '../modules/characters';
import { toast } from 'sonner';

interface ProjectJoinProps {
  onBack: () => void;
  onJoinAsGM: (projectId: string) => void;
  onJoinAsPlayer: (projectId: string) => void;
}

export function ProjectJoin({ onBack, onJoinAsGM, onJoinAsPlayer }: ProjectJoinProps) {
  const { projects, createProject, joinProject } = useProjects();
  const { worlds, isLoading: worldsLoading } = useWorldProfiles();
  const { characters, isLoading: charactersLoading } = useCharacters();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedWorldId, setSelectedWorldId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error('Bitte gib einen Abenteuernamen ein');
      return;
    }
    if (!selectedWorldId) {
      toast.error('Bitte wähle eine Welt für das Abenteuer');
      return;
    }

    setIsCreating(true);
    try {
      const newProject = await createProject({
        name: projectName,
        description: projectDescription || undefined,
        world_profile_id: selectedWorldId,
      });

      toast.success(`Abenteuer erstellt! Code: ${newProject.code}`, {
        duration: 8000,
        description: 'Teile diesen Code mit deinen Spielern zum Beitreten',
      });
      setProjectName('');
      setProjectDescription('');
      setSelectedWorldId('');

      setTimeout(() => {
        onBack();
      }, 500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinProject = async () => {
    if (!joinCode.trim()) {
      toast.error('Bitte gib einen Beitrittscode ein');
      return;
    }
    if (!selectedCharacterId) {
      toast.error('Bitte wähle den Charakter für dieses Abenteuer');
      return;
    }

    setIsJoining(true);
    try {
      const project = await joinProject({ code: joinCode, character_id: selectedCharacterId });
      toast.success(`Abenteuer "${project.name}" beigetreten!`, {
        duration: 5000,
      });
      setJoinCode('');
      setSelectedCharacterId('');

      setTimeout(() => {
        onBack();
      }, 500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Beitreten');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success('Code kopiert!');
        setTimeout(() => setCopiedCode(null), 2000);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedCode(code);
        toast.success('Code kopiert!');
        setTimeout(() => setCopiedCode(null), 2000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.info(`Code: ${code}`, {
        duration: 5000,
        description: 'Manuell kopieren (Clipboard API nicht verfügbar)'
      });
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const activeProjects = projects.filter((project) => project.status === 'active');

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl mb-2">Abenteuer starten oder beitreten</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Jedes Abenteuer gehört zu einer Welt. Beim Beitritt legst du fest, welcher Charakter daran teilnimmt.
          </p>
        </div>

        <Tabs defaultValue="create" className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Neues Abenteuer</TabsTrigger>
            <TabsTrigger value="join">Beitreten</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Abenteuer erstellen</CardTitle>
                <CardDescription>
                  Starte als Game Master ein Abenteuer in einer deiner Welten.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Abenteuername *</Label>
                  <Input
                    id="name"
                    placeholder="z.B. Die Helden von Eldoria"
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && void handleCreateProject()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung (optional)</Label>
                  <Input
                    id="description"
                    placeholder="Ein episches Abenteuer in einer Fantasy-Welt..."
                    value={projectDescription}
                    onChange={(event) => setProjectDescription(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-world">Welt *</Label>
                  <Select value={selectedWorldId} onValueChange={setSelectedWorldId} disabled={worldsLoading || worlds.length === 0}>
                    <SelectTrigger id="project-world" aria-label="Welt für Abenteuer">
                      <Globe2 className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder={worldsLoading ? 'Welten werden geladen...' : 'Welt auswählen'} />
                    </SelectTrigger>
                    <SelectContent>
                      {worlds.map((world) => (
                        <SelectItem key={world.id} value={world.id}>{world.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!worldsLoading && worlds.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Erstelle zuerst unter Bibliothek → Welten ein Weltprofil.
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => void handleCreateProject()}
                  disabled={isCreating || worldsLoading || worlds.length === 0}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isCreating ? 'Erstelle...' : 'Abenteuer erstellen'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Abenteuer beitreten</CardTitle>
                <CardDescription>
                  Der gewählte Charakter erhält seine effektiven Weltregeln aus diesem Abenteuer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Beitrittscode</Label>
                  <Input
                    id="code"
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                    onKeyDown={(event) => event.key === 'Enter' && void handleJoinProject()}
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="join-character">Charakter *</Label>
                  <Select
                    value={selectedCharacterId}
                    onValueChange={setSelectedCharacterId}
                    disabled={charactersLoading || characters.length === 0}
                  >
                    <SelectTrigger id="join-character" aria-label="Charakter für Abenteuer">
                      <User className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder={charactersLoading ? 'Charaktere werden geladen...' : 'Charakter auswählen'} />
                    </SelectTrigger>
                    <SelectContent>
                      {characters.map((character) => (
                        <SelectItem key={character.id} value={character.id}>{character.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!charactersLoading && characters.length === 0 && (
                    <p className="text-xs text-muted-foreground">Erstelle zuerst einen Charakter.</p>
                  )}
                </div>
                <Button
                  onClick={() => void handleJoinProject()}
                  disabled={isJoining || charactersLoading || characters.length === 0}
                  className="w-full"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {isJoining ? 'Trete bei...' : 'Beitreten'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {activeProjects.length > 0 && (
          <div>
            <h2 className="text-xl mb-4">Deine aktiven Abenteuer</h2>
            <div className="grid gap-4">
              {activeProjects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{project.name}</CardTitle>
                        <CardDescription>{project.description || 'Keine Beschreibung'}</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void handleCopyCode(project.code)}>
                        {copiedCode === project.code ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {project.code}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex gap-4 text-muted-foreground">
                        <span>{project.members.length} Mitglieder</span>
                        <span>{project.totalSessions} Sessions</span>
                      </div>
                      <Button
                        onClick={() => {
                          const isGM = project.members.some((member) => member.role === 'gm');
                          if (isGM) onJoinAsGM(project.id);
                          else onJoinAsPlayer(project.id);
                        }}
                      >
                        Öffnen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
