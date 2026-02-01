import { useState } from "react";
import { AuthProvider } from "./lib/auth-context";
import { ThemeProvider } from "./lib/theme-provider";
import { AuthGate } from "./components/auth/AuthGate";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { CharacterEditor } from "./components/CharacterEditor";
import { GamemasterPanel } from "./components/GamemasterPanel";
import { Marketplace } from "./components/Marketplace";
import { ProjectJoin } from "./components/ProjectJoin";
import { Library } from "./components/Library";
import { Profile } from "./components/Profile";
import { RulesetsTest } from "./components/RulesetsTest";
import { MarketplaceTest } from "./components/MarketplaceTest";
import { Toaster } from "./components/ui/sonner";

// ═══════════════════════════════════════════════════════════════
// 📊 DevTrack Snippet - MMS (DEBUG VERSION)
// ═══════════════════════════════════════════════════════════════
// Automatisches Tracking für Figma Make/Lovable Projekte
// Trackt: Arbeitszeit + Chat-Eingaben + Aktivitäten
// ⚠️ Nur ECHTE Aktivität wird getrackt!
// 🐛 DEBUG VERSION: Mit Console Logs für Troubleshooting
// ═══════════════════════════════════════════════════════════════

// ⚠️ STRONGER SINGLETON GUARD
if (typeof window !== 'undefined') {
  // Check if already initialized
  if ((window as any).DEVTRACK_INSTANCE_ID) {
    console.warn('⚠️ DevTrack: Already initialized with instance ID:', (window as any).DEVTRACK_INSTANCE_ID, '- SKIPPING!');
  } else {
    // Generate unique instance ID
    const instanceId = Math.random().toString(36).substring(7);
    (window as any).DEVTRACK_INSTANCE_ID = instanceId;
    console.log('🆕 DevTrack: New instance created:', instanceId);

    const DEVTRACK_SNIPPET_KEY = '6b4e7b96-e392-42df-8dfc-ea581d599fca';
    const DEVTRACK_API_URL = 'https://vjpfbedynctazvwywlqj.supabase.co/functions/v1/DevTrack-Logs';
    const DEVTRACK_AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqcGZiZWR5bmN0YXp2d3l3bHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTY2MDQsImV4cCI6MjA3NzMzMjYwNH0.P7GyqRzB-PjVLx9bIv9pOom6Fss2hPOVqwEm1AITS6k';

    let activeTime = 0;
    let sessionStart = Date.now();
    let activityTimer: NodeJS.Timeout | null = null;
    let reportTimer: NodeJS.Timeout | null = null;
    let inputCount = 0;
    let buttonClickCount = 0;
    let activityBuffer: string[] = [];
    let hadActivityThisMinute = false;
    let firstActivityLogged = false; // NEW: Track if we sent first activity

    // Send logs to backend
    async function sendLog(content: string, duration = 0) {
      try {
        console.log('📤 DevTrack: Sending log...', { content, duration });
        
        const response = await fetch(DEVTRACK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEVTRACK_AUTH_KEY}`
          },
          body: JSON.stringify({
            snippetKey: DEVTRACK_SNIPPET_KEY,
            type: 'activity',
            content,
            duration
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ DevTrack: Failed to log', response.status, errorText);
        } else {
          console.log('✅ DevTrack: Logged -', content);
        }
      } catch (error) {
        console.error('❌ DevTrack: Error:', error);
      }
    }

    // Send periodic activity report
    function sendActivityReport() {
      console.log('📊 DevTrack: Report triggered', { inputCount, buttonClickCount, activeTime });
      
      // ⚠️ ONLY send if there was REAL activity (inputs or clicks)
      if (inputCount === 0 && buttonClickCount === 0) {
        console.log('⏭️ DevTrack: Skipping report (no activity)');
        return;
      }
      
      const activities = activityBuffer.length > 0 
        ? activityBuffer.join(', ') 
        : 'Aktiv';
      
      const summary = `⏱️ ${activeTime} Min aktiv | 💬 ${inputCount} Eingaben | 🖱️ ${buttonClickCount} Klicks | 📝 ${activities}`;
      
      sendLog(summary, activeTime);
      
      // Reset counters but keep activeTime cumulative
      activityBuffer = [];
      inputCount = 0;
      buttonClickCount = 0;
    }

    // Track active time
    function startTracking() {
      console.log('⏰ DevTrack: Starting timers...');
      
      // Measure active time every minute
      activityTimer = setInterval(() => {
        console.log('⏱️ DevTrack: Minute check', { hadActivityThisMinute, activeTime });
        
        // ⚠️ Only count time if there was activity this minute
        if (hadActivityThisMinute) {
          activeTime += 1;
          hadActivityThisMinute = false;  // Reset for next minute
          console.log('✅ DevTrack: Active minute counted, total:', activeTime);
        } else {
          console.log('⏸️ DevTrack: No activity this minute, skipping');
        }
      }, 60 * 1000);
      
      // Send activity report every 5 minutes
      reportTimer = setInterval(() => {
        console.log('📊 DevTrack: 5-minute report timer fired');
        sendActivityReport();
      }, 5 * 60 * 1000); // Every 5 minutes
      
      console.log('✅ DevTrack: Timers started successfully');
    }

    // Track text inputs (Chat, Forms, etc.)
    function trackInputs() {
      console.log('🔌 DevTrack: Attaching input listener...');
      
      const handleInput = (e: Event) => {
        const target = e.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea') {
          console.log('⌨️ DevTrack: Input detected!', { 
            tagName, 
            placeholder: (target as HTMLInputElement).placeholder 
          });
          
          hadActivityThisMinute = true;
          inputCount++;
          
          const placeholder = (target as HTMLInputElement).placeholder || 'Feld';
          if (!activityBuffer.includes(`Eingabe: ${placeholder}`)) {
            activityBuffer.push(`Eingabe: ${placeholder}`);
          }
          
          // 🐛 DEBUG: Send immediate log on FIRST activity
          if (!firstActivityLogged) {
            firstActivityLogged = true;
            sendLog(`🎯 Erste Aktivität erkannt: Eingabe in "${placeholder}"`, 0);
          }
        }
      };
      
      document.addEventListener('input', handleInput, true);
      console.log('✅ DevTrack: Input listener attached');
    }

    // Track button clicks
    function trackClicks() {
      console.log('🔌 DevTrack: Attaching click listener...');
      
      const handleClick = (e: Event) => {
        const target = e.target as HTMLElement;
        
        if (target.tagName.toLowerCase() === 'button' || target.closest('button')) {
          const button = target.closest('button') || target;
          const text = button.textContent?.trim().substring(0, 30) || 'Button';
          
          console.log('🖱️ DevTrack: Click detected!', { 
            buttonText: text 
          });
          
          hadActivityThisMinute = true;
          buttonClickCount++;
          
          if (!activityBuffer.includes(`Klick: ${text}`)) {
            activityBuffer.push(`Klick: ${text}`);
          }
          
          // 🐛 DEBUG: Send immediate log on FIRST activity
          if (!firstActivityLogged) {
            firstActivityLogged = true;
            sendLog(`🎯 Erste Aktivität erkannt: Klick auf "${text}"`, 0);
          }
        }
      };
      
      document.addEventListener('click', handleClick, true);
      console.log('✅ DevTrack: Click listener attached');
    }

    // Cleanup function
    function cleanupDevTrack() {
      console.log('🧹 DevTrack: Cleaning up...');
      
      if (activityTimer) {
        clearInterval(activityTimer);
        console.log('✅ DevTrack: Activity timer cleared');
      }
      
      if (reportTimer) {
        clearInterval(reportTimer);
        console.log('✅ DevTrack: Report timer cleared');
      }
      
      // Reset instance ID on cleanup
      delete (window as any).DEVTRACK_INSTANCE_ID;
      console.log('✅ DevTrack: Instance ID cleared');
    }

    // Initialize tracking
    console.log('🚀 DevTrack: Initializing tracking system...');
    
    startTracking();
    trackInputs();
    trackClicks();
    
    // Expose trackActivity globally for components
    (window as any).trackActivity = (description: string) => {
      hadActivityThisMinute = true;
      if (!activityBuffer.includes(description)) {
        activityBuffer.push(description);
      }
      console.log('📝 DevTrack: Manual activity tracked -', description);
    };
    
    sendLog('🟢 Tracking gestartet', 0);
    console.log('✅ DevTrack: Initialization complete!');
    
    // Send final report on page unload
    window.addEventListener('beforeunload', () => {
      console.log('👋 DevTrack: Page unloading, sending final report...');
      sendActivityReport();
      
      const totalTime = Math.round((Date.now() - sessionStart) / 60000);
      navigator.sendBeacon(
        DEVTRACK_API_URL,
        JSON.stringify({
          snippetKey: DEVTRACK_SNIPPET_KEY,
          type: 'session',
          content: `🔴 Session beendet | Gesamt: ${totalTime} Min`,
          duration: activeTime
        })
      );
      
      cleanupDevTrack();
    });
    
    // Send report when tab becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('👁️ DevTrack: Tab hidden, sending report...');
        sendActivityReport();
      }
    });
    
    // 🐛 DEBUG: Log current state every 30 seconds
    setInterval(() => {
      console.log('📊 DevTrack: Status Update', {
        instanceId,
        activeTime,
        inputCount,
        buttonClickCount,
        activityBuffer: activityBuffer.length,
        firstActivityLogged
      });
    }, 30 * 1000);
  }
}

// ═══════════════════════════════════════════════════════════════
// ⚠️ ENDE DES DEVTRACK SNIPPETS - Nicht darunter einfügen!
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [currentView, setCurrentView] = useState<"dashboard" | "character-editor" | "adventure-editor" | "gamemaster" | "marketplace" | "library" | "profile" | "join" | "rulesets-test" | "marketplace-test">("dashboard");
  const [inSession, setInSession] = useState(false);
  const [sessionRole, setSessionRole] = useState<"player" | "gamemaster" | null>(null);

  // Debug wrapper for navigation
  const handleNavigate = (view: string) => {
    console.log('🚀 App: Navigation requested:', view);
    console.log('📍 App: Current view:', currentView);
    setCurrentView(view as any);
    console.log('✅ App: Navigation state updated to:', view);
  };

  const renderView = () => {
    console.log('🎬 App: Rendering view:', currentView);
    
    switch (currentView) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} />;
      case "character-editor":
        console.log('✅ App: Showing CharacterEditor');
        return <CharacterEditor />;
      case "adventure-editor":
        console.log('⚠️ App: Adventure Editor not yet implemented');
        return <Dashboard onNavigate={handleNavigate} />;
      case "gamemaster":
        return <GamemasterPanel />;
      case "marketplace":
        return <Marketplace />;
      case "library":
        return <Library onNavigate={handleNavigate} />;
      case "profile":
        return <Profile />;
      case "join":
        return <ProjectJoin />;
      case "rulesets-test":
        return <RulesetsTest />;
      case "marketplace-test":
        return <MarketplaceTest />;
      default:
        console.warn('⚠️ App: Unknown view:', currentView);
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  // If in session, show session view without main navigation
  if (inSession && sessionRole) {
    return (
      <div className="h-screen bg-background">
        {renderView()}
      </div>
    );
  }

  // Normal library/prep mode with navigation
  return (
    <AuthProvider>
      <ThemeProvider>
        <AuthGate>
          <Layout
            currentView={currentView}
            onNavigate={handleNavigate}
          >
            {renderView()}
          </Layout>
          <Toaster />
        </AuthGate>
      </ThemeProvider>
    </AuthProvider>
  );
}
