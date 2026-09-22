/**
 * liveact-video-viewport-transform — object-cover + optional mirror (pure domain).
 * Location: src/domains/character/liveact/liveact-video-viewport-transform.ts
 *
 * Source of truth for mapping normalized MediaPipe coords (0..1, video space)
 * onto a canvas that shows the same frame as CSS object-cover (+ scaleX mirror).
 */

export interface LiveActVideoViewportTransform {
  canvasWidth: number;
  canvasHeight: number;
  /** Drawn video content width after cover-scale (may exceed canvas when cropping). */
  contentWidth: number;
  contentHeight: number;
  /** Top-left of the content rect in canvas pixels (negative when cropped). */
  offsetX: number;
  offsetY: number;
  mirrorX: boolean;
}

export function computeLiveActObjectCoverTransform(input: {
  videoWidth: number;
  videoHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  mirrorX: boolean;
}): LiveActVideoViewportTransform {
  const vw = Math.max(1, input.videoWidth);
  const vh = Math.max(1, input.videoHeight);
  const cw = Math.max(1, input.canvasWidth);
  const ch = Math.max(1, input.canvasHeight);
  const videoAspect = vw / vh;
  const canvasAspect = cw / ch;

  let contentWidth: number;
  let contentHeight: number;
  if (videoAspect > canvasAspect) {
    // Video wider than canvas → crop sides
    contentHeight = ch;
    contentWidth = ch * videoAspect;
  } else {
    // Video taller / equal → crop top/bottom
    contentWidth = cw;
    contentHeight = cw / videoAspect;
  }

  return {
    canvasWidth: cw,
    canvasHeight: ch,
    contentWidth,
    contentHeight,
    offsetX: (cw - contentWidth) / 2,
    offsetY: (ch - contentHeight) / 2,
    mirrorX: input.mirrorX,
  };
}

/** Project normalized video landmark (origin top-left) into canvas pixels. */
export function projectLiveActLandmarkToCanvas(
  nx: number,
  ny: number,
  transform: LiveActVideoViewportTransform,
): { x: number; y: number } {
  const u = transform.mirrorX ? 1 - nx : nx;
  return {
    x: transform.offsetX + u * transform.contentWidth,
    y: transform.offsetY + ny * transform.contentHeight,
  };
}
