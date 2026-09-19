# Avatar V2 — Modular Pipeline (kanonisches Design)

<!-- Source of Truth for Epic #248 / Child #249+. Agents must not invent alternate glossaries. -->

**Status:** Binding  
**Slug:** `avatar-v2-modular-pipeline`  
**Parent Epic:** #248  
**First Child:** #249 Composition Contract  

---

## 1. Intent

SagaDrive Avatar V2 vereinheitlicht Template-, Import- und Generate-Ingresses unter einem **provider-neutralen Artifact-/Capability-Vertrag**. Quelle und Provider erzeugen keine parallelen UI-/Runtime-Sonderpfade. Verhalten folgt **Capabilities**, **Anatomy**, **Body Compatibility** und **Modularity** — nicht dem Label „Meshy“ oder „Import“.

## 2. Glossar (orthogonal — nie vermischen)

| Begriff | Bedeutung | Nicht verwechseln mit |
|---------|-----------|------------------------|
| **Source** | Herkunft des Looks: `sagadrive` \| `import` \| `generate` (Legacy `meshy` → `generate`) | Capability-Beweis |
| **Provider** | Infrastructure-Adapter (Meshy, Tripo, …) | Domain-Fachmodell |
| **Anatomy** | `humanoid` \| `custom-creature` \| `unknown` | Species / Body Family |
| **Body Compatibility** | Fit-Klasse für Wearables: `standard` \| `compact` \| `heavy` \| `custom` \| `unknown` | Morph-Slider |
| **Body Family** | Kanonische Humanoid-Familie (`standard`/`compact`/`heavy`) oder `custom` | Species (`fantasy-elf`) |
| **Species** | Fachliche Identität / Preset-Look (Mensch, Elf, …) | Body Family |
| **Modularity** | `monolithic` \| `modular-parts` \| `limited` | Source |
| **Capabilities** | Nur aus validierter Analyse (#6 / Analyzer v2) | Client-/Provider-Claims |
| **Play-Norm** | Spielbar (rigged/humanoid, Items möglich) | Morph-Baukasten-Editierbarkeit |
| **Edit-Norm** | Morph/Traits auf kuratiertem Base Mesh | Beliebiges Mesh „einstellbar“ machen |

## 3. Architektur-Grenzen (AGENTS.md / #94)

| Schicht | Darf | Darf nicht |
|---------|------|------------|
| **Domain** `src/domains/character/avatar/**` | Contracts, pure Mapping/Validation | React, Three, Supabase, Provider-SDKs |
| **Infrastructure** | Storage, Edge, Three/glTF, Provider-Adapter | Business-Rules duplizieren |
| **App** `src/app/character/**` | Vertical Slices, Hooks, Composition Root = CharacterEditor | Domain-Logik / direkte Provider-Calls |

Verbote: neue `src/modules`, `src/components`, `src/features`, generische `services/`/`types/`/`utils/`-Dumping-Folder.

## 4. Provider-Abstraktion

- Generate bleibt **provider-neutral** im Domain-Contract (`generation/**`).
- Meshy ist der aktuelle Adapter; Tripo/weitere Provider ergänzen **ohne** Domain-/UI-Neudesign.
- Provider-Secrets nur serverseitig; keine freien Provider-URLs in persistierten Contracts.
- „Provider success“ ≠ SagaDrive-Capabilities (fail-closed).

## 5. Body Families: Standard / Compact / Heavy / Custom

- **Standard / Compact / Heavy** = kanonische Humanoid-Familien für Play-Norm + Wearable-Fits.
- **Custom** = kein erzwungenes Family-Match (Custom Creature / unmatched Import).
- Unknown/unsupported Werte → fail-closed auf `custom` / limited Capabilities — **nie** Capabilities erfinden.
- Species bleibt fachliche Identität und wird **nicht** mit Body Family vermischt.

## 6. Custom Creatures

- First-class Anatomy `custom-creature`.
- Keine Garantie für Auto-Rig jeder Tier-/Monster-Anatomie.
- Ohne Auto-Rig: vorhandenes Rig bzw. begrenzte Capabilities; Avatar bleibt nutzbar wo möglich.
- „Original behalten“ ist ein gültiger Pfad (kein Zwang zu Standard/Compact/Heavy).

## 7. GLB / Wearables / Conversion (Semantik)

- Persistierte Artefakte: owner-scoped, validiert vor Aktivierung.
- Unsupported/kaputter GLB blockiert den **vorherigen gültigen** Avatar nicht.
- Wearables: Rigid (Anker) vs Skinned (Family Fit) — bestehende Contracts wiederverwenden; keine zweite Equipment-State-Machine.
- Conversion Import → Family ist späteres Child (#263); Identity Transfer ist Spike (#262).

## 8. UX-Journey (Zielbild)

1. Spieler wählt **Vorlage**, **Mit KI erstellen** oder **3D-Import**.
2. SagaDrive materialisiert/analysiert ein provider-neutrales Avatar-Artefakt.
3. Capabilities + Body Compatibility bestimmen Editor-Funktionen.
4. Humanoide nutzen Standard/Compact/Heavy; Custom Creatures bleiben eigener Körper.
5. Alle Wege landen im selben Avatar-Editor und derselben Runtime.

## 9. Fallback-Regeln (bindend)

| Situation | Verhalten |
|-----------|-----------|
| Legacy `source: meshy` | Lesbar; provider-neutral als Generate-Ingress interpretieren; kein Breaking Migration-Zwang |
| Missing/unknown v2 fields | Defaults fail-closed (`unknown` anatomy / `custom` family / empty capabilities) |
| Source allein | Setzt **nie** Capabilities |
| Provider unavailable | Bestehende Avatar-Funktionen nicht zerstören |
| No Family match | Bleibt `custom` — nie still auf Standard umbiegen |

## 10. Golden Fixtures (Abschluss #270)

E2E-Matrix deckt ab: Native Template, Import Original, Generate Editierbar, Generate Freie Form, Custom Creature Original, Family Conversion (wo umgesetzt). Details im Abschluss-Ticket.

## 11. Relation zu v1

- `.qa/design/avatar-character-creator-v1.md` bleibt historisch; **Produktgrenzen** werden durch dieses Dokument abgelöst.
- `CharacterAvatarDto` schema_version 1 bleibt lesbar; V2 Composition ist zusätzlicher Domain-Contract + Mapping (siehe `composition-contract-v2.ts`).

## 12. Child-Queue

Siehe Epic #248 Child-Liste (#249–#270). Order-Labels `avatar-order-26`…`47` + `Depends on #N`.
