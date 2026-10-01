/**
 * toonlab-compatibility-spike — isolated ToonLab ↔ SagaDrive avatar renderer matrix (#341).
 * Location: src/infrastructure/character/avatar/toonlab-compatibility-spike.ts
 *
 * Pure decision/inventory helpers for the compatibility spike. No React, no ToonLab
 * runtime import (peer three/react mismatch would pull an incompatible stack into CI).
 */
export const TOONLAB_SPIKE_ID = 'toonlab-compatibility-spike' as const;
export const TOONLAB_SPIKE_PACKAGE = '@call-me-sensei/toonlab' as const;
export const TOONLAB_SPIKE_EVALUATED_VERSION = '0.5.0' as const;

export type ToonLabSpikeVerdict = 'GO' | 'BLOCKED';

export type ToonLabSpikeCheckId =
  | 'peer-three'
  | 'peer-three-vrm'
  | 'peer-react'
  | 'renderer-stack'
  | 'skinned-mesh'
  | 'morph-targets'
  | 'alpha-transparency'
  | 'pbr-maps'
  | 'animation-skeleton'
  | 'portrait-capture'
  | 'silent-upgrade';

export interface ToonLabSpikeHostVersions {
  three: string;
  threeVrm: string;
  react: string;
  avatarRenderer: 'WebGLRenderer' | 'WebGPURenderer' | 'unknown';
  materialPath: 'mtoon-glsl' | 'pbr' | 'tsl-node' | 'mixed';
}

export interface ToonLabSpikePeerRequirements {
  three: string;
  threeVrm: string;
  react: string;
  rendererDefault: 'WebGPURenderer';
  materialStack: 'TSL/NodeMaterial';
  glslPathRemoved: boolean;
}

/** Host versions observed in SagaDrive at spike time (package.json + CharacterStudioRuntime). */
export const SAGADRIVE_AVATAR_HOST_AT_SPIKE: ToonLabSpikeHostVersions = {
  three: '0.183.2',
  threeVrm: '3.5.1',
  react: '18.3.1',
  avatarRenderer: 'WebGLRenderer',
  materialPath: 'mtoon-glsl',
};

/** Peers published by @call-me-sensei/toonlab@0.5.0 (npm metadata). */
export const TOONLAB_PEERS_AT_SPIKE: ToonLabSpikePeerRequirements = {
  three: '^0.185.1',
  threeVrm: '^3.5.4',
  react: '^19.0.0',
  rendererDefault: 'WebGPURenderer',
  materialStack: 'TSL/NodeMaterial',
  glslPathRemoved: true,
};

export interface ToonLabSpikeFixtureAsset {
  id: string;
  kind: 'glb-pbr' | 'vrm-mtoon';
  relativePath: string;
  role: 'human-male-body' | 'human-male-vrm-face';
}

/** Real SagaDrive public assets used for the matrix (identical camera assumed in harness notes). */
export const TOONLAB_SPIKE_FIXTURES: readonly ToonLabSpikeFixtureAsset[] = [
  {
    id: 'human-male-glb',
    kind: 'glb-pbr',
    relativePath: 'public/assets/avatars/species/human-male-quality-20260921-m5.glb',
    role: 'human-male-body',
  },
  {
    id: 'human-male-vrm',
    kind: 'vrm-mtoon',
    relativePath: 'public/assets/avatars/species/human-male-quality-20260921-m5-face1.vrm',
    role: 'human-male-vrm-face',
  },
];

export interface ToonLabSpikeCheckRow {
  id: ToonLabSpikeCheckId;
  label: string;
  pbrOrMtoonBaseline: 'pass' | 'fail' | 'n/a';
  toonLabPath: 'pass' | 'fail' | 'blocked' | 'n/a';
  notes: string;
}

export interface ToonLabSpikeFinding {
  id: string;
  severity: 'blocker' | 'risk' | 'info';
  detail: string;
}

export interface ToonLabSpikeDecision {
  verdict: ToonLabSpikeVerdict;
  packageName: typeof TOONLAB_SPIKE_PACKAGE;
  packageVersion: typeof TOONLAB_SPIKE_EVALUATED_VERSION;
  findings: ToonLabSpikeFinding[];
  matrix: ToonLabSpikeCheckRow[];
  /** Concrete path if a later ticket unblocks integration — never a silent upgrade. */
  minimalIntegrationPath: readonly string[];
  performanceRisks: readonly string[];
}

function semverTriple(version: string): { major: number; minor: number; patch: number } | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.replace(/^\^|~/, ''));
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function cmpSemver(
  a: { major: number; minor: number; patch: number },
  b: { major: number; minor: number; patch: number },
): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/** Minimal caret check for X.Y.Z peers (sufficient for this spike matrix). */
function satisfiesCaret(host: string, peerRange: string): boolean {
  const peer = semverTriple(peerRange);
  const actual = semverTriple(host);
  if (!peer || !actual) return false;
  if (actual.major !== peer.major) return false;
  return cmpSemver(actual, peer) >= 0;
}

export function buildToonLabSpikeMatrix(
  host: ToonLabSpikeHostVersions = SAGADRIVE_AVATAR_HOST_AT_SPIKE,
  peers: ToonLabSpikePeerRequirements = TOONLAB_PEERS_AT_SPIKE,
): ToonLabSpikeCheckRow[] {
  const threeOk = satisfiesCaret(host.three, peers.three);
  const vrmOk = satisfiesCaret(host.threeVrm, peers.threeVrm);
  const reactOk = satisfiesCaret(host.react, peers.react);
  const rendererOk =
    host.avatarRenderer === 'WebGPURenderer' || host.materialPath === 'tsl-node';

  return [
    {
      id: 'peer-three',
      label: 'three peer range',
      pbrOrMtoonBaseline: 'pass',
      toonLabPath: threeOk ? 'pass' : 'blocked',
      notes: `host ${host.three} vs peer ${peers.three}`,
    },
    {
      id: 'peer-three-vrm',
      label: '@pixiv/three-vrm peer range',
      pbrOrMtoonBaseline: 'pass',
      toonLabPath: vrmOk ? 'pass' : 'blocked',
      notes: `host ${host.threeVrm} vs peer ${peers.threeVrm}`,
    },
    {
      id: 'peer-react',
      label: 'react peer (package declares; avatar runtime itself is React-free)',
      pbrOrMtoonBaseline: 'n/a',
      toonLabPath: reactOk ? 'pass' : 'blocked',
      notes: `host ${host.react} vs peer ${peers.react}`,
    },
    {
      id: 'renderer-stack',
      label: 'Renderer / material stack',
      pbrOrMtoonBaseline: 'pass',
      toonLabPath: rendererOk ? 'pass' : 'blocked',
      notes: `host ${host.avatarRenderer}+${host.materialPath}; ToonLab ${peers.rendererDefault}+${peers.materialStack}; GLSL removed=${peers.glslPathRemoved}`,
    },
    {
      id: 'skinned-mesh',
      label: 'SkinnedMesh / skeleton present on fixtures',
      pbrOrMtoonBaseline: 'pass',
      toonLabPath: threeOk && rendererOk ? 'pass' : 'blocked',
      notes: 'Fixtures are skinned; Toon apply path cannot run until renderer peers clear.',
    },
    {
      id: 'morph-targets',
      label: 'Morph targets / VRM expressions',
      pbrOrMtoonBaseline: 'pass',
      toonLabPath: threeOk && rendererOk ? 'pass' : 'blocked',
      notes: 'VRM fixture carries expression morphs; Toon conversion must not strip them — unverified until executable.',
    },
    {
      id: 'alpha-transparency',
      label: 'Alpha / cutout / transparency (hair)',
      pbrOrMtoonBaseline: 'pass',
      toonLabPath: 'blocked',
      notes: 'Risk called out by ToonLab docs for imported materials; blocked until TSL path runs on fixtures.',
    },
    {
      id: 'pbr-maps',
      label: 'BaseColor / Normal / MetallicRoughness bindings',
      pbrOrMtoonBaseline: 'pass',
      toonLabPath: 'blocked',
      notes: 'PBR maps inventory on GLB; ToonLab must preserve maps — not executable on current stack.',
    },
    {
      id: 'animation-skeleton',
      label: 'Animation / skeleton binding',
      pbrOrMtoonBaseline: 'pass',
      toonLabPath: 'blocked',
      notes: 'CharacterStudioRuntime animation path OK; ToonLab character retarget is separate and blocked by peers.',
    },
    {
      id: 'portrait-capture',
      label: 'Portrait capture parity (identical camera)',
      pbrOrMtoonBaseline: 'pass',
      toonLabPath: 'blocked',
      notes: 'PBR/MToon capture exists via mtoon-style-applier; Toon side-by-side capture requires WebGPU/TSL harness.',
    },
    {
      id: 'silent-upgrade',
      label: 'Silent three/renderer upgrade forbidden',
      pbrOrMtoonBaseline: 'pass',
      toonLabPath: 'fail',
      notes: 'Acceptance forbids silent renderer upgrades; unblocking needs an explicit version+regression PR.',
    },
  ];
}

export function evaluateToonLabCompatibilitySpike(
  host: ToonLabSpikeHostVersions = SAGADRIVE_AVATAR_HOST_AT_SPIKE,
  peers: ToonLabSpikePeerRequirements = TOONLAB_PEERS_AT_SPIKE,
): ToonLabSpikeDecision {
  const matrix = buildToonLabSpikeMatrix(host, peers);
  const findings: ToonLabSpikeFinding[] = [];

  if (!satisfiesCaret(host.three, peers.three)) {
    findings.push({
      id: 'three-peer-gap',
      severity: 'blocker',
      detail: `SagaDrive three@${host.three} does not satisfy ToonLab peer ${peers.three}.`,
    });
  }
  if (!satisfiesCaret(host.threeVrm, peers.threeVrm)) {
    findings.push({
      id: 'vrm-peer-gap',
      severity: 'blocker',
      detail: `SagaDrive @pixiv/three-vrm@${host.threeVrm} does not satisfy ToonLab peer ${peers.threeVrm}.`,
    });
  }
  if (!satisfiesCaret(host.react, peers.react)) {
    findings.push({
      id: 'react-peer-gap',
      severity: 'risk',
      detail: `Package peers react ${peers.react}; host is ${host.react}. Avatar runtime is React-free, but installing ToonLab as a dep still advertises the peer conflict.`,
    });
  }
  if (host.avatarRenderer !== 'WebGPURenderer' && host.materialPath !== 'tsl-node') {
    findings.push({
      id: 'renderer-mismatch',
      severity: 'blocker',
      detail:
        'CharacterStudioRuntime uses THREE.WebGLRenderer + MToon/GLSL. ToonLab 0.5 is TSL/NodeMaterial WebGPU-first with GLSL path removed — not a drop-in on the current avatar renderer.',
    });
  }
  findings.push({
    id: 'mtoon-parallel-path',
    severity: 'info',
    detail:
      'SagaDrive already has an allowlisted MToon style profile. ToonLab must not silently replace that contract; Look runtime (#342) should keep provider-neutral adapters.',
  });

  const blockers = findings.filter((f) => f.severity === 'blocker');
  const verdict: ToonLabSpikeVerdict = blockers.length === 0 ? 'GO' : 'BLOCKED';

  return {
    verdict,
    packageName: TOONLAB_SPIKE_PACKAGE,
    packageVersion: TOONLAB_SPIKE_EVALUATED_VERSION,
    findings,
    matrix,
    minimalIntegrationPath: [
      'Open a dedicated version-bump PR: three ≥ 0.185.1 and @pixiv/three-vrm ≥ 3.5.4 with LiveAct/avatar regression suite green — no silent bump inside a Look feature PR.',
      'Add an isolated Look preview surface using WebGPURenderer (or documented TSL WebGL2 fallback), leaving CharacterStudioRuntime on WebGL/MToon until proven.',
      'Introduce provider-neutral Look runtime adapter (#342) that calls applyToonShader only behind LookExecutionMode; never import ToonLab types into domains/look.',
      'Re-run this spike harness with side-by-side portrait capture on human-male GLB + VRM fixtures (identical camera) before declaring GO.',
      'Gate alpha/hair and morph-target regressions explicitly; fail closed if maps or morphs are dropped.',
    ],
    performanceRisks: [
      'WebGPU/TSL path + outline/post passes may exceed mobile GPU budget vs current MToon performance presets.',
      'Dual renderer maintenance (WebGL CharacterStudio + WebGPU Look preview) increases bundle and QA surface.',
      'three minor bump (183 → 185+) can regress VRM/MToon and LiveAct face retarget — requires full avatar gate before merge.',
    ],
  };
}

export function assertToonLabSpikeInvariants(decision: ToonLabSpikeDecision = evaluateToonLabCompatibilitySpike()): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (decision.verdict !== 'BLOCKED' && decision.verdict !== 'GO') {
    issues.push('verdict must be GO or BLOCKED');
  }
  if (decision.matrix.length < 8) issues.push('matrix incomplete');
  if (!decision.minimalIntegrationPath.length) issues.push('missing integration path');
  if (decision.verdict === 'BLOCKED' && !decision.findings.some((f) => f.severity === 'blocker')) {
    issues.push('BLOCKED without blocker findings');
  }
  if (TOONLAB_SPIKE_FIXTURES.length < 2) issues.push('need glb + vrm fixtures');
  return { ok: issues.length === 0, issues };
}
