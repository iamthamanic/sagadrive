/**
 * Performance interaction probe — harness for @test-performance-speed.
 * Location: e2e/perf-interaction-probe.spec.ts
 *
 * Gated by PERF_PROBE=1 (skipped in normal CI/e2e).
 * Run: PERF_PROBE=1 PERF_REPEATS=5 npx playwright test e2e/perf-interaction-probe.spec.ts --project=chromium
 */
import { test, expect, type Page, type Request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ensureLoggedIn, dashboardReadyLocator } from './helpers/auth';

const OUT_DIR = '.qa/runs/perf-speed';
const REPEATS = Number(process.env.PERF_REPEATS ?? 5);
const WARMUPS = Number(process.env.PERF_WARMUPS ?? 1);

type Sample = {
  interaction: string;
  ms: number;
  ok: boolean;
  perceived_ms?: number;
  fully_ms?: number;
  network_ms?: number;
  transfer_bytes?: number;
  long_tasks_ms?: number;
  asset_requests?: number;
  notes?: string;
};

const samples: Sample[] = [];

function ensureOut() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function flushSamples() {
  ensureOut();
  const outPath = path.join(OUT_DIR, `samples-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ profile: 'A_fast_desktop', samples }, null, 2));
  const grouped: Record<string, Sample[]> = {};
  for (const s of samples) {
    (grouped[s.interaction] ??= []).push(s);
  }
  const groupedPath = path.join(OUT_DIR, 'samples-latest.json');
  fs.writeFileSync(groupedPath, JSON.stringify(grouped, null, 2));
  console.log(`Wrote ${outPath} and ${groupedPath} (${samples.length} samples)`);
}

async function installObservers(page: Page) {
  await page.addInitScript(() => {
    const w = window as Window & {
      __perfProbe?: { longTasksMs: number };
    };
    w.__perfProbe = { longTasksMs: 0 };
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.entryType === 'longtask') {
            w.__perfProbe!.longTasksMs += e.duration;
          }
        }
      });
      po.observe({ entryTypes: ['longtask'] as string[] });
    } catch {
      /* unavailable */
    }
  });
}

function trackNetwork(page: Page) {
  let transfer = 0;
  let assetReqs = 0;
  const started = new Map<string, number>();
  let firstStart = Number.POSITIVE_INFINITY;
  let lastEnd = 0;

  const onReq = (req: Request) => {
    const t = Date.now();
    started.set(req.url(), t);
    firstStart = Math.min(firstStart, t);
    const url = req.url();
    if (/\.(glb|gltf|vrm|wasm|bin|png|jpg|jpeg|webp)(\?|$)/i.test(url) || url.includes('mediapipe')) {
      assetReqs += 1;
    }
  };
  const onDone = async (req: Request) => {
    const t0 = started.get(req.url());
    const t1 = Date.now();
    if (t0 != null) lastEnd = Math.max(lastEnd, t1);
    try {
      const res = await req.response();
      const len = Number(res?.headers()['content-length'] ?? 0);
      if (Number.isFinite(len) && len > 0) transfer += len;
    } catch {
      /* ignore */
    }
  };

  page.on('request', onReq);
  page.on('requestfinished', onDone);
  page.on('requestfailed', onDone);

  return {
    snapshot: () => ({
      transfer_bytes: transfer,
      asset_requests: assetReqs,
      network_span_ms:
        Number.isFinite(firstStart) && lastEnd >= firstStart ? lastEnd - firstStart : 0,
    }),
    reset: () => {
      transfer = 0;
      assetReqs = 0;
      started.clear();
      firstStart = Number.POSITIVE_INFINITY;
      lastEnd = 0;
    },
    dispose: () => {
      page.off('request', onReq);
      page.off('requestfinished', onDone);
      page.off('requestfailed', onDone);
    },
  };
}

async function longTasksMs(page: Page): Promise<number> {
  return page.evaluate(() => {
    const w = window as Window & { __perfProbe?: { longTasksMs: number } };
    return w.__perfProbe?.longTasksMs ?? 0;
  });
}

async function resetLongTasks(page: Page) {
  await page.evaluate(() => {
    const w = window as Window & { __perfProbe?: { longTasksMs: number } };
    if (w.__perfProbe) w.__perfProbe.longTasksMs = 0;
  });
}

async function measureOnce(
  page: Page,
  interaction: string,
  run: () => Promise<{ perceived: number; fully: number; notes?: string }>,
) {
  const net = trackNetwork(page);
  await resetLongTasks(page);
  net.reset();
  const t0 = Date.now();
  let ok = true;
  let perceived = 0;
  let fully = 0;
  let notes: string | undefined;
  try {
    const r = await run();
    perceived = r.perceived;
    fully = r.fully;
    notes = r.notes;
  } catch (err) {
    ok = false;
    notes = err instanceof Error ? err.message : String(err);
    fully = Date.now() - t0;
    perceived = fully;
  }
  const snap = net.snapshot();
  net.dispose();
  samples.push({
    interaction,
    ms: fully,
    ok,
    perceived_ms: perceived,
    fully_ms: fully,
    network_ms: snap.network_span_ms,
    transfer_bytes: snap.transfer_bytes,
    long_tasks_ms: await longTasksMs(page),
    asset_requests: snap.asset_requests,
    notes,
  });
}

/** Open blank editor; accessible tab names may include IncompleteTabHint suffixes. */
async function openBlankCharacterEditorSoft(page: Page) {
  await ensureLoggedIn(page);
  const createViaEmptyState = page.getByRole('button', { name: 'Charakter erstellen' });
  if (await createViaEmptyState.count()) {
    await createViaEmptyState.first().click();
  } else {
    await page.getByRole('heading', { name: 'Neuer Charakter' }).first().click();
  }
  await expect(page.getByRole('heading', { name: 'Charakter erstellen' })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: /Eigenen Charakter erstellen/i }).click();
  await expect(page.getByRole('heading', { name: 'Charakter Editor' }).first()).toBeVisible({
    timeout: 30_000,
  });
  // Spezies tab may include IncompleteTabHint in accessible name — use loose match.
  await expect(page.getByRole('tab', { name: /Spezies/i }).first()).toBeVisible({
    timeout: 30_000,
  });
}

test.skip(!process.env.PERF_PROBE, 'Set PERF_PROBE=1 to run performance probe');
test.describe.configure({ mode: 'serial' });

test('perf probe: critical journeys', async ({ page }) => {
  test.setTimeout(600_000);
  ensureOut();
  await page.setViewportSize({ width: 1440, height: 900 });
  await installObservers(page);

  try {
    await measureOnce(page, 'login_to_dashboard_cold', async () => {
      const t0 = Date.now();
      await ensureLoggedIn(page, { readyTimeoutMs: 45_000 });
      const perceived = Date.now() - t0;
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
      return { perceived, fully: Date.now() - t0 };
    });

    for (let i = 0; i < WARMUPS; i++) {
      await page.goto('/');
      await expect(dashboardReadyLocator(page)).toBeVisible({ timeout: 30_000 });
    }

    for (let i = 0; i < REPEATS; i++) {
      await measureOnce(page, 'dashboard_ready_warm_nav', async () => {
        const t0 = Date.now();
        await page.goto('/');
        await expect(dashboardReadyLocator(page)).toBeVisible({ timeout: 30_000 });
        const perceived = Date.now() - t0;
        await page.waitForTimeout(300);
        return { perceived, fully: Date.now() - t0 };
      });
    }

    for (let i = 0; i < REPEATS; i++) {
      await measureOnce(page, 'open_blank_character_editor', async () => {
        const t0 = Date.now();
        await openBlankCharacterEditorSoft(page);
        const perceived = Date.now() - t0;
        const placeholder = page.getByText(/Kein 3D-Modell/i);
        const canvas = page.locator('canvas').first();
        const hasCanvas = await canvas.isVisible().catch(() => false);
        const noModel = await placeholder.isVisible().catch(() => false);
        if (hasCanvas) await page.waitForTimeout(1200);
        else await page.waitForTimeout(400);
        return {
          perceived,
          fully: Date.now() - t0,
          notes: hasCanvas ? 'canvas_visible' : noModel ? 'no_3d_placeholder' : 'unknown_preview',
        };
      });
      await page.goto('/');
      await expect(dashboardReadyLocator(page)).toBeVisible({ timeout: 30_000 });
    }

    await openBlankCharacterEditorSoft(page);

    // Select gender so species template may start loading 3D (product path).
    await measureOnce(page, 'editor_select_gender_female', async () => {
      const t0 = Date.now();
      await page.getByRole('combobox', { name: /Geschlecht wählen/i }).click();
      await page.getByRole('option', { name: /Weiblich/i }).click();
      const perceived = Date.now() - t0;
      await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 60_000 }).catch(() => undefined);
      await page.waitForTimeout(2000);
      const hasCanvas = await page.locator('canvas').first().isVisible().catch(() => false);
      return {
        perceived,
        fully: Date.now() - t0,
        notes: hasCanvas ? 'canvas_after_gender' : 'still_no_canvas',
      };
    });

    for (const tab of ['Charakter', 'Look', 'Inventar', 'Spezies'] as const) {
      for (let i = 0; i < REPEATS; i++) {
        await measureOnce(page, `editor_tab_${tab.toLowerCase()}`, async () => {
          const t0 = Date.now();
          await page.getByRole('tab', { name: new RegExp(tab, 'i') }).first().click();
          await expect(page.getByRole('tab', { name: new RegExp(tab, 'i') }).first()).toHaveAttribute(
            'data-state',
            'active',
            { timeout: 15_000 },
          );
          const perceived = Date.now() - t0;
          if (tab === 'Look') {
            await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined);
            await page.waitForTimeout(1000);
          } else {
            await page.waitForTimeout(200);
          }
          return { perceived, fully: Date.now() - t0 };
        });
      }
    }

    for (let i = 0; i < REPEATS; i++) {
      await measureOnce(page, 'open_library', async () => {
        const t0 = Date.now();
        await page.getByRole('button', { name: 'Bibliothek' }).first().click();
        await expect(page.getByRole('heading', { name: /Bibliothek/i }).first()).toBeVisible({
          timeout: 20_000,
        });
        const perceived = Date.now() - t0;
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
        return { perceived, fully: Date.now() - t0 };
      });
      await page.goto('/');
      await expect(dashboardReadyLocator(page)).toBeVisible({ timeout: 30_000 });
    }
  } finally {
    flushSamples();
  }
});
