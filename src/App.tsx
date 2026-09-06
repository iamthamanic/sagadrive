/**
 * App — composition root: AuthGate, Layout, History routing (#133), lazy views.
 * Location: src/App.tsx
 */
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { AuthProvider } from './lib/auth-context';
import { ThemeProvider } from './lib/theme-provider';
import { AuthGate } from './components/auth/AuthGate';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ViewLoadingFallback } from './components/ViewLoadingFallback';
import { Toaster } from './components/ui/sonner';
import { useAppLocation } from './app/shell/routing';
import {
  ItemCreatePlaceholder,
  ItemDetailPlaceholder,
  NotFoundPlaceholder,
} from './app/items/ItemRoutePlaceholders';

const CharacterEditor = lazy(() =>
  import('./components/CharacterEditor').then((module) => ({ default: module.CharacterEditor })),
);
const GamemasterPanel = lazy(() =>
  import('./components/GamemasterPanel').then((module) => ({ default: module.GamemasterPanel })),
);
const Marketplace = lazy(() =>
  import('./components/Marketplace').then((module) => ({ default: module.Marketplace })),
);
const ProjectJoin = lazy(() =>
  import('./components/ProjectJoin').then((module) => ({ default: module.ProjectJoin })),
);
const Library = lazy(() =>
  import('./components/Library').then((module) => ({ default: module.Library })),
);
const Profile = lazy(() =>
  import('./components/Profile').then((module) => ({ default: module.Profile })),
);
const RulesetsTest = lazy(() =>
  import('./components/RulesetsTest').then((module) => ({ default: module.RulesetsTest })),
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
  const { currentView, itemId, route, navigateToView } = useAppLocation();

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
            <Library onNavigate={handleNavigate} />
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
        return <ItemCreatePlaceholder onBack={() => handleNavigate('library')} />;
      case 'item-detail':
        return (
          <ItemDetailPlaceholder
            itemId={itemId ?? ''}
            onBack={() => handleNavigate('library')}
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
