# Avatar V2 — Modular Generate Decomposition Spike (#268)

**Slug:** `avatar-v2-generate-decomposition-spike`  
**Depends:** #267 · **Handoff:** #269

## Default pipeline (provider-neutral)

1. Parse intent (Editierbar vs Freie Form — #267)
2. Resolve Body Family (or degrade to Freie Form on unusual anatomy)
3. Materialize SagaDrive Base Body from library
4. Identity transfer onto body (#262/#263)
5. Optional traits from catalog
6. Attach skinned wearables from catalog (never invent from blob)
7. Attach rigid props separately
8. Structure Analyzer → capabilities fail-closed

**Domain approach id:** `vision-parse-library-body-catalog-wearables`

## Degraded fallback

`generate-body-only-catalog-wearables` — when library body + transfer is insufficient, generate body mesh then still use catalog wearables. Never mark a clothed blob as `full modular`.

## Banned from default

- `full-mesh-autosplit` — unreliable garment separation
- `provider-part-split` — adapter capability only, not domain contract
- `free-form-blob` — honest custom path, not editable wardrobe path

## Job graph / cost

See `modular-generate-decomposition-spike-v1.ts` → `jobGraph`. Max 1 paid retry per stage; cost confirm required. Provider answers never authoritatively set SagaDrive roles/slots/capabilities.

## Golden fixtures

human, elf, dwarf, gumo-like, outfit-shirt-pants-boots-prop
