/**
 * Person Segmentation Service
 * Uses MediaPipe ImageSegmenter (selfie_segmenter model) to isolate
 * the person from the background, producing a transparent-background cutout.
 * This enables the classic magazine cover effect where the masthead
 * ("RUNWAY") appears BEHIND the person's head.
 */

import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

let segmenter: ImageSegmenter | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the segmenter lazily (only once, on first use).
 */
async function ensureSegmenter(): Promise<ImageSegmenter> {
  if (segmenter) return segmenter;

  if (!initPromise) {
    initPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        outputCategoryMask: false,
        outputConfidenceMasks: true,
        runningMode: 'IMAGE',
      });
    })();
  }

  await initPromise;

  if (!segmenter) throw new Error('Segmenter failed to initialize');
  return segmenter;
}

/**
 * Load a data-URL as an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Given an image data-URL, returns a new data-URL of just the person
 * with the background removed (transparent PNG).
 *
 * Returns `null` if segmentation fails or no person is detected.
 */
export async function createPersonCutout(imageDataUrl: string): Promise<string | null> {
  try {
    const seg = await ensureSegmenter();
    const img = await loadImage(imageDataUrl);

    const width = img.naturalWidth;
    const height = img.naturalHeight;

    // Draw original image onto a canvas to get pixel data
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    // Run segmentation — callback style for MediaPipe compatibility
    let maskFloat32: Float32Array | null = null;
    let maskWidth = 0;
    let maskHeight = 0;

    seg.segment(img, (result) => {
      if (result.confidenceMasks && result.confidenceMasks.length > 0) {
        const mask = result.confidenceMasks[0];
        maskFloat32 = mask.getAsFloat32Array();
        maskWidth = mask.width;
        maskHeight = mask.height;
      }
    });

    if (!maskFloat32 || maskFloat32.length === 0) {
      console.warn('Segmentation returned no confidence mask');
      return null;
    }

    // Check if the mask dimensions match the image dimensions
    // If mask is different size, we need to scale the mask lookup
    const scaleX = maskWidth / width;
    const scaleY = maskHeight / height;
    const needsScale = Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01;

    // Apply the confidence mask as alpha channel
    // confidence ~ 1 = person (opaque), confidence ~ 0 = background (transparent)
    const pixels = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = (y * width + x) * 4;

        let confidence: number;
        if (needsScale) {
          // Nearest-neighbour lookup into the (potentially different-size) mask
          const mx = Math.min(Math.floor(x * scaleX), maskWidth - 1);
          const my = Math.min(Math.floor(y * scaleY), maskHeight - 1);
          confidence = maskFloat32![my * maskWidth + mx];
        } else {
          confidence = maskFloat32![y * width + x];
        }

        // Smooth the edge slightly with a threshold ramp
        // Values below 0.3 → fully transparent; above 0.7 → fully opaque
        const alpha = Math.min(1, Math.max(0, (confidence - 0.3) / 0.4));
        pixels[pixelIdx + 3] = Math.round(alpha * 255);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Person segmentation failed:', err);
    return null;
  }
}
