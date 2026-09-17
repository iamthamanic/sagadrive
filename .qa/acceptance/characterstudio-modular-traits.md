# Acceptance — characterstudio-modular-traits

<!-- seeded for GitHub issue #4 / avatar-order-04 -->

## Intent
SagaDrive erhält ein source-neutrales Trait-System für Kopf, Ohren, Haare, Kleidung und Accessoires. Persistenter Basislook und temporäre Runtime-Overlays bleiben strikt getrennt. Der CharacterEditor wechselt kompatible Traits live per Card-Picker.

## Preconditions
- #13 (clean M3 trait lifecycle core) ist auf `main`.
- VRM-Runtime + Race-Assetkatalog vorhanden (`CharacterStudioRuntime`, `avatarAssetManifests`).
- Kein Inventory-Equipment-Resolver (#158+).

## Happy Path
- [ ] Trait-Gruppen `head|ears|hair|clothing|accessory` liegen als Domain-Verträge vor.
- [ ] Domain-Katalog liefert logische Trait-IDs inkl. Label; Infrastructure mappt nur Allowlist-Keys (keine freien Remote-URLs).
- [ ] `appearance.avatar.traits` speichert nur Basis-Traits; Overlay-State wird nie persistiert.
- [ ] base/overlay-Auflösung mit deterministischer Priorität (Overlay > Base) und hide/replace-Semantik.
- [ ] CharacterEditor: Card-Picker für „Haare & Merkmale“, „Kleidung“, „Accessoires“; Live-Preview ohne Apply-Button.
- [ ] Selected State nicht nur über Farbe (Ring/`aria-pressed`).
- [ ] Loading je Trait-Gruppe lokal; Fehler zeigen Retry ohne andere Änderungen zu verlieren.
- [ ] Stale async Traitwechsel A→B wird verworfen (Lifecycle aus #13).
- [ ] Cleanup über TraitLifecyclePort verhindert Double-Dispose.
- [ ] architecture-boundary-check + typed-strict + modular-traits-check grün.

## Edge Cases
- [ ] Overlay versteckt Haare; Entfernen stellt exakt vorherige Basis-Haare wieder her.
- [ ] Zwei Overlays auf demselben Kanal → letzter Replace gewinnt (eine Instanz pro Gruppe).
- [ ] Unbekannte Trait-ID → fail-closed, Auswahl unverändert / Fehlerstatus.
- [ ] Mobile: max. 2 Card-Spalten, kein horizontaler Overflow; Keyboard bedienbar.

## Scope
In: Domain trait catalog + base/overlay resolve, Infrastructure allowlist + runtime apply, App Card-Picker UI, Checks.
Out: Inventory equipment (#158+), body/face morph editor (#212+), Wallet/NFT/Web3.

## Security Coverage
- B-01/B-09: Keine Owner-IDs; Trait-Auflösung allowlisted in Infrastructure.
- P-02: Typisierte Fehlerstatus an UI; keine Stack-Traces.
- F-03: Keine Secrets in localStorage.
- Out of scope: B-04 SQL, B-07–B-08 Permission-Admin.

## Composition Gate

- HEAD_SHA: df82e7e5a2b5f7cb25db880ebbbb5b318f0f8378
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-characterstudio-modular-traits.md`

Producer (TraitCardPicker / setRuntimeOverlays) → Domain resolveEffectiveTraits + serializePersistedBaseTraits → CharacterStudioRuntime.applyAppearance + TraitLifecyclePort → GPU/visibility → AvatarCanvas / appearance.avatar.traits.
Cardinality: once per trait group; overlays never persist.

## Implementation Notes
- Domain: `trait-layers.ts` (base/overlay/hide resolve + serializePersistedBaseTraits), `trait-catalog.ts` (logical options + editor sections).
- Infrastructure: `trait-asset-allowlist.ts` (opaque `trait:group:id` keys, no free URLs); `CharacterStudioRuntime` wires TraitLifecycleThreeAdapter + setRuntimeOverlays + effective appearance (hair hide).
- App: `TraitCardPicker` + `AvatarTraitPanels` replace Look-tab Selects; live apply with local loading/error/retry; `aria-pressed` + ring for selection.
- Checks: `scripts/avatar-modular-traits-check.mjs` in test-gate; e2e `characterstudio-modular-traits.spec.ts`; regression requires AvatarTraitPanels.
- Persistence path still uses `createCharacterStudioAvatar` → only base traits in DTO.
