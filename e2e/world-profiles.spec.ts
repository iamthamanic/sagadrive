import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = '.qa/evidence/world-profiles-modules';
const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const CHARACTER_ID = '22222222-2222-4222-8222-222222222222';
const WORLD_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '55555555-5555-4555-8555-555555555555';
const AUTH_STORAGE_KEY = 'sb-dnhotyjazjnhneqbqocq-auth-token';
const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTU1NTU1NS01NTU1LTQ1NTUtODU1NS01NTU1NTU1NTU1NTUiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MjAwMDAwMDAwMH0.test';

interface StoredWorld {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  modules: Record<string, Record<string, unknown>>;
  created_at: string;
  updated_at: string;
}

interface StoredProject {
  id: string;
  code: string;
  name: string;
  description: string | null;
  world_id: string | null;
  world_profile_id: string | null;
  gm_user_id: string;
  status: 'active';
  created_at: string;
  updated_at: string;
}

const membership = {
  id: '44444444-4444-4444-8444-444444444444',
  project_id: PROJECT_ID,
  user_id: USER_ID,
  character_id: CHARACTER_ID,
  role: 'gm',
  joined_at: '2026-08-27T10:00:00.000Z',
  status: 'active',
};

function json(route: Route, value: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
}

async function seedAuthenticatedUser(page: Page) {
  const user = {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'world-test@sagadrive.local',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: '2026-08-27T10:00:00.000Z',
    is_anonymous: false,
  };

  await page.route('**/auth/v1/user', async (route) => {
    await json(route, user);
  });

  await page.addInitScript(({ storageKey, accessToken, sessionUser }) => {
    window.localStorage.removeItem('sagadrive-local-admin-session');
    window.localStorage.setItem(storageKey, JSON.stringify({
      access_token: accessToken,
      refresh_token: 'test-refresh-token',
      expires_at: 2_000_000_000,
      expires_in: 3600,
      token_type: 'bearer',
      user: sessionUser,
    }));
  }, { storageKey: AUTH_STORAGE_KEY, accessToken: ACCESS_TOKEN, sessionUser: user });
}

async function ensureLoggedIn(page: Page) {
  await page.goto('/');
  const loginTab = page.getByRole('tab', { name: 'Login' });
  if (await loginTab.count()) {
    await page.getByPlaceholder('admin oder deine@email.de').fill('admin');
    await page.getByPlaceholder('••••••••').fill('1234');
    await page.getByRole('button', { name: 'Einloggen' }).click();
  }
  await expect(page.getByRole('button', { name: 'Dashboard' }).first()).toBeVisible({ timeout: 15_000 });
}

function wantsSingle(route: Route): boolean {
  return (route.request().headers().accept ?? '').includes('application/vnd.pgrst.object+json');
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('world profiles compose through adventure and character participation', async ({ page }) => {
  test.setTimeout(90_000);
  const worlds: StoredWorld[] = [];
  const project: StoredProject = {
    id: PROJECT_ID,
    code: 'ABC123',
    name: 'Nebelpfad',
    description: 'Ein Testabenteuer ohne anfänglich zugewiesene Regelwelt.',
    world_id: null,
    world_profile_id: null,
    gm_user_id: USER_ID,
    status: 'active',
    created_at: '2026-08-27T10:00:00.000Z',
    updated_at: '2026-08-27T10:00:00.000Z',
  };

  await page.route('**/rest/v1/world_profiles*', async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === 'GET') {
      if (wantsSingle(route)) {
        const selected = worlds.find((world) => request.url().includes(encodeURIComponent(world.id))) ?? worlds[0];
        await json(route, selected ?? null, selected ? 200 : 404);
        return;
      }
      await json(route, worlds);
      return;
    }
    if (method === 'POST') {
      const body = request.postDataJSON() as Partial<StoredWorld>;
      const now = new Date().toISOString();
      const world: StoredWorld = {
        id: WORLD_ID,
        owner_user_id: String(body.owner_user_id ?? USER_ID),
        name: String(body.name ?? ''),
        description: typeof body.description === 'string' ? body.description : null,
        modules: body.modules ?? {},
        created_at: now,
        updated_at: now,
      };
      worlds.unshift(world);
      await json(route, world, 201);
      return;
    }
    if (method === 'PATCH') {
      const body = request.postDataJSON() as Partial<StoredWorld>;
      const current = worlds[0];
      if (!current) {
        await json(route, { message: 'Not found' }, 404);
        return;
      }
      Object.assign(current, body, { updated_at: new Date().toISOString() });
      await json(route, current);
      return;
    }
    if (method === 'DELETE') {
      worlds.splice(0, worlds.length);
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fallback();
  });

  await page.route('**/rest/v1/projects*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, wantsSingle(route) ? project : [project]);
  });

  await page.route('**/rest/v1/project_members*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const url = route.request().url();
    if (url.includes('projects%21inner') || url.includes('projects!inner')) {
      await json(route, [{ ...membership, projects: project }]);
      return;
    }
    await json(route, wantsSingle(route) ? membership : [membership]);
  });

  await page.route('**/rest/v1/sessions*', async (route) => {
    await json(route, []);
  });

  await page.route('**/rest/v1/rpc/set_project_world_profile', async (route) => {
    const body = route.request().postDataJSON() as { p_world_profile_id?: string };
    project.world_profile_id = body.p_world_profile_id ?? null;
    project.updated_at = new Date().toISOString();
    await json(route, PROJECT_ID);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await seedAuthenticatedUser(page);
  await ensureLoggedIn(page);
  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: 'Meine Bibliothek' })).toBeVisible();
  await page.getByRole('tab', { name: 'Welten' }).click();

  await expect(page.getByText('Noch keine Welten erstellt')).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-library-worlds-tab.png'), fullPage: true });

  await page.getByRole('button', { name: 'Neue Welt' }).click();
  await expect(page.getByRole('heading', { name: 'Neue Welt' })).toBeVisible();
  await expect(page.getByText('Speziesentwicklung').first()).toBeVisible();
  const modeSelect = page.getByRole('combobox', { name: 'Speziesentwicklung: Verfügbarkeit' });
  await expect(modeSelect).toHaveText(/Explizit/);
  await expect(page.getByText(/Normales Level-up vergibt keine Speziespunkte/i)).toBeVisible();

  await page.getByLabel('Name *').fill('Nebelarchipel');
  await page.getByLabel('Beschreibung').fill('Eine modulare Testwelt für SagaDrive.');
  await modeSelect.click();
  await page.getByRole('option', { name: 'Progressiv' }).click();
  await expect(page.getByText(/regulär erwerbbare Speziesentwicklungen/i)).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-world-editor-species-development.png'), fullPage: true });
  await page.getByRole('button', { name: 'Welt erstellen' }).click();

  await expect(page.getByText('Nebelarchipel')).toBeVisible();
  await expect(page.getByText(/Speziesentwicklung:/).first()).toContainText('Progressiv');

  await page.getByRole('tab', { name: 'Abenteuer' }).click();
  await expect(page.getByText('Nebelpfad')).toBeVisible();
  await expect(page.getByText(/Noch nicht zugewiesen/).first()).toBeVisible();
  const adventureWorldSelect = page.getByRole('combobox', { name: 'Nebelpfad: Weltprofil' });
  await adventureWorldSelect.click();
  await page.getByRole('option', { name: 'Nebelarchipel' }).click();

  await expect(page.getByText(/Welt:/).first().locator('..')).toContainText('Nebelarchipel');
  await expect(page.getByText(/Effektive Weltregel · Speziesentwicklung:/)).toContainText('Progressiv');
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-adventure-effective-world.png'), fullPage: true });

  await page.getByRole('tab', { name: 'Welten' }).click();
  await page.getByRole('button', { name: 'Bearbeiten' }).last().click();
  await expect(page.getByRole('heading', { name: 'Welt bearbeiten' })).toBeVisible();
  await expect(page.getByLabel('Name *')).toHaveValue('Nebelarchipel');
  await expect(page.getByRole('combobox', { name: 'Speziesentwicklung: Verfügbarkeit' })).toHaveText(/Progressiv/);
  await page.getByRole('button', { name: 'Abbrechen' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Abenteuer' }).click();
  await expect(page.getByText(/Effektive Weltregel · Speziesentwicklung:/)).toContainText('Progressiv');
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '04-adventure-effective-world-mobile.png'), fullPage: true });
});
