import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  onAuthStateChanged, 
  signOut, 
  sendPasswordResetEmail,
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
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
  Zap
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { cleanFirestoreData } from '../lib/firestoreUtils';
import Header from '../components/Header';
import CONFIG from '../config';
import { processImageToBase64, processMultipleImages } from '../lib/imageProcessor';
import { uploadBatchResilient } from '../lib/storageHelper';

interface Milestone {
  year: string;
  event: string;
  eventAr?: string;
}

interface ClinicalCase {
  category: string;
  categoryAr?: string;
  customCategory?: string;
  title: string;
  titleAr?: string;
  photo: string;
  preview?: string;
  originalSizeKb?: number;
  compressedSizeKb?: number;
}

interface PortfolioData {
  fullName: string;
  fullNameAr?: string;
  title: string;
  titleAr?: string;
  graduationYear?: string;
  university?: string;
  universityAr?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  clinicName?: string;
  clinicNameAr?: string;
  locationAddress?: string;
  locationAddressAr?: string;
  locationLat?: string;
  locationLng?: string;
  profilePhoto?: string | null;
  profilePreview?: string | null;
  clinicalSkills: string[];
  digitalSkills: string[];
  softSkills: string[];
  clinicalSkillsAr?: string[];
  digitalSkillsAr?: string[];
  softSkillsAr?: string[];
  timeline: Milestone[];
  cases: ClinicalCase[];
  status: 'draft' | 'pending_review' | 'published' | 'rejected';
  packageTier?: string;
  caseLimit?: number;
  active?: boolean;
  hasUnreviewedChanges?: boolean;
  paymentConfirmed?: boolean;
  adminNotes?: string;
}

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
  const [expandedCases, setExpandedCases] = useState(false);

  // Photo processing metrics
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoOptimizationNote, setPhotoOptimizationNote] = useState<string | null>(null);
  const [isProcessingCases, setIsProcessingCases] = useState(false);
  const [casesOptimizationNote, setCasesOptimizationNote] = useState<string | null>(null);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const casePhotosInputRef = useRef<HTMLInputElement>(null);

  // Exactly ONE Firestore read on initial auth mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLocation('/login?mode=signin');
        return;
      }
      setUser(currentUser);

      try {
        const docRef = doc(db, 'portfolios', currentUser.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as PortfolioData;
          // Ensure arrays exist
          const safeData: PortfolioData = {
            ...data,
            clinicalSkills: data.clinicalSkills || [],
            digitalSkills: data.digitalSkills || [],
            softSkills: data.softSkills || [],
            clinicalSkillsAr: data.clinicalSkillsAr || [],
            digitalSkillsAr: data.digitalSkillsAr || [],
            softSkillsAr: data.softSkillsAr || [],
            timeline: data.timeline || [],
            cases: data.cases || [],
            caseLimit: data.caseLimit ?? 3,
            status: data.status || 'pending_review'
          };
          setPortfolio(safeData);
          setForm(safeData);
        } else {
          setPortfolio(null);
          setForm(null);
        }
      } catch (err: any) {
        console.error('Failed to load portfolio:', err);
        setSaveError('Failed to load portfolio. Please refresh.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setLocation]);

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

  const handleAddCasePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!form) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const limit = portfolio?.caseLimit ?? 3;
    const remainingSlots = limit - form.cases.length;
    if (remainingSlots <= 0) return;

    setIsProcessingCases(true);
    setCasesOptimizationNote(null);
    const startTime = performance.now();

    try {
      const imgs = await processMultipleImages(files, 800, 800, 0.7);
      const elapsedMs = Math.round(performance.now() - startTime);
      
      const addedCases: ClinicalCase[] = imgs.slice(0, remainingSlots).map(img => ({
        category: 'implants',
        title: '',
        photo: img.base64,
        preview: img.preview,
        originalSizeKb: img.originalSizeKb,
        compressedSizeKb: img.compressedSizeKb
      }));

      updateFormField('cases', [...form.cases, ...addedCases]);
      setCasesOptimizationNote(`Processed ${addedCases.length} case photo(s) in ${elapsedMs}ms. Ready to save!`);
      setIsDirty(true);
    } catch (err: any) {
      console.error('Case photo processing failed:', err);
      setSaveError('Failed to process case photos.');
    } finally {
      setIsProcessingCases(false);
      if (e.target) e.target.value = '';
    }
  };

  const updateCase = (index: number, key: keyof ClinicalCase, value: string) => {
    if (!form) return;
    const updated = [...form.cases];
    updated[index] = { ...updated[index], [key]: value };
    updateFormField('cases', updated);
  };

  const removeCase = (index: number) => {
    if (!form) return;
    updateFormField('cases', form.cases.filter((_, i) => i !== index));
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
          category: c.category || 'General',
          categoryAr: c.categoryAr || '',
          customCategory: c.customCategory || '',
          title: c.title || '',
          titleAr: c.titleAr || '',
          photo: finalUrl,
          preview: finalUrl
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
        cases: processedCases,
        status: portfolio?.status || 'pending_review',
        paymentConfirmed: portfolio?.paymentConfirmed ?? false,
        packageTier: portfolio?.packageTier || 'Free',
        caseLimit: portfolio?.caseLimit ?? 3,
        active: portfolio?.active ?? true,
        // If already published, mark hasUnreviewedChanges
        hasUnreviewedChanges: isPublished ? true : (portfolio?.hasUnreviewedChanges ?? false)
      };

      const updatedPayload = cleanFirestoreData(rawPayload);

      // 6. Single atomic write to Firestore
      const docRef = doc(db, 'portfolios', user.uid);
      await updateDoc(docRef, updatedPayload as any);

      // 7. Update local state
      const nextPortfolio: PortfolioData = {
        ...portfolio!,
        ...updatedPayload,
        cases: processedCases,
        profilePhoto: profileUrl,
        profilePreview: profileUrl,
      };

      const durationSec = ((performance.now() - saveStartTime) / 1000).toFixed(1);
      setPortfolio(nextPortfolio);
      setForm(nextPortfolio);
      setIsDirty(false);
      setPhotoOptimizationNote(null);
      setCasesOptimizationNote(null);
      setSaveMessage(`All changes and photos saved successfully in ${durationSec}s!`);
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
            <Link href="/portfolio">
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

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        
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
                href={`https://portfoliohubs.github.io/${cleanSlug}/`}
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

          {/* TAB 2: CLINICAL CASES (Quota & Performance Conscious) */}
          {activeTab === 'cases' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Clinical Cases</h2>
                  <p className="text-xs text-muted-foreground">
                    You have added <strong className="text-foreground">{form.cases.length}</strong> of <strong className="text-foreground">{caseLimit}</strong> allowed cases for your tier.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedCases(!expandedCases)}
                    className="px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition flex items-center gap-1.5"
                  >
                    {expandedCases ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {expandedCases ? 'Collapse Details' : 'Manage All Details'}
                  </button>

                  <input
                    ref={casePhotosInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isAtCaseLimit}
                    onChange={handleAddCasePhotos}
                    className="hidden"
                  />
                  
                  <button
                    disabled={isAtCaseLimit || isProcessingCases}
                    onClick={() => casePhotosInputRef.current?.click()}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition shadow-sm ${
                      isAtCaseLimit || isProcessingCases
                        ? 'bg-muted text-muted-foreground border border-border cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {isProcessingCases ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Optimizing...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Add Case</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Optimization Note */}
              {casesOptimizationNote && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <Zap className="h-4 w-4 shrink-0" />
                  <span>{casesOptimizationNote}</span>
                </div>
              )}

              {/* Case Limit Warning Banner */}
              {isAtCaseLimit && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>You have reached your plan's maximum capacity of {caseLimit} cases.</span>
                  </div>
                  <a
                    href={upgradeWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white font-semibold text-xs hover:bg-green-700 transition shrink-0"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Upgrade on WhatsApp
                  </a>
                </div>
              )}

              {/* Cases List */}
              {form.cases.length === 0 ? (
                <div className="py-12 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-4">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No clinical cases added yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload photos to showcase your clinical work.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {form.cases.map((c, idx) => (
                    <div key={idx} className="border border-border rounded-xl bg-card overflow-hidden transition shadow-sm">
                      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Lazy-loaded case thumbnail */}
                          <div className="w-16 h-16 rounded-lg bg-muted border border-border overflow-hidden shrink-0">
                            {c.preview || c.photo ? (
                              <img
                                src={c.preview || c.photo}
                                alt={c.title || `Case ${idx + 1}`}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-primary">Case {idx + 1}</span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase">
                                {c.category || 'General'}
                              </span>
                            </div>
                            <h4 className="font-semibold text-sm text-foreground truncate mt-0.5">
                              {c.title || 'Untitled Case'}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            onClick={() => removeCase(idx)}
                            className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition"
                            title="Remove Case"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Case Editor Fields */}
                      {expandedCases && (
                        <div className="p-4 bg-muted/30 border-t border-border space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground block mb-1">Title (English)</label>
                              <input
                                type="text"
                                value={c.title || ''}
                                onChange={e => updateCase(idx, 'title', e.target.value)}
                                placeholder="e.g. Anterior Ceramic Veneers"
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground block mb-1">Title (Arabic)</label>
                              <input
                                type="text"
                                dir="rtl"
                                value={c.titleAr || ''}
                                onChange={e => updateCase(idx, 'titleAr', e.target.value)}
                                placeholder="مثال: فينير الأسنان الأمامية"
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none text-right"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
                            <select
                              value={c.category || 'implants'}
                              onChange={e => updateCase(idx, 'category', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                            >
                              {CONFIG.caseCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.en} ({cat.ar})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Save Cases Section Button */}
                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {isDirty ? 'You have unsaved case modifications.' : 'All clinical cases are saved.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={saving || isProcessingCases}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition shadow-sm disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving Cases...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          <span>Save Cases Changes</span>
                        </>
                      )}
                    </button>
                  </div>
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
    </div>
  );
}
