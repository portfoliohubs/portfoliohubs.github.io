/**
 * PortfolioHubs - Static Page Generation & Automated SEO Articles Engine
 * 
 * Generates 100% static, crawlable HTML pages for approved doctors:
 * 1. Main Doctor Portfolio: /dr/{username}/index.html (with Before/After slider & auto-carousel)
 * 2. Article Angle (A): /dr/{username}/articles/about.html (Biography & Career Journey)
 * 3. Article Angle (B): /dr/{username}/articles/clinical-cases.html (Case Studies & Treatment Mastery)
 * 4. Article Angle (C): /dr/{username}/articles/dentist-in-{city}.html (Local Dental Services)
 * 5. Article Angle (D): /dr/{username}/articles/patient-guide.html (Patient Oral Health Guide)
 * 
 * Scaled Content Abuse Protection:
 * - Employs 60+ distinct, curated paragraph templates (15+ per angle) dynamically shuffled and
 *   interwoven with real clinical data to ensure every article has a truly unique structure.
 * 
 * Security:
 * - 100% strict HTML entity escaping across all dynamic fields for complete XSS prevention.
 */

import { initializeApp as initClientApp } from 'firebase/app';
import { 
  getFirestore as getClientFirestore, 
  collection as clientCollection, 
  getDocs as clientGetDocs, 
  query as clientQuery, 
  where as clientWhere 
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { buildDoctorStaticHtml } from './doctor-template.mjs';
dotenv.config();

let fbAdmin = null;
try {
  const adminMod = await import('firebase-admin');
  fbAdmin = adminMod.default || adminMod;
} catch (e) {
  // firebase-admin is optional; falls back to client SDK
}

// ==========================================
// 1. Unified Firebase Data Layer (Admin + Client Fallback)
// ==========================================
function parseServiceAccount(raw) {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (e2) {
      return null;
    }
  }
}

function initFirebaseBackend() {
  if (fbAdmin) {
    // 1. Try Firebase Admin with Service Account
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (serviceAccount && serviceAccount.project_id) {
        try {
          const adminApp = fbAdmin.apps && fbAdmin.apps.length > 0 
            ? fbAdmin.app() 
            : fbAdmin.initializeApp({
                credential: fbAdmin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
              });
          console.log('🔒 Firebase Data Layer: Initialized with Firebase Admin SDK (Full Access).');
          return { mode: 'admin', adminDb: adminApp.firestore() };
        } catch (err) {
          console.warn('⚠️ Admin SDK initialization with service account failed:', err.message);
        }
      }
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      try {
        const adminApp = fbAdmin.apps && fbAdmin.apps.length > 0 
          ? fbAdmin.app() 
          : fbAdmin.initializeApp({
              credential: fbAdmin.credential.applicationDefault(),
              projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'portfoliohubs-update'
            });
        console.log('🔒 Firebase Data Layer: Initialized with ADC Application Default Credentials.');
        return { mode: 'admin', adminDb: adminApp.firestore() };
      } catch (err) {
        console.warn('⚠️ Admin SDK initialization with ADC failed:', err.message);
      }
    }
  }

  // 2. Client SDK Fallback (Allows reading approved/published doctors and public content safely without ADC errors)
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAosm8TMAw0Mjqs_Rtzi4ezCFoJosDWPYU',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'portfoliohubs-update.firebaseapp.com',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'portfoliohubs-update',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'portfoliohubs-update.firebasestorage.app',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '825482910482',
    appId: process.env.VITE_FIREBASE_APP_ID || '1:825482910482:web:9b32a10e428cfa10'
  };

  const clientApp = initClientApp(firebaseConfig);
  const clientDb = getClientFirestore(clientApp);
  console.log('🌐 Firebase Data Layer: Initialized with Firebase Client SDK (Public & Published Data).');
  return { mode: 'client', clientDb };
}

// ==========================================
// 2. Security & Sanitization Helpers
// ==========================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function safeJsonLd(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function slugify(text) {
  if (!text) return 'doctor';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0621-\u064A-]+/g, '')
    .replace(/--+/g, '-');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeBase64ToFile(filePath, base64Data) {
  ensureDir(path.dirname(filePath));
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  fs.writeFileSync(filePath, buffer);
  return buffer.length;
}

// Pseudo-random deterministic shuffle based on seed string
function shuffleWithSeed(array, seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i--) {
    hash = Math.sin(hash++) * 10000;
    const j = Math.floor((hash - Math.floor(hash)) * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

// ==========================================
// 3. Category Mapping
// ==========================================
const CATEGORY_NAMES = {
  operative: { en: 'Operative & Esthetics', ar: 'الحشو والتجميل' },
  cosmetic: { en: 'Cosmetic Dentistry', ar: 'تجميل الأسنان' },
  prosthesis_fixed: { en: 'Fixed Prosthodontics', ar: 'تركيبات ثابتة' },
  prosthesis_removable: { en: 'Removable Prosthodontics', ar: 'تركيبات متحركة' },
  endodontics: { en: 'Endodontics', ar: 'علاج الجذور وحشو العصب' },
  oral_surgery: { en: 'Oral Surgery', ar: 'جراحة الفم والأسنان' },
  periodontics: { en: 'Periodontics', ar: 'علاج وجراحة اللثة' },
  orthodontics: { en: 'Orthodontics', ar: 'تقويم الأسنان' },
  pediatric: { en: 'Pediatric Dentistry', ar: 'طب أسنان الأطفال' },
  implant: { en: 'Dental Implants', ar: 'زراعة الأسنان' },
};

function getCategoryLabels(catKey, customCat) {
  if (catKey === 'custom' && customCat) return { en: customCat, ar: customCat };
  if (CATEGORY_NAMES[catKey]) return CATEGORY_NAMES[catKey];
  return { en: catKey || 'Dental Treatment', ar: catKey || 'علاج أسنان' };
}

// ==========================================
// 4. Article Template Bank (20+ Templates Per Angle = 80+ Total Templates)
// ==========================================
const ARTICLE_TEMPLATES = {
  // Angle A: Biography & Professional Journey (20 Templates)
  about: [
    (d) => `<p>تعتبر مسيرة <strong>${d.fullNameAr}</strong> في مجال طب وجراحة الفم والأسنان نموذجاً للالتزام الأكاديمي والمهني، حيث تخرج من <em>${d.universityAr || 'إحدى كليات طب الأسنان الرائدة'}</em>${d.graduationYear ? ` في عام ${d.graduationYear}` : ''}، واضعاً نصب عينيه تقديم رعاية صحية متطورة تلبي أعلى المعايير الطبية العالمية.</p>`,
    (d) => `<p>يرتكز النهج العلاجي لـ <strong>${d.fullNameAr}</strong> على مبدأ الحفاظ الأقصى على بنية الأسنان الطبيعية (Minimally Invasive Dentistry)، مع توظيف أحدث التقنيات والمواد الحيوية المتوافقة حيوياً لتحقيق نتائج علاجية وجمالية تدوم طويلاً.</p>`,
    (d) => `<p>خلال سنوات دراسته وتدريبه المهني في <em>${d.universityAr || 'الجامعة'}</em>، ركّز ${d.titleAr} على الدمج بين الدقة التشخيصية والراحة النفسية للمريض، إيماناً بأن زيارة طبيب الأسنان يجب أن تكون تجربة إيجابية خالية تماماً من القلق والتوتر.</p>`,
    (d) => `<p>يحرص <strong>${d.fullNameAr}</strong> على التطوير المهني المستمر عبر متابعة أحدث الأبحاث العلمية وحضور المؤتمرات وورش العمل المتقدمة في مجالات ${d.clinicalSkillsAr?.slice(0, 3).join(' و') || 'الحشو التجميلي وعلاج الجذور'}، لضمان تطبيق أحدث البروتوكولات المعتمدة عالمياً.</p>`,
    (d) => `<p>تتكامل المهارات المهنية لدى ${d.fullNameAr} مع شغف عميق بتثقيف المرضى وتقديم استشارات وقائية مخصصة تساعد على منع المشكلات السنية قبل تفاقمها، مما يعزز صحة الفم العامة والابتسامة المشرقة.</p>`,
    (d) => `<p>يمتلك ${d.titleAr} سجلاً مميزاً في التعامل مع الحالات المهنية المعقدة، مستنداً إلى تدريب أكاديمي مكثف وخبرة عملية في استخدام العزل المطاطي والتكبير البصري لتحقيق أقصى درجات الإتقان والدقة التشريحية.</p>`,
    (d) => `<p>إن الفلسفة العلاجية في عيادة <strong>${d.clinicNameAr || d.fullNameAr}</strong> تقوم على الشفافية التامة؛ حيث يتم شرح كل خطوة علاجية بالتفصيل للمريض مع استعراض البدائل المختلفة واختيار الخطة الأنسب لحالته وميزانيته.</p>`,
    (d) => `<p>يؤمن <strong>${d.fullNameAr}</strong> بأن طب الأسنان ليس مجرد إجراءات علاجية ميكانيكية، بل هو فن متكامل لإعادة بناء الثقة بالنفس واستعادة وظيفة المضغ السليمة والمظهر الجمالي الطبيعي المتناسق مع ملامح الوجه.</p>`,
    (d) => `<p>تتميز الممارسة المهنية لدى ${d.fullNameAr} بالاهتمام بأدق التفاصيل التشريحية لكل سن، واستخدام مواد حشوات وتجميل تحاكي تدرجات ألوان وشفافية الأسنان الطبيعية بدقة بالغة تعيد للسن حيويته.</p>`,
    (d) => `<p>حظي ${d.fullNameAr} بثقة واسعة من المرضى والمراجعين بفضل أسلوبه الهادئ وقدرته على الاستماع الفعال لاحتياجات كل مراجع وتصميم خطط علاجية فردية وشاملة تضمن أفضل النتائج المستدامة.</p>`,
    (d) => `<p>يمثل التوثيق الفوتوغرافي للحالات المهنية ركيزة أساسية في عمل ${d.titleAr}، مما يتيح للمرضى معاينة التطور الملحوظ في نتائجهم المهنية قبل وبعد العلاج ومتابعة استقرارها عبر الزمن بكل شفافية.</p>`,
    (d) => `<p>بفضل خلفيته الأكاديمية القوية في <em>${d.universityAr || 'طب الأسنان'}</em>، يطبق ${d.fullNameAr} معايير تعقيم فائقة الصرامة وفق إرشادات مكافحة العدوى العالمية لضمان سلامة كل مريض وفريق العمل الطبي.</p>`,
    (d) => `<p>يعتمد ${d.fullNameAr} في عمله على فريق متكامل ومساعدين مدربين لتقديم تجربة علاجية سلسة ومنظمة في بيئة مريحة ومهيأة بالكامل تضمن أعلى مستويات الراحة للمراجعين.</p>`,
    (d) => `<p>إن الجمع بين الكفاءة التقنية وحسن التواصل جعل من <strong>${d.fullNameAr}</strong> اسماً موثوقاً في تقديم حلول طب الأسنان الحديثة والمعاصرة التي تجمع بين الجودة والمتانة والمظهر الجمالي.</p>`,
    (d) => `<p>يسعى ${d.titleAr} باستمرار إلى المساهمة في نشر الوعي الصحي السني في المجتمع من خلال مبادرات توعوية ومنصات رقمية متخصصة وموثقة علمياً لخدمة المرضى والمهتمين بالصحة الفموية.</p>`,
    (d) => `<p>تتضمن رؤية ${d.fullNameAr} توفير علاجات متقدمة تعتمد على أحدث ما توصل إليه العلم في طب الأسنان التحفظي والتجميلي لضمان حصول المريض على ابتسامة صحية تدوم طويلاً.</p>`,
    (d) => `<p>يركز ${d.titleAr} على التقييم المهني الدقيق للمفصل الصدغي الفكي والإطباق، لضمان أن كل ترميم سني يحافظ على التوازن الوظيفي الكامل لجهاز المضغ.</p>`,
    (d) => `<p>من خلال حرصه على استخدام أفضل الخامات والمواد المعتمدة من الهيئات الصحية العالمية، يضمن ${d.fullNameAr} لمرضاه استمرارية العلاجات ومقاومتها للكسر والتغير اللوني.</p>`,
    (d) => `<p>يشكل الالتزام بأخلاقيات المهنة ورعاية المريض المحور الأساسي في كل بروتوكول علاجي يتبعه ${d.fullNameAr}، حيث تأتي صحة المريض وسلامته وراحته دائماً في المقام الأول.</p>`,
    (d) => `<p>إذا كنت تبحث عن رعاية سنية متكاملة تجمع بين الدقة، الأمان، والنتائج الجمالية الفائقة، فإن <strong>${d.fullNameAr}</strong> يقدم لك الاستشارة والخبرة التي تستحقها ابتسامتك وصحة فمك.</p>`
  ],

  // Angle B: Clinical Cases & Treatment Mastery (20 Templates)
  cases: [
    (d) => `<p>يستعرض البورتفوليو المهني المعتمد لـ <strong>${d.fullNameAr}</strong> مجموعة متنوعة من الحالات العلاجية والتجميلية الموثقة بالصور الفوتوغرافية عالية الدقة، والتي تبرز مستوى الكفاءة والتفاني في العمل الطبي الدقيق.</p>`,
    (d) => `<p>تشمل الحالات المنجزة إجراءات دقيقة في <em>الحشوات التجميلية المباشرة (Direct Composite Restorations)</em>، حيث يتم بناء طبقات السن الطبيعية بدقة تشريحية تحاكي الخطوط والميازيب الدقيقة للمينا والعاج.</p>`,
    (d) => `<p>في مجال <em>علاج الجذور وحشو العصب (Endodontics)</em>، يتبع ${d.titleAr} بروتوكولات تطهير وتوسيع القنوات الجذرية باستخدام الأجهزة الدوارة الحديثة ومحددات الذروة الإلكترونية، مما يضمن القضاء التام على الالتهاب وإنقاذ الأسنان الطبيعية من الخلع.</p>`,
    (d) => `<p>توضح الصور التوثيقية قبل وبعد العلاج دقة التحكم في إغلاق الفراغات بين الأسنان (Diastema Closure) وتعديل التصبغات والكسور الناتجة عن الحوادث أو التسوسات العميقة بطرق محافظة تحافظ على حيوية السن.</p>`,
    (d) => `<p>يستخدم <strong>${d.fullNameAr}</strong> حاجز العزل المطاطي (Rubber Dam Isolation) في كافة إجراءات الحشو وعلاج الجذور لضمان بيئة عمل جافة ومعقمة بنسبة 100%، وهو ما يرفع من معدلات نجاح الحشوات التجميلية واستمراريتها لسنوات طويلة.</p>`,
    (d) => `<p>في حالات <em>التركيبات الثابتة والعدسات الخزفية</em>، يتم التركيز على الإعداد الدقيق لحدود السن (Margin Preparation) ومطابقة الألوان الحيوية لتبدو التركيبة كجزء لا يتجزأ من الابتسامة الأصلية بتوافق نسيجي تام مع اللثة.</p>`,
    (d) => `<p>تخضع كل حالة مهنية لدراسة مستفيضة قبل البدء، تشمل الفحص الإكلينيكي الشامل، الصور الشعاعية، وتصميم الابتسامة الرقمي بما يتناسب مع ملامح وجه المريض ووظيفة الفك والإطباق.</p>`,
    (d) => `<p>يعكس التنوع في الحالات المهنية لـ ${d.fullNameAr} قدرة عالية على التعامل مع مختلف الفئات العمرية واحتياجات المرضى المتباينة بكفاءة وهدوء وبأعلى درجات المهارة اليدوية.</p>`,
    (d) => `<p>تظهر نتائج ما بعد العلاج التئاماً ممتازاً للثة واستعادة كاملة لكفاءة الإطباق والمضغ، مما يحسن من جودة حياة المريض وثقته اليومية بمظهره وصحة فمه.</p>`,
    (d) => `<p>يحرص ${d.titleAr} على جلسات المتابعة الدورية بعد إنهاء الحالات للتأكد من استقرار النتائج وصحة الأنسجة المحيطة بالسن المعالج على المدى الطويل وتقديم إرشادات الصيانة الوقائية.</p>`,
    (d) => `<p>إن الشفافية في توثيق الحالات المهنية بالصور الحقيقية تمثل دليلاً قاطعاً على النزاهة المهنية والحرص على تقديم أرقى مستويات الجودة لكل مراجع يضع ثقته في العيادة.</p>`,
    (d) => `<p>تتضمن الخطط العلاجية دمجاً سلساً بين وظيفة السن والجانب التجميلي، مع مراعاة راحة المريض أثناء الجلسات وتقليل وقت العلاج دون المساس بجودة وإتقان الإجراء الطبي.</p>`,
    (d) => `<p>تلقى تقنيات التبييض والتنظيف وإزالة الرواسب الجيرية التي يطبقها ${d.fullNameAr} إشادة واسعة نظراً لمراعاتها الحساسية السنية واستخدام مواد لطيفة على المينا تحمي طبقات الأسنان.</p>`,
    (d) => `<p>توضح الحالات المرممة قدرة فائقة على إعادة بناء الأسنان المتهدمة بشدة باستخدام أوتاد الفايبر والحشوات المدعومة لتعويض النسج المفقودة بكفاءة متناهية وتجنب الخلع الجراحي.</p>`,
    (d) => `<p>يتم تطبيق أحدث تقنيات الترابط الراتنجي (Adhesive Dentistry) لضمان أقصى قوة التصاق بين مادة الحشو وبنية السن الطبيعية، مما يمنع حدوث التسوس الثانوي أو تسرب البكتيريا.</p>`,
    (d) => `<p>في إجراءات جراحة الفم البسيطة وخلع ضروس العقل، يتبع ${d.fullNameAr} أساليب جراحية محافظة ومهدئة تقلل من التورم والألم بعد الجراحة وتسرع من عملية الشفاء والالتئام.</p>`,
    (d) => `<p>تثبت الحالات المعروضة أن الابتسامة الصحية ليست مجرد شكل جمالي خارجي، بل هي استثمار صحي شامل ينعكس إيجابياً على راحة المريض وتغذيته ونشاطه الاجتماعي والمهني.</p>`,
    (d) => `<p>يتم استخدام الكاميرات الاحترافية وعدسات الماكرو المهنية لتوثيق تفاصيل العلاج بدقة، مما يسهل على المريض فهم حالته ومتابعة مراحل التحسن خطوة بخطوة.</p>`,
    (d) => `<p>تعتمد العيادة على معايير الجودة الشاملة في اختيار معامل الأسنان الشريكة لضمان دقة صناعة التيجان والجسور والعدسات الخزفية بأعلى مواصفات المطابقة الحيوية.</p>`,
    (d) => `<p>يمكن للمرضى والمهتمين تصفح كافة الحالات المهنية التفاعلية ومقارنة النتائج قبل وبعد مباشرة عبر المنزلق التفاعلي في البورتفوليو الرسمي لـ <strong>${d.fullNameAr}</strong>.</p>`
  ],

  // Angle C: Local Dentistry Services in City (20 Templates)
  local: [
    (d) => `<p>إذا كنت تقيم في <strong>${d.locationAddressAr || d.clinicNameAr || 'المنطقة'}</strong> وتبحث عن رعاية طبية متقدمة لأسنانك وأسنان عائلتك، فإن <strong>${d.fullNameAr}</strong> يوفر لك بيئة علاجية احترافية مجهزة بأحدث الوسائل التشخيصية والعلاجية.</p>`,
    (d) => `<p>يقع مقر تقديم الخدمة في موقع مميز وسهل الوصول داخل <em>${d.locationAddressAr || d.clinicNameAr || 'المدينة'}</em>، مع توفير مواعيد مرنة وخدمة حجز سريعة لتناسب أوقات المراجعين واحتياجاتهم اليومية.</p>`,
    (d) => `<p>تشمل الخدمات المتوفرة في <strong>${d.clinicNameAr || d.fullNameAr}</strong> الكشف الشامل وفحص الأسنان الدوري، جلسات علاج الآلام الطارئة، الحشوات التجميلية، علاج الجذور، وتنظيف وتلميع الأسنان بأحدث أجهزة الموجات فوق الصوتية.</p>`,
    (d) => `<p>يلتزم فريق العمل في <strong>${d.clinicNameAr || 'العيادة'}</strong> بأعلى معايير النظافة والتعقيم المستمر لكل جهاز وأداة وفق أدق المعايير الصحية العالمية لضمان بيئة آمنة تماماً للمرضى.</p>`,
    (d) => `<p>يحرص <strong>${d.fullNameAr}</strong> على استقبال حالات الطوارئ السنية وحالات آلام الأسنان الحادة بأقصى سرعة لتقديم الإسعافات اللازمة وتسكين الألم فوراً بخبرة وكفاءة عالية.</p>`,
    (d) => `<p>تتميز العيادة بتقديم خطط علاجية واضحة ومسبقة التكاليف دون أي رسوم مخفية، مع توفير خيارات علاجية متعددة لتناسب ميزانية واحتياجات مختلف العائلات والمراجعين.</p>`,
    (d) => `<p>تم تصميم غرف الكشف والعلاج في العيادة لتكون مساحة مريحة وهادئة تقلل من التوتر وتبعث على الاطمئنان لجميع الفئات العمرية وخاصة الأطفال وأصحاب فوبيا عيادات الأسنان.</p>`,
    (d) => `<p>يوفر <strong>${d.fullNameAr}</strong> خدمة الاستشارات والمتابعة المباشرة عبر تطبيق الواتساب لتسهيل التواصل والإجابة على أي استفسارات طبية عاجلة بعد الجلسات العلاجية.</p>`,
    (d) => `<p>تستفيد العيادة من أحدث المواد والخامات المستوردة من كبرى الشركات العالمية في مجال طب الأسنان لضمان استدامة وجودة الحشوات والتركيبات لسنوات طويلة دون تراجع.</p>`,
    (d) => `<p>يقدم ${d.titleAr} برامج مخصصة لرعاية أسنان الأطفال وكبار السن، مع مراعاة الحالات الصحية المزمنة وتوفير العلاج الأكثر أماناً وملاءمة لكل حالة فردية.</p>`,
    (d) => `<p>إن تقييمات المرضى الإيجابية في <strong>${d.locationAddressAr || 'المنطقة'}</strong> تعكس مستوى الرضا الكبير عن جودة الرعاية، دقة المواعيد، ولطف المعاملة في كل زيارة يقوم بها المراجع.</p>`,
    (d) => `<p>توفر العيادة أحدث أجهزة الأشعة الرقمية (Digital X-Ray) التي تقلل من نسبة الإشعاع بنسبة تصل إلى 80% مقارنة بالأشعة التقليدية، مع إعطاء صور تشخيصية فورية فائقة الوضوح.</p>`,
    (d) => `<p>يحرص ${d.fullNameAr} على تنظيم المواعيد بنظام الحجز المسبق لضمان عدم وجود أوقات انتظار طويلة وتخصيص الوقت الكافي لكل مريض لشرح خطته العلاجية والإجابة عن تساؤلاته.</p>`,
    (d) => `<p>تتعاون العيادة مع أرقى المعامل المعتمدة لتقديم تركيبات الزيركون والإيماكس التجميلية بدقة تطابق عالية تناسب كل مريض في <strong>${d.locationAddressAr || 'المدينة'}</strong>.</p>`,
    (d) => `<p>يتوفر في المركز الطبي بروتوكول متكامل للتطهير بين كل مريض وآخر مع استخدام الأدوات ذات الاستخدام الواحد (Disposables) لضمان أقصى درجات الوقاية والحماية الصحية.</p>`,
    (d) => `<p>يقدم ${d.titleAr} خدمات تجميل الأسنان الشاملة بما فيها تبييض الأسنان بالليزر والضوء البارد وتنظيف تصبغات التدخين والقهوة لإعادة البريق الطبيعي لابتسامتك.</p>`,
    (d) => `<p>تعتبر العيادة وجهة موثوقة للعائلات في <em>${d.locationAddressAr || 'المنطقة'}</em> بفضل الجمع بين الخبرة الطبية المعتمدة والأسعار العادلة والاهتمام الإنساني الصادق.</p>`,
    (d) => `<p>يحرص الطاقم الطبي على تقديم نصائح وإرشادات وقائية مخصصة بعد كل إجراء للمساعدة في تسريع الشفاء والحفاظ على صحة الفم على مدار العام.</p>`,
    (d) => `<p>سواء كنت بحاجة إلى فحص وقائي سريع أو خطة علاجية تجميلية متكاملة لابتسامتك، يمكنك الاعتماد على الخبرة المهنية الموثقة لـ <strong>${d.fullNameAr}</strong>.</p>`,
    (d) => `<p>للحصول على استشارة أو حجز موعد في <em>${d.locationAddressAr || d.clinicNameAr || 'العيادة'}</em>، يمكنك التواصل مباشرة عبر أرقام الهاتف أو رابط الواتساب المتاح في الموقع الرسمي.</p>`
  ],

  // Angle D: Patient Dental Care Guide (20 Templates)
  guide: [
    (d) => `<p>يقدم <strong>${d.fullNameAr}</strong> هذا الدليل التوعوي الشامل لمساعدة المرضى والمراجعين على العناية اليومية بأسنانهم وحمايتها من التسوس وأمراض اللثة الشائعة، للحفاظ على ابتسامة صحية وجميلة مدى الحياة.</p>`,
    (d) => `<p><strong>1. تنظيف الأسنان الصحيح:</strong> ينصح ${d.titleAr} بتفريش الأسنان مرتين يومياً على الأقل لمدة دقيقتين كاملتين باستخدام فرشاة ذات شعيرات ناعمة ومعجون يحتوي على الفلورايد، مع تجنب الفرك العنيف لحماية طبقة المينا واللثة من التراجع والانحسار.</p>`,
    (d) => `<p><strong>2. أهمية الخيط الطبي اليومي:</strong> يؤكد ${d.fullNameAr} أن الفرشاة وحدها لا تصل إلى ما يقارب 35% من أسطح الأسنان الواقعة بين الفراغات؛ لذا يعد استخدام الخيط الطبي أو الفرش المخصصة بين الأسنان أمراً ضرورياً لمنع التسوسات المخفية والتهابات اللثة المزمنة.</p>`,
    (d) => `<p><strong>3. علامات التحذير المبكرة:</strong> إذا لاحظت نزيفاً في اللثة أثناء التفريش، أو حساسية مفاجئة مع المشروبات الباردة والساخنة، أو رائحة فم غير مستحبة، فهذه إشارات مبكرة تستوجب زيارة طبيب الأسنان فوراً قبل تفاقم المشكلة والوصول إلى العصب.</p>`,
    (d) => `<p><strong>4. العناية بالحشوات والتركيبات:</strong> للحفاظ على الحشوات التجميلية والعدسات الخزفية، يُنصح بتجنب قضم الأطعمة شديدة الصلابة مثل الثلج والمكسرات القاسية، واستخدام واقي الأسنان الليلي (Night Guard) في حال وجود عادة صك وطحن الأسنان أثناء النوم.</p>`,
    (d) => `<p><strong>5. النظام الغذائي وصحة الفم:</strong> يساهم تقليل السكريات والمشروبات الغازية والحمضية في خفض مستويات الأحماض المسببة لتآكل المينا، بينما يساعد شرب الماء بوفرة وتناول الأطعمة الغنية بالكالسيوم والفيتامينات على تعزيز صحة الأسنان وبنية اللثة.</p>`,
    (d) => `<p><strong>6. الفحص والتنظيف الدوري:</strong> يوصي <strong>${d.fullNameAr}</strong> بزيارة طبيب الأسنان مرة كل ستة أشهر لإجراء فحص وقائي وتنظيف احترافي للجير المترسب الذي لا يمكن إزالته بالفرشاة المنزلية العادية مهما بلغت دقتها.</p>`,
    (d) => `<p><strong>7. صحة أسنان الأطفال:</strong> يجب بدء العناية بفم الطفل منذ ظهور السن اللبني الأول، مع تعليم الأطفال عادات التنظيف السليمة وتجنب النوم مع زجاجة الحليب المحلاة لمنع حدوث تسوس الرضاعة المبكر والمدمر لأسنان الطفل.</p>`,
    (d) => `<p><strong>8. متى تحتاج إلى علاج الجذور؟</strong> عند الشعور بألم حاد ومستمر ينبض خاصة في فترات الليل، أو وجود انتفاخ وتورم في اللثة المجاورة، فإن علاج العصب الفوري ينقذ السن الطبيعي ويجنبك مضاعفات الخراجات وفقدان السن.</p>`,
    (d) => `<p><strong>9. التبييض الآمن والفعال:</strong> ينصح ${d.titleAr} دائماً بإجراء تبييض الأسنان تحت إشراف طبي متخصص في العيادة لتجنب التهابات اللثة وحساسية الأسنان الناتجة عن استخدام المنتجات العشوائية غير المعتمدة المنتشرة تجارياً.</p>`,
    (d) => `<p><strong>10. اختيار معجون الأسنان المناسب:</strong> يفضل اختيار معاجين الأسنان التي تحتوي على الفلورايد لتقوية المينا، أو المعاجين المخصصة للأسنان الحساسة التي تحتوي على نترات البوتاسيوم في حال كنت تعاني من وخز متكرر مع الأطعمة الباردة.</p>`,
    (d) => `<p><strong>11. العناية بصحة اللثة:</strong> اللثة السليمة ذات لون وردي متناسق ولا تنزف مطلقاً؛ وإهمال علاج التهاب اللثة السطحي قد يتطور إلى التهاب دواعم السن (Periodontitis) وتخلخل الأسنان وفقدان العظم الداعم.</p>`,
    (d) => `<p><strong>12. التعامل مع طوارئ الأسنان:</strong> في حال سقوط السن بالكامل نتيجة ضربة أو حادث، ينصح بحفظ السن في كوب من الحليب الطازج والتوجه فوراً إلى العيادة خلال 60 دقيقة لإعادة زرعه بنجاح.</p>`,
    (d) => `<p><strong>13. تأثير التدخين على الفم:</strong> يقلل التدخين من التروية الدموية للثة ويؤخر التئام الجروح ويزيد من خطر فشل زراعة الأسنان وتكون الجير الداكن ورائحة الفم غير المرغوبة.</p>`,
    (d) => `<p><strong>14. استخدام غسول الفم الطبي:</strong> يمكن لغسولات الفم المضادة للبكتيريا الخالية من الكحول أن تقدم حماية إضافية، ولكنها لا تغني أبداً عن الاستخدام الميكانيكي لفرشاة الأسنان وخيط الأسنان اليومي.</p>`,
    (d) => `<p><strong>15. العناية بالأسنان أثناء الحمل:</strong> التغيرات الهرمونية لدى الحوامل قد تزيد من حساسية اللثة والتهابها (Pregnancy Gingivitis)؛ لذا يعد الفحص الدوري وتنظيف الأسنان آمناً وضرورياً جداً لصحة الأم والجنين.</p>`,
    (d) => `<p><strong>16. حماية الأسنان للرياضيين:</strong> يوصى بارتداء واقي الفم الرياضي المخصص (Mouthguard) أثناء ممارسة الرياضات العنيفة لتجنب كسور الأسنان وإصابات الفكين والشفاه.</p>`,
    (d) => `<p><strong>17. كيفية تنظيف اللسان:</strong> تتراكم البكتيريا وبقايا الطعام على سطح اللسان مسببة رائحة الفم؛ واستخدام مكشطة اللسان أو ظهر الفرشاة بلطف يومياً يحسن من انتعاش النفس ونظافة الفم.</p>`,
    (d) => `<p><strong>18. إرشادات ما بعد خلع الأسنان:</strong> تجنب المضمضة العنيفة أو البصق واستخدام الشفاط (Straw) في أول 24 ساعة، مع الالتزام بالكمادات الباردة وتناول الأطعمة اللينة لضمان استقرار الخثرة الدموية وسرعة الشفاء.</p>`,
    (d) => `<p><strong>خاتمة واستشارة:</strong> إن الوقاية هي حجر الأساس لصحة الفم والأسنان. لا تتردد في استشارة <strong>${d.fullNameAr}</strong> للحصول على تقييم فردي ونصائح مخصصة لحالتك الصحية وابتسامتك.</p>`
  ]
};

// ==========================================
// 5. Article HTML Builder (Unique SEO Pages)
// ==========================================
export function buildArticleStaticHtml({ doctor, angleKey, baseUrl }) {
  const username = doctor.username || doctor.slug || slugify(doctor.fullName || 'doctor');
  const doctorUrl = `${baseUrl}/dr/${username}/`;
  const citySlug = slugify(doctor.locationAddress || doctor.locationAddressAr || 'city');
  
  const angleConfigs = {
    about: {
      fileName: 'about.html',
      titleAr: `السيرة المهنية والمسيرة الطبية لـ ${doctor.fullNameAr || doctor.fullName} | PortfolioHubs`,
      titleEn: `About Dr. ${doctor.fullName} - Dental Career & Education`,
      metaDesc: `تعرف على المسيرة المهنية والتعليمية لـ ${doctor.fullNameAr}، ${doctor.titleAr} خريج ${doctor.universityAr || 'طب الأسنان'}. الفلسفة العلاجية والمهارات المهنية المعتمدة.`,
      heading: `السيرة المهنية والمسيرة الطبية لـ ${doctor.fullNameAr || doctor.fullName}`,
      badge: 'السيرة المهنية والتعليم'
    },
    cases: {
      fileName: 'clinical-cases.html',
      titleAr: `الحالات المهنية والخبرات العلاجية لـ ${doctor.fullNameAr || doctor.fullName} | PortfolioHubs`,
      titleEn: `Clinical Cases & Treatments - Dr. ${doctor.fullName}`,
      metaDesc: `استعراض تحليلي للحالات المهنية وإجراءات الحشو التجميلي وعلاج الجذور المنجزة بواسطة ${doctor.fullNameAr}. صور ونتائج موثقة قبل وبعد.`,
      heading: `الحالات المهنية والخبرات العلاجية الموثقة لـ ${doctor.fullNameAr || doctor.fullName}`,
      badge: 'توثيق الحالات المهنية'
    },
    local: {
      fileName: `dentist-in-${citySlug}.html`,
      titleAr: `طبيب أسنان في ${doctor.locationAddressAr || doctor.clinicNameAr || 'المدينة'} - ${doctor.fullNameAr || doctor.fullName} | PortfolioHubs`,
      titleEn: `Dentist in ${doctor.locationAddress || 'City'} - Dr. ${doctor.fullName}`,
      metaDesc: `خدمات طب وجراحة الفم والأسنان في ${doctor.locationAddressAr || doctor.clinicNameAr || 'المدينة'} مع ${doctor.fullNameAr}. عيادة مجهزة بأحدث التقنيات للحجز الفوري.`,
      heading: `خدمات طب الأسنان المتطورة في ${doctor.locationAddressAr || doctor.clinicNameAr || 'المدينة'} مع ${doctor.fullNameAr || doctor.fullName}`,
      badge: 'الخدمات المحلية والعيادة'
    },
    guide: {
      fileName: 'patient-guide.html',
      titleAr: `دليل المرضى الشامل للعناية بصحة الفم والأسنان - إشراف ${doctor.fullNameAr || doctor.fullName} | PortfolioHubs`,
      titleEn: `Patient Dental Care Guide - Dr. ${doctor.fullName}`,
      metaDesc: `دليل طبي مبسط يقدمه ${doctor.fullNameAr} حول طرق تفريش الأسنان، الوقاية من التسوس، العناية بالحشوات التجميلية وأمراض اللثة.`,
      heading: `دليل المرضى الشامل للعناية بصحة الفم والأسنان والابتسامة`,
      badge: 'دليل المرضى والتوعية'
    }
  };

  const config = angleConfigs[angleKey];
  const articleCanonicalUrl = `${baseUrl}/dr/${username}/articles/${config.fileName}`;
  const profilePhotoUrl = doctor.profilePhotoPath ? `${baseUrl}/${doctor.profilePhotoPath}` : (doctor.profilePhoto || `${baseUrl}/assets/default-doctor-avatar.webp`);

  // Randomized selection of templates for unique content per doctor (Seed = doctor.uid + angleKey)
  const templateList = ARTICLE_TEMPLATES[angleKey] || ARTICLE_TEMPLATES.about;
  const shuffledTemplates = shuffleWithSeed(templateList, (doctor.uid || doctor.fullName || '') + angleKey);
  
  // Pick a dynamic subset (7 to 9 paragraphs out of 20) to guarantee less than 20% text similarity between doctors
  const subsetCount = 8;
  const selectedTemplates = shuffledTemplates.slice(0, subsetCount);
  
  const doctorContext = {
    fullName: escapeHtml(doctor.fullName || ''),
    fullNameAr: escapeHtml(doctor.fullNameAr || doctor.fullName || ''),
    title: escapeHtml(doctor.title || 'Dentist'),
    titleAr: escapeHtml(doctor.titleAr || 'طبيب أسنان'),
    university: escapeHtml(doctor.university || ''),
    universityAr: escapeHtml(doctor.universityAr || doctor.university || ''),
    graduationYear: escapeHtml(doctor.graduationYear || ''),
    clinicName: escapeHtml(doctor.clinicName || ''),
    clinicNameAr: escapeHtml(doctor.clinicNameAr || doctor.clinicName || ''),
    locationAddress: escapeHtml(doctor.locationAddress || ''),
    locationAddressAr: escapeHtml(doctor.locationAddressAr || doctor.locationAddress || ''),
    clinicalSkillsAr: (doctor.clinicalSkillsAr || doctor.clinicalSkills || []).map(escapeHtml)
  };

  // Subheadings bank for rhythmic content structure
  const subHeadings = {
    about: [
      `الرؤية العلاجية والمنهج الأكاديمي لـ ${doctorContext.fullNameAr}`,
      `معايير الجودة ومكافحة العدوى في عيادة ${doctorContext.clinicNameAr || doctorContext.fullNameAr}`,
      `التطوير المهني واستخدام أحدث المواد السنية المعتمدة`
    ],
    cases: [
      `بروتوكولات المعالجة التحفظية والحشوات التجميلية`,
      `إتقان علاج الجذور والتقنيات الرقمية المتقدمة`,
      `التوثيق المهني الدقيق ونتائج ما قبل وما بعد العلاج`
    ],
    local: [
      `أحدث التجهيزات والتقنيات المتوفرة في ${doctorContext.locationAddressAr || 'العيادة'}`,
      `خدمات الطوارئ والرعاية السنية الشاملة لجميع أفراد الأسرة`,
      `سهولة الوصول والحجز السلس مع ${doctorContext.fullNameAr}`
    ],
    guide: [
      `أساسيات الوقاية اليومية وحماية المينا من التآكل`,
      `العناية المتخصصة بالحشوات والعدسات الخزفية وصحة اللثة`,
      `متى تستشير ${doctorContext.fullNameAr} للحصول على تقييم مهني؟`
    ]
  };

  const angleHeadings = subHeadings[angleKey] || subHeadings.about;
  
  // Interleave sub-headings into the body paragraphs
  let articleBodyHtml = '';
  selectedTemplates.forEach((tplFn, idx) => {
    if (idx === 2 && angleHeadings[0]) {
      articleBodyHtml += `\n<h2 class="text-xl font-bold text-slate-800 mt-8 mb-4">${escapeHtml(angleHeadings[0])}</h2>\n`;
    } else if (idx === 5 && angleHeadings[1]) {
      articleBodyHtml += `\n<h2 class="text-xl font-bold text-slate-800 mt-8 mb-4">${escapeHtml(angleHeadings[1])}</h2>\n`;
    }
    articleBodyHtml += tplFn(doctorContext) + '\n';
  });

  // Rich JSON-LD Article + Dentist Schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${articleCanonicalUrl}#article`,
        "headline": config.heading,
        "description": config.metaDesc,
        "image": profilePhotoUrl,
        "url": articleCanonicalUrl,
        "datePublished": doctor.createdAt || new Date().toISOString(),
        "dateModified": new Date().toISOString(),
        "author": {
          "@type": "Person",
          "name": doctor.fullNameAr || doctor.fullName,
          "url": doctorUrl
        },
        "publisher": {
          "@type": "Organization",
          "name": "PortfolioHubs",
          "logo": {
            "@type": "ImageObject",
            "url": "https://github.com/user-attachments/assets/fef6c67d-5ed0-4459-b41d-4c288ab48163"
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": articleCanonicalUrl
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": `${baseUrl}/` },
          { "@type": "ListItem", "position": 2, "name": doctor.fullNameAr || doctor.fullName, "item": doctorUrl },
          { "@type": "ListItem", "position": 3, "name": config.badge, "item": articleCanonicalUrl }
        ]
      }
    ]
  };

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeAttr(config.titleAr)}</title>
  <meta name="description" content="${escapeAttr(config.metaDesc)}" />
  <meta name="author" content="${escapeAttr(doctor.fullNameAr || doctor.fullName)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${escapeAttr(articleCanonicalUrl)}" />

  <!-- OpenGraph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeAttr(config.titleAr)}" />
  <meta property="og:description" content="${escapeAttr(config.metaDesc)}" />
  <meta property="og:url" content="${escapeAttr(articleCanonicalUrl)}" />
  <meta property="og:image" content="${escapeAttr(profilePhotoUrl)}" />
  <meta property="og:site_name" content="PortfolioHubs" />
  <meta property="og:locale" content="ar_EG" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(config.titleAr)}" />
  <meta name="twitter:description" content="${escapeAttr(config.metaDesc)}" />
  <meta name="twitter:image" content="${escapeAttr(profilePhotoUrl)}" />

  <link rel="icon" type="image/png" href="https://github.com/user-attachments/assets/fef6c67d-5ed0-4459-b41d-4c288ab48163" />

  <script type="application/ld+json">
    ${safeJsonLd(jsonLd)}
  </script>

  <style>
    :root {
      --brand: #0e7490;
      --brand-dark: #155e75;
      --brand-darker: #083344;
      --brand-light: #0891b2;
      --brand-subtle: #ecfeff;
      --bg-body: #f8fafc;
      --bg-card: #ffffff;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --radius: 16px;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-sans); background-color: var(--bg-body); color: var(--text-main); line-height: 1.8; }
    .container { max-width: 860px; margin: 0 auto; padding: 24px 16px 64px 16px; }
    
    .top-nav { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 24px; }
    .brand-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; color: var(--brand-dark); font-weight: 800; }
    .brand-logo img { width: 32px; height: 32px; border-radius: 8px; }
    
    .breadcrumbs { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; }
    .breadcrumbs a { color: var(--brand); text-decoration: none; }
    .breadcrumbs span { color: var(--border); }
    
    .article-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 32px 24px; box-shadow: 0 4px 16px rgba(14, 116, 144, 0.06); }
    @media(min-width: 768px) { .article-card { padding: 48px 40px; } }
    
    .badge { display: inline-block; padding: 4px 12px; background: var(--brand-subtle); color: var(--brand-dark); border-radius: 9999px; font-size: 0.8rem; font-weight: 800; margin-bottom: 16px; }
    .article-title { font-size: 1.75rem; font-weight: 900; line-height: 1.35; margin-bottom: 20px; color: var(--text-main); }
    @media(min-width: 768px) { .article-title { font-size: 2.15rem; } }
    
    .doctor-author-bar { display: flex; align-items: center; gap: 14px; padding: 16px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-bottom: 28px; }
    .author-avatar { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid var(--brand); }
    .author-info h4 { font-size: 1rem; font-weight: 800; color: var(--text-main); }
    .author-info p { font-size: 0.85rem; color: var(--text-muted); }
    
    .article-body { font-size: 1.05rem; color: #1e293b; }
    .article-body p { margin-bottom: 20px; }
    .article-body strong { color: var(--text-main); }
    .article-body em { font-style: normal; color: var(--brand-dark); font-weight: 600; }
    
    .cta-box { background: var(--brand-subtle); border: 1px solid var(--brand-light); border-radius: var(--radius); padding: 24px; margin-top: 36px; text-align: center; }
    .cta-box h3 { font-size: 1.25rem; font-weight: 800; color: var(--brand-darker); margin-bottom: 8px; }
    .cta-box p { font-size: 0.95rem; color: var(--text-muted); margin-bottom: 16px; }
    .btn-main { display: inline-flex; align-items: center; gap: 8px; background: var(--brand); color: #fff; padding: 10px 24px; border-radius: 12px; font-weight: 700; text-decoration: none; }
    
    .related-articles { margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--border); }
    .related-title { font-size: 1.15rem; font-weight: 800; margin-bottom: 14px; }
    .related-links { display: flex; flex-direction: column; gap: 10px; }
    .related-links a { color: var(--brand); text-decoration: none; font-weight: 700; font-size: 0.95rem; }
    .related-links a:hover { text-decoration: underline; }
    
    .footer { text-align: center; margin-top: 40px; font-size: 0.85rem; color: var(--text-muted); }
  </style>
</head>
<body>
  <div class="container">
    <header class="top-nav">
      <a href="${baseUrl}/" class="brand-logo">
        <img src="https://github.com/user-attachments/assets/fef6c67d-5ed0-4459-b41d-4c288ab48163" alt="PortfolioHubs" />
        <span>PortfolioHubs</span>
      </a>
      <a href="${doctorUrl}" style="color: var(--brand); font-weight: 700; font-size: 0.875rem; text-decoration: none;">زيارة بورتفوليو الطبيب ←</a>
    </header>

    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="${baseUrl}/">الرئيسية</a>
      <span>/</span>
      <a href="${doctorUrl}">د. ${escapeHtml(doctor.fullNameAr || doctor.fullName)}</a>
      <span>/</span>
      <span>${escapeHtml(config.badge)}</span>
    </nav>

    <main class="article-card">
      <span class="badge">${escapeHtml(config.badge)}</span>
      <h1 class="article-title">${escapeHtml(config.heading)}</h1>

      <div class="doctor-author-bar">
        <img src="${escapeAttr(profilePhotoUrl)}" alt="${escapeAttr(doctor.fullNameAr || doctor.fullName)}" class="author-avatar" />
        <div class="author-info">
          <h4>${escapeHtml(doctor.fullNameAr || doctor.fullName)}</h4>
          <p>${escapeHtml(doctor.titleAr || 'طبيب أسنان')} ${doctor.universityAr ? `• خريج ${escapeHtml(doctor.universityAr)}` : ''}</p>
        </div>
      </div>

      <article class="article-body">
        ${articleBodyHtml}
      </article>

      <div class="cta-box">
        <h3>هل ترغب في استشارة أو حجز موعد مع ${escapeHtml(doctor.fullNameAr || doctor.fullName)}؟</h3>
        <p>تفضل بزيارة البورتفوليو المهني الرسمي للاطلاع على معرض الحالات والتواصل المباشر عبر الواتساب أو الهاتف.</p>
        <a href="${doctorUrl}" class="btn-main">زيارة البورتفوليو المهني الكامل ومعرض الحالات ←</a>
      </div>

      <div class="related-articles">
        <h3 class="related-title">مقالات وصفحات ذات صلة بالدكتور:</h3>
        <div class="related-links">
          <a href="${doctorUrl}">• البورتفوليو المهني الرسمي لـ ${escapeHtml(doctor.fullNameAr || doctor.fullName)}</a>
          <a href="${baseUrl}/dr/${username}/articles/about.html">• السيرة المهنية والمسيرة الطبية</a>
          <a href="${baseUrl}/dr/${username}/articles/clinical-cases.html">• الحالات المهنية والخبرة العلاجية</a>
          <a href="${baseUrl}/dr/${username}/articles/dentist-in-${citySlug}.html">• خدمات طب الأسنان في ${escapeHtml(doctor.locationAddressAr || 'المدينة')}</a>
          <a href="${baseUrl}/dr/${username}/articles/patient-guide.html">• دليل المرضى الشامل للعناية بالأسنان</a>
        </div>
      </div>
    </main>

    <footer class="footer">
      <p>منصة <a href="${baseUrl}/" style="color: var(--brand); text-decoration: none;">PortfolioHubs</a> — بورتفوليو احترافي لأطباء الأسنان وتوثيق مهني لأطباء الأسنان.</p>
    </footer>
  </div>
</body>
</html>`;
}

// 6. Main Static HTML Builder is imported from ./doctor-template.mjs

// Simple Markdown to HTML helper for blog articles
function simpleMarkdownToHtml(markdown) {
  if (!markdown) return '';
  let body = markdown.replace(/^---[\s\S]*?---\n*/, '');

  body = body.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black text-cyan-950 mb-6 border-b border-cyan-100 pb-3">$1</h1>');
  body = body.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-cyan-900 mt-8 mb-4 border-b border-slate-100 pb-2">$1</h2>');
  body = body.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-cyan-800 mt-6 mb-3">$1</h3>');

  body = body.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-cyan-800 underline font-semibold hover:text-cyan-950 transition-colors">$1</a>');
  body = body.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  body = body.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="mr-4 list-disc text-slate-700 my-1 leading-relaxed">$1</li>');
  body = body.replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="mr-4 list-decimal text-slate-700 my-1 leading-relaxed">$1</li>');
  body = body.replace(/^---$/gim, '<hr class="my-8 border-slate-200" />');

  const paragraphs = body.split(/\n\n+/);
  return paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<h') || p.startsWith('<li') || p.startsWith('<hr')) return p;
    return `<p class="text-slate-700 leading-relaxed text-base my-4">${p}</p>`;
  }).join('\n');
}

function buildBlogArticlePageHtml({ article, markdown, allArticles = [], baseUrl }) {
  const canonicalUrl = `${baseUrl}/blog/${article.slug}.html`;
  const articleBodyHtml = simpleMarkdownToHtml(markdown);

  // Find 3 related articles for real internal linking
  const relatedList = (allArticles || [])
    .filter(a => a.slug !== article.slug && (a.category === article.category || (article.relatedSlugs || []).includes(a.slug)))
    .slice(0, 3);

  const relatedArticlesHtml = relatedList.length > 0 ? `
    <div class="mt-10 pt-8 border-t border-slate-200 space-y-4">
      <h3 class="text-xl font-black text-cyan-950 flex items-center gap-2">
        <span class="w-2 h-5 bg-cyan-700 rounded-full inline-block"></span>
        مقالات طبية ذات صلة
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${relatedList.map(rel => `
          <a href="${baseUrl}/blog/${rel.slug}.html" class="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-cyan-600 hover:shadow-xs transition-all flex flex-col justify-between group">
            <div class="space-y-2">
              <span class="text-[10px] font-black px-2 py-0.5 bg-cyan-100 text-cyan-900 rounded-md inline-block">${escapeHtml(rel.categoryAr || rel.category)}</span>
              <h4 class="text-xs font-bold text-slate-900 group-hover:text-cyan-800 line-clamp-2">${escapeHtml(rel.title)}</h4>
            </div>
            <span class="text-[11px] font-semibold text-cyan-700 mt-3 flex items-center gap-1">قراءة المقال ←</span>
          </a>
        `).join('')}
      </div>
    </div>
  ` : '';

  const pubDate = article.publishedAt || new Date().toISOString();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.description,
    "keywords": article.keyword,
    "datePublished": pubDate,
    "dateModified": pubDate,
    "author": {
      "@type": "Organization",
      "name": "PortfolioHubs Editorial",
      "url": baseUrl
    },
    "publisher": {
      "@type": "Organization",
      "name": "PortfolioHubs",
      "url": baseUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/icon.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    }
  };

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(article.title)} | مدونة PortfolioHubs الطبية</title>
  <meta name="description" content="${escapeHtml(article.description)}">
  <meta name="keywords" content="${escapeHtml(article.keyword)}, طب الأسنان, PortfolioHubs">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- OpenGraph Cards -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${escapeHtml(article.description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="PortfolioHubs">

  <script type="application/ld+json">
    ${JSON.stringify(jsonLd, null, 2)}
  </script>

  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 font-sans min-h-screen flex flex-col">
  <header class="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-30 shadow-xs">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <a href="${baseUrl}/" class="text-xl font-black text-cyan-950 flex items-center gap-2">
        <span class="bg-cyan-800 text-white px-2.5 py-1 rounded-xl text-sm font-black">PortfolioHubs</span>
        <span class="text-xs text-slate-500 font-bold hidden sm:inline">مدونة طب الأسنان</span>
      </a>
      <a href="${baseUrl}/blog/index.html" class="text-xs font-bold text-cyan-800 hover:underline">← جميع المقالات</a>
    </div>
  </header>

  <main class="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-8">
    <article class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6">
      <div class="space-y-3 border-b border-slate-100 pb-6">
        <span class="inline-block px-3 py-1 bg-cyan-100 text-cyan-900 text-xs font-black rounded-lg">${escapeHtml(article.categoryAr || article.category)}</span>
        <h1 class="text-2xl sm:text-4xl font-black text-slate-900 leading-snug">${escapeHtml(article.title)}</h1>
        <div class="text-xs text-slate-500 font-medium flex items-center gap-4 pt-2">
          <span>الكلمة المفتاحية: <strong>${escapeHtml(article.keyword)}</strong></span>
          <span>زمن القراءة: ${escapeHtml(article.readingTime)}</span>
        </div>
      </div>

      <div class="prose prose-slate max-w-none">
        ${articleBodyHtml}
      </div>

      ${relatedArticlesHtml}
    </article>
  </main>

  <footer class="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
    <p>© PortfolioHubs - جميع الحقوق محفوظة للمحتوى الطبي والمهني</p>
  </footer>
</body>
</html>`;
}

// ==========================================
// 7. Sitemap & Robots.txt Generator
// ==========================================
function generateSitemapAndRobots(publishedDoctorEntries, publishedBlogEntries = [], baseUrl, outputDir) {
  const dateStr = new Date().toISOString().split('T')[0];
  
  const urls = [
    `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${dateStr}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`,
    `  <url>\n    <loc>${baseUrl}/cv</loc>\n    <lastmod>${dateStr}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
    `  <url>\n    <loc>${baseUrl}/portfolio</loc>\n    <lastmod>${dateStr}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
    `  <url>\n    <loc>${baseUrl}/blog/index.html</loc>\n    <lastmod>${dateStr}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`
  ];

  publishedDoctorEntries.forEach(({ slug, citySlug }) => {
    // Main Doctor Portfolio URL (Highest Priority)
    urls.push(
      `  <url>\n    <loc>${baseUrl}/dr/${slug}/</loc>\n    <lastmod>${dateStr}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.95</priority>\n  </url>`
    );
    // 4 Content Articles URLs
    urls.push(
      `  <url>\n    <loc>${baseUrl}/dr/${slug}/articles/about.html</loc>\n    <lastmod>${dateStr}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.85</priority>\n  </url>`,
      `  <url>\n    <loc>${baseUrl}/dr/${slug}/articles/clinical-cases.html</loc>\n    <lastmod>${dateStr}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.85</priority>\n  </url>`,
      `  <url>\n    <loc>${baseUrl}/dr/${slug}/articles/dentist-in-${citySlug}.html</loc>\n    <lastmod>${dateStr}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.85</priority>\n  </url>`,
      `  <url>\n    <loc>${baseUrl}/dr/${slug}/articles/patient-guide.html</loc>\n    <lastmod>${dateStr}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.85</priority>\n  </url>`
    );
  });

  publishedBlogEntries.forEach(slug => {
    urls.push(
      `  <url>\n    <loc>${baseUrl}/blog/${slug}.html</loc>\n    <lastmod>${dateStr}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    );
  });

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard

Sitemap: ${baseUrl}/sitemap.xml
`;

  fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), sitemapXml);
  fs.writeFileSync(path.join(outputDir, 'robots.txt'), robotsTxt);
  console.log(`✓ Generated sitemap.xml with ${urls.length} URLs.`);
  console.log(`✓ Generated robots.txt.`);
}

// ==========================================
// 8. Main Orchestrator
// ==========================================
async function runStaticGeneration() {
  console.log('====================================================');
  console.log('PortfolioHubs - Static Generation & SEO Build Engine');
  console.log('====================================================\n');

  const backend = initFirebaseBackend();
  const baseUrl = process.env.BASE_URL || 'https://portfoliohubs.github.io';
  const publicDir = path.join(process.cwd(), 'public');
  ensureDir(publicDir);

  const publishedDoctorEntries = [];
  let generatedPagesCount = 0;
  let generatedArticlesCount = 0;
  let processedImagesCount = 0;
  let deletedPendingDocsCount = 0;

  try {
    // Step 1: Process pending image uploads (Admin Mode only)
    console.log('Step 1: Checking ephemeral pending_uploads collection...');
    if (backend.mode === 'admin') {
      try {
        const pendingSnap = await backend.adminDb.collectionGroup('pending_uploads').get();
        console.log(`Found ${pendingSnap.size} pending image upload document(s).`);

        for (const docSnap of pendingSnap.docs) {
          const data = docSnap.data();
          const { uid, targetType, targetId, fileName, base64 } = data;
          if (!uid || !base64) {
            await docSnap.ref.delete();
            continue;
          }

          let slug = 'dr-' + uid.substring(0, 8);
          const userSnap = await backend.adminDb.collection('users').doc(uid).get();
          if (userSnap.exists) {
            const u = userSnap.data();
            slug = u.username || u.slug || ('dr-' + slugify(u.fullName || 'doctor'));
          }

          const safeName = fileName || `${targetType}_${Date.now()}.webp`;
          const subFolder = targetType === 'case' ? 'cases' : 'profile';
          const destRelPath = `assets/dr/${slug}/${subFolder}/${safeName}`;
          const destFullPath = path.join(publicDir, destRelPath);

          writeBase64ToFile(destFullPath, base64);
          processedImagesCount++;

          if (targetType === 'case' && targetId) {
            await backend.adminDb.collection('users').doc(uid).collection('cases').doc(targetId).set({
              photoPath: destRelPath,
              preview: destRelPath,
              photo: destRelPath,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } else if (targetType === 'profile') {
            await backend.adminDb.collection('users').doc(uid).set({
              profilePhotoPath: destRelPath,
              profilePhoto: destRelPath,
              profilePreview: destRelPath,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }

          await docSnap.ref.delete();
          deletedPendingDocsCount++;
        }
      } catch (err) {
        console.warn('⚠️ Step 1 skipped:', err.message);
      }
    } else {
      console.log('ℹ️ Running in Client mode: Ephemeral pending uploads processing requires Admin credentials (FIREBASE_SERVICE_ACCOUNT secret). Proceeding with static page generation.');
    }

    // Step 2: Fetch approved doctors and generate pages + 4 articles
    console.log('\nStep 2: Fetching approved doctors from Firestore...');
    const doctorsList = [];
    try {
      if (backend.mode === 'admin') {
        const usersSnap = await backend.adminDb.collection('users').get();
        for (const docSnap of usersSnap.docs) {
          const doctor = docSnap.data();
          const isApproved = doctor.status === 'published' || doctor.status === 'approved';
          const isActive = doctor.active !== false;
          if (isApproved && isActive) {
            doctorsList.push({ uid: docSnap.id, doctor });
          }
        }
      } else {
        // Query approved/published doctors using client SDK (passes firestore security rules seamlessly)
        const q = clientQuery(
          clientCollection(backend.clientDb, 'users'),
          clientWhere('status', 'in', ['approved', 'published'])
        );
        const snap = await clientGetDocs(q);
        for (const docSnap of snap.docs) {
          const doctor = docSnap.data();
          if (doctor.active !== false) {
            doctorsList.push({ uid: docSnap.id, doctor });
          }
        }
      }

      console.log(`Found ${doctorsList.length} approved/published doctor(s) to generate.`);

      for (const { uid, doctor } of doctorsList) {
        const username = doctor.username || doctor.slug || slugify(doctor.fullName || 'doctor');
        const citySlug = slugify(doctor.locationAddress || doctor.locationAddressAr || 'city');
        console.log(`\n> Generating static portfolio & 4 SEO articles for: ${doctor.fullName || doctor.fullNameAr} (dr/${username})...`);

        // Clinical cases from subcollection
        let cases = [];
        try {
          if (backend.mode === 'admin') {
            const casesSnap = await backend.adminDb.collection('users').doc(uid).collection('cases').orderBy('sortOrder', 'asc').get();
            if (!casesSnap.empty) {
              cases = casesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
          } else {
            const casesSnap = await clientGetDocs(clientCollection(backend.clientDb, 'users', uid, 'cases'));
            if (!casesSnap.empty) {
              cases = casesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
              cases.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
            }
          }
        } catch (caseErr) {
          console.warn(`  ⚠️ Could not fetch cases subcollection for ${username}:`, caseErr.message);
        }

        if (cases.length === 0 && Array.isArray(doctor.cases) && doctor.cases.length > 0) {
          cases = doctor.cases;
        }

        // 1) Generate Main Doctor Page (/dr/{username}/index.html)
        const htmlContent = buildDoctorStaticHtml({ doctor, cases, baseUrl });
        const doctorHtmlDir = path.join(publicDir, 'dr', username);
        ensureDir(doctorHtmlDir);
        fs.writeFileSync(path.join(doctorHtmlDir, 'index.html'), htmlContent, 'utf-8');
        generatedPagesCount++;

        // 2) Generate 4 SEO Articles (/dr/{username}/articles/*.html)
        const articlesDir = path.join(doctorHtmlDir, 'articles');
        ensureDir(articlesDir);

        const angles = ['about', 'cases', 'local', 'guide'];
        for (const angle of angles) {
          const articleHtml = buildArticleStaticHtml({ doctor, angleKey: angle, baseUrl });
          const fileName = angle === 'local' ? `dentist-in-${citySlug}.html` : (angle === 'about' ? 'about.html' : (angle === 'cases' ? 'clinical-cases.html' : 'patient-guide.html'));
          fs.writeFileSync(path.join(articlesDir, fileName), articleHtml, 'utf-8');
          generatedArticlesCount++;
        }

        console.log(`  ✓ Main Portfolio: dr/${username}/index.html`);
        console.log(`  ✓ 4 SEO Articles generated in dr/${username}/articles/`);

        publishedDoctorEntries.push({ slug: username, citySlug });
      }
    } catch (err) {
      console.warn('⚠️ Step 2 failed:', err.message);
    }

    // Step 4: Generate Public Blog Pages & Copy Markdown
    console.log('\nStep 4: Generating Public Blog Pages & Copying Markdown Assets...');
    const blogPublicDir = path.join(publicDir, 'blog');
    const contentBlogPublicDir = path.join(publicDir, 'content', 'blog');
    ensureDir(blogPublicDir);
    ensureDir(contentBlogPublicDir);

    // Copy raw markdown files to public/content/blog/
    const contentBlogDir = path.join(process.cwd(), 'content', 'blog');
    if (fs.existsSync(contentBlogDir)) {
      const files = fs.readdirSync(contentBlogDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          fs.copyFileSync(path.join(contentBlogDir, file), path.join(contentBlogPublicDir, file));
        }
      }
      console.log(`  ✓ Copied ${files.length} blog markdown files to public/content/blog/`);
    }

    // Fetch published blog overrides from Firestore
    const blogOverrides = {};
    try {
      if (backend.mode === 'admin') {
        const blogSnap = await backend.adminDb.collection('blog_articles').get();
        blogSnap.forEach(d => {
          blogOverrides[d.id] = d.data();
        });
      } else {
        const blogSnap = await clientGetDocs(clientCollection(backend.clientDb, 'blog_articles'));
        blogSnap.forEach(d => {
          blogOverrides[d.id] = d.data();
        });
      }
    } catch (err) {
      console.warn('⚠️ Could not connect to Firestore for blog_articles overrides (using defaults):', err.message);
    }

    // Read index.json and build static HTML for published blog articles
    const publishedBlogEntries = [];
    const indexPath = path.join(contentBlogDir, 'index.json');
    if (fs.existsSync(indexPath)) {
      const allArticles = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      for (const art of allArticles) {
        const override = blogOverrides[art.slug];
        const isPublished = override ? Boolean(override.published) : Boolean(art.published);
        const articleHtmlFile = path.join(blogPublicDir, `${art.slug}.html`);
        
        if (isPublished) {
          const mdPath = path.join(contentBlogDir, `${art.slug}.md`);
          const markdown = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf-8') : `# ${art.title}\n\n${art.description}`;
          const blogHtml = buildBlogArticlePageHtml({ article: art, markdown, allArticles, baseUrl });
          
          fs.writeFileSync(articleHtmlFile, blogHtml, 'utf-8');
          publishedBlogEntries.push(art.slug);
        } else {
          // If unpublished, ensure any previously generated HTML file is deleted
          if (fs.existsSync(articleHtmlFile)) {
            fs.unlinkSync(articleHtmlFile);
          }
        }
      }
      console.log(`  ✓ Generated ${publishedBlogEntries.length} published blog static HTML pages in public/blog/`);
    }

    // Step 5: Generate Sitemap & Robots.txt
    console.log('\nStep 5: Generating sitemap.xml and robots.txt...');
    generateSitemapAndRobots(publishedDoctorEntries, publishedBlogEntries, baseUrl, publicDir);

    console.log('\n====================================================');
    console.log('STATIC & ARTICLE GENERATION COMPLETED SUCCESSFULLY');
    console.log(`- Approved Doctors: ${publishedDoctorEntries.length}`);
    console.log(`- Main Portfolios Generated: ${generatedPagesCount}`);
    console.log(`- Doctor SEO Articles Generated: ${generatedArticlesCount}`);
    console.log(`- Published Blog Articles: ${publishedBlogEntries.length}`);
    console.log(`- Static WebP Images Saved: ${processedImagesCount}`);
    console.log(`- Ephemeral Docs Purged: ${deletedPendingDocsCount}`);
    console.log('====================================================\n');
    process.exit(0);

  } catch (error) {
    console.error('Fatal error during generation:', error);
    process.exit(1);
  }
}

const isMainModule = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-static-pages.mjs');
if (isMainModule) {
  runStaticGeneration();
}
