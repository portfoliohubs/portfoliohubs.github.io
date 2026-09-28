import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import {
  User,
  Stethoscope,
  Upload,
  Palette,
  Eye,
  Send,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { localDb, type WizardDraft } from '../lib/dexieDb';
import { imageQueueService, type QueueProgress } from '../lib/imageQueueService';
import { getProfileImageUrl, getCaseImageUrl } from '../lib/cdn';
import { assertUnderLimit, stripBase64FromDataJson } from '../lib/firestoreSizeGuard';
import Header from '../components/Header';
import Footer from '../components/Footer';

const INITIAL_DATA: WizardDraft['data'] = {
  hero: {
    name: '',
    nameAr: '',
    tagline: 'Cosmetic & Restorative Dentist | Digital Smile Specialist',
    graduation: 'Faculty of Dentistry — Class of 2020',
    position: 'Specialist Clinician & Aesthetic Smile Designer',
    profileImage: '',
  },
  skills: [
    {
      category: 'Clinical Mastery',
      items: ['Porcelain Veneers & Smile Makeovers', 'Direct Composite Stratification', 'Rotary Endodontics'],
    },
    {
      category: 'Diagnostic & Digital Dentistry',
      items: ['Digital Smile Design (DSD)', 'Intraoral 3D Scanning', 'CBCT Guided Planning'],
    },
  ],
  education: {
    university: 'Cairo University',
    faculty: 'Faculty of Oral & Dental Medicine',
    graduationYear: '2020',
    degrees: [
      {
        title: 'Bachelor of Dental Medicine & Surgery (BDS)',
        year: '2020',
        institution: 'Faculty of Oral & Dental Medicine',
      },
    ],
    timeline: [
      {
        year: '2020 - 2021',
        title: 'Hospital Clinical Internship',
        description: 'Comprehensive general practice rotations across surgical and restorative departments.',
      },
    ],
  },
  certificates: [
    {
      title: 'Digital Smile Design Residency',
      issuer: 'DSD Academy',
      year: '2022',
      image: '',
    },
  ],
  cases: [
    {
      id: 'case-1',
      category: 'Cosmetic Dentistry',
      title: 'Anterior Aesthetic Veneer Rehabilitation',
      description: 'Minimally invasive lithium disilicate veneers for diastema closure.',
      image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&q=80',
    },
  ],
  contact: {
    phone: '',
    whatsapp: '',
    email: '',
    address: 'Cairo, Egypt',
    instagram: '',
    facebook: '',
    linkedin: '',
  },
  templateId: 1,
  slug: '',
};

export default function WebsiteWizard() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_DATA);
  const [savingDraft, setSavingDraft] = useState(false);
  const [queueProgress, setQueueProgress] = useState<QueueProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    inProgress: false,
  });
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load Draft from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    async function loadSavedDraft() {
      try {
        const draft = await localDb.drafts.get('current_draft');
        if (draft && mounted) {
          setFormData((prev) => ({
            ...prev,
            ...draft.data,
            hero: { ...prev.hero, ...draft.data.hero, nameAr: draft.data.hero.nameAr || '' },
          }));
          setCurrentStep(draft.step || 1);
        }
      } catch (err) {
        console.warn('Could not load local draft:', err);
      }
    }
    loadSavedDraft();

    // Subscribe to image upload queue
    const unsubscribe = imageQueueService.subscribe((progress) => {
      if (mounted) setQueueProgress(progress);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Debounced auto-save draft to IndexedDB
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setSavingDraft(true);
        await localDb.drafts.put({
          id: 'current_draft',
          step: currentStep,
          lastUpdated: Date.now(),
          data: formData,
        });
      } catch (err) {
        console.warn('Auto-save failed:', err);
      } finally {
        setSavingDraft(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData, currentStep]);

  // Handle image selection for clinical cases
  const handleCaseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const slug = formData.slug || generateSlug(formData.hero.name || 'doctor');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      const newCaseId = `case-${Date.now()}-${i}`;

      // Add to case list with local preview
      setFormData((prev) => ({
        ...prev,
        cases: [
          ...prev.cases,
          {
            id: newCaseId,
            category: 'Smile Makeover',
            title: file.name.replace(/\.[^/.]+$/, ''),
            description: 'Clinical case documentation.',
            image: previewUrl,
          },
        ],
      }));

      // Enqueue to 3-worker queue with Dexie persistence
      try {
        await imageQueueService.enqueue({
          slug,
          filename: newCaseId,
          file,
        });
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to queue image upload.');
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle profile image upload
  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use local Object URL for immediate preview (avoid base64 in state)
    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      hero: { ...prev.hero, profileImage: previewUrl },
    }));

    const slug = formData.slug || generateSlug(formData.hero.name || 'doctor');
    try {
      await imageQueueService.enqueue({
        slug,
        filename: 'profile',
        file,
        kind: 'profile',
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to process profile image.');
    }
  };

  const generateSlug = (name: string) => {
    const clean = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return clean ? `dr-${clean}` : `dr-${Math.random().toString(36).substring(2, 7)}`;
  };

  // 3. Final Publish Action to Firebase Firestore
  const handlePublish = async () => {
    setPublishing(true);
    setErrorMsg(null);

    try {
      const slug = formData.slug || generateSlug(formData.hero.name || 'doctor');
      const user = auth.currentUser;
      const uid = user ? user.uid : `anon_${Math.random().toString(36).substring(2, 9)}`;

      // Replace any local preview blobs or base64 strings with permanent jsDelivr CDN URLs
      const finalProfileImage =
        formData.hero.profileImage?.startsWith('blob:') || formData.hero.profileImage?.startsWith('data:')
          ? getProfileImageUrl(slug, 'medium')
          : (formData.hero.profileImage || getProfileImageUrl(slug, 'medium'));

      const cleanCases = formData.cases.map((c) => ({
        ...c,
        image:
          c.image.startsWith('blob:') || c.image.startsWith('data:')
            ? getCaseImageUrl(slug, c.id, 'medium')
            : c.image,
      }));

      // Prepare clean data payload (URLs only, no base64)
      const cleanDataJson = stripBase64FromDataJson({
        ...formData,
        slug,
        hero: {
          ...formData.hero,
          profileImage: finalProfileImage,
        },
        cases: cleanCases,
      });

      // Verify payload is well under the 900KB safety limit (Firestore max 1MB)
      assertUnderLimit(cleanDataJson, 900 * 1024);

      // Save to sites collection
      const siteRef = doc(db, 'sites', slug);
      await setDoc(siteRef, {
        slug,
        tenantId: uid,
        dataJson: cleanDataJson,
        templateId: formData.templateId,
        status: 'published',
        updatedAt: serverTimestamp(),
      });

      // Save individual cases in subcollection if cases count is high (for chunked querying)
      if (cleanCases.length > 5) {
        for (const item of cleanCases) {
          const caseSubRef = doc(db, 'sites', slug, 'cases', item.id);
          await setDoc(caseSubRef, {
            ...item,
            slug,
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Save to published_websites for public indexation
      const pubRef = doc(db, 'published_websites', slug);
      await setDoc(pubRef, {
        slug,
        uid,
        name: formData.hero.name,
        tagline: formData.hero.tagline,
        updatedAt: serverTimestamp(),
      });

      // Clear draft after successful publish
      await localDb.drafts.delete('current_draft');
      setPublishedSlug(slug);
    } catch (err: any) {
      console.error('Publication failed:', err);
      setErrorMsg(err?.message || 'Failed to publish website. Please check payload size or permissions.');
    } finally {
      setPublishing(false);
    }
  };

  const copyPublishedLink = () => {
    if (!publishedSlug) return;
    const url = `${window.location.origin}/#/dr/${publishedSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const steps = [
    { num: 1, label: 'Doctor Info', icon: User },
    { num: 2, label: 'Skills & Journey', icon: Stethoscope },
    { num: 3, label: 'Case Gallery', icon: Upload },
    { num: 4, label: 'Styling', icon: Palette },
    { num: 5, label: 'Live Preview', icon: Eye },
    { num: 6, label: 'Publish', icon: Send },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* Step Progress Bar */}
        <div className="mb-8 bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Step {currentStep} of 6
              </span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {steps[currentStep - 1].label}
              </h2>
            </div>
            {savingDraft && (
              <span className="text-xs text-gray-400 flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Autosaving draft...
              </span>
            )}
          </div>

          <div className="grid grid-cols-6 gap-2">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => setCurrentStep(s.num)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : isPast
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step Contents */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
          {/* STEP 1: Personal & Doctor Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div
                  onClick={() => profileInputRef.current?.click()}
                  className="w-28 h-28 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 overflow-hidden flex items-center justify-center cursor-pointer bg-gray-50 dark:bg-gray-800 relative group"
                >
                  {formData.hero.profileImage ? (
                    <img
                      src={formData.hero.profileImage}
                      alt="Doctor Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <User className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <span className="text-[10px] text-gray-500 font-semibold block">Photo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                    Change
                  </div>
                </div>
                <input
                  type="file"
                  ref={profileInputRef}
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                  className="hidden"
                />
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Profile Photo</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Upload a high-quality professional portrait (auto-compressed into WebP 300px/700px/1024px).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                    Doctor Full Name (English) *
                  </label>
                  <input
                    type="text"
                    value={formData.hero.name}
                    onChange={(e) =>
                      setFormData({ ...formData, hero: { ...formData.hero, name: e.target.value } })
                    }
                    placeholder="e.g. Dr. Michael Nabil"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                    Doctor Name (Arabic)
                  </label>
                  <input
                    type="text"
                    value={formData.hero.nameAr}
                    onChange={(e) =>
                      setFormData({ ...formData, hero: { ...formData.hero, nameAr: e.target.value } })
                    }
                    placeholder="مثال: د. ميخائيل نبيل"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                    Tagline / Specialization Headline *
                  </label>
                  <input
                    type="text"
                    value={formData.hero.tagline}
                    onChange={(e) =>
                      setFormData({ ...formData, hero: { ...formData.hero, tagline: e.target.value } })
                    }
                    placeholder="e.g. Cosmetic & Restorative Dentist | Digital Smile Specialist"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                    Graduation & Faculty *
                  </label>
                  <input
                    type="text"
                    value={formData.hero.graduation}
                    onChange={(e) =>
                      setFormData({ ...formData, hero: { ...formData.hero, graduation: e.target.value } })
                    }
                    placeholder="e.g. Faculty of Dentistry — Class of 2019"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                    Current Clinical Position *
                  </label>
                  <input
                    type="text"
                    value={formData.hero.position}
                    onChange={(e) =>
                      setFormData({ ...formData, hero: { ...formData.hero, position: e.target.value } })
                    }
                    placeholder="e.g. Lead Aesthetic Clinician at Elite Clinics"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                    Clinic WhatsApp Number (International format) *
                  </label>
                  <input
                    type="text"
                    value={formData.contact.whatsapp}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: { ...formData.contact, whatsapp: e.target.value },
                      })
                    }
                    placeholder="e.g. 201271476215"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                    Clinic Direct Phone
                  </label>
                  <input
                    type="text"
                    value={formData.contact.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: { ...formData.contact, phone: e.target.value },
                      })
                    }
                    placeholder="e.g. +201271476215"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                    Clinic Address & Location
                  </label>
                  <input
                    type="text"
                    value={formData.contact.address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: { ...formData.contact, address: e.target.value },
                      })
                    }
                    placeholder="e.g. Elite Medical Complex, 5th Settlement, New Cairo, Egypt"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Skills & Journey */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    Clinical Skill Categories (Hugo Template Standard)
                  </h3>
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        skills: [
                          ...formData.skills,
                          { category: 'New Skill Category', items: ['Key procedure or competency'] },
                        ],
                      })
                    }
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Category
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.skills.map((cat, catIdx) => (
                    <div
                      key={catIdx}
                      className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex justify-between items-center gap-2 mb-3">
                        <input
                          type="text"
                          value={cat.category}
                          onChange={(e) => {
                            const newSkills = [...formData.skills];
                            newSkills[catIdx].category = e.target.value;
                            setFormData({ ...formData, skills: newSkills });
                          }}
                          className="font-bold text-sm bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 outline-none px-1 py-0.5 w-full"
                        />
                        <button
                          onClick={() => {
                            const newSkills = formData.skills.filter((_, i) => i !== catIdx);
                            setFormData({ ...formData, skills: newSkills });
                          }}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 pl-4">
                        {cat.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {itemIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const newSkills = [...formData.skills];
                                newSkills[catIdx].items[itemIdx] = e.target.value;
                                setFormData({ ...formData, skills: newSkills });
                              }}
                              className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 flex-1 outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={() => {
                                const newSkills = [...formData.skills];
                                newSkills[catIdx].items = newSkills[catIdx].items.filter(
                                  (_, i) => i !== itemIdx
                                );
                                setFormData({ ...formData, skills: newSkills });
                              }}
                              className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newSkills = [...formData.skills];
                            newSkills[catIdx].items.push('New Skill Item');
                            setFormData({ ...formData, skills: newSkills });
                          }}
                          className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 mt-2 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education & Career Timeline */}
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
                  University & Degrees
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      University Name
                    </label>
                    <input
                      type="text"
                      value={formData.education.university}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          education: { ...formData.education, university: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      Faculty / School
                    </label>
                    <input
                      type="text"
                      value={formData.education.faculty}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          education: { ...formData.education, faculty: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Case Photos & Upload Queue */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    Clinical Case Photos & Documentation
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Multi-parallel upload queue (3 concurrent workers) with WebP 3-size compression (thumb, medium, full).
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <Upload className="w-4 h-4" /> Upload Cases
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*"
                onChange={handleCaseImageUpload}
                className="hidden"
              />

              {/* Upload Queue Status Banner */}
              {queueProgress.total > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {queueProgress.inProgress ? (
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    )}
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      Upload Queue: {queueProgress.completed} of {queueProgress.total} processed
                      {queueProgress.failed > 0 && ` (${queueProgress.failed} failed)`}
                    </span>
                  </div>
                  {queueProgress.failed > 0 && (
                    <button
                      onClick={() => imageQueueService.retryFailed()}
                      className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-bold rounded-lg hover:bg-red-200 cursor-pointer"
                    >
                      Retry Failed
                    </button>
                  )}
                </div>
              )}

              {/* Case Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {formData.cases.map((c, idx) => (
                  <div
                    key={c.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative pt-[65%] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 mb-2">
                        <img
                          src={c.image}
                          alt={c.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                      <input
                        type="text"
                        value={c.title}
                        onChange={(e) => {
                          const newCases = [...formData.cases];
                          newCases[idx].title = e.target.value;
                          setFormData({ ...formData, cases: newCases });
                        }}
                        placeholder="Case Title"
                        className="w-full font-bold text-xs bg-transparent border-b border-gray-200 dark:border-gray-700 py-1 outline-none focus:border-blue-500 mb-1"
                      />
                      <input
                        type="text"
                        value={c.category}
                        onChange={(e) => {
                          const newCases = [...formData.cases];
                          newCases[idx].category = e.target.value;
                          setFormData({ ...formData, cases: newCases });
                        }}
                        placeholder="Category (e.g. Veneers)"
                        className="w-full text-[11px] text-gray-500 bg-transparent py-0.5 outline-none mb-1"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newCases = formData.cases.filter((_, i) => i !== idx);
                        setFormData({ ...formData, cases: newCases });
                      }}
                      className="self-end text-red-500 hover:text-red-700 p-1 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Styling & Template Selection */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Website Model Theme & Design Standard
              </h3>
              <p className="text-xs text-gray-500">
                The layout follows the Hugo standard dental template from `website model/index.html` with responsive timelines and CSS variables.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => setFormData({ ...formData, templateId: 1 })}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    formData.templateId === 1
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold mb-3">
                    1
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                    Sapphire Blue (Classic Elite)
                  </h4>
                  <p className="text-xs text-gray-500">
                    Deep royal blue and purple gradient matching top cosmetic dental portfolios.
                  </p>
                </div>

                <div
                  onClick={() => setFormData({ ...formData, templateId: 2 })}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    formData.templateId === 2
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold mb-3">
                    2
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                    Emerald Mint (Bio-Aesthetic)
                  </h4>
                  <p className="text-xs text-gray-500">
                    Clean surgical green and teal tones for holistic, restorative dental practices.
                  </p>
                </div>

                <div
                  onClick={() => setFormData({ ...formData, templateId: 3 })}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    formData.templateId === 3
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold mb-3">
                    3
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                    Platinum Luxury (Dark Mode First)
                  </h4>
                  <p className="text-xs text-gray-500">
                    High contrast titanium gray and gold accents for premier implant centers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Live Preview */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  Live Preview of Your Clinical Website
                </h3>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Ready to publish
                </span>
              </div>

              {/* Embedded Miniature of Public Website */}
              <div className="border border-gray-300 dark:border-gray-700 rounded-2xl overflow-hidden shadow-inner bg-white dark:bg-gray-900 p-6 sm:p-10 text-center">
                <img
                  src={
                    formData.hero.profileImage ||
                    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80'
                  }
                  alt={formData.hero.name}
                  className="w-36 h-36 rounded-full object-cover border-4 border-blue-600 mx-auto mb-4 shadow-xl"
                />
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                  {formData.hero.name || 'Dr. Doctor Name'}
                </h2>
                <p className="text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto mb-2">
                  {formData.hero.tagline}
                </p>
                <p className="text-xs text-gray-500 mb-6">{formData.hero.graduation}</p>
                <div className="inline-block px-4 py-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-semibold">
                  {formData.hero.position}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="block text-xl font-bold text-blue-600">
                      {formData.skills.reduce((acc, c) => acc + c.items.length, 0)}
                    </span>
                    <span className="text-[11px] text-gray-500">Skills Documented</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="block text-xl font-bold text-blue-600">
                      {formData.cases.length}
                    </span>
                    <span className="text-[11px] text-gray-500">Clinical Cases</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="block text-xl font-bold text-blue-600">100%</span>
                    <span className="text-[11px] text-gray-500">PWA Ready</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Publish Step */}
          {currentStep === 6 && (
            <div className="space-y-6 text-center py-6">
              {!publishedSlug ? (
                <>
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Send className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Publish Doctor Clinical Website
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                    Your site will be published with instant global CDN distribution and stored securely in Firebase Firestore.
                  </p>

                  <div className="max-w-md mx-auto bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-left border border-gray-200 dark:border-gray-700">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Target Custom URL Slug
                    </label>
                    <div className="flex items-center gap-1 text-sm font-mono font-semibold text-gray-700 dark:text-gray-300">
                      <span>portfoliohubs.com/#/dr/</span>
                      <input
                        type="text"
                        value={formData.slug || generateSlug(formData.hero.name || 'doctor')}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="bg-transparent border-b border-blue-500 outline-none flex-1 text-blue-600 dark:text-blue-400 font-bold"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 text-base transition-all"
                  >
                    {publishing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Publishing to Global CDN...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Launch & Publish Website</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                /* Success Screen */
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Congratulations! Your Website is Live!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Your personal clinical portfolio has been published.
                  </p>

                  <div className="max-w-md mx-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400 truncate">
                      {window.location.origin}/#/dr/{publishedSlug}
                    </span>
                    <button
                      onClick={copyPublishedLink}
                      className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-gray-100 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex justify-center gap-4">
                    <Link
                      href={`/dr/${publishedSlug}`}
                      target="_blank"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-md"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Live Website
                    </Link>
                    <button
                      onClick={() => setLocation('/')}
                      className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl"
                    >
                      Back to Home
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls Between Steps */}
          {currentStep < 6 && (
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(Math.min(6, currentStep + 1))}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
