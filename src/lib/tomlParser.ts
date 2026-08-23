/**
 * Robust TOML parser specialized for PortfolioHubs Hugo config.toml structure
 */

export interface ParsedPortfolio {
  fullName: string;
  fullNameAr: string;
  title: string;
  titleAr: string;
  graduationYear: string;
  university: string;
  universityAr: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  clinicName: string;
  clinicNameAr: string;
  locationAddress: string;
  locationAddressAr: string;
  locationLat: string;
  locationLng: string;
  profilePhoto: string;
  profilePreview: string;
  clinicalSkills: string[];
  digitalSkills: string[];
  softSkills: string[];
  clinicalSkillsAr: string[];
  digitalSkillsAr: string[];
  softSkillsAr: string[];
  timeline: Array<{ year: string; event: string; eventAr: string }>;
  cases: Array<{
    category: string;
    categoryAr: string;
    title: string;
    titleAr: string;
    photo: string;
    preview: string;
  }>;
}

export function parseHugoToml(tomlStr: string): ParsedPortfolio {
  const result: ParsedPortfolio = {
    fullName: '',
    fullNameAr: '',
    title: '',
    titleAr: '',
    graduationYear: '',
    university: '',
    universityAr: '',
    phone: '',
    whatsapp: '',
    email: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    clinicName: '',
    clinicNameAr: '',
    locationAddress: '',
    locationAddressAr: '',
    locationLat: '',
    locationLng: '',
    profilePhoto: '',
    profilePreview: '',
    clinicalSkills: [],
    digitalSkills: [],
    softSkills: [],
    clinicalSkillsAr: [],
    digitalSkillsAr: [],
    softSkillsAr: [],
    timeline: [],
    cases: []
  };

  const getCleanVal = (line: string): string => {
    const parts = line.split('=');
    if (parts.length < 2) return '';
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
      val = val.slice(1, -1);
    }
    return val.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  };

  const lines = tomlStr.split('\n');
  let currentSection = '';
  let currentArraySection = '';
  let currentCaseCategory = '';
  let currentCaseCategoryAr = '';
  let arTimelineIndex = -1;

  // Helpers for multiline array parsing
  let inArrayKey = '';
  let inArraySection = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    // Detect [[table_array]]
    if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
      currentArraySection = trimmed.slice(2, -2).trim();
      inArrayKey = '';
      inArraySection = '';

      if (currentArraySection === 'params.education.timeline' || currentArraySection === 'params.timeline') {
        result.timeline.push({ year: '', event: '', eventAr: '' });
      } else if (currentArraySection === 'params.ar.education.timeline' || currentArraySection === 'params.ar.timeline') {
        arTimelineIndex++;
        if (arTimelineIndex >= result.timeline.length) {
          result.timeline.push({ year: '', event: '', eventAr: '' });
        }
      } else if (currentArraySection === 'params.clinical_cases.cases' || currentArraySection === 'params.cases') {
        result.cases.push({
          category: currentCaseCategory || 'General',
          categoryAr: currentCaseCategoryAr || '',
          title: '',
          titleAr: '',
          photo: '',
          preview: ''
        });
      }
      continue;
    }

    // Detect [section]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1).trim();
      currentArraySection = '';
      inArrayKey = '';
      inArraySection = '';
      continue;
    }

    // Parse array headers (e.g. clinical = [ ... ])
    if (trimmed.includes('= [') || (trimmed.includes('=') && trimmed.endsWith('['))) {
      const key = trimmed.split('=')[0].trim();
      inArrayKey = key;
      inArraySection = currentSection;

      if (trimmed.includes('[') && trimmed.endsWith(']')) {
        // inline array: key = ["a", "b"]
        const inner = trimmed.slice(trimmed.indexOf('[') + 1, trimmed.lastIndexOf(']'));
        const items = inner
          .split(',')
          .map(s => s.trim().replace(/^"|"$/g, '').trim())
          .filter(Boolean);
        assignArray(inArraySection, inArrayKey, items, result);
        inArrayKey = '';
        inArraySection = '';
      }
      continue;
    }

    // Inside multiline array
    if (inArrayKey) {
      if (trimmed.startsWith(']') || trimmed === ']') {
        inArrayKey = '';
        inArraySection = '';
      } else {
        let item = trimmed.replace(/,$/, '').trim();
        if (item.endsWith(']')) {
          item = item.slice(0, -1).trim();
          inArrayKey = '';
        }
        item = item.replace(/^"|"$/g, '').trim();
        if (item) {
          assignArrayItem(inArraySection, inArrayKey, item, result);
        }
      }
      continue;
    }

    // Key = Value
    if (trimmed.includes('=')) {
      const key = trimmed.split('=')[0].trim();
      const val = getCleanVal(trimmed);

      // Handle [[params.education.timeline]]
      if ((currentArraySection === 'params.education.timeline' || currentArraySection === 'params.timeline') && result.timeline.length > 0) {
        const last = result.timeline[result.timeline.length - 1];
        if (key === 'year') last.year = val;
        if (key === 'event') last.event = val;
        if (key === 'eventAr' || key === 'event_ar') last.eventAr = val;
      }
      // Handle [[params.ar.education.timeline]]
      else if (currentArraySection === 'params.ar.education.timeline' || currentArraySection === 'params.ar.timeline') {
        const target = result.timeline[arTimelineIndex];
        if (target) {
          if (key === 'event') target.eventAr = val;
          if (key === 'year' && !target.year) target.year = val;
        }
      }
      // Handle [[params.clinical_cases]] category container
      else if (currentArraySection === 'params.clinical_cases') {
        if (key === 'category') currentCaseCategory = val;
        if (key === 'category_ar' || key === 'categoryAr') currentCaseCategoryAr = val;
      }
      // Handle [[params.clinical_cases.cases]] or [[params.cases]]
      else if ((currentArraySection === 'params.clinical_cases.cases' || currentArraySection === 'params.cases') && result.cases.length > 0) {
        const last = result.cases[result.cases.length - 1];
        if (key === 'photo') { last.photo = val; last.preview = val; }
        if (key === 'alt' || key === 'description' || key === 'title') {
          if (!last.title || key === 'description' || key === 'title') last.title = val;
        }
        if (key === 'alt_ar' || key === 'description_ar' || key === 'titleAr' || key === 'title_ar') {
          if (!last.titleAr || key === 'description_ar' || key === 'titleAr') last.titleAr = val;
        }
        if (key === 'category') last.category = val;
        if (key === 'category_ar' || key === 'categoryAr') last.categoryAr = val;
      }
      // Handle general sections and key-values
      else {
        const isAr = currentSection.includes('.ar.') || currentSection.startsWith('params.ar');

        // Full Name
        if (key === 'doctor_name_en') result.fullName = val;
        else if (key === 'doctor_name_ar') result.fullNameAr = val;
        else if (key === 'name') {
          if (isAr) result.fullNameAr = val;
          else if (!result.fullName) result.fullName = val;
        } else if (key === 'fullName') result.fullName = val;
        else if (key === 'fullNameAr') result.fullNameAr = val;
        else if (key === 'title' && (!currentSection || currentSection === 'params')) {
          if (!result.fullName) result.fullName = val;
        }

        // Title / Tagline / Role
        if (key === 'tagline') {
          if (isAr) result.titleAr = val;
          else result.title = val;
        } else if (key === 'role') {
          if (isAr && !result.titleAr) result.titleAr = val;
          else if (!isAr && !result.title) result.title = val;
        } else if (key === 'title' && currentSection.includes('hero')) {
          if (isAr) result.titleAr = val;
          else result.title = val;
        } else if (key === 'titleAr') {
          result.titleAr = val;
        }

        // Profile Photo
        if (key === 'profile_image' || key === 'profilePhoto') {
          result.profilePhoto = val;
          result.profilePreview = val;
        }

        // Graduation & University
        if (key === 'graduation') {
          const match = val.match(/Graduated\s+(\d{4})\s*-\s*(.*)/i);
          if (match) {
            result.graduationYear = match[1];
            if (!isAr) result.university = match[2];
          }
        }
        if (key === 'university') {
          if (isAr) result.universityAr = val;
          else result.university = val;
        }
        if (key === 'universityAr') result.universityAr = val;
        if (key === 'graduation_year' || key === 'graduationYear') result.graduationYear = val;

        // Clinic Name
        if (key === 'clinic' || key === 'clinicName') {
          if (isAr) result.clinicNameAr = val;
          else result.clinicName = val;
        }
        if (key === 'clinicNameAr') result.clinicNameAr = val;

        // Contact & Socials
        if (key === 'phone') result.phone = val;
        if (key === 'whatsapp') result.whatsapp = val;
        if (key === 'email') result.email = val;
        if (key === 'instagram') result.instagram = val;
        if (key === 'facebook') result.facebook = val;
        if (key === 'linkedin') result.linkedin = val;

        // Location & Coordinates
        if (key === 'address' || key === 'locationAddress') {
          if (isAr) result.locationAddressAr = val;
          else result.locationAddress = val;
        }
        if (key === 'locationAddressAr') result.locationAddressAr = val;
        if (key === 'latitude' || key === 'locationLat') result.locationLat = val;
        if (key === 'longitude' || key === 'locationLng') result.locationLng = val;
      }
    }
  }

  return result;
}

function assignArray(section: string, key: string, items: string[], res: ParsedPortfolio) {
  items.forEach(it => assignArrayItem(section, key, it, res));
}

function assignArrayItem(section: string, key: string, item: string, res: ParsedPortfolio) {
  const isAr = section.includes('.ar.') || section.startsWith('params.ar');
  const lowerKey = key.toLowerCase();

  if (lowerKey.includes('clinical')) {
    if (isAr) res.clinicalSkillsAr.push(item);
    else res.clinicalSkills.push(item);
  } else if (lowerKey.includes('digital')) {
    if (isAr) res.digitalSkillsAr.push(item);
    else res.digitalSkills.push(item);
  } else if (lowerKey.includes('soft')) {
    if (isAr) res.softSkillsAr.push(item);
    else res.softSkills.push(item);
  }
}

