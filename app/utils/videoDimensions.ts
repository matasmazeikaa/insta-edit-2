/**
 * Utility functions for getting video dimensions
 */

export interface VideoDimensions {
  width: number;
  height: number;
}

/**
 * Get video dimensions from a video file or URL
 */
export async function getVideoDimensions(
  src: string | File
): Promise<VideoDimensions> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    let objectUrl: string | null = null;

    video.onloadedmetadata = () => {
      // Only revoke URLs we created ourselves (from File objects)
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.onerror = () => {
      // Only revoke URLs we created ourselves (from File objects)
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
      reject(new Error('Failed to load video metadata'));
    };

    if (src instanceof File) {
      objectUrl = URL.createObjectURL(src);
      video.src = objectUrl;
    } else {
      // Don't revoke existing blob URLs - they might be in use elsewhere
      video.src = src;
    }
  });
}

/**
 * Get video duration from a video file or URL
 */
export async function getVideoDuration(
  src: string | File
): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    let objectUrl: string | null = null;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      // Only revoke URLs we created ourselves (from File objects)
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
      if (isFinite(duration) && duration > 0) {
        resolve(duration);
      } else {
        reject(new Error('Invalid video duration'));
      }
    };

    video.onerror = () => {
      // Only revoke URLs we created ourselves (from File objects)
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
      reject(new Error('Failed to load video metadata'));
    };

    if (src instanceof File) {
      objectUrl = URL.createObjectURL(src);
      video.src = objectUrl;
    } else {
      // Don't revoke existing blob URLs - they might be in use elsewhere
      video.src = src;
    }
  });
}

/**
 * Get audio duration from an audio file or URL
 */
export async function getAudioDuration(
  src: string | File
): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    let objectUrl: string | null = null;

    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      // Only revoke URLs we created ourselves (from File objects)
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
      if (isFinite(duration) && duration > 0) {
        resolve(duration);
      } else {
        reject(new Error('Invalid audio duration'));
      }
    };

    audio.onerror = () => {
      // Only revoke URLs we created ourselves (from File objects)
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
      reject(new Error('Failed to load audio metadata'));
    };

    if (src instanceof File) {
      objectUrl = URL.createObjectURL(src);
      audio.src = objectUrl;
    } else {
      // Don't revoke existing blob URLs - they might be in use elsewhere
      audio.src = src;
    }
  });
}

/**
 * Calculate dimensions and position for a video to fit within a 9:16 canvas
 * Canvas is 1080x1920 (9:16 portrait)
 */
export interface VideoFitResult {
  width: number;
  height: number;
  x: number;
  y: number;
  scale: number;
}

export function calculateVideoFit(
  originalWidth: number,
  originalHeight: number,
  aspectRatioFit: 'original' | '1:1' | 'cover' | '16:9' = 'original',
  zoom: number = 1.0
): VideoFitResult {
  const CANVAS_WIDTH = 1080;
  const CANVAS_HEIGHT = 1920;
  const CANVAS_ASPECT = CANVAS_WIDTH / CANVAS_HEIGHT; // 0.5625 (9:16)

  let targetWidth: number;
  let targetHeight: number;

  if (aspectRatioFit === 'cover') {
    // Cover: scale to fill entire canvas (1080x1920), may crop
    const scaleX = CANVAS_WIDTH / originalWidth;
    const scaleY = CANVAS_HEIGHT / originalHeight;
    const scale = Math.max(scaleX, scaleY) * zoom;
    targetWidth = originalWidth * scale;
    targetHeight = originalHeight * scale;
  } else if (aspectRatioFit === '1:1') {
    // 1:1 square: fit square within canvas, centered
    const maxSize = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * zoom;
    targetWidth = maxSize;
    targetHeight = maxSize;
  } else if (aspectRatioFit === '16:9') {
    // 16:9: fit 16:9 rectangle within canvas, centered
    const targetAspect = 16 / 9;
    // Try fitting by height first
    targetHeight = CANVAS_HEIGHT * zoom;
    targetWidth = targetHeight * targetAspect;
    // If too wide, fit by width
    if (targetWidth > CANVAS_WIDTH * zoom) {
      targetWidth = CANVAS_WIDTH * zoom;
      targetHeight = targetWidth / targetAspect;
    }
  } else {
    // Original: maintain original aspect ratio, fit within canvas
    const originalAspect = originalWidth / originalHeight;
    // Try fitting by height first
    targetHeight = CANVAS_HEIGHT * zoom;
    targetWidth = targetHeight * originalAspect;
    // If too wide, fit by width
    if (targetWidth > CANVAS_WIDTH * zoom) {
      targetWidth = CANVAS_WIDTH * zoom;
      targetHeight = targetWidth / originalAspect;
    }
  }

  // Center the video
  const x = (CANVAS_WIDTH - targetWidth) / 2;
  const y = (CANVAS_HEIGHT - targetHeight) / 2;

  return {
    width: targetWidth,
    height: targetHeight,
    x,
    y,
    scale: zoom,
  };
}

