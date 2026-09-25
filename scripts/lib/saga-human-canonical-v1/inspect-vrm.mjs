/**
 * saga-human-canonical-v1/inspect-vrm — structural QA of the packed canonical human VRM.
 * Location: scripts/lib/saga-human-canonical-v1/inspect-vrm.mjs
 *
 * Checks contracts, not looks: humanoid map (eye bones yes, jaw no), exactly one gaze owner
 * (LookAt bone, no eyeLook expressions), jaw / tongue / blink binds per mesh, skin weights
 * (sum 1, joints in range), eyeballs fully on eye bones. Returns measured facts + failures.
 */

import { NodeIO } from '@gltf-transform/core';

const EYE_LOOK = [
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
];
const JAW_CHANNELS = ['jawOpen', 'jawLeft', 'jawRight', 'jawForward'];

function glbJson(bytes) {
  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB/VRM binary');
  const jsonLength = view.readUInt32LE(12);
  return JSON.parse(view.toString('utf8', 20, 20 + jsonLength));
}

/**
 * @param {Uint8Array | Buffer} bytes
 * @returns {Promise<{ pass: boolean; failures: string[]; facts: Record<string, unknown> }>}
 */
export async function inspectCanonicalHumanVrm(bytes) {
  const failures = [];
  const expect = (cond, msg) => {
    if (!cond) failures.push(msg);
  };
  const json = glbJson(bytes);
  const nodes = json.nodes ?? [];
  const vrm = json.extensions?.VRMC_vrm;
  if (!vrm) return { pass: false, failures: ['VRMC_vrm extension missing'], facts: {} };

  const humanBones = vrm.humanoid?.humanBones ?? {};
  const boneNode = (id) => (humanBones[id] ? nodes[humanBones[id].node]?.name ?? null : null);
  expect(boneNode('leftEye') === 'leftEye' && boneNode('rightEye') === 'rightEye', 'eye bones not mapped to leftEye/rightEye');
  expect(boneNode('head') === 'head', 'head bone not mapped');
  expect(!('jaw' in humanBones), 'jaw must not be a humanoid bone (morph owns the jaw)');
  expect(nodes.some((n) => n.name === 'jaw'), 'jaw joint missing from skin');

  const lookAt = vrm.lookAt ?? null;
  expect(lookAt?.type === 'bone', `LookAt type must be bone (got ${lookAt?.type ?? 'none'})`);

  const preset = vrm.expressions?.preset ?? {};
  const custom = vrm.expressions?.custom ?? {};
  const eyeLookExpressions = EYE_LOOK.filter((id) => id in custom || id in preset);
  const expressionLookPresets = ['lookUp', 'lookDown', 'lookLeft', 'lookRight'].filter((id) => id in preset);
  expect(eyeLookExpressions.length === 0, `eyeLook expressions present (${eyeLookExpressions.join(', ')})`);
  expect(expressionLookPresets.length === 0, 'expression LookAt presets present (second gaze owner)');

  const meshNameOfNode = (i) => nodes[i]?.name ?? `node${i}`;
  const boundMeshes = (expr) =>
    [...new Set((expr?.morphTargetBinds ?? []).map((b) => meshNameOfNode(b.node)))].sort();
  const binds = {};
  for (const [name, expr] of Object.entries(custom)) binds[name] = boundMeshes(expr);
  for (const [name, expr] of Object.entries(preset)) binds[`preset:${name}`] = boundMeshes(expr);

  for (const id of JAW_CHANNELS) {
    const b = binds[id] ?? [];
    expect(b.includes('Body') && b.includes('Teeth') && b.includes('Tongue'), `${id} must drive Body + Teeth + Tongue`);
  }
  expect(JSON.stringify(binds.tongueOut ?? []) === JSON.stringify(['Tongue']), 'tongueOut must bind only the Tongue mesh');
  for (const side of ['Left', 'Right']) {
    const b = binds[`eyeBlink${side}`] ?? [];
    expect(b.includes('Body') && b.includes('Eyelashes'), `eyeBlink${side} must move lids + lashes`);
    expect(!b.includes('Eyes'), `eyeBlink${side} must not deform the eyeballs`);
  }

  const doc = await new NodeIO().readBinary(new Uint8Array(bytes));
  const skinJoints = doc.getRoot().listSkins()[0]?.listJoints() ?? [];
  const jointCount = skinJoints.length;
  const jointIdx = (name) => skinJoints.findIndex((n) => n.getName() === name);
  const leftEyeIndex = jointIdx('leftEye');
  const rightEyeIndex = jointIdx('rightEye');
  let maxWeightSumError = 0;
  let maxInfluences = 0;
  let eyesMinOnEyeBones = Infinity;
  const teethRows = { headVertices: 0, headMaxJawMm: 0, jawVertices: 0, jawMinJawOpenMm: Infinity };
  const meshTargets = {};
  for (const mesh of doc.getRoot().listMeshes()) {
    meshTargets[mesh.getName()] = mesh.getExtras()?.targetNames ?? [];
    for (const prim of mesh.listPrimitives()) {
      if (mesh.getName() === 'Teeth') inspectTeethRows(prim, meshTargets.Teeth, jointIdx, teethRows);
      const jointsAcc = prim.getAttribute('JOINTS_0');
      const weightsAcc = prim.getAttribute('WEIGHTS_0');
      if (!jointsAcc || !weightsAcc) {
        failures.push(`${mesh.getName()}: missing JOINTS_0/WEIGHTS_0`);
        continue;
      }
      const j = [0, 0, 0, 0];
      const w = [0, 0, 0, 0];
      for (let i = 0; i < weightsAcc.getCount(); i += 1) {
        jointsAcc.getElement(i, j);
        weightsAcc.getElement(i, w);
        maxWeightSumError = Math.max(maxWeightSumError, Math.abs(1 - (w[0] + w[1] + w[2] + w[3])));
        maxInfluences = Math.max(maxInfluences, w.filter((x) => x > 0).length);
        if (j.some((x) => x >= jointCount)) failures.push(`${mesh.getName()}: joint index out of range`);
        if (mesh.getName() === 'Eyes') {
          let onEyes = 0;
          for (let k = 0; k < 4; k += 1) if (j[k] === leftEyeIndex || j[k] === rightEyeIndex) onEyes += w[k];
          eyesMinOnEyeBones = Math.min(eyesMinOnEyeBones, onEyes);
        }
      }
    }
  }
  expect(maxWeightSumError < 1e-3, `skin weights not normalized (max error ${maxWeightSumError})`);
  expect(eyesMinOnEyeBones > 0.999, `eyeball vertices not fully on eye bones (min ${eyesMinOnEyeBones})`);
  expect(teethRows.headVertices > 0 && teethRows.jawVertices > 0, 'teeth rows not found by skin weights');
  expect(teethRows.headMaxJawMm === 0, `upper teeth move with jaw morphs (${teethRows.headMaxJawMm} mm)`);
  expect(teethRows.jawMinJawOpenMm > 1, `lower teeth do not follow jawOpen (min ${teethRows.jawMinJawOpenMm} mm)`);
  expect((meshTargets.Tongue ?? []).includes('tongueOut'), 'Tongue mesh lacks tongueOut morph');

  return {
    pass: failures.length === 0,
    failures,
    facts: {
      humanoidBones: Object.keys(humanBones).sort(),
      lookAt,
      expressionPresets: Object.keys(preset).sort(),
      expressionCustomCount: Object.keys(custom).length,
      gazeOwners: {
        lookAtBone: lookAt?.type === 'bone',
        eyeLookExpressions: eyeLookExpressions.length,
        expressionLookPresets: expressionLookPresets.length,
      },
      binds: {
        jawOpen: binds.jawOpen ?? [],
        tongueOut: binds.tongueOut ?? [],
        eyeBlinkLeft: binds.eyeBlinkLeft ?? [],
        mouthSmileLeft: binds.mouthSmileLeft ?? [],
      },
      meshMorphTargetCounts: Object.fromEntries(Object.entries(meshTargets).map(([k, v]) => [k, v.length])),
      skin: {
        joints: jointCount,
        maxInfluences,
        maxWeightSumError: Number(maxWeightSumError.toExponential(2)),
        eyesMinOnEyeBones: Number(eyesMinOnEyeBones.toFixed(4)),
      },
      teethRows: {
        ...teethRows,
        headMaxJawMm: Number(teethRows.headMaxJawMm.toFixed(3)),
        jawMinJawOpenMm: Number(teethRows.jawMinJawOpenMm.toFixed(3)),
      },
    },
  };
}

/** Teeth vertices fully on `head` must not move with jaw morphs; vertices on `jaw` must open. */
function inspectTeethRows(prim, targetNames, jointIdx, out) {
  const head = jointIdx('head');
  const jaw = jointIdx('jaw');
  const jointsAcc = prim.getAttribute('JOINTS_0');
  const weightsAcc = prim.getAttribute('WEIGHTS_0');
  const targets = prim.listTargets();
  const jawTargets = JAW_CHANNELS.map((n) => targets[targetNames.indexOf(n)]).filter(Boolean);
  const openTarget = targets[targetNames.indexOf('jawOpen')];
  if (!jointsAcc || !weightsAcc || !openTarget) return;
  const j = [0, 0, 0, 0];
  const w = [0, 0, 0, 0];
  const d = [0, 0, 0];
  const len = (acc, i) => {
    acc.getElement(i, d);
    return Math.hypot(d[0], d[1], d[2]) * 1000;
  };
  for (let i = 0; i < weightsAcc.getCount(); i += 1) {
    jointsAcc.getElement(i, j);
    weightsAcc.getElement(i, w);
    const on = (joint) => j.reduce((s, x, k) => (x === joint ? s + w[k] : s), 0);
    if (on(head) > 0.999) {
      out.headVertices += 1;
      for (const t of jawTargets) out.headMaxJawMm = Math.max(out.headMaxJawMm, len(t.getAttribute('POSITION'), i));
    } else if (on(jaw) > 0.999) {
      out.jawVertices += 1;
      out.jawMinJawOpenMm = Math.min(out.jawMinJawOpenMm, len(openTarget.getAttribute('POSITION'), i));
    }
  }
}
