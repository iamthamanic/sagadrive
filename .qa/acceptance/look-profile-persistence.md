# Feature: Persist versioned LookProfiles, references and ownership securely

## Intent
Speichere LookProfiles owner-scoped in Supabase, inklusive unveränderbarer Versionen, Referenzbildern, Source-Metadaten, Status und Verknüpfbarkeit für spätere Saga-/Session-Nutzung.

## Happy Path
- [ ] LookProfile CRUD/duplicate/archive ist owner-scoped und durch RLS + Service Guard abgesichert.
- [ ] Look-Versionen und LookReferences (`style|content`, weight, asset reference) werden persistiert und domain-typisiert geladen.
- [ ] Erneute Analyse/Edit kann eine neue Version anlegen, ohne die vorherige Version zu überschreiben.
- [ ] Repository/API akzeptiert nur validierte strukturierte Look-Daten, keine ungeprüften provider-/ToonLab-spezifischen Blobs als Domain-Wahrheit.
- [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [ ] Duplizieren eines archivierten Looks erzeugt eine aktive Kopie.
- [ ] Concurrent Update: optimistic `current_version` match; conflict error.
- [ ] Ungültige Source/Capability/provider blobs werden abgelehnt.

## Security Coverage
- B-01/B-04: RLS owner_user_id = auth.uid(); service uses getAuthenticatedUserId.
- B-07: no DELETE on versions; archive-only profiles.
- B-08/B-09: structured draft validation rejects provider blobs.
- F-*/P-04 UI/secrets: out of scope (no UI, no new secrets).

## Composition Gate
- Verdict: CLEAR (persist write → version append → current_version bump; concurrent consumer gets conflict)
- Proof: `.qa/runs/composition-gate-look-profile-persistence.md`

## Implementation Notes
- Migration `046_look_profiles.sql`
- Domain: persistence contracts + `normalizeLookProfileWriteDraft`
- Infra: `src/infrastructure/look/**`
- Gate: `scripts/look-profile-persistence-check.mjs`
