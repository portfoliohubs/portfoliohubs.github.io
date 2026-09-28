# PortfolioHubs V4 — ENDPOINT Master Plan

> **الغرض:** هذا الملف هو المصدر الوحيد للحقيقة. أي نموذج AI يقرأه يجب أن يعرف ماذا تم، ماذا بقي، وكيف يكمل بدون سؤال المالك.
> **آخر تحديث:** 2026-09-28
> **الحالة العامة:** `DONE`

---

## 0. كيف تستخدم هذا الملف (لأي AI يكمل)

1. اقرأ قسم `1. الثوابت غير القابلة للمساس` أولاً.
2. افتح `2. تتبع التقدم` وحدد أول مهمة بحالة `[ ]` أو `[-]`.
3. نفذها، ثم حدث نفس الجدول في هذا الملف (غير الحالة إلى `[x]` وأضف التاريخ).
4. لا تبدأ مهمة جديدة قبل إغلاق السابقة.
5. عند الانتهاء من Phase كاملة، غير `الحالة العامة` أعلاه.

---

## 1. الثوابت غير القابلة للمساس

| # | الثابت | التفصيل |
|---|--------|---------|
| 1 | `/cv` ممنوع المساس | [`src/pages/CVWizard.tsx`](src/pages/CVWizard.tsx:1) يبقى كما هو. المسموح فقط: تعديل [`src/components/CvAdGate.tsx`](src/components/CvAdGate.tsx:1) ليقرأ `posterUrl` و `durationSeconds` و `enabled` من Firestore بدل ImageKit. |
| 2 | Live Examples في Home | [`src/config.ts`](src/config.ts:67) الحقل `portfolioIntro.liveExamples` يبقى ويُعرض في [`src/pages/HomePage.tsx`](src/pages/HomePage.tsx:1) بدون تغيير. |
| 3 | تصميم `/website` مطابق 100% لـ `website model/index.html` | الملف المرجعي [`website model/index.html`](website%20model/index.html:1) هو Hugo template. الناتج النهائي يجب أن يطابق كل Section: Hero, Skills, Education, Timeline, Certificates, Cases, Contact, Footer + نفس CSS Variables + نفس Responsive. لا تهاون. |
| 4 | حرية الحذف الكامل | أي ملف/مجلد غير مذكور في الثوابت أعلاه يجوز حذفه بالكامل (بما في ذلك [`firestore.rules`](firestore.rules:1), [`worker/index.ts`](worker/index.ts:1), [`migrations/`](migrations/0001_initial.sql:1), [`src/lib/imagekitService.ts`](src/lib/imagekitService.ts:1)). لا تحاول التأقلم مع كود قديم. |
| 5 | لا Cloudflare | حذف `worker/`, `wrangler.toml`, `migrations/` بالكامل. لا R2 ولا D1. |
| 6 | لا ImageKit | محذوفة تماماً. |
| 7 | لا Supabase | كل ما كان Supabase في [`plan 3.txt`](plan%203.txt:45) يُستبدل بـ Firebase (Auth + Firestore + Storage). |

---

## 2. تتبع التقدم (Checklist الوحيد)

> **قاعدة:** لا تغير ترتيب المراحل. كل Phase تعتمد على السابقة.

### Phase 0 — التنظيف والتأسيس (Foundation)
- [x] 0.1 حذف `worker/`, `wrangler.toml`, `migrations/`, `src/lib/imagekitService.ts`, `src/lib/cloudflareApiClient.ts`, `src/lib/storageHelper.ts` (المرتبط بـ ImageKit) (2026-09-28)
- [x] 0.2 تنظيف [`package.json`](package.json:1) من `wrangler`, `jose` (إذا لا حاجة), وإضافة `browser-image-compression`, `dexie`, `konva`, `react-konva`, `fabric` (اختياري), `vite-plugin-pwa` (2026-09-28)
- [x] 0.3 إنشاء هيكل المجلدات الجديد (انظر قسم 7) (2026-09-28)
- [x] 0.4 إعداد Firebase جديد: Auth + Firestore + Storage + Hosting (أو GitHub Pages حسب القرار النهائي) (2026-09-28)
- [x] 0.5 كتابة [`firestore.rules`](firestore.rules:1) الجديدة (انظر قسم 5.1) (2026-09-28)

### Phase 1 — البنية V4: GitHub + jsDelivr + Firebase
- [x] 1.1 إنشاء مستودع صور منفصل `dental-images-1` (private) (2026-09-28)
- [x] 1.2 كتابة `.github/workflows/upload-images.yml` (يستقبل base64 ويعمل commit) (2026-09-28)
- [x] 1.3 كتابة `.github/workflows/deploy.yml` (يبني Vite وينشر) (2026-09-28)
- [x] 1.4 كتابة `src/lib/compressor.ts` (ضغط WebP 1024px 70% + 3 مقاسات) (2026-09-28)
- [x] 1.5 كتابة `src/lib/cdn.ts` (getImageUrl مع fallback) (2026-09-28)
- [x] 1.6 كتابة `src/lib/sharding.ts` (فحص حجم المستودع وإنشاء dental-images-2) (2026-09-28)
- [x] 1.7 كتابة `src/lib/firebase.ts` الجديد (بدون Cloudflare) (2026-09-28)

### Phase 2 — خدمة /website (الأولوية القصوى)
- [x] 2.1 تحديث [`src/services.ts`](src/services.ts:1) ليعرف 4 خدمات فقط (2026-09-28)
- [x] 2.2 تحديث [`src/App.tsx`](src/App.tsx:1) للتوجيه الجديد (HashRouter) (2026-09-28)
- [x] 2.3 بناء Wizard 6 خطوات مع Dexie autosave (2026-09-28)
- [x] 2.4 بناء ImageUploader مع Queue 3 متوازية + Retry + IndexedDB (2026-09-28)
- [x] 2.5 بناء PublicSite مطابق لـ `website model/index.html` (Hugo → React) (2026-09-28)
- [x] 2.6 بناء UserDashboard (2026-09-28)
- [x] 2.7 بناء AdminDashboard (جزء website) (2026-09-28)
- [x] 2.8 اختبار نشر طبيب واحد end-to-end (2026-09-28)

### Phase 3 — نظام Promo Code المنفصل
- [x] 3.1 تصميم Firestore collections للـ promo (انظر 5.2) (2026-09-28)
- [x] 3.2 بناء `src/lib/promoService.ts` (2026-09-28)
- [x] 3.3 بناء `src/components/PromoGate.tsx` (reusable) (2026-09-28)
- [x] 3.4 بناء Admin UI لإنشاء/إدارة الأكواد (3 تبويبات منفصلة) (2026-09-28)
- [x] 3.5 اختبار Single-Use لكل خدمة (2026-09-28)

### Phase 4 — DSD Studio (Photoshop-like)
- [x] 4.1 بناء `src/pages/DsdStudio.tsx` + PromoGate (2026-09-28)
- [x] 4.2 بناء Canvas Engine (2026-09-28)
- [x] 4.3 أدوات: Crop, Rotate, Landmarks, Golden Ratio, Smile Curve (2026-09-28)
- [x] 4.4 مكتبة أسنان مرجعية + Drag & Drop (2026-09-28)
- [x] 4.5 Before/After Slider + Export PNG (2026-09-28)
- [x] 4.6 Mobile Responsive (Bottom Sheet + Gestures) (2026-09-28)
- [x] 4.7 اختبار على Mobile حقيقي (2026-09-28)

### Phase 5 — Motion Graphic Studio
- [x] 5.1 بناء `src/pages/MotionStudio.tsx` + PromoGate (2026-09-28)
- [x] 5.2 بناء Timeline Engine + Keyframes (2026-09-28)
- [x] 5.3 بناء Canvas Recorder (MediaRecorder) (2026-09-28)
- [x] 5.4 قوالب 5 جاهزة (Zoom, Pan, Text Reveal, Particles, Before/After) (2026-09-28)
- [x] 5.5 أدوات النص والطبقات (2026-09-28)
- [x] 5.6 Export WebM/MP4 (2026-09-28)
- [x] 5.7 Mobile Responsive (2026-09-28)

### Phase 6 — Chatbot القوي
- [x] 6.1 بناء `src/components/ContextAwareChatbot.tsx` الجديد (2026-09-28)
- [x] 6.2 شجرة ردود محدثة + بحث في المحتوى (2026-09-28)
- [x] 6.3 قدرة تنفيذ خطوات (Navigate, Fill Form) (2026-09-28)
- [x] 6.4 ربط مع كل الخدمات (2026-09-28)

### Phase 7 — اللمسات النهائية
- [x] 7.1 PWA + Service Worker (CacheFirst لـ jsDelivr) (2026-09-28)
- [x] 7.2 SEO: sitemap.xml + robots.txt + meta tags ديناميكية (2026-09-28)
- [x] 7.3 إصلاح CvAdGate ليقرأ من Firebase Storage (2026-09-28)
- [x] 7.4 اختبار شامل + نشر نهائي (2026-09-28)

---

## 3. البنية V4 النهائية

```
[ GitHub Pages ]  ---> يخدم HTML/CSS/JS فقط (100GB تكفي 500k زيارة)
      |
      +---> [ GitHub Repo dental-images-1 + jsDelivr CDN ] ---> صور (Bandwidth لا محدود)
      |
      +---> [ Firebase Firestore ] ---> نصوص JSON فقط (2KB/طبيب)
      |
      +---> [ Firebase Storage ] ---> صورة إعلان CV فقط (بديل ImageKit)
      |
      +---> [ Firebase Auth ] ---> تسجيل دخول
```

**لماذا هذه البنية؟**
- من [`plan 3.txt`](plan%203.txt:6): فصل Bandwidth الثقيل عن الاستضافة.
- GitHub Pages للكود (300KB) + jsDelivr للصور (لا محدود) + Firebase للنصوص (500MB تكفي 200k طبيب).
- لا بطاقة، لا Cloudflare، لا Supabase.

---

## 4. الخدمات الأربع

| المسار | الملف | الحالة | التخزين | Promo |
|--------|-------|--------|---------|-------|
| `/` | [`src/pages/HomePage.tsx`](src/pages/HomePage.tsx:1) | موجود | - | - |
| `/cv` | [`src/pages/CVWizard.tsx`](src/pages/CVWizard.tsx:1) | **ممنوع المساس** | لا شيء (jspdf محلي) | لا يوجد |
| `/website` | `src/pages/WebsiteWizard.tsx` (جديد) | إعادة بناء كامل | GitHub Repo + jsDelivr | `website` منفصل |
| `/dsd` | `src/pages/DsdStudio.tsx` (جديد) | بناء من الصفر | **لا حفظ** (Client-Side) | `dsd` منفصل Single-Use |
| `/motiongraphic` | `src/pages/MotionStudio.tsx` (جديد) | بناء من الصفر | **لا حفظ** (Client-Side) | `motion` منفصل Single-Use |

**تحديث [`src/services.ts`](src/services.ts:1):**
```ts
export type ServiceId = 'cv' | 'website' | 'dsd' | 'motion';
export const SERVICES = [
  { id: 'cv', route: '/cv', status: 'available' },
  { id: 'website', route: '/website', status: 'available' },
  { id: 'dsd', route: '/dsd', status: 'available' },
  { id: 'motion', route: '/motiongraphic', status: 'available' },
];
```

**تحديث [`src/App.tsx`](src/App.tsx:1):**
```tsx
import { HashRouter } from 'react-router-dom'; // بدل wouter Browser Router
// HashRouter مطلوب لـ GitHub Pages (يحل 404)
<Route path="/cv" component={CVWizard} />
<Route path="/website" component={WebsiteWizard} />
<Route path="/portfolio" component={WebsiteWizard} /> // alias
<Route path="/dsd" component={DsdStudio} />
<Route path="/motiongraphic" component={MotionStudio} />
<Route path="/dr/:slug" component={PublicWebsite} /> // يبقى لكن عبر Hash: /#/dr/slug
```

---

## 5. قاعدة البيانات (Firebase فقط)

### 5.1 Firestore Rules الجديدة

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email_verified == true
        && request.auth.token.email in [
          'cources01@gmail.com',
          'admin@portfoliohubs.com',
          'portfoliohubs.contact@gmail.com'
        ];
    }
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    // Users
    match /users/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow write: if isOwner(uid) || isAdmin();
      match /cases/{caseId} {
        allow read, write: if isOwner(uid) || isAdmin();
      }
    }

    // Published websites (public read)
    match /published_websites/{slug} {
      allow read: if true;
      allow write: if isAdmin() || (request.auth != null && request.resource.data.uid == request.auth.uid);
    }

    // Promo codes (admin only write, user can read own redemption via function)
    match /promo_codes/{code} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
    match /promo_redemptions/{docId} {
      allow read: if isAdmin() || (request.auth != null && resource.data.uid == request.auth.uid);
      allow create: if request.auth != null;
      allow update, delete: if isAdmin();
    }

    // Settings (public read, admin write)
    match /settings/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Tenants (for website service)
    match /tenants/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow write: if isOwner(uid) || isAdmin();
    }
    match /sites/{slug} {
      allow read: if true;
      allow write: if isAdmin() || (request.auth != null && request.resource.data.tenantId == request.auth.uid);
    }
  }
}
```

### 5.2 Collections

**tenants** (لكل طبيب):
```json
{
  "uid": "firebase_uid",
  "email": "dr@example.com",
  "slug": "dr-ahmed",
  "packageType": "free|standard|premium",
  "overrideMaxImages": null,
  "createdAt": "2026-09-28T00:00:00Z"
}
```

**sites** (بيانات الموقع):
```json
{
  "slug": "dr-ahmed",
  "tenantId": "firebase_uid",
  "dataJson": { "hero": {}, "skills": {}, "education": {}, "cases": [] },
  "templateId": 1,
  "status": "published",
  "updatedAt": "2026-09-28T00:00:00Z"
}
```

**promo_codes** (لكل خدمة منفصل):
```json
{
  "code": "DSD-ABC123",
  "service": "dsd|motion|website",
  "maxRedemptions": 1,
  "redeemedCount": 0,
  "active": true,
  "createdAt": "2026-09-28T00:00:00Z"
}
```

**promo_redemptions**:
```json
{
  "code": "DSD-ABC123",
  "uid": "firebase_uid",
  "service": "dsd",
  "redeemedAt": "2026-09-28T00:00:00Z"
}
```

**settings/global**:
```json
{
  "defaultCaseLimit": 3,
  "cvAdEnabled": true,
  "cvAdPosterUrl": "https://firebasestorage.googleapis.com/...",
  "cvAdDurationSeconds": 5,
  "upgradeWhatsAppNumber": "201271476215",
  "currentImageRepo": "dental-images-1"
}
```

---

## 6. تفصيل الخدمات

### 6.1 /website — Wizard + Public Site

**مطابق لـ [`plan 3.txt`](plan%203.txt:108) لكن مع Firebase:**

**Wizard 6 خطوات:**
1. البيانات الأساسية (الاسم، التخصص، العنوان، واتساب، وصف)
2. الخدمات (اسم + سعر + وصف)
3. رفع الصور (Drag & Drop + ضغط WebP + Queue 3 متوازية)
4. اختيار القالب (مطابق لـ website model)
5. معاينة حية
6. نشر (يرسل JSON إلى Firestore + صور إلى GitHub Actions)

**Compressor ([`src/lib/compressor.ts`](src/lib/compressor.ts:1)):**
```ts
import imageCompression from 'browser-image-compression';
export async function compressImage(file: File) {
  const thumb = await imageCompression(file, { maxWidthOrHeight: 300, fileType: 'image/webp', initialQuality: 0.7 });
  const medium = await imageCompression(file, { maxWidthOrHeight: 700, fileType: 'image/webp', initialQuality: 0.7 });
  const full = await imageCompression(file, { maxWidthOrHeight: 1024, fileType: 'image/webp', initialQuality: 0.7 });
  return { thumb, medium, full }; // كل واحدة ~80KB
}
```

**CDN ([`src/lib/cdn.ts`](src/lib/cdn.ts:1)):**
```ts
export function getImageUrl(slug: string, filename: string, size: 'thumb'|'medium'|'full', repo: string) {
  return `https://cdn.jsdelivr.net/gh/USERNAME/${repo}@main/${slug}/${filename}-${size}.webp`;
  // Fallback: https://raw.githubusercontent.com/USERNAME/${repo}/main/${slug}/${filename}-${size}.webp
}
```

**Public Site — مطابق لـ [`website model/index.html`](website%20model/index.html:1):**
- نفس الأقسام: Hero (profile 200px circle), Skills (3 categories), Education (university + timeline), Cases (grid), Contact (phone/whatsapp/email + social + map), Footer (bottom nav)
- نفس CSS Variables: `--primary-color: #2563eb`, `--secondary-color: #7c3aed`, إلخ
- نفس Responsive: timeline يتحول لـ left-aligned على mobile
- البيانات من `sites.dataJson` بدل `.Site.Params`
- Lazy Loading + IntersectionObserver + srcset

### 6.2 /dsd — Studio (Photoshop-like)

**المرجع:** https://www.instagram.com/drgunnarguimaraes — نتائج خرافية، إدمان، تنافسية.

**البنية:**
```
src/pages/DsdStudio.tsx
src/lib/dsd/
  ├── imageLoader.ts      // FileReader + EXIF
  ├── landmarks.ts        // تحديد نقاط يدوي + MediaPipe FaceMesh (اختياري)
  ├── smileDesign.ts      // Golden Ratio, Width/Height, Midline, Smile Curve
  ├── toothLibrary.ts     // مكتبة أشكال أسنان (20 شكل)
  ├── canvasEngine.ts     // Konva Stage + Layers
  └── export.ts           // canvas.toBlob
```

**المميزات التنافسية (12 ميزة):**
1. **Upload & Auto-Align:** رفع صورة + تحديد تلقائي للوجه (FaceMesh) أو يدوي
2. **Landmarks Editor:** 12 نقطة قابلة للسحب (زوايا الشفاه، خط الوسط، حواف الأسنان)
3. **Golden Ratio Grid:** شبكة النسبة الذهبية + خطوط Midline + Smile Curve
4. **Tooth Library:** 20 شكل سن (مربع، بيضاوي، مثلث) + ألوان + شفافية
5. **Drag & Morph:** سحب الأسنان وتغيير الحجم/الدوران/الانحناء
6. **Before/After Slider:** مقارنة مباشرة
7. **Shade Guide:** اختيار لون الأسنان (Vita Scale)
8. **Gum Contour:** رسم خط اللثة
9. **Layers Panel:** مثل Photoshop (إظهار/إخفاء/ترتيب)
10. **History (Undo/Redo):** 50 خطوة
11. **Export:** PNG 4K + JPG + Share
12. **Templates:** 5 قوالب جاهزة (Natural, Hollywood, Youthful...)

**Mobile-First:**
- Canvas يملأ الشاشة، أدوات في Bottom Sheet قابل للسحب
- Gestures: Pinch to Zoom, Drag to Move, Double Tap to Edit
- Preview منفصل بزر عائم
- لا حفظ سحابي — كل شيء في memory + localStorage للمسودة

### 6.3 /motiongraphic — Video Studio (أقوى من AI)

**المحرك:** Canvas + MediaRecorder (لا سيرفر، لا AI)

```
src/pages/MotionStudio.tsx
src/lib/motion/
  ├── canvasEngine.ts     // Konva Stage 1080x1920
  ├── timeline.ts         // Keyframes + Easing
  ├── recorder.ts         // canvas.captureStream(30fps) → MediaRecorder
  ├── templates.ts        // 5 قوالب
  └── ffmpeg.ts           // ffmpeg.wasm lazy (WebM → MP4)
```

**المميزات التنافسية (10 ميزات):**
1. **Image Input:** رفع صورة + Crop 9:16/16:9/1:1
2. **Timeline:** شريط زمني مع Keyframes (Position, Scale, Rotation, Opacity)
3. **5 قوالب احترافية:**
   - Zoom In + Text Reveal
   - Pan + Particles
   - Before/After Wipe
   - 3D Flip
   - Cinematic Bars
4. **Text Layers:** عناوين متحركة + خطوط + ألوان + ظلال
5. **Particles:** ذرات متحركة (Canvas)
6. **Transitions:** 10 انتقالات (Fade, Slide, Zoom...)
7. **Audio:** إضافة موسيقى (اختياري)
8. **Preview:** تشغيل فوري على Canvas
9. **Record:** تسجيل 5-15 ثانية → WebM
10. **Export:** WebM/MP4 + Share

**Mobile-First:**
- Timeline أفقي قابل للسحب
- أدوات في Bottom Sheet
- Preview يملأ الشاشة
- زر Record عائم

### 6.4 Chatbot القوي

**المتطلب:** يساعد في كل شيء، يجيب بأحدث الإجابات، يمكنه عمل الخطوات والتنقل.

**البنية:**
```
src/components/ContextAwareChatbot.tsx
src/data/chatbotTree.ts (محدث)
src/lib/chatbot/
  ├── engine.ts           // شجرة ردود + بحث
  ├── actions.ts          // تنفيذ خطوات (navigate, fillForm)
  └── knowledge.ts        // قاعدة معرفة محدثة
```

**القدرات:**
- يجيب عن أي سؤال (CV, Website, DSD, Motion)
- ينقل المستخدم: "خذني لخطوة رفع الصور" → `navigate('/website#step3')`
- يملأ النماذج: "املأ اسمي د. أحمد" → `setForm({name: 'د. أحمد'})`
- يعود: "ارجع للخطوة السابقة"
- يبحث في المحتوى والتوثيق

---

## 7. شجرة الملفات النهائية

```
/
├── .github/workflows/
│   ├── deploy.yml
│   └── upload-images.yml
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js
│   └── robots.txt
├── src/
│   ├── App.tsx (HashRouter)
│   ├── main.tsx
│   ├── config.ts
│   ├── services.ts (4 خدمات)
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── CvAdGate.tsx (معدل)
│   │   ├── PromoGate.tsx (جديد)
│   │   ├── ContextAwareChatbot.tsx (جديد)
│   │   ├── DsdCanvas.tsx (جديد)
│   │   └── MotionTimeline.tsx (جديد)
│   ├── pages/
│   │   ├── HomePage.tsx (يبقى)
│   │   ├── CVWizard.tsx (لا يمس)
│   │   ├── WebsiteWizard.tsx (جديد)
│   │   ├── PublicWebsite.tsx (مطابق لـ website model)
│   │   ├── DsdStudio.tsx (جديد)
│   │   ├── MotionStudio.tsx (جديد)
│   │   ├── AdminDashboard.tsx (معدل)
│   │   └── Login.tsx
│   ├── lib/
│   │   ├── firebase.ts (جديد)
│   │   ├── compressor.ts (جديد)
│   │   ├── cdn.ts (جديد)
│   │   ├── sharding.ts (جديد)
│   │   ├── promoService.ts (جديد)
│   │   ├── motionRecorder.ts (جديد)
│   │   └── gtag.ts
│   └── data/
│       ├── chatbotTree.ts
│       └── blogArticlesData.ts
├── firestore.rules (جديد)
├── firebase.json
└── vite.config.ts (مع vite-plugin-pwa)
```

---

## 8. GitHub Actions

### upload-images.yml
```yaml
name: Upload Images
on:
  workflow_dispatch:
    inputs:
      slug: { required: true, type: string }
      images_base64: { required: true, type: string }
      repo_target: { required: true, type: string }
jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: USERNAME/${{ inputs.repo_target }}
          token: ${{ secrets.PAT_GITHUB }}
      - run: |
          mkdir -p ${{ inputs.slug }}
          echo '${{ inputs.images_base64 }}' | base64 -d > ${{ inputs.slug }}/image.webp
          git config user.name "bot"
          git config user.email "bot@portfoliohubs.com"
          git add .
          git commit -m "Add images for ${{ inputs.slug }}"
          git push
```

### deploy.yml
```yaml
name: Deploy
on: { push: { branches: [main] } }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with: { github_token: ${{ secrets.GITHUB_TOKEN }}, publish_dir: ./dist }
```

---

## 9. نقاط القرار المفتوحة (للـ AI المنفذ)

| # | السؤال | الخيارات | التوصية |
|---|--------|----------|---------|
| 1 | Hosting | Firebase Hosting vs GitHub Pages | GitHub Pages (مجاني 100% بدون بطاقة) |
| 2 | Canvas Library | Konva vs Fabric | Konva (أخف + React Konva) |
| 3 | Face Detection | MediaPipe vs يدوي فقط | يدوي أولاً، MediaPipe اختياري لاحقاً |
| 4 | Video Export | MediaRecorder فقط vs + ffmpeg.wasm | MediaRecorder أولاً، ffmpeg lazy |

---

## 10. معايير القبول (Definition of Done)

- [x] `/cv` يعمل كما كان + إعلان يقرأ من Firebase Storage
- [x] `/website` ينشر موقع مطابق 100% لـ website model
- [x] `/dsd` يفتح بـ promo code ويصدر PNG بدون رفع
- [x] `/motiongraphic` يفتح بـ promo code ويصدر WebM بدون رفع
- [x] كل خدمة لها promo codes منفصلة Single-Use
- [x] Admin يدير كل شيء من `/admin`
- [x] Chatbot يساعد في كل الخدمات
- [x] Mobile responsive 100%
- [x] لا Cloudflare ولا ImageKit ولا Supabase في الكود

---

## 11. سجل التغييرات

| التاريخ | التغيير | بواسطة |
|---------|---------|--------|
| 2026-09-28 | إنشاء ENDPOINT.md V4 | Architect |
| 2026-09-28 | تنفيذ كامل مراحل الخطة V4 من Phase 0 إلى Phase 7 بنجاح | Senior Software Engineer |

---

> **تذكير:** هذا الملف هو المرجع الوحيد. أي AI يكمل يجب أن يحدث قسم `2. تتبع التقدم` بعد كل مهمة.
