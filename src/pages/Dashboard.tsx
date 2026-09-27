import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  onAuthStateChanged, 
  signOut, 
  sendPasswordResetEmail,
  User 
} from 'firebase/auth';
import { 
  User as UserIcon, 
  Briefcase, 
  Clock, 
  Award, 
  Settings, 
  Save, 
  LogOut, 
  Upload, 
  Plus, 
  Trash2, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown, 
  MessageCircle, 
  Key, 
  Eye, 
  Image as ImageIcon,
  Check,
  Loader2,
  Sparkles,
  Zap,
  RefreshCw
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/firestoreUtils';
import Header from '../components/Header';
import HotmartSidebar from '../components/HotmartSidebar';
import BentoGridServices from '../components/BentoGridServices';
import CONFIG from '../config';
import { processImageToBase64 } from '../lib/imageProcessor';
import { uploadBatchResilient } from '../lib/storageHelper';
import ClinicalCaseCard from '../components/ClinicalCaseCard';
import UpgradeModal from '../components/UpgradeModal';
import { 
  fetchUserCases, 
  saveClinicalCaseToSubcollection, 
  deleteClinicalCaseComplete, 
  reorderCasesInSubcollection 
} from '../lib/caseUploadService';
import { cloudflareApi } from '../lib/cloudflareApiClient';
import { ClinicalCase, Milestone, PortfolioData } from '../types';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveProgressText, setSaveProgressText] = useState<string>('');
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [form, setForm] = useState<PortfolioData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'timeline' | 'skills' | 'account'>('overview');
  const [isDirty, setIsDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  
  // Clinical Cases Subcollection State
  const [subcollectionCases, setSubcollectionCases] = useState<ClinicalCase[]>([]);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isCasesActionLoading, setIsCasesActionLoading] = useState(false);

  // Photo processing metrics
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isProcessingCases, setIsProcessingCases] = useState(false);
  const [photoOptimizationNote, setPhotoOptimizationNote] = useState<string | null>(null);

  const profileInputRef = useRef<HTMLInputElement>(null);

  // Exactly ONE Firestore read on initial auth mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLocation('/login?mode=signin');
        return;
      }
      setUser(currentUser);

      try {
        let loadedDocData: any = null;

        try {
          loadedDocData = (await cloudflareApi.getProfile(currentUser.uid)).data;
        } catch (readErr: any) {
          console.warn('Could not read user profile from Cloudflare:', readErr);
          setSaveError('Unable to load your profile. Please check your connection or contact support.');
          throw readErr;
        }

        if (loadedDocData) {
          const safeData: PortfolioData = {
            ...loadedDocData,
            clinicalSkills: loadedDocData.clinicalSkills || [],
            digitalSkills: loadedDocData.digitalSkills || [],
            softSkills: loadedDocData.softSkills || [],
            clinicalSkillsAr: loadedDocData.clinicalSkillsAr || [],
            digitalSkillsAr: loadedDocData.digitalSkillsAr || [],
            softSkillsAr: loadedDocData.softSkillsAr || [],
            timeline: loadedDocData.timeline || [],
            cases: [], // Subcollection is now source of truth
            caseLimit: loadedDocData.caseLimit ?? CONFIG.tierLimits.freeCases,
            status: loadedDocData.status || 'pending_review'
          };
          setPortfolio(safeData);
          setForm(safeData);
        } else {
          setPortfolio(null);
          setForm(null);
        }

        // Fetch independent subcollection clinical cases
        try {
          const cases = await fetchUserCases(currentUser.uid);
          setSubcollectionCases(cases);
          setCasesError(null);
        } catch (casesErr: any) {
          console.error('[Dashboard] Subcollection cases fetch error:', casesErr);
          setCasesError(casesErr?.message || 'تعذر تحميل الحالات السريرية. يرجى التحقق من الاتصال وإعادة المحاولة.');
          setSubcollectionCases([]);
        }

      } catch (err: any) {
        console.error('Failed to load portfolio:', err);
        const errMsg = err?.message || '';
        if (errMsg.includes('permission')) {
          setSaveError('تنبيه الصلاحيات: تأكد من تسجيل الدخول بالحساب الصحيح أو نشر قواعد Firestore Rules المحدثة.');
        } else {
          setSaveError('تعذر تحميل بيانات البورتفوليو، يرجى إعادة المحاولة.');
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setLocation]);

  // Real-time synchronization: poll user profile every 30s and on tab focus
  useEffect(() => {
    if (!user) return;
    const fetchLatestProfile = async () => {
      try {
        const res = await cloudflareApi.getProfile(user.uid);
        if (res?.data) {
          setPortfolio(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              ...res.data,
              status: res.data.status || prev.status,
              hasUnreviewedChanges: res.data.hasUnreviewedChanges ?? prev.hasUnreviewedChanges,
              caseLimit: res.data.caseLimit ?? prev.caseLimit,
            };
          });
        }
      } catch (_) {
        // silent background sync
      }
    };

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !saving && !isDirty) {
        fetchLatestProfile();
      }
    }, 30000);

    const handleFocus = () => {
      if (document.visibilityState === 'visible' && !saving && !isDirty) {
        fetchLatestProfile();
      }
    };
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user, saving, isDirty]);

  const updateFormField = <K extends keyof PortfolioData>(key: K, value: PortfolioData[K]) => {
    if (!form) return;
    setForm(prev => prev ? ({ ...prev, [key]: value }) : null);
    setIsDirty(true);
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPhoto(true);
    setPhotoOptimizationNote(null);

    const startTime = performance.now();
    const originalKb = Math.round(file.size / 1024);

    try {
      const b64 = await processImageToBase64(file, 800, 800, 0.7);
      const compressedKb = Math.round((b64.length * 3) / 4 / 1024);
      const elapsedMs = Math.round(performance.now() - startTime);

      updateFormField('profilePhoto', b64);
      updateFormField('profilePreview', b64);
      
      const reduction = Math.max(0, Math.round(((originalKb - compressedKb) / originalKb) * 100));
      setPhotoOptimizationNote(
        `Optimized: ${originalKb} KB → ${compressedKb} KB (${reduction}% smaller) in ${elapsedMs}ms. Ready to save!`
      );
      setIsDirty(true);
    } catch (err: any) {
      console.error('Profile photo processing failed:', err);
      setSaveError('Failed to process selected image file.');
    } finally {
      setIsProcessingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // Subcollection Case Handlers (Enforcing 3-case limit and zero orphaned uploads)
  const handleAddNewCase = async () => {
    if (!user) return;
    const currentLimit = portfolio?.caseLimit ?? CONFIG.tierLimits.freeCases;
    
    // Strict Limit Enforcement: 4th case triggers upgrade modal
    if (subcollectionCases.length >= currentLimit) {
      setShowUpgradeModal(true);
      return;
    }

    setIsCasesActionLoading(true);
    try {
      const newCaseId = `case_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newCase: ClinicalCase = {
        id: newCaseId,
        uid: user.uid,
        title: '',
        titleAr: '',
        category: 'operative',
        sortOrder: subcollectionCases.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveClinicalCaseToSubcollection(user.uid, newCase, true);
      setSubcollectionCases(prev => [...prev, newCase]);
    } catch (err: any) {
      console.error('Failed to create new case:', err);
      setSaveError('تعذر إضافة حالة الأسنان الجديدة.');
    } finally {
      setIsCasesActionLoading(false);
    }
  };

  const handleUpdateCaseItem = async (updatedCase: ClinicalCase) => {
    if (!user) return;
    setSubcollectionCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
    try {
      await saveClinicalCaseToSubcollection(user.uid, updatedCase, false);
    } catch (err) {
      console.error('Failed to save case changes:', err);
    }
  };

  const handleDeleteCaseItem = async (caseId: string) => {
    if (!user) return;
    const confirmDelete = window.confirm('هل أنت متأكد من رغبتك في حذف هذه حالة الأسنان وجميع صورها؟');
    if (!confirmDelete) return;

    setIsCasesActionLoading(true);
    try {
      await deleteClinicalCaseComplete(user.uid, caseId);
      setSubcollectionCases(prev => prev.filter(c => c.id !== caseId));
    } catch (err: any) {
      console.error('Failed to delete case completely:', err);
      alert('تعذر حذف الحالة. يرجى إعادة المحاولة.');
    } finally {
      setIsCasesActionLoading(false);
    }
  };

  const handleMoveCaseOrder = async (index: number, direction: 'up' | 'down') => {
    if (!user) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subcollectionCases.length) return;

    const reordered = [...subcollectionCases];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setSubcollectionCases(reordered);
    try {
      await reorderCasesInSubcollection(user.uid, reordered);
    } catch (err) {
      console.error('Failed to persist case order:', err);
    }
  };

  const addMilestone = () => {
    if (!form) return;
    updateFormField('timeline', [...form.timeline, { year: '', event: '', eventAr: '' }]);
  };

  const updateMilestone = (index: number, key: keyof Milestone, value: string) => {
    if (!form) return;
    const updated = [...form.timeline];
    updated[index] = { ...updated[index], [key]: value };
    updateFormField('timeline', updated);
  };

  const removeMilestone = (index: number) => {
    if (!form) return;
    updateFormField('timeline', form.timeline.filter((_, i) => i !== index));
  };

  const handleAddSkill = (type: 'clinical' | 'digital' | 'soft', lang: 'en' | 'ar', skill: string) => {
    if (!form || !skill.trim()) return;
    const key = `${type}Skills${lang === 'ar' ? 'Ar' : ''}` as keyof PortfolioData;
    const current = (form[key] as string[]) || [];
    if (!current.includes(skill.trim())) {
      updateFormField(key, [...current, skill.trim()]);
    }
  };

  const handleRemoveSkill = (type: 'clinical' | 'digital' | 'soft', lang: 'en' | 'ar', index: number) => {
    if (!form) return;
    const key = `${type}Skills${lang === 'ar' ? 'Ar' : ''}` as keyof PortfolioData;
    const current = (form[key] as string[]) || [];
    updateFormField(key, current.filter((_, i) => i !== index));
  };

  // Resilient save handler with parallel upload, timeout fallback and database write
  const handleSaveChanges = async () => {
    if (!user || !form) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    setSaveProgressText('Optimizing & preparing photos...');

    const saveStartTime = performance.now();

    try {
      // 1. Prepare batch items for parallel upload with timeout and fallback
      const uploadItems: Array<{ key: string; dataUrl: string; path: string }> = [];

      const profileKey = 'profile';
      if (form.profilePhoto && form.profilePhoto.startsWith('data:image')) {
        uploadItems.push({
          key: profileKey,
          dataUrl: form.profilePhoto,
          path: `profile_${Date.now()}.jpg`
        });
      }

      form.cases.forEach((c, idx) => {
        if (c.photo && c.photo.startsWith('data:image')) {
          uploadItems.push({
            key: `case_${idx}`,
            dataUrl: c.photo,
            path: `cases/${Date.now()}_${idx}.jpg`
          });
        }
      });

      // 2. Perform parallel batch upload with real-time feedback
      const uploadResults = await uploadBatchResilient(
        user.uid,
        uploadItems,
        (progress) => setSaveProgressText(progress.step)
      );

      // 3. Resolve final profile photo URL
      const profileUrl = uploadResults[profileKey] || form.profilePhoto || '';

      // 4. Resolve final case photo URLs with clean values
      const processedCases: ClinicalCase[] = form.cases.map((c, idx) => {
        const finalUrl = uploadResults[`case_${idx}`] || c.photo || '';
        const item: ClinicalCase = {
          id: c.id || `case_${Date.now()}_${idx}`,
          uid: user.uid,
          category: c.category || 'operative',
          categoryAr: c.categoryAr || '',
          customCategory: c.customCategory || '',
          title: c.title || '',
          titleAr: c.titleAr || '',
          description: c.description || '',
          descriptionAr: c.descriptionAr || '',
          photo: finalUrl,
          preview: finalUrl,
          sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : idx,
          createdAt: c.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if (typeof c.originalSizeKb === 'number') {
          item.originalSizeKb = c.originalSizeKb;
        }
        if (typeof c.compressedSizeKb === 'number') {
          item.compressedSizeKb = c.compressedSizeKb;
        }
        return item;
      });

      // 4b. Sanitize timeline items
      const sanitizedTimeline: Milestone[] = (form.timeline || []).map(t => ({
        year: t.year || '',
        event: t.event || '',
        eventAr: t.eventAr || ''
      }));

      setSaveProgressText('Updating portfolio in database...');

      // 5. Prepare full payload ensuring security rules match existing document fields
      const isPublished = portfolio?.status === 'published';
      const rawPayload = {
        fullName: form.fullName || '',
        fullNameAr: form.fullNameAr || '',
        title: form.title || '',
        titleAr: form.titleAr || '',
        graduationYear: form.graduationYear || '',
        university: form.university || '',
        universityAr: form.universityAr || '',
        phone: form.phone || '',
        whatsapp: form.whatsapp || '',
        email: form.email || '',
        instagram: form.instagram || '',
        facebook: form.facebook || '',
        linkedin: form.linkedin || '',
        clinicName: form.clinicName || '',
        clinicNameAr: form.clinicNameAr || '',
        locationAddress: form.locationAddress || '',
        locationAddressAr: form.locationAddressAr || '',
        locationLat: form.locationLat || '',
        locationLng: form.locationLng || '',
        profilePhoto: profileUrl,
        profilePreview: profileUrl,
        clinicalSkills: form.clinicalSkills || [],
        digitalSkills: form.digitalSkills || [],
        softSkills: form.softSkills || [],
        clinicalSkillsAr: form.clinicalSkillsAr || [],
        digitalSkillsAr: form.digitalSkillsAr || [],
        softSkillsAr: form.softSkillsAr || [],
        timeline: sanitizedTimeline,
        cases: [], // Monolithic array permanently decommissioned
        caseCount: subcollectionCases.length,
        caseLimit: portfolio?.caseLimit ?? CONFIG.tierLimits.freeCases,
        status: portfolio?.status || 'pending_review',
        paymentConfirmed: portfolio?.paymentConfirmed ?? false,
        packageTier: portfolio?.packageTier || 'Free',
        active: portfolio?.active ?? true,
        migratedToSubcollection: true,
        hasUnreviewedChanges: isPublished ? true : (portfolio?.hasUnreviewedChanges ?? false),
        updatedAt: new Date().toISOString()
      };

      const updatedPayload = cleanFirestoreData(rawPayload);

      await cloudflareApi.saveProfile(updatedPayload, user.uid);
      await cloudflareApi.savePortfolio(updatedPayload, user.uid);

      // 7. Update local state
      const nextPortfolio: PortfolioData = {
        ...portfolio!,
        ...updatedPayload,
        cases: [],
        caseCount: subcollectionCases.length,
        profilePhoto: profileUrl,
        profilePreview: profileUrl,
      };

      const durationSec = ((performance.now() - saveStartTime) / 1000).toFixed(1);
      setPortfolio(nextPortfolio);
      setForm(nextPortfolio);
      setIsDirty(false);
      setPhotoOptimizationNote(null);
      setSaveMessage(`All profile changes saved successfully in ${durationSec}s!`);
      setTimeout(() => setSaveMessage(null), 4500);
    } catch (err: any) {
      console.error('Failed to save changes:', err);
      setSaveError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
      setSaveProgressText('');
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to send password reset email.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setLocation('/login?mode=signin');
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading your doctor dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!portfolio || !form) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
            <UserIcon className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mb-2">No Portfolio Found</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            You are signed in as <strong className="text-foreground">{user?.email}</strong>, but no active portfolio registration was found for your account.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <Link href="/website">
              <button className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition shadow-sm">
                Create My Portfolio
              </button>
            </Link>
            <button
              onClick={handleSignOut}
              className="px-6 py-3 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-muted transition"
            >
              Sign Out
            </button>
          </div>
        </main>
      </div>
    );
  }

  const caseLimit = portfolio.caseLimit ?? 3;
  const isAtCaseLimit = form.cases.length >= caseLimit;
  const whatsappNum = CONFIG.social.whatsapp.replace(/[^0-9]/g, '');
  const upgradeWaUrl = `https://wa.me/${whatsappNum}?text=${encodeURIComponent(
    `Hi, I am logged in to my portfolio dashboard (Dr. ${form.fullName || user?.email}) and would like to upgrade my package to add more cases.`
  )}`;

  const cleanSlug = (form.fullName || 'doctor')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <Header />

      {/* Top Banner Alerts */}
      {portfolio.status === 'published' && portfolio.hasUnreviewedChanges && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-amber-800 dark:text-amber-300 text-xs sm:text-sm text-center font-medium flex items-center justify-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Your live page won't change until these edits are reviewed and approved by our team.</span>
        </div>
      )}

      {portfolio.status === 'pending_review' && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3 text-blue-800 dark:text-blue-300 text-xs sm:text-sm text-center font-medium flex items-center justify-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          <span>Your portfolio is currently in review. We will notify you as soon as it goes live!</span>
        </div>
      )}

      {portfolio.status === 'rejected' && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 text-destructive text-xs sm:text-sm text-center font-medium flex flex-col items-center justify-center gap-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Updates Requested</span>
          </div>
          {portfolio.adminNotes && (
            <p className="text-xs opacity-90">{portfolio.adminNotes}</p>
          )}
        </div>
      )}

      {/* Hotmart Shell: Sidebar + Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto items-start">
        <HotmartSidebar
          user={user}
          portfolioStatus={portfolio.status}
          casesCount={form.cases.length}
          caseLimit={caseLimit}
          slug={cleanSlug}
          activeSection={activeTab}
          onSelectSection={(sec) => setActiveTab(sec)}
        />

        <main className="flex-1 w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6 overflow-x-hidden">
          {/* If overview, show Bento Grid of the two services at the top */}
          {activeTab === 'overview' && (
            <BentoGridServices
              portfolioStatus={portfolio.status}
              casesCount={form.cases.length}
              caseLimit={caseLimit}
              slug={cleanSlug}
              doctorName={form.fullName || form.fullNameAr}
              onOpenPortfolioEditor={() => setActiveTab('cases')}
            />
          )}
        
        {/* Doctor Identity & Status Header Card */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0 shadow-sm relative">
                {isProcessingPhoto ? (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center text-primary z-10">
                    <Loader2 className="h-6 w-6 animate-spin mb-1" />
                    <span className="text-[10px] font-bold">Optimizing...</span>
                  </div>
                ) : null}

                {form.profilePreview || form.profilePhoto ? (
                  <img
                    src={form.profilePreview || form.profilePhoto!}
                    alt="Profile"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <button
                disabled={isProcessingPhoto || saving}
                onClick={() => profileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition rounded-2xl flex flex-col items-center justify-center text-xs font-semibold gap-1 cursor-pointer disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                <span>Change</span>
              </button>
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoChange}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                  Dr. {form.fullName || 'Doctor'}
                </h1>
                {form.fullNameAr && (
                  <span className="text-sm font-medium text-muted-foreground" dir="rtl">
                    ({form.fullNameAr})
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {form.title || 'Dental Surgeon'}
              </p>

              {/* Optimization Note */}
              {photoOptimizationNote && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium animate-in fade-in">
                  <Zap className="h-3 w-3 shrink-0" />
                  <span>{photoOptimizationNote}</span>
                </div>
              )}

              {/* Status and Tier Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {/* Status Badge */}
                {portfolio.status === 'published' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Published / Live
                  </span>
                )}
                {portfolio.status === 'pending_review' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <Clock className="h-3 w-3" />
                    Pending Review
                  </span>
                )}
                {portfolio.status === 'rejected' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                    <AlertCircle className="h-3 w-3" />
                    Updates Requested
                  </span>
                )}
                {portfolio.status === 'draft' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                    Draft
                  </span>
                )}

                {/* Package Tier Badge */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  Plan: {portfolio.packageTier || 'Free'}
                </span>

                {/* Cases count */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  isAtCaseLimit 
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' 
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {form.cases.length} / {caseLimit} Cases
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
            {isDirty && (
              <button
                onClick={handleSaveChanges}
                disabled={saving || isProcessingPhoto || isProcessingCases}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition shadow-sm disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            )}

            {portfolio.status === 'published' && (
              <a
                href={`https://portfoliohubs.pages.dev/dr${cleanSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary font-semibold text-xs hover:bg-primary/20 transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Live Page
              </a>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-medium transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border gap-2 overflow-x-auto pb-px">
          {[
            { id: 'overview', label: 'Profile & Contact', icon: UserIcon },
            { id: 'cases', label: `Cases (${form.cases.length}/${caseLimit})`, icon: Briefcase },
            { id: 'timeline', label: 'Timeline', icon: Clock },
            { id: 'skills', label: 'Skills', icon: Award },
            { id: 'account', label: 'Account Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  active
                    ? 'border-primary text-primary bg-card border-x border-t border-border -mb-px'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
          
          {/* TAB 1: PROFILE & CONTACT */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground mb-1">Doctor Information</h2>
                <p className="text-xs text-muted-foreground">Manage your personal and professional profile credentials.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Full Name (English)</label>
                  <input
                    type="text"
                    value={form.fullName || ''}
                    onChange={e => updateFormField('fullName', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Full Name (Arabic)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={form.fullNameAr || ''}
                    onChange={e => updateFormField('fullNameAr', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Professional Title (English)</label>
                  <input
                    type="text"
                    value={form.title || ''}
                    onChange={e => updateFormField('title', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Professional Title (Arabic)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={form.titleAr || ''}
                    onChange={e => updateFormField('titleAr', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">University (English)</label>
                  <input
                    type="text"
                    value={form.university || ''}
                    onChange={e => updateFormField('university', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Graduation Year</label>
                  <input
                    type="text"
                    value={form.graduationYear || ''}
                    onChange={e => updateFormField('graduationYear', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="text-md font-bold text-foreground mb-3">Contact & Social Channels</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={form.phone || ''}
                      onChange={e => updateFormField('phone', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">WhatsApp Number</label>
                    <input
                      type="text"
                      value={form.whatsapp || ''}
                      onChange={e => updateFormField('whatsapp', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Clinic Name (English)</label>
                    <input
                      type="text"
                      value={form.clinicName || ''}
                      onChange={e => updateFormField('clinicName', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Clinic Location Address</label>
                    <input
                      type="text"
                      value={form.locationAddress || ''}
                      onChange={e => updateFormField('locationAddress', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Instagram URL / Handle</label>
                    <input
                      type="text"
                      value={form.instagram || ''}
                      onChange={e => updateFormField('instagram', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Facebook URL</label>
                    <input
                      type="text"
                      value={form.facebook || ''}
                      onChange={e => updateFormField('facebook', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Explicit Section Save Button */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {isDirty ? 'You have unsaved changes in your profile.' : 'All profile data is up to date.'}
                </p>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saving || isProcessingPhoto}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition shadow-sm disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CLINICAL CASES (Subcollection Architecture with 3-Case Tier Limit) */}
          {activeTab === 'cases' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-2xl border border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">حالات الأسنان (Clinical Cases)</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-brand/10 text-brand">
                      {subcollectionCases.length} / {portfolio?.caseLimit ?? CONFIG.tierLimits.freeCases}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    كل حالة تُحفظ كوثيقة مستقلة لسرعة فائقة وأمان دائم، مع صور قبل وبعد فائقة الوضوح (&lt; 500KB).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewCase}
                    disabled={isCasesActionLoading}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-brand hover:bg-brand-dark text-white transition shadow-sm disabled:opacity-50"
                  >
                    {isCasesActionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>جارٍ المعالجة...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>إضافة حالة جديدة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Case Limit Reached Banner */}
              {subcollectionCases.length >= (portfolio?.caseLimit ?? CONFIG.tierLimits.freeCases) && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>لقد وصلت للحد الأقصى للحالات المجانية ({subcollectionCases.length} من {portfolio?.caseLimit ?? CONFIG.tierLimits.freeCases} حالات).</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shrink-0 shadow-sm"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>ترقية الباقة عبر واتساب</span>
                  </button>
                </div>
              )}

              {/* Cases Loading Error Banner */}
              {casesError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{casesError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user) return;
                      setIsCasesActionLoading(true);
                      try {
                        const cases = await fetchUserCases(user.uid);
                        setSubcollectionCases(cases);
                        setCasesError(null);
                      } catch (e: any) {
                        setCasesError(e.message || 'فشلت إعادة محاولة تحميل الحالات.');
                      } finally {
                        setIsCasesActionLoading(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isCasesActionLoading ? 'animate-spin' : ''}`} />
                    <span>إعادة المحاولة</span>
                  </button>
                </div>
              )}

              {/* Cases List */}
              {subcollectionCases.length === 0 ? (
                <div className="py-12 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-card-subtle/30">
                  <ImageIcon className="h-12 w-12 text-brand/30 mb-3" />
                  <h3 className="text-sm font-bold text-foreground">لا توجد حالات مهنية مضافة بعد</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    ابدأ بإضافة أول حالة مهنية لتوثيق خبراتك ونتائج ابتسامات مرضاك بالصور وتفاصيل العلاج.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddNewCase}
                    className="mt-4 px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-dark transition shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>إضافة أول حالة الآن</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {subcollectionCases.map((caseItem, idx) => (
                    <ClinicalCaseCard
                      key={caseItem.id}
                      caseItem={caseItem}
                      index={idx}
                      totalCases={subcollectionCases.length}
                      uid={user?.uid}
                      onUpdate={handleUpdateCaseItem}
                      onDelete={handleDeleteCaseItem}
                      onMoveUp={() => handleMoveCaseOrder(idx, 'up')}
                      onMoveDown={() => handleMoveCaseOrder(idx, 'down')}
                      isSaving={isCasesActionLoading}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Milestones & Career Timeline</h2>
                  <p className="text-xs text-muted-foreground">List your career achievements, degrees, or certifications.</p>
                </div>
                <button
                  onClick={addMilestone}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Milestone
                </button>
              </div>

              {form.timeline.length === 0 ? (
                <div className="py-12 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-4">
                  <Clock className="h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No milestones added.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.timeline.map((m, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border bg-background flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="w-full sm:w-28 shrink-0">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Year</label>
                        <input
                          type="text"
                          value={m.year || ''}
                          onChange={e => updateMilestone(idx, 'year', e.target.value)}
                          placeholder="e.g. 2021"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none font-semibold"
                        />
                      </div>

                      <div className="flex-1 w-full">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Event (English)</label>
                        <input
                          type="text"
                          value={m.event || ''}
                          onChange={e => updateMilestone(idx, 'event', e.target.value)}
                          placeholder="e.g. Master's in Oral Surgery"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </div>

                      <div className="flex-1 w-full">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Event (Arabic)</label>
                        <input
                          type="text"
                          dir="rtl"
                          value={m.eventAr || ''}
                          onChange={e => updateMilestone(idx, 'eventAr', e.target.value)}
                          placeholder="مثال: ماجستير جراحة الفم والأسنان"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none text-right"
                        />
                      </div>

                      <button
                        onClick={() => removeMilestone(idx)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition self-end sm:self-center"
                        title="Remove milestone"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Save Timeline Section Button */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {isDirty ? 'You have unsaved timeline modifications.' : 'All career milestones are saved.'}
                </p>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition shadow-sm disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Timeline...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Timeline Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SKILLS */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Skills & Expertise</h2>
                <p className="text-xs text-muted-foreground">Manage your clinical, digital, and interpersonal skill tags.</p>
              </div>

              {[
                { key: 'clinical', title: 'Clinical Skills' },
                { key: 'digital', title: 'Digital Dentistry' },
                { key: 'soft', title: 'Soft Skills' }
              ].map(({ key, title }) => {
                const enSkills = (form[`${key}Skills` as keyof PortfolioData] as string[]) || [];
                return (
                  <div key={key} className="p-4 rounded-xl border border-border bg-background space-y-3">
                    <h3 className="text-sm font-bold text-foreground">{title}</h3>
                    
                    {/* Add skill input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Add ${title.toLowerCase()} tag...`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill(key as any, 'en', (e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    {/* Skill tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {enSkills.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                          {s}
                          <button
                            onClick={() => handleRemoveSkill(key as any, 'en', i)}
                            className="hover:text-destructive transition ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {enSkills.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">No tags added yet.</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Save Skills Section Button */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {isDirty ? 'You have unsaved skill tag modifications.' : 'All skill tags are saved.'}
                </p>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition shadow-sm disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Skills...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Skills Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ACCOUNT SETTINGS */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Account & Security</h2>
                <p className="text-xs text-muted-foreground">Manage your credentials and login information.</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-background space-y-4 max-w-lg">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Authenticated Email</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground text-sm cursor-not-allowed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handlePasswordReset}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground font-semibold text-xs hover:bg-muted transition"
                  >
                    <Key className="h-4 w-4 text-primary" />
                    Send Password Reset Email
                  </button>
                  {resetSent && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                      Password reset link has been dispatched to {user?.email}!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>

      {/* Floating Save Changes Bar */}
      {isDirty && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto">
          <div className="bg-card border-2 border-primary p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="text-xs font-bold text-foreground truncate">
                {saving ? (saveProgressText || 'Saving changes...') : 'Unsaved changes pending'}
              </span>
            </div>
            <button
              onClick={handleSaveChanges}
              disabled={saving || isProcessingPhoto || isProcessingCases}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition shadow-md disabled:opacity-60 shrink-0"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 shrink-0" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {saveMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
          <Check className="h-4 w-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      {saveError && (
        <div className="fixed bottom-6 right-6 z-50 bg-destructive text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
          <AlertCircle className="h-4 w-4" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Hotmart-Styled Tier Upgrade Limit Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        doctorName={form?.fullName || portfolio?.fullName || user?.displayName || ''}
        currentCount={subcollectionCases.length}
        limit={portfolio?.caseLimit ?? CONFIG.tierLimits.freeCases}
      />
    </div>
  );
}
