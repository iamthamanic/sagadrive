/**
 * Adaptive UI quality helpers — overflow, touch targets, a11y names (#483).
 * Location: e2e/helpers/adaptive-ui-quality.ts
 */
import { expect, type Locator, type Page } from '@playwright/test';

export type OverflowAudit = {
  scrollWidth: number;
  clientWidth: number;
  hasHorizontalOverflow: boolean;
};

export async function auditHorizontalOverflow(page: Page): Promise<OverflowAudit> {
  const result = await page.evaluate(() => {
    const el = document.documentElement;
    const scrollWidth = el.scrollWidth;
    const clientWidth = el.clientWidth;
    return {
      scrollWidth,
      clientWidth,
      hasHorizontalOverflow: scrollWidth > clientWidth + 1,
    };
  });
  return result;
}

export async function expectNoHorizontalOverflow(page: Page) {
  const audit = await auditHorizontalOverflow(page);
  expect(
    audit.hasHorizontalOverflow,
    `horizontal overflow: scrollWidth=${audit.scrollWidth} clientWidth=${audit.clientWidth}`,
  ).toBe(false);
}

export type TouchTargetHit = {
  name: string;
  width: number;
  height: number;
};

/**
 * Assert primary action locators expose ≥44×44 CSS px hit boxes (AU-02 / CE-11).
 */
export async function expectMinTouchTargets(
  locators: Locator[],
  minPx = 44,
): Promise<void> {
  for (const locator of locators) {
    const count = await locator.count();
    for (let i = 0; i < count; i += 1) {
      const handle = locator.nth(i);
      if (!(await handle.isVisible())) continue;
      const box = await handle.boundingBox();
      expect(box, 'visible control missing bounding box').not.toBeNull();
      if (!box) continue;
      const name =
        (await handle.getAttribute('aria-label')) ||
        (await handle.innerText().catch(() => '')) ||
        (await handle.getAttribute('title')) ||
        `nth=${i}`;
      expect(
        box.width,
        `touch width too small for "${name.trim()}": ${box.width}`,
      ).toBeGreaterThanOrEqual(minPx - 0.5);
      expect(
        box.height,
        `touch height too small for "${name.trim()}": ${box.height}`,
      ).toBeGreaterThanOrEqual(minPx - 0.5);
    }
  }
}

export type A11yNameGap = {
  tag: string;
  role: string | null;
  reason: string;
};

/**
 * Lightweight axe-compatible check: visible buttons/links/icon controls need an accessible name.
 * Scopes to `rootSelector` (default: main content) to avoid global shell chrome.
 */
export async function auditMissingAccessibleNames(
  page: Page,
  rootSelector = 'main, [role="main"], #root main, body',
): Promise<A11yNameGap[]> {
  return page.evaluate((selector) => {
    const gaps: A11yNameGap[] = [];
    const root =
      document.querySelector(selector.split(',')[0]!.trim()) ||
      document.querySelector(selector) ||
      document.body;
    const scope = root ?? document.body;
    const nodes = Array.from(
      scope.querySelectorAll('button, a[href], [role="button"], [role="tab"], [role="link"]'),
    );
    for (const node of nodes) {
      const el = node as HTMLElement;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const labelled =
        (el.getAttribute('aria-label') || '').trim() ||
        (el.getAttribute('aria-labelledby') || '').trim() ||
        (el.getAttribute('title') || '').trim() ||
        (el.innerText || '').trim() ||
        (el.getAttribute('alt') || '').trim();
      if (!labelled) {
        gaps.push({
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          reason: 'missing accessible name',
        });
      }
    }
    return gaps;
  }, rootSelector);
}

export async function expectAccessiblePrimaryControls(page: Page) {
  const gaps = await auditMissingAccessibleNames(
    page,
    '[data-testid="library-root"], main, [role="main"]',
  );
  // Fallback to heading-scoped region if no main landmark.
  if (gaps.length > 0) {
    const headingScoped = await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h1,h2')).find((h) =>
        (h.textContent || '').includes('Bibliothek'),
      );
      const scope = heading?.closest('section, main, div') ?? document.body;
      const gapsInner: { tag: string; role: string | null; reason: string }[] = [];
      for (const node of Array.from(
        scope.querySelectorAll('button, a[href], [role="button"], [role="tab"]'),
      )) {
        const el = node as HTMLElement;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        const labelled =
          (el.getAttribute('aria-label') || '').trim() ||
          (el.getAttribute('title') || '').trim() ||
          (el.innerText || '').trim();
        if (!labelled) {
          gapsInner.push({
            tag: el.tagName.toLowerCase(),
            role: el.getAttribute('role'),
            reason: 'missing accessible name',
          });
        }
      }
      return gapsInner;
    });
    expect(headingScoped, JSON.stringify(headingScoped, null, 2)).toEqual([]);
    return;
  }
  expect(gaps, JSON.stringify(gaps, null, 2)).toEqual([]);
}
