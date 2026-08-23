export interface ProcessedImage {
  base64: string;
  preview: string;
  originalSizeKb?: number;
  compressedSizeKb?: number;
}

/**
 * Converts a base64 data URL to a binary Blob efficiently
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  if (!dataUrl.startsWith('data:')) {
    throw new Error('Invalid data URL');
  }
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * High-performance image optimizer using Canvas and optional ImageBitmap
 */
export async function processImageToBase64(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Try modern createImageBitmap for fast off-thread decoding
    if ('createImageBitmap' in window) {
      createImageBitmap(file)
        .then((bitmap) => {
          let width = bitmap.width;
          let height = bitmap.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            bitmap.close();
            throw new Error('Canvas 2D context unavailable');
          }

          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();

          try {
            const webpData = canvas.toDataURL('image/webp', quality);
            if (webpData.startsWith('data:image/webp')) {
              resolve(webpData);
              return;
            }
          } catch {
            // fallback
          }

          const jpegData = canvas.toDataURL('image/jpeg', quality);
          resolve(jpegData);
        })
        .catch(() => {
          // Fallback to traditional FileReader + Image
          fallbackFileReader(file, maxWidth, maxHeight, quality, resolve, reject);
        });
    } else {
      fallbackFileReader(file, maxWidth, maxHeight, quality, resolve, reject);
    }
  });
}

function fallbackFileReader(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  resolve: (val: string) => void,
  reject: (err: any) => void
) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(e.target?.result as string);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      try {
        const webpData = canvas.toDataURL('image/webp', quality);
        if (webpData.startsWith('data:image/webp')) {
          resolve(webpData);
          return;
        }
      } catch {
        // fallback
      }

      const jpegData = canvas.toDataURL('image/jpeg', quality);
      resolve(jpegData);
    };
    img.onerror = reject;
    img.src = e.target?.result as string;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
}

export async function processMultipleImages(
  files: FileList | File[],
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<ProcessedImage[]> {
  const list = Array.from(files);
  const results: ProcessedImage[] = [];
  for (const file of list) {
    const originalSizeKb = Math.round(file.size / 1024);
    const base64 = await processImageToBase64(file, maxWidth, maxHeight, quality);
    const compressedSizeKb = Math.round((base64.length * 3) / 4 / 1024);
    results.push({
      base64,
      preview: base64,
      originalSizeKb,
      compressedSizeKb
    });
  }
  return results;
}

