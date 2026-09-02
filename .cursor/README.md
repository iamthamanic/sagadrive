# `.cursor/` — Agent config (AgentShield)

Project-local Cursor / ECC agent settings for SagaDrive.

| Path | Purpose |
|------|---------|
| `rules/*.mdc` | Always-on project rules for the IDE agent |
| `.claude/settings.json` | Allow/deny permissions + hooks |
| `.claude/CLAUDE.md` | Security guidelines for agents |
| `.claude/mcp.json` | MCP servers (empty by default) |
| `hooks/` | Pre/Post tool hooks (secrets + destructive bash) |

## Quality gate

```bash
npx ecc-agentshield scan --path .cursor
```

Run as part of `@ecc-check` / `@commit-pr-safe` Phase D. Block on critical/high findings.

## Source of truth

Stack, architecture, and workflow live in [`AGENTS.md`](../AGENTS.md) at repo root.
