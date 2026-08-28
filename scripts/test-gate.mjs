import { execFileSync, spawnSync } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const gitOutputMaxBuffer = 32 * 1024 * 1024;

function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: gitOutputMaxBuffer,
  }).trim();
}

function hasRef(ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch {
    return false;
  }
}

function resolveDiffBase() {
  const baseRef = process.env.GITHUB_BASE_REF ?? '';
  const currentRef = process.env.GITHUB_REF_NAME ?? '';

  if (baseRef && hasRef(`origin/${baseRef}`)) {
    return git(['merge-base', 'HEAD', `origin/${baseRef}`]);
  }

  if (currentRef === 'main' && hasRef('HEAD^')) return 'HEAD^';
  if (hasRef('origin/main')) return git(['merge-base', 'HEAD', 'origin/main']);
  if (hasRef('main')) return git(['merge-base', 'HEAD', 'main']);
  if (hasRef('HEAD^')) return 'HEAD^';

  return undefined;
}

function changedDenoFunctionFiles() {
  const base = resolveDiffBase();
  if (!base) return [];

  const output = git([
    'diff',
    '--name-only',
    '--diff-filter=ACMR',
    `${base}..HEAD`,
    '--',
    'supabase/functions',
  ]);

  return output
    ? output.split('\n').filter((path) => path.endsWith('.ts'))
    : [];
}

function trackedDenoTestFiles() {
  const output = git(['ls-files', 'supabase/functions']);
  return output
    ? output.split('\n').filter((path) => path.endsWith('_test.ts'))
    : [];
}

function runDeno(args, label) {
  const result = spawnSync('deno', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`${label} could not start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`${label} failed.`);
    process.exit(result.status ?? 1);
  }
}

function checkChangedDenoFunctions() {
  const files = changedDenoFunctionFiles();
  if (files.length === 0) {
    console.log('Deno Edge Function check skipped (no changed TypeScript files).');
    return;
  }

  console.log(`Deno Edge Function check: ${files.length} changed TypeScript file(s).`);
  runDeno(['check', ...files], 'Deno Edge Function check');
  console.log('Deno Edge Function check passed.');

  const testFiles = trackedDenoTestFiles();
  if (testFiles.length === 0) {
    console.log('Deno Edge Function tests skipped (no tracked *_test.ts files).');
    return;
  }

  console.log(`Deno Edge Function tests: ${testFiles.length} test file(s).`);
  runDeno(['test', ...testFiles], 'Deno Edge Function tests');
  console.log('Deno Edge Function tests passed.');
}

function checkProjectMembershipSecurity() {
  console.log('Project membership security contract: checking RLS and client write paths...');
  execFileSync(process.execPath, ['scripts/project-membership-security-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkCharacterEditorRegressions() {
  console.log('Character editor regression contract: checking persistence, avatar replay, and legacy project status...');
  execFileSync(process.execPath, ['scripts/character-editor-regression-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarRuntimeRegressions() {
  console.log('Avatar runtime regression contract: checking VRM/GLB runtime, URL safety, portrait canvas, and dependencies...');
  execFileSync(process.execPath, ['scripts/avatar-runtime-regression-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarAssetCatalogRegressions() {
  console.log('Avatar asset catalog regression contract: checking race mappings, provenance, licenses, and pinned fallbacks...');
  execFileSync(process.execPath, ['scripts/avatar-asset-catalog-regression-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkDamageHealingDyingValidation() {
  console.log('Damage/healing/dying validation (#23): exact damage & dying curves...');
  execFileSync(process.execPath, ['scripts/validate-damage-healing-dying.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkCombatActionEconomyValidation() {
  console.log('Combat action economy validation (#22): deterministic C1 scenario play-through...');
  execFileSync(process.execPath, ['scripts/validate-combat-action-economy.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkCoreProbabilityValidation() {
  console.log('Core probability validation (#19): exact A1 matrix over the core probe...');
  execFileSync(process.execPath, ['scripts/validate-core-probability.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function scanAddedLinesForSecrets() {
  const base = resolveDiffBase();
  if (!base) {
    console.log('Secrets diff scan skipped (no diff base available).');
    return;
  }

  const diff = git(['diff', '--unified=0', `${base}..HEAD`, '--', '.']);
  const addedLines = diff
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));

  const secretPatterns = [
    { label: 'private key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
    { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
    { label: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
    { label: 'OpenAI-style secret', pattern: /\bsk-[A-Za-z0-9_-]{24,}\b/ },
  ];

  const findings = [];
  for (const line of addedLines) {
    for (const rule of secretPatterns) {
      if (rule.pattern.test(line)) findings.push(rule.label);
    }
  }

  if (findings.length > 0) {
    console.error(`Secrets diff scan failed: ${[...new Set(findings)].join(', ')}`);
    process.exit(1);
  }

  console.log('Secrets diff scan passed.');
}

function reportDependencyAudit() {
  const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const raw = result.stdout || result.stderr;
  if (!raw) {
    console.warn('Dependency audit unavailable; continuing because npmAudit is informational.');
    return;
  }

  try {
    const report = JSON.parse(raw);
    const vulnerabilities = report?.metadata?.vulnerabilities;
    if (!vulnerabilities || typeof vulnerabilities !== 'object') {
      console.warn('Dependency audit returned no vulnerability summary.');
      return;
    }

    const summary = ['critical', 'high', 'moderate', 'low']
      .map((level) => `${level}=${Number(vulnerabilities[level] ?? 0)}`)
      .join(', ');

    console.log(`Dependency audit (informational): ${summary}.`);
  } catch {
    console.warn('Dependency audit output could not be parsed; continuing as informational.');
  }
}

console.log('Test Gate: running project checks...');
execFileSync('npm', ['run', 'checks'], {
  cwd: root,
  stdio: 'inherit',
});

checkChangedDenoFunctions();
checkProjectMembershipSecurity();
checkCharacterEditorRegressions();
checkAvatarRuntimeRegressions();
checkAvatarAssetCatalogRegressions();
checkCoreProbabilityValidation();
checkCombatActionEconomyValidation();
checkDamageHealingDyingValidation();
scanAddedLinesForSecrets();
reportDependencyAudit();

console.log('Test Gate passed.');
