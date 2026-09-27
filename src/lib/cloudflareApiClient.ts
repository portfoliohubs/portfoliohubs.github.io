import { getIdToken } from 'firebase/auth';
import { auth } from './firebase';
import type { DentalCase, PortfolioData } from '../types';

const API_BASE_URL = (
  import.meta.env.VITE_CLOUDFLARE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'https://portfoliohubs-api.portfoliohubs-contact.workers.dev'
).replace(/\/$/, '');

export interface CloudflareEnvelope<T> {
  data: T;
  uid?: string;
  slug?: string;
  published_at?: string | null;
  updated_at?: string;
}

export interface PublishedWebsite extends Partial<PortfolioData> {
  uid?: string;
  slug?: string;
  cases?: DentalCase[];
  published_at?: string | null;
}

export interface BlogOverride {
  slug: string;
  data?: { published?: boolean; publishedAt?: string; [key: string]: unknown };
  published_at?: string | null;
  updated_at?: string;
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (authenticated && auth.currentUser) {
    const token = await getIdToken(auth.currentUser);
    headers.set('Authorization', `Bearer ${token}`);
  }
  let response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (authenticated && response.status === 401 && auth.currentUser) {
    const refreshedToken = await getIdToken(auth.currentUser, true);
    headers.set('Authorization', `Bearer ${refreshedToken}`);
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(detail?.error || `Cloudflare API request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export const cloudflareApi = {
  getPublishedWebsite(slug: string) {
    return request<CloudflareEnvelope<PublishedWebsite>>(`/api/website/${encodeURIComponent(slug)}`);
  },
  getBlogOverrides() {
    return request<BlogOverride[]>('/api/blog');
  },
  saveBlogArticle(slug: string, data: Record<string, unknown>) {
    return request<{ ok: true; slug: string }>(`/api/blog/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },
  deleteBlogArticle(slug: string) {
    return request<{ ok: true }>(`/api/blog/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
    }, true);
  },
  getProfile(uid?: string) {
    return request<CloudflareEnvelope<PortfolioData>>(`/api/profile${uid ? `?uid=${encodeURIComponent(uid)}` : ''}`, {}, true);
  },
  getAdminDoctors() {
    return request<Array<PortfolioData & { id: string; uid?: string; caseCount?: number }>>('/api/admin/doctors', {}, true);
  },
  updateAdminDoctor(uid: string, data: Record<string, unknown>) {
    return request<{ ok: true; uid: string; data: Record<string, unknown> }>(`/api/admin/doctors/${encodeURIComponent(uid)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true);
  },
  approveAdminDoctor(uid: string, slug: string, doctorData?: Record<string, unknown>) {
    return request<{ ok: true; uid: string; slug: string; publishedAt: string; doctor: PublishedWebsite }>(
      `/api/admin/doctors/${encodeURIComponent(uid)}/approve`,
      { method: 'POST', body: JSON.stringify({ slug, doctorData }) },
      true,
    );
  },
  getCases(uid?: string) {
    return request<Array<CloudflareEnvelope<DentalCase> | DentalCase>>(`/api/cases${uid ? `?uid=${encodeURIComponent(uid)}` : ''}`, {}, true);
  },
  saveProfile(data: Partial<PortfolioData>, uid?: string) {
    return request<CloudflareEnvelope<PortfolioData>>(`/api/profile${uid ? `?uid=${encodeURIComponent(uid)}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },
  getPortfolio(uid?: string) {
    return request<CloudflareEnvelope<PortfolioData>>(`/api/portfolio${uid ? `?uid=${encodeURIComponent(uid)}` : ''}`, {}, true);
  },
  savePortfolio(data: Partial<PortfolioData>, uid?: string) {
    return request<CloudflareEnvelope<PortfolioData>>(`/api/portfolio${uid ? `?uid=${encodeURIComponent(uid)}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },
  publish(slug: string) {
    return request<{ ok: true; uid: string; slug: string; publishedAt: string }>('/api/publish', {
      method: 'POST',
      body: JSON.stringify({ slug }),
    }, true);
  },
  getSettings(key = 'global') {
    return request<CloudflareEnvelope<Record<string, unknown>>>(`/api/settings/${encodeURIComponent(key)}`);
  },
  saveSettings(key: string, data: Record<string, unknown>) {
    return request<{ ok: true; key: string }>(`/api/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },
  getPromoCodes() {
    return request<Array<Record<string, unknown>>>('/api/promo', {}, true);
  },
  getPromoCode(code: string) {
    return request<CloudflareEnvelope<Record<string, unknown>>>(`/api/promo/${encodeURIComponent(code)}`, {}, true);
  },
  savePromoCode(code: string, data: Record<string, unknown>) {
    return request<{ ok: true; code: string }>(`/api/promo/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },
  deletePromoCode(code: string) {
    return request<{ ok: true }>(`/api/promo/${encodeURIComponent(code)}`, { method: 'DELETE' }, true);
  },
  redeemPromo(code: string) {
    return request<{ ok: true; code: string; caseLimit: number }>('/api/promo/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }, true);
  },
  diagnoseImageKit() {
    return request<{
      ok: boolean;
      status: number;
      requestId: string | null;
      keyFormat: string;
      keyLength: number;
    }>('/api/media/diagnostics', {}, true);
  },
  saveCase(data: Partial<DentalCase> & Pick<DentalCase, 'id'>, uid?: string) {
    return request<{ ok: true; id: string; uid: string; data: DentalCase }>(`/api/cases/${encodeURIComponent(data.id)}${uid ? `?uid=${encodeURIComponent(uid)}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },
  deleteCase(id: string, uid?: string) {
    return request<{ ok: true }>(`/api/cases/${encodeURIComponent(id)}${uid ? `?uid=${encodeURIComponent(uid)}` : ''}`, {
      method: 'DELETE',
    }, true);
  },
  reorderCases(ids: string[], uid?: string) {
    return request<{ ok: true }>(`/api/cases/reorder${uid ? `?uid=${encodeURIComponent(uid)}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }, true);
  },
};

export type { DentalCase, PortfolioData };
