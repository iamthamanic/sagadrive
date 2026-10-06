# Acceptance — Session Lobby Preflight (#491)

Feature slug: `session-lobby-preflight`

## Intent

Zwischen Character Assignment / Session Join und Live liegt eine kanonische Lobby. Player und GM sehen Roster, Ready, Media/LiveAct-Status (opt-in) und betreten erst danach die autorisierte Live-Route.

## Preconditions

- #478 Character Assignment und #490 Invite Entry sind gemerged
- Nutzer ist Session-Mitglied (Player oder GM)
- Player hat optional einen gebundenen Charakter

## Happy Path

1. Nach Join/Create landet der User auf `/sagas/{SA}/sessions/{SE}/lobby`
2. Lobby zeigt Session-/Saga-Namen, eigenen Charakter (Player) und Roster mit Online/Ready
3. Kamera/Mikrofon/LiveAct starten **nur** nach explizitem Button (User-Geste)
4. Player CTA „Session betreten“ → autorisierte Player-Live-Route
5. GM CTA „Session starten“ → autorisierte GM-Live-Route (auch wenn Spieler noch nicht ready)
6. Reload auf Lobby-URL stellt denselben Kontext wieder her

## Edge Cases

- Kein Charakter → Clear Create/Join-Pfad, Enter disabled
- Media denied / unavailable → Hinweis, Enter bleibt möglich
- LiveAct unsupported → Statuszeile, kein Fake-Start
- GM startet ohne ready Players → erlaubt
- Character ändern wenn Binding nicht final → zurück zu Session-Join

## Security Coverage

- F-01 AuthZ: Lobby-Rechte aus Membership, nicht URL
- F-03 No client-claimed foreign character/media identity
- B-01 Server membership remains SoT for roster
- P-04 Device permissions only after gesture; no raw media persistence
- Ready-State is preflight only — not gameplay authorization

Out of scope: Marketplace payments, Director Control Room, full Media Engine, Prepare/Recap (#492)

## Checklist

- [ ] Player und GM besitzen einen kanonischen Lobby-/Preflight-Screen
- [ ] Character Assignment ist sichtbar und eindeutig
- [ ] Roster und Connection/Ready-State sind realtime
- [ ] Camera/Mic/LiveAct werden niemals automatisch ohne User-Geste aktiviert
- [ ] Media failure blockiert nicht das gesamte Session-Spiel
- [ ] Player gelangt aus Lobby ausschließlich in autorisierten Player Live
- [ ] GM gelangt ausschließlich in autorisierten GM Live
- [ ] Reload/Rejoin stellt denselben Lobby-/Session-Kontext wieder her
- [ ] Phone/Tablet/Desktop relevante AU-Gates grün
- [ ] Multi-context E2E vorhanden
- [ ] Touched files: zero type escape hatches; gate wired in test-gate

## Composition Gate

(pending proof)
