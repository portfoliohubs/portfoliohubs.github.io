import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  ShieldCheck, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  LogOut, 
  Eye, 
  Save, 
  RefreshCw, 
  Key, 
  Sliders, 
  Check, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  X, 
  Loader2, 
  Rocket, 
  Zap, 
  HelpCircle, 
  Edit3, 
  Globe, 
  FileText, 
  Trash2, 
  GraduationCap, 
  Building2, 
  Phone, 
  Mail, 
  User as UserIcon, 
  Image as ImageIcon, 
  Sparkles, 
  Clock, 
  Briefcase, 
  ToggleLeft, 
  ToggleRight, 
  Settings, 
  MapPin, 
  MessageCircle, 
  Database,
  BarChart3,
  BookOpen,
  ArrowRight,
  Filter,
  CheckSquare,
  Send,
  Tag
} from 'lucide-react';
import { auth } from '../lib/firebase';
import Header from '../components/Header';
import { INITIAL_BLOG_ARTICLES, BLOG_CATEGORIES, BlogArticle } from '../data/blogArticlesData';
import CONFIG from '../config';
import { uploadImageResilient } from '../lib/storageHelper';
import { cloudflareApi } from '../lib/cloudflareApiClient';

interface PortfolioRecord {
  id: string;
  slug?: string;
  username?: string;
  fullName: string;
  fullNameAr?: string;
  title?: string;
  titleAr?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  bookingLink?: string;
  packageTier?: string;
  caseLimit?: number;
  caseCount?: number;
  status: 'draft' | 'pending_review' | 'published' | 'approved' | 'rejected';
  active?: boolean;
  hasUnreviewedChanges?: boolean;
  adminNotes?: string;
  profilePhoto?: string;
  profilePhotoPath?: string;
  profilePreview?: string;
  cases?: any[];
  timeline?: any[];
  clinicalSkills?: string[];
  clinicalSkillsAr?: string[];
  digitalSkills?: string[];
  digitalSkillsAr?: string[];
  softSkills?: string[];
  softSkillsAr?: string[];
  university?: string;
  universityAr?: string;
  graduationYear?: string;
  clinicName?: string;
  clinicNameAr?: string;
  locationAddress?: string;
  locationAddressAr?: string;
  bio?: string;
  bioAr?: string;
  createdAt?: string;
  publishedAt?: string;
}

interface GlobalSettings {
  defaultCaseLimit: number;
  cvAdEnabled: boolean;
  cvAdPosterUrl: string;
  cvAdDurationSeconds: number;
  upgradeWhatsAppNumber: string;
  maintenanceMode: boolean;
  autoSeoArticlesEnabled: boolean;
  baseUrl: string;
}

interface PromoCodeRecord {
  code: string;
  caseLimit: number;
  maxRedemptions: number;
  redeemedCount: number;
  active: boolean;
  updatedAt?: string;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'queue' | 'users' | 'articles' | 'limits' | 'github'>('queue');

  // Doctor Data & Table State
  const [doctors, setDoctors] = useState<PortfolioRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'published' | 'suspended' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<PortfolioRecord | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modals & Action States
  const [previewDoctor, setPreviewDoctor] = useState<PortfolioRecord | null>(null);
  const [rejectDoctorId, setRejectDoctorId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Global Settings State
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    defaultCaseLimit: 3,
    cvAdEnabled: true,
    cvAdPosterUrl: '/cv-ad-poster.jpg',
    cvAdDurationSeconds: 5,
    upgradeWhatsAppNumber: '201271476215',
    maintenanceMode: false,
    autoSeoArticlesEnabled: true,
    baseUrl: 'https://portfoliohubs.pages.dev'
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingCvPoster, setUploadingCvPoster] = useState(false);
  const [checkingImageKit, setCheckingImageKit] = useState(false);
  const [lastDataRefresh, setLastDataRefresh] = useState<Date | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoCaseLimit, setPromoCaseLimit] = useState(5);
  const [promoMaxRedemptions, setPromoMaxRedemptions] = useState(100);
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoCodes, setPromoCodes] = useState<PromoCodeRecord[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(false);

  // Single Doctor Edit Modal
  const [editDoctorForm, setEditDoctorForm] = useState<PortfolioRecord | null>(null);
  const [savingDoctorEdit, setSavingDoctorEdit] = useState(false);

  // Blog Articles State & Filters
  const [blogArticlesList, setBlogArticlesList] = useState<BlogArticle[]>(INITIAL_BLOG_ARTICLES);
  const [blogSearchQuery, setBlogSearchQuery] = useState('');
  const [blogCategoryFilter, setBlogCategoryFilter] = useState('all');
  const [blogStatusFilter, setBlogStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [blogCurrentPage, setBlogCurrentPage] = useState(1);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  // Legacy GitHub Actions compatibility. Tokens are tab-scoped and never persisted across sessions.
  const [ghPat, setGhPat] = useState(() => sessionStorage.getItem('portfoliohubs_github_pat') || '');
  const [ghRepo, setGhRepo] = useState(() => sessionStorage.getItem('portfoliohubs_github_repo') || 'portfoliohubs/portfoliohubs.github.io');
  const [isDispatchingGh, setIsDispatchingGh] = useState(false);
  const [dispatchLogs, setDispatchLogs] = useState<string[]>([]);

  const handleCvPosterUpload = async (file: File) => {
    if (!adminUser) return;
    setUploadingCvPoster(true);
    setStatusMessage(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('Could not read the selected poster.'));
        reader.onerror = () => reject(reader.error || new Error('Could not read the selected poster.'));
        reader.readAsDataURL(file);
      });
      const upload = await uploadImageResilient(
        adminUser.uid,
        `admin/cv-poster-${Date.now()}.webp`,
        dataUrl,
      );
      setGlobalSettings((previous) => ({ ...previous, cvAdPosterUrl: upload.url }));
      setStatusMessage({ type: 'success', text: 'تم رفع ملصق إعلان السيرة الذاتية. احفظ الإعدادات لتفعيله.' });
    } catch (error) {
      console.error('[AdminDashboard] CV poster upload failed:', error);
      setStatusMessage({ type: 'error', text: 'تعذر رفع الملصق. تحقق من الاتصال وحاول مرة أخرى.' });
    } finally {
      setUploadingCvPoster(false);
    }
  };

  // 1. Auth & Admin Verification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAdminUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setAdminUser(user);

      try {
        setIsAdmin(Boolean(user.emailVerified && (
          user.email === 'cources01@gmail.com' ||
          user.email === 'admin@portfoliohubs.com' ||
          user.email === 'portfoliohubs.contact@gmail.com'
        )));
      } catch (err) {
        console.warn('Admin check error:', err);
        setIsAdmin(Boolean(
          user.emailVerified && (
            user.email === 'cources01@gmail.com' ||
            user.email === 'portfoliohubs.contact@gmail.com' ||
            user.email === 'admin@portfoliohubs.com'
          )
        ));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch Doctors & Global Settings
  const diagnoseImageKit = async () => {
    setCheckingImageKit(true);
    try {
      const result = await cloudflareApi.diagnoseImageKit();
      setStatusMessage({
        type: result.ok ? 'success' : 'error',
        text: result.ok
          ? `ImageKit authentication succeeded (request ${result.requestId || 'n/a'}).`
          : `ImageKit authentication failed: HTTP ${result.status}, ${result.keyFormat}, key length ${result.keyLength}, request ${result.requestId || 'n/a'}.`,
      });
    } catch (error) {
      setStatusMessage({ type: 'error', text: error instanceof Error ? error.message : 'ImageKit diagnostics failed.' });
    } finally {
      setCheckingImageKit(false);
    }
  };

  const fetchData = async () => {
    if (!isAdmin) return;
    setActionLoading(true);
    try {
      // Fetch Global Settings from Cloudflare D1 Worker
      try {
        const settingsRes = await cloudflareApi.getSettings('global');
        if (settingsRes?.data) {
          setGlobalSettings(prev => ({ ...prev, ...settingsRes.data }));
        }
      } catch (err) {
        console.log('[AdminDashboard] Settings not yet initialized in Worker, using defaults');
      }

      setLoadingPromos(true);
      try {
        const promoRows = await cloudflareApi.getPromoCodes();
        setPromoCodes(promoRows.map((row) => {
          const data = row.data && typeof row.data === 'object'
            ? row.data as Record<string, unknown>
            : {};
          return {
            code: String(row.code || ''),
            caseLimit: Number(data.caseLimit) || 3,
            maxRedemptions: Number(data.maxRedemptions) || 0,
            redeemedCount: Number(row.redeemed_count ?? data.redeemedCount) || 0,
            active: data.active === true,
            updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
          };
        }).filter((promo) => promo.code).sort((a, b) => a.code.localeCompare(b.code)));
      } catch (err) {
        console.warn('[AdminDashboard] Could not load promo codes:', err);
      } finally {
        setLoadingPromos(false);
      }

      try {
        const apiDoctors = await cloudflareApi.getAdminDoctors();
        setDoctors(apiDoctors.map((data) => ({
          ...data,
          id: data.id,
          caseCount: data.caseCount || 0,
          cases: data.cases || [],
          status: data.status || 'pending_review',
          active: data.active !== false,
        } as PortfolioRecord)));
      } catch (err) {
        console.error('[AdminDashboard] Could not read D1 doctors:', err);
        throw err;
      }
      setDoctors(prev => [...prev].sort((a, b) => {
        if (a.status === 'pending_review' && b.status !== 'pending_review') return -1;
        if (b.status === 'pending_review' && a.status !== 'pending_review') return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }));
      setLastDataRefresh(new Date());

      // Fetch blog articles overrides from Cloudflare Worker API
      try {
        const blogOverrides = await cloudflareApi.getBlogOverrides();
        const blogMap: Record<string, { published: boolean; publishedAt?: string }> = {};
        blogOverrides.forEach(row => {
          const data = row.data || {};
          blogMap[row.slug] = {
            published: Boolean(data.published),
            publishedAt: (typeof data.publishedAt === 'string' ? data.publishedAt : row.published_at || '') || ''
          };
        });

        setBlogArticlesList(prev => prev.map(art => {
          const ov = blogMap[art.slug];
          return ov ? { ...art, published: ov.published, publishedAt: ov.publishedAt || '' } : art;
        }));
      } catch (blogErr) {
        console.warn('[AdminDashboard] Note: using default blog articles:', blogErr);
      }
    } catch (err: any) {
      console.error('Error loading admin data:', err);
      const isPerm = err?.message?.includes('permission') || err?.code === 'permission-denied';
      setStatusMessage({ 
        type: 'error', 
        text: isPerm
          ? 'خطأ الصلاحيات: حسابك غير مسجل كمسؤول في قاعدة بيانات Firestore أو لم يتم نشر القواعد المحدثة في Firebase Console.'
          : 'فشل تحميل بيانات الأطباء: ' + (err.message || 'خطأ غير معروف')
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Article Publication State
  const toggleBlogArticlePublish = async (article: BlogArticle) => {
    setTogglingSlug(article.slug);
    try {
      const newPublished = !article.published;
      const nowIso = new Date().toISOString();

      // 1. Update Cloudflare Worker D1
      await cloudflareApi.saveBlogArticle(article.slug, {
        slug: article.slug,
        title: article.title,
        category: article.category,
        published: newPublished,
        publishedAt: newPublished ? nowIso : '',
        updatedAt: nowIso
      });

      // 2. Update Local State
      setBlogArticlesList(prev => prev.map(a => a.slug === article.slug ? {
        ...a,
        published: newPublished,
        publishedAt: newPublished ? nowIso : ''
      } : a));

      setStatusMessage({
        type: 'success',
        text: newPublished
          ? `✅ تم نشر المقالة (${article.title}) بنجاح!`
          : `ℹ️ تم إلغاء نشر المقالة (${article.title}).`
      });
    } catch (err: any) {
      console.error('Error toggling article publication:', err);
      setStatusMessage({ type: 'error', text: 'فشل تغيير حالة المقالة: ' + err.message });
    } finally {
      setTogglingSlug(null);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();

    // 1. Smart Polling every 30 seconds while the admin tab is open
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !actionLoading) {
        fetchData();
      }
    }, 30000);

    // 2. Real-time refetch immediately when admin switches back to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAdmin]);

  // 3. Filtered & Paginated Doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter(docItem => {
      // Status Filter
      if (filter === 'pending') {
        if (docItem.status !== 'pending_review' && !docItem.hasUnreviewedChanges) return false;
      } else if (filter === 'published') {
        if (docItem.status !== 'published' && docItem.status !== 'approved') return false;
      } else if (filter === 'suspended') {
        if (docItem.active !== false) return false;
      } else if (filter === 'rejected') {
        if (docItem.status !== 'rejected') return false;
      }

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = (docItem.fullName || '').toLowerCase().includes(q) || (docItem.fullNameAr || '').includes(q);
      const matchEmail = (docItem.email || '').toLowerCase().includes(q);
      const matchSlug = (docItem.slug || docItem.username || '').toLowerCase().includes(q);
      const matchUniv = (docItem.university || '').toLowerCase().includes(q) || (docItem.universityAr || '').includes(q);
      const matchCity = (docItem.locationAddress || '').toLowerCase().includes(q) || (docItem.locationAddressAr || '').includes(q);

      return matchName || matchEmail || matchSlug || matchUniv || matchCity;
    });
  }, [doctors, filter, searchQuery]);

  const totalPages = Math.ceil(filteredDoctors.length / pageSize) || 1;
  const paginatedDoctors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDoctors.slice(start, start + pageSize);
  }, [filteredDoctors, currentPage, pageSize]);

  // 4. Analytics Calculations & Spark Quota Estimator
  const analytics = useMemo(() => {
    const totalDoctors = doctors.length;
    const publishedCount = doctors.filter(d => d.status === 'published' || d.status === 'approved').length;
    const pendingCount = doctors.filter(d => d.status === 'pending_review' || d.hasUnreviewedChanges).length;
    const suspendedCount = doctors.filter(d => d.active === false).length;
    const totalCases = doctors.reduce((acc, d) => acc + (d.caseCount || 0), 0);

    // Approximate Spark Plan Quota Consumption
    const estDailyReads = Math.round(totalDoctors * 3.2 + 45); // Avg daily reads on dashboard & admin
    const maxFreeReads = 50000;
    const readsPercent = Math.min(100, (estDailyReads / maxFreeReads) * 100);

    const estDailyWrites = Math.round(totalCases * 0.8 + 10);
    const maxFreeWrites = 20000;
    const writesPercent = Math.min(100, (estDailyWrites / maxFreeWrites) * 100);

    // Document text storage estimate (approx 6KB per profile doc)
    const estStoredBytes = totalDoctors * 6 * 1024 + totalCases * 1.5 * 1024;
    const estStoredMB = (estStoredBytes / (1024 * 1024)).toFixed(2);
    const maxFreeMB = 1024; // 1GB
    const storagePercent = Math.min(100, (parseFloat(estStoredMB) / maxFreeMB) * 100);

    return {
      totalDoctors,
      publishedCount,
      pendingCount,
      suspendedCount,
      totalCases,
      estDailyReads,
      readsPercent,
      estDailyWrites,
      writesPercent,
      estStoredMB,
      storagePercent
    };
  }, [doctors]);

  // 5. Action: Toggle Suspend / Activate Account
  const handleToggleAccountActive = async (doctor: PortfolioRecord) => {
    const newActiveState = !(doctor.active !== false);
    try {
      await cloudflareApi.updateAdminDoctor(doctor.id, { active: newActiveState });

      setDoctors(prev => prev.map(d => d.id === doctor.id ? { ...d, active: newActiveState } : d));
      setStatusMessage({
        type: 'success',
        text: `تم ${newActiveState ? 'تفعيل' : 'إيقاف'} حساب د. ${doctor.fullName || doctor.fullNameAr} بنجاح.`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'فشل تغيير حالة الحساب: ' + err.message });
    }
  };

  // 6. Action: One-Click Approve Doctor (Triggers Publish + GitHub Dispatch + 4 Articles)
  const handleApproveDoctor = async (doctor: PortfolioRecord) => {
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const nowIso = new Date().toISOString();
      const baseSlug = doctor.slug || doctor.username || (doctor.fullName ? doctor.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : doctor.id);
      const derivedSlug = baseSlug || doctor.id;

      // Single Atomic Backend Approval in Cloudflare Worker & D1
      await cloudflareApi.approveAdminDoctor(doctor.id, derivedSlug);

      // Update Local State Optimistically
      setDoctors(prev => prev.map(d => d.id === doctor.id ? {
        ...d,
        status: 'published',
        active: true,
        slug: derivedSlug,
        username: derivedSlug,
        hasUnreviewedChanges: false,
        publishedAt: nowIso
      } : d));

      setStatusMessage({
        type: 'success',
        text: `🎉 تم اعتماد وتفعيل بورتفوليو د. ${doctor.fullName || doctor.fullNameAr} بنجاح! الرابط منشور ومتاح فوراً في /dr/${derivedSlug}.`
      });

      setPreviewDoctor(null);
    } catch (err: any) {
      console.error('Error approving doctor:', err);
      const isPerm = err?.message?.includes('permission') || err?.code === 'permission-denied';
      setStatusMessage({ 
        type: 'error', 
        text: isPerm
          ? 'فشل اعتماد البورتفوليو: صلاحيات غير كافية. يرجى التأكد من تسجيل الدخول بحساب الأدمن المعتمد.'
          : 'فشل اعتماد البورتفوليو: ' + err.message 
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Action: Reject Doctor with Notes
  const handleRejectDoctor = async () => {
    if (!rejectDoctorId) return;
    setActionLoading(true);

    try {
      await cloudflareApi.updateAdminDoctor(rejectDoctorId, {
        status: 'rejected',
        hasUnreviewedChanges: false,
        adminNotes: rejectNotes,
        rejectionReason: rejectNotes,
      });

      setDoctors(prev => prev.map(d => d.id === rejectDoctorId ? {
        ...d,
        status: 'rejected',
        hasUnreviewedChanges: false,
        adminNotes: rejectNotes
      } : d));

      setStatusMessage({
        type: 'info',
        text: 'تم رفض الطلب وحفظ سبب الرفض بنجاح ليظهر للطبيب في لوحة تحكمه.'
      });
      setRejectDoctorId(null);
      setRejectNotes('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'فشل رفض الطلب: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Action: Save Global Settings
  const handleSaveGlobalSettings = async () => {
    setSavingSettings(true);
    try {
      await cloudflareApi.saveSettings('global', {
        ...globalSettings,
        updatedAt: new Date().toISOString(),
        updatedBy: adminUser?.email || 'admin'
      });

      setStatusMessage({
        type: 'success',
        text: 'تم حفظ وتحديث الإعدادات والحدود العامة بنجاح عبر الخادم السحابي وتسري فوراً.'
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'فشل حفظ الإعدادات: ' + err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSavePromo = async () => {
    const normalizedCode = promoCode.trim().toUpperCase();
    if (!normalizedCode) return;
    setSavingPromo(true);
    try {
      const promo = {
        code: normalizedCode,
        caseLimit: Math.max(3, promoCaseLimit),
        maxRedemptions: Math.max(1, promoMaxRedemptions),
        redeemedCount: 0,
        active: true,
        updatedAt: new Date().toISOString(),
        updatedBy: adminUser?.email || 'admin',
      };
      await cloudflareApi.savePromoCode(normalizedCode, promo);
      setPromoCodes((previous) => [
        ...previous.filter((item) => item.code !== normalizedCode),
        {
          code: normalizedCode,
          caseLimit: Math.max(3, promoCaseLimit),
          maxRedemptions: Math.max(1, promoMaxRedemptions),
          redeemedCount: 0,
          active: true,
          updatedAt: new Date().toISOString(),
        },
      ].sort((a, b) => a.code.localeCompare(b.code)));
      setPromoCode('');
      setStatusMessage({ type: 'success', text: 'Promo code saved successfully.' });
    } catch (error) {
      console.error('[AdminDashboard] Failed to save promo code:', error);
      setStatusMessage({ type: 'error', text: 'Could not save promo code.' });
    } finally {
      setSavingPromo(false);
    }
  };

  const handleTogglePromo = async (promo: PromoCodeRecord) => {
    try {
      await cloudflareApi.savePromoCode(promo.code, {
        ...promo,
        active: !promo.active,
        updatedAt: new Date().toISOString(),
        updatedBy: adminUser?.email || 'admin',
      });
      setPromoCodes((previous) => previous.map((item) =>
        item.code === promo.code ? { ...item, active: !item.active } : item,
      ));
    } catch (error) {
      console.error('[AdminDashboard] Failed to toggle promo code:', error);
      setStatusMessage({ type: 'error', text: 'Could not update promo code status.' });
    }
  };

  const handleDeletePromo = async (promo: PromoCodeRecord) => {
    if (!window.confirm(`Delete promo code ${promo.code}?`)) return;
    try {
      await cloudflareApi.deletePromoCode(promo.code);
      setPromoCodes((previous) => previous.filter((item) => item.code !== promo.code));
    } catch (error) {
      console.error('[AdminDashboard] Failed to delete promo code:', error);
      setStatusMessage({ type: 'error', text: 'Could not delete promo code.' });
    }
  };

  // 9. Action: Save Doctor Direct Edit (e.g. Case Limit, University, Title)
  const handleSaveDoctorEdit = async () => {
    if (!editDoctorForm) return;
    setSavingDoctorEdit(true);
    try {
      const { id, caseLimit, title, titleAr, fullName, fullNameAr, university, universityAr, graduationYear, clinicName, clinicNameAr, locationAddress, locationAddressAr, phone, whatsapp } = editDoctorForm;

      await cloudflareApi.updateAdminDoctor(id, {
        caseLimit: Number(caseLimit) || 3,
        title: title || '',
        titleAr: titleAr || '',
        fullName: fullName || '',
        fullNameAr: fullNameAr || '',
        university: university || '',
        universityAr: universityAr || '',
        graduationYear: graduationYear || '',
        clinicName: clinicName || '',
        clinicNameAr: clinicNameAr || '',
        locationAddress: locationAddress || '',
        locationAddressAr: locationAddressAr || '',
        phone: phone || '',
        whatsapp: whatsapp || '',
      });

      setDoctors(prev => prev.map(d => d.id === id ? { ...d, ...editDoctorForm, caseLimit: Number(caseLimit) || 3 } : d));
      setStatusMessage({ type: 'success', text: `تم تحديث بيانات وحدود د. ${fullName} بنجاح.` });
      setEditDoctorForm(null);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'فشل تحديث البيانات: ' + err.message });
    } finally {
      setSavingDoctorEdit(false);
    }
  };

  // 10. Action: Dispatch GitHub Actions Workflow
  const dispatchGitHubAction = async (eventType = 'generate_pages', clientPayload = {}): Promise<{ ok: boolean; status?: number; error?: string }> => {
    if (!ghPat.trim()) {
      setStatusMessage({
        type: 'info',
        text: 'لم يتم حفظ GitHub PAT في المتصفح. يمكنك إدخاله في تبويب GitHub Actions لإرسال أوامر النشر التلقائي.'
      });
      return { ok: false, error: 'PAT missing' };
    }

    setIsDispatchingGh(true);
    const timestamp = new Date().toLocaleTimeString('ar-EG');
    try {
      const res = await fetch(`https://api.github.com/repos/${ghRepo}/dispatches`, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${ghPat.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: eventType,
          client_payload: clientPayload
        })
      });

      if (res.status === 204 || res.ok) {
        const logMsg = `[${timestamp}] ✅ تم إطلاق GitHub Action بنجاح (${eventType}).`;
        setDispatchLogs(prev => [logMsg, ...prev]);
        return { ok: true, status: res.status };
      } else {
        const errText = await res.text();
        const isBadCreds = res.status === 401;
        const logMsg = `[${timestamp}] ❌ فشل استدعاء GitHub API (${res.status}): ${isBadCreds ? 'رمز الوصول PAT غير صالح أو منتهي الصلاحية (Bad credentials)' : errText}`;
        setDispatchLogs(prev => [logMsg, ...prev]);
        return { ok: false, status: res.status, error: isBadCreds ? 'Bad credentials (401)' : errText };
      }
    } catch (err: any) {
      const logMsg = `[${timestamp}] ❌ خطأ في الاتصال بـ GitHub: ${err.message}`;
      setDispatchLogs(prev => [logMsg, ...prev]);
      return { ok: false, error: err.message };
    } finally {
      setIsDispatchingGh(false);
    }
  };

  // Render: Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-cyan-700 animate-spin mx-auto" />
          <p className="text-slate-600 dark:text-slate-400 font-semibold">جاري التحقق من صلاحيات الإدارة...</p>
        </div>
      </div>
    );
  }

  // Render: Access Denied
  if (!adminUser || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">غير مصرح بالدخول</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              هذه الصفحة مخصصة فقط لإدارة منصة PortfolioHubs. حسابك الحالي ({adminUser?.email || 'غير مسجل'}) لا يمتلك صلاحيات الأدمن.
            </p>
          </div>
          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={() => setLocation('/login')}
              className="w-full py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white font-bold rounded-xl transition shadow-sm"
            >
              تسجيل الدخول بحساب الإدارة
            </button>
            <button
              onClick={() => setLocation('/')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition"
            >
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors" dir="rtl">
      {/* Top Navbar */}
      <Header />

      {/* Admin Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-cyan-100 text-cyan-800 rounded-xl flex items-center justify-center font-black">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 dark:text-slate-100">لوحة تحكم إدارة PortfolioHubs</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">مسؤول النظام: {adminUser?.email}</p>
              </div>
            </div>

            {/* Quick Actions in Navbar */}
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                disabled={actionLoading}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 rounded-xl transition flex items-center gap-1.5 text-xs font-bold border border-slate-200"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin text-cyan-700' : ''}`} />
                <span className="hidden sm:inline">تحديث</span>
              </button>

              <button
                onClick={() => signOut(auth).then(() => setLocation('/login'))}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-1.5 text-xs font-bold border border-rose-100"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-reverse space-x-1 overflow-x-auto pb-1 scrollbar-none text-sm font-bold border-t border-slate-100 pt-1">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'queue'
                  ? 'bg-cyan-50 text-cyan-800 border-b-2 border-cyan-700 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>مركز الاعتماد</span>
              {analytics.pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-[11px] px-2 py-0.5 rounded-full font-black animate-pulse">
                  {analytics.pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-cyan-50 text-cyan-800 border-b-2 border-cyan-700 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>إدارة الأطباء ({analytics.totalDoctors})</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-cyan-50 text-cyan-800 border-b-2 border-cyan-700 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>لوحة الإحصائيات واستهلاك Spark</span>
            </button>

            <button
              onClick={() => setActiveTab('articles')}
              className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'articles'
                  ? 'bg-cyan-50 text-cyan-800 border-b-2 border-cyan-700 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>المقالات الأربع التلقائية (SEO)</span>
            </button>

            <button
              onClick={() => setActiveTab('limits')}
              className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'limits'
                  ? 'bg-cyan-50 text-cyan-800 border-b-2 border-cyan-700 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-100'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>إدارة الحدود العامة</span>
            </button>

            <button
              onClick={() => setActiveTab('github')}
              className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'github'
                  ? 'bg-cyan-50 text-cyan-800 border-b-2 border-cyan-700 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-100'
              }`}
            >
              <Rocket className="w-4 h-4" />
              <span>نشر GitHub Actions</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Status Message Alert */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between shadow-xs border transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-cyan-50 border-cyan-200 text-cyan-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {statusMessage.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />}
              {statusMessage.type === 'error' && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
              {statusMessage.type === 'info' && <AlertCircle className="w-5 h-5 text-cyan-600 shrink-0" />}
              <span className="text-sm font-bold">{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 hover:bg-black/5 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: APPROVAL QUEUE (مركز الاعتماد) */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">طلبات المراجعة والاعتماد المعلقة</h2>
                  <span className="bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-0.5 rounded-full">
                    {analytics.pendingCount} طلب بانتظار المراجعة
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  مراجعة الحالات والمعلومات واعتماد البورتفوليو وإطلاق محرك المقالات الأربع وتوليد صفحات البورتفوليو بنقرة واحدة.
                </p>
              </div>

              {analytics.pendingCount > 0 && (
                <button
                  onClick={() => dispatchGitHubAction('admin_approved')}
                  disabled={isDispatchingGh}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-700 to-cyan-800 hover:from-cyan-800 hover:to-cyan-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition"
                >
                  <Rocket className="w-4 h-4" />
                  <span>توليد ونشر كل الحالات المعتمدة</span>
                </button>
              )}
            </div>

            {doctors.filter(d => d.status === 'pending_review' || d.hasUnreviewedChanges).length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">طابور الاعتماد خالٍ تماماً!</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                  جميع البورتفوليوهات والطلبات الحالية تمت مراجعتها ونشرها، وسيظهر أي طلب جديد يقدمه الأطباء هنا فوراً.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors
                  .filter(d => d.status === 'pending_review' || d.hasUnreviewedChanges)
                  .map(docItem => (
                    <div
                      key={docItem.id}
                      className="bg-white rounded-2xl border border-amber-200 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={docItem.profilePreview || docItem.profilePhoto || 'https://github.com/user-attachments/assets/fef6c67d-5ed0-4459-b41d-4c288ab48163'}
                              alt={docItem.fullName}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-xs"
                            />
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-slate-100">{docItem.fullNameAr || docItem.fullName}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{docItem.titleAr || docItem.title || 'طبيب أسنان'}</p>
                            </div>
                          </div>
                          <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-2 py-0.5 rounded-md">
                            بانتظار الاعتماد
                          </span>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <div className="flex items-center justify-between">
                            <span>الجامعة:</span>
                            <span className="font-bold text-slate-800">{docItem.universityAr || docItem.university || 'غير محدد'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>العيادة / المدينة:</span>
                            <span className="font-bold text-slate-800">{docItem.locationAddressAr || docItem.clinicNameAr || 'غير محدد'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>حالات الأسنان:</span>
                            <span className="font-bold text-cyan-700">{docItem.caseCount || 0} حالات مرفوعة</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => setPreviewDoctor(docItem)}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة كاملة</span>
                        </button>

                        <button
                          onClick={() => handleApproveDoctor(docItem)}
                          disabled={actionLoading}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>اعتماد ونشر</span>
                        </button>

                        <button
                          onClick={() => setRejectDoctorId(docItem.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200"
                          title="رفض مع سبب"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DOCTOR MANAGEMENT (إدارة الأطباء) */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="ابحث بالاسم، البريد، الجامعة، المدينة..."
                  className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                <button
                  onClick={() => { setFilter('all'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  الكل ({doctors.length})
                </button>
                <button
                  onClick={() => { setFilter('pending'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    filter === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  معلق ({analytics.pendingCount})
                </button>
                <button
                  onClick={() => { setFilter('published'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    filter === 'published' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  منشور ({analytics.publishedCount})
                </button>
                <button
                  onClick={() => { setFilter('suspended'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    filter === 'suspended' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  موقوف ({analytics.suspendedCount})
                </button>
              </div>
            </div>

            {/* Doctors Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 dark:text-slate-400 text-xs font-bold">
                    <tr>
                      <th className="py-3.5 px-4">الطبيب</th>
                      <th className="py-3.5 px-4">البريد الإلكتروني</th>
                      <th className="py-3.5 px-4">الحالات / الحد</th>
                      <th className="py-3.5 px-4">حالة البورتفوليو</th>
                      <th className="py-3.5 px-4">الحساب</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                    {paginatedDoctors.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          لا توجد نتائج مطابقة لبحثك.
                        </td>
                      </tr>
                    ) : (
                      paginatedDoctors.map(doctor => (
                        <tr key={doctor.id} className="hover:bg-slate-50/80 transition">
                          {/* Name & Avatar */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={doctor.profilePreview || doctor.profilePhoto || 'https://github.com/user-attachments/assets/fef6c67d-5ed0-4459-b41d-4c288ab48163'}
                                alt=""
                                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                              />
                              <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">{doctor.fullNameAr || doctor.fullName}</div>
                                <div className="text-xs text-slate-400">{doctor.universityAr || doctor.university || 'طبيب أسنان'}</div>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                            {doctor.email || '—'}
                          </td>

                          {/* Case Count vs Limit */}
                          <td className="py-3 px-4 text-xs">
                            <span className="font-bold text-cyan-800">{doctor.caseCount || 0}</span>
                            <span className="text-slate-400"> / {doctor.caseLimit || 3} حالة</span>
                          </td>

                          {/* Portfolio Status */}
                          <td className="py-3 px-4">
                            {doctor.status === 'published' || doctor.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>معتمد ومنشور</span>
                              </span>
                            ) : doctor.status === 'pending_review' ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
                                <Clock className="w-3.5 h-3.5" />
                                <span>قيد المراجعة</span>
                              </span>
                            ) : doctor.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-200">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>مرفوض</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 dark:text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full">
                                <span>مسودة (Draft)</span>
                              </span>
                            )}
                          </td>

                          {/* Active / Suspended Toggle */}
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleAccountActive(doctor)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                                doctor.active !== false
                                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                              }`}
                            >
                              {doctor.active !== false ? (
                                <>
                                  <ToggleRight className="w-4 h-4 text-emerald-600" />
                                  <span>نشط</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-4 h-4 text-rose-600" />
                                  <span>موقوف</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setPreviewDoctor(doctor)}
                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-cyan-700 hover:bg-slate-100 rounded-lg transition"
                                title="معاينة البورتفوليو"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setEditDoctorForm(doctor)}
                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-cyan-700 hover:bg-slate-100 rounded-lg transition"
                                title="تعديل الحدود والبيانات"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {(doctor.status === 'published' || doctor.status === 'approved') && (
                                <a
                                  href={`${globalSettings.baseUrl}/dr${doctor.slug || doctor.username || doctor.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-cyan-700 hover:bg-cyan-50 rounded-lg transition"
                                  title="فتح الرابط المباشر"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span>عرض:</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-white border border-slate-200 rounded-md px-2 py-1"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>من إجمالي {filteredDoctors.length} طبيب</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md hover:bg-slate-200 disabled:opacity-40 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="px-2">صفحة {currentPage} من {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md hover:bg-slate-200 disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS & SPARK QUOTA (لوحة الإحصائيات واستهلاك Spark) */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">إجمالي الأطباء المسجلين</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{analytics.totalDoctors}</span>
                  <Users className="w-5 h-5 text-cyan-700" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">البورتفوليوهات المنشورة</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-600">{analytics.publishedCount}</span>
                  <Globe className="w-5 h-5 text-emerald-600" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">طلبات الاعتماد المعلقة</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-amber-500">{analytics.pendingCount}</span>
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">إجمالي حالات الأسنان</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-cyan-900">{analytics.totalCases}</span>
                  <Sparkles className="w-5 h-5 text-cyan-900" />
                </div>
              </div>
            </div>

            {/* Spark Plan Quota Consumption Meters */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-700" />
                  <h3 className="font-black text-slate-900 dark:text-slate-100">مقياس استهلاك خطة Firebase Spark المجانية (Zero-Cost Metric)</h3>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                  التكلفة الشهرية: $0.00 دائم
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Daily Reads */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-400">قراءات Firestore اليومية:</span>
                    <span className="text-slate-900 dark:text-slate-100">{analytics.estDailyReads.toLocaleString()} / 50,000</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(2, analytics.readsPercent)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">استهلاك {analytics.readsPercent.toFixed(1)}% من الحد اليومي المجاني.</p>
                </div>

                {/* Daily Writes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-400">كتابات Firestore اليومية:</span>
                    <span className="text-slate-900 dark:text-slate-100">{analytics.estDailyWrites.toLocaleString()} / 20,000</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(2, analytics.writesPercent)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">استهلاك {analytics.writesPercent.toFixed(1)}% من الحد اليومي المجاني.</p>
                </div>

                {/* Document Storage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-400">حجم نصوص Firestore:</span>
                    <span className="text-slate-900 dark:text-slate-100">{analytics.estStoredMB} MB / 1,024 MB</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(1, analytics.storagePercent)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">الصور تُخزن مجاناً 100% على Firebase Storage.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BLOG ARTICLES & SEO PUBLISHING BOARD (200 ARTICLES) */}
        {activeTab === 'articles' && (() => {
          const todayIsoDate = new Date().toISOString().split('T')[0];
          const publishedArticles = blogArticlesList.filter(a => a.published);
          const publishedTodayCount = blogArticlesList.filter(a => a.published && a.publishedAt && a.publishedAt.startsWith(todayIsoDate)).length;
          const draftCount = blogArticlesList.length - publishedArticles.length;

          // Filtering
          const filteredBlogArticles = blogArticlesList.filter(article => {
            // Category filter
            if (blogCategoryFilter !== 'all' && article.category !== blogCategoryFilter) return false;
            
            // Status filter
            if (blogStatusFilter === 'published' && !article.published) return false;
            if (blogStatusFilter === 'draft' && article.published) return false;

            // Search query
            if (blogSearchQuery.trim()) {
              const q = blogSearchQuery.toLowerCase().trim();
              const matchTitle = article.title.toLowerCase().includes(q);
              const matchKw = article.keyword.toLowerCase().includes(q);
              const matchSlug = article.slug.toLowerCase().includes(q);
              const matchDesc = article.description.toLowerCase().includes(q);
              return matchTitle || matchKw || matchSlug || matchDesc;
            }
            return true;
          });

          const blogPageSize = 15;
          const blogTotalPages = Math.ceil(filteredBlogArticles.length / blogPageSize) || 1;
          const paginatedBlogArticles = filteredBlogArticles.slice((blogCurrentPage - 1) * blogPageSize, blogCurrentPage * blogPageSize);

          return (
            <div className="space-y-6">
              {/* Header Bar */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-cyan-100 text-cyan-800 rounded-2xl flex items-center justify-center font-bold">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">بنك المقالات الطبية وتصادر محركات البحث (200 مقالة)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">إدارة ونشر المقالات المهنية والتوعوية وتوليد صفحات البورتفوليو والـ Sitemap تلقائياً.</p>
                  </div>
                </div>

                <a
                  href="/blog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-200"
                >
                  <Globe className="w-4 h-4 text-cyan-800" />
                  <span>معاينة صفحة المدونة العامة</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Stats & Daily Pace Counters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المقالات المجهزة</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">200 مقالة</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المقالات المنشورة الآن</span>
                  <p className="text-2xl font-black text-emerald-600">{publishedArticles.length} مقالات</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المقالات كمسودات</span>
                  <p className="text-2xl font-black text-amber-600">{draftCount} مسودة</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-cyan-200 shadow-2xs space-y-1 bg-cyan-50/50">
                  <span className="text-xs font-bold text-cyan-800">منشور اليوم ({todayIsoDate})</span>
                  <p className="text-2xl font-black text-cyan-900">{publishedTodayCount} مقالة</p>
                </div>
              </div>

              {/* Executive Algorithmic Safety Tip Box */}
              {publishedTodayCount > 3 ? (
                <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/90 rounded-2xl p-5 space-y-2 text-amber-900 shadow-2xs">
                  <div className="flex items-center gap-2 font-black text-sm text-amber-900">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>تنبيه خوارزميات محركات البحث (Google Spam & Quality Pacing):</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800">
                    لقد قمت بنشر <strong>{publishedTodayCount} مقالات اليوم</strong>. توصي خوارزميات جوجل ومعايير الـ SEO بعدم نشر دفعات مفرطة في يوم واحد تفادياً لأنماط الـ Drip/Bulk Content المريبة. ينصح بنشر مقالة أو مقالتين يومياً بانتظام لبناء أرشفة طبيعية مستدامة.
                  </p>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-2xl p-5 space-y-2 text-emerald-900 shadow-2xs">
                  <div className="flex items-center gap-2 font-black text-sm text-emerald-900">
                    <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>إرشادات النشر التراكمي المستدام (Recommended Publishing Pace):</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-800">
                    معدل النشر الحالي متزن للغاية (<strong>{publishedTodayCount} مقالة اليوم</strong>). النشر المنتظم بمعدل 1 إلى 2 مقالة يومياً يزيد من كفاءة ميزانية الزحف (Crawl Budget) ويرفع سلطة الموقع (Domain Authority) بثبات دون مخاطرة.
                  </p>
                </div>
              )}

              {/* Filter and Search Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={blogSearchQuery}
                      onChange={e => {
                        setBlogSearchQuery(e.target.value);
                        setBlogCurrentPage(1);
                      }}
                      placeholder="ابحث في المقالات الـ 200 بعنون المقالة، الكلمة المفتاحية، أو الرابط..."
                      className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:bg-white transition"
                    />
                  </div>

                  {/* Category Filter */}
                  <select
                    value={blogCategoryFilter}
                    onChange={e => {
                      setBlogCategoryFilter(e.target.value);
                      setBlogCurrentPage(1);
                    }}
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  >
                    <option value="all">جميع التصنيفات (6 تصنيفات)</option>
                    {BLOG_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.nameAr}</option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={blogStatusFilter}
                    onChange={e => {
                      setBlogStatusFilter(e.target.value as any);
                      setBlogCurrentPage(1);
                    }}
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="published">منشور فقط</option>
                    <option value="draft">مسودة فقط</option>
                  </select>
                </div>

                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  مطابق للبحث: {filteredBlogArticles.length} مقالة
                </div>
              </div>

              {/* Articles Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-black text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="py-3.5 px-4">#</th>
                        <th className="py-3.5 px-4">عنوان المقالة والكلمة المفتاحية</th>
                        <th className="py-3.5 px-4">التصنيف الرئيسي</th>
                        <th className="py-3.5 px-4">زمن القراءة</th>
                        <th className="py-3.5 px-4">الحالة</th>
                        <th className="py-3.5 px-4">تاريخ النشر</th>
                        <th className="py-3.5 px-4 text-center">النشر بضغطة واحدة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {paginatedBlogArticles.map((article, idx) => {
                        const globalIndex = (blogCurrentPage - 1) * blogPageSize + idx + 1;
                        const isToggling = togglingSlug === article.slug;

                        return (
                          <tr key={article.slug} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 text-slate-400 font-bold">{globalIndex}</td>
                            
                            <td className="py-3.5 px-4 max-w-sm">
                              <div className="space-y-1">
                                <a
                                  href={`/blog/${article.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-slate-900 dark:text-slate-100 hover:text-cyan-800 transition line-clamp-1 flex items-center gap-1"
                                >
                                  <span>{article.title}</span>
                                  <ExternalLink className="w-3 h-3 opacity-40 shrink-0" />
                                </a>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  <Tag className="w-3 h-3 text-cyan-700 shrink-0" />
                                  <span>الكلمة: <strong>{article.keyword}</strong></span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-800 text-[11px] font-black whitespace-nowrap">
                                {article.categoryAr}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                              {article.readingTime}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {article.published ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>منشور</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-black">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>مسودة</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                              {article.publishedAt ? article.publishedAt.split('T')[0] : '—'}
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => toggleBlogArticlePublish(article)}
                                disabled={isToggling}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 mx-auto ${
                                  article.published
                                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                    : 'bg-cyan-800 text-white hover:bg-cyan-900 shadow-2xs'
                                }`}
                              >
                                {isToggling ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : article.published ? (
                                  <>
                                    <ToggleRight className="w-4 h-4" />
                                    <span>إلغاء النشر</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-4 h-4" />
                                    <span>نشر الآن</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination */}
                {blogTotalPages > 1 && (
                  <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                    <button
                      onClick={() => setBlogCurrentPage(p => Math.max(1, p - 1))}
                      disabled={blogCurrentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold disabled:opacity-40 hover:bg-slate-100 transition flex items-center gap-1"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>السابقة</span>
                    </button>

                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      صفحة {blogCurrentPage} من {blogTotalPages}
                    </span>

                    <button
                      onClick={() => setBlogCurrentPage(p => Math.min(blogTotalPages, p + 1))}
                      disabled={blogCurrentPage === blogTotalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold disabled:opacity-40 hover:bg-slate-100 transition flex items-center gap-1"
                    >
                      <span>التالية</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB 5: GLOBAL LIMITS (إدارة الحدود العامة) */}
        {activeTab === 'limits' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6 max-w-2xl">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">إدارة الحدود والإعدادات العامة للمنصة</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                أي تعديل هنا يتم حفظه في Firestore ويسري فوراً على جميع الأطباء المشتركين دون الحاجة لإعادة نشر الكود.
              </p>
              <button
                type="button"
                onClick={() => void diagnoseImageKit()}
                disabled={checkingImageKit}
                className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 disabled:opacity-50"
              >
                {checkingImageKit ? 'جارٍ فحص ImageKit...' : 'فحص مصادقة ImageKit'}
              </button>
            </div>

            <div className="space-y-4">
              {/* Default Free Cases Limit */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">حد حالات الأسنان المجانية الافتراضي:</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={globalSettings.defaultCaseLimit}
                  onChange={e => setGlobalSettings(prev => ({ ...prev, defaultCaseLimit: Number(e.target.value) || 3 }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:bg-white"
                />
                <p className="text-[11px] text-slate-400">العدد الافتراضي المسموح للطبيب برفعه مجاناً (الحالي: 3).</p>
              </div>

              <div className="space-y-3 rounded-xl border border-cyan-100 bg-cyan-50/50 p-4">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">إضافة Promo Code</div>
                  <div className="text-[11px] text-slate-500">يمنح الطبيب حد الحالات المحدد حتى سقف الاستخدام.</div>
                </div>
                <input
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value)}
                  placeholder="FREE5"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-bold uppercase"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={3}
                    value={promoCaseLimit}
                    onChange={e => setPromoCaseLimit(Number(e.target.value) || 5)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-bold"
                    aria-label="Promo case limit"
                  />
                  <input
                    type="number"
                    min={1}
                    value={promoMaxRedemptions}
                    onChange={e => setPromoMaxRedemptions(Number(e.target.value) || 100)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-bold"
                    aria-label="Promo max redemptions"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSavePromo}
                  disabled={savingPromo || !promoCode.trim()}
                  className="w-full rounded-xl bg-cyan-700 py-2.5 text-sm font-black text-white disabled:opacity-60"
                >
                  {savingPromo ? 'Saving...' : 'حفظ البرومو'}
                </button>
                <div className="space-y-2 border-t border-cyan-100 pt-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>الأكواد الحالية</span>
                    <span>{promoCodes.length}</span>
                  </div>
                  {loadingPromos && <p className="text-xs text-slate-500">جارٍ التحميل...</p>}
                  {!loadingPromos && promoCodes.length === 0 && (
                    <p className="text-xs text-slate-500">لا توجد أكواد محفوظة.</p>
                  )}
                  {promoCodes.map((promo) => (
                    <div key={promo.code} className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 text-xs">
                      <div>
                        <div className="font-black">{promo.code}</div>
                        <div className="text-[10px] text-slate-500">
                          {promo.caseLimit} حالات · {promo.redeemedCount || 0}/{promo.maxRedemptions} استخدام
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => void handleTogglePromo(promo)} className="rounded-md px-2 py-1 font-bold text-cyan-700 hover:bg-cyan-50">
                          {promo.active ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button type="button" onClick={() => void handleDeletePromo(promo)} className="rounded-md px-2 py-1 font-bold text-red-600 hover:bg-red-50">
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">إعلان التحميل لمسار CV</div>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={globalSettings.cvAdEnabled}
                    onChange={e => setGlobalSettings(prev => ({ ...prev, cvAdEnabled: e.target.checked }))}
                  />
                  تفعيل الإعلان
                </label>
                <input
                  value={globalSettings.cvAdPosterUrl}
                  onChange={e => setGlobalSettings(prev => ({ ...prev, cvAdPosterUrl: e.target.value }))}
                  placeholder="/cv-ad-poster.jpg"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm"
                />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-600 transition hover:border-cyan-500 hover:text-cyan-700">
                  <ImageIcon className="h-4 w-4" />
                  {uploadingCvPoster ? 'جارٍ رفع الملصق...' : 'رفع ملصق من الجهاز'}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingCvPoster}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleCvPosterUpload(file);
                      event.target.value = '';
                    }}
                  />
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={globalSettings.cvAdDurationSeconds}
                  onChange={e => setGlobalSettings(prev => ({ ...prev, cvAdDurationSeconds: Number(e.target.value) || 5 }))}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm"
                  aria-label="CV ad duration in seconds"
                />
              </div>

              {/* Upgrade WhatsApp Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">رقم واتساب الترقية والدعم الفني:</label>
                <input
                  type="text"
                  value={globalSettings.upgradeWhatsAppNumber}
                  onChange={e => setGlobalSettings(prev => ({ ...prev, upgradeWhatsAppNumber: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:bg-white"
                />
                <p className="text-[11px] text-slate-400">الرقم الموجه إليه عند رغبة الطبيب في ترقية باقته ورفع المزيد من الحالات.</p>
              </div>

              {/* Maintenance Mode Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">وضع الصيانة للمنصة (Maintenance Mode)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">إيقاف التعديلات مؤقتاً أثناء التحديثات الكبرى</div>
                </div>
                <button
                  type="button"
                  onClick={() => setGlobalSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                  className="text-cyan-700"
                >
                  {globalSettings.maintenanceMode ? (
                    <ToggleRight className="w-8 h-8 text-rose-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <button
                  onClick={handleSaveGlobalSettings}
                  disabled={savingSettings}
                  className="w-full py-3 bg-cyan-700 hover:bg-cyan-800 text-white font-black rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-sm"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>حفظ وتطبيق الحدود فوراً</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: GITHUB ACTIONS DISPATCH (نشر وتوليد) */}
        {activeTab === 'github' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6 max-w-3xl">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">إعدادات مشغل GitHub Actions والنشر السحابي</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                توليد صفحات المواقع وحفظ الصور في Firebase Storage ونشرها فوراً على Firebase Hosting.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">GitHub Personal Access Token (PAT):</label>
                <input
                  type="password"
                  value={ghPat}
                  onChange={e => {
                    setGhPat(e.target.value);
                    sessionStorage.setItem('portfoliohubs_github_pat', e.target.value);
                  }}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:bg-white"
                />
                <p className="text-[11px] text-slate-400">يُحفظ مشفراً في متصفحك فقط لإرسال أوامر الـ repository_dispatch.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">المستودع (Repository):</label>
                <input
                  type="text"
                  value={ghRepo}
                  onChange={e => {
                    setGhRepo(e.target.value);
                    sessionStorage.setItem('portfoliohubs_github_repo', e.target.value);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => dispatchGitHubAction('generate_pages')}
                  disabled={isDispatchingGh}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-700 to-cyan-800 hover:from-cyan-800 hover:to-cyan-900 text-white px-6 py-3 rounded-xl font-black text-sm shadow-md transition"
                >
                  {isDispatchingGh ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  <span>⚡ تشغيل محرك التوليد ونشر الصفحات الثابتة الآن</span>
                </button>
              </div>

              {/* Logs */}
              {dispatchLogs.length > 0 && (
                <div className="mt-4 bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
                  {dispatchLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: FULL LIVE PREVIEW */}
      {previewDoctor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={previewDoctor.profilePreview || previewDoctor.profilePhoto || 'https://github.com/user-attachments/assets/fef6c67d-5ed0-4459-b41d-4c288ab48163'}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />
                <div>
                  <h3 className="font-bold text-sm">معاينة بورتفوليو د. {previewDoctor.fullNameAr || previewDoctor.fullName}</h3>
                  <p className="text-xs text-slate-400">{previewDoctor.universityAr || previewDoctor.university || 'طبيب أسنان'}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoctor(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Doctor Details Grid */}
              <div className="bg-slate-50 p-4 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-bold block">الاسم:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{previewDoctor.fullNameAr || previewDoctor.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-bold block">المسمى:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{previewDoctor.titleAr || previewDoctor.title || 'طبيب أسنان'}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-bold block">الجامعة:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{previewDoctor.universityAr || previewDoctor.university || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-bold block">العيادة / المدينة:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{previewDoctor.locationAddressAr || previewDoctor.clinicNameAr || '—'}</span>
                </div>
              </div>

              {/* Cases Showcase */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-700" />
                  <span>حالات الأسنان ({previewDoctor.cases?.length || 0})</span>
                </h4>

                {(!previewDoctor.cases || previewDoctor.cases.length === 0) ? (
                  <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl text-center">لا توجد حالات مهنية مرفوعة في هذا البورتفوليو.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {previewDoctor.cases.map((c: any, i: number) => (
                      <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden p-3 bg-white space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-900 dark:text-slate-100">{c.titleAr || c.title || `حالة ${i + 1}`}</span>
                          <span className="bg-cyan-50 text-cyan-800 px-2 py-0.5 rounded-md text-[10px]">{c.category || 'حشو وتجميل'}</span>
                        </div>
                        <div className="h-44 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                          <img
                            src={c.preview || c.photo || c.afterPhotoUrl || c.thumbnail || 'https://github.com/user-attachments/assets/fef6c67d-5ed0-4459-b41d-4c288ab48163'}
                            alt=""
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{c.descriptionAr || c.description || '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setPreviewDoctor(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-100 transition"
              >
                إغلاق المعاينة
              </button>
              <button
                onClick={() => {
                  setRejectDoctorId(previewDoctor.id);
                  setPreviewDoctor(null);
                }}
                className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-100 transition"
              >
                رفض الطلب
              </button>
              <button
                onClick={() => handleApproveDoctor(previewDoctor)}
                disabled={actionLoading}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>اعتماد ونشر البورتفوليو فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECT NOTES */}
      {rejectDoctorId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">رفض طلب البورتفوليو وإبداء السبب</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              يرجى كتابة الملاحظات المطلوب من الطبيب تعديلها (ستظهر له مباشرة في لوحة تحكمه):
            </p>
            <textarea
              rows={4}
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              placeholder="مثال: يرجى رفع صور حالات أوضح وكتابة اسم الكلية بشكل كامل..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => { setRejectDoctorId(null); setRejectNotes(''); }}
                className="px-4 py-2 bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleRejectDoctor}
                disabled={actionLoading || !rejectNotes.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT DOCTOR & LIMITS */}
      {editDoctorForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-base">تعديل بيانات وحدود الطبيب</h3>
              <button onClick={() => setEditDoctorForm(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">الاسم بالعربي:</label>
                <input
                  type="text"
                  value={editDoctorForm.fullNameAr || ''}
                  onChange={e => setEditDoctorForm({ ...editDoctorForm, fullNameAr: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">الاسم بالإنجليزي:</label>
                <input
                  type="text"
                  value={editDoctorForm.fullName || ''}
                  onChange={e => setEditDoctorForm({ ...editDoctorForm, fullName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">حد حالات الأسنان المخصص:</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={editDoctorForm.caseLimit || 3}
                  onChange={e => setEditDoctorForm({ ...editDoctorForm, caseLimit: Number(e.target.value) || 3 })}
                  className="w-full p-2 bg-cyan-50 border border-cyan-200 text-cyan-900 font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">الجامعة / الكلية:</label>
                <input
                  type="text"
                  value={editDoctorForm.universityAr || ''}
                  onChange={e => setEditDoctorForm({ ...editDoctorForm, universityAr: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">العيادة / المدينة:</label>
                <input
                  type="text"
                  value={editDoctorForm.locationAddressAr || ''}
                  onChange={e => setEditDoctorForm({ ...editDoctorForm, locationAddressAr: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400">رقم الواتساب:</label>
                <input
                  type="text"
                  value={editDoctorForm.whatsapp || ''}
                  onChange={e => setEditDoctorForm({ ...editDoctorForm, whatsapp: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditDoctorForm(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveDoctorEdit}
                disabled={savingDoctorEdit}
                className="px-5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {savingDoctorEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
