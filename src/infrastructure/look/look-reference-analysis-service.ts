/**
 * look-reference-analysis-service — Edge adapter for Basic Look reference analysis (#352).
 * Location: src/infrastructure/look/look-reference-analysis-service.ts
 *
 * Invokes the edge function, then applies domain normalization. Invalid payloads
 * never become LookProfileWriteDrafts (not saved).
 */
import {
  normalizeLookReferenceAnalysisPayload,
  type LookReferenceAnalysisImageInput,
  type LookReferenceAnalysisOutcome,
  type LookReferenceAnalyzer,
} from '../../domains/look';
import { supabase } from '../../lib/supabase';

export type LookReferenceAnalysisRequestImage = LookReferenceAnalysisImageInput & {
  /** Inline image for edge vision call. */
  readonly contentBase64?: string;
  /** Owner-scoped storage path alternative to contentBase64. */
  readonly storagePath?: string;
};

export type LookReferenceAnalysisRequest = {
  readonly references: readonly LookReferenceAnalysisRequestImage[];
  readonly displayNameHint?: string;
};

type EdgeOk = {
  status: 'ok';
  payload: Record<string, unknown>;
  analyzedAtIso: string;
};

type EdgeFail = {
  status: 'not-configured' | 'error';
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseEdgeResponse(value: unknown): EdgeOk | EdgeFail {
  if (!isRecord(value) || typeof value.status !== 'string') {
    return {
      status: 'error',
      message: 'Die Analyse-Antwort hatte ein ungültiges Format.',
    };
  }
  if (
    value.status === 'ok' &&
    isRecord(value.payload) &&
    typeof value.analyzedAtIso === 'string'
  ) {
    return {
      status: 'ok',
      payload: value.payload,
      analyzedAtIso: value.analyzedAtIso,
    };
  }
  if (
    (value.status === 'not-configured' || value.status === 'error') &&
    typeof value.message === 'string'
  ) {
    return { status: value.status, message: value.message };
  }
  return {
    status: 'error',
    message: 'Die Analyse-Antwort hatte ein ungültiges Format.',
  };
}

function hasResponseContext(error: unknown): error is { context: Response } {
  return isRecord(error) && error.context instanceof Response;
}

async function getFunctionErrorMessage(error: unknown): Promise<string | undefined> {
  if (!hasResponseContext(error)) return undefined;
  try {
    const responseBody: unknown = await error.context.clone().json();
    const parsed = parseEdgeResponse(responseBody);
    return parsed.status === 'ok' ? undefined : parsed.message;
  } catch {
    return undefined;
  }
}

/**
 * Analyze references via edge + domain normalize.
 * Does not persist — callers must save only when outcome.ok.
 */
export async function analyzeLookReferences(
  request: LookReferenceAnalysisRequest,
): Promise<LookReferenceAnalysisOutcome> {
  const domainInputs: LookReferenceAnalysisImageInput[] = request.references.map(
    (ref) => ({
      id: ref.id,
      kind: ref.kind,
      mime: ref.mime,
      uri: ref.uri,
      weight: ref.weight,
      label: ref.label,
    }),
  );

  const { data, error } = await supabase.functions.invoke(
    'look-reference-analysis',
    {
      body: {
        action: 'analyze',
        displayNameHint: request.displayNameHint,
        references: request.references.map((ref) => ({
          id: ref.id,
          kind: ref.kind,
          mime: ref.mime,
          uri: ref.uri,
          weight: ref.weight,
          label: ref.label,
          contentBase64: ref.contentBase64,
          storagePath: ref.storagePath,
        })),
      },
    },
  );

  if (error) {
    const serverMessage = await getFunctionErrorMessage(error);
    return {
      ok: false,
      code: 'edge-error',
      messageDe:
        serverMessage ??
        'Look-Referenzanalyse fehlgeschlagen. Bitte erneut versuchen.',
    };
  }

  const edge = parseEdgeResponse(data);
  if (edge.status !== 'ok') {
    return {
      ok: false,
      code: edge.status,
      messageDe: edge.message,
    };
  }

  return normalizeLookReferenceAnalysisPayload(edge.payload, {
    references: domainInputs,
    displayNameHint: request.displayNameHint,
    analyzedAtIso: edge.analyzedAtIso,
  });
}

/** Infrastructure analyzer implementing the domain contract. */
export function createEdgeLookReferenceAnalyzer(): LookReferenceAnalyzer {
  return {
    async analyze(input) {
      return analyzeLookReferences({
        references: input.references,
        displayNameHint: input.displayNameHint,
      });
    },
  };
}
