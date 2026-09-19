# Design — avatar-v2-generate-ux (#267)

Provider-neutral Generate product modes:

| Mode | Intent | Provisional axes |
|------|--------|------------------|
| `editable-wardrobe` | Kanonisch editierbar & kleidungsfähig | humanoid / modular-parts / standard |
| `free-form` | Freie Körperform | custom-creature / monolithic / custom |

- Mode = Intent, never a capability claim
- Adapter provider id only on GenerationRecord
- V2 source always `generate` (legacy UI may still store `meshy`)
- Editable may degrade to custom axes when canonical validation fails
