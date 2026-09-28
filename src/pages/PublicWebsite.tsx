import React, { useEffect, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import {
  Phone,
  Mail,
  GraduationCap,
  Award,
  Calendar,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Moon,
  Sun,
  Globe,
  ChevronRight,
  MapPin,
  Menu,
  X,
  User,
  BookOpen,
  Camera,
  MessageCircle,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { getImageUrl } from '../lib/cdn';
import CONFIG from '../config';

interface SiteData {
  hero: {
    name: string;
    nameAr?: string;
    tagline: string;
    graduation: string;
    position: string;
    profileImage?: string;
  };
  skills: Array<{
    category: string;
    items: string[];
  }>;
  education: {
    university: string;
    faculty?: string;
    graduationYear?: string;
    degrees?: Array<{
      title: string;
      year: string;
      institution: string;
    }>;
    timeline?: Array<{
      year: string;
      title: string;
      description: string;
    }>;
  };
  certificates?: Array<{
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
    image: string;
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
  templateId?: number;
}

export default function PublicWebsite() {
  const [, slashParams] = useRoute('/dr/:slug');
  const [, compactParams] = useRoute('/dr:slug');
  const slug = (slashParams?.slug || compactParams?.slug || '').trim().toLowerCase();

  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [isArabic, setIsArabic] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Check live examples redirect
    const matchingExample = (CONFIG.portfolioIntro?.liveExamples ?? []).find(
      (ex) => ex.link.toLowerCase().replace(/^\/+|\/+$/g, '') === slug
    );
    if (matchingExample) {
      window.location.replace(`https://portfoliohubs.github.io/${matchingExample.link}`);
      return;
    }

    async function fetchSite() {
      try {
        setLoading(true);
        // 1. Try sites/{slug}
        const siteRef = doc(db, 'sites', slug);
        const siteSnap = await getDoc(siteRef);

        if (siteSnap.exists()) {
          const raw = siteSnap.data();
          const baseData: SiteData = raw.dataJson || raw;
          try {
            const casesSubSnap = await getDocs(collection(db, 'sites', slug, 'cases'));
            if (!casesSubSnap.empty) {
              const subCases: any[] = [];
              casesSubSnap.forEach((docSnap) => subCases.push(docSnap.data()));
              baseData.cases = subCases;
            }
          } catch {
            // Non-blocking: continue with baseData.cases
          }
          if (mounted) setSite(baseData);
          return;
        }

        // 2. Fallback to published_websites/{slug}
        const pubRef = doc(db, 'published_websites', slug);
        const pubSnap = await getDoc(pubRef);

        if (pubSnap.exists()) {
          const raw = pubSnap.data();
          if (mounted) setSite(raw.dataJson || raw);
          return;
        }

        // 3. Fallback demo data if slug is demo
        if (slug === 'demo' || slug === 'sample' || !slug) {
          if (mounted) {
            setSite({
              hero: {
                name: 'Dr. Michael Nabil',
                nameAr: 'د. ميخائيل نبيل',
                tagline: 'Cosmetic & Restorative Dentist | Digital Smile Specialist',
                graduation: 'Faculty of Dentistry — Class of 2018',
                position: 'Lead Clinician at Elite Dental Clinics',
                profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80',
              },
              skills: [
                {
                  category: 'Clinical Mastery',
                  items: [
                    'Porcelain Veneers & Smile Makeovers',
                    'Microscopic Endodontic Retreatment',
                    'Biomimetic Direct Composite Restorations',
                    'Atraumatic Surgical Extractions',
                  ],
                },
                {
                  category: 'Diagnostic & Digital Dentistry',
                  items: [
                    '3D Digital Smile Design (DSD)',
                    'CBCT Guided Implant Planning',
                    'Intraoral Optical Scanning (Itero/Trios)',
                    'Occlusal Splint & TMJ Diagnostics',
                  ],
                },
                {
                  category: 'Patient Experience & Ethics',
                  items: [
                    'Painless Computer-Controlled Anesthesia',
                    'Dental Anxiety & Phobia Management',
                    'Evidence-Based Comprehensive Treatment Plans',
                    'Multilingual Patient Consultations',
                  ],
                },
              ],
              education: {
                university: 'Ain Shams University',
                faculty: 'Faculty of Dentistry',
                graduationYear: '2018',
                degrees: [
                  {
                    title: 'Bachelor of Dental Medicine & Surgery (BDS)',
                    year: '2018',
                    institution: 'Ain Shams University (Excellent with Honors)',
                  },
                  {
                    title: 'Advanced Diploma in Cosmetic Restorative Dentistry',
                    year: '2021',
                    institution: 'Royal College of Surgeons Training Pathway',
                  },
                ],
                timeline: [
                  {
                    year: '2018 - 2019',
                    title: 'Rotational Clinical Internship',
                    description: 'Full-time rotations in Maxillofacial, Endodontics, and Pediatric surgery.',
                  },
                  {
                    year: '2019 - 2022',
                    title: 'Associate Dental Practitioner',
                    description: 'Specialized in anterior cosmetic veneer cases and root canal treatments.',
                  },
                  {
                    year: '2022 - Present',
                    title: 'Senior Clinical Lead & Digital Smile Designer',
                    description: 'Leading full digital workflows and rehabilitation at Elite Dental Clinics.',
                  },
                ],
              },
              certificates: [
                {
                  title: 'Certified Digital Smile Design (DSD) Member',
                  issuer: 'DSD International Academy',
                  year: '2022',
                  image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500&q=80',
                },
                {
                  title: 'Fellow of International Congress of Oral Implantologists',
                  issuer: 'ICOI',
                  year: '2023',
                  image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500&q=80',
                },
              ],
              cases: [
                {
                  id: 'c1',
                  category: 'Smile Makeover',
                  title: '10 E-Max Porcelain Veneers with Incisal Translucency',
                  description: 'Diastema closure and correction of tetracycline discoloration using 0.3mm minimally invasive preps.',
                  image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&q=80',
                },
                {
                  id: 'c2',
                  category: 'Smile Makeover',
                  title: 'Anterior Aesthetic Rehabilitation with Gum Recontouring',
                  description: 'Crown lengthening followed by 6 hand-layered lithium disilicate laminate veneers.',
                  image: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=800&q=80',
                },
                {
                  id: 'c3',
                  category: 'Direct Composite',
                  title: 'Class IV Composite Restoration with Natural Mamelons',
                  description: 'Polychromatic stratification using enamel and dentin shades after sports trauma.',
                  image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
                },
              ],
              contact: {
                phone: '+201271476215',
                whatsapp: '201271476215',
                email: 'contact@portfoliohubs.com',
                instagram: 'https://instagram.com/portfoliohubs',
                facebook: 'https://facebook.com/portfoliohubs',
                linkedin: 'https://linkedin.com/company/portfoliohubs',
                address: 'Elite Medical Center, 5th Settlement, New Cairo, Egypt',
              },
            });
          }
          return;
        }

        if (mounted) setError('Doctor website not found or publication is pending.');
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Error loading website.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchSite();
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 font-medium tracking-wide">Loading Doctor Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 text-center">
        <div className="max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Profile Not Found</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">{error || 'This doctor profile is not available.'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all"
          >
            Go to PortfolioHubs Home
          </Link>
        </div>
      </div>
    );
  }

  const { hero, skills, education, certificates = [], cases = [], contact } = site;
  const displayName = isArabic && hero.nameAr ? hero.nameAr : hero.name;

  return (
    <div
      data-theme={isDark ? 'dark' : 'light'}
      dir={isArabic ? 'rtl' : 'ltr'}
      className={`min-h-screen font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#111827] text-[#f9fafb]' : 'bg-[#ffffff] text-[#1f2937]'
      }`}
      style={{
        ['--primary-color' as any]: isDark ? '#3b82f6' : '#2563eb',
        ['--secondary-color' as any]: isDark ? '#8b5cf6' : '#7c3aed',
      }}
    >
      {/* 1. Header matching Hugo website model */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex justify-between items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="flex-1 text-center md:text-left">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {displayName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hero.nameAr && (
              <button
                onClick={() => setIsArabic(!isArabic)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isArabic ? 'EN' : 'العربية'}</span>
              </button>
            )}

            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 space-y-3 animate-in slide-in-from-top duration-200">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 font-medium"
            >
              {isArabic ? 'الرئيسية' : 'About Doctor'}
            </a>
            <a
              href="#skills"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 font-medium"
            >
              {isArabic ? 'المهارات والخبرات' : 'Clinical Skills'}
            </a>
            <a
              href="#education"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 font-medium"
            >
              {isArabic ? 'التعليم والمؤهلات' : 'Education & Career'}
            </a>
            <a
              href="#cases"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 font-medium"
            >
              {isArabic ? 'الحالات السريرية' : 'Clinical Cases'}
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-700 dark:text-gray-200 hover:text-blue-600 font-medium"
            >
              {isArabic ? 'تواصل معنا' : 'Clinic Contact'}
            </a>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="pt-24 pb-28 max-w-5xl mx-auto px-4 sm:px-6">
        {/* 2. Hero Section */}
        <section id="hero" className="text-center py-12 md:py-16">
          <div className="relative inline-block mb-6">
            <img
              src={
                hero.profileImage ||
                getImageUrl(slug, 'profile', 'medium') ||
                'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80'
              }
              alt={displayName}
              className="w-48 h-48 md:w-52 md:h-52 rounded-full object-cover border-[5px] border-blue-600 shadow-2xl mx-auto ring-4 ring-blue-100 dark:ring-blue-950/60"
            />
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {displayName}
          </h1>

          <p className="text-xl md:text-2xl font-medium text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-3">
            {hero.tagline}
          </p>

          <p className="text-base text-gray-500 dark:text-gray-400 mb-6 flex items-center justify-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-500" />
            <span>{hero.graduation}</span>
          </p>

          <div className="inline-block px-6 py-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
            <span className="text-base font-semibold text-blue-600 dark:text-blue-400">
              {hero.position}
            </span>
          </div>
        </section>

        {/* 3. Skills Section */}
        {skills && skills.length > 0 && (
          <section id="skills" className="py-16">
            <div className="text-center mb-12">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
                <Briefcase className="w-7 h-7" />
              </div>
              <h2 className="text-3xl font-bold mb-2">
                {isArabic ? 'الخبرات والمهارات السريرية' : 'Clinical Expertise & Skills'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {isArabic ? 'مجالات التميز في الممارسة اليومية والتقنيات الرقمية' : 'Comprehensive scope of dental practice & advanced procedures'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {skills.map((cat, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-5 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>{cat.category}</span>
                  </h3>
                  <ul className="space-y-3">
                    {cat.items.map((item, itemIdx) => (
                      <li
                        key={itemIdx}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                      >
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {itemIdx + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. Education & Timeline Section */}
        {education && (
          <section id="education" className="py-16">
            <div className="text-center mb-12">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
                <GraduationCap className="w-7 h-7" />
              </div>
              <h2 className="text-3xl font-bold mb-2">
                {isArabic ? 'التعليم والمؤهلات الأكاديمية' : 'Education & Career Journey'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {isArabic ? 'المسار العلمي والتدريب المستمر' : 'Academic foundation, specialized training, and clinical milestones'}
              </p>
            </div>

            {/* University Card Banner */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl p-8 text-center shadow-xl mb-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-2">{education.university}</h3>
              {education.faculty && (
                <p className="text-blue-100 text-lg font-medium">{education.faculty}</p>
              )}
              {education.graduationYear && (
                <p className="text-blue-200 text-sm mt-1">Class of {education.graduationYear}</p>
              )}
            </div>

            {/* Degrees Grid */}
            {education.degrees && education.degrees.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {education.degrees.map((deg, idx) => (
                  <div
                    key={idx}
                    className="p-6 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl flex gap-4 items-start shadow-sm"
                  >
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white mb-1">
                        {deg.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{deg.institution}</p>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1 inline-block">
                        {deg.year}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline */}
            {education.timeline && education.timeline.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-6 sm:p-10">
                <h4 className="text-xl font-bold text-center mb-8">
                  {isArabic ? 'التطور المهني والسريري' : 'Clinical & Career Timeline'}
                </h4>
                <div className="space-y-6">
                  {education.timeline.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm"
                    >
                      <div className="min-w-[120px] px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg text-center flex items-center justify-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.year}</span>
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-gray-900 dark:text-white text-base mb-1">
                          {item.title}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 5. Clinical Cases Section */}
        {cases && cases.length > 0 && (
          <section id="cases" className="py-16">
            <div className="text-center mb-12">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
                <Camera className="w-7 h-7" />
              </div>
              <h2 className="text-3xl font-bold mb-2">
                {isArabic ? 'الحالات السريرية الموثقة' : 'Clinical Cases & Smile Gallery'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {isArabic ? 'معرض الحالات الواقعية قبل وبعد العلاج' : 'Documented clinical outcomes with high-resolution photography'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cases.map((c) => (
                <div
                  key={c.id}
                  className="group bg-white dark:bg-gray-800/80 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                >
                  <div
                    className="relative pt-[70%] bg-gray-100 dark:bg-gray-900 overflow-hidden cursor-pointer"
                    onClick={() => setActiveImageModal(c.image)}
                  >
                    <img
                      src={c.image}
                      alt={c.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                      {c.category}
                    </div>
                    <div className="absolute inset-0 bg-blue-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium text-xs gap-1.5">
                      <ExternalLink className="w-4 h-4" />
                      <span>View Full Case</span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white mb-2 leading-snug">
                        {c.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                        {c.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. Certificates Section */}
        {certificates && certificates.length > 0 && (
          <section id="certificates" className="py-16">
            <div className="text-center mb-12">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
                <Award className="w-7 h-7" />
              </div>
              <h2 className="text-3xl font-bold mb-2">
                {isArabic ? 'الشهادات والاعتمادات الدولية' : 'Certificates & Professional Accreditations'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {certificates.map((cert, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all cursor-pointer"
                  onClick={() => cert.image && setActiveImageModal(cert.image)}
                >
                  <img
                    src={cert.image || 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500&q=80'}
                    alt={cert.title}
                    loading="lazy"
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-5 flex flex-col justify-end text-white">
                    <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-1">
                      {cert.year} • {cert.issuer}
                    </span>
                    <h4 className="font-bold text-sm leading-snug">{cert.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7. Contact Section */}
        {contact && (
          <section id="contact" className="py-16">
            <div className="text-center mb-12">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
                <Phone className="w-7 h-7" />
              </div>
              <h2 className="text-3xl font-bold mb-2">
                {isArabic ? 'حجز موعد واستشارات العيادة' : 'Contact & Appointment Booking'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {isArabic ? 'تواصل مباشرة للحجز أو الاستفسار عن خطط العلاج' : 'Reach out directly for appointments, consultations, and referrals'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              {contact.whatsapp && (
                <a
                  href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-4 text-emerald-800 dark:text-emerald-300 hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                      WhatsApp
                    </span>
                    <span className="font-semibold text-sm">{contact.whatsapp}</span>
                  </div>
                </a>
              )}

              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="p-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center gap-4 text-blue-800 dark:text-blue-300 hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 block">
                      Direct Phone
                    </span>
                    <span className="font-semibold text-sm">{contact.phone}</span>
                  </div>
                </a>
              )}

              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-4 text-rose-800 dark:text-rose-300 hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold text-rose-600 dark:text-rose-400 block">
                      Email
                    </span>
                    <span className="font-semibold text-sm truncate max-w-[170px] block">
                      {contact.email}
                    </span>
                  </div>
                </a>
              )}
            </div>

            {contact.address && (
              <div className="p-6 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl text-center flex items-center justify-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {contact.address}
                </span>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Floating Bottom Nav for Mobile matching website model */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 px-4 py-2 flex justify-around items-center shadow-lg">
        <a href="#hero" className="flex flex-col items-center gap-1 text-[10px] text-gray-600 dark:text-gray-300 hover:text-blue-600">
          <User className="w-5 h-5" />
          <span>About</span>
        </a>
        <a href="#skills" className="flex flex-col items-center gap-1 text-[10px] text-gray-600 dark:text-gray-300 hover:text-blue-600">
          <Briefcase className="w-5 h-5" />
          <span>Skills</span>
        </a>
        <a href="#cases" className="flex flex-col items-center gap-1 text-[10px] text-gray-600 dark:text-gray-300 hover:text-blue-600">
          <Camera className="w-5 h-5" />
          <span>Cases</span>
        </a>
        <a href="#contact" className="flex flex-col items-center gap-1 text-[10px] text-gray-600 dark:text-gray-300 hover:text-blue-600">
          <Phone className="w-5 h-5" />
          <span>Contact</span>
        </a>
      </div>

      {/* Image Modal Lightbox */}
      {activeImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setActiveImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={activeImageModal}
              alt="High Resolution Zoom"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setActiveImageModal(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2 text-sm font-semibold"
            >
              Close [✕]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
