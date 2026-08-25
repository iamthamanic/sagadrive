import { supabase } from '../../../lib/supabase';
import type { CharacterLoreGenerationRequest, CharacterLoreGenerationResult } from './types';

type CharacterLoreFunctionResponse =
  | {
      status: 'ok';
      story: string;
      provider: CharacterLoreGenerationResult['provider'];
      model: string;
    }
  | {
      status: 'not-configured';
      message: string;
    }
  | {
      status: 'error';
      message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseFunctionResponse(value: unknown): CharacterLoreFunctionResponse {
  if (!isRecord(value) || typeof value.status !== 'string') {
    return { status: 'error', message: 'Die KI-Antwort hatte ein ungültiges Format.' };
  }

  if (
    value.status === 'ok' &&
    typeof value.story === 'string' &&
    (value.provider === 'openai-compatible' || value.provider === 'ollama') &&
    typeof value.model === 'string'
  ) {
    return {
      status: 'ok',
      story: value.story,
      provider: value.provider,
      model: value.model,
    };
  }

  if (
    (value.status === 'not-configured' || value.status === 'error') &&
    typeof value.message === 'string'
  ) {
    return { status: value.status, message: value.message };
  }

  return { status: 'error', message: 'Die KI-Antwort hatte ein ungültiges Format.' };
}

class CharacterLoreService {
  async generateBackground(
    request: CharacterLoreGenerationRequest,
  ): Promise<CharacterLoreGenerationResult> {
    const { data, error } = await supabase.functions.invoke('character-lore', {
      body: {
        action: 'generate-background',
        context: request.context,
        currentBackgroundStory: request.currentBackgroundStory,
      },
    });

    if (error) {
      throw new Error('Hintergrundgeschichte konnte nicht generiert werden. Prüfe die Character-AI-Konfiguration.');
    }

    const response = parseFunctionResponse(data);
    if (response.status !== 'ok') {
      throw new Error(response.message);
    }

    return {
      story: response.story,
      provider: response.provider,
      model: response.model,
    };
  }
}

export const characterLoreService = new CharacterLoreService();
