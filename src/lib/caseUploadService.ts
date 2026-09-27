import { compressDentalImage, CompressionResult } from './imageCompressor';
import { uploadImageToImageKit } from './imagekitService';
import { cloudflareApi } from './cloudflareApiClient';
import { ClinicalCase, ClinicalCasePhoto } from '../types';

export interface UploadProgressReport {
  stage: 'compressing' | 'uploading' | 'completed' | 'failed';
  step: string;
  percent: number;
  error?: string;
  result?: CompressionResult;
}

/**
 * Compresses both case images and thumbnails, then records their ImageKit
 * metadata through the Worker. No binary data is persisted in D1.
 */
export async function stageCasePhotoUpload(
  uid: string,
  caseId: string,
  photoRole: 'before' | 'after' | 'additional',
  file: File | Blob,
  onProgress?: (progress: UploadProgressReport) => void
): Promise<{ photoRef: ClinicalCasePhoto; uploadId: string }> {
  const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fileName = `case_${caseId}_${photoRole}_${Date.now()}.webp`;
  try {
    onProgress?.({ stage: 'compressing', step: 'ضغط الصورة مهنياً (WebP)...', percent: 25 });
    const compressionResult = await compressDentalImage(file, {
      maxDimension: 1600, thumbnailDimension: 400, maxSizeBytes: 500 * 1024,
    });
    onProgress?.({ stage: 'uploading', step: 'رفع الوثيقة المؤقتة إلى المنصة...', percent: 65, result: compressionResult });
    const metadata = { uploadId, targetType: 'case', targetId: caseId, photoRole };
    const image = await uploadImageToImageKit(uid, `cases/${caseId}/${fileName}`, compressionResult.webpBase64, metadata);
    const thumbnail = await uploadImageToImageKit(
      uid, `cases/${caseId}/thumb_${fileName}`,
      compressionResult.thumbnailBase64 || compressionResult.webpBase64,
      { ...metadata, thumbnailOf: image.url },
    );
    const photoRef: ClinicalCasePhoto = {
      uploadId, url: image.url, previewUrl: thumbnail.url, role: photoRole,
      originalSizeKb: compressionResult.metrics.originalSizeKb,
      compressedSizeKb: compressionResult.metrics.compressedSizeKb,
      reductionRatioPercent: compressionResult.metrics.reductionRatioPercent,
    };
    onProgress?.({ stage: 'completed', step: 'تم تجهيز الصورة بنجاح', percent: 100, result: compressionResult });
    return { photoRef, uploadId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشلت معالجة ورفع الصورة. يرجى إعادة المحاولة.';
    console.error(`[stageCasePhotoUpload] Failed for ${caseId} (${photoRole}):`, err);
    onProgress?.({ stage: 'failed', step: 'تعذر رفع ومعالجة الصورة', percent: 0, error: message });
    throw err;
  }
}

export async function saveClinicalCaseToSubcollection(uid: string, caseData: ClinicalCase, isNew = false): Promise<void> {
  const now = new Date().toISOString();
  const sanitizedCase: ClinicalCase = {
    ...caseData, photo: '',
    preview: caseData.afterPhoto?.previewUrl || caseData.beforePhoto?.previewUrl || '',
    updatedAt: now, createdAt: caseData.createdAt || now,
  };
  await cloudflareApi.saveCase(sanitizedCase, uid);
  // The Worker owns persistence and ordering. isNew is retained for API compatibility.
  void isNew;
}

export async function deleteClinicalCaseComplete(uid: string, caseId: string): Promise<void> {
  await cloudflareApi.deleteCase(caseId, uid);
}

export async function fetchUserCases(uid: string): Promise<ClinicalCase[]> {
  const rows = await cloudflareApi.getCases(uid);
  return rows.map((row) => ('data' in row ? { ...(row.data as ClinicalCase), id: row.data.id || (row as any).id } : row as ClinicalCase))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function reorderCasesInSubcollection(uid: string, orderedCases: ClinicalCase[]): Promise<void> {
  await cloudflareApi.reorderCases(orderedCases.map((item) => item.id), uid);
}
