export type CharacterRulesetKey = 'sagadrive-core' | 'dnd-5.5e';

export interface CharacterCreationOption {
  value: string;
  label: string;
}

export const characterRulesetOptions: readonly CharacterCreationOption[] = [
  { value: 'sagadrive-core', label: 'SagaDrive Core' },
  { value: 'dnd-5.5e', label: 'Dungeons & Dragons 5.5e' },
];

export const sagaDriveArchetypeOptions: readonly CharacterCreationOption[] = [
  { value: 'fighter', label: 'Kämpfer' },
  { value: 'thinker', label: 'Denker' },
  { value: 'healer', label: 'Heiler' },
  { value: 'rebel', label: 'Rebell' },
  { value: 'diplomat', label: 'Diplomat' },
];

export const sagaDriveRaceOptions: readonly CharacterCreationOption[] = [
  { value: 'human', label: 'Mensch' },
  { value: 'elf', label: 'Elf' },
  { value: 'dwarf', label: 'Zwerg' },
  { value: 'halfling', label: 'Halbling' },
  { value: 'orc', label: 'Ork' },
  { value: 'cyborg', label: 'Cyborg' },
  { value: 'alien', label: 'Alien' },
];

export const sagaDriveSettingOptions: readonly CharacterCreationOption[] = [
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'real', label: 'Real' },
  { value: 'scifi', label: 'Sci-Fi' },
  { value: 'custom', label: 'Custom' },
];

export const sagaDriveEssenceOptions: readonly CharacterCreationOption[] = [
  { value: 'physical', label: 'Körperlich' },
  { value: 'mental', label: 'Mental' },
  { value: 'spiritual', label: 'Spirituell' },
  { value: 'practical', label: 'Paktbasiert' },
  { value: 'technological', label: 'Technologisch' },
];

export const dnd55ClassOptions: readonly CharacterCreationOption[] = [
  { value: 'barbarian', label: 'Barbarian' },
  { value: 'bard', label: 'Bard' },
  { value: 'cleric', label: 'Cleric' },
  { value: 'druid', label: 'Druid' },
  { value: 'fighter', label: 'Fighter' },
  { value: 'monk', label: 'Monk' },
  { value: 'paladin', label: 'Paladin' },
  { value: 'ranger', label: 'Ranger' },
  { value: 'rogue', label: 'Rogue' },
  { value: 'sorcerer', label: 'Sorcerer' },
  { value: 'warlock', label: 'Warlock' },
  { value: 'wizard', label: 'Wizard' },
];

export const dnd55SpeciesOptions: readonly CharacterCreationOption[] = [
  { value: 'aasimar', label: 'Aasimar' },
  { value: 'dragonborn', label: 'Dragonborn' },
  { value: 'dwarf', label: 'Dwarf' },
  { value: 'elf', label: 'Elf' },
  { value: 'gnome', label: 'Gnome' },
  { value: 'goliath', label: 'Goliath' },
  { value: 'halfling', label: 'Halfling' },
  { value: 'human', label: 'Human' },
  { value: 'orc', label: 'Orc' },
  { value: 'tiefling', label: 'Tiefling' },
];

export const dnd55BackgroundOptions: readonly CharacterCreationOption[] = [
  { value: 'acolyte', label: 'Acolyte' },
  { value: 'artisan', label: 'Artisan' },
  { value: 'charlatan', label: 'Charlatan' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'entertainer', label: 'Entertainer' },
  { value: 'farmer', label: 'Farmer' },
  { value: 'guard', label: 'Guard' },
  { value: 'guide', label: 'Guide' },
  { value: 'hermit', label: 'Hermit' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'noble', label: 'Noble' },
  { value: 'sage', label: 'Sage' },
  { value: 'sailor', label: 'Sailor' },
  { value: 'scribe', label: 'Scribe' },
  { value: 'soldier', label: 'Soldier' },
  { value: 'wayfarer', label: 'Wayfarer' },
];

export function isCharacterRulesetKey(value: string): value is CharacterRulesetKey {
  return value === 'sagadrive-core' || value === 'dnd-5.5e';
}

export function getCharacterCreationOptionLabel(
  options: readonly CharacterCreationOption[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
