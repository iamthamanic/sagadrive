# validate-gear-resources-load report (#32)

- Findings: 0
- Rows: 48

## Results

- OK `tool:suitable` — expected normal/invents=false, got normal/invents=false
- OK `tool:incomplete` — expected disadvantage/invents=false, got disadvantage/invents=false
- OK `tool:improvised` — expected disadvantage/invents=false, got disadvantage/invents=false
- OK `tool:indispensable-missing` — expected impossible/invents=false, got impossible/invents=false
- OK `tool:high-quality` — expected explicit-advantage-only/invents=false, got explicit-advantage-only/invents=false
- OK `tool:high-quality-no-bonus` — high-quality must not invent numeric bonus
- OK `fixture:cross-setting-tools` — improvised crowbar (modern) / missing lockpicks (fantasy) / masterwork kit (scifi) — abstract suitability only
- OK `weapon:light-load` — light load=1
- OK `weapon:standard-load` — standard load=2
- OK `weapon:heavy-load` — heavy load=3
- OK `weapon:finesse-str` — Finesse without preferDexterity stays Strength
- OK `weapon:finesse-dex` — Finesse may use Dexterity
- OK `weapon:no-finesse` — without Finesse, Dexterity preference is ignored
- OK `weapon:durchdringung-parse` — Durchdringung 2 → 2
- OK `weapon:durchdringung-apply` — protection 3 with Durchdringung 2 → effective 1
- OK `load:capacity` — carryCapacity(2)=9
- OK `load:under` — at capacity not overloaded
- OK `load:over` — over capacity overloaded
- OK `load:double` — double capacity threshold at >18
- OK `load:effects-contract` — over → Bewegung −3 m + Nachteil Athletik/Akrobatik; >2× → keine normale längere Bewegung
- OK `resources:default` — default current=3
- OK `resources:level-0` — level 0 valid
- OK `resources:level-1` — level 1 valid
- OK `resources:level-2` — level 2 valid
- OK `resources:level-3` — level 3 valid
- OK `resources:level-4` — level 4 valid
- OK `resources:level-5` — level 5 valid
- OK `resources:level-6-invalid` — 6 invalid
- OK `resources:parse-extensible` — JSONB sagadriveAbstract supports current+base
- OK `resources:serialize` — serialize writes sagadriveAbstract.current
- OK `afford:under` — cost 1 < res 3 → allow-free
- OK `afford:equal` — cost 3 = res 3 → require-purchase-choice
- OK `afford:purchase-minus-1` — purchase at equal cost → resources 2
- OK `afford:gift-keeps` — gift keeps resources at 3
- OK `afford:over` — cost 5 > res 2 → blocked-needs-gift-override
- OK `afford:gift-override-no-debit` — gift override does not debit resources
- OK `cost:valid-0` — ItemCost 0
- OK `cost:valid-1` — ItemCost 1
- OK `cost:valid-2` — ItemCost 2
- OK `cost:valid-3` — ItemCost 3
- OK `cost:valid-4` — ItemCost 4
- OK `cost:valid-5` — ItemCost 5
- OK `ui:resources control` — found data-character-resources
- OK `ui:affordability dialog` — found data-inventory-affordability-dialog
- OK `ui:V2 panel resources props` — found onResourcesChange
- OK `ui:editor persists abstractResources` — found abstractResources
- OK `ui:repo serializes resources JSONB` — found serializeCharacterAbstractResources
- OK `ui:playwright spec present` — found validate-gear-resources-load

## Findings

(none)

