/**
 * KnowledgeFeed — Audience-filtered knowledge list (#367).
 * Location: src/app/session/knowledge/KnowledgeFeed.tsx
 */
import type { KnowledgeProjection } from '../../../domains/session/knowledge';

type KnowledgeFeedProps = {
  projection: KnowledgeProjection | null;
  emptyLabel?: string;
};

export function KnowledgeFeed({
  projection,
  emptyLabel = 'Keine freigegebenen Informationen',
}: KnowledgeFeedProps) {
  if (!projection || projection.facts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-knowledge-feed="empty">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="space-y-2" data-knowledge-feed="v1" data-knowledge-audience={projection.audience}>
      {projection.facts.map((fact) => (
        <li
          key={fact.id}
          className="rounded-md border border-border px-3 py-2"
          data-knowledge-fact={fact.id}
          data-knowledge-has-body={fact.body ? '1' : '0'}
        >
          <p className="text-sm font-medium">{fact.title}</p>
          {fact.body ? (
            <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap">{fact.body}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Inhalt nicht freigegeben</p>
          )}
        </li>
      ))}
    </ul>
  );
}
