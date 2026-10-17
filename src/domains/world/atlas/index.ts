/**
 * world/atlas domain public API (#702).
 * Location: src/domains/world/atlas/index.ts
 */

export {
  DEFAULT_ATLAS_BOUNDS,
  EMPTY_ATLAS_LAYERS,
  isWorldAtlasMapKind,
  type WorldAtlasBounds,
  type WorldAtlasFeatureCollection,
  type WorldAtlasMapKind,
  type WorldAtlasMapSummary,
  type WorldAtlasMapVm,
} from './world-atlas.types';

export {
  parseWorldAtlasBounds,
  parseWorldAtlasLayers,
  parseWorldAtlasMapList,
  parseWorldAtlasMapSummary,
  parseWorldAtlasMapVm,
} from './validate-world-atlas';

export {
  UNIFIED_CANVAS_FORMAT,
  UNIFIED_CANVAS_MAX_BYTES,
  UNIFIED_CANVAS_META_KEY,
  assertUnifiedCanvasDocSize,
  defaultUnifiedCanvasLayers,
  emptyUnifiedCanvasDoc,
  extractUnifiedCanvasFromGeneratorMeta,
  mergeUnifiedCanvasIntoGeneratorMeta,
  parseUnifiedCanvasDoc,
  serializeUnifiedCanvasDoc,
  unifiedCanvasDocByteLength,
  type UnifiedCanvasDoc,
  type UnifiedCanvasLayerId,
  type UnifiedCanvasMaterial,
  type UnifiedCanvasObject,
  type UnifiedCanvasRoom,
  type UnifiedCanvasStampType,
  type UnifiedCanvasStroke,
  type UnifiedCanvasTool,
  type UnifiedCanvasWall,
} from './unified-canvas-doc';

export {
  applyMapEdit,
  applyMapEdits,
  pickObjectAt,
  pickRoomAt,
  type MapEditOperation,
  type MapTransform,
} from './map-edit-ops';

export {
  DUNGEON_GENERATOR_VERSION,
  DUNGEON_META_KEY,
  buildDungeonGeneratorMeta,
  dungeonNeedsReforgeConfirm,
  extractDungeonMetaFromGeneratorMeta,
  generateDungeon,
  mergeDungeonMetaIntoGeneratorMeta,
  validateDungeonConnectivity,
  type DungeonGenerateParams,
  type DungeonGenerateResult,
  type DungeonGeneratorMeta,
  type DungeonThemeKey,
} from './dungeon-generator';
