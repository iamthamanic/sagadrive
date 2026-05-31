import { ReactNode } from 'react';
import { 
  Home, 
  User, 
  BookOpen, 
  Gamepad2, 
  ShoppingBag, 
  Settings,
  LogOut,
  FileText
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

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success('Erfolgreich abgemeldet');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'library', label: 'Bibliothek', icon: BookOpen },
    { id: 'character-editor', label: 'Charakter Editor', icon: User },
    { id: 'adventure-editor', label: 'Abenteuer Editor', icon: FileText },
    { id: 'marketplace', label: 'Marktplatz', icon: ShoppingBag },
    { id: 'marketplace-test', label: '🧪 Marketplace Test', icon: Settings },
    { id: 'profile', label: 'Profil', icon: Settings },
  ];

  const mobileNavItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'library', label: 'Bibliothek', icon: BookOpen },
    { id: 'marketplace', label: 'Markt', icon: ShoppingBag },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: Sidebar + Content Layout */}
      <div className="hidden md:flex md:h-screen">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex-shrink-0">
                <ImageWithFallback
                  src={logoImage}
                  alt="SagaDrive Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-sidebar-foreground">SagaDrive</h1>
                <p className="text-sm text-sidebar-foreground/60 font-[Darker_Grotesque]">SagaDrive</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      console.log('🎯 Layout: Navigation clicked -', item.id);
                      onNavigate(item.id);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm hover:bg-destructive/10 text-destructive"
            >
              <LogOut className="w-5 h-5" />
              <span>Abmelden</span>
            </button>
          </div>
        </aside>

        {/* Desktop Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop Header */}
          <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-foreground font-[Darker_Grotesque]">
                {navItems.find(item => item.id === currentView)?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('profile')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Einstellungen"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
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
              <div>
                <h1 className="text-base">SagaDrive</h1>
                <p className="text-xs text-muted-foreground">SagaDrive</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('profile')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Einstellungen"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
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
                  onClick={() => {
                    console.log('🎯 Layout (Mobile): Navigation clicked -', item.id);
                    onNavigate(item.id);
                  }}
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
