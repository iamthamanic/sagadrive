import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, LogIn, Copy, Check, ArrowLeft } from 'lucide-react';
import { useProjects } from '../modules/projects';
import { toast } from 'sonner';

interface ProjectJoinProps {
  onBack: () => void;
  onJoinAsGM: (projectId: string) => void;
  onJoinAsPlayer: (projectId: string) => void;
}

export function ProjectJoin({ onBack, onJoinAsGM, onJoinAsPlayer }: ProjectJoinProps) {
  const { projects, createProject, joinProject } = useProjects();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error('Bitte gib einen Projektnamen ein');
      return;
    }

    setIsCreating(true);
    try {
      const newProject = await createProject({
        name: projectName,
        description: projectDescription || undefined,
      });
      
      toast.success(`Projekt erstellt! Code: ${newProject.code}`, {
        duration: 8000,
        description: 'Teile diesen Code mit deinen Spielern zum Beitreten',
      });
      setProjectName('');
      setProjectDescription('');
      
      // Go back to dashboard to see the new project
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

    setIsJoining(true);
    try {
      const project = await joinProject({ code: joinCode });
      toast.success(`Projekt "${project.name}" beigetreten!`, {
        duration: 5000,
      });
      setJoinCode('');
      
      // Go back to dashboard
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
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success('Code kopiert!');
        setTimeout(() => setCopiedCode(null), 2000);
      } else {
        // Fallback: Create temporary textarea
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
      // Show code in toast as fallback
      toast.info(`Code: ${code}`, {
        duration: 5000,
        description: 'Manuell kopieren (Clipboard API nicht verfügbar)'
      });
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const activeProjects = projects.filter(p => p.status === 'active');

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl mb-2">Projekt starten oder beitreten</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Erstelle ein neues Abenteuer oder trete einem bestehenden bei
          </p>
        </div>

        <Tabs defaultValue="create" className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Neues Projekt</TabsTrigger>
            <TabsTrigger value="join">Beitreten</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Projekt erstellen</CardTitle>
                <CardDescription>
                  Starte ein neues Abenteuer als Game Master
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Projektname *</Label>
                  <Input
                    id="name"
                    placeholder="z.B. Die Helden von Eldoria"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung (optional)</Label>
                  <Input
                    id="description"
                    placeholder="Ein episches Abenteuer in einer Fantasy-Welt..."
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreateProject}
                  disabled={isCreating}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isCreating ? 'Erstelle...' : 'Projekt erstellen'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Projekt beitreten</CardTitle>
                <CardDescription>
                  Trete einem bestehenden Projekt mit einem Code bei
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Beitrittscode</Label>
                  <Input
                    id="code"
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinProject()}
                    maxLength={6}
                  />
                </div>
                <Button
                  onClick={handleJoinProject}
                  disabled={isJoining}
                  className="w-full"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {isJoining ? 'Trete bei...' : 'Beitreten'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Active Projects List */}
        {activeProjects.length > 0 && (
          <div>
            <h2 className="text-xl mb-4">Deine aktiven Projekte</h2>
            <div className="grid gap-4">
              {activeProjects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{project.name}</CardTitle>
                        <CardDescription>
                          {project.description || 'Kein Beschreibung'}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCode(project.code)}
                      >
                        {copiedCode === project.code ? (
                          <Check className="w-4 h-4 mr-2" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
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
                          const isGM = project.members.some(
                            m => m.role === 'gm'
                          );
                          if (isGM) {
                            onJoinAsGM(project.id);
                          } else {
                            onJoinAsPlayer(project.id);
                          }
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
