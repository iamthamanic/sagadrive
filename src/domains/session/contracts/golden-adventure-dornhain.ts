/**
 * golden-adventure-dornhain — Versioned Golden Adventure Package (#377).
 * Location: src/domains/session/contracts/golden-adventure-dornhain.ts
 *
 * "Das Flüstern unter Dornhain" — state sandbox, not linear scene script.
 * Reuses #302 pregens/fixture foundation; package is not mutable global DB adventure.
 */
import type { AdventureRuntimeState } from './adventure-runtime-state';
import { emptyAdventureRuntimeState } from './adventure-runtime-state';
import {
  getPreparedAdventureFixture,
  listPreparedAdventurePregens,
  PREPARED_ADVENTURE_HEALING_POTION_ID,
  type PreparedAdventurePregenDescriptor,
} from './prepared-adventure-fixture';

export const GOLDEN_ADVENTURE_DORNHAIN_PACKAGE_ID = 'package:dornhain.whisper.v1' as const;
export const GOLDEN_ADVENTURE_DORNHAIN_SCHEMA_VERSION = 1 as const;

/** Quest item stand-in from fantasy-basic (Siegelstein-Narrativ). */
export const DORNHAIN_SEAL_STONE_ID = 'builtin.fantasy.gemstone' as const;
export const DORNHAIN_CONSUMABLE_ID = PREPARED_ADVENTURE_HEALING_POTION_ID;
export const DORNHAIN_EQUIPPABLE_ID = 'builtin.fantasy.longsword' as const;

export type DornhainLocationRef = {
  readonly id: string;
  readonly label: string;
  readonly scenePresetHint: string | null;
};

export type DornhainKnowledgeFact = {
  readonly id: string;
  readonly visibility: 'public' | 'gm_only' | 'discovered' | 'character_specific';
  readonly summary: string;
};

export type DornhainEscalationClock = {
  readonly id: string;
  readonly label: string;
  readonly max: number;
};

export type DornhainStressScenario = {
  readonly id: string;
  readonly kind: 'death-start';
  readonly description: string;
  /** Initial life status for a named pregen under stress mode. */
  readonly targetPregenId: string;
  readonly initialLifeStatus: 'downed';
  readonly dyingLevel: number;
};

export type GoldenAdventureDornhainPackage = {
  readonly packageId: typeof GOLDEN_ADVENTURE_DORNHAIN_PACKAGE_ID;
  readonly schemaVersion: typeof GOLDEN_ADVENTURE_DORNHAIN_SCHEMA_VERSION;
  readonly title: string;
  readonly synopsis: string;
  readonly durationMinutes: { readonly min: number; readonly max: number };
  /** Foundation fixture id (#302) — migrated/reused, not duplicated. */
  readonly foundationFixtureId: string;
  readonly locations: readonly DornhainLocationRef[];
  readonly pregens: readonly PreparedAdventurePregenDescriptor[];
  readonly knowledgeFacts: readonly DornhainKnowledgeFact[];
  readonly itemDefinitionIds: readonly string[];
  readonly escalationClocks: readonly DornhainEscalationClock[];
  readonly stressScenarios: readonly DornhainStressScenario[];
  readonly directorPresetHints: readonly string[];
};

const LOCATIONS: readonly DornhainLocationRef[] = [
  { id: 'loc.tavern', label: 'Taverne Zum Flüstern', scenePresetHint: 'tavern' },
  { id: 'loc.market', label: 'Marktplatz Dornhain', scenePresetHint: null },
  { id: 'loc.woods', label: 'Schattenwald', scenePresetHint: 'forest' },
  { id: 'loc.crypt', label: 'Krypta unter dem Hügel', scenePresetHint: null },
  { id: 'loc.bandit-camp', label: 'Banditenlager (falsche Spur)', scenePresetHint: 'forest' },
];

const KNOWLEDGE: readonly DornhainKnowledgeFact[] = [
  {
    id: 'fact.disappearances',
    visibility: 'public',
    summary: 'In Dornhain verschwinden Menschen — die Stadt ist nervös.',
  },
  {
    id: 'fact.bandits-suspected',
    visibility: 'discovered',
    summary: 'Viele verdächtigen Banditen — sie sind nicht die eigentliche Ursache.',
  },
  {
    id: 'fact.relic-opened',
    visibility: 'gm_only',
    summary: 'Ein Relikt wurde geöffnet; die Gefahr eskaliert mit der Zeit.',
  },
  {
    id: 'fact.hidden-npc',
    visibility: 'gm_only',
    summary: 'Ein vertrauter Dorfbewohner ist in die Reliktöffnung verwickelt.',
  },
];

export const GOLDEN_ADVENTURE_DORNHAIN: GoldenAdventureDornhainPackage = {
  packageId: GOLDEN_ADVENTURE_DORNHAIN_PACKAGE_ID,
  schemaVersion: GOLDEN_ADVENTURE_DORNHAIN_SCHEMA_VERSION,
  title: 'Das Flüstern unter Dornhain',
  synopsis:
    'Fantasy-Mystery-Sandbox (60–90 Min): Verschwinden, falsche Banditen-Schuld, geöffnetes Relikt, verborgene Beteiligung und eskalierende Gefahr — freie Reihenfolge der Orte.',
  durationMinutes: { min: 60, max: 90 },
  foundationFixtureId: getPreparedAdventureFixture().fixtureId,
  locations: LOCATIONS,
  pregens: listPreparedAdventurePregens(),
  knowledgeFacts: KNOWLEDGE,
  itemDefinitionIds: [
    DORNHAIN_SEAL_STONE_ID,
    DORNHAIN_CONSUMABLE_ID,
    DORNHAIN_EQUIPPABLE_ID,
  ],
  escalationClocks: [
    { id: 'danger', label: 'Reliktgefahr', max: 6 },
    { id: 'suspicion', label: 'Dorfverdacht', max: 4 },
  ],
  stressScenarios: [
    {
      id: 'stress.death-start',
      kind: 'death-start',
      description:
        'Deterministischer Start: Brenna beginnt downed (Sterbend 2) für Downed→Stabilisierung→Tod→Persistenz ohne Story-Hardcode.',
      targetPregenId: 'pregen.warrior',
      initialLifeStatus: 'downed',
      dyingLevel: 2,
    },
  ],
  directorPresetHints: ['scene-arrival', 'combat-split', 'reveal-letterbox'],
};

export function getGoldenAdventureDornhainPackage(): GoldenAdventureDornhainPackage {
  return GOLDEN_ADVENTURE_DORNHAIN;
}

/**
 * Build initial AdventureRuntimeState for a new Dornhain playthrough.
 * Does not mutate package/definition tables — pure projection for session/project.
 */
export function buildDornhainInitialAdventureRuntime(input?: {
  readonly stressDeathStart?: boolean;
}): AdventureRuntimeState {
  const base = emptyAdventureRuntimeState();
  const flags: Record<string, AdventureRuntimeState['flags'][string]> = {
    bandits_blamed: {
      key: 'bandits_blamed',
      value: true,
      visibility: 'shared',
      updatedAt: null,
    },
    relic_opened: {
      key: 'relic_opened',
      value: false,
      visibility: 'gm_only',
      updatedAt: null,
    },
    seal_stone_found: {
      key: 'seal_stone_found',
      value: false,
      visibility: 'shared',
      updatedAt: null,
    },
  };
  if (input?.stressDeathStart) {
    flags.stress_death_start = {
      key: 'stress_death_start',
      value: true,
      visibility: 'gm_only',
      updatedAt: null,
    };
  }
  const clocks: Record<string, AdventureRuntimeState['clocks'][string]> = {};
  for (const clock of GOLDEN_ADVENTURE_DORNHAIN.escalationClocks) {
    clocks[clock.id] = {
      id: clock.id,
      label: clock.label,
      value: 0,
      max: clock.max,
      visibility: 'shared',
    };
  }
  return {
    ...base,
    definitionRef: GOLDEN_ADVENTURE_DORNHAIN_PACKAGE_ID,
    flags,
    clocks,
    consequences: [
      {
        id: 'c-start-disappearances',
        kind: 'story',
        summary: 'Verschwinden belasten Dornhain — Ausgangslage.',
        visibility: 'public',
        createdAt: null,
      },
    ],
    sliceRevision: 0,
    updatedAt: null,
  };
}

export function assertGoldenAdventureDornhainIntegrity(
  pkg: GoldenAdventureDornhainPackage = GOLDEN_ADVENTURE_DORNHAIN,
): void {
  if (pkg.packageId !== GOLDEN_ADVENTURE_DORNHAIN_PACKAGE_ID) {
    throw new Error('Dornhain package id mismatch');
  }
  if (pkg.schemaVersion !== GOLDEN_ADVENTURE_DORNHAIN_SCHEMA_VERSION) {
    throw new Error('Dornhain schema version mismatch');
  }
  if (pkg.foundationFixtureId !== getPreparedAdventureFixture().fixtureId) {
    throw new Error('Dornhain must reuse #302 foundation fixture id');
  }
  if (pkg.pregens.length < 4) {
    throw new Error('Dornhain needs four canonical pregens');
  }
  const names = pkg.pregens.map((p) => p.displayName);
  for (const expected of [
    'Brenna Sturmfaust',
    'Kael Schattenpfad',
    'Liora Mondschein',
    'Oskar Federkiel',
  ]) {
    if (!names.includes(expected)) {
      throw new Error(`Missing pregen ${expected}`);
    }
  }
  if (pkg.locations.length < 4) {
    throw new Error('Dornhain needs free-order locations (>=4)');
  }
  if (!pkg.itemDefinitionIds.includes(DORNHAIN_SEAL_STONE_ID)) {
    throw new Error('Seal Stone item missing');
  }
  if (!pkg.itemDefinitionIds.includes(DORNHAIN_CONSUMABLE_ID)) {
    throw new Error('Consumable missing');
  }
  if (!pkg.itemDefinitionIds.includes(DORNHAIN_EQUIPPABLE_ID)) {
    throw new Error('Equippable missing');
  }
  if (pkg.knowledgeFacts.some((f) => f.visibility === 'gm_only') !== true) {
    throw new Error('Need gm_only knowledge facts');
  }
  if (pkg.stressScenarios.length < 1) {
    throw new Error('Need death stress scenario');
  }
  const initial = buildDornhainInitialAdventureRuntime({ stressDeathStart: true });
  if (initial.definitionRef !== GOLDEN_ADVENTURE_DORNHAIN_PACKAGE_ID) {
    throw new Error('Initial runtime must point at package definitionRef');
  }
  if (!initial.flags.stress_death_start) {
    throw new Error('Stress flag missing on initial runtime');
  }
}

/**
 * Instantiate payload for normal adventure runtime commands (no admin DB seed).
 */
export function dornhainInstantiateCommands(input?: {
  readonly stressDeathStart?: boolean;
}): readonly {
  readonly op: 'set_definition_ref' | 'set_flag' | 'tick_clock' | 'add_consequence';
  readonly definitionRef?: string;
  readonly key?: string;
  readonly value?: boolean | string;
  readonly visibility?: 'public' | 'shared' | 'gm_only';
  readonly clockId?: string;
  readonly clockDelta?: number;
  readonly clockMax?: number;
  readonly summary?: string;
  readonly consequenceKind?: string;
}[] {
  const state = buildDornhainInitialAdventureRuntime(input);
  const cmds: Array<{
    readonly op: 'set_definition_ref' | 'set_flag' | 'tick_clock' | 'add_consequence';
    readonly definitionRef?: string;
    readonly key?: string;
    readonly value?: boolean | string;
    readonly visibility?: 'public' | 'shared' | 'gm_only';
    readonly clockId?: string;
    readonly clockDelta?: number;
    readonly clockMax?: number;
    readonly summary?: string;
    readonly consequenceKind?: string;
  }> = [
    {
      op: 'set_definition_ref',
      definitionRef: GOLDEN_ADVENTURE_DORNHAIN_PACKAGE_ID,
    },
  ];
  for (const flag of Object.values(state.flags)) {
    cmds.push({
      op: 'set_flag',
      key: flag.key,
      value: flag.value as boolean | string,
      visibility: flag.visibility,
    });
  }
  for (const clock of Object.values(state.clocks)) {
    cmds.push({
      op: 'tick_clock',
      clockId: clock.id,
      clockDelta: 0,
      clockMax: clock.max,
    });
  }
  for (const c of state.consequences) {
    cmds.push({
      op: 'add_consequence',
      summary: c.summary,
      consequenceKind: c.kind,
      visibility: c.visibility,
    });
  }
  return cmds;
}
