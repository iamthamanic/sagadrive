import { lazy, Suspense, useState, type ReactNode } from "react";
import { AuthProvider } from "./lib/auth-context";
import { ThemeProvider } from "./lib/theme-provider";
import { AuthGate } from "./components/auth/AuthGate";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { ViewLoadingFallback } from "./components/ViewLoadingFallback";
import { Toaster } from "./components/ui/sonner";

const CharacterEditor = lazy(() =>
  import("./components/CharacterEditor").then((module) => ({ default: module.CharacterEditor })),
);
const GamemasterPanel = lazy(() =>
  import("./components/GamemasterPanel").then((module) => ({ default: module.GamemasterPanel })),
);
const Marketplace = lazy(() =>
  import("./components/Marketplace").then((module) => ({ default: module.Marketplace })),
);
const ProjectJoin = lazy(() =>
  import("./components/ProjectJoin").then((module) => ({ default: module.ProjectJoin })),
);
const Library = lazy(() =>
  import("./components/Library").then((module) => ({ default: module.Library })),
);
const Profile = lazy(() =>
  import("./components/Profile").then((module) => ({ default: module.Profile })),
);
const RulesetsTest = lazy(() =>
  import("./components/RulesetsTest").then((module) => ({ default: module.RulesetsTest })),
);

if (import.meta.env.DEV) {
  void import("./lib/devtrack").then(({ initDevTrack }) => initDevTrack());
}

type AppView =
  | "dashboard"
  | "character-editor"
  | "adventure-editor"
  | "gamemaster"
  | "marketplace"
  | "library"
  | "profile"
  | "join"
  | "rulesets-test";

const APP_VIEWS = new Set<string>([
  "dashboard",
  "character-editor",
  "adventure-editor",
  "gamemaster",
  "marketplace",
  "library",
  "profile",
  "join",
  "rulesets-test",
]);

function isAppView(view: string): view is AppView {
  return APP_VIEWS.has(view);
}

function LazyView({ children }: { children: ReactNode }) {
  return <Suspense fallback={<ViewLoadingFallback />}>{children}</Suspense>;
}

function CharacterEditorView() {
  // Capture edit id once per mount so clearing sessionStorage after hydrate
  // does not remount the editor mid-load.
  const [mountKey] = useState(
    () => (typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('sagadrive:character-edit-id')
      : null) ?? 'new-character',
  );
  return (
    <LazyView>
      <CharacterEditor key={mountKey} />
    </LazyView>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>("dashboard");
  const [inSession, setInSession] = useState(false);
  const [sessionRole, setSessionRole] = useState<"player" | "gamemaster" | null>(null);

  const handleNavigate = (view: string) => {
    if (!isAppView(view)) {
      console.warn("⚠️ App: Unknown view:", view);
      return;
    }
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} />;
      case "character-editor":
        return <CharacterEditorView />;
      case "adventure-editor":
        return <Dashboard onNavigate={handleNavigate} />;
      case "gamemaster":
        return (
          <LazyView>
            <GamemasterPanel />
          </LazyView>
        );
      case "marketplace":
        return (
          <LazyView>
            <Marketplace />
          </LazyView>
        );
      case "library":
        return (
          <LazyView>
            <Library onNavigate={handleNavigate} />
          </LazyView>
        );
      case "profile":
        return (
          <LazyView>
            <Profile />
          </LazyView>
        );
      case "join":
        return (
          <LazyView>
            <ProjectJoin
              onBack={() => handleNavigate("dashboard")}
              onJoinAsGM={() => undefined}
              onJoinAsPlayer={() => undefined}
            />
          </LazyView>
        );
      case "rulesets-test":
        return (
          <LazyView>
            <RulesetsTest />
          </LazyView>
        );
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  if (inSession && sessionRole) {
    return <div className="h-screen bg-background">{renderView()}</div>;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <AuthGate>
          <Layout currentView={currentView} onNavigate={handleNavigate}>
            {renderView()}
          </Layout>
          <Toaster />
        </AuthGate>
      </ThemeProvider>
    </AuthProvider>
  );
}
