// Central Type Definitions for PortfolioHubs

export interface DentalCasePhoto {
  id?: string;
  uploadId?: string;
  url?: string;            // Cloud/CDN static path (e.g. "doctors/dr-ahmed/cases/case1_1.webp")
  previewUrl?: string;     // Local object URL or thumbnail for instant UI display
  label?: string;          // Custom caption entered by the doctor (e.g., "الوضع الأولي", "عزل الحاجز المطاطي", "الشكل النهائي")
  labelAr?: string;
  originalSizeKb?: number;
  compressedSizeKb?: number;
  reductionRatioPercent?: number;
  role?: string;           // Optional role or custom tag
}

export interface DentalCase {
  id: string;               // Unique document ID (e.g. "case_1710892019123")
  uid: string;              // Owner doctor UID
  title: string;            // Case title (English)
  titleAr?: string;         // Case title (Arabic)
  category: string;         // Standard category ID (e.g. 'operative', 'endodontics', 'orthodontics', 'implants')
  categoryAr?: string;
  customCategory?: string;  // If category === 'custom'
  description?: string;
  descriptionAr?: string;
  treatmentType?: string;   // e.g. "Direct Composite Veneers"
  patientAge?: string;
  sessionCount?: number;

  // Multi-photo slider structure (Array of photos with doctor's custom captions)
  photos?: DentalCasePhoto[];

  // Legacy compatibility fields
  beforePhoto?: DentalCasePhoto;
  afterPhoto?: DentalCasePhoto;
  additionalPhotos?: DentalCasePhoto[];
  photo?: string;
  preview?: string;
  originalSizeKb?: number;
  compressedSizeKb?: number;

  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Alias for backwards compatibility
export type ClinicalCase = DentalCase;
export type ClinicalCasePhoto = DentalCasePhoto;

export interface CertificationItem {
  id: string;
  title: string;
  titleAr?: string;
  issuer?: string;
  issuerAr?: string;
  year?: string;
  credentialUrl?: string;
  photoUrl?: string;
}

export interface PendingUploadDocument {
  uploadId: string;
  uid: string;
  targetType: 'profile' | 'case' | 'cert';
  targetId?: string;        // caseId if targetType === 'case'
  photoRole?: string;
  fileName: string;
  contentType: 'image/webp';
  base64?: string;          // Legacy field; new uploads use Firebase Storage URLs
  thumbnailBase64?: string; // Legacy field; new uploads use Firebase Storage URLs
  storagePath?: string;
  downloadUrl?: string;
  thumbnailStoragePath?: string;
  thumbnailUrl?: string;
  fileSizeBytes: number;
  originalSizeBytes: number;
  reductionRatio: number;
  createdAt: string;
}

export interface Milestone {
  year: string;
  event: string;
  eventAr?: string;
}

export interface PortfolioData {
  uid?: string;
  fullName: string;
  fullNameAr?: string;
  title: string;
  titleAr?: string;
  graduationYear: string;
  university: string;
  universityAr?: string;
  clinicName?: string;
  clinicNameAr?: string;
  locationAddress?: string;
  locationAddressAr?: string;
  locationLat?: string;
  locationLng?: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  sameAs?: string[];
  profilePhoto?: string;
  profilePreview?: string;
  profilePhotoPath?: string;
  
  // Skills
  clinicalSkills: string[];
  digitalSkills: string[];
  softSkills: string[];
  clinicalSkillsAr?: string[];
  digitalSkillsAr?: string[];
  softSkillsAr?: string[];

  // Timeline
  timeline: Milestone[];

  // Cases
  cases: DentalCase[];

  // Certifications (Conditional: only shown if present)
  certifications?: CertificationItem[];

  // Status & Settings
  status: 'draft' | 'pending_review' | 'published' | 'approved' | 'rejected';
  packageTier?: string;
  promoCode?: string;
  caseLimit?: number;
  caseCount?: number;
  active?: boolean;
  hasUnreviewedChanges?: boolean;
  paymentConfirmed?: boolean;
  adminNotes?: string;
  migratedToSubcollection?: boolean;
  updatedAt?: string;
  createdAt?: string;
}
