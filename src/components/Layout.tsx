/**
 * Layout — Desktop sidebar + mobile bottom nav shell for authenticated views.
 * Location: src/components/Layout.tsx
 * Desktop sidebar collapses to icon-only rail; state persisted in localStorage.
 */
import { useEffect, useState, type ReactNode } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  Settings,
  ShoppingBag,
  User,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { toast } from 'sonner';
import { ImageWithFallback } from './figma/ImageWithFallback';
import logoImage from 'figma:asset/5cdcbab5ea0860d6cbb920fecd888377cdc015a0.png';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

const VIEW_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  library: 'Bibliothek',
  'character-editor': 'Charakter Editor',
  'adventure-editor': 'Abenteuer Editor',
  marketplace: 'Marktplatz',
  profile: 'Einstellungen',
};

const SIDEBAR_COLLAPSED_KEY = 'sagadrive-sidebar-collapsed';

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const { signOut } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch {
      // ignore storage errors (private mode)
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Erfolgreich abgemeldet');
  };

  // Editors are reached via Bibliothek (create/edit), not as top-level nav
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'library', label: 'Bibliothek', icon: BookOpen },
    { id: 'marketplace', label: 'Marktplatz', icon: ShoppingBag },
  ];

  const mobileNavItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'library', label: 'Bibliothek', icon: BookOpen },
    { id: 'marketplace', label: 'Markt', icon: ShoppingBag },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  const CollapseIcon = sidebarCollapsed ? ChevronRight : ChevronLeft;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: Sidebar + Content Layout */}
      <div className="hidden md:flex md:h-screen">
        {/* Desktop Sidebar */}
        <aside
          className={`bg-sidebar border-r border-sidebar-border flex flex-col transition-[width] duration-200 ease-out ${
            sidebarCollapsed ? 'w-[4.5rem]' : 'w-64'
          }`}
          data-collapsed={sidebarCollapsed ? 'true' : 'false'}
        >
          {/* Logo + collapse control */}
          <div className={`border-b border-sidebar-border ${sidebarCollapsed ? 'p-3' : 'p-4 pl-6 pr-3'}`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'flex-col gap-2' : 'gap-2'}`}>
              <div className={`flex items-center min-w-0 ${sidebarCollapsed ? 'justify-center' : 'flex-1 gap-3'}`}>
                <div className={`flex-shrink-0 ${sidebarCollapsed ? 'w-10 h-10' : 'w-12 h-12'}`}>
                  <ImageWithFallback
                    src={logoImage}
                    alt="SagaDrive Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <h1 className="text-sidebar-foreground truncate">SagaDrive</h1>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors flex-shrink-0"
                title={sidebarCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
                aria-label={sidebarCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
                aria-expanded={!sidebarCollapsed}
              >
                <CollapseIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 overflow-y-auto ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center rounded-lg transition-colors text-sm ${
                      sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
                    } ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Settings + Logout */}
          <div className={`border-t border-sidebar-border ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`flex ${sidebarCollapsed ? 'flex-col items-stretch gap-1' : 'items-center gap-2'}`}>
              <button
                type="button"
                onClick={handleLogout}
                title="Abmelden"
                aria-label="Abmelden"
                className={`flex items-center rounded-lg transition-colors text-sm hover:bg-destructive/10 text-destructive ${
                  sidebarCollapsed ? 'justify-center px-2 py-3' : 'flex-1 gap-3 px-4 py-3'
                }`}
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>Abmelden</span>}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className={`rounded-lg transition-colors flex-shrink-0 ${
                  sidebarCollapsed ? 'flex justify-center px-2 py-3' : 'p-3'
                } ${
                  currentView === 'profile'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
                title="Einstellungen"
                aria-label="Einstellungen"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Desktop Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Desktop Header */}
          <header className="h-16 bg-card border-b border-border px-6 flex items-center flex-shrink-0">
            <h2 className="text-foreground font-[Darker_Grotesque]">
              {VIEW_LABELS[currentView] || 'Dashboard'}
            </h2>
          </header>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile: Header + Content + Bottom Nav */}
      <div className="md:hidden flex flex-col h-screen">
        {/* Mobile Header */}
        <header className="bg-card border-b border-border px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 flex-shrink-0">
                <ImageWithFallback
                  src={logoImage}
                  alt="SagaDrive Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-base">SagaDrive</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Einstellungen"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                title="Abmelden"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Main Content */}
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb">
          <div className="grid grid-cols-4 gap-1 px-2 py-2">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
