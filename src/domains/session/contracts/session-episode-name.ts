/**
 * session-episode-name — Auto episode labels for play sessions (e.g. "Dornhain Saga E001").
 * Location: src/domains/session/contracts/session-episode-name.ts
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Next episode name for a saga: "{SagaName} E001", then E002, …
 * Counts only existing names that already match "{SagaName} E###".
 */
export function nextEpisodeSessionName(
  sagaName: string,
  existingSessionNames: readonly string[],
): string {
  const base = sagaName.trim() || 'Saga';
  const re = new RegExp(`^${escapeRegExp(base)}\\s+E(\\d+)$`, 'i');
  let max = 0;
  for (const name of existingSessionNames) {
    const match = name.trim().match(re);
    if (!match) continue;
    const n = Number.parseInt(match[1] ?? '', 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${base} E${String(max + 1).padStart(3, '0')}`;
}
