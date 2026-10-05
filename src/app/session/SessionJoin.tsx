/**
 * SessionJoin — Create/join play sessions via server-issued codes (#296).
 * Location: src/app/session/SessionJoin.tsx
 *
 * Library → Teilnehmen may deep-link with:
 *   /session-join?project_id=<uuid>&saga=<SA-…>&intent=join
 * so the clicked adventure and participant intent are preserved.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Label } from '../../shared/ui/label';
import { ArrowLeft, Users, Gamepad2, Copy, Check, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/ui/tabs';
import { useProjects } from '../project';
import { useCharacterSummaries } from '../character';
import { useSessions } from './hooks/useSessions';
import { PreparedAdventureFixturePanel } from './PreparedAdventureFixturePanel';
import {
  assertOwnedCharacterId,
  resolveCharacterAssignmentPick,
} from '../../domains/session/contracts/player-character-assignment';
import { toast } from 'sonner';

export type SessionJoinSurfaceMeta = {
  sagaPublicId: string | null;
  sessionPublicId: string | null;
  characterPublicId?: string | null;
};

interface SessionJoinProps {
  onBack: () => void;
  onJoinAsGM: (sessionId: string, meta?: SessionJoinSurfaceMeta) => void;
  onJoinAsPlayer: (sessionId: string, code: string, meta?: SessionJoinSurfaceMeta) => void;
  onNavigateToCharacterEditor?: () => void;
}

function readSessionJoinSearch() {
  if (typeof window === 'undefined') {
    return { projectId: '', sagaPublicId: '', intentJoin: false };
  }
  const params = new URLSearchParams(window.location.search);
  const intent = (params.get('intent') || '').toLowerCase();
  return {
    projectId: params.get('project_id') || params.get('adventure_id') || '',
    sagaPublicId: (params.get('saga') || params.get('saga_public_id') || '').trim().toUpperCase(),
    intentJoin: intent === 'join' || intent === 'participant' || intent === 'teilnehmen',
  };
}

export function SessionJoin({
  onBack,
  onJoinAsGM,
  onJoinAsPlayer,
  onNavigateToCharacterEditor,
}: SessionJoinProps) {
  const initialSearch = readSessionJoinSearch();
  const [sessionCode, setSessionCode] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(initialSearch.projectId);
  const [sagaPublicId, setSagaPublicId] = useState(initialSearch.sagaPublicId);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(
    initialSearch.intentJoin ? 'join' : 'create',
  );
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createdSession, setCreatedSession] = useState<{ id: string; code: string } | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');

  const { sessions, createSession, joinSession } = useSessions();
  const { projects } = useProjects();
  const { characters, isLoading: charactersLoading } = useCharacterSummaries({ enabled: true });
  const assignable = characters
    .filter((c) => Boolean(c.id) && Boolean(c.publicId))
    .map((c) => ({
      id: c.id,
      publicId: c.publicId ?? null,
      name: c.name || 'Charakter',
    }));
  const pick = resolveCharacterAssignmentPick({ owned: assignable });
  const gmProjects = projects.filter(
    (project) => project.status === 'active' || project.status === 'paused',
  );

  useEffect(() => {
    const next = readSessionJoinSearch();
    if (next.projectId) setSelectedProjectId(next.projectId);
    if (next.sagaPublicId) setSagaPublicId(next.sagaPublicId);
    if (next.intentJoin) setActiveTab('join');
  }, []);

  useEffect(() => {
    if (sagaPublicId || !selectedProjectId) return;
    const match = projects.find((project) => project.id === selectedProjectId);
    if (match?.publicId) setSagaPublicId(match.publicId.trim().toUpperCase());
  }, [projects, selectedProjectId, sagaPublicId]);

  useEffect(() => {
    if (pick.kind === 'single') {
      setSelectedCharacterId(pick.character.id);
    } else if (pick.kind === 'choose' && !selectedCharacterId) {
      setSelectedCharacterId(pick.characters[0]?.id ?? '');
    }
  }, [pick, selectedCharacterId]);

  const resolveSurfaceMeta = (session: {
    publicId: string | null;
    projectId: string | null;
  }): SessionJoinSurfaceMeta => {
    const fromSessionProject = session.projectId
      ? projects.find((project) => project.id === session.projectId)?.publicId
      : null;
    return {
      sagaPublicId: (sagaPublicId || fromSessionProject || '').trim().toUpperCase() || null,
      sessionPublicId: session.publicId ? session.publicId.trim().toUpperCase() : null,
    };
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('Bitte gib einen Session-Namen ein');
      return;
    }
    if (!selectedProjectId) {
      toast.error('Bitte wähle ein Abenteuer (Projekt) aus');
      return;
    }

    setIsCreating(true);
    try {
      const session = await createSession({
        name: newSessionName,
        project_id: selectedProjectId,
      });

      if (session) {
        setCreatedSession({ id: session.id, code: session.code });
        toast.success('Session erstellt!');
        
        // Auto-navigate after 2 seconds
        setTimeout(() => {
          onJoinAsGM(session.id, resolveSurfaceMeta(session));
        }, 2000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Erstellen der Session';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const resolveSelectedCharacter = () => {
    if (pick.kind === 'none') {
      throw new Error(pick.reason);
    }
    const characterId =
      pick.kind === 'single' ? pick.character.id : selectedCharacterId;
    if (!characterId) {
      throw new Error('Bitte wähle einen Charakter');
    }
    assertOwnedCharacterId(
      assignable.map((c) => c.id),
      characterId,
    );
    const option = assignable.find((c) => c.id === characterId);
    if (!option?.publicId) {
      throw new Error('Charakter hat keine Public ID');
    }
    return option;
  };

  const handleJoinSession = async () => {
    if (sessionCode.length < 6) {
      toast.error('Bitte gib einen gültigen 6-stelligen Code ein');
      return;
    }

    setIsJoining(true);
    try {
      const character = resolveSelectedCharacter();
      const session = await joinSession({
        code: sessionCode,
        character_id: character.id,
      });

      if (session) {
        toast.success(`Mit ${character.name} beigetreten!`);
        onJoinAsPlayer(session.id, session.code, {
          ...resolveSurfaceMeta(session),
          characterPublicId: character.publicId,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Session nicht gefunden oder Fehler beim Beitreten';
      toast.error(message);
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v === 'join' ? 'join' : 'create')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" data-session-join-tab="create">
              <Gamepad2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Session erstellen</span>
              <span className="sm:hidden">Erstellen</span>
            </TabsTrigger>
            <TabsTrigger value="join" data-session-join-tab="join">
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Session beitreten</span>
              <span className="sm:hidden">Beitreten</span>
            </TabsTrigger>
          </TabsList>

          {/* Create Session */}
          <TabsContent value="create" className="space-y-4">
            {!createdSession ? (
              <>
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
                    <Label htmlFor="project">Abenteuer (Projekt) *</Label>
                    <select
                      id="project"
                      data-session-join-project
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm md:text-base"
                      disabled={isCreating}
                    >
                      <option value="">Projekt wählen</option>
                      {gmProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                          {project.publicId ? ` (${project.publicId})` : ''}
                        </option>
                      ))}
                    </select>
                    {gmProjects.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Lege zuerst ein Abenteuer unter Projekte an, um eine Session zu starten.
                      </p>
                    ) : null}
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleCreateSession}
                    disabled={!newSessionName.trim() || !selectedProjectId || isCreating}
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
              <PreparedAdventureFixturePanel
                initialProjectId={selectedProjectId || null}
                onNavigateToCharacterEditor={onNavigateToCharacterEditor}
              />
              </>
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

                <div className="space-y-2" data-character-assignment="v1">
                  <Label htmlFor="join-character">Charakter</Label>
                  {charactersLoading ? (
                    <p className="text-xs text-muted-foreground">Charaktere werden geladen…</p>
                  ) : pick.kind === 'none' ? (
                    <div className="space-y-2">
                      <p className="text-sm text-destructive">{pick.reason}</p>
                      {onNavigateToCharacterEditor ? (
                        <Button type="button" variant="outline" size="sm" onClick={onNavigateToCharacterEditor}>
                          Charakter erstellen
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <select
                      id="join-character"
                      className="select select-bordered select-sm w-full"
                      value={selectedCharacterId}
                      onChange={(e) => setSelectedCharacterId(e.target.value)}
                      data-character-select
                      disabled={pick.kind === 'single'}
                    >
                      {(pick.kind === 'single'
                        ? [pick.character]
                        : pick.kind === 'choose'
                          ? pick.characters
                          : []
                      ).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleJoinSession}
                  disabled={
                    sessionCode.length < 6 ||
                    isJoining ||
                    pick.kind === 'none' ||
                    !selectedCharacterId
                  }
                  data-join-with-character
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Beitrete...
                    </>
                  ) : selectedCharacterId ? (
                    `Mit ${assignable.find((c) => c.id === selectedCharacterId)?.name ?? 'Charakter'} beitreten`
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
                        onClick={() => {
                          void (async () => {
                            try {
                              const character = resolveSelectedCharacter();
                              const joined = await joinSession({
                                code: session.code,
                                character_id: character.id,
                              });
                              if (!joined) return;
                              onJoinAsPlayer(joined.id, joined.code, {
                                ...resolveSurfaceMeta(joined),
                                characterPublicId: character.publicId,
                              });
                            } catch (err) {
                              toast.error(
                                err instanceof Error ? err.message : 'Beitritt fehlgeschlagen',
                              );
                            }
                          })();
                        }}
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
