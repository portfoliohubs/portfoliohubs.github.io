import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface ShardInfo {
  repoName: string;
  shardIndex: number;
  estimatedSizeMb?: number;
}

const GITHUB_USERNAME = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GITHUB_USERNAME) || 'portfoliohubs';
const MAX_REPO_SIZE_MB = 850; // Keep under 1GB GitHub recommendation

/**
 * Gets the active image repository shard for new uploads.
 * Reads from Firestore settings/global with fallback to dental-images-1.
 */
export async function getActiveImageRepo(): Promise<string> {
  try {
    const settingsRef = doc(db, 'settings', 'global');
    const snap = await getDoc(settingsRef);
    if (snap.exists() && snap.data().currentImageRepo) {
      return snap.data().currentImageRepo;
    }
  } catch (error) {
    console.warn('Could not retrieve active repo from Firestore settings, using default shard.', error);
  }

  return 'dental-images-1';
}

/**
 * Checks the size of the target repository via GitHub public API.
 * If close to MAX_REPO_SIZE_MB, computes the next shard name (e.g. dental-images-2).
 */
export async function checkAndAdvanceRepoShard(
  currentRepo: string,
  githubToken?: string
): Promise<ShardInfo> {
  const match = currentRepo.match(/^(dental-images-)(\d+)$/);
  const basePrefix = match ? match[1] : 'dental-images-';
  const currentIndex = match ? parseInt(match[2], 10) : 1;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${currentRepo}`, {
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      // data.size is in KB
      const sizeMb = data.size / 1024;

      if (sizeMb >= MAX_REPO_SIZE_MB) {
        const nextIndex = currentIndex + 1;
        const nextRepo = `${basePrefix}${nextIndex}`;

        // Update Firestore settings if authenticated as admin
        try {
          const settingsRef = doc(db, 'settings', 'global');
          await setDoc(settingsRef, { currentImageRepo: nextRepo }, { merge: true });
        } catch {
          // May fail if not admin; client will still know next repo
        }

        return {
          repoName: nextRepo,
          shardIndex: nextIndex,
          estimatedSizeMb: sizeMb,
        };
      }

      return {
        repoName: currentRepo,
        shardIndex: currentIndex,
        estimatedSizeMb: sizeMb,
      };
    }
  } catch (error) {
    console.warn('Failed to query GitHub repository size.', error);
  }

  return {
    repoName: currentRepo,
    shardIndex: currentIndex,
  };
}
