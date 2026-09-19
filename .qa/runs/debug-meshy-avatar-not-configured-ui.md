# Debug Report — `meshy-avatar-not-configured-ui`

**Date:** 2026-09-18  
**Project:** sagadrive  
**Shell:** web  
**Repro grade:** full  

---

## Summary

Meshy BYOK **ist konfiguriert** (`meshyConfigured: true`, Key aktiv, Credits vorhanden). Die Meldung „Meshy nicht konfiguriert“ erscheint durch eine **UI-Logik-Falle**: solange `config === null` (Loading), wertet `!config?.meshyConfigured` als true. Zusätzlich bleibt „Mit KI erstellen“ disabled, bis der Prompt ≥ 8 Zeichen hat — wirkt wie „kein Key“.  
**Confidence:** high

---

## Bug description

| | |
|--|--|
| **Expected** | Mit hinterlegtem Meshy-Key: keine „nicht konfiguriert“-Warnung; Start möglich nach Prompt. |
| **Actual** | Warnung „Meshy nicht konfiguriert…“ (zumindest kurz / beim Öffnen); Start-Button grau. |
| **Steps** | 1. Login 2. Charakter Editor 3. Avatar-Quelle „Mit KI erstellen“ 4. Warnung / disabled Start |

---

## Reproduction

- **Command / URL:** `http://localhost:3004/character-editor` (dev läuft)
- **Playwright spec:** keines (Browser MCP + CDP)
- **Result:** reproduced (Warnung im ersten Snapshot nach Meshy-Klick); nach Config-Load weg; Start enable erst mit Prompt ≥ 8
- **Hard path:** no

---

## Evidence

### Network (CDP, gleicher User)

| Method | URL | Status | Note |
|--------|-----|--------|------|
| POST | `http://localhost:8000/functions/v1/character-avatar-meshy` `{action:config}` | 200 | `meshyConfigured: true` |
| POST | `…/ai-provider-credentials` list `3d`/`image` | 200 | Meshy `configured:true`, `status:active`, `keyHint:••••tOw4`, credits 13240, `lastValidatedAt: 2026-09-18T08:03:11Z` |

User-ID Session: `00000000-0000-4000-8000-000000000001` (email provider).

### Client path

`fetchMeshyAvatarConfig()` / `supabase.functions.invoke('character-avatar-meshy')` → `meshyConfigured: true`, `error: null`.

### UI

- Erster A11y-Snapshot nach Meshy-Select: Status-Text „Meshy nicht konfiguriert…“ sichtbar; Start `disabled`.
- Später / Remount: Warnung weg; Start `disabled` bei leerem Prompt; nach Prompt (35 Zeichen) `startDisabled: false`.

### Code

```227:231:src/app/character/avatar/AvatarMeshyPanel.tsx
{!config?.meshyConfigured ? (
  <p className="text-amber-700 dark:text-amber-300">
    Meshy nicht konfiguriert — bitte API-Key unter KI-Anbieter hinterlegen.
  </p>
) : null}
```

`config` initial = `null` → Loading und „nicht konfiguriert“ sind nicht unterscheidbar.

```179:179:src/app/character/avatar/AvatarMeshyPanel.tsx
disabled={busy || !config?.meshyConfigured || prompt.trim().length < 8}
```

---

## Prior art

- [x] Repo grep: `AvatarMeshyPanel.tsx:58,179,227` — null-config + prompt gate
- [x] Edge: `character-avatar-meshy` config + `isMeshyConfiguredForUser` — live OK
- [ ] GitHub: kein spezielles sagadrive-Issue zu diesem False-Positive
- [ ] LightRAG: n/a

---

## Root cause

**Layer: UI (AvatarMeshyPanel), nicht fehlender API-Key.**

1. **False-positive Warnung:** `!config?.meshyConfigured` ist true für `config === null` (noch ladend) und für `meshyConfigured === false`. Beim Mount von „Mit KI erstellen“ erscheint die Key-Warnung, obwohl der Key existiert und die Edge Function gleich `true` liefert.
2. **Falscher Eindruck „geht nicht“:** Start bleibt disabled ohne Prompt ≥ 8 Zeichen — auch wenn Meshy konfiguriert ist.
3. Backend/BYOK für diesen lokalen Stack sind aktuell **gesund** (Key aktiv, Credits, Config true).

**Hypotheses tested:**  
1. Edge nicht deployed / 401 → widerlegt (200 + true)  
2. Key nicht in DB / falscher User → widerlegt (credentials list active)  
3. Host-Key Flag → n/a (User-BYOK greift)  
4. UI null-vs-false + Prompt-Gate → bestätigt  

**Fix attempts this bug:** 0  

---

## Suggested fix (minimal)

1. **Files:** `src/app/character/avatar/AvatarMeshyPanel.tsx` (+ kurzer Check optional)
2. **Change:**
   - Loading-State: Warnung nur wenn `config !== null && config.meshyConfigured === false`
   - Optional: „Prüfe Meshy-Konfiguration…“ während `config === null`
   - Optional: Helper-Text „Prompt mind. 8 Zeichen“, damit disabled Start nicht wie „kein Key“ wirkt
3. **Regression:** E2E oder Panel-Check: mit gemocktem langsamen config erst Loading, dann keine False-Warnung; mit `meshyConfigured:true` + Prompt≥8 Start enabled

**Next step:** `@implement` (User hat Debug ohne Fix angefordert)

---

## Notes

- Annahmen: lokaler Stack `VITE_SUPABASE_URL=http://localhost:8000`; User hat Key gerade validiert (`lastValidatedAt` heute).
- Verwandt, aber **anderer Bug:** leere 3D-Vorschau („CH“) — `modelUrl` im Editor nutzt nicht `resolveAvatarModelUrl`; nicht Ursache der Meshy-Meldung.
- Out of scope dieses Reports: Face Tracking #243/#244, MediaPipe self-host.
