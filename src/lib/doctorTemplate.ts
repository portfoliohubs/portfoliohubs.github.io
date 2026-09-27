/**
 * PortfolioHubs - Doctor Static Page Template Builder
 * Generates 100% compliant, modern, responsive static HTML matching the exact target Hugo portfolio design.
 * Features:
 * - 1:1 match with official Hugo/PortfolioHubs design constitution
 * - High-fidelity Hero, Skills, Education & Timeline, Clinical Cases, Contact & Map
 * - In-browser Instant Bilingual Switcher (AR / EN) with RTL/LTR synchronization
 * - In-browser Dark / Light theme toggle with localStorage persistence
 * - Client-side dynamic PDF CV generator powered by pdfMake & vfs_fonts
 * - Schema.org JSON-LD (Dentist, LocalBusiness, Person) & complete SEO tags
 * - Floating action download button with rotating icon and smooth ripple effects
 */

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str: unknown): string {
  return escapeHtml(str);
}

function safeExternalUrl(value: unknown): string {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function formatImageSrc(val: unknown, fallback = '/logo.png'): string {
  if (!val) return fallback;
  const s = String(val).trim();
  if (/^data:image\/(jpeg|png|webp);base64,/i.test(s) || s.startsWith('https://') || (s.startsWith('/') && !s.startsWith('//'))) {
    return s;
  }
  if (/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s) && s.length > 0) {
    return `data:image/jpeg;base64,${s}`;
  }
  return fallback;
}

function cleanPhone(val: unknown): string {
  return String(val || '').replace(/[\s+()\-]/g, '');
}

export interface DoctorTemplateOptions {
  doctor: Record<string, any>;
  cases?: Record<string, any>[];
  baseUrl?: string;
}

export function buildDoctorStaticHtml({ doctor, cases = [], baseUrl = 'https://portfoliohubs.github.io' }: DoctorTemplateOptions): string {
  const doc = doctor || {};
  const rootBase = (baseUrl || 'https://portfoliohubs.github.io').replace(/\/+$/, '');

  // 1. Normalize Hero & Identity
  const nameEn = doc.hero?.name || doc.fullName || doc.name || doc.username || 'Dr. Dentist';
  const nameAr = doc.heroAr?.name || doc.fullNameAr || doc.nameAr || nameEn;

  const taglineEn = doc.hero?.tagline || doc.title || 'Dentist';
  const taglineAr = doc.heroAr?.tagline || doc.titleAr || 'طبيب أسنان';

  const universityEn = doc.education?.university || doc.university || 'Faculty of Dentistry';
  const universityAr = doc.educationAr?.university || doc.universityAr || universityEn;

  const gradYear = String(doc.education?.graduation_year || doc.graduationYear || '2025');
  const gradEn = doc.hero?.graduation || (gradYear ? `Graduated: ${gradYear}` : '');
  const gradAr = doc.heroAr?.graduation || (gradYear ? `سنة التخرج: ${gradYear}` : '');

  const roleEn = doc.hero?.current_position?.role || doc.currentRole || doc.title || 'Dentist';
  const roleAr = doc.heroAr?.current_position?.role || doc.currentRoleAr || doc.titleAr || 'طبيب أسنان';

  const clinicEn = doc.hero?.current_position?.clinic || doc.clinicName || 'Dental Practice';
  const clinicAr = doc.heroAr?.current_position?.clinic || doc.clinicNameAr || clinicEn;

  const profileImg = formatImageSrc(
    doc.hero?.profile_image || doc.profilePhoto || doc.profilePhotoPath || doc.photo,
    `${rootBase}/logo.png`
  );
  const profileImgAltEn = doc.hero?.profile_image_alt || `${nameEn} - Profile Picture`;
  const profileImgAltAr = doc.heroAr?.profile_image_alt || `صورة الطبيب ${nameAr}`;

  // 2. Normalize Skills
  const clinicalSkillsEn: string[] = Array.isArray(doc.skills?.clinical)
    ? doc.skills.clinical
    : (Array.isArray(doc.clinicalSkills) && doc.clinicalSkills.length ? doc.clinicalSkills : [
        'Comprehensive Dental Examination',
        'Direct Composite Restorations',
        'Endodontic Therapy & Canal Prep',
        'Fixed Prosthodontics & Crown Prep',
        'Periodontal Scaling & Root Planing'
      ]);
  const clinicalSkillsAr: string[] = Array.isArray(doc.skillsAr?.clinical)
    ? doc.skillsAr.clinical
    : (Array.isArray(doc.clinicalSkillsAr) && doc.clinicalSkillsAr.length ? doc.clinicalSkillsAr : clinicalSkillsEn);

  const digitalSkillsEn: string[] = Array.isArray(doc.skills?.digital)
    ? doc.skills.digital
    : (Array.isArray(doc.digitalSkills) && doc.digitalSkills.length ? doc.digitalSkills : [
        'Digital Treatment Planning',
        'Dental Photography & Smile Design',
        'Electronic Patient Records',
        'Intraoral Scanning & CAD/CAM'
      ]);
  const digitalSkillsAr: string[] = Array.isArray(doc.skillsAr?.digital)
    ? doc.skillsAr.digital
    : (Array.isArray(doc.digitalSkillsAr) && doc.digitalSkillsAr.length ? doc.digitalSkillsAr : digitalSkillsEn);

  const softSkillsEn: string[] = Array.isArray(doc.skills?.soft)
    ? doc.skills.soft
    : (Array.isArray(doc.softSkills) && doc.softSkills.length ? doc.softSkills : [
        'Patient Communication & Empathy',
        'Dental Fear & Anxiety Management',
        'Multidisciplinary Team Collaboration',
        'Clinical Ethics & Treatment Consent'
      ]);
  const softSkillsAr: string[] = Array.isArray(doc.skillsAr?.soft)
    ? doc.skillsAr.soft
    : (Array.isArray(doc.softSkillsAr) && doc.softSkillsAr.length ? doc.softSkillsAr : softSkillsEn);

  // 3. Normalize Education & Degrees
  const master = doc.education?.master || { obtained: false, title: '', year: '' };
  const masterAr = doc.educationAr?.master || master;
  const phd = doc.education?.phd || { obtained: false, title: '', year: '' };
  const phdAr = doc.educationAr?.phd || phd;

  const rawTimeline = doc.education?.timeline || doc.timeline || [];
  const timelineEn = Array.isArray(rawTimeline) && rawTimeline.length ? rawTimeline : [
    { year: gradYear || '2024', event: `Graduated from ${universityEn}` },
    { year: String(Number(gradYear || 2024) + 1), event: 'Clinical Internship & General Dental Practice' }
  ];
  const timelineAr = Array.isArray(doc.educationAr?.timeline)
    ? doc.educationAr.timeline
    : (Array.isArray(doc.timelineAr) ? doc.timelineAr : timelineEn);

  // 4. Normalize Clinical Cases
  let clinicalCases: any[] = [];
  if (Array.isArray(doc.clinicalCases) && doc.clinicalCases.length > 0) {
    clinicalCases = doc.clinicalCases;
  } else {
    const rawCases = Array.isArray(cases) && cases.length > 0
      ? cases
      : (Array.isArray(doc.cases) ? doc.cases : []);

    if (rawCases.length > 0 && rawCases[0].cases && Array.isArray(rawCases[0].cases)) {
      clinicalCases = rawCases;
    } else if (rawCases.length > 0) {
      const catMap = new Map<string, any>();
      rawCases.forEach((c: any, idx: number) => {
        const cat = c.category || c.customCategory || 'Clinical Cases';
        const catAr = c.categoryAr || c.category_ar || cat;
        if (!catMap.has(cat)) {
          catMap.set(cat, {
            category: cat,
            category_ar: catAr,
            enabled: true,
            cases: []
          });
        }

        const photosList: any[] = [];
        if (Array.isArray(c.photos) && c.photos.length > 0) {
          c.photos.forEach((p: any, pIdx: number) => {
            const url = p.url || p.previewUrl || p;
            if (url) {
              photosList.push({
                url,
                label: p.label || (pIdx === 0 ? 'Pre-op / Initial' : `Step ${pIdx + 1}`),
                labelAr: p.labelAr || p.label || (pIdx === 0 ? 'الوضع الأولي' : `المرحلة ${pIdx + 1}`)
              });
            }
          });
        } else {
          if (c.beforePhoto?.url || c.beforePhoto?.previewUrl) {
            photosList.push({
              url: c.beforePhoto.url || c.beforePhoto.previewUrl,
              label: c.beforePhoto.label || 'Before Treatment',
              labelAr: c.beforePhoto.labelAr || 'قبل العلاج'
            });
          }
          if (c.afterPhoto?.url || c.afterPhoto?.previewUrl) {
            photosList.push({
              url: c.afterPhoto.url || c.afterPhoto?.previewUrl,
              label: c.afterPhoto.label || 'After Treatment',
              labelAr: c.afterPhoto.labelAr || 'بعد العلاج'
            });
          }
          if (Array.isArray(c.additionalPhotos)) {
            c.additionalPhotos.forEach((ap: any, aIdx: number) => {
              const aUrl = ap.url || ap.previewUrl || ap;
              if (aUrl) {
                photosList.push({
                  url: aUrl,
                  label: ap.label || `Stage ${aIdx + 1}`,
                  labelAr: ap.labelAr || `مرحلة إضافية ${aIdx + 1}`
                });
              }
            });
          }
        }

        const fallbackPhoto = c.photo || c.beforePhotoUrl || c.afterPhotoUrl || c.image || (photosList[0]?.url) || '';

        catMap.get(cat).cases.push({
          id: c.id || `case_${idx}`,
          photo: fallbackPhoto,
          photos: photosList.length > 0 ? photosList : [{ url: fallbackPhoto, label: 'Result', labelAr: 'النتيجة' }],
          alt: c.alt || c.title || c.description || `Clinical Case ${idx + 1}`,
          alt_ar: c.alt_ar || c.altAr || c.titleAr || c.descriptionAr || c.alt || `حالة سريرية ${idx + 1}`,
          description: c.description || c.title || '',
          description_ar: c.description_ar || c.descriptionAr || c.description || '',
          treatmentType: c.treatmentType || '',
          sessionCount: c.sessionCount || 0
        });
      });
      clinicalCases = Array.from(catMap.values());
    }
  }

  // 5. Normalize Contact & Location
  const phone = doc.contact?.phone || doc.phone || '';
  const whatsapp = doc.contact?.whatsapp || doc.whatsapp || phone;
  const email = doc.contact?.email || doc.email || '';
  const instagram = doc.contact?.instagram || doc.instagram || '';
  const facebook = doc.contact?.facebook || doc.facebook || '';
  const linkedin = doc.contact?.linkedin || doc.linkedin || '';
  const instagramUrl = safeExternalUrl(instagram);
  const facebookUrl = safeExternalUrl(facebook);
  const linkedinUrl = safeExternalUrl(linkedin);

  const locationEnabled = doc.contact?.location?.enabled ?? Boolean(doc.locationAddress || doc.contact?.location?.address);
  const locationAddress = doc.contact?.location?.address || doc.locationAddress || 'Private Dental Clinic';
  const locationAddressAr = doc.contactArLocation?.address || doc.locationAddressAr || locationAddress;
  const latitude = doc.contact?.location?.latitude || doc.latitude || '30.5877';
  const longitude = doc.contact?.location?.longitude || doc.longitude || '31.5020';

  // 6. Normalize SEO & Schema
  const siteName = 'PortfolioHubs';
  const slug = doc.slug || doc.username || 'doctor';
  const canonicalUrl = `${rootBase}/dr/${slug}/`;
  const desc = doc.description || `${nameEn} | ${nameAr} - Professional Dental Portfolio & Clinical Cases Showcase on PortfolioHubs.`;
  const keywords = `${nameEn}, ${nameAr}, dentist, dental portfolio, clinical cases, ${universityEn}, PortfolioHubs`;

  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Dentist', 'LocalBusiness'],
        '@id': `${canonicalUrl}#clinic`,
        'name': `${nameEn} - ${clinicEn}`,
        'alternateName': `${nameAr} - ${clinicAr}`,
        'url': canonicalUrl,
        'image': profileImg,
        'telephone': phone,
        'email': email,
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': locationAddress,
          'addressCountry': 'EG'
        },
        'geo': {
          '@type': 'GeoCoordinates',
          'latitude': latitude,
          'longitude': longitude
        },
        'sameAs': [instagram, facebook, linkedin].filter(Boolean)
      },
      {
        '@type': 'Person',
        '@id': `${canonicalUrl}#dentist`,
        'name': nameEn,
        'alternateName': [nameAr],
        'jobTitle': roleEn,
        'alumniOf': {
          '@type': 'EducationalOrganization',
          'name': universityEn
        },
        'url': canonicalUrl,
        'image': profileImg,
        'sameAs': [instagram, facebook, linkedin].filter(Boolean)
      }
    ]
  };

  const rawCvData = {
    lang: 'en',
    baseURL: rootBase,
    title: `${nameEn} - ${siteName}`,
    hero: {
      name: nameEn,
      tagline: taglineEn,
      graduation: gradEn,
      profile_image: profileImg,
      profile_image_alt: profileImgAltEn,
      current_position: {
        role: roleEn,
        clinic: clinicEn
      }
    },
    heroAr: {
      name: nameAr,
      tagline: taglineAr,
      graduation: gradAr,
      profile_image: profileImg,
      profile_image_alt: profileImgAltAr,
      current_position: {
        role: roleAr,
        clinic: clinicAr
      }
    },
    skills: {
      clinical: clinicalSkillsEn,
      digital: digitalSkillsEn,
      soft: softSkillsEn
    },
    skillsAr: {
      clinical: clinicalSkillsAr,
      digital: digitalSkillsAr,
      soft: softSkillsAr
    },
    education: {
      university: universityEn,
      graduation_year: gradYear,
      master: master,
      phd: phd,
      timeline: timelineEn
    },
    educationAr: {
      university: universityAr,
      graduation_year: gradYear,
      master: masterAr,
      phd: phdAr,
      timeline: timelineAr
    },
    contact: {
      phone: phone,
      whatsapp: whatsapp,
      email: email,
      instagram: instagram,
      facebook: facebook,
      linkedin: linkedin,
      location: {
        enabled: locationEnabled,
        address: locationAddress,
        latitude: latitude,
        longitude: longitude
      }
    },
    contactArLocation: {
      address: locationAddressAr
    },
    clinicalCases: clinicalCases,
    labels: {
      phone: 'Phone',
      whatsapp: 'WhatsApp',
      email: 'Email',
      location: 'Location',
      get_directions: 'Get Directions',
      rights_reserved: 'All Rights Reserved',
      now_working_as: 'Now working as',
      at: 'at',
      masters_degree: "Master's Degree",
      phd_degree: 'PhD Degree'
    },
    labelsAr: {
      phone: 'الهاتف',
      whatsapp: 'واتساب',
      email: 'البريد الإلكتروني',
      location: 'الموقع',
      get_directions: 'الاتجاهات',
      rights_reserved: 'جميع الحقوق محفوظة',
      now_working_as: 'يعمل حالياً كـ',
      at: 'في',
      masters_degree: 'درجة الماجستير',
      phd_degree: 'درجة الدكتوراه'
    }
  };

  // Build Clinical Cases HTML
  let casesHtml = '';
  if (clinicalCases && clinicalCases.length > 0) {
    casesHtml = clinicalCases
      .filter((cat: any) => cat.enabled !== false)
      .map((cat: any) => {
        const catCases = Array.isArray(cat.cases) ? cat.cases : [];
        if (catCases.length === 0) return '';
        const catNameEn = cat.category || 'Clinical Cases';
        const catNameAr = cat.category_ar || catNameEn;

        const cardsHtml = catCases.map((c: any) => {
          const caseSrc = formatImageSrc(c.photo || c.photos?.[0]?.url, `${rootBase}/logo.png`);
          const caseAltEn = c.alt || c.description || 'Clinical Case';
          const caseAltAr = c.alt_ar || c.description_ar || caseAltEn;
          const caseDescEn = c.description || c.alt || '';
          const caseDescAr = c.description_ar || c.alt_ar || caseDescEn;

          return `
            <div class="case-card">
                <div class="case-image-wrapper single">
                    <img src="${escapeAttr(caseSrc)}" 
                         alt="${escapeAttr(caseAltEn)}" 
                         data-alt-en="${escapeAttr(caseAltEn)}" 
                         data-alt-ar="${escapeAttr(caseAltAr)}" 
                         class="case-image" 
                         loading="lazy">
                </div>
                <div class="case-description">
                    <p data-en="${escapeHtml(caseDescEn)}" data-ar="${escapeHtml(caseDescAr)}">${escapeHtml(caseDescEn)}</p>
                </div>
            </div>`;
        }).join('\n');

        return `
          <div class="case-category">
              <h3 class="case-category-title" data-en="${escapeAttr(catNameEn)}" data-ar="${escapeAttr(catNameAr)}">${escapeHtml(catNameEn)}</h3>
              <div class="cases-grid">
                  ${cardsHtml}
              </div>
          </div>`;
      }).join('\n');
  }

  // Build Degrees HTML
  let degreesHtml = '';
  if (master && master.obtained) {
    degreesHtml += `
      <div class="degree-item">
          <i class="fas fa-award degree-icon"></i>
          <div class="degree-info">
              <strong data-en="Master's Degree" data-ar="درجة الماجستير">Master's Degree</strong>
              <p data-en="${escapeAttr(master.title || '')}" data-ar="${escapeAttr(masterAr.title || master.title || '')}">${escapeHtml(master.title || '')}</p>
              <span class="degree-year">(${escapeHtml(master.year || '')})</span>
          </div>
      </div>`;
  }
  if (phd && phd.obtained) {
    degreesHtml += `
      <div class="degree-item">
          <i class="fas fa-award degree-icon"></i>
          <div class="degree-info">
              <strong data-en="PhD Degree" data-ar="درجة الدكتوراه">PhD Degree</strong>
              <p data-en="${escapeAttr(phd.title || '')}" data-ar="${escapeAttr(phdAr.title || phd.title || '')}">${escapeHtml(phd.title || '')}</p>
              <span class="degree-year">(${escapeHtml(phd.year || '')})</span>
          </div>
      </div>`;
  }

  // Build Timeline HTML Items
  const timelineItemsHtml = timelineEn.map((item: any, idx: number) => {
    const arEvent = timelineAr[idx]?.event || item.event;
    return `
      <div class="timeline-item">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
              <span class="timeline-year">${escapeHtml(item.year || '')}</span>
              <p class="timeline-event" data-en="${escapeAttr(item.event || '')}" data-ar="${escapeAttr(arEvent || '')}">${escapeHtml(item.event || '')}</p>
          </div>
      </div>`;
  }).join('\n');

  // Build Skills HTML Lists
  const clinicalSkillsHtml = clinicalSkillsEn.map((skill, idx) => {
    const arSkill = clinicalSkillsAr[idx] || skill;
    return `
      <div class="skill-item">
          <span class="skill-number">${idx + 1}</span>
          <span class="skill-text" data-en="${escapeAttr(skill)}" data-ar="${escapeAttr(arSkill)}">${escapeHtml(skill)}</span>
      </div>`;
  }).join('\n');

  const digitalSkillsHtml = digitalSkillsEn.map((skill, idx) => {
    const arSkill = digitalSkillsAr[idx] || skill;
    return `
      <div class="skill-item">
          <span class="skill-number">${idx + 1}</span>
          <span class="skill-text" data-en="${escapeAttr(skill)}" data-ar="${escapeAttr(arSkill)}">${escapeHtml(skill)}</span>
      </div>`;
  }).join('\n');

  const softSkillsHtml = softSkillsEn.map((skill, idx) => {
    const arSkill = softSkillsAr[idx] || skill;
    return `
      <div class="skill-item">
          <span class="skill-number">${idx + 1}</span>
          <span class="skill-text" data-en="${escapeAttr(skill)}" data-ar="${escapeAttr(arSkill)}">${escapeHtml(skill)}</span>
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${escapeHtml(nameEn)} | ${escapeHtml(nameAr)} - ${escapeHtml(siteName)}</title>
    <meta name="description" content="${escapeAttr(desc)}">
    <meta name="keywords" content="${escapeAttr(keywords)}">
    <meta name="author" content="${escapeAttr(nameEn)}">
    <link rel="canonical" href="${escapeAttr(canonicalUrl)}">
    <meta name="robots" content="index,follow">
    <meta name="googlebot" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1">
    <meta name="theme-color" content="#2563eb">

    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeAttr(nameEn)} | ${escapeAttr(nameAr)} - ${escapeAttr(siteName)}">
    <meta property="og:description" content="${escapeAttr(desc)}">
    <meta property="og:url" content="${escapeAttr(canonicalUrl)}">
    <meta property="og:site_name" content="${escapeAttr(siteName)}">
    <meta property="og:image" content="${escapeAttr(profileImg)}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@portfoliohubs">
    <meta name="twitter:title" content="${escapeAttr(nameEn)} | ${escapeAttr(nameAr)} - ${escapeAttr(siteName)}">
    <meta name="twitter:description" content="${escapeAttr(desc)}">
    <meta name="twitter:image" content="${escapeAttr(profileImg)}">

    <link rel="icon" href="${escapeAttr(profileImg)}" sizes="any">
    <link rel="shortcut icon" href="${escapeAttr(profileImg)}">
    <link rel="apple-touch-icon" href="${escapeAttr(profileImg)}">

    <meta name="google-site-verification" content="LEbtuQbQNm8XDj1I5YVHvKKg7NKoBpK0A7TY5PFBLiY">

    <script type="application/ld+json">
    ${safeJsonLd(schemaData)}
    </script>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        /* CSS Variables */
        :root {
            --primary-color: #2563eb;
            --secondary-color: #7c3aed;
            --accent-color: #06b6d4;
            --text-color: #1f2937;
            --text-light: #6b7280;
            --bg-color: #ffffff;
            --bg-secondary: #f9fafb;
            --border-color: #e5e7eb;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        [data-theme="dark"] {
            --primary-color: #3b82f6;
            --secondary-color: #8b5cf6;
            --accent-color: #22d3ee;
            --text-color: #f9fafb;
            --text-light: #d1d5db;
            --bg-color: #111827;
            --bg-secondary: #1f2937;
            --border-color: #374151;
        }

        /* Reset & Base */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            scroll-behavior: smooth;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--bg-color);
            color: var(--text-color);
            line-height: 1.6;
            transition: var(--transition);
        }

        body[dir="rtl"] {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
        }

        /* Header */
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: var(--bg-color);
            border-bottom: 1px solid var(--border-color);
            z-index: 1000;
            box-shadow: var(--shadow);
        }

        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .menu-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--text-color);
            cursor: pointer;
            padding: 0.5rem;
            display: none;
        }

        @media (max-width: 768px) {
            .menu-btn {
                display: block;
            }
        }

        .header-logo {
            flex: 1;
            text-align: center;
        }

        .header-name {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--primary-color);
        }

        .header-controls {
            display: flex;
            gap: 1rem;
        }

        .lang-toggle, .theme-toggle {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            cursor: pointer;
            color: var(--text-color);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: var(--transition);
        }

        .lang-toggle:hover, .theme-toggle:hover {
            background: var(--primary-color);
            color: white;
            transform: translateY(-2px);
        }

        /* Mobile Navigation */
        .mobile-nav {
            position: fixed;
            top: 0;
            left: -100%;
            width: 280px;
            height: 100vh;
            background: var(--bg-color);
            box-shadow: var(--shadow-lg);
            transition: var(--transition);
            z-index: 1001;
            overflow-y: auto;
        }

        .mobile-nav.active {
            left: 0;
        }

        body[dir="rtl"] .mobile-nav {
            left: auto;
            right: -100%;
        }

        body[dir="rtl"] .mobile-nav.active {
            right: 0;
        }

        .mobile-nav-content {
            padding: 2rem;
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--text-color);
            cursor: pointer;
            padding: 0.5rem;
            margin-bottom: 2rem;
        }

        .nav-links {
            list-style: none;
        }

        .nav-links li {
            margin-bottom: 1rem;
        }

        .nav-links a {
            display: block;
            padding: 1rem;
            color: var(--text-color);
            text-decoration: none;
            border-radius: 0.5rem;
            transition: var(--transition);
        }

        .nav-links a:hover {
            background: var(--primary-color);
            color: white;
            transform: translateX(10px);
        }

        body[dir="rtl"] .nav-links a:hover {
            transform: translateX(-10px);
        }

        /* Main Content */
        .portfolio-container {
            margin-top: 80px;
            padding-bottom: 100px;
        }

        .section {
            padding: 4rem 2rem;
            max-width: 1200px;
            margin: 0 auto;
        }

        .section-header {
            text-align: center;
            margin-bottom: 3rem;
        }

        .icon-circle {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
            color: white;
            font-size: 1.5rem;
        }

        .section-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .section-subtitle {
            color: var(--text-light);
            font-size: 1.1rem;
        }

        /* Hero Section */
        .hero-section {
            text-align: center;
            padding: 6rem 2rem;
        }

        .profile-image-container {
            margin-bottom: 2rem;
        }

        .profile-image {
            width: 200px;
            height: 200px;
            border-radius: 50%;
            object-fit: cover;
            border: 5px solid var(--primary-color);
            box-shadow: var(--shadow-lg);
        }

        .hero-name {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .hero-tagline {
            font-size: 1.5rem;
            color: var(--text-light);
            margin-bottom: 1rem;
        }

        .hero-graduation {
            font-size: 1.1rem;
            color: var(--text-light);
            margin-bottom: 2rem;
        }

        .hero-position {
            font-size: 1.2rem;
            padding: 1rem 2rem;
            background: var(--bg-secondary);
            border-radius: 1rem;
            display: inline-block;
        }

        /* Skills Section */
        .skills-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }

        .skill-category {
            background: var(--bg-secondary);
            padding: 2rem;
            border-radius: 1rem;
            border: 1px solid var(--border-color);
            transition: var(--transition);
        }

        .skill-category:hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-lg);
        }

        .skill-category-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            color: var(--primary-color);
        }

        .skill-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .skill-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem;
            background: var(--bg-color);
            border-radius: 0.5rem;
            transition: var(--transition);
        }

        .skill-item:hover {
            transform: translateX(10px);
            background: var(--primary-color);
            color: white;
        }

        body[dir="rtl"] .skill-item:hover {
            transform: translateX(-10px);
        }

        .skill-number {
            width: 30px;
            height: 30px;
            background: var(--primary-color);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            flex-shrink: 0;
        }

        .skill-item:hover .skill-number {
            background: white;
            color: var(--primary-color);
        }

        /* Education Section */
        .education-container {
            display: flex;
            flex-direction: column;
            gap: 3rem;
        }

        .university-info {
            text-align: center;
            padding: 2rem;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            border-radius: 1rem;
        }

        .university-name {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
        }

        .degrees-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }

        .degree-item {
            display: flex;
            gap: 1.5rem;
            padding: 2rem;
            background: var(--bg-secondary);
            border-radius: 1rem;
            border: 1px solid var(--border-color);
        }

        .degree-icon {
            font-size: 2rem;
            color: var(--primary-color);
        }

        .degree-year {
            color: var(--text-light);
            font-size: 0.9rem;
        }

        /* Timeline */
        .timeline-container {
            padding: 2rem;
            background: var(--bg-secondary);
            border-radius: 1rem;
        }

        .timeline-title {
            font-size: 1.8rem;
            margin-bottom: 2rem;
            text-align: center;
        }

        .timeline {
            position: relative;
            padding: 2rem 0;
        }

        .timeline::before {
            content: '';
            position: absolute;
            left: 50%;
            top: 0;
            bottom: 0;
            width: 2px;
            background: var(--border-color);
            transform: translateX(-50%);
        }

        .timeline-item {
            position: relative;
            margin-bottom: 3rem;
            display: flex;
            align-items: center;
        }

        .timeline-item:nth-child(odd) {
            justify-content: flex-end;
            padding-right: calc(50% + 2rem);
        }

        .timeline-item:nth-child(even) {
            justify-content: flex-start;
            padding-left: calc(50% + 2rem);
        }

        .timeline-marker {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            width: 20px;
            height: 20px;
            background: var(--primary-color);
            border: 4px solid var(--bg-color);
            border-radius: 50%;
            z-index: 1;
        }

        .timeline-content {
            background: var(--bg-color);
            padding: 1.5rem;
            border-radius: 1rem;
            box-shadow: var(--shadow);
            max-width: 400px;
        }

        .timeline-year {
            font-weight: 700;
            color: var(--primary-color);
            font-size: 1.2rem;
            display: block;
            margin-bottom: 0.5rem;
        }

        /* Cases Section */
        .cases-container {
            display: flex;
            flex-direction: column;
            gap: 4rem;
        }

        .case-category {
            padding: 2rem;
            background: var(--bg-secondary);
            border-radius: 1rem;
        }

        .case-category-title {
            font-size: 2rem;
            margin-bottom: 2rem;
            text-align: center;
            color: var(--primary-color);
        }

        .cases-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 2rem;
            justify-items: center;
        }

        .case-card {
            background: var(--bg-color);
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: var(--shadow);
            transition: var(--transition);
            width: 100%;
            max-width: 420px;
        }

        .case-card:hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-lg);
        }

        .case-image-wrapper {
            position: relative;
            padding-top: 70%;
            overflow: hidden;
        }

        .case-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: var(--bg-secondary);
        }

        .case-description {
            padding: 1.5rem;
            text-align: center;
            color: var(--text-light);
        }

        /* Contact Section */
        .contact-container {
            display: flex;
            flex-direction: column;
            gap: 3rem;
        }

        .contact-methods {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }

        .contact-method {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            padding: 2rem;
            background: var(--bg-secondary);
            border-radius: 1rem;
            border: 1px solid var(--border-color);
            text-decoration: none;
            color: var(--text-color);
            transition: var(--transition);
        }

        .contact-method:hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-lg);
        }

        .contact-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
        }

        .contact-icon.phone {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
        }

        .contact-icon.whatsapp {
            background: linear-gradient(135deg, #25d366, #128c7e);
        }

        .contact-icon.email {
            background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .contact-icon.email i {
            font-size: 1.4rem;
            width: 1.4rem;
            height: 1.4rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .contact-label {
            display: block;
            font-weight: 600;
            margin-bottom: 0.25rem;
        }

        .contact-value {
            color: var(--text-light);
        }

        .contact-method:has(.contact-icon.email) .contact-value {
            font-size: 0.85rem;
            word-break: break-all;
        }

        /* Social Media */
        .social-media {
            text-align: center;
            padding: 2rem;
            background: var(--bg-secondary);
            border-radius: 1rem;
        }

        .social-title {
            font-size: 1.8rem;
            margin-bottom: 2rem;
        }

        .social-links {
            display: flex;
            justify-content: center;
            gap: 1.5rem;
        }

        .social-link {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
            text-decoration: none;
            transition: var(--transition);
        }

        .social-link:hover {
            transform: scale(1.1) rotate(10deg);
        }

        .social-link.instagram {
            background: linear-gradient(135deg, #f58529, #dd2a7b);
        }

        .social-link.facebook {
            background: #1877f2;
        }

        .social-link.linkedin {
            background: #0a66c2;
        }

        /* Location */
        .location-container {
            padding: 2rem;
            background: var(--bg-secondary);
            border-radius: 1rem;
        }

        .location-title {
            font-size: 1.8rem;
            margin-bottom: 1rem;
            text-align: center;
        }

        .location-address {
            text-align: center;
            color: var(--text-light);
            margin-bottom: 2rem;
        }

        .map-container {
            border-radius: 1rem;
            overflow: hidden;
            margin-bottom: 1rem;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 600;
            transition: var(--transition);
            border: none;
            cursor: pointer;
        }

        .btn-secondary {
            background: var(--primary-color);
            color: white;
            width: 100%;
            justify-content: center;
        }

        .btn-secondary:hover {
            background: var(--secondary-color);
            transform: translateY(-2px);
        }

        /* Footer */
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--bg-color);
            border-top: 1px solid var(--border-color);
            z-index: 999;
        }

        .bottom-nav {
            display: flex;
            justify-content: space-around;
            padding: 0.5rem;
        }

        .nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
            padding: 0.5rem 1rem;
            color: var(--text-light);
            text-decoration: none;
            transition: var(--transition);
            border-radius: 0.5rem;
            font-size: 0.85rem;
        }

        .nav-item:hover, .nav-item.active {
            color: var(--primary-color);
            background: var(--bg-secondary);
        }

        .nav-item i {
            font-size: 1.2rem;
        }

        .footer-info {
            text-align: center;
            padding: 1rem;
            font-size: 0.85rem;
            color: var(--text-light);
            border-top: 1px solid var(--border-color);
        }

        /* Responsive */
        @media (max-width: 768px) {
            .hero-name {
                font-size: 2rem;
            }

            .section-title {
                font-size: 2rem;
            }

            .timeline::before {
                left: 20px;
            }

            .timeline-item {
                padding-left: 3rem !important;
                padding-right: 0 !important;
                justify-content: flex-start !important;
            }

            .timeline-marker {
                left: 20px;
            }

            .nav-item span {
                display: none;
            }

            .bottom-nav {
                justify-content: space-between;
            }

            .cases-grid {
                grid-template-columns: 1fr;
            }
        }

        /* Loading Animation */
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .section {
            animation: fadeIn 0.6s ease-out;
        }

        /* Floating Button */
        .floating-btn {
            position: fixed;
            bottom: 140px;
            right: 30px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
            text-decoration: none;
            box-shadow: 0 8px 25px rgba(37, 99, 235, 0.3);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 998;
            border: none;
            cursor: pointer;
            overflow: hidden;
        }

        .floating-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: 50%;
        }

        .floating-btn:hover {
            transform: translateY(-5px) scale(1.1);
            box-shadow: 0 15px 35px rgba(37, 99, 235, 0.4);
        }

        .floating-btn:hover::before {
            opacity: 1;
        }

        .floating-btn i {
            position: relative;
            z-index: 1;
            transition: transform 0.3s ease;
        }

        .floating-btn:hover i {
            transform: rotate(15deg) scale(1.2);
        }

        .floating-btn:active {
            transform: translateY(-2px) scale(1.05);
        }

        @media (max-width: 768px) {
            .floating-btn {
                bottom: 120px;
                right: 20px;
                width: 50px;
                height: 50px;
                font-size: 1.2rem;
            }
        }
    </style>
</head>
<body>
    <header class="header" id="header">
        <div class="header-content">
            <button class="menu-btn" id="menuBtn" aria-label="Menu">
                <i class="fas fa-bars"></i>
            </button>
            
            <div class="header-logo">
                <h1 class="header-name" id="headerName" data-en="${escapeAttr(nameEn)}" data-ar="${escapeAttr(nameAr)}">${escapeHtml(nameEn)}</h1>
            </div>
            
            <div class="header-controls">
                <button class="lang-toggle" id="langToggle" aria-label="Toggle Language">
                    <i class="fas fa-language"></i>
                    <span class="lang-text">AR</span>
                </button>
                
                <button class="theme-toggle" id="themeToggle" aria-label="Toggle Dark Mode">
                    <i class="fas fa-moon"></i>
                </button>
            </div>
        </div>
        
        <nav class="mobile-nav" id="mobileNav">
            <div class="mobile-nav-content">
                <button class="close-btn" id="closeBtn" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
                <ul class="nav-links">
                    <li><a href="#home" data-en="Profile" data-ar="الملف الشخصي">Profile</a></li>
                    <li><a href="#skills" data-en="Skills" data-ar="المهارات">Skills</a></li>
                    <li><a href="#education" data-en="Education" data-ar="التعليم">Education</a></li>
                    <li><a href="#cases" data-en="Clinical Cases" data-ar="الحالات السريرية">Clinical Cases</a></li>
                    <li><a href="#contact" data-en="Contact" data-ar="تواصل معي">Contact</a></li>
                </ul>
            </div>
        </nav>
    </header>

    <div class="portfolio-container">
        <section id="home" class="section hero-section">
            <div class="hero-content">
                <div class="profile-image-container">
                    <img 
                        src="${escapeAttr(profileImg)}" 
                        alt="${escapeAttr(profileImgAltEn)}"
                        data-alt-en="${escapeAttr(profileImgAltEn)}"
                        data-alt-ar="${escapeAttr(profileImgAltAr)}"
                        class="profile-image"
                        id="profileImage"
                    >
                </div>
                
                <h1 class="hero-name" id="heroName" data-en="${escapeAttr(nameEn)}" data-ar="${escapeAttr(nameAr)}">${escapeHtml(nameEn)}</h1>
                <p class="hero-tagline" id="heroTagline" data-en="${escapeAttr(taglineEn)}" data-ar="${escapeAttr(taglineAr)}">${escapeHtml(taglineEn)}</p>
                <p class="hero-graduation" id="heroGraduation" data-en="${escapeAttr(gradEn)}" data-ar="${escapeAttr(gradAr)}">${escapeHtml(gradEn)}</p>
                
                <div class="hero-position" id="heroPosition">
                    <p>
                        <span data-en="Now working as" data-ar="يعمل حالياً كـ">Now working as</span>
                        <strong id="heroRole" data-en="${escapeAttr(roleEn)}" data-ar="${escapeAttr(roleAr)}">${escapeHtml(roleEn)}</strong>
                        <span data-en="at" data-ar="في">at</span>
                        <strong id="heroClinic" data-en="${escapeAttr(clinicEn)}" data-ar="${escapeAttr(clinicAr)}">${escapeHtml(clinicEn)}</strong>
                    </p>
                </div>
            </div>
        </section>

        <section id="skills" class="section skills-section">
            <div class="section-header">
                <div class="icon-circle">
                    <i class="fas fa-star"></i>
                </div>
                <h2 class="section-title" data-en="Professional Skills" data-ar="المهارات المهنية">Professional Skills</h2>
            </div>
            
            <div class="skills-container">
                <div class="skill-category">
                    <h3 class="skill-category-title">
                        <i class="fas fa-tooth"></i>
                        <span data-en="Clinical Skills" data-ar="المهارات السريرية">Clinical Skills</span>
                    </h3>
                    <div class="skill-list" id="clinicalSkills">
                        ${clinicalSkillsHtml}
                    </div>
                </div>
                
                <div class="skill-category">
                    <h3 class="skill-category-title">
                        <i class="fas fa-laptop"></i>
                        <span data-en="Digital & Tech Skills" data-ar="المهارات الرقمية والتكنولوجية">Digital & Tech Skills</span>
                    </h3>
                    <div class="skill-list" id="digitalSkills">
                        ${digitalSkillsHtml}
                    </div>
                </div>
                
                <div class="skill-category">
                    <h3 class="skill-category-title">
                        <i class="fas fa-users"></i>
                        <span data-en="Soft & Communication Skills" data-ar="المهارات الشخصية والتواصل">Soft & Communication Skills</span>
                    </h3>
                    <div class="skill-list" id="softSkills">
                        ${softSkillsHtml}
                    </div>
                </div>
            </div>
        </section>

        <section id="education" class="section education-section">
            <div class="section-header">
                <div class="icon-circle">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <h2 class="section-title" data-en="Education & Qualifications" data-ar="التعليم والمؤهلات">Education & Qualifications</h2>
            </div>
            
            <div class="education-container">
                <div class="university-info">
                    <h3 class="university-name" id="universityName">${escapeHtml(universityEn)}</h3>
                    <p class="graduation-year">
                        <span data-en="Graduated" data-ar="سنة التخرج">Graduated</span>: <span id="gradYear">${escapeHtml(gradYear)}</span>
                    </p>
                </div>
                
                <div class="degrees-container" id="degreesContainer">
                    ${degreesHtml}
                </div>
                
                <div class="timeline-container">
                    <h3 class="timeline-title" data-en="Career & Academic Timeline" data-ar="الخط الزمني للمسيرة المهنية">Career & Academic Timeline</h3>
                    <div class="timeline" id="timeline">
                        ${timelineItemsHtml}
                    </div>
                </div>
                
                <div class="certificates-container" id="certificatesSection" style="display: none;">
                    <h3 class="certificates-title" data-en="Certifications & Advanced Courses" data-ar="الشهادات والدورات المتقدمة">Certifications & Advanced Courses</h3>
                    <div class="certificates-grid" id="certificates"></div>
                </div>
            </div>
        </section>

        <section id="cases" class="section cases-section">
            <div class="section-header">
                <div class="icon-circle">
                    <i class="fas fa-tooth"></i>
                </div>
                <h2 class="section-title" data-en="Clinical Cases Portfolio" data-ar="معرض الحالات السريرية">Clinical Cases Portfolio</h2>
                <p class="section-subtitle" data-en="Documented treatment cases showcasing clinical expertise and clinical outcomes" data-ar="توثيق احترافي للحالات السريرية ونتائج العلاج">Documented treatment cases showcasing clinical expertise and clinical outcomes</p>
            </div>
            
            <div class="cases-container" id="casesContainer">
                ${casesHtml}
            </div>
        </section>

        <section id="contact" class="section contact-section">
            <div class="section-header">
                <div class="icon-circle">
                    <i class="fas fa-envelope"></i>
                </div>
                <h2 class="section-title" data-en="Contact Information" data-ar="معلومات التواصل">Contact Information</h2>
                <p class="section-subtitle" data-en="Get in touch for appointments, consultations, or professional inquiries" data-ar="تواصل معي لحجز المواعيد والاستشارات الطبية">Get in touch for appointments, consultations, or professional inquiries</p>
            </div>
            
            <div class="contact-container">
                <div class="contact-methods" id="contactMethods">
                    ${phone ? `
                    <a href="tel:${escapeAttr(cleanPhone(phone))}" class="contact-method">
                        <div class="contact-icon phone">
                            <i class="fas fa-phone"></i>
                        </div>
                        <div class="contact-info">
                            <span class="contact-label" data-en="Phone" data-ar="الهاتف">Phone</span>
                            <span class="contact-value">${escapeHtml(phone)}</span>
                        </div>
                    </a>` : ''}

                    ${whatsapp ? `
                    <a href="https://wa.me/${escapeAttr(cleanPhone(whatsapp))}" target="_blank" rel="noopener noreferrer" class="contact-method">
                        <div class="contact-icon whatsapp">
                            <i class="fab fa-whatsapp"></i>
                        </div>
                        <div class="contact-info">
                            <span class="contact-label" data-en="WhatsApp" data-ar="واتساب">WhatsApp</span>
                            <span class="contact-value">${escapeHtml(whatsapp)}</span>
                        </div>
                    </a>` : ''}

                    ${email ? `
                    <a href="mailto:${escapeAttr(email)}" class="contact-method">
                        <div class="contact-icon email">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div class="contact-info">
                            <span class="contact-label" data-en="Email" data-ar="البريد الإلكتروني">Email</span>
                            <span class="contact-value">${escapeHtml(email)}</span>
                        </div>
                    </a>` : ''}
                </div>
                
                <div class="social-media">
                    <h3 class="social-title" data-en="Follow My Work" data-ar="تابعني على وسائل التواصل">Follow My Work</h3>
                    <div class="social-links" id="socialLinks">
                        ${instagramUrl ? `<a href="${escapeAttr(instagramUrl)}" target="_blank" rel="noopener noreferrer" class="social-link instagram" aria-label="Instagram"><i class="fab fa-instagram"></i></a>` : ''}
                        ${facebookUrl ? `<a href="${escapeAttr(facebookUrl)}" target="_blank" rel="noopener noreferrer" class="social-link facebook" aria-label="Facebook"><i class="fab fa-facebook"></i></a>` : ''}
                        ${linkedinUrl ? `<a href="${escapeAttr(linkedinUrl)}" target="_blank" rel="noopener noreferrer" class="social-link linkedin" aria-label="LinkedIn"><i class="fab fa-linkedin"></i></a>` : ''}
                    </div>
                </div>
                
                ${locationEnabled ? `
                <div class="location-container" id="locationContainer">
                    <h3 class="location-title" data-en="Clinic Location" data-ar="موقع العيادة">Clinic Location</h3>
                    <p class="location-address" data-en="${escapeAttr(locationAddress)}" data-ar="${escapeAttr(locationAddressAr)}">${escapeHtml(locationAddress)}</p>
                    <div class="map-container">
                        <iframe 
                            src="https://www.google.com/maps?q=${escapeAttr(latitude)},${escapeAttr(longitude)}&hl=en&z=14&output=embed"
                            width="100%" 
                            height="300" 
                            style="border:0;" 
                            allowfullscreen="" 
                            loading="lazy">
                        </iframe>
                    </div>
                    <a 
                        href="https://www.google.com/maps/search/?api=1&query=${escapeAttr(latitude)},${escapeAttr(longitude)}" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        class="btn btn-secondary">
                        <i class="fas fa-directions"></i>
                        <span data-en="Get Directions" data-ar="الاتجاهات">Get Directions</span>
                    </a>
                </div>` : ''}
            </div>
        </section>
    </div>

    <footer class="footer">
        <div class="footer-content">
            <nav class="bottom-nav">
                <a href="#home" class="nav-item active">
                    <i class="fas fa-user"></i>
                    <span data-en="Profile" data-ar="الملف الشخصي">Profile</span>
                </a>
                <a href="#skills" class="nav-item">
                    <i class="fas fa-star"></i>
                    <span data-en="Skills" data-ar="المهارات">Skills</span>
                </a>
                <a href="#education" class="nav-item">
                    <i class="fas fa-graduation-cap"></i>
                    <span data-en="Education" data-ar="التعليم">Education</span>
                </a>
                <a href="#cases" class="nav-item">
                    <i class="fas fa-tooth"></i>
                    <span data-en="Cases" data-ar="الحالات">Cases</span>
                </a>
                <a href="#contact" class="nav-item">
                    <i class="fas fa-envelope"></i>
                    <span data-en="Contact" data-ar="تواصل">Contact</span>
                </a>
            </nav>
            
            <div class="footer-info">
                <p>© <span id="currentYear"></span> <span id="footerName" data-en="${escapeAttr(nameEn)}" data-ar="${escapeAttr(nameAr)}">${escapeHtml(nameEn)}</span>. <span id="rightsReserved" data-en="All Rights Reserved" data-ar="جميع الحقوق محفوظة">All Rights Reserved</span>.</p>
            </div>
        </div>
    </footer>

    <script>
        const rawCvData = ${safeJsonLd(rawCvData)};

        function safeParse(val) {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch (_) {
                    return val;
                }
            }
            return val;
        }

        const cvData = {
            lang: safeParse(rawCvData.lang),
            baseURL: safeParse(rawCvData.baseURL),
            title: safeParse(rawCvData.title),
            hero: safeParse(rawCvData.hero),
            heroAr: safeParse(rawCvData.heroAr),
            skills: safeParse(rawCvData.skills),
            skillsAr: safeParse(rawCvData.skillsAr),
            education: safeParse(rawCvData.education),
            educationAr: safeParse(rawCvData.educationAr),
            contact: safeParse(rawCvData.contact),
            contactArLocation: safeParse(rawCvData.contactArLocation),
            clinicalCases: safeParse(rawCvData.clinicalCases),
            labels: safeParse(rawCvData.labels),
            labelsAr: safeParse(rawCvData.labelsAr)
        };

        const CV_LANG = 'en';

        function pickLangValue(enValue, arValue) {
            return currentLang === 'ar' ? (arValue || enValue) : (enValue || arValue);
        }

        function buildProxyUrl(url) {
            try {
                const u = new URL(url);
                if (u.protocol !== 'http:' && u.protocol !== 'https:') return url;
            } catch (_) {
                return url;
            }
            return 'https://images.weserv.nl/?url=' + encodeURIComponent(url);
        }

        async function fetchAsDataUrl(url) {
            const res = await fetch(url, { mode: 'cors' });
            if (!res.ok) throw new Error('Failed to fetch: ' + url);
            const blob = await res.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }

        async function urlToDataUrl(url) {
            try {
                return await fetchAsDataUrl(url);
            } catch (e) {
                const proxyUrl = buildProxyUrl(url);
                if (proxyUrl === url) throw e;
                return await fetchAsDataUrl(proxyUrl);
            }
        }

        async function convertToJpegViaCanvas(dataUrl) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 0.92));
                };
                img.onerror = reject;
                img.src = dataUrl;
            });
        }

        async function resolveImageForPdf(val) {
            if (!val) return null;
            if (val.startsWith('data:')) {
                const isPdfSafe = val.startsWith('data:image/jpeg') || val.startsWith('data:image/png');
                if (isPdfSafe) return val;
                try {
                    return await convertToJpegViaCanvas(val);
                } catch (e) {
                    return null;
                }
            }
            if (val.startsWith('http://') || val.startsWith('https://')) {
                try {
                    const fetched = await urlToDataUrl(val);
                    return await resolveImageForPdf(fetched);
                } catch (e) {
                    return null;
                }
            }
            return 'data:image/jpeg;base64,' + val;
        }

        function buildCasesFlatList() {
            const flat = [];
            const casesRaw = cvData.clinicalCases;
            const cases = Array.isArray(casesRaw) ? casesRaw : [];
            
            cases.forEach(cat => {
                if (cat && cat.enabled === false) return;
                const categoryTitle = pickLangValue(cat.category || '', cat.category_ar || '');
                const catCases = Array.isArray(cat.cases) ? cat.cases : [];
                
                catCases.forEach(c => {
                    const title = pickLangValue(c.alt || '', c.alt_ar || '');
                    const description = pickLangValue(c.description || '', c.description_ar || '');
                    
                    flat.push({
                        categoryTitle,
                        photo: c.photo || '',
                        title: title,
                        description: description
                    });
                });
            });
            
            const seenTitles = new Set();
            const finalFlat = [];
            
            flat.forEach(item => {
                const normalizedTitle = (item.title || '').trim().toLowerCase();
                if (!seenTitles.has(normalizedTitle)) {
                    seenTitles.add(normalizedTitle);
                    finalFlat.push(item);
                } 
            });
            
            return finalFlat;
        }

        async function generateCvPdf() {
            const hero = (cvData.hero || {});
            const skills = (cvData.skills || {});
            const education = (cvData.education || {});
            const labels = (cvData.labels || {});

            const name = hero.name || cvData.title || 'CV';
            const role = hero.tagline || '';
            const graduation = hero.graduation || '';
            const profileImageUrl = hero.profile_image || '';

            let profileImageDataUrl = null;
            if (profileImageUrl) {
                try {
                    profileImageDataUrl = await resolveImageForPdf(profileImageUrl);
                } catch (e) {
                    profileImageDataUrl = null;
                }
            }

            const cases = buildCasesFlatList();
            const maxCaseImages = 1000;
            const casePages = [];
            
            for (let i = 0; i < cases.length; i++) {
                const item = cases[i];
                let caseImage = null;
                if (item.photo && i < maxCaseImages) {
                    try {
                        caseImage = await resolveImageForPdf(item.photo);
                    } catch (e) {
                        caseImage = null;
                    }
                }

                const textParts = [];
                if (item.categoryTitle) textParts.push({ text: item.categoryTitle, bold: true, fontSize: 18, color: '#3b82f6', alignment: 'center', margin: [0, 0, 0, 6] });
                if (item.title) textParts.push({ text: item.title, bold: true, fontSize: 16, color: '#ffffff', alignment: 'center', margin: [0, 0, 0, 6] });
                
                if (item.description) {
                    const normalizedTitle = (item.title || '').trim().toLowerCase();
                    const normalizedDescription = (item.description || '').trim().toLowerCase();
                    if (normalizedDescription !== normalizedTitle) {
                        textParts.push({ text: item.description, fontSize: 12, color: '#9ca3af', alignment: 'center', margin: [0, 0, 0, 0] });
                    }
                }

                const pageContent = [];
                if (textParts.length > 0) {
                    pageContent.push({
                        stack: textParts,
                        alignment: 'center',
                        margin: [0, 0, 0, 15]
                    });
                }

                if (caseImage) {
                    pageContent.push({
                        image: caseImage,
                        fit: [495, 580], 
                        alignment: 'center'
                    });
                } else if (item.photo) {
                    pageContent.push({ text: item.photo, color: '#3b82f6', fontSize: 9, alignment: 'center' });
                }

                if (pageContent.length > 0) {
                    casePages.push({
                        pageBreak: 'before',
                        stack: pageContent,
                        unbreakable: true,
                        margin: [0, 20, 0, 0]
                    });
                }
            }

            const contactLines = [];
            if (cvData.contact?.phone) {
                contactLines.push({ text: (labels.phone || 'Phone') + ': ' + cvData.contact.phone, style: 'small', alignment: 'center', margin: [0, 4, 0, 0] });
            }
            if (cvData.contact?.whatsapp) {
                contactLines.push({ text: (labels.whatsapp || 'WhatsApp') + ': ' + cvData.contact.whatsapp, style: 'small', alignment: 'center', margin: [0, 4, 0, 0] });
            }
            if (cvData.contact?.email) {
                contactLines.push({ text: (labels.email || 'Email') + ': ' + cvData.contact.email, style: 'small', alignment: 'center', margin: [0, 4, 0, 0] });
            }
            
            const clinicalSkills = (skills.clinical || []).map(s => ({ text: s }));
            const digitalSkills = (skills.digital || []).map(s => ({ text: s }));
            const softSkills = (skills.soft || []).map(s => ({ text: s }));

            const timeline = (education.timeline || []).map(t => {
                const year = t.year ? (t.year + ' — ') : '';
                const event = t.event || '';
                return { text: year + event };
            });

            // PAGE 1
            const page1Hero = {
                stack: [
                    profileImageDataUrl ? { 
                        image: profileImageDataUrl, 
                        width: 150, 
                        alignment: 'center',
                        margin: [0, 0, 0, 20]
                    } : { text: '', width: 0 },
                    { text: name.toUpperCase(), style: 'headerName', alignment: 'center' },
                    { text: role, style: 'headerRole', alignment: 'center', margin: [0, 8, 0, 6] },
                    graduation ? { text: graduation, style: 'headerGraduation', alignment: 'center' } : null,
                    {
                        canvas: [
                            { type: 'line', x1: 200, y1: 0, x2: 315, y2: 0, lineWidth: 2, lineColor: '#3b82f6' }
                        ],
                        alignment: 'center',
                        margin: [0, 15, 0, 15]
                    },
                    {
                        stack: contactLines,
                        alignment: 'center',
                        margin: [0, 0, 0, 10]
                    }
                ].filter(Boolean),
                margin: [0, 80, 0, 0]
            };

            // PAGE 2
            const page2Skills = {
                pageBreak: 'before',
                stack: [
                    { text: 'PROFESSIONAL SKILLS', style: 'sectionHeader', alignment: 'center' },
                    {
                        canvas: [
                            { type: 'line', x1: 235, y1: 0, x2: 280, y2: 0, lineWidth: 2, lineColor: '#3b82f6' }
                        ],
                        alignment: 'center',
                        margin: [0, 15, 0, 40]
                    },
                    clinicalSkills.length > 0 ? {
                        stack: [
                            { text: 'Clinical Skills', style: 'subsectionHeader', alignment: 'center' },
                            { text: clinicalSkills.map(x => x.text).join('  •  '), style: 'skillItem', alignment: 'center', margin: [0, 8, 0, 30] }
                        ]
                    } : null,
                    digitalSkills.length > 0 ? {
                        stack: [
                            { text: 'Digital Skills', style: 'subsectionHeader', alignment: 'center' },
                            { text: digitalSkills.map(x => x.text).join('  •  '), style: 'skillItem', alignment: 'center', margin: [0, 8, 0, 30] }
                        ]
                    } : null,
                    softSkills.length > 0 ? {
                        stack: [
                            { text: 'Soft Skills', style: 'subsectionHeader', alignment: 'center' },
                            { text: softSkills.map(x => x.text).join('  •  '), style: 'skillItem', alignment: 'center', margin: [0, 8, 0, 10] }
                        ]
                    } : null
                ].filter(Boolean),
                margin: [0, 60, 0, 0]
            };

            // PAGE 3
            const page3Education = {
                pageBreak: 'before',
                stack: [
                    { text: 'EDUCATION & CAREER', style: 'sectionHeader', alignment: 'center' },
                    {
                        canvas: [
                            { type: 'line', x1: 235, y1: 0, x2: 280, y2: 0, lineWidth: 2, lineColor: '#3b82f6' }
                        ],
                        alignment: 'center',
                        margin: [0, 15, 0, 40]
                    },
                    education.university ? {
                        stack: [
                            { text: education.university, style: 'universityName', alignment: 'center' },
                            education.graduation_year ? { 
                                text: 'Graduated: ' + education.graduation_year, 
                                style: 'graduationYear',
                                alignment: 'center',
                                margin: [0, 8, 0, 35]
                            } : null
                        ].filter(Boolean)
                    } : null,
                    timeline.length > 0 ? {
                        stack: timeline.map(item => ({
                            text: item.text, style: 'timelineItem', alignment: 'center', margin: [0, 0, 0, 12]
                        }))
                    } : null
                ].filter(Boolean),
                margin: [0, 60, 0, 0]
            };

            // PAGE 4
            const page4Cover = casePages.length > 0 ? {
                pageBreak: 'before',
                stack: [
                    { text: 'CLINICAL CASES PORTFOLIO', style: 'coverTitle', alignment: 'center' },
                    {
                        canvas: [
                            { type: 'line', x1: 180, y1: 0, x2: 335, y2: 0, lineWidth: 3, lineColor: '#3b82f6' }
                        ],
                        alignment: 'center',
                        margin: [0, 25, 0, 0]
                    }
                ],
                margin: [0, 280, 0, 0]
            } : null;

            const docDefinition = {
                pageSize: 'A4',
                pageMargins: [50, 60, 50, 60],
                background: function () {
                    return {
                        canvas: [
                            { type: 'rect', x: 0, y: 0, w: 595.28, h: 841.89, color: '#111827' }
                        ]
                    };
                },
                defaultStyle: {
                    font: 'Roboto',
                    fontSize: 11,
                    lineHeight: 1.6,
                    color: '#e5e7eb'
                },
                header: function(currentPage, pageCount) {
                    return {
                        margin: [50, 20, 50, 0],
                        columns: [
                            {
                                text: currentPage > 1 ? name : '',
                                style: 'headerText',
                                width: '*'
                            },
                            {
                                text: currentPage > 1 ? 'Page ' + currentPage + ' of ' + pageCount : '',
                                style: 'pageNumber',
                                alignment: 'right'
                            }
                        ]
                    };
                },
                footer: function(currentPage) {
                    if (currentPage === 1) return null;
                    return {
                        margin: [50, 0, 50, 20],
                        text: '© ' + new Date().getFullYear() + ' ' + name,
                        style: 'footerText',
                        alignment: 'center'
                    };
                },
                content: [
                    page1Hero,
                    page2Skills,
                    page3Education,
                    page4Cover,
                    ...(casePages.length > 0 ? casePages : []),
                    ...(casePages.length > 0 ? [{
                        pageBreak: 'before',
                        stack: [
                            { text: 'COMPLETE PORTFOLIO', style: 'sectionHeader', alignment: 'center', margin: [0, 0, 0, 10] },
                            {
                                canvas: [
                                    { type: 'line', x1: 200, y1: 0, x2: 315, y2: 0, lineWidth: 2, lineColor: '#3b82f6' }
                                ],
                                alignment: 'center',
                                margin: [0, 0, 0, 40]
                            },
                            { text: 'For complete portfolio and additional cases', style: 'portfolioText', alignment: 'center', margin: [0, 0, 0, 15] },
                            { text: 'please visit my professional website:', style: 'portfolioText', alignment: 'center', margin: [0, 0, 0, 10] },
                            { 
                                text: cvData.baseURL || '', 
                                style: 'portfolioLink', 
                                alignment: 'center',
                                color: '#3b82f6',
                                decoration: 'underline'
                            }
                        ],
                        margin: [0, 250, 0, 0]
                    }] : [])
                ].filter(Boolean),
                styles: {
                    headerName: { fontSize: 32, bold: true, color: '#ffffff', letterSpacing: 2 },
                    headerRole: { fontSize: 16, color: '#3b82f6', bold: true, letterSpacing: 1 },
                    headerGraduation: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
                    sectionHeader: { fontSize: 20, bold: true, color: '#ffffff', letterSpacing: 2 },
                    coverTitle: { fontSize: 26, bold: true, color: '#ffffff', letterSpacing: 3 },
                    subsectionHeader: { fontSize: 15, bold: true, color: '#3b82f6', marginBottom: 5 },
                    universityName: { fontSize: 18, bold: true, color: '#f3f4f6' },
                    graduationYear: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },
                    skillItem: { fontSize: 12, color: '#d1d5db' },
                    timelineItem: { fontSize: 13, color: '#e5e7eb', lineHeight: 1.5 },
                    portfolioText: { fontSize: 13, color: '#9ca3af' },
                    portfolioLink: { fontSize: 15, bold: true },
                    small: { fontSize: 11, color: '#d1d5db' },
                    headerText: { fontSize: 9, color: '#4b5563', fontStyle: 'italic' },
                    pageNumber: { fontSize: 9, color: '#6b7280' },
                    footerText: { fontSize: 9, color: '#6b7280' }
                }
            };

            const fileNameSafe = (name || 'cv').toString().replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '_');
            
            try {
                const pdfDoc = pdfMake.createPdf(docDefinition);
                pdfDoc.download((fileNameSafe || 'cv') + '_' + CV_LANG + '.pdf');
            } catch (error) {
                console.error('Error creating PDF:', error);
                throw error;
            }
        }

        let currentLang = 'en';
        let currentTheme = localStorage.getItem('theme') || 'light';

        document.addEventListener('DOMContentLoaded', function() {
            initTheme();
            initLanguage();
            initNavigation();
            initFooter();
            
            const dlBtn = document.getElementById('downloadCvBtn');
            if (dlBtn) {
                dlBtn.addEventListener('click', async function() {
                    const btn = this;
                    const oldHtml = btn.innerHTML;
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    try {
                        await generateCvPdf();
                    } catch (error) {
                        console.error('PDF generation failed:', error);
                        alert('Failed to generate PDF. Please check console for details.');
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = oldHtml;
                    }
                });
            }
        });

        function initTheme() {
            document.documentElement.setAttribute('data-theme', currentTheme);
            const themeIcon = document.querySelector('#themeToggle i');
            if (themeIcon) {
                themeIcon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }

        const themeToggleBtn = document.getElementById('themeToggle');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', function() {
                currentTheme = currentTheme === 'light' ? 'dark' : 'light';
                localStorage.setItem('theme', currentTheme);
                initTheme();
            });
        }

        function initLanguage() {
            document.body.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
            document.documentElement.setAttribute('lang', currentLang);
            updateI18nText();
            updateI18nAlt();
        }

        const langToggleBtn = document.getElementById('langToggle');
        if (langToggleBtn) {
            langToggleBtn.addEventListener('click', function() {
                currentLang = currentLang === 'en' ? 'ar' : 'en';
                const langText = document.querySelector('.lang-text');
                if (langText) langText.textContent = currentLang === 'en' ? 'AR' : 'EN';
                initLanguage();
            });
        }

        function updateI18nText() {
            document.querySelectorAll('[data-en][data-ar]').forEach(el => {
                const enText = el.getAttribute('data-en');
                const arText = el.getAttribute('data-ar');
                if (enText && arText) {
                    el.textContent = currentLang === 'en' ? enText : arText;
                }
            });
        }

        function updateI18nAlt() {
            document.querySelectorAll('[data-alt-en][data-alt-ar]').forEach(el => {
                const enAlt = el.getAttribute('data-alt-en');
                const arAlt = el.getAttribute('data-alt-ar');
                if (enAlt && arAlt) {
                    el.setAttribute('alt', currentLang === 'en' ? enAlt : arAlt);
                }
            });
        }

        function initNavigation() {
            const menuBtn = document.getElementById('menuBtn');
            const closeBtn = document.getElementById('closeBtn');
            const mobileNav = document.getElementById('mobileNav');
            const navLinks = document.querySelectorAll('.nav-links a, .bottom-nav .nav-item');
            
            if (menuBtn && mobileNav) {
                menuBtn.addEventListener('click', () => mobileNav.classList.add('active'));
            }
            if (closeBtn && mobileNav) {
                closeBtn.addEventListener('click', () => mobileNav.classList.remove('active'));
            }
            
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    if (mobileNav) mobileNav.classList.remove('active');
                    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
                    if (this.classList.contains('nav-item')) this.classList.add('active');
                });
            });
            
            const sections = document.querySelectorAll('.section');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id;
                        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
                            item.classList.remove('active');
                            if (item.getAttribute('href') === '#' + id) item.classList.add('active');
                        });
                    }
                });
            }, { threshold: 0.3 });
            
            sections.forEach(section => observer.observe(section));
        }

        function initFooter() {
            const yr = document.getElementById('currentYear');
            if (yr) yr.textContent = new Date().getFullYear();
        }
    </script>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.min.js"></script>

    <button type="button" class="floating-btn" id="downloadCvBtn" aria-label="Download CV PDF">
        <i class="fas fa-file-arrow-down"></i>
    </button>

</body>
</html>`;
}
