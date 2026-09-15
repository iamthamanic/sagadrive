#!/usr/bin/env node
/**
 * vectorize-item-icons — optional local / CI VTracer batch for SagaDrive item icons.
 * Skips items that already have a valid SVG unless --force or manifest status=regenerate.
 * VTracer is optional locally; required when --require-vtracer is set (CI).
 * Location: scripts/vectorize-item-icons.mjs
 *
 * Usage:
 *   node scripts/vectorize-item-icons.mjs
 *   node scripts/vectorize-item-icons.mjs --force
 *   node scripts/vectorize-item-icons.mjs --slug iron-sword
 *   node scripts/vectorize-item-icons.mjs --require-vtracer
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, basename, extname } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { validateAndSanitizeItemIconSvg } from './lib/item-icon-svg.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SOURCE_DIR = 'assets/item-icon-sources';
const OUTPUT_DIR = 'public/assets/items';
const MANIFEST_PATH = 'assets/item-icons.manifest.json';

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

function runVtracer(bin, inputAbs, outputAbs) {
  mkdirSync(dirname(outputAbs), { recursive: true });
  // Flags verified against VTracer 1.0.0-alpha.4 CLI (`vtracer --help`).
  // Extra icon-oriented knobs: cutout hierarchy + speckle filter keep file sizes
  // reasonable for inventory thumbs (AI rasters otherwise emit huge stacked paths).
  const result = spawnSync(
    bin,
    [
      inputAbs,
      outputAbs,
      '--preset', 'poster',
      '--max-colors', '6',
      '--simplify', '2',
      '--optimize', '2',
      '--hierarchical', 'cutout',
      '--filter-speckle', '16',
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

  // Include manifest rows even if PNG missing (report), plus orphan PNGs.
  const slugs = [...new Set([
    ...manifest.map((e) => e.slug),
    ...pngSlugs,
  ])].filter((slug) => !onlySlug || slug === onlySlug);

  if (slugs.length === 0) {
    console.log('No item-icon PNG sources or manifest entries found.');
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

    try {
      runVtracer(bin, pngAbs, svgAbs);
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
