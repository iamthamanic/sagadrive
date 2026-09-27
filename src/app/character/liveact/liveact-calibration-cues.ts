/**
 * liveact-calibration-cues — short Web Audio beeps for stepped calibration holds.
 * Location: src/app/character/liveact/liveact-calibration-cues.ts
 *
 * start / per-second tick / hold-done / session-complete. Best-effort; never throws into UI.
 */

type CueKind = 'start' | 'tick' | 'done' | 'complete';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioContext) {
    try {
      audioContext = new AC();
    } catch (error) {
      console.warn('[liveact] calibration audio: AudioContext unavailable', error);
      return null;
    }
  }
  return audioContext;
}

function beep(frequencyHz: number, durationMs: number, gain = 0.08): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);
  try {
    const oscillator = ctx.createOscillator();
    const amp = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequencyHz;
    amp.gain.value = gain;
    const now = ctx.currentTime;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    oscillator.connect(amp);
    amp.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000 + 0.02);
  } catch (error) {
    console.warn('[liveact] calibration audio: beep failed', error);
  }
}

/** Play a calibration hold cue. Safe to call from React effects. */
export function playLiveActCalibrationCue(kind: CueKind): void {
  switch (kind) {
    case 'start':
      beep(660, 90, 0.07);
      break;
    case 'tick':
      beep(520, 60, 0.05);
      break;
    case 'done':
      beep(880, 120, 0.09);
      setTimeout(() => beep(1175, 140, 0.09), 140);
      break;
    case 'complete':
      beep(784, 100, 0.08);
      setTimeout(() => beep(988, 120, 0.08), 120);
      setTimeout(() => beep(1319, 180, 0.09), 260);
      break;
    default:
      break;
  }
}
