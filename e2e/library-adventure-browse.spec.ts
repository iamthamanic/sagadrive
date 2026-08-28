import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const EVIDENCE_DIR = '.qa/evidence/library-entity-browser';

type StoredProject = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  gm_user_id: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
};

type StoredMember = {
  id: string;
  project_id: string;
  user_id: string;
  character_id: string | null;
  role: 'gm' | 'player';
  status: 'active';
  joined_at: string;
};

const USER_ID = 'local-admin';

const MOCK_PROJECTS: StoredProject[] = [
  {
    id: 'proj-1',
    code: 'ABCD12',
    name: 'Das vergessene Königreich',
    description: 'Eine Kampagne um einen versunkenen Thron.',
    world_id: null,
    gm_user_id: USER_ID,
    status: 'active',
    created_at: '2026-08-28T10:00:00.000Z',
    updated_at: '2026-08-28T10:00:00.000Z',
  },
  {
    id: 'proj-2',
    code: 'EFGH34',
    name: 'Schatten über Nehren',
    description: null,
    world_id: null,
    gm_user_id: 'other-user',
    status: 'paused',
    created_at: '2026-08-28T09:00:00.000Z',
    updated_at: '2026-08-28T09:00:00.000Z',
  },
];

const MOCK_MEMBERS: Record<string, StoredMember[]> = {
  'proj-1': [
    { id: 'm-1', project_id: 'proj-1', user_id: USER_ID, character_id: null, role: 'gm', status: 'active', joined_at: '2026-08-28T10:00:00.000Z' },
    { id: 'm-2', project_id: 'proj-1', user_id: 'player-1', character_id: 'char-1', role: 'player', status: 'active', joined_at: '2026-08-28T10:05:00.000Z' },
  ],
  'proj-2': [
    { id: 'm-3', project_id: 'proj-2', user_id: 'player-1', character_id: 'char-1', role: 'player', status: 'active', joined_at: '2026-08-28T09:05:00.000Z' },
  ],
};

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

function json(route: Route, value: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(value),
  });
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test('library adventures tab lists real projects with meta chips', async ({ page }) => {
  test.setTimeout(60_000);

  await page.route('**/rest/v1/projects*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, MOCK_PROJECTS);
  });

  await page.route('**/rest/v1/project_members*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, Object.values(MOCK_MEMBERS).flat());
  });

  await page.route('**/rest/v1/sessions*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, []);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);

  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: 'Meine Bibliothek' })).toBeVisible();

  await page.getByRole('tab', { name: 'Abenteuer' }).first().click();
  await expect(page.getByText('2 Abenteuer').first()).toBeVisible();

  await expect(page.getByText('Das vergessene Königreich').first()).toBeVisible();
  await expect(page.getByText('Schatten über Nehren').first()).toBeVisible();
  await expect(page.getByText('Aktiv').first()).toBeVisible();
  await expect(page.getByText('Pausiert').first()).toBeVisible();
  await expect(page.getByText('Code: ABCD12').first()).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '04-adventures-list-view.png'), fullPage: true });
});

test('library adventures empty state offers join CTA', async ({ page }) => {
  test.setTimeout(60_000);

  await page.route('**/rest/v1/projects*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, []);
  });

  await page.route('**/rest/v1/project_members*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, []);
  });

  await page.route('**/rest/v1/sessions*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await json(route, []);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureLoggedIn(page);

  await page.getByRole('button', { name: 'Bibliothek' }).first().click();
  await expect(page.getByRole('heading', { name: 'Meine Bibliothek' })).toBeVisible();

  await page.getByRole('tab', { name: 'Abenteuer' }).first().click();
  await expect(page.getByText('Noch keine Abenteuer gestartet').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Projekt starten' }).first()).toBeVisible();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '05-adventures-empty.png'), fullPage: true });
});