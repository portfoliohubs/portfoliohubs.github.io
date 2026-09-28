import { localDb, type UploadQueueItem } from './dexieDb';
import { compressImage, blobToBase64, validateImageFile } from './compressor';
import { getActiveImageRepo } from './sharding';

export type UploadKind = 'case' | 'profile' | 'ad';

export interface EnqueueOptions {
  slug: string;
  filename: string;
  file: File;
  kind?: UploadKind;
  folder?: string;
}

export interface QueueProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  inProgress: boolean;
}

const MAX_CONCURRENT_UPLOADS = 3;
const MAX_RETRIES = 3;

class ImageQueueService {
  private activeWorkers = 0;
  private isProcessing = false;
  private listeners: Array<(progress: QueueProgress) => void> = [];

  public subscribe(listener: (progress: QueueProgress) => void): () => void {
    this.listeners.push(listener);
    this.emitProgress();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private async emitProgress() {
    try {
      const items = await localDb.uploadQueue.toArray();
      const completed = items.filter((i) => i.status === 'completed').length;
      const failed = items.filter((i) => i.status === 'failed').length;
      const pending = items.filter((i) => i.status === 'pending' || i.status === 'uploading').length;

      const progress: QueueProgress = {
        total: items.length,
        completed,
        failed,
        pending,
        inProgress: this.isProcessing || this.activeWorkers > 0,
      };

      this.listeners.forEach((listener) => {
        try {
          listener(progress);
        } catch (err) {
          console.error('Error in upload queue listener:', err);
        }
      });
    } catch (err) {
      console.error('Failed to compute queue progress:', err);
    }
  }

  /**
   * Compresses image into 3 sizes and adds items to IndexedDB queue
   */
  public async enqueue(options: EnqueueOptions): Promise<void> {
    const { slug, filename, file, kind = 'case', folder } = options;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid image file.');
    }

    // 1. Compress into 3 responsive sizes
    const { thumb, medium, full } = await compressImage(file);

    // 2. Persist in Dexie uploadQueue
    const baseClean = filename.replace(/\.[^/.]+$/, '');
    const now = Date.now();
    const targetFolder = folder || (kind === 'ad' ? 'ads' : '');

    await localDb.uploadQueue.bulkAdd([
      {
        slug,
        filename: `${baseClean}-thumb`,
        folder: targetFolder,
        kind,
        sizeType: 'thumb',
        blob: thumb,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
      },
      {
        slug,
        filename: `${baseClean}-medium`,
        folder: targetFolder,
        kind,
        sizeType: 'medium',
        blob: medium,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
      },
      {
        slug,
        filename: `${baseClean}-full`,
        folder: targetFolder,
        kind,
        sizeType: 'full',
        blob: full,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
      },
    ]);

    this.emitProgress();
    this.processQueue();
  }

  /**
   * Main queue processing orchestrator ensuring max 3 concurrent workers
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing && this.activeWorkers >= MAX_CONCURRENT_UPLOADS) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.activeWorkers < MAX_CONCURRENT_UPLOADS) {
        const nextItem = await localDb.uploadQueue
          .where('status')
          .equals('pending')
          .first();

        if (!nextItem || !nextItem.id) {
          break;
        }

        // Mark as uploading
        await localDb.uploadQueue.update(nextItem.id, { status: 'uploading' });
        this.activeWorkers++;
        this.emitProgress();

        // Spawn worker asynchronously
        this.runWorker(nextItem).finally(() => {
          this.activeWorkers--;
          this.emitProgress();
          this.processQueue();
        });
      }
    } finally {
      if (this.activeWorkers === 0) {
        this.isProcessing = false;
        this.emitProgress();
      }
    }
  }

  /**
   * Single worker task handling base64 conversion & upload trigger with retry
   */
  private async runWorker(item: UploadQueueItem): Promise<void> {
    if (!item.id) return;

    try {
      // Convert blob to base64
      const base64Data = await blobToBase64(item.blob);
      const targetRepo = await getActiveImageRepo();

      // Dispatch to GitHub Actions workflow dispatch or mock-dispatch
      await this.dispatchUpload(item.slug, item.filename, base64Data, targetRepo, item.folder);

      // Mark completed
      await localDb.uploadQueue.update(item.id, {
        status: 'completed',
        errorMessage: undefined,
      });
    } catch (error: any) {
      console.warn(`Upload failed for ${item.filename}:`, error);

      const nextRetry = item.retryCount + 1;
      if (nextRetry < MAX_RETRIES) {
        await localDb.uploadQueue.update(item.id, {
          status: 'pending',
          retryCount: nextRetry,
          errorMessage: error?.message || 'Upload failed, queued for retry.',
        });
      } else {
        await localDb.uploadQueue.update(item.id, {
          status: 'failed',
          retryCount: nextRetry,
          errorMessage: error?.message || 'Max retries exceeded.',
        });
      }
    }
  }

  /**
   * Triggers the GitHub Actions upload-images workflow or stores fallback
   */
  private async dispatchUpload(
    slug: string,
    filename: string,
    base64Data: string,
    repoTarget: string,
    folder?: string
  ): Promise<void> {
    const patToken = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GITHUB_PAT) || '';
    const repoOwner = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GITHUB_USERNAME) || 'portfoliohubs';
    const mainRepo = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GITHUB_MAIN_REPO) || 'portfoliohubs.github.io';

    if (patToken) {
      const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${mainRepo}/actions/workflows/upload-images.yml/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${patToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: {
              slug: slug || '',
              folder: folder || '',
              filename,
              images_base64: base64Data,
              repo_target: repoTarget,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub workflow trigger failed (${response.status}): ${errorText}`);
      }
    } else {
      // Without PAT, upload simulation succeeds locally
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  /**
   * Clear completed items from IndexedDB
   */
  public async clearCompleted(): Promise<void> {
    await localDb.uploadQueue.where('status').equals('completed').delete();
    this.emitProgress();
  }

  /**
   * Retry all failed items
   */
  public async retryFailed(): Promise<void> {
    const failedItems = await localDb.uploadQueue.where('status').equals('failed').toArray();
    for (const item of failedItems) {
      if (item.id) {
        await localDb.uploadQueue.update(item.id, {
          status: 'pending',
          retryCount: 0,
          errorMessage: undefined,
        });
      }
    }
    this.emitProgress();
    this.processQueue();
  }
}

export const imageQueueService = new ImageQueueService();
