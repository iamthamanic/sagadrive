/**
 * itemLibraryLabels — German copy for Library Items filters and meta chips (#138).
 * Location: src/app/library/items/itemLibraryLabels.ts
 */
import type {
  ItemContext,
  ItemKindKey,
  ItemSettingTag,
  LibraryItemSource,
} from '../../../domains/items';

export const ITEM_KIND_LABELS: Record<ItemKindKey, string> = {
  weapon: 'Waffe',
  armor: 'Rüstung',
  shield: 'Schild',
  tool: 'Werkzeug',
  device: 'Gerät',
  consumable: 'Verbrauch',
  container: 'Behälter',
  document: 'Dokument',
  currency: 'Währung',
  key: 'Schlüssel',
  food: 'Nahrung',
  medical: 'Medizin',
  clothing: 'Kleidung',
  resource: 'Ressource',
  sport: 'Sport',
  entertainment: 'Unterhaltung',
  misc: 'Sonstiges',
};

export const ITEM_SETTING_LABELS: Record<ItemSettingTag, string> = {
  fantasy: 'Fantasy',
  'sci-fi': 'Sci-Fi',
  contemporary: 'Gegenwart',
};

export const ITEM_CONTEXT_LABELS: Record<ItemContext, string> = {
  combat: 'Kampf',
  exploration: 'Erkundung',
  survival: 'Überleben',
  medical: 'Medizin',
  social: 'Sozial',
  domestic: 'Haushalt',
  office: 'Büro',
  sports: 'Sport',
  science: 'Wissenschaft',
  engineering: 'Technik',
  travel: 'Reise',
  entertainment: 'Unterhaltung',
  urban: 'Urban',
};

export const LIBRARY_SOURCE_LABELS: Record<LibraryItemSource, string> = {
  core: 'Core',
  standard: 'Standard',
  personal: 'Eigen',
  world: 'Welt',
};

export const ITEM_LIBRARY_VIEW_MODE_STORAGE_KEY = 'sagadrive_library_items_view_mode';

export type ItemLibraryViewMode = 'list' | 'grid';
