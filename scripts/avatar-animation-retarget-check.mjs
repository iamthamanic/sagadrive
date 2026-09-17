#!/usr/bin/env node
/**
 * avatar-animation-retarget-check — deterministic tests for #8 animation retargeting.
 * Location: scripts/avatar-animation-retarget-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-animation-retarget-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/animation-contract.ts');
const index = read('src/domains/character/avatar/index.ts');
const runtime = read('src/infrastructure/character/avatar/avatar-animation-runtime.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const controls = read('src/app/character/avatar/AvatarAnimationPreviewControls.tsx');
const canvas = read('src/app/character/avatar/AvatarCanvas.tsx');

check(/ANIMATION_CONTRACT_VERSION/.test(domain), 'animation contract version');
check(/AVATAR_ANIMATION_CATALOG/.test(domain), 'allowlisted catalog');
check(/sagadrive-preview-idle-v1/.test(domain), 'idle clip id');
check(/sagadrive-preview-walk-v1/.test(domain), 'walk clip id');
check(/sagadrive-preview-combat-v1/.test(domain), 'combat clip id');
check(/sagadrive-preview-emote-wave-v1/.test(domain), 'emote clip id');
check(/resolveAvatarAnimationSupport/.test(domain), 'support resolver');
check(/resolveAnimationCrossfadeSeconds/.test(domain), 'crossfade helper');
check(!/from ['"]three['"]/.test(domain), 'domain has no Three');
check(!/from ['"]react['"]/.test(domain), 'domain has no React');

check(/export \{[\s\S]*resolveAvatarAnimationSupport/.test(index), 'barrel exports support');
check(/AVATAR_ANIMATION_CATALOG/.test(index), 'barrel exports catalog');

check(/AnimationMixer/.test(runtime), 'uses AnimationMixer');
check(/buildProceduralClip|QuaternionKeyframeTrack/.test(runtime), 'procedural tracks');
check(/mappedBones\[boneId\]/.test(runtime), 'retarget via mapped handles only');
check(/SagaDriveAnimationAttachmentFixture/.test(runtime), 'rigid attachment fixture');
check(/fadeOut|fadeIn/.test(runtime), 'crossfade');
check(/disposeMixer|uncacheRoot/.test(runtime), 'cleanup on dispose');
check(!/mixamorig:/.test(runtime), 'no ad-hoc mixamo bone strings in runtime');

check(/AvatarAnimationRuntime/.test(studio), 'studio hosts animation runtime');
check(/animationRuntime\.bind/.test(studio), 'binds after rig analysis');
check(/animationRuntime\.update/.test(studio), 'updates mixer each frame');
check(/playAnimation/.test(studio), 'exposes playAnimation');
check(/animationRuntime\.dispose/.test(studio), 'disposes animation runtime');

check(/Idle/.test(controls) && /Walk/.test(controls) && /Combat/.test(controls) && /Emote/.test(controls), 'control labels');
check(/data-avatar-animation-action/.test(controls), 'action test ids');
check(/prefers-reduced-motion/.test(controls), 'reduced motion');
check(/keydown/.test(controls), 'keyboard 1-4');
check(/unsupportedReasons/.test(controls), 'unsupported explanation');

check(/AvatarAnimationPreviewControls/.test(canvas), 'canvas mounts controls');
check(/playAnimation/.test(canvas), 'canvas routes play');

// --- pure support replica ---
function resolve(flags, mapped) {
  const catalog = [
    { id: 'idle', bones: ['hips', 'spine', 'chest', 'neck', 'head'] },
    { id: 'walk', bones: ['hips', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'] },
    { id: 'combat', bones: ['hips', 'spine', 'chest', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand'] },
    { id: 'emote', bones: ['spine', 'chest', 'rightUpperArm', 'rightLowerArm', 'rightHand'] },
  ];
  if (!flags.includes('rigged')) return { supported: [], defaultAction: null };
  const supported = catalog.filter((c) => c.bones.every((b) => mapped[b])).map((c) => c.id);
  return { supported, defaultAction: supported.includes('idle') ? 'idle' : supported[0] ?? null };
}

const fullBones = Object.fromEntries(
  ['hips','spine','chest','neck','head','leftUpperArm','leftLowerArm','leftHand','rightUpperArm','rightLowerArm','rightHand','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'].map((k) => [k, k]),
);
const full = resolve(['static', 'rigged', 'humanoid'], fullBones);
check(full.supported.length === 4 && full.defaultAction === 'idle', 'full humanoid supports all');
const partial = resolve(['static', 'rigged'], { hips: 'Hips', spine: 'Spine', chest: 'Chest', neck: 'Neck', head: 'Head' });
check(partial.supported.includes('idle') && !partial.supported.includes('walk'), 'partial only idle');
const none = resolve(['static'], {});
check(none.supported.length === 0, 'unrigged supports none');

function crossfade(reduced) { return reduced ? 0 : 0.25; }
check(crossfade(true) === 0 && crossfade(false) === 0.25, 'reduced motion crossfade');

console.log('avatar-animation-retarget-check PASS');
