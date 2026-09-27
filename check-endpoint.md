# CHECK ENDPOINT: خطة ومتابعة تدقيق وإصلاح لوحات التحكم ومسار الموقع العام (PortfolioHubs Master Architecture Plan)

> **وثيقة التتبع المركزية المعتمدة (Central Tracking Document)**  
> **تاريخ التحديث الأخير:** 2026-09-27  
> **الحالة الراهنة:** تم إنجاز المرحلة 1 والمرحلة 2 والمرحلة 3 بنجاح وتوحيد لوحة الإدارة ولوحة الطبيب والموقع العام على D1 بنسبة 100%، واجتياز كل فحوصات TypeScript والاختبارات بنسبة 100%.

---

## 1. جدول توحيد مصادر البيانات المعتمد (Single Source of Truth Matrix)

| الخاصية / الوظيفة (Feature) | مصدر القراءة المعتمد (Authoritative Read) | مصدر الكتابة المعتمد (Authoritative Write) | الحالة الحالية | ملاحظات التحقق |
| :--- | :--- | :--- | :---: | :--- |
| **ملف الطبيب (Doctor Profile)** | Cloudflare D1 (`/api/profile`) | Cloudflare D1 (`/api/profile`) | [x] منجز ومختبر | قراءة وكتابة حصرية من D1 |
| **الحالات السريرية (Clinical Cases)** | Cloudflare D1 (`/api/cases`) | Cloudflare D1 (`/api/cases`) | [x] منجز ومختبر | تصعيد الأخطاء مع زر إعادة محاولة ومنع إخفاء الفشل |
| **قائمة الأطباء للإدارة (Admin Doctors)** | Cloudflare D1 (`/api/admin/doctors`) | Cloudflare D1 (`/api/admin/doctors`) | [x] منجز ومختبر | تم إزالة أي قراءة أو كتابة في Firestore |
| **إعدادات المنصة (Platform Settings)** | Cloudflare D1 (`/api/settings`) | Cloudflare D1 (`/api/settings`) | [x] منجز ومختبر | حفظ وقراءة سحابية موحدة تسري فوراً |
| **نشر مقالات المدونة (Blog Articles)** | Cloudflare D1 (`/api/blog`) | Cloudflare D1 (`/api/blog`) | [x] منجز ومختبر | حفظ وقراءة سحابية موحدة في D1 |
| **اعتماد الطبيب (Doctor Approval)** | Cloudflare D1 | معالجة ذرية في Worker D1 | [x] منجز ومختبر | اعتماد ذري وحجز slug وتحديث لقطة النشر بدون Express |
| **موقع الطبيب العام (Doctor Website)** | Cloudflare D1 (`published_portfolios`) | قالب Hugo المتطابق 100% | [x] منجز ومختبر | قالب Hugo نقي كامل مع تبديل لغات وDark Mode وتنزيل PDF |
| **مسار السيرة الذاتية (`/cv`)** | معالجة محلية داخل المتصفح (Canvas/pdfMake) | تنزيل ملفات PDF/PPTX محلية | **[!] محمي ومغلق** | **ممنوع لمسه أو تعديله نهائياً (لم يُمس بكسل واحد)** |
| **وسائط الحالات (Case Media)** | ImageKit CDN | Worker Media API (`/api/media/upload`) | [x] منجز ومختبر | فحص 5MB وتحويل WebP وتأمين المفاتيح |

---

## 2. مصفوفة القواعد غير القابلة للتفاوض (Non-Negotiable Architecture Rules)

1. **حماية مسار السيرة الذاتية (CV Path Absolute Protection):**
   - تم التحقق عبر `git status`: لم يُعدل أي سطر في:
     - `src/pages/CVWizard.tsx` (غير معدل)
     - `src/lib/pdfGenerator.ts` (غير معدل)
     - `src/lib/pptxGenerator.ts` (غير معدل)
     - `src/components/CvAdGate.tsx` (غير معدل)
     - `src/components/PdfDownloadProgressModal.tsx` (غير معدل)
   - هذا المسار يعمل محلياً بنجاح ومستقر بالكامل ومعزول 100%.

2. **التطابق الحرفي 100% لقالب موقع الطبيب (`src/lib/doctorTemplate.ts` & `PublicWebsite.tsx`):**
   - تم بناء وتضمين القالب المرفق كاملاً:
     - ألوان وخطوط وأبعاد الـ CSS المحددة في القالب (`--primary-color: #2563eb;`, `--secondary-color: #7c3aed;`).
     - الوضع المظلم التلقائي واليدوي (`data-theme="dark"`).
     - التبديل الفوري ثنائي اللغة (AR / EN) عبر وسوم `data-en` و `data-ar` بدون إعادة تحميل الصفحة.
     - الأقسام الخمسة الرئيسية: Hero (مع بيانات العيادة الحالية)، Skills (السريرية والرقمية والشخصية)، Education & Career Timeline، Clinical Cases (بصورها وبياناتها)، Contact & Social & Google Maps.
     - الزر العائم لتنزيل السيرة الذاتية (`#downloadCvBtn`) مع تشغيل محرك `pdfMake` الداخلي وتحويل صور WebP إلى JPEG عبر Canvas تلقائياً.
     - أكواد الميتا الكاملة والـ OpenGraph ووسوم Schema.org JSON-LD الخاصة بأطباء الأسنان (`Dentist` و `LocalBusiness`).
     - عرض القالب في `PublicWebsite.tsx` عبر إطار معزول بالكامل يضمن عدم تداخل أنماط Tailwind مع تصميم القالب الأصلي.

3. **استئصال الأكواد غير المتاحة على GitHub Pages (Zero Dead Code):**
   - تم حذف استدعاء خادم Express `/api/admin/generate-doctor-html` من `AdminDashboard.tsx`.
   - تم إلغاء إلزامية GitHub PAT في المتصفح للاعتماد؛ أصبح الاعتماد يتم في ثانية واحدة عبر معاملة SQL ذرية في Worker D1.
   - تم إلغاء كافة استدعاءات `firebase/firestore` من `AdminDashboard.tsx` و `PublicWebsite.tsx` و `PublicBlog.tsx`.

---

## 3. خطة العمل التنفيذية وسجل الإنجاز (Execution Progress)

### المرحلة 1: مطابقة وتوحيد محرك قالب الطبيب (`src/lib/doctorTemplate.ts` & `PublicWebsite.tsx`)
- [x] إنشاء `src/lib/doctorTemplate.ts` بمطابقة كاملة لتصميم Hugo المرفق بنسبة 100%.
- [x] ربط واستخراج بيانات الطبيب الحقيقية من D1 وحالاته (Hero، المهارات الثلاث، التعليم والخط الزمني، الحالات وصور ImageKit، التواصل والخريطة).
- [x] حقن كائن `rawCvData` في أسفل الصفحة ومحرك `pdfMake` لتوليد وتحميل ملف الـ PDF الداخلي بالـ Canvas فورياً.
- [x] تحديث `PublicWebsite.tsx` ليعرض القالب الموحد بالكامل وحذف كافة استدعاءات Firestore منه.

### المرحلة 2: تنظيف لوحة الإدارة (`src/pages/AdminDashboard.tsx`)
- [x] تحويل قراءة وكتابة الإعدادات العامة للمنصة (`settings`) بالكامل من Firestore إلى مسار الـ Worker D1 (`/api/settings`).
- [x] تحويل قراءة وتعديل حالة نشر مقالات المدونة (`blog_articles`) بالكامل إلى مسار الـ Worker D1 (`/api/blog`).
- [x] إزالة الكتابات الخمس المتعددة إلى Firestore عند اعتماد الطبيب، واستبدالها باستدعاء ذري موحد لـ `cloudflareApi.approveAdminDoctor`.
- [x] إزالة استدعاء خادم Express المحلي المفقود على GitHub Pages.
- [x] إزالة أي استيراد لـ `db` أو `firebase/firestore` من ملف لوحة الإدارة (0 usages).

### المرحلة 3: تدعيم لوحة تحكم الطبيب (`src/pages/Dashboard.tsx`)
- [x] إلغاء ابتلاع أخطاء الحالات في `caseUploadService.ts` وتصعيدها للواجهة.
- [x] إضافة حالة `casesError` في `Dashboard.tsx` وإظهار شريط تنبيه واضح مع زر "إعادة المحاولة" (Retry) عند حدوث أي خلل في الشبكة.
- [x] التأكيد على عدم وجود أي كتابة مباشرة في Firestore من لوحة الطبيب.

### المرحلة 4: اختبارات التحقق الشاملة (Verification & Smoke Tests)
- [x] تشغيل فحص الأنواع الصارم: `npm run lint` (اجتياز كامل بنسبة 100% وصفر أخطاء).
- [x] تشغيل اختبارات مسارات الخادم وحماية التوكن ومعدل الطلبات: `npm run test:api` (4/4 ناجحة).
- [x] تشغيل اختبارات الـ Worker فوق SQLite D1 والتحقق من الاعتماد وحصص الحالات: `npm run test:worker` (6/6 ناجحة).
- [x] تشغيل اختبارات منع تكرار استرداد الرموز الترويجية تحت التزامن: `npm run test:promo` (2/2 ناجحة).
- [x] التحقق من سلامة البناء وتجميع الـ Applet بالكامل: `compile_applet` (Build succeeded).
- [x] التحقق من عزل مسار السيرة الذاتية (`CVWizard.tsx`): لم يُعدل أي سطر فيه.

---

## 4. سجل الاختبارات والأوامر المنفذة (Execution Log)

| التاريخ | الأمر المنفذ (Command) | النتيجة الفنية (Result) | الحالة |
| :--- | :--- | :--- | :---: |
| 2026-09-27 | `npm run lint` | اجتياز كامل بدون أي أخطاء في الـ TypeScript (`tsc --noEmit`) | [x] منجز |
| 2026-09-27 | `npm run test:api` | نجاح 4/4 اختبارات لمسارات الـ API وحماية التوكن | [x] منجز |
| 2026-09-27 | `npm run test:worker` | نجاح 6/6 اختبارات لعمليات D1 والاعتماد والبرومو | [x] منجز |
| 2026-09-27 | `npm run test:promo` | نجاح 2/2 اختبارات لمنع تكرار استرداد الرموز | [x] منجز |
| 2026-09-27 | `npm run build` | نجاح بناء التطبيق بالكامل وتجميع Vite | [x] منجز |
| 2026-09-27 | `grep -n "\bdb\b" src/pages/AdminDashboard.tsx` | Exit Code 1 (صفر تطابقات Firestore) | [x] منجز |

---

## 5. ميثاق العمل للمطورين والمراجعين (Developer Covenant)
1. **أي تعديل في مسار `CV` يعتبر خطأ غير مقبول ويجب التراجع عنه فوراً.**
2. **أي تغيير في هيكل الـ CSS أو الـ DOM الخاص بقالب الطبيب يعتبر مرفوضاً؛ التعديل المسموح فقط هو في دالة حقن بيانات الطبيب الحقيقية داخل مواضع القالب.**
3. **يجب تحديث هذا الملف بعد كل مرحلة تم إنجازها واختبارها.**
