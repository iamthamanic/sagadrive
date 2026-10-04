/**
 * KnowledgeGmControls — GM reveal UI for knowledge facts (#367).
 * Location: src/app/session/knowledge/KnowledgeGmControls.tsx
 */
import { useState } from 'react';
import { Button } from '../../../shared/ui/button';
import type { RevealTarget } from '../../../domains/session/knowledge';

type KnowledgeGmControlsProps = {
  isBusy: boolean;
  onReveal: (input: {
    factId: string;
    target: RevealTarget;
    title?: string;
    body?: string;
    visibility?: string;
    characterId?: string | null;
  }) => Promise<boolean>;
};

export function KnowledgeGmControls({ isBusy, onReveal }: KnowledgeGmControlsProps) {
  const [factId, setFactId] = useState('fact-secret-1');
  const [title, setTitle] = useState('GM Geheimnis');
  const [body, setBody] = useState('Nur für berechtigte Empfänger.');
  const [targetKind, setTargetKind] = useState<'everyone' | 'program' | 'players' | 'character'>(
    'everyone',
  );
  const [characterId, setCharacterId] = useState('');

  const submit = async () => {
    const target: RevealTarget =
      targetKind === 'character'
        ? { kind: 'character', characterId: characterId.trim() }
        : { kind: targetKind };
    await onReveal({
      factId: factId.trim(),
      target,
      title: title.trim(),
      body,
      visibility: 'gm_only',
      characterId: targetKind === 'character' ? characterId.trim() : null,
    });
  };

  return (
    <section
      className="space-y-3 rounded-md border border-border p-3"
      data-knowledge-gm="v1"
      aria-label="Knowledge Reveal"
    >
      <h3 className="text-sm font-medium">Knowledge / Reveal</h3>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Fact ID
        <input
          className="input input-bordered input-sm w-full"
          value={factId}
          onChange={(e) => setFactId(e.target.value)}
          data-knowledge-fact-id
        />
      </label>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Titel
        <input
          className="input input-bordered input-sm w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Inhalt (Secret)
        <textarea
          className="textarea textarea-bordered textarea-sm w-full"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          data-knowledge-body
        />
      </label>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Ziel-Audience
        <select
          className="select select-bordered select-sm w-full"
          value={targetKind}
          onChange={(e) =>
            setTargetKind(e.target.value as 'everyone' | 'program' | 'players' | 'character')
          }
          data-knowledge-target
        >
          <option value="everyone">Alle</option>
          <option value="players">Spieler</option>
          <option value="character">Charakter</option>
          <option value="program">Program Output</option>
        </select>
      </label>
      {targetKind === 'character' ? (
        <label className="block space-y-1 text-xs text-muted-foreground">
          Character ID
          <input
            className="input input-bordered input-sm w-full"
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            data-knowledge-character-id
          />
        </label>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={isBusy || !factId.trim()}
        onClick={() => void submit()}
        data-knowledge-reveal
      >
        {isBusy ? 'Reveal…' : 'Reveal senden'}
      </Button>
    </section>
  );
}
