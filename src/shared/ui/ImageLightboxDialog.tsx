/**
 * ImageLightboxDialog — reusable enlarged image preview dialog.
 * Controlled via `useImageLightbox` (or equivalent open/target/onOpenChange).
 * Location: src/shared/ui/ImageLightboxDialog.tsx
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
import type { ImageLightboxTarget } from './useImageLightbox';

export interface ImageLightboxDialogProps {
  open: boolean;
  target: ImageLightboxTarget | null;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightboxDialog({
  open,
  target,
  onOpenChange,
}: ImageLightboxDialogProps) {
  const title = target?.title?.trim() || target?.alt?.trim() || 'Bildvorschau';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-3xl overflow-hidden p-4 sm:p-6"
        data-image-lightbox-dialog
        aria-describedby="image-lightbox-description"
      >
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-base sm:text-lg">
            {title}
          </DialogTitle>
          <DialogDescription id="image-lightbox-description" className="sr-only">
            Vergrößerte Bildvorschau
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-[min(60vh,28rem)] w-full items-center justify-center overflow-hidden rounded-lg border border-border/50 bg-muted/20 p-3">
          {target?.src ? (
            <img
              src={target.src}
              alt={target.alt}
              className="max-h-[min(70vh,32rem)] max-w-full object-contain"
              data-image-lightbox-img
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
