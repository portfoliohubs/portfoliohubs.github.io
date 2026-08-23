import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query 
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { 
  ShieldCheck, 
  Users, 
  Package, 
  FileCode, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  LogOut, 
  Eye, 
  Plus, 
  Save, 
  Send, 
  RefreshCw, 
  Key, 
  Sliders, 
  DollarSign, 
  Check, 
  MessageSquare,
  Search,
  ChevronRight,
  X,
  Loader2,
  Rocket,
  Zap,
  HelpCircle,
  Edit3,
  Edit,
  Globe,
  Link,
  FileText,
  Trash2,
  Upload,
  Layers,
  GraduationCap,
  Building2,
  Phone,
  Mail,
  User as UserIcon,
  Image as ImageIcon,
  Sparkles,
  Clock,
  Briefcase,
  Tag,
  ToggleLeft,
  ToggleRight,
  Settings,
  Calendar,
  MapPin,
  MessageCircle,
  Copy
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import Header from '../components/Header';
import CONFIG from '../config';
import { parseHugoToml } from '../lib/tomlParser';
import { cleanFirestoreData } from '../lib/firestoreUtils';
import { processImageToBase64 } from '../lib/imageProcessor';

interface PortfolioRecord {
  id: string;
  slug?: string;
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
  status: 'draft' | 'pending_review' | 'published' | 'rejected';
  active?: boolean;
  paymentConfirmed?: boolean;
  hasUnreviewedChanges?: boolean;
  adminNotes?: string;
  profilePhoto?: string;
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
  importedAt?: string;
  publishedAt?: string;
}

interface PackageItem {
  id: string;
  tier: string;
  label: string;
  labelAr?: string;
  price: number; // in EGP (Egyptian Pounds)
  caseLimit: number;
  description?: string;
  descriptionAr?: string;
  active?: boolean; // whether visible in signup pathway
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queue' | 'packages' | 'import' | 'settings'>('queue');

  // Review Queue state
  const [doctors, setDoctors] = useState<PortfolioRecord[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all' | 'published' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<PortfolioRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // Package Management state
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [editingPackage, setEditingPackage] = useState<Partial<PackageItem> | null>(null);
  const [savingPackage, setSavingPackage] = useState(false);

  // Client Import state
  const [importEmail, setImportEmail] = useState('');
  const [importToml, setImportToml] = useState('');
  const [importTier, setImportTier] = useState('Tier4');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // Settings & GitHub PAT & Repo
  const [ghPat, setGhPat] = useState(() => localStorage.getItem('portfoliohubs_github_pat') || '');
  const [ghRepo, setGhRepo] = useState(() => localStorage.getItem('portfoliohubs_github_repo') || 'portfoliohubs/portfoliohubs.github.io');
  const [isDispatchingGh, setIsDispatchingGh] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    timestamp: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Inspector & Full Portfolio Edit Modal State
  const [adminEditForm, setAdminEditForm] = useState<PortfolioRecord | null>(null);
  const [adminModalMode, setAdminModalMode] = useState<'edit' | 'preview'>('edit');
  const [adminModalTab, setAdminModalTab] = useState<'basic' | 'contact' | 'education' | 'skills' | 'cases' | 'account'>('basic');
  const [adminSavingDoctor, setAdminSavingDoctor] = useState(false);
  const [adminSaveSuccess, setAdminSaveSuccess] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newSkillType, setNewSkillType] = useState<'clinical' | 'digital' | 'soft'>('clinical');
  const [copiedSlug, setCopiedSlug] = useState(false);

  const sanitizeSlug = (raw: string) => {
    return (raw || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleOpenInspect = (docData: PortfolioRecord) => {
    const derivedSlug = docData.slug || sanitizeSlug(docData.fullName || docData.id);
    setSelectedDoctor(docData);
    setAdminEditForm({
      ...docData,
      slug: derivedSlug,
      cases: docData.cases ? JSON.parse(JSON.stringify(docData.cases)) : [],
      timeline: docData.timeline ? JSON.parse(JSON.stringify(docData.timeline)) : [],
      clinicalSkills: docData.clinicalSkills ? [...docData.clinicalSkills] : [],
      clinicalSkillsAr: docData.clinicalSkillsAr ? [...docData.clinicalSkillsAr] : [],
      digitalSkills: docData.digitalSkills ? [...docData.digitalSkills] : [],
      softSkills: docData.softSkills ? [...docData.softSkills] : [],
    });
    setAdminModalMode('edit');
    setAdminModalTab('basic');
    setAdminSaveSuccess(false);
  };

  const handleUpdateAdminFormField = (key: keyof PortfolioRecord, value: any) => {
    if (!adminEditForm) return;
    setAdminEditForm(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const handleAdminProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminEditForm) return;
    try {
      const base64 = await processImageToBase64(file, 800, 800, 0.75);
      setAdminEditForm(prev => prev ? ({ ...prev, profilePhoto: base64, profilePreview: base64 }) : null);
    } catch (err: any) {
      alert('Failed to process profile photo: ' + err.message);
    }
  };

  const handleAdminCasePhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminEditForm) return;
    try {
      const base64 = await processImageToBase64(file, 800, 800, 0.75);
      const updatedCases = [...(adminEditForm.cases || [])];
      if (updatedCases[index]) {
        updatedCases[index] = { ...updatedCases[index], photo: base64, preview: base64 };
        setAdminEditForm(prev => prev ? ({ ...prev, cases: updatedCases }) : null);
      }
    } catch (err: any) {
      alert('Failed to process case photo: ' + err.message);
    }
  };

  const handleAddCase = () => {
    if (!adminEditForm) return;
    const newCase = {
      id: 'case_' + Date.now(),
      title: 'New Clinical Case',
      titleAr: '',
      category: 'Restorative',
      photo: '',
      preview: '',
    };
    setAdminEditForm(prev => prev ? ({ ...prev, cases: [...(prev.cases || []), newCase] }) : null);
  };

  const handleRemoveCase = (index: number) => {
    if (!adminEditForm) return;
    const updatedCases = (adminEditForm.cases || []).filter((_, i) => i !== index);
    setAdminEditForm(prev => prev ? ({ ...prev, cases: updatedCases }) : null);
  };

  const handleAddTimeline = () => {
    if (!adminEditForm) return;
    const newItem = {
      year: new Date().getFullYear().toString(),
      event: 'New Milestone / Education',
      eventAr: ''
    };
    setAdminEditForm(prev => prev ? ({ ...prev, timeline: [...(prev.timeline || []), newItem] }) : null);
  };

  const handleRemoveTimeline = (index: number) => {
    if (!adminEditForm) return;
    const updated = (adminEditForm.timeline || []).filter((_, i) => i !== index);
    setAdminEditForm(prev => prev ? ({ ...prev, timeline: updated }) : null);
  };

  const handleAddSkill = (type: 'clinical' | 'digital' | 'soft') => {
    if (!adminEditForm || !newSkillInput.trim()) return;
    const key = type === 'clinical' ? 'clinicalSkills' : type === 'digital' ? 'digitalSkills' : 'softSkills';
    const current = adminEditForm[key] || [];
    if (!current.includes(newSkillInput.trim())) {
      setAdminEditForm(prev => prev ? ({ ...prev, [key]: [...current, newSkillInput.trim()] }) : null);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (type: 'clinical' | 'digital' | 'soft', item: string) => {
    if (!adminEditForm) return;
    const key = type === 'clinical' ? 'clinicalSkills' : type === 'digital' ? 'digitalSkills' : 'softSkills';
    const current = adminEditForm[key] || [];
    setAdminEditForm(prev => prev ? ({ ...prev, [key]: current.filter(s => s !== item) }) : null);
  };

  const handleAdminSaveDoctor = async (publishAlso = false) => {
    if (!adminEditForm || !selectedDoctor) return;
    setAdminSavingDoctor(true);
    try {
      const cleanSlug = sanitizeSlug(adminEditForm.slug || adminEditForm.fullName || selectedDoctor.id);
      const updatedPayload: PortfolioRecord = {
        ...adminEditForm,
        slug: cleanSlug,
        hasUnreviewedChanges: false,
      };

      if (publishAlso) {
        updatedPayload.status = 'published';
        updatedPayload.active = true;
        updatedPayload.publishedAt = new Date().toISOString();
      }

      const safePayload = cleanFirestoreData(updatedPayload);

      // 1. Update in portfolios collection
      await updateDoc(doc(db, 'portfolios', selectedDoctor.id), safePayload as any);

      // 2. If already published or publishing now, update published_portfolios as well
      if (updatedPayload.status === 'published' || selectedDoctor.status === 'published') {
        await setDoc(doc(db, 'published_portfolios', selectedDoctor.id), safePayload, { merge: true });
      }

      // 3. Update local state
      setDoctors(prev => prev.map(d => d.id === selectedDoctor.id ? { ...d, ...updatedPayload } : d));
      setSelectedDoctor({ ...selectedDoctor, ...updatedPayload });
      setAdminEditForm({ ...adminEditForm, ...updatedPayload });
      setAdminSaveSuccess(true);
      setTimeout(() => setAdminSaveSuccess(false), 4000);

      const msg = publishAlso
        ? `Dr. ${updatedPayload.fullName} updated and published live!`
        : `Dr. ${updatedPayload.fullName}'s portfolio and slug successfully saved by Admin!`;
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(null), 4000);

      if (publishAlso) {
        await triggerGitHubDispatch();
      }
    } catch (err: any) {
      console.error('Error saving doctor portfolio by admin:', err);
      alert(err.message || 'Failed to save doctor changes');
    } finally {
      setAdminSavingDoctor(false);
    }
  };

  // Verify Admin Status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.email) {
        setLocation('/login?mode=signin');
        return;
      }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.email));
        if (adminDoc.exists()) {
          setAdminUser(user);
          setIsAdmin(true);
          fetchDoctors();
          fetchPackages();
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Failed to verify admin status:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setLocation]);

  const fetchDoctors = async () => {
    try {
      const snap = await getDocs(collection(db, 'portfolios'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PortfolioRecord));
      setDoctors(list);
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    }
  };

  const fetchPackages = async () => {
    try {
      const snap = await getDocs(collection(db, 'packages'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PackageItem));
      setPackages(list.sort((a, b) => (a.price || 0) - (b.price || 0)));
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    }
  };

  const triggerGitHubDispatch = async (targetRepo?: string, targetPat?: string) => {
    const pat = targetPat || localStorage.getItem('portfoliohubs_github_pat') || ghPat;
    const rawRepo = targetRepo || localStorage.getItem('portfoliohubs_github_repo') || ghRepo || 'portfoliohubs/portfoliohubs.github.io';
    const cleanRepo = rawRepo.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');

    if (!pat || !pat.trim()) {
      const msg = 'GitHub Personal Access Token (PAT) is missing. Go to the "GitHub PAT & CI Settings" tab to configure your token.';
      setDispatchStatus({
        type: 'error',
        message: msg,
        timestamp: new Date().toLocaleTimeString()
      });
      return { success: false, message: msg };
    }

    setIsDispatchingGh(true);
    setDispatchStatus({
      type: 'info',
      message: `Triggering GitHub Actions workflow on ${cleanRepo}...`,
      timestamp: new Date().toLocaleTimeString()
    });

    try {
      const res = await fetch(`https://api.github.com/repos/${cleanRepo}/actions/workflows/deploy.yml/dispatches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pat.trim()}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ref: 'main' })
      });

      if (res.status === 204 || res.ok) {
        const successMsg = `GitHub Actions deployment triggered successfully on repo '${cleanRepo}'! The build workflow is now running.`;
        setDispatchStatus({
          type: 'success',
          message: successMsg,
          timestamp: new Date().toLocaleTimeString()
        });
        setStatusMessage(successMsg);
        setTimeout(() => setStatusMessage(null), 6000);
        return { success: true, message: successMsg };
      } else {
        let errBody = '';
        try {
          const json = await res.json();
          errBody = json.message || JSON.stringify(json);
        } catch {
          errBody = await res.text();
        }

        let hint = '';
        if (res.status === 401) {
          hint = 'Authentication Failed (401 Bad credentials). Check that your GitHub PAT is valid and has not expired.';
        } else if (res.status === 403) {
          hint = 'Permission Denied (403). Ensure your GitHub PAT has the "workflow" and "repo" permissions enabled.';
        } else if (res.status === 404) {
          hint = `Not Found (404). Verify that repository "${cleanRepo}" exists, is accessible with this PAT, and has .github/workflows/deploy.yml on the "main" branch.`;
        } else {
          hint = `GitHub API Error (${res.status}): ${errBody}`;
        }

        setDispatchStatus({
          type: 'error',
          message: hint,
          timestamp: new Date().toLocaleTimeString()
        });
        return { success: false, message: hint };
      }
    } catch (e: any) {
      const failMsg = `Network or browser error triggering GitHub API: ${e.message}`;
      setDispatchStatus({
        type: 'error',
        message: failMsg,
        timestamp: new Date().toLocaleTimeString()
      });
      return { success: false, message: failMsg };
    } finally {
      setIsDispatchingGh(false);
    }
  };

  const handleApprove = async (docId: string) => {
    const docData = doctors.find(d => d.id === docId);
    if (!docData) return;
    setActionLoading(true);
    try {
      const publishedPayload = {
        ...docData,
        status: 'published',
        active: true,
        hasUnreviewedChanges: false,
        publishedAt: new Date().toISOString()
      };

      // 1. Copy to published_portfolios
      await setDoc(doc(db, 'published_portfolios', docId), publishedPayload);

      // 2. Update portfolios draft status
      await updateDoc(doc(db, 'portfolios', docId), {
        status: 'published',
        hasUnreviewedChanges: false,
        publishedAt: new Date().toISOString()
      });

      // 3. Trigger GitHub build if configured
      await triggerGitHubDispatch();

      setStatusMessage(`Successfully approved & published Dr. ${docData.fullName}`);
      setTimeout(() => setStatusMessage(null), 4000);
      fetchDoctors();
      if (selectedDoctor?.id === docId) setSelectedDoctor(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to approve portfolio');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (docId: string) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'portfolios', docId), {
        status: 'rejected',
        adminNotes: rejectNotes
      });
      setShowRejectModal(null);
      setRejectNotes('');
      setStatusMessage('Portfolio marked as rejected with notes.');
      setTimeout(() => setStatusMessage(null), 4000);
      fetchDoctors();
      if (selectedDoctor?.id === docId) setSelectedDoctor(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to reject portfolio');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (docId: string, current: boolean) => {
    try {
      const nextState = !current;
      await updateDoc(doc(db, 'portfolios', docId), { active: nextState });
      // If doc exists in published_portfolios, update active state too
      try {
        await updateDoc(doc(db, 'published_portfolios', docId), { active: nextState });
      } catch (e) {}

      const stateLabel = nextState ? 'LIVE (Online & Accessible)' : 'OFFLINE (Returns 404 Not Found)';
      setStatusMessage(`Portfolio status updated to: ${stateLabel}. (Run deployment if you want changes reflected on GitHub Pages)`);
      setTimeout(() => setStatusMessage(null), 5000);
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Failed to update active state');
    }
  };

  const handleTogglePayment = async (docId: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'portfolios', docId), { paymentConfirmed: !current });
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status');
    }
  };

  const handleUpdateTierAndLimit = async (docId: string, tier: string, limit: number) => {
    try {
      await updateDoc(doc(db, 'portfolios', docId), {
        packageTier: tier,
        caseLimit: limit
      });
      setStatusMessage('Doctor tier and case limit updated');
      setTimeout(() => setStatusMessage(null), 3000);
      fetchDoctors();
    } catch (err: any) {
      alert(err.message || 'Failed to update package');
    }
  };

  const handleSavePackage = async () => {
    if (!editingPackage || !editingPackage.id) return;
    setSavingPackage(true);
    try {
      const packageId = editingPackage.id.trim();
      await setDoc(doc(db, 'packages', packageId), {
        tier: editingPackage.tier || packageId,
        label: editingPackage.label || packageId,
        labelAr: editingPackage.labelAr || '',
        price: Number(editingPackage.price) || 0,
        caseLimit: Number(editingPackage.caseLimit) || 3,
        description: editingPackage.description || '',
        descriptionAr: editingPackage.descriptionAr || '',
        active: editingPackage.active !== false
      });
      setEditingPackage(null);
      fetchPackages();
      setStatusMessage(`Package "${packageId}" successfully saved (${Number(editingPackage.price) || 0} EGP).`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to save package');
    } finally {
      setSavingPackage(false);
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm(`Are you sure you want to delete package tier "${packageId}"? This will remove it from Firestore and the user signup pathway.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'packages', packageId));
      fetchPackages();
      setStatusMessage(`Package "${packageId}" has been deleted.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete package');
    }
  };

  const handleTogglePackageActive = async (pkg: PackageItem) => {
    try {
      const nextActive = pkg.active === false ? true : false;
      await updateDoc(doc(db, 'packages', pkg.id), { active: nextActive });
      fetchPackages();
      setStatusMessage(`Package "${pkg.label || pkg.id}" is now ${nextActive ? 'visible' : 'hidden'} in the user signup pathway.`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle package visibility');
    }
  };

  const handleImportClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importEmail.trim() || !importToml.trim()) {
      alert('Please provide both doctor email and config.toml content');
      return;
    }
    setImportLoading(true);
    setImportResult(null);

    try {
      // 1. Parse TOML
      const parsed = parseHugoToml(importToml);
      if (!parsed.fullName) {
        throw new Error('Failed to parse doctor full name from config.toml');
      }

      // 2. Create user account with secondary Firebase Auth instance
      const env = (typeof import.meta !== 'undefined' && import.meta && import.meta.env) ? import.meta.env : ({} as any);
      const firebaseConfig = {
        apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyPortfolioHubsDefaultFallbackApiKey',
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'portfoliohubs-8d806.firebaseapp.com',
        projectId: env.VITE_FIREBASE_PROJECT_ID || 'portfoliohubs-8d806',
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'portfoliohubs-8d806.firebasestorage.app',
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '825482910482',
        appId: env.VITE_FIREBASE_APP_ID || '1:825482910482:web:9b32a10e428cfa10'
      };

      const secondaryApp = getApps().find(a => a.name === 'SecondaryAuth') 
        || initializeApp(firebaseConfig, 'SecondaryAuth');
      const secondaryAuth = getAuth(secondaryApp);

      const throwawayPassword = `PH_${Math.random().toString(36).slice(2)}!${Date.now()}`;
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, importEmail.trim(), throwawayPassword);
      const newUid = userCred.user.uid;

      // 3. Dispatch password reset email
      await sendPasswordResetEmail(secondaryAuth, importEmail.trim());

      // 4. Save to portfolios and published_portfolios
      const docPayload = cleanFirestoreData({
        ...parsed,
        email: importEmail.trim(),
        packageTier: importTier,
        caseLimit: parsed.cases.length > 3 ? parsed.cases.length : 150,
        status: 'published',
        paymentConfirmed: true,
        active: true,
        hasUnreviewedChanges: false,
        importedAt: new Date().toISOString()
      });

      await setDoc(doc(db, 'portfolios', newUid), docPayload);
      await setDoc(doc(db, 'published_portfolios', newUid), docPayload);

      setImportResult({
        success: true,
        message: `Successfully imported Dr. ${parsed.fullName} (UID: ${newUid}). Account created and password reset link sent to ${importEmail.trim()}.`
      });
      setImportEmail('');
      setImportToml('');
      fetchDoctors();
    } catch (err: any) {
      console.error(err);
      setImportResult({
        success: false,
        message: err.message || 'Import failed. Check console for details.'
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleSaveGhSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('portfoliohubs_github_pat', ghPat.trim());
    localStorage.setItem('portfoliohubs_github_repo', ghRepo.trim());
    setStatusMessage('GitHub Actions settings (PAT & Repo) saved locally in this browser');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Verifying admin credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your account ({auth.currentUser?.email}) is not authorized to access the PortfolioHubs admin console.
          </p>
          <button
            onClick={() => signOut(auth).then(() => setLocation('/login?mode=signin'))}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Sign In with Admin Account
          </button>
        </div>
      </div>
    );
  }

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = 
      (doc.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.phone || '').includes(searchQuery);

    if (!matchesSearch) return false;
    if (filter === 'pending') return doc.status === 'pending_review' || doc.hasUnreviewedChanges;
    if (filter === 'published') return doc.status === 'published';
    if (filter === 'rejected') return doc.status === 'rejected';
    return true;
  });

  const pendingCount = doctors.filter(d => d.status === 'pending_review' || d.hasUnreviewedChanges).length;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <Header />

      {/* Admin Subheader Bar */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-foreground">Admin Control Center</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                  Authorized
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{adminUser?.email}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={isDispatchingGh}
              onClick={() => triggerGitHubDispatch()}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
              title="Trigger Hugo build & deployment workflow on GitHub Actions"
            >
              {isDispatchingGh ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Dispatching Build...</span>
                </>
              ) : (
                <>
                  <Rocket className="h-3.5 w-3.5" />
                  <span>Deploy to GitHub Pages</span>
                </>
              )}
            </button>

            <a
              href={`https://github.com/${ghRepo.trim() || 'portfoliohubs/portfoliohubs.github.io'}/actions`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition"
              title="Open GitHub Actions in a new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>GitHub Actions</span>
            </a>

            <button
              onClick={() => { fetchDoctors(); fetchPackages(); }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1 hover:bg-muted transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => signOut(auth).then(() => setLocation('/login?mode=signin'))}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1 hover:bg-muted transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-6xl w-full mx-auto px-4 mt-6">
        <div className="flex border-b border-border gap-2 overflow-x-auto">
          {[
            { id: 'queue', label: `Review Queue (${pendingCount})`, icon: Users },
            { id: 'packages', label: 'Packages & Pricing', icon: Package },
            { id: 'import', label: 'Import Client (TOML)', icon: FileCode },
            { id: 'settings', label: 'GitHub & Deploy Settings', icon: Key },
          ].map(tab => {
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
      </div>

      {/* Main Tab Views */}
      <main className="max-w-6xl w-full mx-auto px-4 py-6">

        {/* Live GitHub Dispatch Banner */}
        {dispatchStatus && (
          <div className={`mb-6 p-4 rounded-xl border flex items-start justify-between gap-3 text-xs leading-relaxed animate-in fade-in ${
            dispatchStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
              : dispatchStatus.type === 'error'
              ? 'bg-destructive/10 border-destructive/20 text-destructive'
              : 'bg-primary/10 border-primary/20 text-primary'
          }`}>
            <div className="flex items-start gap-2.5">
              {dispatchStatus.type === 'success' && <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              {dispatchStatus.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              {dispatchStatus.type === 'info' && <Loader2 className="h-4 w-4 shrink-0 mt-0.5 animate-spin" />}
              <div>
                <p className="font-bold">{dispatchStatus.message}</p>
                <p className="text-[11px] opacity-80 mt-0.5">Status checked at {dispatchStatus.timestamp}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://github.com/${ghRepo.trim() || 'portfoliohubs/portfoliohubs.github.io'}/actions`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-background border border-current text-current font-bold text-[11px] hover:opacity-80 transition inline-flex items-center gap-1"
              >
                <span>View on GitHub</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={() => setDispatchStatus(null)}
                className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Status Notification Toast */}
        {statusMessage && (
          <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* ── TAB 1: REVIEW QUEUE & DOCTORS LIST ──────────────────────────────── */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            
            {/* Filter Bar & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  { id: 'pending', label: `Pending & Edits (${pendingCount})` },
                  { id: 'all', label: `All Doctors (${doctors.length})` },
                  { id: 'published', label: 'Published' },
                  { id: 'rejected', label: 'Rejected' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      filter === f.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search doctor or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-card text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Doctors Grid/List */}
            {filteredDoctors.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-border rounded-2xl p-6">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No doctor portfolios match this filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDoctors.map(doc => {
                  const isPending = doc.status === 'pending_review' || doc.hasUnreviewedChanges;
                  return (
                    <div
                      key={doc.id}
                      className={`border rounded-2xl bg-card p-5 transition shadow-sm ${
                        isPending ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                            {doc.profilePhoto ? (
                              <img src={doc.profilePhoto} alt={doc.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-muted-foreground text-sm">DR</span>
                            )}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-base text-foreground">
                                Dr. {doc.fullName || 'Doctor'}
                              </h3>
                              {doc.fullNameAr && (
                                <span className="text-xs text-muted-foreground" dir="rtl">
                                  ({doc.fullNameAr})
                                </span>
                              )}

                              {/* Badges */}
                              {doc.status === 'published' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                                  Live
                                </span>
                              )}
                              {doc.status === 'pending_review' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  New Registration
                                </span>
                              )}
                              {doc.hasUnreviewedChanges && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                                  Edits Pending Review
                                </span>
                              )}
                              {doc.status === 'rejected' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                                  Rejected
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                              <span>UID: {doc.id}</span>
                              {doc.email && <span>Email: {doc.email}</span>}
                              {doc.phone && <span>Phone: {doc.phone}</span>}
                              {doc.whatsapp && (
                                <a
                                  href={`https://wa.me/${doc.whatsapp.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1"
                                >
                                  WhatsApp
                                </a>
                              )}
                            </div>

                            {/* Package and limits */}
                            <div className="flex flex-wrap items-center gap-3 mt-3">
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground">Tier:</span>
                                <select
                                  value={doc.packageTier || 'Free'}
                                  onChange={e => handleUpdateTierAndLimit(doc.id, e.target.value, doc.caseLimit ?? 3)}
                                  className="px-2 py-1 rounded border border-border bg-background text-xs font-semibold"
                                >
                                  {packages.map(p => (
                                    <option key={p.id} value={p.id}>{p.label || p.tier}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground">Case Limit:</span>
                                <input
                                  type="number"
                                  value={doc.caseLimit ?? 3}
                                  onChange={e => handleUpdateTierAndLimit(doc.id, doc.packageTier || 'Free', Number(e.target.value))}
                                  className="w-16 px-2 py-1 rounded border border-border bg-background text-xs font-semibold"
                                />
                                <span className="text-muted-foreground">({(doc.cases || []).length} used)</span>
                              </div>

                              {/* Payment Status */}
                              <button
                                onClick={() => handleTogglePayment(doc.id, !!doc.paymentConfirmed)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                                  doc.paymentConfirmed
                                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                                }`}
                              >
                                {doc.paymentConfirmed ? '✓ Payment Confirmed' : '⚠ Payment Unconfirmed'}
                              </button>

                              {/* Active Status */}
                              <button
                                onClick={() => handleToggleActive(doc.id, !!doc.active)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                                  doc.active
                                    ? 'bg-muted text-foreground border border-border'
                                    : 'bg-destructive/20 text-destructive border border-destructive/30'
                                }`}
                              >
                                {doc.active ? 'Status: Active' : 'Status: Inactive'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-border">
                          <button
                            onClick={() => handleOpenInspect(doc)}
                            className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition flex items-center gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Inspect & Edit Portfolio
                          </button>

                          <button
                            disabled={actionLoading}
                            onClick={() => handleApprove(doc.id)}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 shadow-sm"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve & Publish
                          </button>

                          <button
                            onClick={() => setShowRejectModal(doc.id)}
                            className="px-3 py-2 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold transition flex items-center gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: PACKAGES & PRICING ───────────────────────────────────────── */}
        {activeTab === 'packages' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Package Tiers & Pricing</h2>
                <p className="text-xs text-muted-foreground">
                  Configured documents in the <strong className="text-foreground">/packages</strong> collection in Firestore. Used for user onboarding limits and payment verification.
                </p>
              </div>
              <button
                onClick={() => setEditingPackage({ id: `Tier_${Date.now()}`, tier: '', label: '', labelAr: '', price: 499, caseLimit: 10, active: true })}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                Add New Package
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map(pkg => (
                <div key={pkg.id} className="border border-border rounded-2xl p-5 bg-card flex flex-col justify-between shadow-sm relative group hover:border-primary/40 transition">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase px-2 py-0.5 rounded bg-muted">
                        {pkg.id}
                      </span>
                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        {pkg.price === 0 ? 'Free' : `${pkg.price.toLocaleString()} EGP`}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-foreground mb-0.5">{pkg.label || pkg.tier}</h3>
                    {pkg.labelAr && (
                      <p className="text-xs text-muted-foreground mb-2 font-medium" dir="rtl">
                        {pkg.labelAr}
                      </p>
                    )}

                    <div className="space-y-1.5 my-3 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Clinical Capacity:</span>
                        <strong className="text-foreground">{pkg.caseLimit} Cases</strong>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Signup Visibility:</span>
                        <span className={`font-semibold ${pkg.active !== false ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {pkg.active !== false ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setEditingPackage(pkg)}
                        className="w-full py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition flex items-center justify-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleTogglePackageActive(pkg)}
                        className={`w-full py-1.5 rounded-lg border text-xs font-semibold transition ${
                          pkg.active !== false
                            ? 'border-border text-muted-foreground hover:bg-muted'
                            : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                        }`}
                      >
                        {pkg.active !== false ? 'Hide' : 'Unhide'}
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="w-full py-1.5 rounded-lg border border-destructive/20 text-destructive text-[11px] font-semibold hover:bg-destructive/10 transition flex items-center justify-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete Package
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Edit Package Modal */}
            {editingPackage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-foreground">
                      {packages.some(p => p.id === editingPackage.id) ? `Edit Package (${editingPackage.id})` : 'Create New Package'}
                    </h3>
                    <button onClick={() => setEditingPackage(null)} className="p-1 rounded-lg hover:bg-muted">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Tier Document ID (e.g. Free, Tier2, Tier3, Custom)</label>
                      <input
                        type="text"
                        value={editingPackage.id || ''}
                        onChange={e => setEditingPackage({ ...editingPackage, id: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                        placeholder="Tier2"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Display Label (English)</label>
                      <input
                        type="text"
                        value={editingPackage.label || ''}
                        onChange={e => setEditingPackage({ ...editingPackage, label: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                        placeholder="Professional"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Display Label (Arabic - اسم الباقة بالعربية)</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={editingPackage.labelAr || ''}
                        onChange={e => setEditingPackage({ ...editingPackage, labelAr: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                        placeholder="الباقة الاحترافية"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Price (EGP)</label>
                        <input
                          type="number"
                          value={editingPackage.price ?? 0}
                          onChange={e => setEditingPackage({ ...editingPackage, price: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                          placeholder="499"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Case Limit</label>
                        <input
                          type="number"
                          value={editingPackage.caseLimit ?? 3}
                          onChange={e => setEditingPackage({ ...editingPackage, caseLimit: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                          placeholder="10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer pt-2">
                        <input
                          type="checkbox"
                          checked={editingPackage.active !== false}
                          onChange={e => setEditingPackage({ ...editingPackage, active: e.target.checked })}
                          className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                        />
                        <span className="text-xs font-medium text-foreground">Visible for selection during Doctor Signup / Wizard</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-border">
                    <button
                      onClick={handleSavePackage}
                      disabled={savingPackage}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition shadow-sm disabled:opacity-60"
                    >
                      {savingPackage ? 'Saving...' : 'Save Package'}
                    </button>
                    <button
                      onClick={() => setEditingPackage(null)}
                      className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-muted transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: EXISTING CLIENT TOML IMPORT TOOL ─────────────────────────── */}
        {activeTab === 'import' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-lg font-bold text-foreground">Import Existing Client from TOML</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Paste the doctor's existing Hugo <strong className="text-foreground">config.toml</strong> file. This tool parses all profile fields, skills, timeline, and cases, creates their Firebase Auth account, automatically sends a password setup email, and writes both draft and published documents.
              </p>
            </div>

            {importResult && (
              <div className={`p-4 rounded-xl border text-sm font-semibold flex items-start gap-2.5 ${
                importResult.success
                  ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                  : 'bg-destructive/10 text-destructive border-destructive/20'
              }`}>
                {importResult.success ? <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
                <div>{importResult.message}</div>
              </div>
            )}

            <form onSubmit={handleImportClient} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Doctor's Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="doctor@example.com"
                  value={importEmail}
                  onChange={e => setImportEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Assigned Package Tier</label>
                <select
                  value={importTier}
                  onChange={e => setImportTier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="Tier4">Tier 4 (VIP / 150 Cases)</option>
                  <option value="Tier3">Tier 3 (50 Cases)</option>
                  <option value="Tier2">Tier 2 (15 Cases)</option>
                  <option value="Free">Free Tier (3 Cases)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Paste config.toml Content</label>
                <textarea
                  required
                  rows={14}
                  placeholder={`baseURL = "https://portfoliohubs.github.io/doctor/"\ntitle = "Dr. Example"\n[params]\n...`}
                  value={importToml}
                  onChange={e => setImportToml(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-border bg-card text-foreground font-mono text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={importLoading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition shadow-md flex items-center justify-center gap-2"
              >
                {importLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Parsing TOML & Creating Account...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Import & Dispatch Password Email
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── TAB 4: GITHUB PAT & CI SETTINGS ─────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h2 className="text-lg font-bold text-foreground">GitHub Actions & Deployment Settings</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure your GitHub Repository and Personal Access Token (PAT). This allows the admin panel to instantly trigger the GitHub Actions Hugo multi-doctor deploy workflow upon approval or on-demand.
              </p>
            </div>

            <form onSubmit={handleSaveGhSettings} className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    GitHub Target Repository (Owner/Repo)
                  </label>
                  <input
                    type="text"
                    value={ghRepo}
                    onChange={e => setGhRepo(e.target.value)}
                    placeholder="portfoliohubs/portfoliohubs.github.io"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    The GitHub repository running the <code className="text-primary font-mono">.github/workflows/deploy.yml</code> workflow.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    GitHub Personal Access Token (PAT)
                  </label>
                  <input
                    type="password"
                    value={ghPat}
                    onChange={e => setGhPat(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Stored securely in your local browser storage (<code className="text-primary font-mono">localStorage</code>). Requires the <code className="text-primary font-semibold">repo</code> and <code className="text-primary font-semibold">workflow</code> scopes to trigger deployments.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition shadow-sm flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Settings
                </button>

                <button
                  type="button"
                  disabled={isDispatchingGh}
                  onClick={() => triggerGitHubDispatch()}
                  className="px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground font-semibold text-xs hover:bg-muted/80 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDispatchingGh ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-3.5 w-3.5 text-primary" />
                      Test Deployment Trigger
                    </>
                  )}
                </button>

                <a
                  href={`https://github.com/${ghRepo.trim() || 'portfoliohubs/portfoliohubs.github.io'}/actions`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition ml-auto"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open GitHub Actions
                </a>
              </div>
            </form>

            {/* Deployment Requirements & Troubleshooting Guide */}
            <div className="p-5 rounded-2xl border border-border bg-muted/30 space-y-3 text-xs leading-relaxed">
              <h3 className="font-bold text-foreground flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-primary" />
                How GitHub Pages Multi-Doctor Deployment Works
              </h3>
              
              <div className="space-y-2 text-muted-foreground">
                <p>
                  1. <strong className="text-foreground">Database Storage</strong>: When doctors upload photos and save in their dashboard, all data is immediately and safely saved to Firebase Firestore (<code className="text-primary font-mono">portfolios</code> collection).
                </p>
                <p>
                  2. <strong className="text-foreground">Admin Approval</strong>: When an admin approves a doctor, their data is synchronized into the <code className="text-primary font-mono">published_portfolios</code> collection and triggers GitHub Actions.
                </p>
                <p>
                  3. <strong className="text-foreground">Hugo Generator</strong>: The GitHub Action (<code className="text-primary font-mono">.github/workflows/deploy.yml</code>) runs <code className="text-primary font-mono">scripts/build-doctor-portfolios.mjs</code>, which queries all active published portfolios and builds static Hugo websites for each doctor under <code className="text-primary font-mono">dist/[slug]/</code>.
                </p>
                <p>
                  4. <strong className="text-foreground">Required GitHub Repository Secrets</strong>: Make sure <code className="text-primary font-mono">FIREBASE_SERVICE_ACCOUNT</code> is added in GitHub (<a href={`https://github.com/${ghRepo.trim() || 'portfoliohubs/portfoliohubs.github.io'}/settings/secrets/actions`} target="_blank" rel="noopener noreferrer" className="text-primary underline font-semibold">Repository Settings &rarr; Secrets &rarr; Actions</a>) with your Firebase Admin Service Account JSON.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── DOCTOR DETAILS INSPECTION & FULL EDIT MODAL ────────────────────── */}
      {selectedDoctor && adminEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-4xl w-full shadow-2xl space-y-4 my-4 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-extrabold text-lg sm:text-xl text-foreground flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary" />
                    Dr. {adminEditForm.fullName || 'Doctor'}
                    {adminEditForm.fullNameAr && (
                      <span className="text-sm font-semibold text-muted-foreground" dir="rtl">
                        ({adminEditForm.fullNameAr})
                      </span>
                    )}
                  </h3>

                  {/* Badges */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    adminEditForm.status === 'published'
                      ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                      : adminEditForm.status === 'pending_review'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}>
                    {adminEditForm.status.toUpperCase()}
                  </span>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    adminEditForm.active !== false
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}>
                    {adminEditForm.active !== false ? 'Live Active: ON' : 'Live Active: OFF'}
                  </span>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground border border-border">
                    {adminEditForm.packageTier || 'Free'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">UID: {selectedDoctor.id}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAdminModalMode(adminModalMode === 'edit' ? 'preview' : 'edit')}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition flex items-center gap-1.5"
                  title="Toggle between Visual Preview and Form Editor"
                >
                  {adminModalMode === 'edit' ? (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span>Preview Mode</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-3.5 w-3.5 text-primary" />
                      <span>Edit Mode</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => { setSelectedDoctor(null); setAdminEditForm(null); }}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Pinned Slug & Live Website Bar */}
            <div className="px-4 sm:px-6 py-3 bg-primary/5 border-y border-primary/15 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
              <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-primary shrink-0">
                  <Globe className="h-4 w-4" />
                  <span>Custom Slug:</span>
                </div>
                <div className="flex-1 w-full sm:w-auto flex items-center gap-1.5">
                  <input
                    type="text"
                    value={adminEditForm.slug || ''}
                    onChange={e => handleUpdateAdminFormField('slug', sanitizeSlug(e.target.value))}
                    placeholder="e.g. ahmed-ali or dr-ahmed"
                    className="flex-1 max-w-sm px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-mono font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const auto = sanitizeSlug(adminEditForm.fullName || selectedDoctor.id);
                      handleUpdateAdminFormField('slug', auto);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-[11px] font-semibold hover:bg-muted text-muted-foreground hover:text-foreground transition whitespace-nowrap"
                    title="Auto-generate clean slug from doctor's full name"
                  >
                    Auto-Generate
                  </button>
                </div>
              </div>

              {/* Live URL indicator */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-muted-foreground hidden lg:inline">
                  https://portfoliohubs.github.io/<strong className="text-primary">{sanitizeSlug(adminEditForm.slug || adminEditForm.fullName || selectedDoctor.id)}</strong>/
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const url = `https://portfoliohubs.github.io/${sanitizeSlug(adminEditForm.slug || adminEditForm.fullName || selectedDoctor.id)}/`;
                    navigator.clipboard.writeText(url);
                    setCopiedSlug(true);
                    setTimeout(() => setCopiedSlug(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-border bg-background text-foreground text-[11px] font-semibold hover:bg-muted transition flex items-center gap-1"
                  title="Copy live Hugo URL to clipboard"
                >
                  {copiedSlug ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedSlug ? 'Copied!' : 'Copy URL'}</span>
                </button>
                <a
                  href={`https://portfoliohubs.github.io/${sanitizeSlug(adminEditForm.slug || adminEditForm.fullName || selectedDoctor.id)}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold hover:bg-primary/20 transition flex items-center gap-1"
                >
                  <span>Open Hugo Site</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Modal Body / Sub-Tabs */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-4">

              {adminSaveSuccess && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Changes successfully saved to Firestore and synchronized!</span>
                </div>
              )}

              {/* Sub-tab Navigation */}
              {adminModalMode === 'edit' && (
                <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-1">
                  {[
                    { id: 'basic', label: 'Basic Info & Bio', icon: UserIcon },
                    { id: 'contact', label: 'Clinic & Contact', icon: Building2 },
                    { id: 'education', label: 'Education & Timeline', icon: GraduationCap },
                    { id: 'skills', label: 'Skills & Tags', icon: Sparkles },
                    { id: 'cases', label: `Cases (${(adminEditForm.cases || []).length})`, icon: ImageIcon },
                    { id: 'account', label: 'Tier & Status', icon: Settings },
                  ].map(tab => {
                    const Icon = tab.icon;
                    const active = adminModalTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setAdminModalTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                          active
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* PREVIEW MODE */}
              {adminModalMode === 'preview' && (
                <div className="space-y-5 py-2">
                  {/* Hero Preview */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-border">
                    <div className="w-20 h-20 rounded-2xl bg-card border border-border overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                      {adminEditForm.profilePhoto ? (
                        <img src={adminEditForm.profilePhoto} alt={adminEditForm.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-center sm:text-left space-y-1">
                      <h4 className="font-extrabold text-lg text-foreground">
                        Dr. {adminEditForm.fullName} {adminEditForm.fullNameAr && `(${adminEditForm.fullNameAr})`}
                      </h4>
                      <p className="text-xs font-semibold text-primary">{adminEditForm.title || 'Dentist'}</p>
                      <p className="text-xs text-muted-foreground">
                        {adminEditForm.university} • Class of {adminEditForm.graduationYear}
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-card border border-border rounded-xl space-y-1.5">
                      <span className="font-bold text-muted-foreground uppercase text-[10px] block">Clinic Information</span>
                      <p className="font-semibold text-foreground">{adminEditForm.clinicName || 'N/A'} {adminEditForm.clinicNameAr && `(${adminEditForm.clinicNameAr})`}</p>
                      <p className="text-muted-foreground">{adminEditForm.locationAddress || 'Address not specified'}</p>
                    </div>

                    <div className="p-3 bg-card border border-border rounded-xl space-y-1.5">
                      <span className="font-bold text-muted-foreground uppercase text-[10px] block">Contact Channels</span>
                      <p className="text-foreground">Phone: <strong className="font-mono">{adminEditForm.phone || 'N/A'}</strong></p>
                      <p className="text-foreground">WhatsApp: <strong className="font-mono">{adminEditForm.whatsapp || 'N/A'}</strong></p>
                      <p className="text-foreground">Email: <strong className="font-mono">{adminEditForm.email || 'N/A'}</strong></p>
                    </div>
                  </div>

                  {/* Skills Preview */}
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Clinical Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(adminEditForm.clinicalSkills || []).map((s, i) => (
                        <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg font-semibold text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Cases Preview */}
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Submitted Cases ({(adminEditForm.cases || []).length})</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(adminEditForm.cases || []).map((c, i) => (
                        <div key={i} className="border border-border rounded-xl p-2 bg-card space-y-1.5">
                          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                            {c.photo || c.preview ? (
                              <img src={c.photo || c.preview} alt={c.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">No image</div>
                            )}
                          </div>
                          <div className="font-bold text-xs truncate">{c.title || `Case ${i+1}`}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{c.category}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* EDIT TAB 1: BASIC INFO & BIO */}
              {adminModalMode === 'edit' && adminModalTab === 'basic' && (
                <div className="space-y-4 py-2 text-xs">
                  {/* Photo & Names */}
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
                    <div className="w-20 h-20 rounded-2xl bg-card border border-border overflow-hidden shrink-0 relative group flex items-center justify-center shadow-sm">
                      {adminEditForm.profilePhoto ? (
                        <img src={adminEditForm.profilePhoto} alt={adminEditForm.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                      <label className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-[10px] font-bold">
                        <Upload className="h-4 w-4 mb-0.5" />
                        <span>Change</span>
                        <input type="file" accept="image/*" onChange={handleAdminProfilePhotoUpload} className="hidden" />
                      </label>
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">Profile Photo</span>
                        <label className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] hover:bg-primary/90 transition cursor-pointer flex items-center gap-1 shadow-sm">
                          <Upload className="h-3 w-3" />
                          <span>Upload Photo</span>
                          <input type="file" accept="image/*" onChange={handleAdminProfilePhotoUpload} className="hidden" />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={adminEditForm.profilePhoto || ''}
                        onChange={e => handleUpdateAdminFormField('profilePhoto', e.target.value)}
                        placeholder="Direct Image URL (e.g. https://... or Base64)"
                        className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Full Name (English)</label>
                      <input
                        type="text"
                        value={adminEditForm.fullName || ''}
                        onChange={e => handleUpdateAdminFormField('fullName', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1" dir="rtl">الاسم بالكامل (العربية)</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={adminEditForm.fullNameAr || ''}
                        onChange={e => handleUpdateAdminFormField('fullNameAr', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Professional Title (English)</label>
                      <input
                        type="text"
                        value={adminEditForm.title || ''}
                        onChange={e => handleUpdateAdminFormField('title', e.target.value)}
                        placeholder="e.g. Cosmetic Dentist & Implantologist"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1" dir="rtl">المسمى المهني (العربية)</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={adminEditForm.titleAr || ''}
                        onChange={e => handleUpdateAdminFormField('titleAr', e.target.value)}
                        placeholder="مثال: أخصائي تجميل وزراعة الأسنان"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Bio / Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">About / Bio (English)</label>
                      <textarea
                        rows={3}
                        value={adminEditForm.bio || ''}
                        onChange={e => handleUpdateAdminFormField('bio', e.target.value)}
                        placeholder="Brief summary of experience, passion, and expertise..."
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1" dir="rtl">نبذة تعريفية (العربية)</label>
                      <textarea
                        rows={3}
                        dir="rtl"
                        value={adminEditForm.bioAr || ''}
                        onChange={e => handleUpdateAdminFormField('bioAr', e.target.value)}
                        placeholder="نبذة مختصرة عن الخبرة والشغف المهني..."
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* EDIT TAB 2: CLINIC & CONTACT */}
              {adminModalMode === 'edit' && adminModalTab === 'contact' && (
                <div className="space-y-4 py-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Clinic / Center Name (English)</label>
                      <input
                        type="text"
                        value={adminEditForm.clinicName || ''}
                        onChange={e => handleUpdateAdminFormField('clinicName', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1" dir="rtl">اسم العيادة / المركز (العربية)</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={adminEditForm.clinicNameAr || ''}
                        onChange={e => handleUpdateAdminFormField('clinicNameAr', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Clinic Address (English)</label>
                      <input
                        type="text"
                        value={adminEditForm.locationAddress || ''}
                        onChange={e => handleUpdateAdminFormField('locationAddress', e.target.value)}
                        placeholder="e.g. 15 El-Tahrir St, Dokki, Giza"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1" dir="rtl">عنوان العيادة (العربية)</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={adminEditForm.locationAddressAr || ''}
                        onChange={e => handleUpdateAdminFormField('locationAddressAr', e.target.value)}
                        placeholder="مثال: ١٥ شارع التحرير، الدقي، الجيزة"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={adminEditForm.phone || ''}
                        onChange={e => handleUpdateAdminFormField('phone', e.target.value)}
                        placeholder="+20 100 000 0000"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">WhatsApp Number</label>
                      <input
                        type="text"
                        value={adminEditForm.whatsapp || ''}
                        onChange={e => handleUpdateAdminFormField('whatsapp', e.target.value)}
                        placeholder="+20 100 000 0000"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">Doctor Email</label>
                      <input
                        type="email"
                        value={adminEditForm.email || ''}
                        onChange={e => handleUpdateAdminFormField('email', e.target.value)}
                        placeholder="doctor@example.com"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Direct Booking URL (Optional)</label>
                    <input
                      type="url"
                      value={adminEditForm.bookingLink || ''}
                      onChange={e => handleUpdateAdminFormField('bookingLink', e.target.value)}
                      placeholder="https://vezzeta.com/... or https://wa.me/..."
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* EDIT TAB 3: EDUCATION & TIMELINE */}
              {adminModalMode === 'edit' && adminModalTab === 'education' && (
                <div className="space-y-4 py-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="font-semibold text-foreground block mb-1">University / Faculty</label>
                      <input
                        type="text"
                        value={adminEditForm.university || ''}
                        onChange={e => handleUpdateAdminFormField('university', e.target.value)}
                        placeholder="e.g. Faculty of Dentistry, Cairo University"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">Graduation Year</label>
                      <input
                        type="text"
                        value={adminEditForm.graduationYear || ''}
                        onChange={e => handleUpdateAdminFormField('graduationYear', e.target.value)}
                        placeholder="2024"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Timeline Milestones */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" />
                        Career & Education Timeline Milestones ({(adminEditForm.timeline || []).length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddTimeline}
                        className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] hover:bg-primary/90 transition flex items-center gap-1 shadow-sm"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Milestone</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(adminEditForm.timeline || []).map((item, index) => (
                        <div key={index} className="p-3 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            value={item.year || ''}
                            onChange={e => {
                              const updated = [...(adminEditForm.timeline || [])];
                              updated[index] = { ...updated[index], year: e.target.value };
                              handleUpdateAdminFormField('timeline', updated);
                            }}
                            placeholder="Year"
                            className="w-20 px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-mono font-bold"
                          />
                          <input
                            type="text"
                            value={item.event || ''}
                            onChange={e => {
                              const updated = [...(adminEditForm.timeline || [])];
                              updated[index] = { ...updated[index], event: e.target.value };
                              handleUpdateAdminFormField('timeline', updated);
                            }}
                            placeholder="Milestone description in English"
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                          />
                          <input
                            type="text"
                            dir="rtl"
                            value={item.eventAr || ''}
                            onChange={e => {
                              const updated = [...(adminEditForm.timeline || [])];
                              updated[index] = { ...updated[index], eventAr: e.target.value };
                              handleUpdateAdminFormField('timeline', updated);
                            }}
                            placeholder="الوصف بالعربية"
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveTimeline(index)}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition shrink-0"
                            title="Delete Milestone"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* EDIT TAB 4: SKILLS & TAGS */}
              {adminModalMode === 'edit' && adminModalTab === 'skills' && (
                <div className="space-y-5 py-2 text-xs">
                  {/* Skill Add Input */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-2xl bg-muted/40 border border-border">
                    <select
                      value={newSkillType}
                      onChange={e => setNewSkillType(e.target.value as any)}
                      className="px-3 py-1.5 rounded-xl border border-border bg-card text-foreground font-semibold text-xs"
                    >
                      <option value="clinical">Clinical Skill</option>
                      <option value="digital">Digital Skill</option>
                      <option value="soft">Soft Skill</option>
                    </select>

                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={e => setNewSkillInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(newSkillType); } }}
                      placeholder="Type skill name and press Enter or Add..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => handleAddSkill(newSkillType)}
                      className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Skill Tag</span>
                    </button>
                  </div>

                  {/* Clinical Skills */}
                  <div className="space-y-2">
                    <span className="font-bold text-foreground uppercase text-[11px] block">
                      Clinical Skills ({(adminEditForm.clinicalSkills || []).length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(adminEditForm.clinicalSkills || []).map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-xl font-semibold text-xs">
                          <span>{s}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill('clinical', s)}
                            className="hover:text-destructive transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Digital Skills */}
                  <div className="space-y-2">
                    <span className="font-bold text-foreground uppercase text-[11px] block">
                      Digital Skills & Software ({(adminEditForm.digitalSkills || []).length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(adminEditForm.digitalSkills || []).map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 rounded-xl font-semibold text-xs">
                          <span>{s}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill('digital', s)}
                            className="hover:text-destructive transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Soft Skills */}
                  <div className="space-y-2">
                    <span className="font-bold text-foreground uppercase text-[11px] block">
                      Soft Skills & Communication ({(adminEditForm.softSkills || []).length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(adminEditForm.softSkills || []).map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 rounded-xl font-semibold text-xs">
                          <span>{s}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill('soft', s)}
                            className="hover:text-destructive transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* EDIT TAB 5: CLINICAL CASES */}
              {adminModalMode === 'edit' && adminModalTab === 'cases' && (
                <div className="space-y-4 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground text-sm">Clinical Case Gallery</span>
                      <p className="text-muted-foreground text-[11px]">
                        {(adminEditForm.cases || []).length} case(s) submitted • Doctor capacity: {adminEditForm.caseLimit ?? 3}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCase}
                      className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add New Case</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(adminEditForm.cases || []).map((c, index) => (
                      <div key={index} className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          {/* Case Photo */}
                          <div className="w-24 h-16 rounded-xl bg-muted border border-border overflow-hidden shrink-0 relative group flex items-center justify-center">
                            {c.photo || c.preview ? (
                              <img src={c.photo || c.preview} alt={c.title} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            )}
                            <label className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-[10px] font-bold">
                              <Upload className="h-3.5 w-3.5 mb-0.5" />
                              <span>Replace</span>
                              <input type="file" accept="image/*" onChange={e => handleAdminCasePhotoUpload(index, e)} className="hidden" />
                            </label>
                          </div>

                          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">Title (EN)</label>
                              <input
                                type="text"
                                value={c.title || ''}
                                onChange={e => {
                                  const updated = [...(adminEditForm.cases || [])];
                                  updated[index] = { ...updated[index], title: e.target.value };
                                  handleUpdateAdminFormField('cases', updated);
                                }}
                                placeholder="Case title"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5" dir="rtl">عنوان الحالة (AR)</label>
                              <input
                                type="text"
                                dir="rtl"
                                value={c.titleAr || ''}
                                onChange={e => {
                                  const updated = [...(adminEditForm.cases || [])];
                                  updated[index] = { ...updated[index], titleAr: e.target.value };
                                  handleUpdateAdminFormField('cases', updated);
                                }}
                                placeholder="عنوان الحالة بالعربية"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">Category</label>
                              <input
                                type="text"
                                value={c.category || ''}
                                onChange={e => {
                                  const updated = [...(adminEditForm.cases || [])];
                                  updated[index] = { ...updated[index], category: e.target.value };
                                  handleUpdateAdminFormField('cases', updated);
                                }}
                                placeholder="e.g. Restorative, Endodontics, Implants"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveCase(index)}
                            className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition shrink-0"
                            title="Delete Case"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Image URL fallback */}
                        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Image URL:</span>
                          <input
                            type="text"
                            value={c.photo || ''}
                            onChange={e => {
                              const updated = [...(adminEditForm.cases || [])];
                              updated[index] = { ...updated[index], photo: e.target.value, preview: e.target.value };
                              handleUpdateAdminFormField('cases', updated);
                            }}
                            placeholder="Direct URL (https://...)"
                            className="flex-1 px-2.5 py-1 rounded-lg border border-border bg-background text-foreground text-[11px] font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EDIT TAB 6: TIER, STATUS & SETTINGS */}
              {adminModalMode === 'edit' && adminModalTab === 'account' && (
                <div className="space-y-4 py-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Portfolio Review Status</label>
                      <select
                        value={adminEditForm.status || 'draft'}
                        onChange={e => handleUpdateAdminFormField('status', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-bold"
                      >
                        <option value="draft">Draft (Doctor working on profile)</option>
                        <option value="pending_review">Pending Review (Awaiting admin approval)</option>
                        <option value="published">Published (Approved & live on Hugo)</option>
                        <option value="rejected">Rejected (Requires edits by doctor)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">Package Tier</label>
                      <select
                        value={adminEditForm.packageTier || 'Free'}
                        onChange={e => handleUpdateAdminFormField('packageTier', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-bold"
                      >
                        {packages.map(p => (
                          <option key={p.id} value={p.id}>{p.label || p.tier} ({p.price === 0 ? 'Free' : `$${p.price}`})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Clinical Case Limit</label>
                      <input
                        type="number"
                        value={adminEditForm.caseLimit ?? 3}
                        onChange={e => handleUpdateAdminFormField('caseLimit', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">Live Site Visibility</label>
                      <button
                        type="button"
                        onClick={() => handleUpdateAdminFormField('active', adminEditForm.active === false ? true : false)}
                        className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                          adminEditForm.active !== false
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                        }`}
                      >
                        {adminEditForm.active !== false ? '✓ Live Active (ON)' : '✕ Deactivated (OFF)'}
                      </button>
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">Payment Verification</label>
                      <button
                        type="button"
                        onClick={() => handleUpdateAdminFormField('paymentConfirmed', !adminEditForm.paymentConfirmed)}
                        className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                          adminEditForm.paymentConfirmed
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {adminEditForm.paymentConfirmed ? '✓ Payment Confirmed' : '⚠ Payment Unconfirmed'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Admin Notes / Rejection Feedback</label>
                    <textarea
                      rows={3}
                      value={adminEditForm.adminNotes || ''}
                      onChange={e => handleUpdateAdminFormField('adminNotes', e.target.value)}
                      placeholder="Internal admin notes or feedback displayed to doctor if rejected..."
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 sm:p-5 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={adminSavingDoctor}
                  onClick={() => handleAdminSaveDoctor(false)}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {adminSavingDoctor ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save All Changes</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={adminSavingDoctor || actionLoading}
                  onClick={() => handleAdminSaveDoctor(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  title="Saves all changes, sets status to Published, and triggers GitHub deploy"
                >
                  <Rocket className="h-4 w-4" />
                  <span>Save & Publish Live</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(selectedDoctor.id)}
                  className="px-3.5 py-2.5 rounded-xl border border-destructive/30 text-destructive font-semibold text-xs hover:bg-destructive/10 transition"
                >
                  Reject with Notes
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedDoctor(null); setAdminEditForm(null); }}
                  className="px-4 py-2.5 rounded-xl border border-border text-foreground font-semibold text-xs hover:bg-muted transition"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── REJECT MODAL ───────────────────────────────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-foreground">Reject Portfolio & Request Changes</h3>
            <p className="text-xs text-muted-foreground">
              Provide feedback for the doctor explaining what changes are required before approval.
            </p>
            <textarea
              rows={4}
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              placeholder="e.g. Please provide higher resolution clinical case images and complete your graduation details."
              className="w-full p-3 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs hover:bg-destructive/90 transition"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => setShowRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium text-xs hover:bg-muted transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
