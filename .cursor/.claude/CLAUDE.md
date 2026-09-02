# Security Guidelines — SagaDrive

Read `AGENTS.md` at repo root before making changes.

## Forbidden

- Never use `--no-verify` or `--dangerously-skip-permissions`
- Never hardcode API keys, tokens, or passwords — use environment variables / `.env` (gitignored)
- Never push directly to `main`; open a PR from an issue branch
- Never run `sudo` or destructive `rm -rf` without explicit user request
- Never force-push to `main`/`master`
- Never invent elevated origins or cross-owner foreign keys on client writes

## Secrets

- Never commit `.env` / `.env.local` (use `env.example` only)
- Never echo, log, or print secret values
- Do not pass secrets as MCP command-line arguments

## Stack

- Frontend: React + Vite + TypeScript + Tailwind + Radix
- Backend: Supabase (self-host) — Auth, Postgres, Edge Functions, Storage
- Quality: `npm run test-gate`, `npm run composition-gate`
- Architecture: `src/domains` (pure), `src/infrastructure` (Supabase), `src/app` (vertical slices)

## MCP Servers

- Only connect to trusted, verified MCP servers
- Keep `.cursor/.claude/mcp.json` empty unless a ticket explicitly adds a server
- Review permissions before enabling any MCP server

## Hooks

- Hooks under `.cursor/hooks/` must not exfiltrate data or make external network calls
- PostToolUse hooks validate output; they must not silently rewrite user intent

## Verification

```bash
npm run test-gate
npm run composition-gate
npx ecc-agentshield scan --path .cursor
```
