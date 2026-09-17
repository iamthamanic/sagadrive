# Acceptance — clean-m3-character-manager-core

<!-- seeded for GitHub issue #13 / avatar-order-03 -->

## Intent
SagaDrive übernimmt M3-CharacterStudio-Konzepte als kleinen, source-neutralen Core ohne Wallet/NFT/Web3. Pure Domain-Verträge unter `src/domains/character/avatar/**` kapseln Trait-Lifecycle; Three.js-Adapter bleiben in Infrastructure.

## Preconditions
- Issues #2 und #3 sind geschlossen (VRM-Runtime + Race-Assetkatalog vorhanden).
- Bestehende Runtime: `src/infrastructure/character/avatar/character-studio-runtime.ts`.
- Keine Wallet/NFT/Web3-Pakete im Dependency-Tree.

## Happy Path
- [ ] Pure Core-Verträge existieren: `CharacterTraitManifest`, `CharacterTraitInstance`, `RuntimeOverlay`, `TraitLifecyclePort` (+ typisierte Runtime-Statuswerte).
- [ ] Domain-Core hat keinen React-/Supabase-/Three.js-Import und keinen Netzwerkzugriff.
- [ ] Infrastructure-Adapter implementiert Add/Replace/Remove/Cleanup für Mesh und SkinnedMesh deterministisch.
- [ ] Stale async loads werden verworfen (load-generation / version guard).
- [ ] Remove räumt Geometry/Material/Skeleton-Ressourcen genau einmal auf.
- [ ] Base- und Overlay-Instanzen desselben Assetkeys teilen keinen mutablen State.
- [ ] App-Schicht erhält typisierte `loading` / `ready` / `error` Ergebnisse (kein ungefangenes Exception-Leak).
- [ ] `architecture-boundary-check` und avatar-runtime-regression bleiben grün.
- [ ] Dependency-/Import-Scan bestätigt: keine Wallet/NFT/Web3-Pakete.

## Edge Cases
- [ ] Trait replace während async load → stale result verworfen.
- [ ] Doppeltes Remove desselben Trait-Ids ist no-op (kein Double-Dispose).
- [ ] Unbekannte Trait-Gruppe / leeres Manifest → fail-closed mit typisiertem Error-Status.
- [ ] Upstream-M3-API-Unterschiede: SagaDrive public Domain-Contract bleibt stabil (Adapter-lokal).

## Scope
In: Domain-Verträge, Lifecycle-Port, Infrastructure-Adapter + deterministische Checks/Tests, MIT-Attribution.
Out: Trait-Auswahl-UI (#4), Persistenz base vs overlay (#4/#7), Meshy/SkinTokens/Inventory.

## Security Coverage
- B-01/B-09: Keine Owner-IDs/Secrets im Domain-Core; Assetauflösung bleibt Infrastructure mit URL-Allowlist (bestehend).
- P-02: Runtime-Fehler als typisierte Statuswerte; keine Stack-Traces an die UI.
- Out of scope: F-xx (keine neue Auth-UI), B-04 (kein SQL), B-07–B-08 (kein Permission-Admin).

## Composition Gate

- HEAD_SHA: fef7808be1ce4814632533ac243946b61c49161f
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-clean-m3-character-manager-core.md`

Producer (TraitLifecyclePort add/replace) → Persistenz (in-memory overlay registry) → Consumer (runtime attach) → Side-effect (GPU mesh) → UI-label (AvatarCanvas status).
Cardinality: once per trait instance; stale loads must not attach.

## Implementation Notes
- Domain: `src/domains/character/avatar/{types,trait-lifecycle-registry,index}.ts` — CharacterTraitManifest/Instance, RuntimeOverlay, TraitLifecyclePort, AvatarCoreStatus; pure registry with load-generation + one-shot dispose.
- Infrastructure: `trait-lifecycle-three-adapter.ts` — Mesh/SkinnedMesh attach + `disposeObject3DTreeOnce`; `toCharacterTraitManifest` bridges CharacterStudio JSON without leaking fetch into domain.
- Check: `scripts/avatar-trait-lifecycle-check.mjs` wired into `test-gate`.
- No UI change; AvatarCanvas/CharacterStudioRuntime unchanged (no regression to loading/error states).
- MIT attribution in domain/infra file headers; no Wallet/NFT/Web3 deps.