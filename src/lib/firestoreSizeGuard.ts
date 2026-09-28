/**
 * Firestore Size Guard utility
 * Protects against Firestore's 1MB (1,048,576 bytes) document limit.
 */

/**
 * Estimates the UTF-8 byte size of an object when serialized to JSON for Firestore.
 */
export function estimateFirestoreSize(obj: unknown): number {
  try {
    const jsonStr = JSON.stringify(obj);
    return new TextEncoder().encode(jsonStr).length;
  } catch (err) {
    console.error('Error estimating Firestore size:', err);
    return 0;
  }
}

/**
 * Asserts that the object size is under the specified limit (defaults to 900 KB for safe headroom).
 */
export function assertUnderLimit(obj: unknown, limitBytes: number = 900 * 1024): void {
  const size = estimateFirestoreSize(obj);
  if (size > limitBytes) {
    const sizeKb = Math.round(size / 1024);
    const limitKb = Math.round(limitBytes / 1024);
    throw new Error(
      `Document payload too large (${sizeKb} KB). Safety threshold is ${limitKb} KB. Please ensure images are uploaded to CDN rather than stored directly in document.`
    );
  }
}

/**
 * Strips any residual base64 data URLs from an object to ensure pure JSON URLs in Firestore.
 */
export function stripBase64FromDataJson<T>(data: T): T {
  if (!data) return data;

  if (typeof data === 'string') {
    // If it's a base64 data URI, replace it with empty string
    if (data.startsWith('data:image/')) {
      return '' as unknown as T;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => stripBase64FromDataJson(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const copy: any = {};
    for (const [key, value] of Object.entries(data as any)) {
      copy[key] = stripBase64FromDataJson(value);
    }
    return copy;
  }

  return data;
}
