#!/usr/bin/env node
/**
 * vectorize-npc-creature-icons — optional local / CI VTracer batch for NPC/creature icons.
 * Skips entries that already have a valid SVG unless --force or manifest status=regenerate.
 * Reuses shared sanitize helpers from item-icon-svg.mjs.
 * Location: scripts/vectorize-npc-creature-icons.mjs
 *
 * Usage:
 *   node scripts/vectorize-npc-creature-icons.mjs
 *   node scripts/vectorize-npc-creature-icons.mjs --force
 *   node scripts/vectorize-npc-creature-icons.mjs --slug builtin-npc-fantasy-knight
 *   node scripts/vectorize-npc-creature-icons.mjs --require-vtracer
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, basename, extname } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

import { validateAndSanitizeItemIconSvg } from './lib/item-icon-svg.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SOURCE_DIR = 'assets/npc-creature-icon-sources';
const OUTPUT_DIR = 'public/assets/npc-creatures';
const MANIFEST_PATH = 'assets/npc-creature-icons.manifest.json';

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const requireVtracer = args.has('--require-vtracer');
const slugFlagIndex = process.argv.indexOf('--slug');
const onlySlug = slugFlagIndex >= 0 ? process.argv[slugFlagIndex + 1] : null;

function resolveVtracerBin() {
  const fromEnv = process.env.VTRACER_BIN?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const which = spawnSync('which', ['vtracer'], { encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
  const cached = join(root, '.cache/vtracer/vtracer');
  if (existsSync(cached)) return cached;
  return null;
}

function loadManifest() {
  const abs = join(root, MANIFEST_PATH);
  if (!existsSync(abs)) return [];
  const raw = JSON.parse(readFileSync(abs, 'utf8'));
  if (!Array.isArray(raw)) throw new Error(`${MANIFEST_PATH} must be an array`);
  return raw;
}

function writeManifest(entries) {
  writeFileSync(
    join(root, MANIFEST_PATH),
    `${JSON.stringify(entries, null, 2)}\n`,
    'utf8',
  );
}

function listSourcePngs() {
  const abs = join(root, SOURCE_DIR);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((name) => extname(name).toLowerCase() === '.png')
    .map((name) => basename(name, '.png'));
}

function shouldConvert(entry, svgAbs) {
  if (onlySlug && entry.slug !== onlySlug) return false;
  if (force || entry.status === 'regenerate') return true;
  if (!existsSync(svgAbs)) return true;
  const existing = readFileSync(svgAbs, 'utf8');
  const check = validateAndSanitizeItemIconSvg(existing);
  return !check.ok;
}

/**
 * Style PNGs often use a solid black field (pack parity) that may contain light
 * compression speckles. Kill those speckles, flood-fill near-black from the frame
 * edges to white, then let light-backdrop sanitize drop the plate — without eating
 * subject blacks (outlines / pupils).
 * @param {string} pngAbs
 * @returns {string} path to preprocess PNG (may equal pngAbs if unchanged / unavailable)
 */
function preprocessKnockOutBlackBg(pngAbs) {
  const outAbs = join(tmpdir(), `sagadrive-npc-icon-nobg-${basename(pngAbs)}`);
  const py = `
from PIL import Image, ImageDraw
import sys
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
px = im.load()
w, h = im.size

def lum(rgb):
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

# 1) Crush near-black to pure black so flood-fill has a clean field.
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        if r <= 38 and g <= 38 and b <= 38:
            px[x, y] = (0, 0, 0)

# 2) Kill light noise speckles sitting on dark surroundings (JPEG/gen artifacts).
for y in range(1, h - 1):
    for x in range(1, w - 1):
        if lum(px[x, y]) < 55:
            continue
        dark_n = 0
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                if lum(px[x + dx, y + dy]) < 42:
                    dark_n += 1
        if dark_n >= 6:
            px[x, y] = (0, 0, 0)

# 3) Flood-fill pure/near-black from every edge seed → white (transparent after sanitize).
changed = False
edge_seeds = []
for x in range(0, w, max(1, w // 64)):
    edge_seeds.append((x, 0))
    edge_seeds.append((x, h - 1))
for y in range(0, h, max(1, h // 64)):
    edge_seeds.append((0, y))
    edge_seeds.append((w - 1, y))
edge_seeds.extend([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
for xy in edge_seeds:
    if lum(px[xy]) <= 42:
        ImageDraw.floodfill(im, xy, (255, 255, 255), thresh=36)
        changed = True

im.save(dst)
print("changed" if changed else "unchanged")
`;
  const result = spawnSync('python3', ['-c', py, pngAbs, outAbs], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.warn(`black-bg preprocess skipped for ${basename(pngAbs)}: ${(result.stderr || '').trim()}`);
    return pngAbs;
  }
  if (!existsSync(outAbs)) return pngAbs;
  if ((result.stdout || '').includes('changed')) {
    console.log(`  preprocess: cleaned black field + knocked out backdrop`);
  }
  return outAbs;
}

function runVtracer(bin, inputAbs, outputAbs) {
  mkdirSync(dirname(outputAbs), { recursive: true });
  // max-colors 12 keeps facial features; filter-speckle 24 drops freistellung noise.
  const result = spawnSync(
    bin,
    [
      inputAbs,
      outputAbs,
      '--preset', 'poster',
      '--max-colors', '12',
      '--simplify', '1',
      '--optimize', '2',
      '--hierarchical', 'cutout',
      '--filter-speckle', '24',
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || '').trim();
    throw new Error(`vtracer failed for ${inputAbs}: ${err || `exit ${result.status}`}`);
  }
}

function main() {
  const bin = resolveVtracerBin();
  if (!bin) {
    const msg = [
      'VTracer CLI not found on PATH (and no .cache/vtracer/vtracer).',
      'Install optionally for local use, or rely on GitHub Actions:',
      '  https://github.com/visioncortex/vtracer/releases',
      '  cargo install vtracer-cli',
    ].join('\n');
    if (requireVtracer) {
      console.error(msg);
      process.exit(1);
    }
    console.warn(msg);
    console.warn('Skipping vectorization (local VTracer is optional).');
    process.exit(0);
  }

  console.log(`Using VTracer: ${bin}`);

  const manifest = loadManifest();
  const bySlug = new Map(manifest.map((e) => [e.slug, e]));
  const pngSlugs = listSourcePngs();

  const slugs = [...new Set([
    ...manifest.map((e) => e.slug),
    ...pngSlugs,
  ])].filter((slug) => !onlySlug || slug === onlySlug);

  if (slugs.length === 0) {
    console.log('No npc-creature-icon PNG sources or manifest entries found.');
    process.exit(0);
  }

  const converted = [];
  const skipped = [];
  const failed = [];

  for (const slug of slugs) {
    const entry = bySlug.get(slug) ?? {
      id: slug,
      slug,
      name: slug,
      iconPrompt: '',
      iconKey: slug,
      sourcePng: `${SOURCE_DIR}/${slug}.png`,
      outputSvg: `${OUTPUT_DIR}/${slug}.svg`,
      status: 'needs-png',
    };

    const pngAbs = join(root, entry.sourcePng || `${SOURCE_DIR}/${slug}.png`);
    const svgAbs = join(root, entry.outputSvg || `${OUTPUT_DIR}/${slug}.svg`);

    if (!existsSync(pngAbs)) {
      skipped.push(`${slug} (missing PNG)`);
      continue;
    }

    if (!shouldConvert(entry, svgAbs)) {
      skipped.push(`${slug} (valid SVG exists — not regenerating)`);
      continue;
    }

    let preprocessedAbs = null;
    try {
      preprocessedAbs = preprocessKnockOutBlackBg(pngAbs);
      runVtracer(bin, preprocessedAbs, svgAbs);
      const raw = readFileSync(svgAbs, 'utf8');
      const result = validateAndSanitizeItemIconSvg(raw);
      if (!result.ok) {
        throw new Error(result.errors.join('; '));
      }
      writeFileSync(svgAbs, result.svg, 'utf8');

      entry.status = 'ready';
      entry.sourcePng = entry.sourcePng || `${SOURCE_DIR}/${slug}.png`;
      entry.outputSvg = entry.outputSvg || `${OUTPUT_DIR}/${slug}.svg`;
      entry.iconKey = entry.iconKey || slug;
      bySlug.set(slug, entry);
      converted.push(slug);
      console.log(`OK  ${slug} → ${entry.outputSvg}`);
    } catch (err) {
      failed.push(`${slug}: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`FAIL ${slug}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (preprocessedAbs && preprocessedAbs !== pngAbs && existsSync(preprocessedAbs)) {
        try { unlinkSync(preprocessedAbs); } catch { /* ignore temp cleanup */ }
      }
    }
  }

  writeManifest([...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug)));

  console.log('');
  console.log(`Converted: ${converted.length}`);
  if (converted.length) console.log(`  ${converted.join(', ')}`);
  console.log(`Skipped:   ${skipped.length}`);
  if (skipped.length) skipped.forEach((s) => console.log(`  ${s}`));
  console.log(`Failed:    ${failed.length}`);
  if (failed.length) {
    failed.forEach((s) => console.log(`  ${s}`));
    process.exit(1);
  }
}

main();
