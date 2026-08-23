import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
const DIST_DIR = path.resolve('dist');
const TEMPLATE_DIR = path.resolve('hugo-template');

async function main() {
  if (!SERVICE_ACCOUNT) {
    console.log('⚠️ FIREBASE_SERVICE_ACCOUNT secret not found. Skipping Hugo multi-doctor build.');
    return;
  }

  console.log('🚀 Initializing Firebase Admin for Hugo Multi-Doctor Build...');

  let serviceAccountKey;
  try {
    serviceAccountKey = JSON.parse(SERVICE_ACCOUNT);
  } catch (err) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err.message);
    process.exit(1);
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccountKey)
    });
  }

  const db = getFirestore();
  console.log('📥 Querying published doctor portfolios from Firestore...');

  const snap = await db.collection('published_portfolios').get();
  const allPublishedDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const activeDoctors = allPublishedDocs.filter(doc => doc.active !== false);
  const inactiveDoctors = allPublishedDocs.filter(doc => doc.active === false);

  console.log(`Found ${allPublishedDocs.length} total published portfolio records: ${activeDoctors.length} active, ${inactiveDoctors.length} inactive (offline).`);

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // 1. Generate fallback global 404.html if not present
  generateGlobal404();

  // 2. For inactive doctors, generate a customized 404 / Offline page at dist/${slug}/index.html
  for (const doc of inactiveDoctors) {
    const rawSlug = doc.slug || doc.fullName || doc.id;
    const slug = sanitizeSlug(rawSlug);
    if (!slug) continue;

    const docDist = path.join(DIST_DIR, slug);
    if (!fs.existsSync(docDist)) {
      fs.mkdirSync(docDist, { recursive: true });
    }

    console.log(`⛔ Generating 404 Offline Page for Inactive Dr. ${doc.fullName || doc.id} -> dist/${slug}/index.html`);
    const offlineHtml = generateOfflineHtml(doc);
    fs.writeFileSync(path.join(docDist, 'index.html'), offlineHtml, 'utf8');
  }

  // 3. For active doctors, generate live Hugo sites
  for (const doc of activeDoctors) {
    const rawSlug = doc.slug || doc.fullName || doc.id;
    const slug = sanitizeSlug(rawSlug);

    if (!slug) {
      console.warn(`Skipping doc ${doc.id}: unable to derive slug.`);
      continue;
    }

    console.log(`\n⚙️ Building Hugo portfolio for Dr. ${doc.fullName} -> dist/${slug}/`);
    const docDist = path.join(DIST_DIR, slug);
    const tempHugoDir = path.join('/tmp', `hugo_build_${slug}_${Date.now()}`);

    fs.mkdirSync(path.join(tempHugoDir, 'layouts'), { recursive: true });

    // Copy exact untouched layouts/index.html
    fs.copyFileSync(
      path.join(TEMPLATE_DIR, 'layouts', 'index.html'),
      path.join(tempHugoDir, 'layouts', 'index.html')
    );

    // Generate config.toml
    const baseURL = `https://portfoliohubs.github.io/${slug}/`;
    const tomlContent = generateTomlForDoc(doc, baseURL);
    fs.writeFileSync(path.join(tempHugoDir, 'config.toml'), tomlContent, 'utf8');

    // Run Hugo
    try {
      execSync(`hugo --source "${tempHugoDir}" --destination "${docDist}" --baseURL "${baseURL}"`, {
        stdio: 'inherit'
      });
      console.log(`✅ Successfully generated dist/${slug}/`);
    } catch (err) {
      console.error(`❌ Hugo build failed for Dr. ${doc.fullName}:`, err.message);
    } finally {
      // Clean up temp dir
      try {
        fs.rmSync(tempHugoDir, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  console.log('\n🎉 Multi-Doctor Hugo Build completed successfully!');
}

function sanitizeSlug(raw) {
  return (raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateOfflineHtml(doc) {
  const name = doc?.fullName ? `Dr. ${doc.fullName}` : 'This Portfolio';
  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Portfolio Currently Offline | PortfolioHubs</title>
  <meta name="robots" content="noindex, nofollow">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Tajawal:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
    .font-ar { font-family: 'Tajawal', system-ui, sans-serif; }
  </style>
</head>
<body class="h-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-white">
  <div class="max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
    <div class="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center text-2xl font-black shadow-inner">
      404
    </div>

    <div class="space-y-2">
      <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Portfolio Offline</h1>
      <p class="text-sm text-slate-400 leading-relaxed">
        ${name} is currently offline or under maintenance by the portfolio owner.
      </p>
    </div>

    <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2 font-ar" dir="rtl">
      <p class="font-bold text-amber-400">الصفحة غير متاحة حالياً</p>
      <p class="text-slate-400 text-[11px] leading-relaxed">
        هذا الملف التعريفي متوقف مؤقتاً أو تحت التحديث. يرجى المحاولة لاحقاً أو التواصل مع الإدارة.
      </p>
    </div>

    <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
      <a href="https://portfoliohubs.github.io/" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 inline-flex items-center justify-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span>Back to Home</span>
      </a>
      <a href="https://portfoliohubs.github.io/portfolio" class="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold text-xs transition inline-flex items-center justify-center">
        Create Your Portfolio
      </a>
    </div>

    <p class="text-[10px] text-slate-500 font-mono pt-4 border-t border-slate-800/60">
      PortfolioHubs Platform • Multi-Doctor Engine
    </p>
  </div>
</body>
</html>`;
}

function generateGlobal404() {
  const global404Path = path.join(DIST_DIR, '404.html');
  if (fs.existsSync(global404Path)) return;

  const html = `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Page Not Found | PortfolioHubs</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }</style>
</head>
<body class="h-full bg-slate-950 text-slate-100 flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-5">
    <div class="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center text-xl font-bold">404</div>
    <div class="space-y-1">
      <h1 class="text-2xl font-bold text-white">Page Not Found</h1>
      <p class="text-xs text-slate-400 leading-relaxed">The doctor portfolio or page you are looking for does not exist or has been deactivated.</p>
    </div>
    <a href="https://portfoliohubs.github.io/" class="inline-block px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition">Go Home</a>
  </div>
</body>
</html>`;

  fs.writeFileSync(global404Path, html, 'utf8');
}

function esc(str) {
  if (!str) return '""';
  return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

function arrToml(arr) {
  if (!arr?.length) return '[]';
  return `[\n      ${arr.map(esc).join(',\n      ')}\n    ]`;
}

function generateTomlForDoc(doc, baseURL) {
  const name = doc.fullName || 'Doctor';
  const nameAr = doc.fullNameAr || name;
  const title = doc.title || 'Dentist';
  const titleAr = doc.titleAr || title;
  const uni = doc.university || 'Faculty of Dentistry';
  const uniAr = doc.universityAr || uni;
  const year = doc.graduationYear || '2025';
  const clinic = doc.clinicName || uni;
  const clinicAr = doc.clinicNameAr || uniAr;
  const photo = doc.profilePhoto || '';

  const keywordsEn = [
    "dentist",
    "dental clinic",
    "cosmetic dentistry",
    "restorative dentistry",
    name,
    `Dr. ${name}`,
    "dental implants",
    "orthodontics",
    "teeth whitening",
    "dental portfolio",
  ];

  const keywordsAr = [
    "طبيب أسنان",
    "عيادة أسنان",
    "تجميل الأسنان",
    "ترميم الأسنان",
    nameAr,
    `د. ${nameAr.replace(/^د\.?\s*/, '')}`,
    "مركز أسنان",
    "عيادات أسنان",
    "طب الأسنان",
    "علاج الأسنان",
    "تنظيف الأسنان",
    "حشو الأسنان",
    "خلع أسنان",
    "تركيبات أسنان",
    "زراعة الأسنان",
    "تقويم الأسنان",
    "فينير الأسنان",
    "تبييض الأسنان بالليزر",
    "هوليود سمايل",
    "علاج عصب الأسنان",
    "جراحة الفم والأسنان",
    "خلع ضرس العقل",
    "تركيب طقم أسنان",
    "تنظيف الجير وتلميع الأسنان",
    "علاج لثة",
    "حشو تجميلي للأسنان",
    "أشعة أسنان ديجيتال",
    "دكتور أسنان",
    "موقع طبيب اسنان",
    "موقع عيادة اسنان",
    "اشطر دكتور اسنان",
    "افضل دكتور اسنان",
    "احسن عيادة أسنان",
    "عيادة أسنان موثوقة",
    "دكتور أسنان ممتاز",
    "موقع دكتور أسنان",
    "موقع طبي للأسنان",
    "تصميم موقع عيادة أسنان",
    `عيادة ${nameAr.replace(/^د\.?\s*/, '')}`,
    `طبيب أسنان ${nameAr.replace(/^د\.?\s*/, '')}`,
    `رقم ${nameAr.replace(/^د\.?\s*/, '')}`,
    `مواعيد ${nameAr.replace(/^د\.?\s*/, '')}`,
  ];

  const timeline = doc.timeline || [];
  const timelineEnToml = timeline.map(item => `
    [[params.education.timeline]]
      year  = ${esc(item.year)}
      event = ${esc(item.event)}`).join('');

  const timelineArToml = timeline.map(item => `
    [[params.ar.education.timeline]]
      year  = ${esc(item.year)}
      event = ${esc(item.eventAr || item.event)}`).join('');

  const cases = doc.cases || [];
  const groupedCases = {};
  cases.forEach(c => {
    const key = c.category || 'Uncategorized';
    if (!groupedCases[key]) groupedCases[key] = [];
    groupedCases[key].push(c);
  });

  const casesToml = Object.entries(groupedCases)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, cats]) => {
      const first = cats[0];
      return `
    [[params.clinical_cases]]
      enabled     = true
      category    = ${esc(first.category)}
      category_ar = ${esc(first.categoryAr || first.category)}
  ${cats.map(c => `
      [[params.clinical_cases.cases]]
        photo          = ${c.photo ? esc(c.photo) : '""'}
        alt            = ${esc(c.title || '')}
        description    = ${esc(c.title || '')}
        alt_ar         = ${esc(c.titleAr || c.title || '')}
        description_ar = ${esc(c.titleAr || c.title || '')}`).join('')}`;
    }).join('\n');

  const hasLocation = !!(doc.locationAddress || doc.locationLat);

  return `baseURL = ${esc(baseURL)}
languageCode = "en-us"
title = ${esc(name)}
defaultContentLanguage = "en"

[params]
  [params.hero]
    name              = ${esc(name)}
    tagline           = ${esc(title)}
    graduation        = ${esc(`Graduated ${year} - ${uni}`)}
    profile_image     = ${esc(photo)}
    profile_image_alt = ${esc(`Profile photo of ${name}`)}

    [params.hero.current_position]
      role   = ${esc(title)}
      clinic = ${esc(clinic)}

  [params.seo]
    description    = ${esc(`Professional dental portfolio of ${name}`)}
    doctor_name_en = ${esc(name)}
    doctor_name_ar = ${esc(nameAr)}
    site_name      = ${esc(name)}
    og_image       = ${esc(photo)}
    favicon_image  = ${esc(photo)}
    twitter_handle = ${esc(photo)}
    keywords       = ${arrToml(keywordsEn)}
    keywords_ar    = ${arrToml(keywordsAr)}

  [params.integrations]
    google_search_console_verification = ""
    google_analytics_measurement_id    = ""

  [params.ui]
    [params.ui.nav]
      profile        = "Profile"
      skills         = "Skills"
      education      = "Education"
      clinical_cases = "Clinical Cases"
      cases_short    = "Cases"
      blog           = "Blog"
      contact        = "Contact"

    [params.ui.skills]
      title          = "Professional Skills"
      clinical_title = "Clinical Skills"
      digital_title  = "Digital Skills"
      soft_title     = "Soft Skills"

    [params.ui.education]
      title                 = "Education & Timeline"
      graduated_label       = "Graduated"
      career_timeline_title = "Career Timeline"
      courses_title         = "Courses & Certifications"

    [params.ui.cases]
      title    = "Clinical Cases"
      subtitle = "Clinical Cases Gallery"

    [params.ui.blog]
      title      = "Latest Articles"
      subtitle   = "Insights and Knowledge"
      empty_text = "No blog posts yet"

    [params.ui.contact]
      title           = "Get In Touch"
      subtitle        = "Let's connect and collaborate"
      follow_me_title = "Follow Me"

    [params.ui.labels]
      now_working_as  = "Now working as"
      at              = "at"
      phone           = "Phone"
      whatsapp        = "WhatsApp"
      email           = "Email"
      location        = "Location"
      get_directions  = "Get Directions"
      masters_degree  = "Master's Degree"
      phd_degree      = "PhD Degree"
      rights_reserved = "All rights reserved"

  [params.skills]
    clinical = ${arrToml(doc.clinicalSkills || [])}
    digital  = ${arrToml(doc.digitalSkills || [])}
    soft     = ${arrToml(doc.softSkills || [])}

  [params.education]
    university      = ${esc(uni)}
    graduation_year = ${esc(year)}

    [params.education.master]
      obtained = false
      title    = "Master in Oral Medicine"
      year     = ""

    [params.education.phd]
      obtained = false
      title    = "PhD in Dental Sciences"
      year     = ""
    ${timelineEnToml}

  ${casesToml}

  [params.contact]
    phone     = ${esc(doc.phone || '')}
    whatsapp  = ${esc(doc.whatsapp || '')}
    email     = ${esc(doc.email || '')}
    instagram = ${esc(doc.instagram || '')}
    facebook  = ${esc(doc.facebook || '')}
    linkedin  = ${esc(doc.linkedin || '')}
  ${hasLocation ? `
    [params.contact.location]
      enabled   = true
      address   = ${esc(doc.locationAddress || '')}
      latitude  = ${esc(doc.locationLat || '')}
      longitude = ${esc(doc.locationLng || '')}
  ` : ''}

  [params.ar]
    [params.ar.hero]
      name              = ${esc(nameAr)}
      tagline           = ${esc(titleAr)}
      graduation        = ${esc(`تخرج ${year} - ${uniAr}`)}
      profile_image_alt = ${esc(`صورة الملف الشخصي لـ ${nameAr}`)}

      [params.ar.hero.current_position]
        role   = ${esc(titleAr)}
        clinic = ${esc(clinicAr)}

    [params.ar.skills]
      clinical = ${arrToml(doc.clinicalSkillsAr || doc.clinicalSkills || [])}
      digital  = ${arrToml(doc.digitalSkillsAr || doc.digitalSkills || [])}
      soft     = ${arrToml(doc.softSkillsAr || doc.softSkills || [])}

    [params.ar.education]
      university = ${esc(uniAr)}

      [params.ar.education.master]
        title = "ماجستير في طب الفم"

      [params.ar.education.phd]
        title = "دكتوراه في علوم الأسنان"
      ${timelineArToml}
  ${hasLocation ? `
    [params.ar.contact.location]
      address = ${esc(doc.locationAddressAr || doc.locationAddress || '')}
  ` : ''}
    [params.ar.ui]
      [params.ar.ui.nav]
        profile        = "الملف الشخصي"
        skills         = "المهارات"
        education      = "التعليم"
        clinical_cases = "الحالات السريرية"
        cases_short    = "الحالات"
        blog           = "المدونة"
        contact        = "التواصل"

      [params.ar.ui.skills]
        title          = "المهارات المهنية"
        clinical_title = "المهارات السريرية"
        digital_title  = "المهارات الرقمية"
        soft_title     = "المهارات الشخصية"

      [params.ar.ui.education]
        title                 = "التعليم والخط الزمني"
        graduated_label       = "تخرج"
        career_timeline_title = "الخط الزمني المهني"
        courses_title         = "الدورات والشهادات"

      [params.ar.ui.cases]
        title    = "الحالات السريرية"
        subtitle = "معرض الحالات السريرية"

      [params.ar.ui.blog]
        title      = "أحدث المقالات"
        subtitle   = "رؤى ومعرفة"
        empty_text = "لا توجد مقالات بعد"

      [params.ar.ui.contact]
        title           = "تواصل معي"
        subtitle        = "لنتواصل ونتعاون"
        follow_me_title = "تابعني"

      [params.ar.ui.labels]
        now_working_as  = "أعمل حالياً ك"
        at              = "في"
        phone           = "الهاتف"
        whatsapp        = "واتساب"
        email           = "البريد"
        location        = "الموقع"
        get_directions  = "احصل على الاتجاهات"
        masters_degree  = "درجة الماجستير"
        phd_degree      = "درجة الدكتوراه"
        rights_reserved = "جميع الحقوق محفوظة"
`;
}

main().catch(err => {
  console.error('Fatal build script error:', err);
  process.exit(1);
});
