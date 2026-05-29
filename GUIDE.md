# PortfolioHubs — Complete User & Developer Guide

This guide explains everything you need to know about the project: how it works, how to use it, and how to customize or update any part of it.

---

## What is PortfolioHubs?

PortfolioHubs is a free PWA (installable web app) with two main tools:

1. **Portfolio Appear in Google Search** — collects your data and generates a `config.toml` file that powers your professional Google-searchable portfolio page. The file can be downloaded and sent via WhatsApp.

2. **CV PDF Maker (Free)** — collects your data and generates a professional downloadable PDF CV. Your WhatsApp number is a clickable link inside the PDF.

---

## How to Use the App

### Step 1 — Open the App
Go to the app URL in your browser. On mobile, you can install it as a PWA (Add to Home Screen).

### Step 2 — Choose a Pathway
You'll see two big buttons on the home page:
- "Portfolio Appear in Google Search" → leads to the Portfolio Wizard
- "CV PDF Maker" → leads to the CV Wizard

### Step 3 — Fill the Form Steps
Both wizards share the same 7 steps:

| Step | What to fill |
|------|-------------|
| 1. Personal Info | Name, title, graduation year, university |
| 2. Contact Details | Phone, WhatsApp, email, website/link |
| 3. Profile Photo | Upload a photo (any size, no cropping required) |
| 4. Professional Skills | Clinical, Digital, Soft skills — type and click "Add" for each |
| 5. Career Timeline | Add milestones with year and description |
| 6. Clinical Cases | Upload multiple case photos at once; set category and title for each |
| 7. Preview & Download | Review summary, then download |

> **Portfolio pathway**: final step downloads a TOML file + sends via WhatsApp  
> **CV pathway**: final step downloads a PDF with your WhatsApp as a clickable link

### Adding Skills
In the Skills step, type a skill in the input box and press Enter or click "Add". A tag appears with an × to remove it. No commas or bullets — just type and add.

### Uploading Case Photos
In the Clinical Cases step, click the upload button and select multiple photos from your gallery at once. Each selected photo becomes a separate case. You can then set the category and title for each case. Photos are displayed without cropping (contain mode).

### Dark Mode
Click the moon/sun icon in the top-right corner of every page to toggle dark mode.

---

## The One Config File

**All editable app data lives in one file:**

```
artifacts/portfoliohubs/src/config.ts
```

Open this file to change:

### Brand & Slogan
```typescript
brand: {
  name: "PortfolioHubs",              // App name shown everywhere
  slogan: "الاسنانجى لازم يتدلع",      // Arabic slogan in header/footer
  sloganEn: "The Dentist Deserves to Shine",
  logoUrl: "",                         // Leave empty for text logo, or put image URL
}
```

### WhatsApp Destination
```typescript
whatsapp: {
  destinationNumber: "201271476215",   // The number that receives config files
  message: "Hi! Here is my portfolio configuration file from PortfolioHubs.",
}
```

### Case Categories
```typescript
caseCategories: [
  { id: "cosmetic", en: "Cosmetic Dentistry", ar: "تجميل الأسنان" },
  // Add or remove categories here
]
```
To add a new category: copy an existing line, change the `id`, `en`, and `ar` values.

### Field Placeholders (Example Hints)
```typescript
placeholders: {
  fullNameEn: "Dr. John Doe",
  titleEn:    "Internship Dentist",
  // ...all input field hints
}
```
Change any value here to update the placeholder shown inside that input.

### Home Page Text
```typescript
home: {
  headline: "Build Your Dental Profile",
  subheadline: "Free professional tools...",
  portfolioButtonTitle: "Portfolio Appear in Google Search",
  cvButtonTitle: "CV PDF Maker",
  features: ["No account required", ...]
}
```

### PDF Settings
```typescript
pdf: {
  primaryColor: "#0e7490",         // Teal color for PDF header
  showCasesInPdf: true,            // Set false to exclude case photos
  maxCasePhotosPerRow: 2,          // 1 or 2 photos per row in PDF
}
```

### SEO Settings
```typescript
seo: {
  googleVerification: "6VtKNI5qnSYsfjCTBMfnm9PuZjjR7aYh6crmofpS8yw",
  siteUrl: "https://portfoliohubs.replit.app",
}
```

---

## File Structure Map

```
artifacts/portfoliohubs/
├── GUIDE.md                      ← You are here
├── index.html                    ← SEO meta tags, Google verification, PWA manifest
├── public/
│   ├── manifest.json             ← PWA install settings (name, theme color, icons)
│   ├── sw.js                     ← Service worker for offline support
│   └── favicon.svg               ← Browser tab icon
└── src/
    ├── config.ts                 ← MAIN CONFIG FILE — edit all data here
    ├── main.tsx                  ← App entry point (don't need to edit)
    ├── App.tsx                   ← Router setup
    ├── index.css                 ← Theme colors (light + dark mode)
    ├── lib/
    │   ├── tomlGenerator.ts      ← Generates the TOML config file content
    │   ├── pdfGenerator.ts       ← Generates the PDF CV using jsPDF
    │   └── imageProcessor.ts     ← Converts uploaded images to WebP base64
    ├── components/
    │   └── Header.tsx            ← Logo + brand name + dark mode toggle
    └── pages/
        ├── HomePage.tsx          ← Landing page with two pathway buttons
        ├── PortfolioWizard.tsx   ← 7-step form → TOML + WhatsApp
        └── CVWizard.tsx          ← 7-step form → PDF download
```

---

## How to Change the Theme Colors

Colors are defined in `src/index.css`. The main color values to change:

```css
/* Light mode (in :root block) */
--primary: 197 80% 40%;   /* Teal — change numbers to change the main color */
--background: 210 30% 98%;

/* Dark mode (in .dark block) */
--primary: 197 80% 52%;
--background: 222 28% 9%;
```

Colors use HSL format: `Hue Saturation% Lightness%`  
- Hue: 0–360 (0=red, 120=green, 197=teal, 240=blue, 270=purple)  
- Saturation: 0%=gray, 100%=vivid
- Lightness: 0%=black, 50%=normal, 100%=white

---

## How to Add a New Case Category

1. Open `src/config.ts`
2. Find the `caseCategories` array
3. Add a new entry:
```typescript
{ id: "implant", en: "Dental Implants", ar: "زراعة الأسنان" },
```
4. Save the file — the new category appears automatically in both wizards.

---

## How to Change the WhatsApp Number

1. Open `src/config.ts`
2. Find `whatsapp.destinationNumber`
3. Change the number (digits only, no + or spaces):
```typescript
destinationNumber: "201271476215",   // change to your number
```

---

## How to Change the TOML Base URL

1. Open `src/config.ts`
2. Find `toml.baseUrl`
3. Change to your Hugo site URL:
```typescript
baseUrl: "https://portfoliohubs.github.io/MICKY/",
```

---

## PDF Generator Details

The PDF is built by `src/lib/pdfGenerator.ts` using the `jsPDF` library.

**PDF structure:**
1. Teal header bar with name, title, graduation info, profile photo
2. Contact row (phone, WhatsApp as clickable link, email, website)
3. Professional Skills section (3 columns: Clinical, Digital, Soft)
4. Education & Career Timeline (sorted by year)
5. Clinical Cases Portfolio (grouped by category, alphabetically sorted)
6. Complete Portfolio footer note

**To change PDF colors:** edit `pdf.primaryColor` and `pdf.accentColor` in `config.ts` (hex format).

**To exclude case photos from PDF:** set `pdf.showCasesInPdf: false` in `config.ts`.

---

## TOML Generator Details

The TOML file is built by `src/lib/tomlGenerator.ts`. It generates:
- Hugo-compatible TOML configuration
- Both English and Arabic sections
- Cases sorted alphabetically by category
- Skills, timeline, and contact info

The file is designed for use with the Hugo PortfolioHubs theme at the `baseUrl` specified in config.

---

## SEO Features

The app has full SEO configured in `index.html`:
- Title, description, keywords meta tags
- Open Graph (og:title, og:description, og:image)
- Twitter Card tags
- JSON-LD structured data (WebApplication, Organization)
- Google Search Console verification meta tag
- Canonical URL
- PWA manifest with theme colors

To update SEO content, edit `index.html` directly or change `seo` values in `config.ts`.

---

## PWA (Installable App)

The app works offline and can be installed:
- **On mobile**: tap the browser menu → "Add to Home Screen"
- **On desktop**: click the install icon in the browser address bar

Settings are in `public/manifest.json`:
```json
{
  "name": "PortfolioHubs",
  "theme_color": "#0e7490",
  "display": "standalone"
}
```

---

## Running Locally (Development)

This project uses pnpm workspaces. To run the app:

```bash
# From the project root
pnpm --filter @workspace/portfoliohubs run dev
```

The app opens on `localhost:19340`.

To check for TypeScript errors:
```bash
pnpm --filter @workspace/portfoliohubs run typecheck
```

---

## Deploying the App

Click **Publish** in Replit to deploy. The app will be live at your `.replit.app` domain.

After deploying, update `seo.siteUrl` in `config.ts` and the canonical URL in `index.html` to match your production domain.

---

## Frequently Asked Questions

**Q: Can I use this without registering?**  
A: Yes. No account, no database, no server — everything runs in your browser.

**Q: Where is my data stored?**  
A: Nowhere. Your data only exists in the browser while you fill the form. Nothing is sent to any server.

**Q: Can I add my own logo?**  
A: Yes. Set `brand.logoUrl` in `config.ts` to any image URL, or place a file in `public/` and use `/yourlogo.png`.

**Q: How do I make the WhatsApp number clickable in the PDF?**  
A: Fill your WhatsApp number in the Contact Details step of the CV Wizard. The number is automatically embedded as a clickable `https://wa.me/...` link in the generated PDF.

**Q: How do I change the order categories appear in the output?**  
A: Categories are sorted alphabetically in both the TOML and PDF outputs. Change the English name of a category to control where it appears alphabetically.

**Q: What image formats are supported?**  
A: Any image format your browser supports (JPG, PNG, WEBP, HEIC on iOS, etc.). Images are converted to WebP internally for efficiency.

**Q: Is there a photo size limit?**  
A: No. Any photo size is accepted. Images are automatically resized to max 1200px wide for the output, but the original quality is preserved below that threshold.
