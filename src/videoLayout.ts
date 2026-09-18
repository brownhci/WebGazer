/**
 * Map video-frame coordinates → element/overlay coordinates when the <video>
 * uses object-fit: cover|contain|fill.
 */
export type VideoContentMapping = {
  /** Uniform (cover/contain) or axis scale (fill). */
  scaleX: number;
  scaleY: number;
  /** Top-left of the visible video content inside the element. */
  offsetX: number;
  offsetY: number;
};

export const getVideoContentMapping = (
  video: Pick<HTMLVideoElement, 'videoWidth' | 'videoHeight' | 'clientWidth' | 'clientHeight'>,
  objectFit: string = 'fill'
): VideoContentMapping => {
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const ew = video.clientWidth || 1;
  const eh = video.clientHeight || 1;

  if (objectFit === 'contain' || objectFit === 'cover') {
    const scale = objectFit === 'contain'
      ? Math.min(ew / vw, eh / vh)
      : Math.max(ew / vw, eh / vh);
    return {
      scaleX: scale,
      scaleY: scale,
      offsetX: (ew - vw * scale) / 2,
      offsetY: (eh - vh * scale) / 2
    };
  }

  // fill / default stretch
  return { scaleX: ew / vw, scaleY: eh / vh, offsetX: 0, offsetY: 0 };
};

export const mapVideoPointToElement = (
  x: number,
  y: number,
  mapping: VideoContentMapping,
  mirror: boolean,
  elementWidth: number
): { x: number; y: number } => {
  const dx = mapping.offsetX + x * mapping.scaleX;
  const dy = mapping.offsetY + y * mapping.scaleY;
  return { x: mirror ? elementWidth - dx : dx, y: dy };
};
