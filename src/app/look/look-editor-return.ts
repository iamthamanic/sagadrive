/**
 * look-editor-return — sessionStorage return path for Look Editor navigation (#350).
 * Location: src/app/look/look-editor-return.ts
 *
 * World (and other hosts) set a return path before opening Library Look Editor;
 * Look Edit screen consumes it on Zurück so the GM lands back in context.
 */
const STORAGE_KEY = 'sagadrive:look-editor-return';

export function setLookEditorReturnPath(path: string): void {
  if (typeof sessionStorage === 'undefined') return;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return;
  sessionStorage.setItem(STORAGE_KEY, trimmed);
}

export function takeLookEditorReturnPath(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const value = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  if (!value || !value.startsWith('/')) return null;
  return value;
}

export function peekLookEditorReturnPath(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const value = sessionStorage.getItem(STORAGE_KEY);
  if (!value || !value.startsWith('/')) return null;
  return value;
}
