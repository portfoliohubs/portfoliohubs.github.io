import Dexie, { type Table } from 'dexie';

export interface WizardDraft {
  id: string; // 'current_draft' or userId
  step: number;
  lastUpdated: number;
  data: {
    hero: {
      name: string;
      nameAr?: string;
      tagline: string;
      graduation: string;
      position: string;
      profileImage?: string; // base64 or CDN URL
    };
    skills: Array<{
      category: string;
      items: string[];
    }>;
    education: {
      university: string;
      faculty: string;
      graduationYear: string;
      degrees: Array<{
        title: string;
        year: string;
        institution: string;
      }>;
      timeline: Array<{
        year: string;
        title: string;
        description: string;
      }>;
    };
    certificates: Array<{
      title: string;
      issuer: string;
      year: string;
      image?: string;
    }>;
    cases: Array<{
      id: string;
      category: string;
      title: string;
      description: string;
      image: string; // base64 or CDN URL
      isBeforeAfter?: boolean;
    }>;
    contact: {
      phone: string;
      whatsapp: string;
      email: string;
      instagram?: string;
      facebook?: string;
      linkedin?: string;
      address?: string;
      mapQuery?: string;
    };
    templateId: number;
    slug: string;
  };
}

export interface UploadQueueItem {
  id?: number;
  slug: string;
  filename: string;
  folder?: string;
  kind?: 'case' | 'profile' | 'ad';
  sizeType: 'thumb' | 'medium' | 'full';
  blob: Blob;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  retryCount: number;
  errorMessage?: string;
  createdAt: number;
}

export class PortfolioHubsDatabase extends Dexie {
  drafts!: Table<WizardDraft, string>;
  uploadQueue!: Table<UploadQueueItem, number>;

  constructor() {
    super('PortfolioHubsV4Db');
    this.version(1).stores({
      drafts: 'id, step, lastUpdated',
      uploadQueue: '++id, slug, status, createdAt, [slug+status]',
    });
  }
}

export const localDb = new PortfolioHubsDatabase();
