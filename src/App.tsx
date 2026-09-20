/**
 * App — composition root: AuthGate, Layout, History routing (#133/#276), lazy views.
 * Location: src/App.tsx
 *
 * App-area imports must go through each area's public barrel (`app/<area>`) or
 * heavy screen entry (`app/<area>/root`) — enforced by architecture-boundary-check.
 */
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { AuthProvider } from './lib/auth-context';
import { ThemeProvider } from './lib/theme-provider';
import { AuthGate, Layout, ViewLoadingFallback, useAppLocation } from './app/shell';
import { Dashboard } from './app/dashboard';
import { Toaster } from './shared/ui/sonner';
import { NotFoundPlaceholder, ItemWorkbenchScreen } from './app/items';
import { NpcCreatureCreateScreen, NpcCreatureEditorScreen } from './app/npc-creature';
import { SagaResourceScreen } from './app/project';
import { SessionResourceScreen } from './app/session';

const CharacterEditor = lazy(() =>
  import('./app/character/root').then((module) => ({ default: module.CharacterEditor })),
);
const GamemasterPanel = lazy(() =>
  import('./app/session').then((module) => ({ default: module.GamemasterPanel })),
);
const Marketplace = lazy(() =>
  import('./app/marketplace').then((module) => ({ default: module.Marketplace })),
);
const ProjectJoin = lazy(() =>
  import('./app/project').then((module) => ({ default: module.ProjectJoin })),
);
const SessionJoin = lazy(() =>
  import('./app/session').then((module) => ({ default: module.SessionJoin })),
);
const Library = lazy(() =>
  import('./app/library/root').then((module) => ({ default: module.Library })),
);
const Profile = lazy(() =>
  import('./app/profile').then((module) => ({ default: module.Profile })),
);
const RulesetsTest = lazy(() =>
  import('./app/rulesets').then((module) => ({ default: module.RulesetsTest })),
);

if (import.meta.env.DEV) {
  void import('./lib/devtrack').then(({ initDevTrack }) => initDevTrack());
}

function LazyView({ children }: { children: ReactNode }) {
  return <Suspense fallback={<ViewLoadingFallback />}>{children}</Suspense>;
}

function CharacterEditorView() {
  // Capture edit / promotion id once per mount so clearing sessionStorage after hydrate
  // does not remount the editor mid-load.
  const [mountKey] = useState(() => {
    if (typeof sessionStorage === 'undefined') return 'new-character';
    const editId = sessionStorage.getItem('sagadrive:character-edit-id');
    if (editId) return editId;
    const promotion = sessionStorage.getItem('sagadrive:npc-promotion');
    if (promotion) return `npc-promotion:${promotion.length}`;
    return 'new-character';
  });
  return (
    <LazyView>
      <CharacterEditor key={mountKey} />
    </LazyView>
  );
}

function AppShell() {
  const {
    currentView,
    itemId,
    createTypeSlug,
    npcCreatureDefinitionId,
    route,
    navigateToView,
    navigateToItem,
    navigateToItemCreateType,
    navigateToNpcCreatureCreate,
    navigateToNpcCreatureEdit,
  } = useAppLocation();

  const handleNavigate = (view: string) => {
    navigateToView(view);
  };

  const layoutView =
    currentView === 'item-create'
    || currentView === 'item-detail'
    || currentView === 'npc-creature-create'
    || currentView === 'npc-creature-edit'
    || currentView === 'saga-list'
    || currentView === 'saga-new'
    || currentView === 'saga-section'
    || currentView === 'session-phase'
    || currentView === 'session-live'
    || currentView === 'character-public'
      ? (currentView.startsWith('saga') || currentView.startsWith('session')
        ? 'dashboard'
        : currentView === 'character-public'
          ? 'character-editor'
          : 'library')
      : currentView;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'character-editor':
        return <CharacterEditorView />;
      case 'character-public':
        return <CharacterEditorView />;
      case 'adventure-editor':
        // Compatibility route — canonical navigation is /sagas/:sagaPublicId/**
        return (
          <SagaResourceScreen
            mode="list"
            onNavigateHome={() => handleNavigate('dashboard')}
          />
        );
      case 'gamemaster':
        // Compatibility route — canonical is /sagas/.../live/gamemaster
        return (
          <LazyView>
            <GamemasterPanel />
          </LazyView>
        );
      case 'marketplace':
        return (
          <LazyView>
            <Marketplace />
          </LazyView>
        );
      case 'library':
        return (
          <LazyView>
            <Library
              onNavigate={handleNavigate}
              onNavigateToItem={navigateToItem}
              onNavigateToNpcCreate={navigateToNpcCreatureCreate}
              onNavigateToNpcEdit={navigateToNpcCreatureEdit}
              onNavigateToCharacterEditor={() => handleNavigate('character-editor')}
            />
          </LazyView>
        );
      case 'profile':
        return (
          <LazyView>
            <Profile />
          </LazyView>
        );
      case 'join':
        return (
          <LazyView>
            <ProjectJoin
              onBack={() => handleNavigate('dashboard')}
              onJoinAsGM={() => undefined}
              onJoinAsPlayer={() => undefined}
            />
          </LazyView>
        );
      case 'session-join':
        return (
          <LazyView>
            <SessionJoin
              onBack={() => handleNavigate('dashboard')}
              onJoinAsGM={() => handleNavigate('gamemaster')}
              onJoinAsPlayer={() => handleNavigate('gamemaster')}
              onNavigateToCharacterEditor={() => handleNavigate('character-editor')}
            />
          </LazyView>
        );
      case 'rulesets-test':
        return (
          <LazyView>
            <RulesetsTest />
          </LazyView>
        );
      case 'item-create':
        return (
          <ItemWorkbenchScreen
            key={createTypeSlug ?? 'picker'}
            route="create"
            createTypeSlug={createTypeSlug}
            onBack={() => handleNavigate('library')}
            onNavigateToItem={(id) => navigateToItem(id, { replace: true })}
            onNavigateToCreateType={(slug) => navigateToItemCreateType(slug, { replace: true })}
          />
        );
      case 'item-detail':
        return (
          <ItemWorkbenchScreen
            route="detail"
            itemId={itemId}
            onBack={() => handleNavigate('library')}
            onNavigateToItem={(id) => navigateToItem(id, { replace: true })}
          />
        );
      case 'npc-creature-create':
        return (
          <NpcCreatureCreateScreen
            onBack={() => handleNavigate('library')}
            onCreated={(id) => navigateToNpcCreatureEdit(id, { replace: true })}
            onNavigateToCharacterEditor={() => handleNavigate('character-editor')}
          />
        );
      case 'npc-creature-edit':
        return (
          <NpcCreatureEditorScreen
            key={npcCreatureDefinitionId ?? 'missing'}
            definitionId={npcCreatureDefinitionId ?? ''}
            onBack={() => handleNavigate('library')}
          />
        );
      case 'saga-list':
        return (
          <SagaResourceScreen
            mode="list"
            onNavigateHome={() => handleNavigate('dashboard')}
            onNavigate={handleNavigate}
          />
        );
      case 'saga-new':
        return (
          <SagaResourceScreen
            mode="new"
            onNavigateHome={() => handleNavigate('dashboard')}
            onNavigate={handleNavigate}
          />
        );
      case 'saga-section':
        return (
          <SagaResourceScreen
            mode="section"
            sagaPublicId={route.kind === 'saga-section' ? route.sagaPublicId : null}
            section={route.kind === 'saga-section' ? route.section : 'overview'}
            onNavigateHome={() => handleNavigate('dashboard')}
            onNavigate={handleNavigate}
          />
        );
      case 'session-phase':
        return route.kind === 'session-phase' ? (
          <SessionResourceScreen
            sagaPublicId={route.sagaPublicId}
            sessionPublicId={route.sessionPublicId}
            phase={route.phase}
            onNavigateHome={() => handleNavigate('dashboard')}
          />
        ) : null;
      case 'session-live':
        return route.kind === 'session-live' ? (
          <SessionResourceScreen
            sagaPublicId={route.sagaPublicId}
            sessionPublicId={route.sessionPublicId}
            liveView={route.liveView}
            characterPublicId={route.characterPublicId}
            onNavigateHome={() => handleNavigate('dashboard')}
          />
        ) : null;
      case 'not-found':
        return (
          <NotFoundPlaceholder
            attemptedPath={route.kind === 'not-found' ? route.attemptedPath : '/'}
            onHome={() => handleNavigate('dashboard')}
          />
        );
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout currentView={layoutView} onNavigate={handleNavigate}>
      {renderView()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AuthGate>
          <AppShell />
          <Toaster />
        </AuthGate>
      </ThemeProvider>
    </AuthProvider>
  );
}
