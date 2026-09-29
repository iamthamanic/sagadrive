/**
 * face-mapping-gt-mark-copy — separate GT mark success from clipboard convenience (#421 P3).
 * Location: src/app/character/liveact/face-mapping-gt-mark-copy.ts
 *
 * Ground Truth freeze must not be rolled back or reported as failed when clipboard
 * writeText rejects (self-hosted / permission denied).
 */

export type FaceMappingGtMarkCopyResult =
  | 'mark_failed'
  | 'copied'
  | 'copy_failed';

export function faceMappingGtMarkCopyLabelDe(result: FaceMappingGtMarkCopyResult): string {
  switch (result) {
    case 'mark_failed':
      return 'Ground Truth konnte nicht markiert werden';
    case 'copied':
      return 'GT markiert & kopiert';
    case 'copy_failed':
      return 'GT markiert · Kopieren fehlgeschlagen';
    default:
      return 'Als Ground Truth markieren';
  }
}

/**
 * Run GT mark first; clipboard is best-effort convenience only.
 * mark() returning null or throwing → mark_failed (clipboard not attempted).
 */
export async function runFaceMappingGtMarkAndCopy(params: {
  readonly mark: () => string | null;
  readonly writeText: (text: string) => Promise<void>;
}): Promise<FaceMappingGtMarkCopyResult> {
  let json: string | null;
  try {
    json = params.mark();
  } catch (error) {
    console.warn('[face-mapping] GT mark failed', error);
    return 'mark_failed';
  }
  if (!json) return 'mark_failed';
  try {
    await params.writeText(json);
    return 'copied';
  } catch (error) {
    console.warn('[face-mapping] GT JSON clipboard failed', error);
    return 'copy_failed';
  }
}
