# Avatar Character Creator v1

## Intent
Die bestehende Three.js/VRM/M3-Avatar-Pipeline wird zu einem deterministischen SagaDrive Character Creator ausgebaut. Der Scope bleibt humanoid, Fantasy + Sci-Fi und source-neutral.

## Product decisions
- Queue strikt seriell; jedes ausführbare Avatar-Ticket besitzt genau ein `avatar-order-XX` Label sowie Previous/Next im Ticket.
- #157 bleibt reines Epic ohne Order-Label.
- #12 Face Tracking ist optionaler letzter Queue-Schritt.
- SagaDrive-eigene Avatare garantieren vollständige Body-/Face-Morph-Editierbarkeit; Import/KI erhalten denselben Runtime-/Rig-/Render-Vertrag, aber Controls nur gemäß erkannter Capabilities.
- Basismodell: erwachsene, stylized-game 3D-Proportionen mit leicht realer Anatomie.
  Kanonischer Look: **Palworld × Overwatch, soft-real** — siehe `docs/character-visual-styleguide.md`
  und Golden-Refs `assets/species-3d/human/golden/`. MToon bleibt das Runtime-Renderprofil;
  Mesh-/Ref-Stil folgt dem Character Visual Styleguide (nicht mehr „nur Korra-via-Shader“).
- V1 bleibt bei zweibeinigen Humanoiden; keine Centauren, vier Arme, Schlangenkörper oder komplett abweichende Skelette.
- Kein eigener Shader in V1, kein Blender-im-Browser, kein universelles Auto-Fitting beliebiger Meshes.

## Required creator layers
1. Humanoid & Morph Contract v1.
2. Morphbare SagaDrive Base Bodies.
3. SagaDrive MToon Visual Profile v1.
4. CharacterEditor Body/Face UI.
5. Morph/Wearable Fit Contract.
6. Fantasy & Sci-Fi Starter Content Pack.
7. Final Visual & UX Acceptance.

## Architecture
- Domain contracts: `src/domains/character/avatar/**`.
- React/application UI: `src/app/character/avatar/**` and `src/app/character/edit/**`.
- Three.js/VRM/M3 runtime and asset adapters: `src/infrastructure/character/avatar/**`.
- Provider/network/storage/backend concerns remain behind Infrastructure/Edge Function boundaries.
- `CharacterAvatarDto` evolves versioned/backward-compatible; legacy `provider: m3-character-studio` remains readable.
- `appearance.avatar` remains compact source of truth; runtime overlays/equipment are not baked into base appearance state.

## Verification
Every executable issue must define deterministic Acceptance, UI states, backend/security boundaries, edge cases, exact Previous/Next queue links and the matching `avatar-order-XX` label.
