/**
 * AI provider credential contracts — pure types for Settings BYOK UI.
 * Location: src/domains/ai-providers/contracts.ts
 */

export type AiModality = 'image' | '3d' | 'video' | 'audio';

export type AiProviderAuthKind = 'api_key';

export type AiProviderCredentialStatus = 'active' | 'invalid' | 'revoked';

export interface AiProviderCredentialMeta {
  credits?: number;
}

export interface AiProviderCredentialView {
  providerId: string;
  displayName: string;
  modalities: readonly AiModality[];
  auth: AiProviderAuthKind;
  docsUrl: string | null;
  configured: boolean;
  keyHint: string | null;
  status: AiProviderCredentialStatus | null;
  addedAt: string | null;
  lastValidatedAt: string | null;
  meta: AiProviderCredentialMeta;
}

/** Map Settings AI tab values to domain modality. */
export function settingsAiTabToModality(tab: 'bild' | '3d' | 'video' | 'audio'): AiModality {
  switch (tab) {
    case 'bild':
      return 'image';
    case '3d':
      return '3d';
    case 'video':
      return 'video';
    case 'audio':
      return 'audio';
  }
}

export function formatProviderAddedAt(iso: string | null, locale = 'de-DE'): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
