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
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    return val.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  };

  const lines = tomlStr.split('\n');
  let currentSection = '';
  let currentArraySection = '';
  let currentCaseCategory = '';
  let currentCaseCategoryAr = '';

  // Helpers for multiline array parsing
  let inArrayKey = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    // Detect [[table_array]]
    if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
      currentArraySection = trimmed.slice(2, -2).trim();
      inArrayKey = '';
      if (currentArraySection === 'params.education.timeline') {
        result.timeline.push({ year: '', event: '', eventAr: '' });
      } else if (currentArraySection === 'params.ar.education.timeline') {
        // match existing or add
      } else if (currentArraySection === 'params.clinical_cases.cases') {
        result.cases.push({
          category: currentCaseCategory || 'implants',
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
      continue;
    }

    // Parse array items (e.g. clinical = [ ... ])
    if (trimmed.includes('= [') || trimmed.endsWith('=')) {
      const key = trimmed.split('=')[0].trim();
      inArrayKey = key;
      if (trimmed.endsWith(']')) {
        // inline array
        const inner = trimmed.slice(trimmed.indexOf('[') + 1, trimmed.lastIndexOf(']'));
        const items = inner.split(',').map(s => s.trim().replace(/^"|"$/g, '').trim()).filter(Boolean);
        assignArray(currentSection, inArrayKey, items, result);
        inArrayKey = '';
      }
      continue;
    }

    if (inArrayKey) {
      if (trimmed.startsWith(']')) {
        inArrayKey = '';
      } else {
        const item = trimmed.replace(/,$/, '').replace(/^"|"$/g, '').trim();
        if (item) {
          assignArrayItem(currentSection, inArrayKey, item, result);
        }
      }
      continue;
    }

    // Key = Value
    if (trimmed.includes('=')) {
      const key = trimmed.split('=')[0].trim();
      const val = getCleanVal(trimmed);

      if (currentArraySection === 'params.education.timeline' && result.timeline.length > 0) {
        const last = result.timeline[result.timeline.length - 1];
        if (key === 'year') last.year = val;
        if (key === 'event') last.event = val;
      } else if (currentArraySection === 'params.ar.education.timeline') {
        // match by year if exists
        const last = result.timeline[result.timeline.length - 1];
        if (last && key === 'event') last.eventAr = val;
      } else if (currentArraySection === 'params.clinical_cases') {
        if (key === 'category') currentCaseCategory = val;
        if (key === 'category_ar') currentCaseCategoryAr = val;
      } else if (currentArraySection === 'params.clinical_cases.cases' && result.cases.length > 0) {
        const last = result.cases[result.cases.length - 1];
        if (key === 'photo') { last.photo = val; last.preview = val; }
        if (key === 'alt' || key === 'description') last.title = val;
        if (key === 'alt_ar' || key === 'description_ar') last.titleAr = val;
      } else {
        // Match specific standard keys
        if (key === 'title' && !currentSection) result.fullName = val;
        if (key === 'doctor_name_en') result.fullName = val;
        if (key === 'doctor_name_ar') result.fullNameAr = val;
        if (key === 'tagline') result.title = val;
        if (key === 'profile_image') { result.profilePhoto = val; result.profilePreview = val; }
        if (key === 'graduation') {
          const match = val.match(/Graduated\s+(\d{4})\s*-\s*(.*)/i);
          if (match) {
            result.graduationYear = match[1];
            result.university = match[2];
          }
        }
        if (key === 'university') {
          if (currentSection === 'params.ar.education') result.universityAr = val;
          else result.university = val;
        }
        if (key === 'graduation_year') result.graduationYear = val;
        if (key === 'clinic') {
          if (currentSection.includes('.ar.')) result.clinicNameAr = val;
          else result.clinicName = val;
        }
        if (key === 'phone') result.phone = val;
        if (key === 'whatsapp') result.whatsapp = val;
        if (key === 'email') result.email = val;
        if (key === 'instagram') result.instagram = val;
        if (key === 'facebook') result.facebook = val;
        if (key === 'linkedin') result.linkedin = val;
        if (key === 'address') {
          if (currentSection.includes('.ar.')) result.locationAddressAr = val;
          else result.locationAddress = val;
        }
        if (key === 'latitude') result.locationLat = val;
        if (key === 'longitude') result.locationLng = val;
      }
    }
  }

  return result;
}

function assignArray(section: string, key: string, items: string[], res: ParsedPortfolio) {
  items.forEach(it => assignArrayItem(section, key, it, res));
}

function assignArrayItem(section: string, key: string, item: string, res: ParsedPortfolio) {
  const isAr = section.includes('.ar.');
  if (key === 'clinical') {
    if (isAr) res.clinicalSkillsAr.push(item);
    else res.clinicalSkills.push(item);
  } else if (key === 'digital') {
    if (isAr) res.digitalSkillsAr.push(item);
    else res.digitalSkills.push(item);
  } else if (key === 'soft') {
    if (isAr) res.softSkillsAr.push(item);
    else res.softSkills.push(item);
  }
}
