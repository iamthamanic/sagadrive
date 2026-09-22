/**
 * liveact-face-authoring-qtmesh — thin offline FaceRig authoring adapter (#384).
 * Location: scripts/lib/liveact-face-authoring-qtmesh.mjs
 *
 * Resolves an external `qtmesh` CLI and runs `facerig` via execFile (no shell).
 * Domain code must not import this module.
 */

import { createHash } from 'node:crypto';
import { accessSync, constants, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const QTMESH_PINNED_COMMIT = '8720dc91bd7426908b9218673fbd74d544dd908c';
export const QTMESH_REPOSITORY = 'fernandotonon/QtMeshEditor';
export const FACE_AUTHORING_PROVIDER = 'qtmesh-facerig';

/** Default FaceRig max residual (%) for full-body skinned humans (QtMesh default is 8). */
export const DEFAULT_FULLBODY_MAX_RESIDUAL = 12;

const SHAPE_N_RE = /^Shape_\d+$/i;

/**
 * @param {string} root
 * @returns {string}
 */
export function defaultQtmeshCacheDir(root) {
  return join(root, '.cache', 'sagadrive-tools', 'qtmesh');
}

/**
 * @param {string} binPath
 * @returns {boolean}
 */
export function isExecutableFile(binPath) {
  try {
    accessSync(binPath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deterministic binary resolution: env → PATH → local tool cache.
 * @param {{ root: string, env?: NodeJS.ProcessEnv, qtmeshBin?: string }} opts
 * @returns {{ bin: string, source: 'flag' | 'env' | 'path' | 'cache' }}
 */
export function resolveQtmeshBin(opts) {
  const env = opts.env || process.env;
  if (opts.qtmeshBin) {
    const abs = resolve(opts.qtmeshBin);
    if (!isExecutableFile(abs)) {
      throw new Error(`qtmesh bin not executable: ${abs}`);
    }
    return { bin: abs, source: 'flag' };
  }
  const fromEnv = (env.SAGADRIVE_QTMESH_BIN || '').trim();
  if (fromEnv) {
    const abs = resolve(fromEnv);
    if (!isExecutableFile(abs)) {
      throw new Error(`SAGADRIVE_QTMESH_BIN not executable: ${abs}`);
    }
    return { bin: abs, source: 'env' };
  }
  const which = spawnSync('which', ['qtmesh'], { encoding: 'utf8' });
  if (which.status === 0) {
    const bin = which.stdout.trim().split('\n')[0];
    if (bin && isExecutableFile(bin)) {
      return { bin, source: 'path' };
    }
  }
  const cacheBin = join(defaultQtmeshCacheDir(opts.root), 'bin', 'qtmesh');
  if (isExecutableFile(cacheBin)) {
    return { bin: cacheBin, source: 'cache' };
  }
  throw new Error(
    'qtmesh not found. Set SAGADRIVE_QTMESH_BIN, install qtmesh on PATH, or run scripts/bootstrap-qtmesh-facerig.sh',
  );
}

/**
 * @param {string[]} argv
 * @returns {{ input: string, output: string, runDir: string, qtmeshBin?: string, bootstrap?: boolean, profile: string, baseline?: string, maxResidual?: number }}
 */
export function parseFaceAuthoringArgs(argv) {
  /** @type {Record<string, string | boolean | number>} */
  const out = { profile: 'core-v1' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (
      a === '--input' ||
      a === '--output' ||
      a === '--run-dir' ||
      a === '--qtmesh-bin' ||
      a === '--profile' ||
      a === '--baseline' ||
      a === '--max-residual'
    ) {
      const v = argv[++i];
      if (!v || v.startsWith('--')) throw new Error(`missing value for ${a}`);
      if (a === '--run-dir') out.runDir = v;
      else if (a === '--qtmesh-bin') out.qtmeshBin = v;
      else if (a === '--max-residual') out.maxResidual = Number(v);
      else out[a.slice(2)] = v;
      continue;
    }
    if (a === '--bootstrap') {
      out.bootstrap = true;
      continue;
    }
    if (a === '--canonicalize-only') {
      out.canonicalizeOnly = true;
      continue;
    }
    if (a === '--help' || a === '-h') {
      out.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${a}`);
  }
  if (out.help) return /** @type {any} */ (out);
  if (!out.input || !out.output || !out.runDir) {
    throw new Error('required: --input --output --run-dir');
  }
  if (out.maxResidual != null && !Number.isFinite(out.maxResidual)) {
    throw new Error('--max-residual must be a number');
  }
  return /** @type {any} */ (out);
}

/**
 * Build argv for `qtmesh facerig` (no shell interpolation).
 * @param {{ input: string, output: string, maxResidual?: number }} opts
 * @returns {string[]}
 */
export function buildFacerigArgv(opts) {
  const argv = ['facerig', opts.input, '-o', opts.output, '--json'];
  if (opts.maxResidual != null && Number.isFinite(opts.maxResidual)) {
    argv.push('--max-residual', String(opts.maxResidual));
  }
  return argv;
}

/**
 * @param {unknown} report
 * @returns {{ ok: boolean, errors: string[], shapeCount?: number, fitResidual?: number | null, targetNames?: string[] }}
 */
export function interpretQtmeshReport(report) {
  const errors = [];
  if (!report || typeof report !== 'object') {
    return { ok: false, errors: ['qtmesh report missing or not an object'] };
  }
  const r = /** @type {Record<string, unknown>} */ (report);
  const names =
    (Array.isArray(r.targetNames) && r.targetNames) ||
    (Array.isArray(r.shapeNames) && r.shapeNames) ||
    (Array.isArray(r.shapes) &&
      r.shapes.map((s) =>
        typeof s === 'string'
          ? s
          : s && typeof s === 'object' && 'name' in s
            ? String(/** @type {any} */ (s).name)
            : '',
      )) ||
    [];
  const cleanNames = names.filter((n) => typeof n === 'string' && n.length > 0);
  const shapeCount =
    typeof r.shapeCount === 'number'
      ? r.shapeCount
      : typeof r.shapes_attached === 'number'
        ? r.shapes_attached
        : typeof r.shapesAttached === 'number'
          ? r.shapesAttached
          : cleanNames.length || undefined;
  const fitResidual =
    typeof r.fitResidual === 'number'
      ? r.fitResidual
      : typeof r.fit_max_residual_pct === 'number'
        ? r.fit_max_residual_pct
        : typeof r.maxResidual === 'number'
          ? r.maxResidual
          : typeof r.residual === 'number'
            ? r.residual
            : null;
  if (shapeCount != null && shapeCount < 10) {
    errors.push(`shapeCount too low for core-v1: ${shapeCount}`);
  }
  if (cleanNames.length && cleanNames.every((n) => SHAPE_N_RE.test(n))) {
    errors.push('target names are Shape_N only; mesh.extras.targetNames required');
  }
  if (r.ok === false || r.success === false || r.error) {
    errors.push(String(r.error || r.message || 'qtmesh reported failure'));
  }
  return { ok: errors.length === 0, errors, shapeCount, fitResidual, targetNames: cleanNames };
}

/**
 * Fail if GLB morph targets are anonymous Shape_N-only.
 * @param {import('@gltf-transform/core').Document} doc
 */
export function assertNamedMorphTargets(doc) {
  const errors = [];
  for (const mesh of doc.getRoot().listMeshes()) {
    const meshExtras = mesh.getExtras() || {};
    for (const prim of mesh.listPrimitives()) {
      const targetCount = prim.listTargets().length;
      if (!targetCount) continue;
      const extras = prim.getExtras() || {};
      const names = Array.isArray(extras.targetNames)
        ? extras.targetNames.map(String)
        : Array.isArray(meshExtras.targetNames)
          ? meshExtras.targetNames.map(String)
          : [];
      if (names.length !== targetCount) {
        errors.push(
          `mesh ${mesh.getName() || '?'}: targetNames length ${names.length} != morph count ${targetCount}`,
        );
        continue;
      }
      if (names.every((n) => SHAPE_N_RE.test(n))) {
        errors.push(`mesh ${mesh.getName() || '?'}: Shape_N-only morph names (reject)`);
      }
    }
  }
  if (errors.length) {
    throw new Error(`morph target names invalid: ${errors.join('; ')}`);
  }
}

/**
 * @param {string} filePath
 * @returns {string}
 */
export function sha256File(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

/**
 * @param {{
 *   root: string,
 *   input: string,
 *   output: string,
 *   runDir: string,
 *   qtmeshBin?: string,
 *   maxResidual?: number,
 *   env?: NodeJS.ProcessEnv,
 *   execFileImpl?: typeof execFileAsync,
 *   timeoutMs?: number,
 * }} opts
 */
export async function runQtmeshFaceAuthoring(opts) {
  const root = opts.root;
  const input = isAbsolute(opts.input) ? opts.input : resolve(root, opts.input);
  const output = isAbsolute(opts.output) ? opts.output : resolve(root, opts.output);
  const runDir = isAbsolute(opts.runDir) ? opts.runDir : resolve(root, opts.runDir);
  if (!existsSync(input)) throw new Error(`input missing: ${input}`);
  mkdirSync(runDir, { recursive: true });
  mkdirSync(dirname(output), { recursive: true });

  const resolved = resolveQtmeshBin({
    root,
    env: opts.env,
    qtmeshBin: opts.qtmeshBin,
  });
  const argv = buildFacerigArgv({
    input,
    output,
    maxResidual: opts.maxResidual,
  });
  const execImpl = opts.execFileImpl || execFileAsync;
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  try {
    const result = await execImpl(resolved.bin, argv, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: opts.timeoutMs ?? 30 * 60 * 1000,
      cwd: root,
      env: {
        ...process.env,
        ...(opts.env || {}),
        QTMESH_NO_TELEMETRY: '1',
        QTMESH_FACERIG_DEBUG: process.env.QTMESH_FACERIG_DEBUG || opts.env?.QTMESH_FACERIG_DEBUG || '1',
        QTMESH_FACERIG_MARKER_SIM:
          process.env.QTMESH_FACERIG_MARKER_SIM ??
          opts.env?.QTMESH_FACERIG_MARKER_SIM ??
          '2',
      },
    });
    stdout = String(result.stdout || '');
    stderr = String(result.stderr || '');
  } catch (err) {
    const e = /** @type {any} */ (err);
    stdout = String(e.stdout || '');
    stderr = String(e.stderr || '');
    exitCode = typeof e.code === 'number' ? e.code : 1;
    if (!stdout && !stderr) {
      throw new Error(`qtmesh facerig failed: ${e.message || err}`);
    }
  }

  /** @type {unknown} */
  let report = null;
  const combined = `${stdout}\n${stderr}`.trim();
  try {
    // Prefer last JSON object in output
    const start = combined.lastIndexOf('{');
    if (start >= 0) {
      report = JSON.parse(combined.slice(start));
    }
  } catch {
    report = { raw: combined.slice(0, 4000), parseError: true };
  }

  const reportPath = join(runDir, 'qtmesh-report.json');
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        provider: FACE_AUTHORING_PROVIDER,
        repository: QTMESH_REPOSITORY,
        commit: QTMESH_PINNED_COMMIT,
        license: 'MIT',
        bin: resolved.bin,
        binSource: resolved.source,
        argv,
        exitCode,
        report,
        stdoutTail: stdout.slice(-2000),
        stderrTail: stderr.slice(-2000),
      },
      null,
      2,
    ) + '\n',
  );

  if (exitCode !== 0) {
    const interpreted = interpretQtmeshReport(report);
    const detail =
      interpreted.errors.join('; ') ||
      (typeof report === 'object' && report && 'error' in /** @type {any} */ (report)
        ? String(/** @type {any} */ (report).error)
        : '') ||
      stderr.trim() ||
      stdout.trim() ||
      'unknown';
    throw new Error(`qtmesh facerig exit ${exitCode}: ${detail.slice(0, 800)}`);
  }
  if (!existsSync(output)) {
    throw new Error(`qtmesh facerig did not write output: ${output}`);
  }

  const interpreted = interpretQtmeshReport(report);
  return {
    bin: resolved.bin,
    binSource: resolved.source,
    argv,
    exitCode,
    report,
    reportPath,
    interpreted,
    inputChecksum: sha256File(input),
    outputChecksum: sha256File(output),
  };
}

/**
 * QtMesh Assimp export can leave external image URIs + slightly-invalid IBM floats.
 * Re-embed textures, restore baseline PBR maps, and normalize IBM 4th row to [0,0,0,1].
 * @param {{ facePath: string, baselinePath: string, outputPath: string }} opts
 * @returns {Promise<{ textureCount: number, morphCount: number, ibmCellsFixed: number }>}
 */
export async function canonicalizeFaceExport(opts) {
  const { NodeIO } = await import('@gltf-transform/core');
  const io = new NodeIO();
  const faceDoc = await io.read(opts.facePath);
  const baselineDoc = await io.read(opts.baselinePath);

  let ibmCellsFixed = 0;
  for (const skin of faceDoc.getRoot().listSkins()) {
    const ibm = skin.getInverseBindMatrices();
    if (!ibm) continue;
    const arr = ibm.getArray();
    if (!arr) continue;
    for (let i = 0; i < arr.length; i += 16) {
      if (arr[i + 3] !== 0) {
        arr[i + 3] = 0;
        ibmCellsFixed += 1;
      }
      if (arr[i + 7] !== 0) {
        arr[i + 7] = 0;
        ibmCellsFixed += 1;
      }
      if (arr[i + 11] !== 0) {
        arr[i + 11] = 0;
        ibmCellsFixed += 1;
      }
      if (arr[i + 15] !== 1) {
        arr[i + 15] = 1;
        ibmCellsFixed += 1;
      }
    }
    ibm.setArray(arr);
  }

  // Drop exporter textures; restore baseline textures so PBR + texture_count match shipping body.
  for (const tex of [...faceDoc.getRoot().listTextures()]) {
    tex.dispose();
  }
  const baseTextures = baselineDoc.getRoot().listTextures();
  /** @type {import('@gltf-transform/core').Texture[]} */
  const clones = [];
  for (const src of baseTextures) {
    const t = faceDoc.createTexture(src.getName() || 'tex');
    const image = src.getImage();
    if (image) t.setImage(image.slice(0));
    if (src.getMimeType()) t.setMimeType(src.getMimeType());
    if (src.getURI()) t.setURI(src.getURI());
    clones.push(t);
  }
  function mapTex(srcTex) {
    if (!srcTex) return null;
    const idx = baseTextures.indexOf(srcTex);
    return idx >= 0 ? clones[idx] : null;
  }
  const faceMats = faceDoc.getRoot().listMaterials();
  const baseMats = baselineDoc.getRoot().listMaterials();
  for (let i = 0; i < faceMats.length; i += 1) {
    const faceMat = faceMats[i];
    const baseMat = baseMats[i] || baseMats[0];
    if (!faceMat || !baseMat) continue;
    faceMat.setBaseColorTexture(mapTex(baseMat.getBaseColorTexture()));
    faceMat.setMetallicRoughnessTexture(mapTex(baseMat.getMetallicRoughnessTexture()));
    faceMat.setNormalTexture(mapTex(baseMat.getNormalTexture()));
    faceMat.setOcclusionTexture(mapTex(baseMat.getOcclusionTexture()));
    faceMat.setEmissiveTexture(mapTex(baseMat.getEmissiveTexture()));
    if (baseMat.getBaseColorFactor()) faceMat.setBaseColorFactor(baseMat.getBaseColorFactor());
    faceMat.setMetallicFactor(baseMat.getMetallicFactor());
    faceMat.setRoughnessFactor(baseMat.getRoughnessFactor());
  }

  assertNamedMorphTargets(faceDoc);

  // Morph targets from FaceRig are extremely sparse (~face verts only). Mark
  // POSITION accessors sparse so writeBinary packs non-zeros (keeps GLB under
  // GitHub's 100MB limit without Meshopt/Draco).
  let sparseMarked = 0;
  for (const mesh of faceDoc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const target of prim.listTargets()) {
        const acc = target.getAttribute('POSITION');
        if (!acc || acc.getSparse()) continue;
        const arr = acc.getArray();
        if (!arr || arr.length === 0) continue;
        let nonzero = 0;
        for (let i = 0; i < arr.length; i += 3) {
          if (arr[i] !== 0 || arr[i + 1] !== 0 || arr[i + 2] !== 0) nonzero += 1;
        }
        if (nonzero > 0 && nonzero <= (arr.length / 3) * 0.5) {
          acc.setSparse(true);
          sparseMarked += 1;
        }
      }
    }
  }

  let morphCount = 0;
  for (const mesh of faceDoc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) morphCount += prim.listTargets().length;
  }

  writeFileSync(opts.outputPath, Buffer.from(await io.writeBinary(faceDoc)));
  return {
    textureCount: faceDoc.getRoot().listTextures().length,
    morphCount,
    ibmCellsFixed,
    sparseMorphTargets: sparseMarked,
  };
}

export function repoRootFromThisModule() {
  return fileURLToPath(new URL('../..', import.meta.url));
}
