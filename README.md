# PortfolioHubs

> Free professional dental portfolio builder and CV PDF maker — a PWA for dentists and dental students.

---

## What is PortfolioHubs?

PortfolioHubs is a free PWA (installable web app) with two main tools:

1. **Portfolio Appear in Google Search & AI** — collects your data and generates a `config.toml` file that powers your professional Google-searchable, ChatGPT/Gemini-discoverable portfolio page.
2. **CV PDF Maker (Free)** — collects your data and generates a professional downloadable PDF CV with a clickable WhatsApp link inside.

---

## How to Use the App

### Step 1 — Open the App
Go to [portfoliohubs.github.io](https://portfoliohubs.github.io/) in your browser. On mobile, install it as a PWA (Add to Home Screen).

### Step 2 — Choose a Pathway
Two buttons on the home page:
- **"Portfolio Appear in Google Search"** → Portfolio Wizard
- **"CV PDF Maker"** → CV Wizard

### Step 3 — Fill the Form Steps

| Step | What to fill |
|------|-------------|
| 1. for who ? | Intro page — read and click Next |
| 2. Personal Info | Name, title, graduation year, university |
| 3. Contact Details | Phone, WhatsApp, email, social links, clinic location |
| 4. Profile Photo | Upload a photo (any size) |
| 5. Professional Skills | Clinical, Digital, Soft skills |
| 6. Career Timeline | Milestones with year and description |
| 7. Clinical Cases | Upload case photos; set category and title |
| 8. Preview & Download | Review summary, then download |

> **Portfolio pathway**: downloads a TOML file + sends via WhatsApp
> **CV pathway**: downloads a PDF

---

## The One Config File

**All editable app content lives in a single file:**

```
src/config.ts
```

---

## How to Add Live Examples (Portfolio Intro Page)

The "For Who is this Portfolio website?" intro page has a **"Live Examples, Click and see live"** section. It shows circular photos of real dentists who have used PortfolioHubs — clicking any circle opens their live portfolio.

### Where to edit

Open `src/config.ts` and find the `portfolioIntro.liveExamples` array (inside the `portfolioIntro` block):

```typescript
portfolioIntro: {
  // ...existing content...
  liveExamples: [
    { photo: "", name: "", link: "" },
    { photo: "", name: "", link: "" },
    // ... up to 12 slots
  ],
},
```

### How to fill an example

Replace the empty strings with real data:

```typescript
liveExamples: [
  {
    photo: "https://example.com/dr-ahmed-photo.jpg",  // Direct URL to a public image
    name:  "Dr. Ahmed Mohamed",                        // Name shown below the circle
    link:  "https://dr-ahmed.portfoliohubs.github.io", // URL opened when clicked
  },
  {
    photo: "https://example.com/dr-sara-photo.jpg",
    name:  "Dr. Sara Ali",
    link:  "https://dr-sara.portfoliohubs.github.io",
  },
  // Leave remaining slots as { photo: "", name: "", link: "" }
],
```

### Rules

| Rule | Detail |
|------|--------|
| **Max examples** | 12 slots total |
| **Show / hide** | Set `name: ""` to hide a slot — it will not appear on the page |
| **Photo** | Must be a direct public image URL (ends in `.jpg`, `.png`, `.webp`, etc.) |
| **No photo URL?** | Leave `photo: ""` — the circle will show the first letter of the name as a fallback |
| **Section visibility** | If all slots are empty, the entire "Live Examples" section is hidden automatically |

### Example — 2 filled, rest hidden

```typescript
liveExamples: [
  { photo: "https://i.imgur.com/abc123.jpg", name: "Dr. Nour Hassan",  link: "https://nour.portfoliohubs.github.io" },
  { photo: "https://i.imgur.com/xyz789.jpg", name: "Dr. Youssef Adel", link: "https://youssef.portfoliohubs.github.io" },
  { photo: "", name: "", link: "" }, // hidden
  { photo: "", name: "", link: "" }, // hidden
  { photo: "", name: "", link: "" }, // hidden
  { photo: "", name: "", link: "" }, // hidden
  { photo: "", name: "", link: "" }, // hidden
  { photo: "", name: "", link: "" }, // hidden
  { photo: "", name: "", link: "" }, // hidden
  { photo: "", name: "", link: "" }, // hidden
  { photo: "", name: "", link: "" }, // hidden
  { photo: "", name: "", link: "" }, // hidden
],
```

Only the 2 filled entries appear on the page. The rest are invisible until you fill them.

---

## Other Config Options (Quick Reference)

### Brand & Slogan
```typescript
brand: {
  name: "PortfolioHubs",
  slogan: "الاسنانجى لازم يتدلع",
  sloganEn: "The Dentist Deserves to Shine",
  logoUrl: "",  // empty = text logo, or paste an image URL
}
```

### WhatsApp Destination
```typescript
whatsapp: {
  destinationNumber: "201271476215",  // receives the config files
  message: "Hi! Here is my portfolio configuration file from PortfolioHubs.",
}
```

### Social Links (Header Icons)
```typescript
social: {
  facebook:  "https://...",  // leave "" to hide
  instagram: "https://...",
  whatsapp:  "https://wa.me/...",
}
```

### Home Page Text
```typescript
home: {
  headline: "Build Your professional Portfolio & CV",
  usersCount: "19041",  // update this number manually (shown as-is)
  usersCountLabel: "users till now (updated weekly)",
}
```

### Portfolio Intro Content
```typescript
portfolioIntro: {
  title: "For Who is this Portfolio website?",
  content: [
    "for who this ?",
    "for dentist need :",
    "1. appear in google search",
    // add or edit lines here
  ],
}
```

---

## Development Setup

```bash
npm install
npm run dev        # start local dev server
npm run build      # production build
```

Built with React + Vite + TypeScript + Tailwind CSS.

---

## Deployment

This repo deploys automatically to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`.

Live at: **[portfoliohubs.github.io](https://portfoliohubs.github.io/)**
