import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { dataUrlToBlob } from './imageProcessor';

export interface UploadProgress {
  step: string;
  percent: number;
}

/**
 * Resilient image uploader with strict timeout and fallback.
 * Prevents the application from hanging for minutes when Firebase Storage
 * encounters network lag, missing storage bucket, or CORS issues.
 */
export async function uploadImageResilient(
  uid: string,
  relativePath: string,
  dataUrl: string,
  timeoutMs = 8000
): Promise<{ url: string; isFallback: boolean }> {
  // If already a remote URL, return immediately
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return { url: dataUrl, isFallback: false };
  }

  const fullPath = `portfolio-images/${uid}/${relativePath}`;

  try {
    const blob = dataUrlToBlob(dataUrl);
    const storageRef = ref(storage, fullPath);

    // Timeout promise to avoid Firebase SDK's default 2-4 minute retry hang
    const uploadWithTimeout = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Storage upload timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      uploadBytes(storageRef, blob, { 
        contentType: blob.type || 'image/jpeg',
        cacheControl: 'public,max-age=31536000'
      })
        .then(snapshot => getDownloadURL(snapshot.ref))
        .then(downloadUrl => {
          clearTimeout(timer);
          resolve(downloadUrl);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });

    const publicUrl = await uploadWithTimeout;
    return { url: publicUrl, isFallback: false };
  } catch (error: any) {
    console.warn(
      `[StorageHelper] Firebase Storage upload for "${relativePath}" could not complete (${error?.message || error}). Applying optimized direct image fallback.`,
    );
    // Graceful fallback: return the optimized dataUrl directly so data is never lost
    return { url: dataUrl, isFallback: true };
  }
}

/**
 * Parallel batch uploader for clinical cases and profile assets
 */
export async function uploadBatchResilient(
  uid: string,
  items: Array<{ key: string; dataUrl: string; path: string }>,
  onProgress?: (progress: UploadProgress) => void
): Promise<Record<string, string>> {
  const total = items.length;
  if (total === 0) return {};

  const results: Record<string, string> = {};
  let completed = 0;

  const promises = items.map(async (item) => {
    if (!item.dataUrl || !item.dataUrl.startsWith('data:image')) {
      results[item.key] = item.dataUrl;
      completed++;
      onProgress?.({
        step: `Ready (${completed}/${total})`,
        percent: Math.round((completed / total) * 100),
      });
      return;
    }

    onProgress?.({
      step: `Saving photo (${completed + 1}/${total})...`,
      percent: Math.round((completed / total) * 100),
    });

    const res = await uploadImageResilient(uid, item.path, item.dataUrl);
    results[item.key] = res.url;
    completed++;

    onProgress?.({
      step: `Completed (${completed}/${total})`,
      percent: Math.round((completed / total) * 100),
    });
  });

  await Promise.all(promises);
  return results;
}
