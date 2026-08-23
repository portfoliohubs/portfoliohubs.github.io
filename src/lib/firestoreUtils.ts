/**
 * Utility functions for Firestore data sanitization
 * Ensures no `undefined` values are ever passed to Firestore updateDoc or setDoc
 */

export function cleanFirestoreData<T>(obj: T): T {
  if (obj === undefined) {
    return null as unknown as T;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreData(item)) as unknown as T;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanFirestoreData(value);
    }
  }
  return cleaned as T;
}
