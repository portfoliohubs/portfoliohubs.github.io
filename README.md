# PortfolioHubs

> Free professional dental portfolio builder and CV PDF maker — a PWA for dentists and dental students.

Build a Google-searchable portfolio or a downloadable CV PDF in minutes. Zero registration required. Runs entirely in the browser — no backend, no database, no server costs.

---

## Table of Contents

1. [Quick Start (Local)](#1-quick-start-local)
2. [Deploy to GitHub Pages (Free Hosting)](#2-deploy-to-github-pages-free-hosting)
3. [Push Future Updates](#3-push-future-updates)
4. [Customize the App (config.ts)](#4-customize-the-app-configts)
5. [Project Structure](#5-project-structure)
6. [Tech Stack](#6-tech-stack)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Quick Start (Local)

**Requirements:** Node.js 18 or higher, npm.

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the app is live locally.

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server at localhost:5173 |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run TypeScript checks without building |

---

## 2. Deploy to GitHub Pages (Free Hosting)

This repo includes a ready-made GitHub Actions workflow that builds and deploys automatically every time you push to `main`. Follow these steps once:

### Step 1 — Create the GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Name your repo (e.g. `portfoliohubs`)
3. Set it to **Public** (required for free GitHub Pages)
4. Do **not** initialize with a README (you already have one)
5. Click **Create repository**

### Step 2 — Push the code

Run these commands in your project folder (replace the URL with your own):

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. In your GitHub repo, go to **Settings → Pages**
2. Under **Source**, select **GitHub Actions**
3. Click **Save**

That is all. GitHub will run the workflow automatically.

### Step 4 — Wait for the first deployment

1. Go to the **Actions** tab in your repo
2. You will see a workflow called **Deploy to GitHub Pages** running
3. Wait ~1-2 minutes for it to finish (green checkmark)
4. Your live URL will be: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

> **Note:** The base path (`/YOUR_REPO_NAME/`) is set automatically by the workflow — you never touch `vite.config.ts` for this.

---

## 3. Push Future Updates

Every time you make changes and want to publish them live:

```bash
# Stage all changes
git add .

# Write a commit message describing what you changed
git commit -m "Update: changed contact number in config.ts"

# Push to GitHub — deployment starts automatically
git push
```

Within 1-2 minutes your live site will be updated.

### What triggers a new deployment?

Any `git push` to the `main` branch automatically runs the GitHub Actions workflow and redeploys the site. You do not need to do anything else.

---

## 4. Customize the App (config.ts)

**All editable content lives in one file: `src/config.ts`**

Open it in any text editor and change what you need. After saving, run `git add . && git commit -m "your message" && git push` and the site updates automatically.

### Brand

```ts
brand: {
  name: "PortfolioHubs",              // App name shown in header
  slogan: "الاسنانجى لازم يتدلع",     // Arabic slogan shown in header
  sloganEn: "The Dentist Deserves to Shine",
  logoUrl: "",                         // URL to a logo image, or leave "" for the default icon
}
```

### Social Links (icons on home page)

```ts
social: {
  facebook:  "",   // e.g. "https://facebook.com/yourpage" — leave "" to hide
  instagram: "",   // e.g. "https://instagram.com/yourhandle"
  whatsapp:  "",   // e.g. "https://wa.me/201234567890"
}
```

### WhatsApp Destination (Portfolio pathway)

```ts
whatsapp: {
  destinationNumber: "201271476215",   // Number that receives the TOML file
  message: "Hi! Here is my portfolio configuration file from PortfolioHubs.",
}
```

### User Counter (home page)

```ts
home: {
  usersCount: "60",                    // Update this number manually
  usersCountLabel: "users now (updated daily)",
}
```

### Portfolio Intro Step

```ts
portfolioIntro: {
  stepLabel: "Welcome",
  title: "For Who Is This Portfolio?",
  content: [
    "topic : for who this portfolio website ?",
    "for dentist need :",
    "1. appear in google search",
    // Add or remove lines here
  ],
}
```

### Pay What You Want Button

```ts
payWhatYouWant: {
  enabled: "off",    // Change to "on" to show the button at the end of the CV pathway
  buttonLabel: "Pay What You Want",
  whatsappNumber: "201271476215",
  whatsappMessage: "i love your support ,i need to pay",
}
```

### SEO & Google Verification

```ts
seo: {
  googleVerification: "YOUR_GOOGLE_VERIFICATION_CODE",
  siteUrl: "https://YOUR_USERNAME.github.io/YOUR_REPO_NAME",
  keywords: "your, keywords, here",
}
```

Update `index.html` too — find the two lines with `https://your-domain.com/` and replace with your real URL:

```html
<link rel="canonical" href="https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/" />
<meta property="og:url" content="https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/" />
```

And update the JSON-LD blocks at the bottom of `<head>` in `index.html` with the same URL.

### Clinical Case Categories

```ts
caseCategories: [
  { id: "cosmetic", en: "Cosmetic Dentistry", ar: "تجميل الأسنان" },
  // Add or remove categories here
]
```

### PDF Settings

```ts
pdf: {
  footerText: "© 2026",       // Footer text on every PDF page
  primaryColor: "#0e7490",    // Teal accent color used in the PDF
  showCasesInPdf: true,       // Set to false to exclude cases from the PDF
}
```

---

## 5. Project Structure

```
portfoliohubs/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Actions: auto-deploy on push to main
├── public/
│   ├── favicon.svg             ← App icon
│   ├── manifest.json           ← PWA manifest (installable app)
│   ├── robots.txt              ← SEO robots file
│   └── sw.js                   ← Service worker (offline support)
├── src/
│   ├── components/
│   │   ├── Header.tsx          ← Sticky header with logo + dark mode toggle
│   │   └── ui/                 ← shadcn/ui component library (do not edit)
│   ├── hooks/
│   │   ├── use-mobile.tsx      ← Mobile breakpoint hook
│   │   └── use-toast.ts        ← Toast notification hook
│   ├── lib/
│   │   ├── imageProcessor.ts   ← Converts uploads to WebP base64 for PDF
│   │   ├── pdfGenerator.ts     ← jsPDF CV generator (runs in browser)
│   │   ├── tomlGenerator.ts    ← TOML config file generator
│   │   └── utils.ts            ← Tailwind class helper (cn)
│   ├── pages/
│   │   ├── HomePage.tsx        ← Landing page with two pathway buttons
│   │   ├── PortfolioWizard.tsx ← 8-step portfolio wizard (EN + AR)
│   │   ├── CVWizard.tsx        ← 7-step CV PDF wizard (EN only)
│   │   └── not-found.tsx       ← 404 page
│   ├── App.tsx                 ← Router + ThemeProvider
│   ├── config.ts               ← SINGLE SOURCE OF TRUTH — edit this file
│   ├── index.css               ← Tailwind v4 tokens + dark mode CSS
│   └── main.tsx                ← React entry point
├── .gitignore
├── GUIDE.md                    ← Detailed user & developer guide
├── index.html                  ← HTML shell (update canonical URL here)
├── package.json                ← Dependencies and npm scripts
├── README.md                   ← This file
├── tsconfig.json               ← TypeScript configuration
└── vite.config.ts              ← Vite build config (do not edit — base path is auto)
```

---

## 6. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Styling | Tailwind CSS v4 |
| Routing | wouter |
| Dark mode | next-themes |
| UI components | shadcn/ui (Radix UI) |
| Icons | lucide-react + react-icons |
| PDF generation | jsPDF (runs client-side) |
| PWA | Service Worker + Web App Manifest |
| Hosting | GitHub Pages (free) |
| CI/CD | GitHub Actions |
| Language | TypeScript 5 |

---

## 7. Troubleshooting

### The site shows a blank page after deploying

**Cause:** The base path is wrong.

**Fix:** Make sure GitHub Pages source is set to **GitHub Actions** (not a branch). In the repo go to Settings → Pages → Source → GitHub Actions.

### Routing does not work — refreshing a page shows 404

**This is already handled.** The `deploy.yml` copies `index.html` to `404.html` after the build. GitHub Pages will serve the app for any URL under your domain.

If it still fails, make sure the `dist/404.html` file exists in the deployed artifact. Re-run the Actions workflow manually from the Actions tab.

### Images or assets do not load

**Cause:** A hard-coded absolute path like `/favicon.svg` is used somewhere.

**Fix:** All assets in `public/` are referenced correctly by Vite using the base path. If you added custom assets, reference them as `{import.meta.env.BASE_URL}your-file.ext` in your code, not as `/your-file.ext`.

### The Actions workflow fails with "npm: not found"

**Fix:** Check that `package.json` is at the root of the repo (same level as `index.html`). If you pushed into a subfolder, move the files to the root.

### I want to use a custom domain (e.g. portfoliohubs.com)

1. Buy a domain from any registrar (Namecheap, GoDaddy, Cloudflare, etc.)
2. In your repo go to Settings → Pages → Custom domain → enter your domain
3. At your registrar, create a CNAME record pointing to `YOUR_USERNAME.github.io`
4. Update `seo.siteUrl` in `src/config.ts` and the canonical/OG URLs in `index.html` to your new domain
5. Change `base` in `vite.config.ts` to `"/"` (root) since you no longer use a subpath:

```ts
base: process.env.VITE_BASE_PATH ?? "/",
```

And in `deploy.yml`, change the `VITE_BASE_PATH` line to:

```yaml
VITE_BASE_PATH: /
```

---

## License

MIT — free to use, modify, and distribute.
