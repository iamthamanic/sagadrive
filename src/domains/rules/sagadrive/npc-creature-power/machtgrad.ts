/**
 * Machtgrad display mapping from level 1–20.
 * Location: src/domains/rules/sagadrive/npc-creature-power/machtgrad.ts
 */
import type { SagaDriveMachtgrad, SagaDriveNpcLevel } from './types';

export const SAGADRIVE_MACHTGRAD_LABELS: Record<SagaDriveMachtgrad, string> = {
  gering: 'Gering',
  mittel: 'Mittel',
  hoch: 'Hoch',
  extrem: 'Extrem',
  legendaer: 'Legendär',
};

export function isSagaDriveNpcLevel(level: number): level is SagaDriveNpcLevel {
  return Number.isInteger(level) && level >= 1 && level <= 20;
}

export function assertSagaDriveNpcLevel(level: number): SagaDriveNpcLevel {
  if (!isSagaDriveNpcLevel(level)) {
    throw new Error(`NPC/Kreatur-Stufe muss 1–20 sein (erhalten: ${String(level)})`);
  }
  return level;
}

export function machtgradForLevel(level: number): SagaDriveMachtgrad {
  const lv = assertSagaDriveNpcLevel(level);
  if (lv <= 4) return 'gering';
  if (lv <= 8) return 'mittel';
  if (lv <= 12) return 'hoch';
  if (lv <= 16) return 'extrem';
  return 'legendaer';
}

export function machtgradLabelForLevel(level: number): string {
  return SAGADRIVE_MACHTGRAD_LABELS[machtgradForLevel(level)];
}
