/**
 * useImageLightbox — reusable open/close state for enlarged image preview dialogs.
 * Pair with `ImageLightboxDialog`. Location: src/shared/ui/useImageLightbox.ts
 */
import { useState } from 'react';

export interface ImageLightboxTarget {
  src: string;
  alt: string;
  /** Optional dialog title; falls back to alt. */
  title?: string;
}

export interface UseImageLightboxResult {
  open: boolean;
  target: ImageLightboxTarget | null;
  openImage: (target: ImageLightboxTarget) => void;
  close: () => void;
  onOpenChange: (nextOpen: boolean) => void;
}

/** Manage a single enlarged-image preview (lightbox) dialog. */
export function useImageLightbox(): UseImageLightboxResult {
  const [target, setTarget] = useState<ImageLightboxTarget | null>(null);

  return {
    open: target !== null,
    target,
    openImage: (next) => {
      if (!next.src.trim()) return;
      setTarget({
        src: next.src.trim(),
        alt: next.alt.trim() || 'Bildvorschau',
        title: next.title?.trim() || undefined,
      });
    },
    close: () => setTarget(null),
    onOpenChange: (nextOpen) => {
      if (!nextOpen) setTarget(null);
    },
  };
}
