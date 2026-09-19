# Design: saga-routing-public-id-foundation (#276)

## Decision
Extend History-API routing (#133) with typed Saga/Session resource routes and a pure Public-ID domain. Persist `public_id` beside existing PKs; allocate `session_number` via SECURITY DEFINER RPC.

## Boundaries
- Domain: `src/domains/resource-id/**` — validate/generate IDs, screen-vs-modal, live role rules (no React/Supabase).
- App routing: `src/app/shell/routing/**` — pathname ↔ ResolvedRoute only.
- Infra: project/character services resolve by public_id; session create via `create_project_session`.
- UI: thin Saga/Session shells; no full redesign; `/gamemaster` + `/adventure-editor` compatibility only.

## Security
Public IDs are not secrets. Cross-saga session resolve fails closed. Live GM URL does not grant GM rights.
