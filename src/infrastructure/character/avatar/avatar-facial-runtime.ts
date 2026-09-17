/**
 * avatar-facial-runtime — VRM expression adapter for blink/emotion/viseme (#11).
 * Location: src/infrastructure/character/avatar/avatar-facial-runtime.ts
 *
 * Maps canonical SagaDrive facial keys onto VRM0/VRM1 expression names.
 * Transient weights only — never written into appearance.avatar.
 */

import type { VRM } from '@pixiv/three-vrm';
import {
  FACIAL_CANONICAL_KEYS,
  applyFacialLayerUpdate,
  clampFacialWeight,
  createNeutralFacialWeights,
  resolveFacialAvailability,
  type FacialAvailability,
  type FacialCanonicalKey,
} from '../../../domains/character/avatar/facial-contract';

export interface AvatarFacialRuntimeState {
  availability: FacialAvailability;
  weights: Readonly<Partial<Record<FacialCanonicalKey, number>>>;
  message: string;
}

type FacialStateListener = (state: AvatarFacialRuntimeState) => void;

function listVrmExpressionNames(vrm: VRM | undefined): string[] {
  const manager = vrm?.expressionManager;
  if (!manager) return [];
  const names: string[] = [];
  // three-vrm exposes expressions via getExpression / expressionMap depending on version.
  const map = (manager as { expressionMap?: Record<string, unknown> }).expressionMap;
  if (map && typeof map === 'object') {
    names.push(...Object.keys(map));
  }
  for (const key of FACIAL_CANONICAL_KEYS) {
    // Probe known aliases via getExpression if available.
    const getExpression = (
      manager as { getExpression?: (name: string) => unknown }
    ).getExpression;
    if (typeof getExpression !== 'function') continue;
    // Already covered if expressionMap present; keep probe for sparse managers.
    void getExpression;
  }
  return names;
}

export class AvatarFacialRuntime {
  private vrm?: VRM;
  private availability: FacialAvailability = resolveFacialAvailability([]);
  private weights: Partial<Record<FacialCanonicalKey, number>> = createNeutralFacialWeights();
  private disposed = false;

  constructor(private readonly onStateChange?: FacialStateListener) {}

  bind(vrm: VRM | undefined): void {
    this.resetInternal(false);
    this.vrm = vrm;
    const present = listVrmExpressionNames(vrm);
    // Also accept preset names that setValue can resolve even if map keys differ in casing.
    const expanded = new Set(present);
    if (vrm?.expressionManager) {
      for (const key of FACIAL_CANONICAL_KEYS) {
        for (const alias of [
          key,
          key.charAt(0).toUpperCase() + key.slice(1),
          key.toUpperCase(),
        ]) {
          try {
            const expr = vrm.expressionManager.getExpression?.(alias);
            if (expr) expanded.add(alias);
          } catch {
            // ignore unknown
          }
        }
      }
      // Known VRM presets often registered even when expressionMap iteration differs.
      for (const alias of [
        'blink',
        'neutral',
        'happy',
        'angry',
        'sad',
        'aa',
        'ih',
        'ou',
        'ee',
        'oh',
        'joy',
        'anger',
        'sorrow',
        'A',
        'I',
        'U',
        'E',
        'O',
      ]) {
        try {
          if (vrm.expressionManager.getExpression?.(alias)) expanded.add(alias);
        } catch {
          // ignore
        }
      }
    }
    this.availability = resolveFacialAvailability([...expanded]);
    this.weights = createNeutralFacialWeights();
    this.applyAllWeights();
    this.emit(
      this.availability.available.length > 0
        ? `Facial bereit (${this.availability.available.length} Expressions).`
        : 'Keine VRM-Expressions erkannt — Facial fail-soft.',
    );
  }

  getAvailability(): FacialAvailability {
    return this.availability;
  }

  getWeights(): Readonly<Partial<Record<FacialCanonicalKey, number>>> {
    return this.weights;
  }

  setWeight(key: FacialCanonicalKey, weight: number): boolean {
    if (this.disposed) return false;
    if (!this.availability.available.includes(key)) {
      this.emit(this.availability.missingReasons[key] ?? 'Expression nicht verfügbar.');
      return false;
    }
    this.weights = applyFacialLayerUpdate(this.weights, key, weight);
    this.applyAllWeights();
    this.emit(`Facial: ${key}=${clampFacialWeight(weight).toFixed(2)}`);
    return true;
  }

  /** Reset to Neutral; clears blink + visemes; no stuck weights. */
  resetToNeutral(): void {
    this.weights = createNeutralFacialWeights();
    this.vrm?.expressionManager?.resetValues?.();
    this.applyAllWeights();
    this.emit('Facial: Neutral');
  }

  dispose(): void {
    this.disposed = true;
    this.resetInternal(true);
    this.vrm = undefined;
  }

  private resetInternal(emit: boolean): void {
    this.vrm?.expressionManager?.resetValues?.();
    this.weights = createNeutralFacialWeights();
    this.availability = resolveFacialAvailability([]);
    if (emit) this.emit('Facial zurückgesetzt.');
  }

  private applyAllWeights(): void {
    const manager = this.vrm?.expressionManager;
    if (!manager) return;
    for (const key of FACIAL_CANONICAL_KEYS) {
      const name = this.availability.resolvedNames[key];
      if (!name) continue;
      const weight = clampFacialWeight(this.weights[key] ?? 0);
      try {
        manager.setValue(name, weight);
      } catch {
        // fail-soft per missing runtime binding
      }
    }
  }

  private emit(message: string): void {
    this.onStateChange?.({
      availability: this.availability,
      weights: this.weights,
      message,
    });
  }
}
