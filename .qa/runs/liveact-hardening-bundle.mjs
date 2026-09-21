// src/domains/character/liveact/liveact-face-contract.ts
var LIVEACT_FACE_CONTRACT_VERSION = "SagaDriveLiveActFaceV1";
var LIVEACT_FACE_CHANNELS = [
  "_neutral",
  "browDownLeft",
  "browDownRight",
  "browInnerUp",
  "browOuterUpLeft",
  "browOuterUpRight",
  "cheekPuff",
  "cheekSquintLeft",
  "cheekSquintRight",
  "eyeBlinkLeft",
  "eyeBlinkRight",
  "eyeLookDownLeft",
  "eyeLookDownRight",
  "eyeLookInLeft",
  "eyeLookInRight",
  "eyeLookOutLeft",
  "eyeLookOutRight",
  "eyeLookUpLeft",
  "eyeLookUpRight",
  "eyeSquintLeft",
  "eyeSquintRight",
  "eyeWideLeft",
  "eyeWideRight",
  "jawForward",
  "jawLeft",
  "jawOpen",
  "jawRight",
  "mouthClose",
  "mouthDimpleLeft",
  "mouthDimpleRight",
  "mouthFrownLeft",
  "mouthFrownRight",
  "mouthFunnel",
  "mouthLeft",
  "mouthLowerDownLeft",
  "mouthLowerDownRight",
  "mouthPressLeft",
  "mouthPressRight",
  "mouthPucker",
  "mouthRight",
  "mouthRollLower",
  "mouthRollUpper",
  "mouthShrugLower",
  "mouthShrugUpper",
  "mouthSmileLeft",
  "mouthSmileRight",
  "mouthStretchLeft",
  "mouthStretchRight",
  "mouthUpperUpLeft",
  "mouthUpperUpRight",
  "noseSneerLeft",
  "noseSneerRight"
];
function isLiveActFaceChannelId(value) {
  return typeof value === "string" && LIVEACT_FACE_CHANNELS.includes(value);
}
function clampLiveActChannel(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}
function createNeutralLiveActFaceChannels() {
  const out = {};
  for (const id of LIVEACT_FACE_CHANNELS) {
    out[id] = id === "_neutral" ? 1 : 0;
  }
  return out;
}
function mergeLiveActFaceChannels(partial) {
  const base = createNeutralLiveActFaceChannels();
  if (!partial) return base;
  for (const id of LIVEACT_FACE_CHANNELS) {
    const raw = partial[id];
    if (typeof raw === "number") {
      base[id] = clampLiveActChannel(raw);
    }
  }
  return base;
}
function assertLiveActFaceChannelsLocalOnly(channels) {
  const record = channels;
  if (record.landmarks !== void 0 || record.video !== void 0 || record.imageData !== void 0) {
    throw new Error("LiveAct-Face-Channels d\xFCrfen keine Rohvideo-/Landmark-Daten tragen.");
  }
}

// src/domains/character/liveact/liveact-contract.ts
var LIVEACT_CONTRACT_VERSION = "SagaDriveLiveActFrameV1";
var LIVEACT_STATUSES = [
  "idle",
  "starting",
  "active",
  "paused",
  "lost",
  "denied",
  "unsupported",
  "stopped",
  "error"
];
var DEFAULT_LIVEACT_LIMITS = {
  maxYaw: 0.55,
  maxPitch: 0.4,
  maxRoll: 0.35,
  presenceThreshold: 0.45,
  desktopFps: 30,
  mobileFps: 15,
  smooth: 0.35
};
var LIVEACT_QUALITY_PROFILES = {
  desktop: {
    id: "desktop",
    labelDe: "Desktop",
    fpsCap: DEFAULT_LIVEACT_LIMITS.desktopFps,
    enableHeadPose: true,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true
  },
  mobile: {
    id: "mobile",
    labelDe: "Mobile",
    fpsCap: DEFAULT_LIVEACT_LIMITS.mobileFps,
    enableHeadPose: false,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false
  }
};
function isLiveActStatus(value) {
  return typeof value === "string" && LIVEACT_STATUSES.includes(value);
}
function resolveLiveActQualityProfile(input) {
  const limits = input.limits ?? DEFAULT_LIVEACT_LIMITS;
  const useMobile = input.isMobile === true || typeof input.maxTouchPoints === "number" && input.maxTouchPoints > 1;
  if (useMobile) {
    return {
      ...LIVEACT_QUALITY_PROFILES.mobile,
      fpsCap: limits.mobileFps
    };
  }
  return {
    ...LIVEACT_QUALITY_PROFILES.desktop,
    fpsCap: limits.desktopFps
  };
}
function clampLiveActAngle(value, maxAbs) {
  if (!Number.isFinite(value)) return 0;
  if (value > maxAbs) return maxAbs;
  if (value < -maxAbs) return -maxAbs;
  return value;
}
function clampLiveActGaze(value) {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return 1;
  if (value < -1) return -1;
  return value;
}
function selectPrimaryLiveActFaceIndex(faces) {
  if (faces.length === 0) return -1;
  let best = 0;
  let bestScore = faces[0]?.presence ?? 0;
  for (let i = 1; i < faces.length; i += 1) {
    const score = faces[i]?.presence ?? 0;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return best;
}
function createEmptyLiveActSourceSample() {
  return {
    presence: 0,
    headYaw: 0,
    headPitch: 0,
    headRoll: 0,
    eyeLeftX: 0,
    eyeLeftY: 0,
    eyeRightX: 0,
    eyeRightY: 0,
    face: {},
    faceIndex: -1,
    faceCount: 0
  };
}
function createNeutralLiveActFrame(input) {
  return {
    contractVersion: LIVEACT_CONTRACT_VERSION,
    faceContractVersion: LIVEACT_FACE_CONTRACT_VERSION,
    timestampMs: input.timestampMs,
    sequence: input.sequence,
    confidence: 0,
    trackingLost: input.trackingLost ?? true,
    head: { yaw: 0, pitch: 0, roll: 0 },
    eyeLeft: { x: 0, y: 0 },
    eyeRight: { x: 0, y: 0 },
    face: createNeutralLiveActFaceChannels()
  };
}
function mapLiveActSourceSample(sample, input) {
  const limits = input.limits ?? DEFAULT_LIVEACT_LIMITS;
  const lost = sample.presence < limits.presenceThreshold || sample.faceIndex < 0;
  if (lost) {
    return createNeutralLiveActFrame({
      timestampMs: input.timestampMs,
      sequence: input.sequence,
      trackingLost: true
    });
  }
  const face = mergeLiveActFaceChannels(sample.face);
  assertLiveActFaceChannelsLocalOnly(face);
  return {
    contractVersion: LIVEACT_CONTRACT_VERSION,
    faceContractVersion: LIVEACT_FACE_CONTRACT_VERSION,
    timestampMs: input.timestampMs,
    sequence: input.sequence,
    confidence: clampLiveActChannel(sample.presence),
    trackingLost: false,
    head: {
      yaw: clampLiveActAngle(sample.headYaw, limits.maxYaw),
      pitch: clampLiveActAngle(sample.headPitch, limits.maxPitch),
      roll: clampLiveActAngle(sample.headRoll, limits.maxRoll)
    },
    eyeLeft: {
      x: clampLiveActGaze(sample.eyeLeftX),
      y: clampLiveActGaze(sample.eyeLeftY)
    },
    eyeRight: {
      x: clampLiveActGaze(sample.eyeRightX),
      y: clampLiveActGaze(sample.eyeRightY)
    },
    face
  };
}
function smoothLiveActFrame(previous, next, alpha = DEFAULT_LIVEACT_LIMITS.smooth) {
  const t = clampLiveActChannel(alpha);
  if (!previous || next.trackingLost) {
    if (!previous) return next;
    const ease = clampLiveActChannel(t * 0.65);
    return {
      ...createNeutralLiveActFrame({
        timestampMs: next.timestampMs,
        sequence: next.sequence,
        trackingLost: true
      }),
      head: {
        yaw: previous.head.yaw * (1 - ease),
        pitch: previous.head.pitch * (1 - ease),
        roll: previous.head.roll * (1 - ease)
      },
      eyeLeft: {
        x: previous.eyeLeft.x * (1 - ease),
        y: previous.eyeLeft.y * (1 - ease)
      },
      eyeRight: {
        x: previous.eyeRight.x * (1 - ease),
        y: previous.eyeRight.y * (1 - ease)
      }
    };
  }
  const lerp = (a, b) => a + (b - a) * t;
  const face = createNeutralLiveActFaceChannels();
  for (const key of Object.keys(face)) {
    face[key] = lerp(previous.face[key] ?? 0, next.face[key] ?? 0);
  }
  return {
    contractVersion: LIVEACT_CONTRACT_VERSION,
    faceContractVersion: LIVEACT_FACE_CONTRACT_VERSION,
    timestampMs: next.timestampMs,
    sequence: next.sequence,
    confidence: lerp(previous.confidence, next.confidence),
    trackingLost: false,
    head: {
      yaw: lerp(previous.head.yaw, next.head.yaw),
      pitch: lerp(previous.head.pitch, next.head.pitch),
      roll: lerp(previous.head.roll, next.head.roll)
    },
    eyeLeft: {
      x: lerp(previous.eyeLeft.x, next.eyeLeft.x),
      y: lerp(previous.eyeLeft.y, next.eyeLeft.y)
    },
    eyeRight: {
      x: lerp(previous.eyeRight.x, next.eyeRight.x),
      y: lerp(previous.eyeRight.y, next.eyeRight.y)
    },
    face
  };
}
function liveActStatusLabelDe(status) {
  switch (status) {
    case "idle":
      return "LiveAct aus";
    case "starting":
      return "Kamera wird vorbereitet \u2026";
    case "active":
      return "LiveAct aktiv";
    case "paused":
      return "LiveAct pausiert (Tab im Hintergrund)";
    case "lost":
      return "Gesicht verloren \u2014 weiche R\xFCckkehr zu Neutral";
    case "denied":
      return "Kamerazugriff verweigert \u2014 bitte Browser-Berechtigung pr\xFCfen";
    case "unsupported":
      return "LiveAct wird in diesem Browser nicht unterst\xFCtzt";
    case "stopped":
      return "LiveAct gestoppt";
    case "error":
      return "LiveAct Fehler \u2014 bitte erneut starten";
    default:
      return "LiveAct";
  }
}
function assertLiveActFrameLocalOnly(frame) {
  const record = frame;
  if (record.landmarks !== void 0 || record.video !== void 0 || record.imageData !== void 0 || record.serialize !== void 0) {
    throw new Error("LiveActFrame darf keine Rohvideo-/Landmark-/Serialize-Daten tragen.");
  }
  assertLiveActFaceChannelsLocalOnly(frame.face);
}

// src/domains/character/liveact/liveact-capabilities.ts
var LIVEACT_CAPABILITIES_VERSION = "SagaDriveLiveActCapabilitiesV1";
function createEmptyLiveActAvatarFaceSupport() {
  const out = {};
  for (const id of LIVEACT_FACE_CHANNELS) {
    out[id] = false;
  }
  return out;
}
function createLiveActCapabilities(input) {
  const avatarFace = createEmptyLiveActAvatarFaceSupport();
  let active = 0;
  for (const id of LIVEACT_FACE_CHANNELS) {
    const supported = input.avatarFace?.[id] === true;
    avatarFace[id] = supported;
    if (supported) active += 1;
  }
  return {
    contractVersion: LIVEACT_CAPABILITIES_VERSION,
    input: {
      face: input.face === true,
      headPose: input.headPose === true,
      eyeGaze: input.eyeGaze === true
    },
    avatarBones: {
      head: input.headBone === true,
      leftEye: input.leftEyeBone === true,
      rightEye: input.rightEyeBone === true
    },
    avatarFace,
    activeFaceChannelCount: active,
    totalFaceChannelCount: LIVEACT_FACE_CHANNELS.length
  };
}

// src/domains/character/liveact/liveact-capability-inspector.ts
var INSPECTOR_FACE_CHANNEL_IDS = [
  "eyeBlinkLeft",
  "eyeBlinkRight",
  "jawOpen",
  "mouthSmileLeft",
  "mouthSmileRight",
  "mouthFrownLeft",
  "mouthFrownRight",
  "mouthPucker",
  "mouthShrugUpper",
  "mouthShrugLower"
];
function faceChannelLabelDe(id) {
  return id;
}
function buildLiveActCapabilityInspectorRows(caps) {
  const rows = [
    {
      id: "head",
      labelDe: "Kopf",
      input: caps.input.headPose,
      mapping: caps.input.headPose,
      avatar: caps.avatarBones.head
    },
    {
      id: "leftEye",
      labelDe: "Auge links",
      input: caps.input.eyeGaze,
      mapping: caps.input.eyeGaze,
      avatar: caps.avatarBones.leftEye
    },
    {
      id: "rightEye",
      labelDe: "Auge rechts",
      input: caps.input.eyeGaze,
      mapping: caps.input.eyeGaze,
      avatar: caps.avatarBones.rightEye
    }
  ];
  const faceIds = /* @__PURE__ */ new Set();
  for (const id of INSPECTOR_FACE_CHANNEL_IDS) faceIds.add(id);
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === "_neutral") continue;
    if (caps.avatarFace[id]) faceIds.add(id);
  }
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === "_neutral" || !faceIds.has(id)) continue;
    rows.push({
      id: `face:${id}`,
      labelDe: faceChannelLabelDe(id),
      input: caps.input.face,
      mapping: caps.input.face,
      avatar: caps.avatarFace[id]
    });
  }
  return rows;
}

// src/domains/character/liveact/liveact-channel-target-aliases.ts
function pascalCase(id) {
  if (!id.length) return id;
  if (id.startsWith("_")) return id;
  return id.charAt(0).toUpperCase() + id.slice(1);
}
function aliasesForChannel(id) {
  const list = [id];
  const pascal = pascalCase(id);
  if (pascal !== id) list.push(pascal);
  return list;
}
var LIVEACT_CHANNEL_TARGET_ALIASES = Object.fromEntries(
  LIVEACT_FACE_CHANNELS.map((id) => [id, aliasesForChannel(id)])
);
function resolveLiveActChannelTargets(presentTargetNames) {
  const present = new Set(presentTargetNames);
  const faceSupport = createEmptyLiveActAvatarFaceSupport();
  const resolvedNames = {};
  for (const id of LIVEACT_FACE_CHANNELS) {
    const aliases = LIVEACT_CHANNEL_TARGET_ALIASES[id];
    const match = aliases.find((alias) => present.has(alias));
    if (match) {
      faceSupport[id] = true;
      resolvedNames[id] = match;
    }
  }
  return { faceSupport, resolvedNames };
}

// src/domains/character/liveact/liveact-face-diagnostics.ts
var LIVEACT_FACE_DIAGNOSTICS_VERSION = "SagaDriveLiveActFaceDiagnosticsV1";
function createEmptyLiveActFaceDiagnosticsFrame(input) {
  const empty = [];
  return {
    contractVersion: LIVEACT_FACE_DIAGNOSTICS_VERSION,
    timestampMs: input.timestampMs,
    sequence: input.sequence,
    trackingLost: true,
    faceIndex: -1,
    faceCount: 0,
    landmarks: empty,
    contours: {
      faceOval: empty,
      lips: empty,
      leftEye: empty,
      rightEye: empty,
      leftEyebrow: empty,
      rightEyebrow: empty
    }
  };
}
function assertLiveActFaceDiagnosticsLocalOnly(frame) {
  const record = frame;
  if (record.video !== void 0 || record.imageData !== void 0 || record.serialize !== void 0 || record.blob !== void 0) {
    throw new Error("LiveAct-Diagnostics d\xFCrfen keine Rohvideo-/Blob-/Serialize-Daten tragen.");
  }
}

// src/domains/character/liveact/liveact-calibration.ts
var LIVEACT_CALIBRATION_FRAME_TARGET = 30;
var LIVEACT_CALIBRATION_TIMEOUT_MS = 2e3;
function createLiveActCalibrationAccumulator() {
  const faceSums = {};
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === "_neutral") continue;
    faceSums[id] = 0;
  }
  return {
    count: 0,
    headYawSum: 0,
    headPitchSum: 0,
    headRollSum: 0,
    eyeLeftXSum: 0,
    eyeLeftYSum: 0,
    eyeRightXSum: 0,
    eyeRightYSum: 0,
    faceSums,
    headPoseSupported: true
  };
}
function isValidLiveActCalibrationSample(sample, limits = DEFAULT_LIVEACT_LIMITS) {
  return sample.faceIndex >= 0 && sample.presence >= limits.presenceThreshold;
}
function pushLiveActCalibrationSample(acc, sample, options) {
  const limits = options.limits ?? DEFAULT_LIVEACT_LIMITS;
  if (!isValidLiveActCalibrationSample(sample, limits)) {
    return false;
  }
  acc.count += 1;
  acc.headYawSum += sample.headYaw;
  acc.headPitchSum += sample.headPitch;
  acc.headRollSum += sample.headRoll;
  acc.eyeLeftXSum += sample.eyeLeftX;
  acc.eyeLeftYSum += sample.eyeLeftY;
  acc.eyeRightXSum += sample.eyeRightX;
  acc.eyeRightYSum += sample.eyeRightY;
  acc.headPoseSupported = options.headPoseSupported;
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === "_neutral") continue;
    const value = sample.face[id];
    if (typeof value === "number" && Number.isFinite(value)) {
      acc.faceSums[id] = (acc.faceSums[id] ?? 0) + value;
    }
  }
  return true;
}
function finalizeLiveActCalibration(acc) {
  if (acc.count < LIVEACT_CALIBRATION_FRAME_TARGET) {
    return null;
  }
  const n = acc.count;
  const face = createNeutralLiveActFaceChannels();
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === "_neutral") continue;
    const sum = acc.faceSums[id] ?? 0;
    face[id] = clampLiveActChannel(sum / n);
  }
  return {
    head: {
      yaw: acc.headYawSum / n,
      pitch: acc.headPitchSum / n,
      roll: acc.headRollSum / n
    },
    eyeLeft: { x: acc.eyeLeftXSum / n, y: acc.eyeLeftYSum / n },
    eyeRight: { x: acc.eyeRightXSum / n, y: acc.eyeRightYSum / n },
    face,
    headPoseSupported: acc.headPoseSupported
  };
}
function applyLiveActNeutralBaseline(frame, baseline, limits = DEFAULT_LIVEACT_LIMITS) {
  if (!baseline || frame.trackingLost) {
    return frame;
  }
  const face = createNeutralLiveActFaceChannels();
  for (const id of LIVEACT_FACE_CHANNELS) {
    if (id === "_neutral") {
      face._neutral = frame.face._neutral;
      continue;
    }
    const raw = (frame.face[id] ?? 0) - (baseline.face[id] ?? 0);
    face[id] = clampLiveActChannel(raw);
  }
  const head = baseline.headPoseSupported ? {
    yaw: clampLiveActAngle(frame.head.yaw - baseline.head.yaw, limits.maxYaw),
    pitch: clampLiveActAngle(frame.head.pitch - baseline.head.pitch, limits.maxPitch),
    roll: clampLiveActAngle(frame.head.roll - baseline.head.roll, limits.maxRoll)
  } : frame.head;
  return {
    ...frame,
    head,
    eyeLeft: {
      x: clampLiveActGaze(frame.eyeLeft.x - baseline.eyeLeft.x),
      y: clampLiveActGaze(frame.eyeLeft.y - baseline.eyeLeft.y)
    },
    eyeRight: {
      x: clampLiveActGaze(frame.eyeRight.x - baseline.eyeRight.x),
      y: clampLiveActGaze(frame.eyeRight.y - baseline.eyeRight.y)
    },
    face
  };
}

// src/domains/character/liveact/liveact-runtime-policy.ts
var LIVEACT_UI_STATUS_MAX_HZ = 5;
var LIVEACT_INFERENCE_MAX_IN_FLIGHT = 1;
function liveActUiStatusMinIntervalMs(maxHz = LIVEACT_UI_STATUS_MAX_HZ) {
  return 1e3 / Math.max(1, maxHz);
}
function shouldThrottleLiveActUiStatus(lastEmitMs, nowMs, maxHz = LIVEACT_UI_STATUS_MAX_HZ) {
  if (lastEmitMs <= 0) return false;
  return nowMs - lastEmitMs < liveActUiStatusMinIntervalMs(maxHz);
}
function shouldDropLiveActInferenceTick(inFlightCount, maxInFlight = LIVEACT_INFERENCE_MAX_IN_FLIGHT) {
  return inFlightCount >= Math.max(1, maxInFlight);
}
export {
  DEFAULT_LIVEACT_LIMITS,
  LIVEACT_CALIBRATION_FRAME_TARGET,
  LIVEACT_CALIBRATION_TIMEOUT_MS,
  LIVEACT_CAPABILITIES_VERSION,
  LIVEACT_CHANNEL_TARGET_ALIASES,
  LIVEACT_CONTRACT_VERSION,
  LIVEACT_FACE_CHANNELS,
  LIVEACT_FACE_CONTRACT_VERSION,
  LIVEACT_FACE_DIAGNOSTICS_VERSION,
  LIVEACT_INFERENCE_MAX_IN_FLIGHT,
  LIVEACT_QUALITY_PROFILES,
  LIVEACT_STATUSES,
  LIVEACT_UI_STATUS_MAX_HZ,
  applyLiveActNeutralBaseline,
  assertLiveActFaceChannelsLocalOnly,
  assertLiveActFaceDiagnosticsLocalOnly,
  assertLiveActFrameLocalOnly,
  buildLiveActCapabilityInspectorRows,
  clampLiveActAngle,
  clampLiveActChannel,
  clampLiveActGaze,
  createEmptyLiveActAvatarFaceSupport,
  createEmptyLiveActFaceDiagnosticsFrame,
  createEmptyLiveActSourceSample,
  createLiveActCalibrationAccumulator,
  createLiveActCapabilities,
  createNeutralLiveActFaceChannels,
  createNeutralLiveActFrame,
  finalizeLiveActCalibration,
  isLiveActFaceChannelId,
  isLiveActStatus,
  isValidLiveActCalibrationSample,
  liveActStatusLabelDe,
  liveActUiStatusMinIntervalMs,
  mapLiveActSourceSample,
  mergeLiveActFaceChannels,
  pushLiveActCalibrationSample,
  resolveLiveActChannelTargets,
  resolveLiveActQualityProfile,
  selectPrimaryLiveActFaceIndex,
  shouldDropLiveActInferenceTick,
  shouldThrottleLiveActUiStatus,
  smoothLiveActFrame
};
