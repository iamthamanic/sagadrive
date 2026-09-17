/**
 * shared/ui — fachlich neutrale UI-Primitives und Präsentationsbausteine.
 * Location: src/shared/ui/index.ts
 */
export * from './button';
export * from './badge';
export * from './card';
export * from './input';
export * from './label';
export * from './select';
export * from './tabs';
export * from './tooltip';
export * from './AttributeD20Icon';
export * from './AttributeDerivedConnector';
export { ImageWithFallback } from './figma/ImageWithFallback';
export { ImageLightboxDialog } from './ImageLightboxDialog';
export type { ImageLightboxDialogProps } from './ImageLightboxDialog';
export { useImageLightbox } from './useImageLightbox';
export type {
  ImageLightboxTarget,
  UseImageLightboxResult,
} from './useImageLightbox';
