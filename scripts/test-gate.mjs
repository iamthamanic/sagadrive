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

function checkCharacterPresetsRegressions() {
  console.log('Character presets regression contract: checking create chooser, settings Preset tab, and RLS migration...');
  execFileSync(process.execPath, ['scripts/character-presets-regression-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkInventoryV2Domain() {
  console.log('Inventory v2 domain contract (#106): checking slots, stacks, containers, equipment, and quick access...');
  execFileSync(process.execPath, ['scripts/inventory-v2-domain-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkInventoryCatalog() {
  console.log('Inventory v2 catalog contract (#107): checking world-profile resolution, scope isolation, archive semantics, and RLS...');
  execFileSync(process.execPath, ['scripts/inventory-catalog-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkInventoryCoreCatalog() {
  console.log('Inventory v2 Core catalog contract (#108): checking 35 stable definitions, schema, and type coverage...');
  execFileSync(process.execPath, ['scripts/inventory-core-catalog-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkInventoryLegacyMigration() {
  console.log('Inventory v2 legacy migration contract (#109): checking lossless ItemDto[] → v2 migration...');
  execFileSync(process.execPath, ['scripts/inventory-legacy-migration-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkInventoryDesktopUi() {
  console.log('Inventory v2 desktop UI contract (#110): checking grid, catalog wiring, and CharacterEditor inventory_v2...');
  execFileSync(process.execPath, ['scripts/inventory-desktop-ui-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkInventoryWorldCatalogUi() {
  console.log('Inventory v2 World catalog authoring UI (#112): checking World editor section, form mode, and scope badges...');
  execFileSync(process.execPath, ['scripts/inventory-world-catalog-ui-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkInventoryEquipmentUi() {
  console.log('Inventory v2 equipment UI contract (#111): checking Ausrüstung, containers, and Schnellzugriff...');
  execFileSync(process.execPath, ['scripts/inventory-equipment-ui-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkBackgroundFrameworkRegressions() {
  console.log('Background framework regression contract: checking universal catalog and legacy IDs...');
  execFileSync(process.execPath, ['scripts/background-framework-regression-check.mjs'], {
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

function checkWorldProfilesValidation() {
  console.log('World profiles validation (#30): deterministic §4.7/§16 audit...');
  execFileSync(process.execPath, ['scripts/validate-world-profiles-modules.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkDriveMomentumValidation() {
  console.log('Drive/momentum validation (#26): deterministic §2.10–2.12/§16.3 audit...');
  execFileSync(process.execPath, ['scripts/validate-drive-momentum.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkPowersEssencesValidation() {
  console.log('Powers/essences validation (#25): deterministic §12 power model audit...');
  execFileSync(process.execPath, ['scripts/validate-powers-essences-ranks.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkCharacterCreationValidation() {
  console.log('Character creation validation (#20): deterministic §17/§13 build audit...');
  execFileSync(process.execPath, ['scripts/validate-character-creation-progression.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkEnemyEncounterBossValidation() {
  console.log('Enemy/encounter/boss validation (#24): seeded C4 encounter simulation...');
  execFileSync(process.execPath, ['scripts/validate-enemy-encounter-boss-balance.mjs'], {
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

function checkArchitectureBoundaries() {
  console.log('Architecture boundary check (#94): layer and slice import rules...');
  execFileSync(process.execPath, ['scripts/architecture-boundary-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
  execFileSync(process.execPath, ['scripts/architecture-boundary-check.self-test.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

console.log('Test Gate: running project checks...');
execFileSync('npm', ['run', 'checks'], {
  cwd: root,
  stdio: 'inherit',
});

checkChangedDenoFunctions();
checkArchitectureBoundaries();
checkProjectMembershipSecurity();
checkCharacterEditorRegressions();
checkCharacterPresetsRegressions();
checkInventoryV2Domain();
checkInventoryCatalog();
checkInventoryCoreCatalog();
checkInventoryLegacyMigration();
checkInventoryDesktopUi();
<<<<<<< HEAD
checkInventoryWorldCatalogUi();
=======
checkInventoryEquipmentUi();
>>>>>>> f8b1fe2 (feat(inventory): equipment panel, containers & quick-access UX (#111))
checkBackgroundFrameworkRegressions();
checkAvatarRuntimeRegressions();
checkAvatarAssetCatalogRegressions();
checkCoreProbabilityValidation();
checkCombatActionEconomyValidation();
checkDamageHealingDyingValidation();
checkEnemyEncounterBossValidation();
checkCharacterCreationValidation();
checkPowersEssencesValidation();
checkDriveMomentumValidation();
checkWorldProfilesValidation();
scanAddedLinesForSecrets();
reportDependencyAudit();

console.log('Test Gate passed.');
