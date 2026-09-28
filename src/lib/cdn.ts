export type ImageSize = 'thumb' | 'medium' | 'full';

const GITHUB_USERNAME = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GITHUB_USERNAME) || 'portfoliohubs';
const DEFAULT_REPO = 'dental-images-1';

/**
 * Returns the primary jsDelivr CDN URL for an image asset stored in GitHub.
 */
export function getImageUrl(
  slug: string,
  filename: string,
  size: ImageSize = 'medium',
  repo: string = DEFAULT_REPO,
  username: string = GITHUB_USERNAME
): string {
  // If filename is already a full URL or data URI, return as-is
  if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
    return filename;
  }

  const cleanFilename = filename.replace(/\.(webp|jpg|jpeg|png)$/i, '');
  return `https://cdn.jsdelivr.net/gh/${username}/${repo}@main/${slug}/${cleanFilename}-${size}.webp`;
}

/**
 * Returns jsDelivr CDN URL for advertisement posters (stored in /ads/)
 */
export function getAdImageUrl(
  filename: string,
  repo: string = DEFAULT_REPO,
  username: string = GITHUB_USERNAME
): string {
  if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
    return filename;
  }
  const clean = filename.replace(/\.(webp|jpg|jpeg|png)$/i, '');
  return `https://cdn.jsdelivr.net/gh/${username}/${repo}@main/ads/${clean}.webp`;
}

/**
 * Returns raw GitHub fallback URL for advertisement posters
 */
export function getFallbackAdImageUrl(
  filename: string,
  repo: string = DEFAULT_REPO,
  username: string = GITHUB_USERNAME
): string {
  if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
    return filename;
  }
  const clean = filename.replace(/\.(webp|jpg|jpeg|png)$/i, '');
  return `https://raw.githubusercontent.com/${username}/${repo}/main/ads/${clean}.webp`;
}

/**
 * Returns jsDelivr CDN URL for doctor profile photo
 */
export function getProfileImageUrl(
  slug: string,
  size: ImageSize = 'medium',
  repo: string = DEFAULT_REPO,
  username: string = GITHUB_USERNAME
): string {
  return getImageUrl(slug, 'profile', size, repo, username);
}

/**
 * Returns jsDelivr CDN URL for clinical case images
 */
export function getCaseImageUrl(
  slug: string,
  caseId: string,
  size: ImageSize = 'medium',
  repo: string = DEFAULT_REPO,
  username: string = GITHUB_USERNAME
): string {
  return getImageUrl(slug, caseId, size, repo, username);
}

/**
 * Returns the raw GitHub fallback URL in case jsDelivr is inaccessible or still purging cache.
 */
export function getFallbackImageUrl(
  slug: string,
  filename: string,
  size: ImageSize = 'medium',
  repo: string = DEFAULT_REPO,
  username: string = GITHUB_USERNAME
): string {
  if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
    return filename;
  }

  const cleanFilename = filename.replace(/\.(webp|jpg|jpeg|png)$/i, '');
  return `https://raw.githubusercontent.com/${username}/${repo}/main/${slug}/${cleanFilename}-${size}.webp`;
}

/**
 * Generates an img srcSet attribute string for responsive loading across devices
 */
export function getImageSrcSet(
  slug: string,
  filename: string,
  repo: string = DEFAULT_REPO,
  username: string = GITHUB_USERNAME
): string {
  if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
    return '';
  }

  const thumb = getImageUrl(slug, filename, 'thumb', repo, username);
  const medium = getImageUrl(slug, filename, 'medium', repo, username);
  const full = getImageUrl(slug, filename, 'full', repo, username);

  return `${thumb} 300w, ${medium} 700w, ${full} 1024w`;
}
