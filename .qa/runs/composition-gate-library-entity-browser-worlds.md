# Composition Gate — library-entity-browser-worlds

- HEAD_SHA: ca92ca7d3a00f2030663d6599ad6167810dac0e9
- BASE_SHA: e7cf67892bd124b721207995d54a2c130492c7ad
- Date: 2026-08-28
- Verdict: CLEAR

## Event
(1) Owner öffnet Bibliothek → Tab Welten: Liste/Karussell rendert Welten über `useWorldProfiles` über die shared `EntityBrowser`-Shell (vorher: statisches Card-Grid mit Inline-Empty-State); View-Mode wird über eigenen Storage-Key persistiert. (2) Karten-Meta zeigt Speziesentwicklungs-Modus als Chip (Explizit/Progressiv/Deaktiviert) via `getSpeciesDevelopmentMode` (fail-safe `explicit`). (3) Create/Edit/Delete laufen unverändert über `WorldProfileEditorDialog` bzw. bestehende Confirm-Flows.

## Hop chain
**Browse:** `Library` → `EntityBrowser` (ui, unverändert) → `EntityBrowserCard` (ui, unverändert) → `useWorldProfiles` (hook, unverändert) → `worldProfile.service` (unverändert) → `world_profiles` (RLS owner-scoped, unverändert) → Welten-Tab.

**CRUD:** Toolbar/Empty-State-CTA → `openCreateWorld` → `WorldProfileEditorDialog` → `createWorld`/`updateWorld`; Card-Aktionen → `openEditWorld`/`handleDeleteWorld` (Confirm + `deleteWorld`). Keine neuen Write-Pfade, kein Schema-Change.

**Navigation:** keine View-Emits aus dem Welten-Tab (Dialog-basiert).

No queue/worker/outbox hop. Keine Schema-/Migrationsänderung.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Mehrere parallele Leser (Library + potenzielle künftige Konsumenten von `useWorldProfiles`) read-only; CRUD bleibt single-writer über Dialog. | Rein lesend beim Browse; Create/Edit/Delete laufen serial über modale Dialoge mit Confirm; Hook-State ist Source of Truth, kein paralleler Cache. | pass |
| Invalid/missing | Ungültige Modul-Configs, leere Liste, Search miss, localStorage-Fehler → kein Crash, kein Broken State. | `getSpeciesDevelopmentMode` normalisiert unbekannte Modes fail-safe auf `explicit` (Chip bleibt korrekt); Empty-States inkl. Suche; localStorage-Fallback in EntityBrowser (safe default). | pass |
| Two consumers / crash | Dialog cancel darf Liste nicht korruptieren; Doppel-Render der Tabs (Radix) ohne Duplikate. | Cancel setzt nur Dialog-State zurück (`editingWorld=null`, `worldEditorOpen=false`) ohne Listen-Änderung — Half-Save unmöglich, da Save erst bei Bestätigung committet; `renderItem` ist zustandslos pro Karte. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| Empty-state CTA drift: Toolbar („Neue Welt") ist im EntityBrowser-Empty-State nicht sichtbar (Shell rendert nur `emptyState` bei 0 Items) | minor | ui | Das alte Card-Grid zeigte Toolbar + Grid; die Shell blendet die Toolbar im Empty-State aus. E2E-Selektor auf Empty-State-CTA „Erste Welt erstellen" umgestellt (Verhalten identisch zum Charaktere-/Abenteuer-Tab; Toolbar-CTA erscheint ab dem ersten Eintrag). | done: `e2e/world-profiles.spec.ts` Selektor angepasst; UX-Verhalten konsistent über alle drei Tabs. |

## Skip reason
n/a

## Notes
- Issue #50 (Epic #47): Letzter Tab der EntityBrowser-Migration; Epic damit vollständig.
- `WorldProfileEditorDialog`-Flows unverändert; `e2e/world-profiles.spec.ts` deckt Create→Edit→Cancel ab.
- Speziesentwicklungs-Chip rendert nur bereits geladene Felder; keine neuen Auth-/Upload-Flächen.