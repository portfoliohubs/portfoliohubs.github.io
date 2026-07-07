/**
 * PortfolioHubs — Master Configuration File
 * This is the SINGLE FILE to edit for all app customization.
 */

const CONFIG = {

  // ─── BRAND ──────────────────────────────────────────────────────────────────
  brand: {
    name: "PortfolioHubs",
    slogan: "الاسنانجى لازم يتدلع",
    sloganEn: "The Dentist Deserves to Shine",
    logoUrl: "https://github.com/user-attachments/assets/fef6c67d-5ed0-4459-b41d-4c288ab48163",
    favicon: "https://github.com/user-attachments/assets/fef6c67d-5ed0-4459-b41d-4c288ab48163",
  },

  // ─── SOCIAL LINKS ────────────────────────────────────────────────────────────
  // Leave empty ("") to hide an icon
  social: {
    facebook:  "https://www.facebook.com/share/1CRkHCYgen/",   // e.g. "https://facebook.com/yourpage"
    instagram: "https://www.instagram.com/portfoliohubs?igsh=MTF3d2tzcXU0cm41cw==",   // e.g. "https://instagram.com/yourhandle"
    whatsapp:  "https://wa.me/201271476215",   // e.g. "https://wa.me/201271476215"
  },

  // ─── WHATSAPP ────────────────────────────────────────────────────────────────
  whatsapp: {
    destinationNumber: "201271476215",
    message: "Hi! Here is my portfolio configuration file from PortfolioHubs.",
  },

  // ─── PEXELS ──────────────────────────────────────────────────────────────────
  // Get a free API key at https://www.pexels.com/api/
  pexels: {
    apiKey: "",  // paste your Pexels API key here
  },

  // ─── SEO ─────────────────────────────────────────────────────────────────────
  seo: {
    googleVerification: "6VtKNI5qnSYsfjCTBMfnm9PuZjjR7aYh6crmofpS8yw",
    siteUrl: "https://portfoliohubs.github.io/",
    keywords: "portfoliohubs, cv maker, dental cv, cv pdf maker, dental portfolio, dentist cv, free cv maker",
  },

  // ─── TOML BASE URL ────────────────────────────────────────────────────────────
  toml: {
    baseUrl: "https://portfoliohubs.github.io/",
    languageCode: "en-us",
    defaultContentLanguage: "en",
  },

  // ─── CLINICAL CASE CATEGORIES ─────────────────────────────────────────────────
  caseCategories: [
    { id: "cosmetic",             en: "Cosmetic Dentistry",       ar: "تجميل الأسنان" },
    { id: "operative",            en: "Operative & Esthetics",    ar: "الحشو والتجميل" },
    { id: "prosthesis_fixed",     en: "Fixed Prosthodontics",     ar: "تركيبات ثابتة" },
    { id: "prosthesis_removable", en: "Removable Prosthodontics", ar: "تركيبات متحركة" },
    { id: "endodontics",          en: "Endodontics",              ar: "حشو العصب" },
    { id: "oral_surgery",         en: "Oral Surgery",             ar: "جراحة الفم" },
    { id: "periodontics",         en: "Periodontics",             ar: "أمراض اللثة" },
    { id: "orthodontics",         en: "Orthodontics",             ar: "تقويم الأسنان" },
    { id: "pediatric",            en: "Pediatric Dentistry",      ar: "طب أسنان الأطفال" },
    { id: "implant",              en: "Dental Implants",          ar: "زراعة الأسنان" },
  ],

  // ─── HOME PAGE TEXT ───────────────────────────────────────────────────────────
  home: {
    headline: "Build Your professional Portfolio & CV",
    subheadline: "الاسنانجى لازم يتدلع",
    portfolioButtonTitle: "Portfolio Appear in Google Search & ChatGPT answers",
    portfolioButtonSubtitle: "Professional with jsut 499 LE • appearing in google search • appearing in AI tools answers as (Chatgpt)",
    cvButtonTitle: "CV PDF Maker for free ",
    cvButtonSubtitle: "Easy• Free • No account needed",
    features: [
      "Professional",
      "No account required",
      "in just 5 minutes",
      "Google & AI answers",
    ],
    // ── USER COUNTER ─────────────────────────────────────────────────────────
    // Change this number manually. It is displayed as-is (no live tracking).
    usersCount: "17816",
    usersCountLabel: "users till now (updated weekly)",
  },

  // ─── PORTFOLIO PATHWAY — INTRO STEP ──────────────────────────────────────────
  // This read-only step appears before "Personal Info" in the Portfolio pathway.
  // Users read it and click Next to proceed.
  portfolioIntro: {
    stepLabel: "for who ?",
    title: "For Who is this Portfolio website?",
    // Each string in this array is one paragraph/line in the intro
    content: [
      "for who this ?",
      "for dentist need :",
      "1. appear in google search",
      "2. appear in Chatgpt, Gemini, all other AI tools answers",
      "3. need official website",
      "4. professional",
      "5. creative permanent marketing ",
    ],
  },

  // ─── PAY WHAT YOU WANT ───────────────────────────────────────────────────────
  // Appears at the end of the CV PDF pathway.
  // Set enabled to "on" to show the button, "off" to hide it.
  payWhatYouWant: {
    enabled: "off",              // "on" | "off"
    buttonLabel: "Pay What You Want",
    whatsappNumber: "201271476215",
    whatsappMessage: "i love your support ,i need to pay",
  },

  // ─── FIELD PLACEHOLDERS ──────────────────────────────────────────────────────
  placeholders: {
    fullNameEn:     "Dr. Mohammed Ahmed",
    fullNameAr:     "د. محمد أحمد",
    titleEn:        "Internship Dentist, Orthodontist",
    titleAr:        "طبيب أسنان متدرب, اخصائى تقويم",
    graduationYear: "2025",
    universityEn:   "Faculty of Dentistry, University Name",
    universityAr:   "كلية طب الأسنان، اسم الجامعة",
    phone:          "+20 123 456 7890",
    whatsapp:       "+20 123 456 7890",
    email:          "doctor@example.com",
    website:        "Facebook or Instagram or LinkedIn,...etc",
    clinicalSkill:  "e.g. Oral Surgery",
    digitalSkill:   "e.g. Dental Photography",
    softSkill:      "e.g. Patient Communication",
    milestoneYear:  "2025",
    milestoneEn:    "e.g. Graduated from Faculty of Dentistry",
    milestoneAr:    "مثال: تخرجت من كلية طب الأسنان",
    caseTitleEn:    "e.g. Class IV Composite Restoration",
    caseTitleAr:    "مثال: حشوة كومبوزيت (غرض اللغه العربيه هنا هو ان يفهم المرضى)",
    caseSubtitle:   "e.g. Treatment with composite",
  },

  // ─── WIZARD STEP LABELS ───────────────────────────────────────────────────────
  steps: {
    personal: "Personal Info",
    contact:  "Contact Details",
    photo:    "Profile Photo",
    skills:   "Professional Skills",
    timeline: "Career Timeline",
    cases:    "Clinical Cases",
    preview:  "Preview & Download",
  },

  // ─── FORM LABELS ─────────────────────────────────────────────────────────────
  labels: {
    fullNameEn:          "Full Name (English)",
    fullNameAr:          "Full Name (Arabic)",
    titleEn:             "Title / Role (English)",
    titleAr:             "Title / Role (Arabic)",
    graduationYear:      "Graduation Year",
    universityEn:        "University (English)",
    universityAr:        "University (Arabic)",
    phone:               "Phone",
    whatsapp:            "WhatsApp",
    email:               "Email",
    website:             "Your Link (Professional Page — optional)",
    profilePhoto:        "Profile Photo",
    profilePhotoHint:    "Upload a clear, front-facing photo. Any size accepted.",
    clinicalSkills:      "Clinical Skills",
    digitalSkills:       "Digital Skills",
    softSkills:          "Soft Skills",
    skillInputHint:      "Type a skill and click Add",
    addSkill:            "Add",
    timeline:            "Career Timeline",
    timelineHint:        "Add milestones that appear on the Education page",
    addMilestone:        "Add Milestone",
    milestoneYear:       "Year",
    milestoneEn:         "Event (English)",
    milestoneAr:         "Event (Arabic)",
    cases:               "Clinical Cases",
    casesHint:           "Select multiple photos at once — each photo becomes a case entry",
    // "Unlimited Cases" label shown in the CV pathway cases section header
    casesUnlimitedLabel: "Unlimited Cases",
    selectPhotos:        "Select Case Photos",
    category:            "Category",
    selectCategory:      "Select a category",
    customCategory:      "Custom category",
    caseTitleEn:         "Case Title (English)",
    caseTitleAr:         "Case Title (Arabic)",
    caseSubtitle:        "Subtitle / Description (optional)",
    previewTitle:        "Review Your Data",
    previewSubtitle:     "Check everything before downloading",
  },

  // ─── BUTTON LABELS ───────────────────────────────────────────────────────────
  buttons: {
    next:            "Next Step",
    previous:        "Previous",
    addMilestone:    "Add Milestone",
    removeMilestone: "Remove",
    downloadToml:    "Download TOML File",
    sendWhatsApp:    "Send via WhatsApp (it is a MUST)",
    downloadPdf:     "Download CV as PDF",
    backHome:        "Back to Home",
    resetForm:       "Start New",
  },

  // ─── CV PDF SETTINGS ──────────────────────────────────────────────────────────
  pdf: {
    footerText:          "© 2026",
    primaryColor:        "#BB86FC",
    accentColor:         "#164e63",
    backgroundColor:     "#011017",
    textColor:           "#0f0f0f",
    mutedColor:          "#164e63",
    lineColor:           "#0ab4fc",
    showCasesInPdf:      true,
    maxCasePhotosPerRow: 1,   // kept for compatibility; new design uses 1 case per page
  },
};

export default CONFIG;
