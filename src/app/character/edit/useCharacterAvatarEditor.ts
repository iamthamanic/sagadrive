/**
 * useCharacterAvatarEditor — Appearance + Avatar-V2 + Meshy/Upload local state for CharacterEditor (#307).
 * Location: src/app/character/edit/useCharacterAvatarEditor.ts
 *
 * Behavior-neutral extract of the avatar cluster from CharacterEditor (NPC-editor pattern).
 * CharacterEditor remains the composition root and owns save/load/bootstrap orchestration.
 */
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type MouseEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import { toast } from 'sonner@2.0.3';
import type { AvatarPortraitCaptureHandle } from '../avatar/AvatarCanvas';
import type { MeshyAvatarJobUiState } from '../avatar/AvatarMeshyPanel';
import { useAvatarComposition } from '../avatar/useAvatarComposition';
import { useAvatarEditorSurfaces } from '../avatar/useAvatarEditorSurfaces';
import type {
  AvatarSource,
  AvatarTraitGroupId,
  AvatarV2Anatomy,
  AvatarV2BodyFamily,
  AvatarV2Modularity,
  BaseBodySpeciesId,
  CanonicalBodyFamilyId,
  AvatarMorphEvidenceInput,
  BodyConversionResultV1,
  GenerateProductModeId,
  ImportOriginalKeepSeedV1,
  ModularGenerateFlowResultV1,
  SagaDriveFaceAnchorsManifestV1,
} from '../../../domains/character/avatar';
import {
  applySpeciesTemplateIngress,
  createDefaultAvatarMorphState,
  evaluateAvatarSourceSwitch,
  isCanonicalBodyFamilyId,
  migrateCharacterAvatarDtoToMorph,
  morphToLegacySlider,
  parseSpeciesTemplatePersistenceId,
  readFaceAnchorsFromAvatar,
  resolveAvatarSource,
  resolveSpeciesTemplateModelUrl,
  morphEvidenceFromImportAnalysis,
  buildGenerateEditorSeed,
  runModularGenerateFlow,
  validateAvatarMorphInput,
  validateFaceAnchorsManifestV1,
  withAvatarMorphState,
  type SagaDriveAvatarMorphStateV1,
} from '../../../domains/character/avatar';
import {
  createCharacterStudioAvatar,
  getAvatarRacePreset,
  normalizeSafeUrl,
} from '../../../domains/character/use-cases/avatar-presets';
import type { CharacterAppearanceDto, CharacterGenderReading } from '../../../domains/character';
import { characterService } from '../../../infrastructure/character/character-service';

type ImportCompositionState = {
  anatomy: AvatarV2Anatomy;
  bodyFamily: AvatarV2BodyFamily;
  bodyCompatibility: AvatarV2BodyFamily | 'unknown';
  modularity: AvatarV2Modularity;
};

export type UseCharacterAvatarEditorArgs = {
  characterRace: string;
  characterName: string;
  onCharacterRaceChange: (race: string) => void;
  /** Sheet Geschlecht — drives template preview mesh (m/w); divers → no mesh. */
  genderReading?: CharacterGenderReading;
};

export type CharacterAvatarEditorApi = {
  bodySize: number[];
  height: number[];
  headStyle: string;
  ears: string;
  hairStyle: string;
  hairColor: string;
  skinTone: string;
  clothing: string;
  accessory: string;
  portraitUrl: string;
  setPortraitUrl: Dispatch<SetStateAction<string>>;
  importedModelUrl: string | undefined;
  setImportedModelUrl: Dispatch<SetStateAction<string | undefined>>;
  avatarSource: AvatarSource;
  meshyUi: MeshyAvatarJobUiState | null;
  setMeshyUi: Dispatch<SetStateAction<MeshyAvatarJobUiState | null>>;
  sagaDriveDirty: boolean;
  setSagaDriveDirty: Dispatch<SetStateAction<boolean>>;
  avatarMorph: SagaDriveAvatarMorphStateV1;
  setAvatarMorph: Dispatch<SetStateAction<SagaDriveAvatarMorphStateV1>>;
  speciesTemplateId: string | null;
  avatarBodyFamily: CanonicalBodyFamilyId | null;
  starterWardrobeIds: readonly string[];
  templateWarningsDe: readonly string[];
  importComposition: ImportCompositionState | null;
  modularGenerateResult: ModularGenerateFlowResultV1 | null;
  uploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  avatarCanvasRef: RefObject<HTMLCanvasElement | null>;
  portraitCaptureRef: RefObject<AvatarPortraitCaptureHandle | null>;
  currentAvatar: ReturnType<typeof createCharacterStudioAvatar>;
  avatarComposition: ReturnType<typeof useAvatarComposition>;
  editorSurfaces: ReturnType<typeof useAvatarEditorSurfaces>;
  morphCapabilities: ReturnType<typeof useAvatarEditorSurfaces>['morphFlags'];
  sourceCapabilitySummary: string;
  appearanceEditable: boolean;
  selectedTemplateSpeciesId: BaseBodySpeciesId | null;
  applyImportOriginalKeep: (seed: ImportOriginalKeepSeedV1) => void;
  applyBodyConversion: (result: BodyConversionResultV1) => void;
  applySpeciesTemplate: (speciesId: BaseBodySpeciesId) => void;
  applyAppearancePreset: (race: string) => void;
  requestAvatarSourceChange: (next: AvatarSource) => void;
  handleMeshySuccess: (payload: {
    modelUrl: string;
    productMode: GenerateProductModeId;
  }) => void;
  handleMorphChange: (next: SagaDriveAvatarMorphStateV1) => void;
  handleBaseTraitChange: (groupId: AvatarTraitGroupId, traitId: string) => void;
  setHairColorDirty: (value: string) => void;
  setSkinToneDirty: (value: string) => void;
  /** Persist Face Mapping anchors on the avatar (Speichern in Face Setup). */
  commitFaceAnchors: (manifest: SagaDriveFaceAnchorsManifestV1) => boolean;
  hydrateAvatarFromAppearance: (
    appearance: CharacterAppearanceDto,
    portraitUrlRaw: string | undefined,
  ) => void;
  uploadPortrait: (file: File, successMessage?: string) => Promise<void>;
  captureAndUploadPortrait: (successMessage: string) => Promise<void>;
  handleImageUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleGeneratePortrait: () => Promise<void>;
  handleAvatarRuntimeReady: () => void;
  requestAutoPortraitAfterModel: () => void;
  handleRemoveImage: (event: MouseEvent) => void;
};

export function useCharacterAvatarEditor({
  characterRace,
  characterName,
  onCharacterRaceChange,
  genderReading,
}: UseCharacterAvatarEditorArgs): CharacterAvatarEditorApi {
  const initialPreset = getAvatarRacePreset('human');
  const [bodySize, setBodySize] = useState([initialPreset.bodySize]);
  const [height, setHeight] = useState([initialPreset.height]);
  const [headStyle, setHeadStyle] = useState(initialPreset.head);
  const [ears, setEars] = useState(initialPreset.ears);
  const [hairStyle, setHairStyle] = useState(initialPreset.hair);
  const [hairColor, setHairColor] = useState(initialPreset.hairColor);
  const [skinTone, setSkinTone] = useState(initialPreset.skinTone);
  const [clothing, setClothing] = useState(initialPreset.clothing);
  const [accessory, setAccessory] = useState(initialPreset.accessory ?? 'none');

  const [portraitUrl, setPortraitUrl] = useState('');
  const [importedModelUrl, setImportedModelUrl] = useState<string | undefined>(undefined);
  const [avatarSource, setAvatarSource] = useState<AvatarSource>('sagadrive');
  const [meshyUi, setMeshyUi] = useState<MeshyAvatarJobUiState | null>(null);
  const [sagaDriveDirty, setSagaDriveDirty] = useState(false);
  const [faceAnchorsManifest, setFaceAnchorsManifest] =
    useState<SagaDriveFaceAnchorsManifestV1 | null>(null);
  const [avatarMorph, setAvatarMorph] = useState<SagaDriveAvatarMorphStateV1>(() =>
    createDefaultAvatarMorphState(),
  );
  const [speciesTemplateId, setSpeciesTemplateId] = useState<string | null>(null);
  const [avatarBodyFamily, setAvatarBodyFamily] = useState<CanonicalBodyFamilyId | null>(null);
  const [starterWardrobeIds, setStarterWardrobeIds] = useState<readonly string[]>([]);
  const [templateWarningsDe, setTemplateWarningsDe] = useState<readonly string[]>([]);
  /** Composition axes from Import Flow v2 analysis — never invented client-side. */
  const [importComposition, setImportComposition] = useState<ImportCompositionState | null>(null);
  const [importMorphEvidence, setImportMorphEvidence] = useState<AvatarMorphEvidenceInput | null>(null);
  const [modularGenerateResult, setModularGenerateResult] =
    useState<ModularGenerateFlowResultV1 | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarCanvasRef = useRef<HTMLCanvasElement>(null);
  const portraitCaptureRef = useRef<AvatarPortraitCaptureHandle | null>(null);
  const pendingAutoPortraitRef = useRef(false);

  const selectedTemplateSpeciesId = useMemo((): BaseBodySpeciesId | null => {
    return parseSpeciesTemplatePersistenceId(speciesTemplateId);
  }, [speciesTemplateId]);

  const currentAvatar = useMemo(() => {
    const templatePreviewUrl =
      avatarSource === 'sagadrive'
        ? resolveSpeciesTemplateModelUrl({
            speciesId: selectedTemplateSpeciesId,
            genderReading,
          })
        : undefined;
    const base = createCharacterStudioAvatar({
      race: characterRace,
      head: headStyle,
      ears,
      hairStyle,
      clothing,
      accessory: accessory === 'none' ? undefined : accessory,
      hairColor,
      skinTone,
      bodySize: morphToLegacySlider(avatarMorph.body.build),
      height: morphToLegacySlider(avatarMorph.body.height),
      modelUrl: importedModelUrl ?? templatePreviewUrl,
      source: avatarSource,
    });
    const withMorph = withAvatarMorphState(base, {
      ...avatarMorph,
      colors: {
        ...avatarMorph.colors,
        hair: hairColor,
        skin: skinTone,
      },
    });
    if (avatarSource === 'import' && importComposition) {
      return {
        ...withMorph,
        body_family: importComposition.bodyFamily,
        body_compatibility: importComposition.bodyCompatibility,
        anatomy: importComposition.anatomy,
        modularity: importComposition.modularity,
        ...(faceAnchorsManifest ? { face_anchors: faceAnchorsManifest } : {}),
      };
    }
    // Native template OR modular generate (#269): family + wardrobe without requiring species.
    if (avatarBodyFamily && starterWardrobeIds.length > 0) {
      return {
        ...withMorph,
        ...(speciesTemplateId ? { template_id: speciesTemplateId } : {}),
        body_family: avatarBodyFamily,
        body_compatibility: avatarBodyFamily,
        anatomy: 'humanoid' as const,
        modularity:
          modularGenerateResult?.modularity ??
          importComposition?.modularity ??
          ('modular-parts' as const),
        starter_wardrobe: [...starterWardrobeIds],
        ...(faceAnchorsManifest ? { face_anchors: faceAnchorsManifest } : {}),
      };
    }
    if (!speciesTemplateId || !avatarBodyFamily) {
      return faceAnchorsManifest
        ? { ...withMorph, face_anchors: faceAnchorsManifest }
        : withMorph;
    }
    return {
      ...withMorph,
      template_id: speciesTemplateId,
      body_family: avatarBodyFamily,
      anatomy: 'humanoid' as const,
      modularity: 'modular-parts' as const,
      starter_wardrobe: [...starterWardrobeIds],
      ...(faceAnchorsManifest ? { face_anchors: faceAnchorsManifest } : {}),
    };
  }, [
    accessory,
    avatarBodyFamily,
    avatarMorph,
    avatarSource,
    characterRace,
    clothing,
    ears,
    faceAnchorsManifest,
    genderReading,
    hairColor,
    hairStyle,
    headStyle,
    importComposition,
    importedModelUrl,
    modularGenerateResult,
    selectedTemplateSpeciesId,
    skinTone,
    speciesTemplateId,
    starterWardrobeIds,
  ]);

  const requestAutoPortraitAfterModel = () => {
    pendingAutoPortraitRef.current = true;
  };

  const applyImportOriginalKeep = (seed: ImportOriginalKeepSeedV1) => {
    setImportedModelUrl(seed.modelUrl);
    setAvatarSource('import');
    setSpeciesTemplateId(null);
    setStarterWardrobeIds([]);
    setTemplateWarningsDe([]);
    setFaceAnchorsManifest(null);
    setImportComposition({
      anatomy: seed.anatomy,
      bodyFamily: seed.bodyFamily,
      bodyCompatibility: seed.bodyCompatibility,
      modularity: seed.modularity,
    });
    // Custom creature: never invent morph targets; fail-closed evidence only.
    setImportMorphEvidence(
      morphEvidenceFromImportAnalysis({
        anatomy: seed.anatomy,
        modularity: seed.modularity,
      }),
    );
    if (isCanonicalBodyFamilyId(seed.bodyFamily)) {
      setAvatarBodyFamily(seed.bodyFamily);
    } else {
      setAvatarBodyFamily(null);
    }
    requestAutoPortraitAfterModel();
    toast.success(
      seed.anatomy === 'custom-creature'
        ? 'Eigener Körper behalten — ohne Humanoid-Morph-Zwang'
        : 'Originalkörper behalten — Editor bereit',
    );
  };

  const applyBodyConversion = (result: BodyConversionResultV1) => {
    if (result.status === 'failed') {
      toast.error(result.limitationsDe[0] ?? 'Conversion fehlgeschlagen — Original unverändert');
      return;
    }
    // Converted artifact uses canonical body — clear external mesh URL.
    setImportedModelUrl(undefined);
    setAvatarSource('sagadrive');
    setSpeciesTemplateId(null);
    setStarterWardrobeIds([]);
    setTemplateWarningsDe(result.limitationsDe);
    setImportComposition(null);
    setImportMorphEvidence(null);
    setAvatarBodyFamily(result.targetFamily);
    setAvatarMorph(result.morphState);
    setHeadStyle(result.traits.head);
    setEars(result.traits.ears);
    setHairStyle(result.traits.hair);
    setClothing(result.traits.clothing);
    setAccessory(result.traits.accessory === 'none' ? 'none' : result.traits.accessory);
    setHairColor(result.colors.hair);
    setSkinTone(result.colors.skin);
    setBodySize([morphToLegacySlider(result.morphState.body.build)]);
    setHeight([morphToLegacySlider(result.morphState.body.height)]);
    setSagaDriveDirty(true);
    toast.success(
      result.status === 'degraded'
        ? `Übertragen auf ${result.targetFamily} (eingeschränkt)`
        : `Übertragen auf ${result.targetFamily}`,
      { description: result.tradeoffCopyDe },
    );
  };

  const applySpeciesTemplate = (speciesId: BaseBodySpeciesId) => {
    const seed = applySpeciesTemplateIngress(speciesId);
    onCharacterRaceChange(speciesId);
    setAvatarSource('sagadrive');
    setImportedModelUrl(undefined);
    setImportComposition(null);
    setImportMorphEvidence(null);
    setFaceAnchorsManifest(null);
    setSpeciesTemplateId(seed.templateId);
    setAvatarBodyFamily(seed.bodyFamily);
    setStarterWardrobeIds(seed.starterWardrobeIds);
    setTemplateWarningsDe(seed.warningsDe);
    setAvatarMorph(seed.morphState);
    setHeadStyle(seed.traits.head);
    setEars(seed.traits.ears);
    setHairStyle(seed.traits.hair);
    setClothing(seed.traits.clothing);
    setAccessory(seed.traits.accessory ?? 'none');
    setHairColor(seed.colors.hair);
    setSkinTone(seed.colors.skin);
    setBodySize([morphToLegacySlider(seed.morphState.body.build)]);
    setHeight([morphToLegacySlider(seed.morphState.body.height)]);
    setSagaDriveDirty(true);
    if (seed.warningsDe.length > 0) {
      toast.message('Vorlage geladen — einige Kleidungsstücke fehlen', {
        description: seed.warningsDe[0],
      });
    } else {
      toast.success(`Vorlage „${seed.labelDe}“ geladen`);
    }
  };

  const applyAppearancePreset = (race: string) => {
    const preset = getAvatarRacePreset(race);
    setBodySize([preset.bodySize]);
    setHeight([preset.height]);
    setHeadStyle(preset.head);
    setEars(preset.ears);
    setHairStyle(preset.hair);
    setHairColor(preset.hairColor);
    setSkinTone(preset.skinTone);
    setClothing(preset.clothing);
    setAccessory(preset.accessory ?? 'none');
  };

  const avatarComposition = useAvatarComposition(currentAvatar);
  const hasExternalAvatarModel = Boolean(importedModelUrl);
  // External meshes stay pending until structure evidence arrives (fail-closed).
  const editorSurfaces = useAvatarEditorSurfaces({
    composition: avatarComposition,
    hasExternalModel: hasExternalAvatarModel,
    inspected: hasExternalAvatarModel ? importMorphEvidence : undefined,
  });
  const morphCapabilities = editorSurfaces.morphFlags;
  const sourceCapabilitySummary = editorSurfaces.summaryDe;
  const appearanceEditable =
    editorSurfaces.status !== 'pending' &&
    (editorSurfaces.surfaces.morphBody ||
      editorSurfaces.surfaces.morphFace ||
      editorSurfaces.surfaces.traits ||
      editorSurfaces.surfaces.colors);

  const requestAvatarSourceChange = (next: AvatarSource) => {
    if (next === avatarSource) return;
    const decision = evaluateAvatarSourceSwitch({
      from: avatarSource,
      to: next,
      dirtySagaDrive: sagaDriveDirty,
    });
    if (decision.needsConfirm) {
      const ok = window.confirm(decision.messageDe ?? 'Avatar-Quelle wechseln?');
      if (!ok) return;
    }
    setAvatarSource(next);
    setModularGenerateResult(null);
    setFaceAnchorsManifest(null);
    if (next === 'sagadrive') {
      setSagaDriveDirty(false);
    }
  };

  const handleMeshySuccess = ({
    modelUrl,
    productMode,
  }: {
    modelUrl: string;
    productMode: GenerateProductModeId;
  }) => {
    const modular = runModularGenerateFlow({
      productMode,
      modelUrl,
      // Humanoid editable path uses controlled human fixture defaults;
      // unusual anatomy is detected via force/fixture in domain checks.
      fixtureId: productMode === 'editable-wardrobe' ? 'human' : undefined,
    });
    setModularGenerateResult(modular);

    if (modular.status === 'degraded-free-form') {
      const seed = buildGenerateEditorSeed({
        modelUrl,
        productMode: 'free-form',
        adapterProviderId: 'meshy',
      });
      setImportedModelUrl(modelUrl);
      setAvatarSource('meshy');
      setSpeciesTemplateId(null);
      setFaceAnchorsManifest(null);
      setStarterWardrobeIds([]);
      setTemplateWarningsDe([...modular.limitationsDe, ...seed.composition.limitationsDe]);
      setImportComposition({
        anatomy: 'custom-creature',
        bodyFamily: 'custom',
        bodyCompatibility: 'custom',
        modularity: 'monolithic',
      });
      setImportMorphEvidence({
        hasBodyMorphTargets: false,
        hasFaceMorphTargets: false,
      });
      setAvatarBodyFamily(null);
      requestAutoPortraitAfterModel();
      toast.success(modular.headlineDe);
      return;
    }

    // Editierbar modular: library body path — clear external mesh URL
    // when we have a canonical family (catalog body + wardrobe).
    if (modular.fullModular && isCanonicalBodyFamilyId(modular.bodyFamily)) {
      setImportedModelUrl(undefined);
      setAvatarSource('sagadrive');
      setAvatarBodyFamily(modular.bodyFamily);
    } else {
      setImportedModelUrl(modelUrl);
      setAvatarSource('meshy');
      if (isCanonicalBodyFamilyId(modular.bodyFamily)) {
        setAvatarBodyFamily(modular.bodyFamily);
      } else {
        setAvatarBodyFamily(null);
      }
    }
    setSpeciesTemplateId(null);
    setFaceAnchorsManifest(null);
    setStarterWardrobeIds([...modular.starterWardrobeIds]);
    setTemplateWarningsDe([...modular.limitationsDe]);
    setImportComposition({
      anatomy: 'humanoid',
      bodyFamily: modular.bodyFamily,
      bodyCompatibility: modular.bodyFamily,
      modularity: modular.modularity,
    });
    setImportMorphEvidence({
      hasBodyMorphTargets: modular.fullModular,
      hasFaceMorphTargets: modular.fullModular,
    });
    requestAutoPortraitAfterModel();
    toast.success(modular.headlineDe);
  };

  const handleMorphChange = (next: SagaDriveAvatarMorphStateV1) => {
    if (!editorSurfaces.surfaces.morphBody && !editorSurfaces.surfaces.morphFace) {
      return;
    }
    setAvatarMorph(next);
    setSagaDriveDirty(true);
    setHairColor(next.colors.hair);
    setSkinTone(next.colors.skin);
    setBodySize([morphToLegacySlider(next.body.build)]);
    setHeight([morphToLegacySlider(next.body.height)]);
  };

  const handleBaseTraitChange = (groupId: AvatarTraitGroupId, traitId: string) => {
    if (!editorSurfaces.surfaces.traits) return;
    if (groupId === 'clothing' && !editorSurfaces.surfaces.clothing) return;
    setSagaDriveDirty(true);
    switch (groupId) {
      case 'head':
        setHeadStyle(traitId);
        break;
      case 'ears':
        setEars(traitId);
        break;
      case 'hair':
        setHairStyle(traitId);
        break;
      case 'clothing':
        setClothing(traitId);
        break;
      case 'accessory':
        setAccessory(traitId);
        break;
      default: {
        const _exhaustive: never = groupId;
        return _exhaustive;
      }
    }
  };

  const setHairColorDirty = (value: string) => {
    setHairColor(value);
    setSagaDriveDirty(true);
  };

  const setSkinToneDirty = (value: string) => {
    setSkinTone(value);
    setSagaDriveDirty(true);
  };

  const commitFaceAnchors = (manifest: SagaDriveFaceAnchorsManifestV1): boolean => {
    const validated = validateFaceAnchorsManifestV1(manifest);
    if (!validated.ok) {
      toast.error('Face Mapping ungültig — Speichern abgebrochen');
      return false;
    }
    setFaceAnchorsManifest(manifest);
    setSagaDriveDirty(true);
    toast.success('Face Mapping gespeichert', {
      description: 'Mit Charakter speichern, damit es nach dem Reload bleibt.',
    });
    return true;
  };

  const hydrateAvatarFromAppearance = (
    appearance: CharacterAppearanceDto,
    portraitUrlRaw: string | undefined,
  ) => {
    setPortraitUrl(portraitUrlRaw ? (normalizeSafeUrl(portraitUrlRaw) ?? '') : '');
    setBodySize([appearance.body_size ?? 50]);
    setHeight([appearance.height ?? 50]);
    setHeadStyle(appearance.face_features || appearance.avatar?.traits.head || 'human-balanced');
    setEars(appearance.avatar?.traits.ears || 'round');
    setHairStyle(appearance.hair_style || appearance.avatar?.traits.hair || 'short');
    setHairColor(appearance.hair_color || appearance.avatar?.colors.hair || '#3f2a1d');
    setSkinTone(appearance.skin_tone || appearance.avatar?.colors.skin || '#c58c6a');
    setClothing(appearance.clothing || appearance.avatar?.traits.clothing || 'casual');
    setAccessory(appearance.avatar?.traits.accessory ?? 'none');
    setImportedModelUrl(appearance.avatar?.model_url);
    setAvatarSource(
      resolveAvatarSource({
        source: appearance.avatar?.source,
        provider: appearance.avatar?.provider,
        modelUrl: appearance.avatar?.model_url,
      }),
    );
    setSagaDriveDirty(false);
    setFaceAnchorsManifest(readFaceAnchorsFromAvatar(appearance.avatar ?? null));
    setAvatarMorph(
      appearance.avatar?.morph
        ? validateAvatarMorphInput(appearance.avatar.morph).state
        : migrateCharacterAvatarDtoToMorph(appearance.avatar ?? null),
    );
    const restoredTemplateId =
      typeof appearance.avatar?.template_id === 'string' ? appearance.avatar.template_id : null;
    const restoredSpecies = parseSpeciesTemplatePersistenceId(restoredTemplateId);
    if (restoredSpecies) {
      setSpeciesTemplateId(restoredTemplateId);
      setAvatarBodyFamily(
        isCanonicalBodyFamilyId(appearance.avatar?.body_family)
          ? appearance.avatar.body_family
          : applySpeciesTemplateIngress(restoredSpecies).bodyFamily,
      );
      if (
        Array.isArray(appearance.avatar?.starter_wardrobe) &&
        appearance.avatar.starter_wardrobe.length > 0
      ) {
        setStarterWardrobeIds(appearance.avatar.starter_wardrobe);
      } else {
        setStarterWardrobeIds(applySpeciesTemplateIngress(restoredSpecies).starterWardrobeIds);
      }
      setTemplateWarningsDe([]);
    } else if (isCanonicalBodyFamilyId(appearance.avatar?.body_family)) {
      setSpeciesTemplateId(null);
      setAvatarBodyFamily(appearance.avatar.body_family);
      setStarterWardrobeIds(
        Array.isArray(appearance.avatar?.starter_wardrobe)
          ? appearance.avatar.starter_wardrobe
          : [],
      );
      setTemplateWarningsDe([]);
    } else {
      setSpeciesTemplateId(null);
      setAvatarBodyFamily(null);
      setStarterWardrobeIds([]);
      setTemplateWarningsDe([]);
    }
    const restoredSource = resolveAvatarSource({
      source: appearance.avatar?.source,
      provider: appearance.avatar?.provider,
      modelUrl: appearance.avatar?.model_url,
    });
    if (restoredSource === 'import' && appearance.avatar) {
      const anatomy =
        appearance.avatar.anatomy === 'custom-creature' ||
        appearance.avatar.anatomy === 'humanoid' ||
        appearance.avatar.anatomy === 'unknown'
          ? appearance.avatar.anatomy
          : appearance.avatar.anatomy === 'non-humanoid'
            ? 'custom-creature'
            : 'unknown';
      const modularity =
        appearance.avatar.modularity === 'modular-parts' ||
        appearance.avatar.modularity === 'limited' ||
        appearance.avatar.modularity === 'monolithic'
          ? appearance.avatar.modularity
          : appearance.avatar.modularity === 'none'
            ? 'monolithic'
            : 'limited';
      const bodyFamily =
        appearance.avatar.body_family === 'standard' ||
        appearance.avatar.body_family === 'compact' ||
        appearance.avatar.body_family === 'heavy' ||
        appearance.avatar.body_family === 'custom'
          ? appearance.avatar.body_family
          : 'custom';
      const bodyCompatibility =
        appearance.avatar.body_compatibility === 'standard' ||
        appearance.avatar.body_compatibility === 'compact' ||
        appearance.avatar.body_compatibility === 'heavy' ||
        appearance.avatar.body_compatibility === 'custom' ||
        appearance.avatar.body_compatibility === 'unknown'
          ? appearance.avatar.body_compatibility
          : bodyFamily === 'custom'
            ? 'custom'
            : 'unknown';
      setImportComposition({ anatomy, bodyFamily, bodyCompatibility, modularity });
      setImportMorphEvidence({ hasBodyMorphTargets: false, hasFaceMorphTargets: false });
    } else {
      setImportComposition(null);
      setImportMorphEvidence(null);
    }
  };

  const uploadPortrait = async (file: File, successMessage = 'Portrait gespeichert') => {
    setUploading(true);
    try {
      const url = await characterService.uploadPortrait(file);
      setPortraitUrl(url);
      toast.success(successMessage);
    } catch (error) {
      console.error('Portrait upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Portrait konnte nicht gespeichert werden');
    } finally {
      setUploading(false);
    }
  };

  const captureAndUploadPortrait = async (successMessage: string) => {
    const api = portraitCaptureRef.current;
    if (!api?.isReady()) {
      toast.error('3D-Vorschau ist noch nicht bereit');
      return;
    }
    const blob = await api.capturePortraitBlob();
    if (!blob) {
      toast.error('Portrait konnte nicht erzeugt werden');
      return;
    }
    const safeName = characterName.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'character';
    await uploadPortrait(new File([blob], `${safeName}-portrait.png`, { type: 'image/png' }), successMessage);
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte wähle eine Bilddatei aus');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bild ist zu groß. Maximum 5 MB');
      return;
    }
    await uploadPortrait(file);
  };

  const handleGeneratePortrait = async () => {
    await captureAndUploadPortrait('Portrait gespeichert');
  };

  const handleAvatarRuntimeReady = () => {
    if (!pendingAutoPortraitRef.current) return;
    pendingAutoPortraitRef.current = false;
    void captureAndUploadPortrait('Portrait automatisch erzeugt');
  };

  const handleRemoveImage = (event: MouseEvent) => {
    event.stopPropagation();
    setPortraitUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return {
    bodySize,
    height,
    headStyle,
    ears,
    hairStyle,
    hairColor,
    skinTone,
    clothing,
    accessory,
    portraitUrl,
    setPortraitUrl,
    importedModelUrl,
    setImportedModelUrl,
    avatarSource,
    meshyUi,
    setMeshyUi,
    sagaDriveDirty,
    setSagaDriveDirty,
    avatarMorph,
    setAvatarMorph,
    speciesTemplateId,
    avatarBodyFamily,
    starterWardrobeIds,
    templateWarningsDe,
    importComposition,
    modularGenerateResult,
    uploading,
    fileInputRef,
    avatarCanvasRef,
    portraitCaptureRef,
    currentAvatar,
    avatarComposition,
    editorSurfaces,
    morphCapabilities,
    sourceCapabilitySummary,
    appearanceEditable,
    selectedTemplateSpeciesId,
    applyImportOriginalKeep,
    applyBodyConversion,
    applySpeciesTemplate,
    applyAppearancePreset,
    requestAvatarSourceChange,
    handleMeshySuccess,
    handleMorphChange,
    handleBaseTraitChange,
    setHairColorDirty,
    setSkinToneDirty,
    commitFaceAnchors,
    hydrateAvatarFromAppearance,
    uploadPortrait,
    captureAndUploadPortrait,
    handleImageUpload,
    handleGeneratePortrait,
    handleAvatarRuntimeReady,
    requestAutoPortraitAfterModel,
    handleRemoveImage,
  };
}
