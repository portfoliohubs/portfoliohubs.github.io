/**
 * Image processing utilities
 * Converts images to WebP format and encodes as base64.
 * No size limit — accepts any image size.
 */

export async function processImageToBase64(file: File, maxWidth = 1200, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Not a valid image file'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas error')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', quality));
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

export async function processMultipleImages(files: FileList): Promise<Array<{ base64: string; preview: string; name: string }>> {
  const results: Array<{ base64: string; preview: string; name: string }> = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith('image/')) continue;
    const base64 = await processImageToBase64(file);
    results.push({ base64, preview: base64, name: file.name });
  }
  return results;
}
