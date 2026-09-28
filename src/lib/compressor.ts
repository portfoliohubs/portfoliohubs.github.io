import imageCompression from 'browser-image-compression';

export interface CompressedSizes {
  thumb: Blob;
  medium: Blob;
  full: Blob;
}

export interface CompressionValidation {
  valid: boolean;
  error?: string;
}

const MAX_ORIGINAL_SIZE_MB = 25;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];

/**
 * Validate image file before attempting compression
 */
export function validateImageFile(file: File): CompressionValidation {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  const isTypeAllowed = ALLOWED_TYPES.some((type) => file.type.toLowerCase() === type) ||
    /\.(jpg|jpeg|png|webp|heic)$/i.test(file.name);

  if (!isTypeAllowed) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type || 'unknown'}. Please upload JPEG, PNG, or WebP images.`
    };
  }

  const fileSizeMb = file.size / (1024 * 1024);
  if (fileSizeMb > MAX_ORIGINAL_SIZE_MB) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_ORIGINAL_SIZE_MB}MB limit (File: ${fileSizeMb.toFixed(1)}MB).`
    };
  }

  return { valid: true };
}

/**
 * Compresses an image into 3 responsive WebP sizes:
 * - thumb: max 300px
 * - medium: max 700px
 * - full: max 1024px
 */
export async function compressImage(file: File): Promise<CompressedSizes> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image file.');
  }

  try {
    const [thumb, medium, full] = await Promise.all([
      imageCompression(file, {
        maxWidthOrHeight: 300,
        fileType: 'image/webp',
        initialQuality: 0.7,
        useWebWorker: true,
      }),
      imageCompression(file, {
        maxWidthOrHeight: 700,
        fileType: 'image/webp',
        initialQuality: 0.7,
        useWebWorker: true,
      }),
      imageCompression(file, {
        maxWidthOrHeight: 1024,
        fileType: 'image/webp',
        initialQuality: 0.7,
        useWebWorker: true,
      }),
    ]);

    return { thumb, medium, full };
  } catch (error: any) {
    throw new Error(`Image compression failed: ${error?.message || 'Unknown processing error'}`);
  }
}

/**
 * Convert a Blob to Base64 string (without the data URL prefix)
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Index = result.indexOf('base64,');
      if (base64Index !== -1) {
        resolve(result.substring(base64Index + 7));
      } else {
        resolve(result);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read binary data into Base64 format.'));
    reader.readAsDataURL(blob);
  });
}
