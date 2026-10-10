/**
 * Layout — single shell with CSS desktop/mobile chrome; one children mount.
 * Chrome toggles via Tailwind `md:` so resize does not remount route state.
 * `data-app-shell` tracks viewport for e2e; Radix portals stay unduplicated.
 * Shows a compact logged-in name pill next to Settings (mobile header + desktop sidebar).
 * Page views own their titles — no duplicate desktop chrome title bar.
 * Location: src/app/shell/Layout.tsx
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
import { useAuth } from '../../lib/auth-context';
import { toast } from 'sonner';
import { Badge } from '../../shared/ui/badge';
import { isCompactBand, useAdaptiveBand } from '../../shared/ui/adaptive';
import { ImageWithFallback } from '../../shared/ui/figma/ImageWithFallback';
import logoImage from 'figma:asset/5cdcbab5ea0860d6cbb920fecd888377cdc015a0.png';

/** Minimal auth shape for chrome identity — avoid app→@supabase import (#94). */
type AuthDisplayUser = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

/** Prefer display_name → username → email local-part for chrome identity chip. */
function resolveAuthDisplayName(user: AuthDisplayUser | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  for (const key of ['display_name', 'username'] as const) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  const local = user.email?.split('@')[0]?.trim();
  return local || null;
}

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

const SIDEBAR_COLLAPSED_KEY = 'sagadrive-sidebar-collapsed';
/** Tailwind `md` breakpoint — keep in sync with CSS. */
const DESKTOP_MQ = '(min-width: 768px)';

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ).matches : true,
  );

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_MQ);
    const onChange = () => setIsDesktop(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const { user, signOut } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userExpandedDesktop, setUserExpandedDesktop] = useState(false);
  const isDesktop = useIsDesktop();
  const viewportBand = useAdaptiveBand();
  const displayName = resolveAuthDisplayName(user);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch {
      // ignore storage errors (private mode)
    }
  }, []);

  // Compact viewport bands: keep rail collapsed so Journey content keeps width
  // (IDE split panes / tablet). Desktop restores stored preference unless the
  // user explicitly expanded during this session.
  useEffect(() => {
    if (isCompactBand(viewportBand)) {
      setSidebarCollapsed(true);
      return;
    }
    if (userExpandedDesktop) return;
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch {
      setSidebarCollapsed(false);
    }
  }, [viewportBand, userExpandedDesktop]);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      if (viewportBand === 'desktop' && !next) {
        setUserExpandedDesktop(true);
      }
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
    <div
      className="min-h-screen bg-background"
      data-app-shell={isDesktop ? 'desktop' : 'mobile'}
    >
      <div className="flex h-screen flex-col md:flex-row">
        <aside
          className={`hidden md:flex bg-sidebar border-r border-sidebar-border flex-col transition-[width] duration-200 ease-out ${
            sidebarCollapsed ? 'w-[4.5rem]' : 'w-64'
          }`}
          data-collapsed={sidebarCollapsed ? 'true' : 'false'}
        >
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
              {displayName ? (
                <button
                  type="button"
                  onClick={() => onNavigate('profile')}
                  className={`min-w-0 ${sidebarCollapsed ? 'flex justify-center' : ''}`}
                  title={displayName}
                  aria-label={`Angemeldet als ${displayName}`}
                  data-shell-user-pill="desktop"
                >
                  <Badge
                    variant="outline"
                    className={`rounded-full border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground ${
                      sidebarCollapsed
                        ? 'size-9 justify-center px-0 text-xs uppercase'
                        : 'max-w-[7.5rem] truncate px-2.5 py-1'
                    }`}
                  >
                    {sidebarCollapsed ? displayName.slice(0, 1) : displayName}
                  </Badge>
                </button>
              ) : null}
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

        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <header className="md:hidden bg-card border-b border-border px-4 py-3 flex-shrink-0">
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
                {displayName ? (
                  <button
                    type="button"
                    onClick={() => onNavigate('profile')}
                    className="min-w-0"
                    title={displayName}
                    aria-label={`Angemeldet als ${displayName}`}
                    data-shell-user-pill="mobile"
                  >
                    <Badge
                      variant="outline"
                      className="max-w-[9rem] truncate rounded-full bg-muted/50 px-2.5 py-1"
                    >
                      {displayName}
                    </Badge>
                  </button>
                ) : null}
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

          <main
            className="@container/main min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0"
            data-adaptive-main
            data-adaptive-viewport-band={viewportBand}
          >
            {children}
          </main>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-pb">
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
