import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  Edit3,
  Sparkles,
  Video,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctorSite, setDoctorSite] = useState<any | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch user doc
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (userSnap.exists()) {
          setDoctorProfile(userSnap.data());
        }

        // 2. Fetch published site
        const sitesQuery = query(collection(db, 'sites'), where('tenantId', '==', currentUser.uid));
        const sitesSnap = await getDocs(sitesQuery);
        if (!sitesSnap.empty) {
          setDoctorSite(sitesSnap.docs[0].data());
        }
      } catch (err) {
        console.warn('Error loading doctor dashboard:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setLocation('/');
  };

  const copyLiveLink = () => {
    if (!doctorSite?.slug) return;
    const url = `${window.location.origin}/#/dr/${doctorSite.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800">
            <UserIcon className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Doctor Sign In Required</h2>
            <p className="text-sm text-gray-500 mb-6">
              Please sign in to access your doctor dashboard, clinical website, and studio workspaces.
            </p>
            <Link
              href="/login"
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm inline-block"
            >
              Sign In to PortfolioHubs
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const slug = doctorSite?.slug || doctorProfile?.slug;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Welcome Header */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Doctor Dashboard
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              Welcome, {doctorProfile?.hero?.name || user.displayName || 'Doctor'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        {/* Website Status Card */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <span>Personal Clinical Website</span>
            </h2>
            {slug ? (
              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Published Live
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-full flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Draft In Progress
              </span>
            )}
          </div>

          {slug ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate max-w-md">
                {window.location.origin}/#/dr/{slug}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyLiveLink}
                  className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
                <Link
                  href={`/dr/${slug}`}
                  target="_blank"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Live
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              You haven't launched your clinical website yet. Complete the 6-step wizard to go live.
            </p>
          )}

          <div className="pt-2">
            <Link
              href="/website"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>{slug ? 'Edit & Update Website' : 'Launch Website Wizard'}</span>
            </Link>
          </div>
        </div>

        {/* 4 Professional Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* 1. CV Builder */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center mb-3">
                <UserIcon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white mb-1">
                ATS Dental CV Builder
              </h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Download your multi-format dental CV with ATS compliance and instant PDF generation.
              </p>
            </div>
            <Link
              href="/cv"
              className="flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-700 py-1"
            >
              <span>Open CV Builder</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 2. DSD Studio */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white mb-1">
                DSD Studio (Smile Design)
              </h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Design smiles with golden ratio grids, 20 tooth templates, and Vita shade guides.
              </p>
            </div>
            <Link
              href="/dsd"
              className="flex items-center justify-between text-xs font-bold text-indigo-600 hover:text-indigo-700 py-1"
            >
              <span>Open DSD Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 3. Motion Graphic Reel */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center mb-3">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white mb-1">
                Motion Graphic Studio
              </h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Transform before/after cases into animated 1080x1920 video reels for social media.
              </p>
            </div>
            <Link
              href="/motiongraphic"
              className="flex items-center justify-between text-xs font-bold text-purple-600 hover:text-purple-700 py-1"
            >
              <span>Open Video Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
