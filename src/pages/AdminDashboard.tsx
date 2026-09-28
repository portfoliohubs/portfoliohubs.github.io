import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ShieldCheck,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  LogOut,
  Save,
  RefreshCw,
  Key,
  Search,
  Trash2,
  Sparkles,
  Settings,
  Globe,
  Plus,
  Video,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { generateRandomCode, type PromoCodeDoc } from '../lib/promoService';
import { imageQueueService } from '../lib/imageQueueService';
import { getAdImageUrl } from '../lib/cdn';
import type { ServiceId } from '../services';

const ADMIN_EMAILS = [
  'cources01@gmail.com',
  'admin@portfoliohubs.com',
  'portfoliohubs.contact@gmail.com',
];

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sites' | 'promos' | 'settings'>('sites');

  // Sites / Doctors state
  const [sites, setSites] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Promo codes state
  const [promoTab, setPromoTab] = useState<ServiceId>('dsd');
  const [promoCodes, setPromoCodes] = useState<PromoCodeDoc[]>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoMax, setNewPromoMax] = useState(1);
  const [promoCreating, setPromoCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Settings state
  const [globalSettings, setGlobalSettings] = useState({
    cvAdEnabled: true,
    cvAdPosterUrl: '',
    cvAdDurationSeconds: 5,
    upgradeWhatsAppNumber: '201271476215',
    currentImageRepo: 'dental-images-1',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // 1. Auth & Admin Verification
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAdminUser(user);
      if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true);
        loadDashboardData();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Load published sites
      const sitesSnap = await getDocs(collection(db, 'sites'));
      const loadedSites: any[] = [];
      sitesSnap.forEach((d) => {
        loadedSites.push({ id: d.id, ...d.data() });
      });
      setSites(loadedSites);

      // 2. Load promo codes
      await loadPromoCodes();

      // 3. Load global settings
      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      if (settingsSnap.exists()) {
        setGlobalSettings((prev) => ({ ...prev, ...settingsSnap.data() }));
      }
    } catch (err) {
      console.warn('Error loading admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPromoCodes = async () => {
    try {
      const promoSnap = await getDocs(collection(db, 'promo_codes'));
      const loadedPromos: PromoCodeDoc[] = [];
      promoSnap.forEach((d) => {
        loadedPromos.push({ code: d.id, ...(d.data() as any) });
      });
      setPromoCodes(loadedPromos);
    } catch (err) {
      console.warn('Error fetching promo codes:', err);
    }
  };

  // Create new promo code
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = (newPromoCode || generateRandomCode(promoTab)).toUpperCase().trim();
    if (!code) return;

    setPromoCreating(true);
    try {
      const codeRef = doc(db, 'promo_codes', code);
      const newDoc: PromoCodeDoc = {
        code,
        service: promoTab,
        maxRedemptions: newPromoMax,
        redeemedCount: 0,
        active: true,
        createdAt: serverTimestamp(),
      };
      await setDoc(codeRef, newDoc);
      setNewPromoCode('');
      await loadPromoCodes();
    } catch (err) {
      console.error('Failed to create promo code:', err);
    } finally {
      setPromoCreating(false);
    }
  };

  // Toggle promo code active status
  const handleTogglePromo = async (code: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'promo_codes', code), { active: !currentActive });
      setPromoCodes((prev) =>
        prev.map((p) => (p.code === code ? { ...p, active: !currentActive } : p))
      );
    } catch (err) {
      console.error('Failed to toggle promo code:', err);
    }
  };

  // Delete promo code
  const handleDeletePromo = async (code: string) => {
    if (!confirm(`Delete promo code ${code}?`)) return;
    try {
      await deleteDoc(doc(db, 'promo_codes', code));
      setPromoCodes((prev) => prev.filter((p) => p.code !== code));
    } catch (err) {
      console.error('Failed to delete promo code:', err);
    }
  };

  // Save Global Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccess(false);

    try {
      await setDoc(doc(db, 'settings', 'global'), globalSettings, { merge: true });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSettingsSaving(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800">
            <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Restricted Admin Portal</h2>
            <p className="text-sm text-gray-500 mb-6">
              You must be signed in with verified administrator credentials to access this dashboard.
            </p>
            <Link
              href="/login"
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm inline-block"
            >
              Sign In as Admin
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const filteredSites = sites.filter((s) => {
    const term = searchQuery.toLowerCase();
    const slug = (s.slug || '').toLowerCase();
    const name = (s.dataJson?.hero?.name || s.name || '').toLowerCase();
    return slug.includes(term) || name.includes(term);
  });

  const filteredPromos = promoCodes.filter((p) => p.service === promoTab);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans">
      <Header />

      {/* Top Banner */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              PortfolioHubs Admin Control
              <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                V4 Firestore
              </span>
            </h1>
            <p className="text-xs text-gray-500">{adminUser?.email}</p>
          </div>
        </div>

        <button
          onClick={() => signOut(auth).then(() => setLocation('/'))}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>

      {/* Main Tabs */}
      <div className="max-w-6xl w-full mx-auto px-4 py-6 flex-1 space-y-6">
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          <button
            onClick={() => setActiveTab('sites')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sites'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Doctor Websites ({sites.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('promos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'promos'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Promo Code System ({promoCodes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>CV Ads & Global Settings</span>
          </button>
        </div>

        {/* TAB 1: DOCTOR WEBSITES */}
        {activeTab === 'sites' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search doctor or slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs outline-none"
                />
              </div>

              <Link
                href="/website"
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Doctor Website
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-500 uppercase font-bold">
                  <tr>
                    <th className="p-4">Doctor Name</th>
                    <th className="p-4">Slug / Link</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredSites.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="p-4 font-bold text-gray-900 dark:text-white">
                        {s.dataJson?.hero?.name || s.name || 'Doctor'}
                      </td>
                      <td className="p-4 font-mono text-blue-600 dark:text-blue-400">
                        {s.slug}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {s.status || 'published'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Link
                          href={`/dr/${s.slug}`}
                          target="_blank"
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-blue-600 hover:text-white rounded-lg font-semibold inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filteredSites.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400">
                        No doctor websites found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PROMO CODES (3 SEPARATE TABS) */}
        {activeTab === 'promos' && (
          <div className="space-y-6">
            {/* Service sub-tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setPromoTab('website')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  promoTab === 'website'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-600 hover:text-gray-900 border border-gray-200 dark:border-gray-800'
                }`}
              >
                <Globe className="w-4 h-4" /> /website Promos
              </button>

              <button
                onClick={() => setPromoTab('dsd')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  promoTab === 'dsd'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-600 hover:text-gray-900 border border-gray-200 dark:border-gray-800'
                }`}
              >
                <Sparkles className="w-4 h-4" /> /dsd Promos
              </button>

              <button
                onClick={() => setPromoTab('motion')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  promoTab === 'motion'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-600 hover:text-gray-900 border border-gray-200 dark:border-gray-800'
                }`}
              >
                <Video className="w-4 h-4" /> /motiongraphic Promos
              </button>
            </div>

            {/* Create Code Form */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3">
                Generate Single-Use Promo Code for {promoTab.toUpperCase()}
              </h3>
              <form onSubmit={handleCreatePromo} className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder={`Leave blank for random (e.g. ${promoTab.toUpperCase()}-ABC123)`}
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-mono font-bold uppercase min-w-[260px] outline-none"
                />

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Max uses:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newPromoMax}
                    onChange={(e) => setNewPromoMax(parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-center font-bold outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={promoCreating}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer disabled:opacity-50"
                >
                  {promoCreating ? 'Generating...' : `Generate ${promoTab.toUpperCase()} Code`}
                </button>
              </form>
            </div>

            {/* Promo Codes List */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-500 uppercase font-bold">
                  <tr>
                    <th className="p-4">Code</th>
                    <th className="p-4">Service</th>
                    <th className="p-4">Redemptions</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredPromos.map((p) => (
                    <tr key={p.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="p-4 font-mono font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>{p.code}</span>
                        <button
                          onClick={() => copyText(p.code)}
                          className="text-gray-400 hover:text-blue-500 cursor-pointer p-1"
                        >
                          {copiedCode === p.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 uppercase font-semibold text-gray-500">{p.service}</td>
                      <td className="p-4">
                        <span className="font-semibold">
                          {p.redeemedCount} / {p.maxRedemptions}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            p.active && p.redeemedCount < p.maxRedemptions
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          {p.active && p.redeemedCount < p.maxRedemptions ? 'Active' : 'Redeemed / Inactive'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleTogglePromo(p.code, p.active)}
                          className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg font-semibold cursor-pointer"
                        >
                          {p.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeletePromo(p.code)}
                          className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPromos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        No promo codes found for {promoTab}. Generate one above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: GLOBAL SETTINGS & CV AD GATE */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveSettings}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 max-w-2xl"
          >
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                CV Ad Gate Settings (Firestore)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Controls the interstitial advertisement shown before CV download.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalSettings.cvAdEnabled}
                  onChange={(e) =>
                    setGlobalSettings({ ...globalSettings, cvAdEnabled: e.target.checked })
                  }
                  className="rounded w-4 h-4 accent-blue-600"
                />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Enable CV Download Ad Gate
                </span>
              </label>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Ad Poster Image URL (jsDelivr CDN / GitHub)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={globalSettings.cvAdPosterUrl}
                    onChange={(e) =>
                      setGlobalSettings({ ...globalSettings, cvAdPosterUrl: e.target.value })
                    }
                    placeholder="https://cdn.jsdelivr.net/gh/.../ads/poster.webp"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none"
                  />
                  <label className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 flex items-center gap-1.5 whitespace-nowrap">
                    <span>Upload Ad</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const filename = `cv-poster-${Date.now()}`;
                        try {
                          await imageQueueService.enqueue({
                            slug: '',
                            filename,
                            file,
                            kind: 'ad',
                            folder: 'ads',
                          });
                          const cdnUrl = getAdImageUrl(filename, globalSettings.currentImageRepo);
                          setGlobalSettings((prev) => ({ ...prev, cvAdPosterUrl: cdnUrl }));
                        } catch (err: any) {
                          alert(`Upload failed: ${err.message}`);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Uploaded directly to GitHub repository (under /ads/) and served via jsDelivr CDN without Firebase Storage.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Ad Display Duration (Seconds)
                </label>
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={globalSettings.cvAdDurationSeconds}
                  onChange={(e) =>
                    setGlobalSettings({
                      ...globalSettings,
                      cvAdDurationSeconds: parseInt(e.target.value) || 5,
                    })
                  }
                  className="w-24 px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Current GitHub Image Shard Repository
                </label>
                <input
                  type="text"
                  value={globalSettings.currentImageRepo}
                  onChange={(e) =>
                    setGlobalSettings({ ...globalSettings, currentImageRepo: e.target.value })
                  }
                  placeholder="dental-images-1"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Upgrade & Support WhatsApp Contact
                </label>
                <input
                  type="text"
                  value={globalSettings.upgradeWhatsAppNumber}
                  onChange={(e) =>
                    setGlobalSettings({ ...globalSettings, upgradeWhatsAppNumber: e.target.value })
                  }
                  placeholder="201271476215"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none"
                />
              </div>
            </div>

            {settingsSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Settings saved successfully to Firestore!
              </div>
            )}

            <button
              type="submit"
              disabled={settingsSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{settingsSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </form>
        )}
      </div>

      <Footer />
    </div>
  );
}
