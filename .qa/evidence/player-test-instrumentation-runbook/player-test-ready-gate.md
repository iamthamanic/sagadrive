# Player-Test-Ready Gate (mirror of Epic #210)

Issue: **#304** · Source: GitHub Epic **#210** „Player-Test-Ready Gate“  
Linked from: [runbook.md](./runbook.md)

Alle Punkte müssen erfüllt sein, bevor fremde Tester eingeladen werden.

---

## Functional

- [ ] GM kann vorbereitete Adventure-Session ohne DB/Admin-Workaround starten.
- [ ] 2–4 Spieler können per Code/Link sicher beitreten und je einen erlaubten Character wählen.
- [ ] Roster/Presence synchronisiert sich.
- [ ] Player Panel zeigt spielrelevanten Character-State.
- [ ] Shared Check + Vorteil/Nachteil + Drive funktioniert.
- [ ] Mindestens ein vollständiger Encounter funktioniert digital.
- [ ] NPC/Creature HP/Zustände sind Instanzstate, Definition bleibt unverändert.
- [ ] Scene/Location-Kontext wird live geteilt.
- [ ] Reload/Reconnect stellt denselben autoritativen State wieder her.
- [ ] Session kann pausiert und später fortgesetzt werden.

## Security

- [ ] Keine fremden Character-/Session-/NPC-Writes.
- [ ] GM-only Commands serverseitig geschützt.
- [ ] Join-Code/Session-Lookup leakt keine fremden Daten.
- [ ] Keine hardcodierten Hosted-/Secret-Pfade im Browser.

## Quality

- [ ] `npm run test-gate` grün.
- [ ] Multi-user E2E grün.
- [ ] Keine bekannten P0/P1 Datenverlust-/Auth-/Sync-Fehler.
- [ ] Mobile muss beitretbar/lesbar sein; Desktop/Laptop ist für Test #1 die empfohlene Hauptoberfläche.

## Product

- [ ] Testabenteuer ist in 60–90 Minuten spielbar.
- [ ] Tester benötigen keine Erklärung der internen SagaDrive-Architektur.
- [ ] Voice/Video-Abhängigkeit ist vorab klar: Discord/Meet.
- [ ] Feedbackbogen + Event-/Observation-Protokoll stehen vor Start bereit.

---

## Explicitly Deferred Until After Test #1

- vollständiger 3D Scene/World Runtime
- Grid/Battlemap/Fog of War
- Avatar Face Tracking/Lip Sync
- eingebautes Voice/Video
- OBS-/Recording-/Actual-Play-Studio
- AI-GM / automatische Storyentscheidungen
- Marketplace/Payments/Creator Revenue
- ContentPackage Publishing
- vollständiger Encounter Builder
- perfekte Mobile-Session-UX

## Implementation map (children)

| Gate area | Primary child |
|-----------|---------------|
| Session security / join | #296 |
| Realtime / reconnect | #297 |
| Player Panel | #298 |
| Shared rolls / Drive | #299 |
| Combat / encounter | #300 |
| Shared scene | #301 |
| Prepared adventure 60–90 | #302 |
| Multi-user E2E + security | #303 |
| Instrumentation / runbook / dogfood | **#304** (this pack) |
