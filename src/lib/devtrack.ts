/**
 * Dev-only activity tracking for Figma Make / Lovable workflows.
 * Loaded dynamically from App.tsx only when import.meta.env.DEV is true.
 * Location: src/lib/devtrack.ts
 */

declare global {
  interface Window {
    DEVTRACK_INSTANCE_ID?: string;
    trackActivity?: (description: string) => void;
  }
}

export function initDevTrack(): void {
  if (typeof window === 'undefined') return;

  if (window.DEVTRACK_INSTANCE_ID) {
    console.warn('⚠️ DevTrack: Already initialized with instance ID:', window.DEVTRACK_INSTANCE_ID, '- SKIPPING!');
    return;
  }

  const instanceId = Math.random().toString(36).substring(7);
  window.DEVTRACK_INSTANCE_ID = instanceId;
  console.log('🆕 DevTrack: New instance created:', instanceId);

  const DEVTRACK_SNIPPET_KEY = '6b4e7b96-e392-42df-8dfc-ea581d599fca';
  const DEVTRACK_API_URL = 'https://vjpfbedynctazvwywlqj.supabase.co/functions/v1/DevTrack-Logs';
  const DEVTRACK_AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqcGZiZWR5bmN0YXp2d3l3bHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTY2MDQsImV4cCI6MjA3NzMzMjYwNH0.P7GyqRzB-PjVLx9bIv9pOom6Fss2hPOVqwEm1AITS6k';

  let activeTime = 0;
  let sessionStart = Date.now();
  let activityTimer: ReturnType<typeof setInterval> | null = null;
  let reportTimer: ReturnType<typeof setInterval> | null = null;
  let inputCount = 0;
  let buttonClickCount = 0;
  let activityBuffer: string[] = [];
  let hadActivityThisMinute = false;
  let firstActivityLogged = false;

  async function sendLog(content: string, duration = 0) {
    try {
      console.log('📤 DevTrack: Sending log...', { content, duration });

      const response = await fetch(DEVTRACK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEVTRACK_AUTH_KEY}`,
        },
        body: JSON.stringify({
          snippetKey: DEVTRACK_SNIPPET_KEY,
          type: 'activity',
          content,
          duration,
        }),
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

  function sendActivityReport() {
    console.log('📊 DevTrack: Report triggered', { inputCount, buttonClickCount, activeTime });

    if (inputCount === 0 && buttonClickCount === 0) {
      console.log('⏭️ DevTrack: Skipping report (no activity)');
      return;
    }

    const activities = activityBuffer.length > 0 ? activityBuffer.join(', ') : 'Aktiv';
    const summary = `⏱️ ${activeTime} Min aktiv | 💬 ${inputCount} Eingaben | 🖱️ ${buttonClickCount} Klicks | 📝 ${activities}`;

    sendLog(summary, activeTime);

    activityBuffer = [];
    inputCount = 0;
    buttonClickCount = 0;
  }

  function startTracking() {
    console.log('⏰ DevTrack: Starting timers...');

    activityTimer = setInterval(() => {
      if (hadActivityThisMinute) {
        activeTime += 1;
        hadActivityThisMinute = false;
      }
    }, 60 * 1000);

    reportTimer = setInterval(() => {
      sendActivityReport();
    }, 5 * 60 * 1000);
  }

  function trackInputs() {
    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();

      if (tagName === 'input' || tagName === 'textarea') {
        hadActivityThisMinute = true;
        inputCount++;

        const placeholder = (target as HTMLInputElement).placeholder || 'Feld';
        if (!activityBuffer.includes(`Eingabe: ${placeholder}`)) {
          activityBuffer.push(`Eingabe: ${placeholder}`);
        }

        if (!firstActivityLogged) {
          firstActivityLogged = true;
          sendLog(`🎯 Erste Aktivität erkannt: Eingabe in "${placeholder}"`, 0);
        }
      }
    };

    document.addEventListener('input', handleInput, true);
  }

  function trackClicks() {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;

      if (target.tagName.toLowerCase() === 'button' || target.closest('button')) {
        const button = target.closest('button') || target;
        const text = button.textContent?.trim().substring(0, 30) || 'Button';

        hadActivityThisMinute = true;
        buttonClickCount++;

        if (!activityBuffer.includes(`Klick: ${text}`)) {
          activityBuffer.push(`Klick: ${text}`);
        }

        if (!firstActivityLogged) {
          firstActivityLogged = true;
          sendLog(`🎯 Erste Aktivität erkannt: Klick auf "${text}"`, 0);
        }
      }
    };

    document.addEventListener('click', handleClick, true);
  }

  function cleanupDevTrack() {
    if (activityTimer) clearInterval(activityTimer);
    if (reportTimer) clearInterval(reportTimer);
    delete window.DEVTRACK_INSTANCE_ID;
  }

  startTracking();
  trackInputs();
  trackClicks();

  window.trackActivity = (description: string) => {
    hadActivityThisMinute = true;
    if (!activityBuffer.includes(description)) {
      activityBuffer.push(description);
    }
  };

  sendLog('🟢 Tracking gestartet', 0);

  window.addEventListener('beforeunload', () => {
    sendActivityReport();

    const totalTime = Math.round((Date.now() - sessionStart) / 60000);
    navigator.sendBeacon(
      DEVTRACK_API_URL,
      JSON.stringify({
        snippetKey: DEVTRACK_SNIPPET_KEY,
        type: 'session',
        content: `🔴 Session beendet | Gesamt: ${totalTime} Min`,
        duration: activeTime,
      }),
    );

    cleanupDevTrack();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      sendActivityReport();
    }
  });
}
