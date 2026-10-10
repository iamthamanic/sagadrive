/**
 * saga-primary-action — Pure resolver for the saga hub primary CTA (#570).
 * Location: src/domains/project/use-cases/saga-primary-action.ts
 *
 * Server embeds a hint; UI may re-resolve from overview episodes + role.
 */

import type {
  SagaOverviewRole,
  SagaOverviewVm,
  SagaPrimaryAction,
} from '../contracts/saga-overview';

const OPEN_STATUSES = new Set(['scheduled', 'active', 'paused']);

function latestOpenEpisode(vm: SagaOverviewVm) {
  let best: (typeof vm.episodes)[number] | null = null;
  for (const ep of vm.episodes) {
    if (!OPEN_STATUSES.has(ep.status)) continue;
    if (!best || ep.sessionNumber > best.sessionNumber) best = ep;
  }
  return best;
}

function latestEpisode(vm: SagaOverviewVm) {
  let best: (typeof vm.episodes)[number] | null = null;
  for (const ep of vm.episodes) {
    if (!best || ep.sessionNumber > best.sessionNumber) best = ep;
  }
  return best;
}

/**
 * Resolve the single primary hub action from overview + role.
 * Prefers open sessions; GM hosts when none; players/viewers wait.
 */
export function resolveSagaPrimaryAction(
  vm: SagaOverviewVm,
  role: SagaOverviewRole = vm.selfRole,
): SagaPrimaryAction {
  const open = latestOpenEpisode(vm);
  const latest = latestEpisode(vm);

  if (role === 'gamemaster') {
    if (open) {
      return {
        kind: 'continue-session',
        labelDe: 'Session fortsetzen',
        sessionPublicId: open.sessionPublicId,
      };
    }
    return {
      kind: 'host-session',
      labelDe: 'Session hosten',
      sessionPublicId: null,
    };
  }

  if (open || latest) {
    const target = open ?? latest;
    return {
      kind: 'join-session',
      labelDe: role === 'viewer' ? 'Session beobachten' : 'Zur Session',
      sessionPublicId: target ? target.sessionPublicId : null,
    };
  }

  return {
    kind: 'wait',
    labelDe: 'Warten auf Einladung',
    sessionPublicId: null,
  };
}
