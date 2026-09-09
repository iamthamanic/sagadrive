/**
 * App — composition root: AuthGate, Layout, History routing (#133), lazy views.
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
  // Capture edit id once per mount so clearing sessionStorage after hydrate
  // does not remount the editor mid-load.
  const [mountKey] = useState(
    () =>
      (typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('sagadrive:character-edit-id')
        : null) ?? 'new-character',
  );
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
    route,
    navigateToView,
    navigateToItem,
    navigateToItemCreateType,
  } = useAppLocation();

  const handleNavigate = (view: string) => {
    navigateToView(view);
  };

  const layoutView =
    currentView === 'item-create' || currentView === 'item-detail' ? 'library' : currentView;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'character-editor':
        return <CharacterEditorView />;
      case 'adventure-editor':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'gamemaster':
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
            <Library onNavigate={handleNavigate} onNavigateToItem={navigateToItem} />
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
