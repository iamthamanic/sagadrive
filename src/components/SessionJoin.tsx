import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Users, Gamepad2, Copy, Check, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useSessions } from '../modules/sessions';
import { toast } from 'sonner';

interface SessionJoinProps {
  onBack: () => void;
  onJoinAsGM: (sessionId: string) => void;
  onJoinAsPlayer: (sessionId: string, code: string) => void;
}

export function SessionJoin({ onBack, onJoinAsGM, onJoinAsPlayer }: SessionJoinProps) {
  const [sessionCode, setSessionCode] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedAdventure, setSelectedAdventure] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createdSession, setCreatedSession] = useState<{ id: string; code: string } | null>(null);

  const { sessions, createSession, joinSession } = useSessions();

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('Bitte gib einen Session-Namen ein');
      return;
    }

    setIsCreating(true);
    try {
      const session = await createSession({
        name: newSessionName,
        adventure_id: selectedAdventure || undefined,
      });

      if (session) {
        setCreatedSession({ id: session.id, code: session.code });
        toast.success('Session erstellt!');
        
        // Auto-navigate after 2 seconds
        setTimeout(() => {
          onJoinAsGM(session.id);
        }, 2000);
      }
    } catch (err) {
      toast.error('Fehler beim Erstellen der Session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSession = async () => {
    if (sessionCode.length < 6) {
      toast.error('Bitte gib einen gültigen 6-stelligen Code ein');
      return;
    }

    setIsJoining(true);
    try {
      const session = await joinSession({ code: sessionCode });
      
      if (session) {
        toast.success('Session beigetreten!');
        onJoinAsPlayer(session.id, session.code);
      }
    } catch (err) {
      toast.error('Session nicht gefunden oder Fehler beim Beitreten');
    } finally {
      setIsJoining(false);
    }
  };

  const copyToClipboard = () => {
    if (createdSession) {
      navigator.clipboard.writeText(createdSession.code);
      setCopied(true);
      toast.success('Code kopiert!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl">Session</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Starte ein neues Abenteuer oder tritt einer Session bei
          </p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">
              <Gamepad2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Session erstellen</span>
              <span className="sm:hidden">Erstellen</span>
            </TabsTrigger>
            <TabsTrigger value="join">
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Session beitreten</span>
              <span className="sm:hidden">Beitreten</span>
            </TabsTrigger>
          </TabsList>

          {/* Create Session */}
          <TabsContent value="create" className="space-y-4">
            {!createdSession ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg">Neue Session erstellen</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Du wirst als Gamemaster starten
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-name">Session Name</Label>
                    <Input
                      id="session-name"
                      placeholder="z.B. Die vergessene Krypta"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      className="text-sm md:text-base"
                      disabled={isCreating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adventure">Abenteuer wählen (optional)</Label>
                    <select
                      id="adventure"
                      value={selectedAdventure}
                      onChange={(e) => setSelectedAdventure(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm md:text-base"
                      disabled={isCreating}
                    >
                      <option value="">Neues Abenteuer</option>
                    </select>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleCreateSession}
                    disabled={!newSessionName.trim() || isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Erstelle...
                      </>
                    ) : (
                      'Session erstellen'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg">Session erstellt!</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Teile diesen Code mit deinen Spielern
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-lg p-4 text-center">
                      <p className="text-2xl md:text-3xl font-mono tracking-wider">
                        {createdSession.code}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  <div className="bg-muted rounded-lg p-3 md:p-4">
                    <p className="text-xs md:text-sm text-muted-foreground mb-2">
                      Session Details:
                    </p>
                    <p className="text-sm md:text-base font-medium">{newSessionName}</p>
                  </div>

                  <p className="text-xs md:text-sm text-muted-foreground">
                    Die Session wird in 2 Sekunden gestartet...
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Join Session */}
          <TabsContent value="join" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Session beitreten</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Gib den Session-Code ein, den du vom GM erhalten hast
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Session Code</Label>
                  <Input
                    id="code"
                    placeholder="z.B. ABC123"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="text-lg md:text-xl text-center font-mono tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground">
                    6-stelliger Code vom Gamemaster
                  </p>
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleJoinSession}
                  disabled={sessionCode.length < 6 || isJoining}
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Beitrete...
                    </>
                  ) : (
                    'Als Spieler beitreten'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Aktive Sessions</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Verfügbare Sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="text-xs md:text-sm text-muted-foreground text-center py-4">
                    Keine aktiven Sessions
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-primary transition-colors cursor-pointer"
                        onClick={() => onJoinAsPlayer(session.id, session.code)}
                      >
                        <div>
                          <p className="font-medium text-sm md:text-base">{session.name}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {session.players.length} Spieler • {session.status}
                          </p>
                        </div>
                        <Button size="sm">Beitreten</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
