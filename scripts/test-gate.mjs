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


function checkPlayerTestSessionSecurity() {
  console.log('Player-test session security (#296): checking RPCs, no hosted join, lifecycle domain...');
  execFileSync(process.execPath, ['scripts/player-test-session-security-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkPlayerTestRealtimeRuntime() {
  console.log('Player-test realtime runtime (#297): checking revision, events, snapshot+subscribe...');
  execFileSync(process.execPath, ['scripts/player-test-realtime-runtime-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkPlayerTestPlayerPanel() {
  console.log('Player-test player panel V1 (#298): checking panel domain, wiring, no CharacterEditor...');
  execFileSync(process.execPath, ['scripts/player-test-player-panel-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkPlayerTestSharedRolls() {
  console.log('Player-test shared rolls (#299): checking rules kernel probe + authoritative roll RPC...');
  execFileSync(process.execPath, ['scripts/player-test-shared-rolls-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkPlayerTestSharedScenePresentation() {
  console.log('Player-test shared scene presentation (#301): checking presentation contract + GM publish path...');
  execFileSync(process.execPath, ['scripts/player-test-shared-scene-presentation-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkPlayerTestPreparedAdventureFixture() {
  console.log('Player-test prepared adventure fixture (#302): checking fixture + SessionJoin + world_profile_id...');
  execFileSync(process.execPath, ['scripts/player-test-prepared-adventure-fixture-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkPlayerTestCombatEncounter() {
  console.log('Player-test combat encounter V1 (#300): checking encounter contract + authoritative combat RPC...');
  execFileSync(process.execPath, ['scripts/player-test-combat-encounter-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkPlayerTestMultiuserE2eSecurity() {
  console.log('Player-test multi-user E2E + security (#303): Phase 8 checklist + failure classification...');
  execFileSync(process.execPath, ['scripts/player-test-multiuser-e2e-security-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkPlayerTestInstrumentationRunbook() {
  console.log('Player-test instrumentation & runbook (#304): Phase 9–10 evidence pack + metrics contract...');
  execFileSync(process.execPath, ['scripts/player-test-instrumentation-runbook-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
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
  console.log('Inventory v2 Core catalog contract: checking 36 stable definitions, schema, and type coverage...');
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
  console.log('Inventory v2 equipment UI contract (#111): checking Ausrüstung and containers...');
  execFileSync(process.execPath, ['scripts/inventory-equipment-ui-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkInventoryMobileUi() {
  console.log('Inventory v2 mobile UX contract (#113): checking Inventar|Ausrüstung segment, grid, and touch targets...');
  execFileSync(process.execPath, ['scripts/inventory-mobile-ui-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkInventoryE2eIntegration() {
  console.log('Inventory v2 E2E integration (#114): child gates, architecture, docs sync, catalog size, inventory_v2 save...');
  execFileSync(process.execPath, ['scripts/inventory-e2e-integration-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemRoutingFoundation() {
  console.log('Item Epic routing foundation (#133): History paths, placeholders, no parallel currentView...');
  execFileSync(process.execPath, ['scripts/item-routing-foundation-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkSagaRoutingPublicIdFoundation() {
  console.log('Saga routing + Public ID foundation (#276): IDs, deep links, live role rules...');
  execFileSync(process.execPath, ['scripts/saga-routing-public-id-foundation-check.mjs'], {
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

function checkAvatarTraitLifecycle() {
  console.log('Avatar trait lifecycle (#13): pure core contracts + dispose/stale-load guards...');
  execFileSync(process.execPath, ['scripts/avatar-trait-lifecycle-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarModularTraits() {
  console.log('Avatar modular traits (#4): base/overlay resolve + card picker + allowlist...');
  execFileSync(process.execPath, ['scripts/avatar-modular-traits-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarCustomImport() {
  console.log('Avatar custom VRM/GLB import (#5): validation + owner storage + UI states...');
  execFileSync(process.execPath, ['scripts/avatar-custom-import-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarRigNormalization() {
  console.log('Avatar rig normalization (#6): humanoid contract + aliases + analyzer...');
  execFileSync(process.execPath, ['scripts/avatar-rig-normalization-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarMorphContract() {
  console.log('Avatar morph contract (#212): SagaDriveAvatarMorphV1 bounds + migration...');
  execFileSync(process.execPath, ['scripts/avatar-morph-contract-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarBaseBodies() {
  console.log('Avatar base bodies (#213): morphable humanoid manifest + species presets...');
  execFileSync(process.execPath, ['scripts/avatar-base-bodies-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarMtoonProfile() {
  console.log('Avatar MToon profile (#214): SagaDriveMToonProfileV1 + style applier...');
  execFileSync(process.execPath, ['scripts/avatar-mtoon-profile-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarBodyFaceEditor() {
  console.log('Avatar body/face editor (#215): morph UI + live apply...');
  execFileSync(process.execPath, ['scripts/avatar-body-face-editor-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarFitRange() {
  console.log('Avatar fit range (#216): AvatarFitRangeV1 compatibility...');
  execFileSync(process.execPath, ['scripts/avatar-fit-range-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarSaveExport() {
  console.log('Avatar save export (#7): materialized GLB on Character Save...');
  execFileSync(process.execPath, ['scripts/avatar-save-export-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarAnimationRetarget() {
  console.log('Avatar animation retarget (#8): Idle/Walk/Combat/Emote via humanoid rig...');
  execFileSync(process.execPath, ['scripts/avatar-animation-retarget-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarFacialExpressions() {
  console.log('Avatar facial expressions (#11): blink/emotion/viseme VRM API...');
  execFileSync(process.execPath, ['scripts/avatar-facial-expressions-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarFaceTracking() {
  console.log('Avatar face tracking (#12): local MediaPipe head/eyes/expressions...');
  execFileSync(process.execPath, ['scripts/avatar-face-tracking-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActCore() {
  console.log('LiveAct core (#329): provider-neutral contract + engine...');
  execFileSync(process.execPath, ['scripts/liveact-core-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActViewportUi() {
  console.log('LiveAct viewport UI (#330): permanent gear + camera PiP...');
  execFileSync(process.execPath, ['scripts/liveact-viewport-ui-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceDiagnostics() {
  console.log('LiveAct face diagnostics (#331): overlay + neutral calibration...');
  execFileSync(process.execPath, ['scripts/liveact-face-diagnostics-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActDiagnosticsV2() {
  console.log('LiveAct diagnostics V2 (#397): RAW→APPLIED stage trace...');
  execFileSync(process.execPath, ['scripts/liveact-diagnostics-v2-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceAnchorsV1() {
  console.log('LiveAct face anchors V1 (#399): SagaDriveFaceAnchorsV1 mesh bindings...');
  execFileSync(process.execPath, ['scripts/liveact-face-anchors-v1-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceMappingAuthoring() {
  console.log('LiveAct face mapping authoring (#419): sidecar cache-bust + provenance...');
  execFileSync(process.execPath, ['scripts/liveact-face-mapping-authoring-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceMappingManual() {
  console.log('LiveAct face mapping manual (#420): Face Setup 21 markers + raycast...');
  execFileSync(process.execPath, ['scripts/liveact-face-mapping-manual-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceAnchorsCharacterPersist() {
  console.log('LiveAct face anchors character persist: avatar.face_anchors + override...');
  execFileSync(process.execPath, ['scripts/liveact-face-anchors-character-persist-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActExpandDriveBind() {
  console.log('LiveAct expand drive bind: Setup modal XOR card bindOutput...');
  execFileSync(process.execPath, ['scripts/liveact-expand-drive-bind-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActReferenceVrmGoldenAvatar() {
  console.log('LiveAct Golden Reference VRM (ARKit52) diagnostic path...');
  execFileSync(process.execPath, ['scripts/liveact-reference-vrm-golden-avatar-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFidelity() {
  console.log('LiveAct fidelity: calibration once + range gains, idle ownership, teeth binds...');
  execFileSync(process.execPath, ['scripts/liveact-fidelity-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceMappingVisualGuides() {
  console.log(
    'LiveAct face mapping visual guides: binding labels + smooth guides + pulse/detail...',
  );
  execFileSync(process.execPath, ['scripts/liveact-face-mapping-visual-guides-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceAnchorAnatomy() {
  console.log('LiveAct face anchor anatomy QA: SagaDriveFaceAnchorAnatomyQaV1...');
  execFileSync(process.execPath, ['scripts/liveact-face-anchor-anatomy-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActCameraOverlayMetrics() {
  console.log('LiveAct camera overlay metrics (#398): object-cover + HUD...');
  execFileSync(process.execPath, ['scripts/liveact-camera-overlay-metrics-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActCharacterFaceOverlay() {
  console.log('LiveAct character face overlay (#400): deformed mesh anchors...');
  execFileSync(process.execPath, ['scripts/liveact-character-face-overlay-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActAvatarOutput() {
  console.log('LiveAct avatar output (#332): VRM/GLB atomic frame apply...');
  execFileSync(process.execPath, ['scripts/liveact-avatar-output-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActCapabilityOwnership() {
  console.log('LiveAct capability ownership (#381): Input vs Avatar compose...');
  execFileSync(process.execPath, ['scripts/liveact-capability-ownership-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceAssetContract() {
  console.log('LiveAct face asset contract (#382): core-v1 / full-v1 / gazeMode...');
  execFileSync(process.execPath, ['scripts/liveact-face-asset-contract-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceAssetValidator() {
  console.log('LiveAct face asset validator (#383): Khronos + SagaDrive gate...');
  execFileSync(process.execPath, ['scripts/liveact-face-asset-validator-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceSemanticValidator() {
  console.log('LiveAct semantic face morph validator (#401): region/side/combination QA...');
  execFileSync(process.execPath, ['scripts/liveact-face-semantic-validator-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceAuthoringQtmesh() {
  console.log('LiveAct face authoring qtmesh adapter (#384): fake CLI + report gates...');
  execFileSync(process.execPath, ['scripts/liveact-face-authoring-qtmesh-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActRetargetProfile() {
  console.log('LiveAct retarget profile (#385): gain/deadZone domain + engine wiring...');
  execFileSync(process.execPath, ['scripts/liveact-retarget-profile-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFacialFidelityV2() {
  console.log('LiveAct facial fidelity V2 (#403): exclusive gaze + channel table...');
  execFileSync(process.execPath, ['scripts/liveact-facial-fidelity-v2-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarVrmPack() {
  console.log('Avatar VRM pack (#404): deterministic VRM 1.0 packaging...');
  execFileSync(process.execPath, ['scripts/avatar-vrm-pack-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceFidelityE2E() {
  console.log('LiveAct face fidelity E2E (#406): aggregate VRM runtime gate...');
  execFileSync(process.execPath, ['scripts/liveact-face-fidelity-e2e-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFacePipelineDocs() {
  console.log('LiveAct face pipeline docs (#386): AUTHORING v1.1 + FACE-AUTHORING...');
  execFileSync(process.execPath, ['scripts/liveact-face-pipeline-doc-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActFaceHumanRepro() {
  console.log('LiveAct face human repro (#387): m5+f5 core-v1 public assets...');
  execFileSync(process.execPath, ['scripts/liveact-face-human-repro-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActRigDebug() {
  console.log('LiveAct rig debug (#333): SkeletonHelper + capability inspector...');
  execFileSync(process.execPath, ['scripts/liveact-rig-debug-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActSurfaceMigration() {
  console.log('LiveAct surface migration (#334): editor/player/session shared engine...');
  execFileSync(process.execPath, ['scripts/liveact-surface-migration-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkLiveActHardening() {
  console.log('LiveAct hardening (#335): backpressure, privacy, races, E2E contract...');
  execFileSync(process.execPath, ['scripts/liveact-hardening-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2CompositionContract() {
  console.log('Avatar V2 composition contract (#249): orthogonal axes + legacy mapping...');
  execFileSync(process.execPath, ['scripts/avatar-v2-composition-contract-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2ModularGlbContract() {
  console.log('Avatar V2 modular GLB contract (#250): extras.sagadrive roles/slots...');
  execFileSync(process.execPath, ['scripts/avatar-v2-modular-glb-contract-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2ArtifactPipeline() {
  console.log('Avatar V2 artifact pipeline (#251): source-neutral materialization...');
  execFileSync(process.execPath, ['scripts/avatar-v2-artifact-pipeline-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2StructureAnalyzer() {
  console.log('Avatar V2 structure analyzer (#252): anatomy/modularity evidence...');
  execFileSync(process.execPath, ['scripts/avatar-v2-structure-analyzer-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2BodyProfile() {
  console.log('Avatar V2 body profile (#253): standard/compact/heavy compatibility...');
  execFileSync(process.execPath, ['scripts/avatar-v2-body-profile-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2AssetAuthoring() {
  console.log('Avatar V2 asset authoring (#254): provider-neutral publish workflow...');
  execFileSync(process.execPath, ['scripts/avatar-v2-asset-authoring-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2CanonicalBodyFamilies() {
  console.log('Avatar V2 canonical body families (#255): standard/compact/heavy...');
  execFileSync(process.execPath, ['scripts/avatar-v2-canonical-body-families-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2SpeciesTemplatePack() {
  console.log('Avatar V2 species template pack (#256): seven species on families...');
  execFileSync(process.execPath, ['scripts/avatar-v2-species-template-pack-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2StarterWardrobe() {
  console.log('Avatar V2 starter wardrobe (#257): 6 wearables × 3 family fits...');
  execFileSync(process.execPath, ['scripts/avatar-v2-starter-wardrobe-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2SkinnedWearableRuntime() {
  console.log('Avatar V2 skinned wearable runtime (#258): family fit + rebind + masks...');
  execFileSync(process.execPath, ['scripts/avatar-v2-skinned-wearable-runtime-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2CapabilityEditor() {
  console.log('Avatar V2 capability editor (#259): surfaces from capabilities not source...');
  execFileSync(process.execPath, ['scripts/avatar-v2-capability-editor-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2TemplateCreatorFlow() {
  console.log('Avatar V2 template creator flow (#260): Vorlage anpassen vertical slice...');
  execFileSync(process.execPath, ['scripts/avatar-v2-template-creator-flow-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkSpeciesTemplateGenderModelPreview() {
  console.log('Species template gender model preview: Mensch m/w GLB wiring...');
  execFileSync(process.execPath, ['scripts/species-template-gender-model-preview-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2ImportOriginalFlow() {
  console.log('Avatar V2 import original flow (#261): Analyse + Original behalten...');
  execFileSync(process.execPath, ['scripts/avatar-v2-import-original-flow-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2IdentityTransferSpike() {
  console.log('Avatar V2 identity transfer spike (#262): default + degraded conversion plan...');
  execFileSync(process.execPath, ['scripts/avatar-v2-identity-transfer-spike-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2BodyConversionFlow() {
  console.log('Avatar V2 body conversion flow (#263): Standard/Compact/Heavy transfer...');
  execFileSync(process.execPath, ['scripts/avatar-v2-body-conversion-flow-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2CustomCreatureContract() {
  console.log('Avatar V2 custom creature rig/capability contract (#264)...');
  execFileSync(process.execPath, ['scripts/avatar-v2-custom-creature-contract-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2CustomRigBenchmark() {
  console.log('Avatar V2 custom rig benchmark (#265): Meshy/SkinTokens/Import defaults...');
  execFileSync(process.execPath, ['scripts/avatar-v2-custom-rig-benchmark-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2CustomCreatureFlow() {
  console.log('Avatar V2 custom creature original vertical slice (#266)...');
  execFileSync(process.execPath, ['scripts/avatar-v2-custom-creature-flow-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2GenerateUx() {
  console.log('Avatar V2 generate UX Editierbar vs Freie Form (#267)...');
  execFileSync(process.execPath, ['scripts/avatar-v2-generate-ux-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2GenerateDecompositionSpike() {
  console.log('Avatar V2 modular generate decomposition spike (#268)...');
  execFileSync(
    process.execPath,
    ['scripts/avatar-v2-generate-decomposition-spike-check.mjs'],
    {
      cwd: root,
      stdio: 'inherit',
    },
  );
}

function checkAvatarV2ModularGenerateFlow() {
  console.log('Avatar V2 modular generate Editierbar vertical slice (#269)...');
  execFileSync(process.execPath, ['scripts/avatar-v2-modular-generate-flow-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarV2FinalAcceptance() {
  console.log('Avatar V2 final acceptance golden matrix (#270)...');
  execFileSync(process.execPath, ['scripts/avatar-v2-final-acceptance-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarContentPack() {
  console.log('Avatar content pack (#217): Fantasy/Sci-Fi curated assets...');
  execFileSync(process.execPath, ['scripts/avatar-content-pack-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarMeshyGeneration() {
  console.log('Avatar Meshy generation (#10): prompt job + SSRF + pending #6...');
  execFileSync(process.execPath, ['scripts/avatar-meshy-generation-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
  console.log('Avatar 3D generation (provider-agnostic): presets + Meshy adapter...');
  execFileSync(process.execPath, ['scripts/avatar-3d-generation-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarSourceSelector() {
  console.log('Avatar source selector (#14): sagadrive|import|meshy + legacy...');
  execFileSync(process.execPath, ['scripts/avatar-source-selector-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkSharedAvatarSurfaces() {
  console.log('Shared avatar surfaces (#9): portrait/compact/full + bounds...');
  execFileSync(process.execPath, ['scripts/shared-avatar-surfaces-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarEquipmentVisualContract() {
  console.log('Avatar equipment visual contract (#158): binding + projection...');
  execFileSync(process.execPath, ['scripts/avatar-equipment-visual-contract-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarRigidEquipmentRuntime() {
  console.log('Avatar rigid equipment runtime (#159): attach plan + cache...');
  execFileSync(process.execPath, ['scripts/avatar-rigid-equipment-runtime-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemAvatarFitWorkbench() {
  console.log('Item avatar fit workbench (#160): defaults + Ausrichtung section...');
  execFileSync(process.execPath, ['scripts/item-avatar-fit-workbench-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarRiggingProviders() {
  console.log('Avatar rigging providers (#161): Meshy + SkinTokens mocks...');
  execFileSync(process.execPath, ['scripts/avatar-rigging-providers-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarSkinnedWearables() {
  console.log('Avatar skinned wearables (#162): plan + capability gate...');
  execFileSync(process.execPath, ['scripts/avatar-skinned-wearables-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarItemsFinalAcceptance() {
  console.log('Avatar items final acceptance (#163): equip/rig/wearable matrix...');
  execFileSync(process.execPath, ['scripts/avatar-items-final-acceptance-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAvatarCreatorFinalAcceptance() {
  console.log('Avatar creator final visual/UX acceptance (#218): combo + golden matrix...');
  execFileSync(process.execPath, ['scripts/avatar-creator-final-acceptance-check.mjs'], {
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

function checkAllCoreSkillsValidation() {
  console.log('All core skills validation (#28): deterministic §5 skill catalog & boundaries...');
  execFileSync(process.execPath, ['scripts/validate-all-core-skills.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkNoncombatProjectsSocialValidation() {
  console.log('Noncombat/projects/social validation (#27): deterministic §2.8/§14 E1 scenarios...');
  execFileSync(process.execPath, ['scripts/validate-noncombat-projects-social.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkConditionsResistancesValidation() {
  console.log('Conditions/resistances validation (#33): deterministic §9/§6.5 C3 scenarios...');
  execFileSync(process.execPath, ['scripts/validate-conditions-resistances.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkTravelChaseVehiclesValidation() {
  console.log('Travel/chase/vehicles validation (#29): deterministic §10.4/§14.2/§14.10 E2 scenarios...');
  execFileSync(process.execPath, ['scripts/validate-travel-chase-vehicles.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkCharacterEditorRulesUxValidation() {
  console.log('Character editor rules UX validation (#21): B1 structural + E2E contract...');
  execFileSync(process.execPath, ['scripts/validate-character-editor-rules-ux.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkGearResourcesLoadValidation() {
  console.log('Gear/resources/load validation (#32): tools, traits, Traglast, affordability...');
  execFileSync(process.execPath, ['scripts/validate-gear-resources-load.mjs'], {
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

function checkAnalogEndToEndPlaytestValidation() {
  console.log('Analog E2E playtest validation (#31): deterministic Phase G1 paper-play ledger...');
  execFileSync(process.execPath, ['scripts/validate-analog-end-to-end-playtest.mjs'], {
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

function checkEdgeCorsShared() {
  console.log('Edge CORS shared helper (#305): _shared/cors + no local Origin literals...');
  execFileSync(process.execPath, ['scripts/edge-cors-shared-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemDomainTaxonomy() {
  console.log('Item domain taxonomy & provenance (#134): ItemDefinition owner, normalize/validate...');
  execFileSync(process.execPath, ['scripts/item-domain-taxonomy-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkSagaDriveItemRulesKernel() {
  console.log('SagaDrive item rules kernel (#135): load/cost/protection/Traglast/tool contracts...');
  execFileSync(process.execPath, ['scripts/sagadrive-item-rules-kernel-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkCombatCreateOpportunity() {
  console.log('Combat create opportunity (#194): Gelegenheit schaffen kernel + docs...');
  execFileSync(process.execPath, ['scripts/combat-create-opportunity-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkNpcCreaturePowerFramework() {
  console.log('NPC/creature power framework (#195): benchmarks, profiles, roles...');
  execFileSync(process.execPath, ['scripts/npc-creature-power-framework-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkNpcCreatureDomainPersistence() {
  console.log('NPC/creature domain persistence (#196): definitions CRUD contracts + RLS wiring...');
  execFileSync(process.execPath, ['scripts/npc-creature-domain-persistence-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkNpcCreatureLibraryBrowser() {
  console.log('NPC/creature library browser (#197): tab, EntityBrowser, filters, statblock...');
  execFileSync(process.execPath, ['scripts/npc-creature-library-browser-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkNpcCreatureCreatorEditor() {
  console.log('NPC/creature creator editor (#198): quick create, editor, live statblock...');
  execFileSync(process.execPath, ['scripts/npc-creature-creator-editor-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkNpcCreatureWorldCatalog() {
  console.log('NPC/creature world catalog (#199): packs + pure resolver + world UI...');
  execFileSync(process.execPath, ['scripts/npc-creature-world-catalog-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkNpcCreaturePromotion() {
  console.log('NPC/creature promotion + controller (#200): template/compact/assign wiring...');
  execFileSync(process.execPath, ['scripts/npc-creature-promotion-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkNpcCreatureSessionInstances() {
  console.log('NPC/creature session instances (#201): spawn/runtime/snapshot isolation...');
  execFileSync(process.execPath, ['scripts/npc-creature-session-instances-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemDefinitionPersistence() {
  console.log('ItemDefinition persistence lifecycle & security (#136): CRUD/fork/taxonomy roundtrip...');
  execFileSync(process.execPath, ['scripts/item-definition-persistence-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemStandardPacks() {
  console.log('Builtin standard item packs (#137): Fantasy/Sci-Fi/Contemporary 40/40/40 + context packs...');
  execFileSync(process.execPath, ['scripts/item-standard-packs-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemLibraryBrowser() {
  console.log('Item Epic Library Items browser (#138): slice composition, filters, UI contract...');
  execFileSync(process.execPath, ['scripts/item-library-browser-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemWorkbench() {
  console.log('Item Epic Workbench (#139): create/edit/readonly/fork UI + catalog wiring...');
  execFileSync(process.execPath, ['scripts/item-workbench-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemThumbnailAssets() {
  console.log('Item Epic thumbnails + Meshy (#140): upload/generate contract, secrets fail-closed...');
  execFileSync(process.execPath, ['scripts/item-thumbnail-assets-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemIconAssets() {
  console.log('Item static SVG icons: Cursor→PNG→VTracer pipeline contract...');
  execFileSync(process.execPath, ['scripts/item-icon-assets-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkNpcCreatureIconAssets() {
  console.log('NPC/creature static SVG icons: catalog iconKey + public assets...');
  execFileSync(process.execPath, ['scripts/npc-creature-icon-assets-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkAiProviderCredentials() {
  console.log('AI provider credentials (BYOK): vault + Meshy validate + prod user-keys-only...');
  execFileSync(process.execPath, ['scripts/ai-provider-credentials-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemModel3dAssets() {
  console.log('Item Epic 3D + Meshy Image-to-3D (#141): GLB upload/generate contract, secrets fail-closed...');
  execFileSync(process.execPath, ['scripts/item-model3d-assets-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemWorldCatalogModule() {
  console.log('Item Epic world item-catalog module (#142): pack selection + pure resolver...');
  execFileSync(process.execPath, ['scripts/item-world-catalog-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemInventoryWorldCatalogWire() {
  console.log('Item Epic inventory ↔ world catalog wire (#143): add-catalog composition + labels...');
  execFileSync(process.execPath, ['scripts/item-inventory-world-catalog-wire-check.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

function checkItemEpicAcceptance() {
  console.log('Item Epic final acceptance (#144): child gates, docs sync, no VITE Meshy, e2e...');
  execFileSync(process.execPath, ['scripts/item-epic-acceptance-check.mjs'], {
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
checkEdgeCorsShared();
checkItemDomainTaxonomy();
checkSagaDriveItemRulesKernel();
checkCombatCreateOpportunity();
checkItemDefinitionPersistence();
checkItemStandardPacks();
checkItemLibraryBrowser();
checkItemWorkbench();
checkItemThumbnailAssets();
checkItemIconAssets();
checkNpcCreatureIconAssets();
checkItemModel3dAssets();
checkAiProviderCredentials();
checkItemWorldCatalogModule();
checkItemInventoryWorldCatalogWire();
checkItemEpicAcceptance();
checkItemRoutingFoundation();
checkSagaRoutingPublicIdFoundation();
checkPlayerTestSessionSecurity();
checkPlayerTestRealtimeRuntime();
checkPlayerTestPlayerPanel();
checkPlayerTestSharedRolls();
checkPlayerTestSharedScenePresentation();
checkPlayerTestPreparedAdventureFixture();
checkPlayerTestCombatEncounter();
checkPlayerTestMultiuserE2eSecurity();
checkPlayerTestInstrumentationRunbook();
checkProjectMembershipSecurity();
checkCharacterEditorRegressions();
checkCharacterPresetsRegressions();
checkInventoryV2Domain();
checkInventoryCatalog();
checkInventoryCoreCatalog();
checkInventoryLegacyMigration();
checkInventoryDesktopUi();
checkInventoryWorldCatalogUi();
checkInventoryEquipmentUi();
checkInventoryMobileUi();
checkInventoryE2eIntegration();
checkBackgroundFrameworkRegressions();
checkAvatarRuntimeRegressions();
checkAvatarTraitLifecycle();
checkAvatarModularTraits();
checkAvatarCustomImport();
checkAvatarRigNormalization();
checkAvatarMorphContract();
checkAvatarBaseBodies();
checkAvatarMtoonProfile();
checkAvatarBodyFaceEditor();
checkAvatarFitRange();
checkAvatarSaveExport();
checkAvatarAnimationRetarget();
checkAvatarFacialExpressions();
checkAvatarFaceTracking();
checkLiveActCore();
checkLiveActViewportUi();
checkLiveActFaceDiagnostics();
checkLiveActDiagnosticsV2();
checkLiveActFaceAnchorsV1();
checkLiveActFaceMappingAuthoring();
checkLiveActFaceMappingManual();
checkLiveActFaceAnchorsCharacterPersist();
checkLiveActExpandDriveBind();
checkLiveActReferenceVrmGoldenAvatar();
checkLiveActFidelity();
checkLiveActFaceMappingVisualGuides();
checkLiveActFaceAnchorAnatomy();
checkLiveActCameraOverlayMetrics();
checkLiveActCharacterFaceOverlay();
checkLiveActAvatarOutput();
checkLiveActCapabilityOwnership();
checkLiveActFaceAssetContract();
checkLiveActFaceAssetValidator();
checkLiveActFaceSemanticValidator();
checkLiveActFaceAuthoringQtmesh();
checkLiveActRetargetProfile();
checkLiveActFacialFidelityV2();
checkAvatarVrmPack();
checkLiveActFaceFidelityE2E();
checkLiveActFacePipelineDocs();
checkLiveActFaceHumanRepro();
checkLiveActRigDebug();
checkLiveActSurfaceMigration();
checkLiveActHardening();
checkAvatarV2CompositionContract();
checkAvatarV2ModularGlbContract();
checkAvatarV2ArtifactPipeline();
checkAvatarV2StructureAnalyzer();
checkAvatarV2BodyProfile();
checkAvatarV2AssetAuthoring();
checkAvatarV2CanonicalBodyFamilies();
checkAvatarV2SpeciesTemplatePack();
checkAvatarV2StarterWardrobe();
checkAvatarV2SkinnedWearableRuntime();
checkAvatarV2CapabilityEditor();
checkAvatarV2TemplateCreatorFlow();
checkSpeciesTemplateGenderModelPreview();
checkAvatarV2ImportOriginalFlow();
checkAvatarV2IdentityTransferSpike();
checkAvatarV2BodyConversionFlow();
checkAvatarV2CustomCreatureContract();
checkAvatarV2CustomRigBenchmark();
checkAvatarV2CustomCreatureFlow();
checkAvatarV2GenerateUx();
checkAvatarV2GenerateDecompositionSpike();
checkAvatarV2ModularGenerateFlow();
checkAvatarV2FinalAcceptance();
checkAvatarContentPack();
checkAvatarMeshyGeneration();
checkAvatarSourceSelector();
checkSharedAvatarSurfaces();
checkAvatarEquipmentVisualContract();
checkAvatarRigidEquipmentRuntime();
checkItemAvatarFitWorkbench();
checkAvatarRiggingProviders();
checkAvatarSkinnedWearables();
checkAvatarItemsFinalAcceptance();
checkAvatarCreatorFinalAcceptance();
checkAvatarAssetCatalogRegressions();
checkCoreProbabilityValidation();
checkCombatActionEconomyValidation();
checkDamageHealingDyingValidation();
checkEnemyEncounterBossValidation();
checkNpcCreaturePowerFramework();
checkNpcCreatureDomainPersistence();
checkNpcCreatureLibraryBrowser();
checkNpcCreatureCreatorEditor();
checkNpcCreatureWorldCatalog();
checkNpcCreaturePromotion();
checkNpcCreatureSessionInstances();
checkCharacterCreationValidation();
checkPowersEssencesValidation();
checkDriveMomentumValidation();
checkWorldProfilesValidation();
checkAllCoreSkillsValidation();
checkNoncombatProjectsSocialValidation();
checkConditionsResistancesValidation();
checkTravelChaseVehiclesValidation();
checkCharacterEditorRulesUxValidation();
checkGearResourcesLoadValidation();
checkAnalogEndToEndPlaytestValidation();
scanAddedLinesForSecrets();
reportDependencyAudit();

console.log('Test Gate passed.');
