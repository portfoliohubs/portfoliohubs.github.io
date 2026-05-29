import CONFIG from '../config';

  export interface TomlFormData {
    personalInfo: {
      fullName: string;
      fullNameAr: string;
      title: string;
      titleAr: string;
      graduationYear: string;
      university: string;
      universityAr: string;
      clinicName: string;
      clinicNameAr: string;
    };
    contact: {
      phone: string;
      whatsapp: string;
      email: string;
      instagram: string;
      facebook: string;
      linkedin: string;
      locationAddress: string;
      locationAddressAr: string;
      locationLat: string;
      locationLng: string;
    };
    profilePhoto: string | null;
    skills: {
      clinical: string[];
      clinicalAr: string[];
      digital: string[];
      digitalAr: string[];
      soft: string[];
      softAr: string[];
    };
    timeline: Array<{ year: string; event: string; eventAr: string }>;
    cases: Array<{
      category: string;
      categoryAr: string;
      title: string;
      titleAr: string;
      photo: string | null;
    }>;
  }

  function esc(str: string): string {
    if (!str) return '""';
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  }

  function arrToml(arr: string[]): string {
    if (!arr?.length) return '[]';
    return `[\n      ${arr.map(esc).join(',\n      ')}\n    ]`;
  }

  function skillsSection(skills: TomlFormData['skills'], ar = false): string {
    const prefix = ar ? '[params.ar.skills]' : '[params.skills]';
    return `${prefix}
      clinical = ${arrToml(ar ? skills.clinicalAr : skills.clinical)}
      digital  = ${arrToml(ar ? skills.digitalAr  : skills.digital)}
      soft     = ${arrToml(ar ? skills.softAr     : skills.soft)}`;
  }

  function timelineSection(timeline: TomlFormData['timeline'], ar = false): string {
    if (!timeline?.length) return '';
    const prefix = ar ? 'params.ar.education' : 'params.education';
    return timeline.map(item => `
    [[${prefix}.timeline]]
      year  = ${esc(item.year)}
      event = ${esc(ar ? item.eventAr : item.event)}`).join('');
  }

  function casesSection(cases: TomlFormData['cases']): string {
    if (!cases?.length) return '';
    const grouped: Record<string, typeof cases> = {};
    cases.forEach(c => {
      const key = c.category || 'Uncategorized';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, cats]) => {
        const first = cats[0];
        return `
    [[params.clinical_cases]]
      enabled     = true
      category    = ${esc(first.category)}
      category_ar = ${esc(first.categoryAr)}
  ${cats.map(c => `
      [[params.clinical_cases.cases]]
        photo          = ${c.photo ? esc(c.photo) : '""'}
        alt            = ${esc(c.title)}
        description    = ${esc(c.title)}
        alt_ar         = ${esc(c.titleAr)}
        description_ar = ${esc(c.titleAr)}`).join('')}`;
      }).join('\n');
  }

  function buildKeywordsEn(name: string): string[] {
    return [
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
  }

  function buildKeywordsAr(nameAr: string): string[] {
    return [
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
  }

  export function generateToml(data: TomlFormData): string {
    const name         = data.personalInfo.fullName      || 'Your Name';
    const nameAr       = data.personalInfo.fullNameAr    || name;
    const title        = data.personalInfo.title         || 'Professional';
    const titleAr      = data.personalInfo.titleAr       || title;
    const uni          = data.personalInfo.university    || 'Your University';
    const uniAr        = data.personalInfo.universityAr  || uni;
    const year         = data.personalInfo.graduationYear || '2025';
    const clinic       = data.personalInfo.clinicName    || uni;
    const clinicAr     = data.personalInfo.clinicNameAr  || uniAr;
    const photo        = data.profilePhoto               || '';

    const keywordsEn   = buildKeywordsEn(name);
    const keywordsAr   = buildKeywordsAr(nameAr);

    const hasLocation  = !!(data.contact.locationAddress || data.contact.locationLat);

    return `baseURL = ${esc(CONFIG.toml.baseUrl)}
  languageCode = ${esc(CONFIG.toml.languageCode)}
  title = ${esc(name)}
  defaultContentLanguage = ${esc(CONFIG.toml.defaultContentLanguage)}

  [params]
    # Hero Section
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
      keywords    = ${arrToml(keywordsEn)}
      keywords_ar = ${arrToml(keywordsAr)}

    [params.integrations]
      google_search_console_verification = ${esc(CONFIG.seo.googleVerification)}
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
        title          = "Get In Touch"
        subtitle       = "Let's connect and collaborate"
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

    # Skills Section
    ${skillsSection(data.skills)}

    # Education Section
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
      ${timelineSection(data.timeline)}

  ${casesSection(data.cases)}

    # Contact Section
    [params.contact]
      phone     = ${esc(data.contact.phone)}
      whatsapp  = ${esc(data.contact.whatsapp)}
      email     = ${esc(data.contact.email)}
      instagram = ${esc(data.contact.instagram)}
      facebook  = ${esc(data.contact.facebook)}
      linkedin  = ${esc(data.contact.linkedin)}
  ${hasLocation ? `
      [params.contact.location]
        enabled   = true
        address   = ${esc(data.contact.locationAddress)}
        latitude  = ${esc(data.contact.locationLat)}
        longitude = ${esc(data.contact.locationLng)}
  ` : ''}
  # ─── ARABIC TRANSLATIONS ─────────────────────────────────────────────────────
  [params.ar]
    [params.ar.hero]
      name              = ${esc(nameAr)}
      tagline           = ${esc(titleAr)}
      graduation        = ${esc(`تخرج ${year} - ${uniAr}`)}
      profile_image_alt = ${esc(`صورة الملف الشخصي لـ ${nameAr}`)}

      [params.ar.hero.current_position]
        role   = ${esc(titleAr)}
        clinic = ${esc(clinicAr)}

    ${skillsSection(data.skills, true)}

    [params.ar.education]
      university = ${esc(uniAr)}

      [params.ar.education.master]
        title = "ماجستير في طب الفم"

      [params.ar.education.phd]
        title = "دكتوراه في علوم الأسنان"
      ${timelineSection(data.timeline, true)}
  ${hasLocation ? `
    [params.ar.contact.location]
      address = ${esc(data.contact.locationAddressAr || data.contact.locationAddress)}
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

  export function downloadToml(content: string, filename = 'config.toml'): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  