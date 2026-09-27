/**
 * Look library query helpers — filter/search for Bibliothek › Looks (#343).
 * Location: src/domains/look/library-query.ts
 */

import type { LookProfileRecord, LookProfileStatus, LookSource } from './types';

export const LOOK_SOURCE_STYLE_FAMILY_LABELS: Record<LookSource, string> = {
  manual: 'Manuell',
  preset: 'Preset',
  'reference-analysis': 'Referenzanalyse',
  imported: 'Importiert',
};

export const LOOK_STATUS_LABELS: Record<LookProfileStatus, string> = {
  active: 'Aktiv',
  archived: 'Archiviert',
};

export type LookLibraryFilters = {
  readonly status: 'all' | LookProfileStatus;
  readonly source: 'all' | LookSource;
};

export const EMPTY_LOOK_LIBRARY_FILTERS: LookLibraryFilters = {
  status: 'all',
  source: 'all',
};

export function lookStyleFamilyLabel(source: LookSource): string {
  return LOOK_SOURCE_STYLE_FAMILY_LABELS[source] ?? source;
}

export function lookStatusLabel(status: LookProfileStatus): string {
  return LOOK_STATUS_LABELS[status] ?? status;
}

/** First style reference URI, if any — used as preview hint. */
export function lookPreviewUri(record: LookProfileRecord): string | null {
  const style = record.current.references.find((ref) => ref.kind === 'style');
  if (style?.uri) return style.uri;
  return null;
}

export function hasActiveLookLibraryFilters(filters: LookLibraryFilters): boolean {
  return filters.status !== 'all' || filters.source !== 'all';
}

export function filterLookLibraryCatalog(
  records: readonly LookProfileRecord[],
  searchQuery: string,
  filters: LookLibraryFilters,
): LookProfileRecord[] {
  const needle = searchQuery.trim().toLowerCase();
  return records.filter((record) => {
    if (filters.status !== 'all' && record.status !== filters.status) return false;
    if (filters.source !== 'all' && record.current.source !== filters.source) return false;
    if (!needle) return true;
    const name = record.current.displayName.toLowerCase();
    const family = lookStyleFamilyLabel(record.current.source).toLowerCase();
    const id = record.profile.id.toLowerCase();
    return name.includes(needle) || family.includes(needle) || id.includes(needle);
  });
}
