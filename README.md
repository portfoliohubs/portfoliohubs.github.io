# PortfolioHubs — Multi-Doctor Platform & CV Engine

> Scalable, quota-conscious dental portfolio platform and CV PDF builder. Built with a dual-layer architecture: a modern client-side React SPA at the root and high-performance static Hugo doctor websites at `/{drname}/`, deployed together to GitHub Pages.

---

## 1. Architecture Overview

PortfolioHubs uses a **dual-layer architecture** hosted on a single GitHub Pages domain (`portfoliohubs.github.io`):

```
                                  portfoliohubs.github.io
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
     Root React SPA (/)                                   Individual Hugo Portfolios (/{drname}/)
  - Home & Entry Flow                                  - Static multilingual SEO pages (EN & AR)
  - CV PDF Generator (/cv)                             - Built with exact Hugo template
  - Portfolio Creation Wizard (/portfolio)             - Fast cold-load & perfect search indexing
  - Unified Auth (/login)                              - Rendered directly into dist/{drname}/
  - Doctor Dashboard (/dashboard)
  - Admin Control Center (/admin)
```

### Key Technical Pillars:
- **No Cloud Functions / No Blaze Required**: Runs completely within Firebase Free Spark plan limits.
- **Zero Real-Time Listeners (`onSnapshot`)**: All client reads are explicit, single-shot `getDoc`/`getDocs` requests with in-memory caching.
- **Strict Separation of Drafts & Published Snapshots**:
  - `portfolios/{uid}`: Private working draft edited by doctors.
  - `published_portfolios/{uid}`: Public frozen snapshot used by Hugo CI and public visitors.
- **Storage-Backed Assets**: All photos are stored in Firebase Storage (`portfolio-images/{uid}/...`). Zero base64 strings are stored in Firestore.
- **Single CI Deployment**: `.github/workflows/deploy.yml` builds both the React app and all published Hugo doctor sites into `dist/` in a single build step.

---

## 2. How to Add an Admin

Admin authorization is strictly controlled server-side via the `/admins/` Firestore collection:

1. Open the [Firebase Console](https://console.firebase.google.com/) and select your project (**`portfoliohubs-8d806`**).
2. In the left menu, click **Firestore Database**.
3. Under the `admins` collection (create it if it does not exist), click **+ Add document**.
4. Set the **Document ID** to the admin's exact email address (e.g., `mickyeditoo@gmail.com`).
5. Add a simple field inside:
   - Field: `role` | Type: `string` | Value: `"admin"`
   - Field: `addedAt` | Type: `string` | Value: `2026-08-19` (or current timestamp)
6. Click **Save**.

> **Note**: When an admin signs in at `/login`, the application detects their email in `/admins/{email}` and automatically routes them to `/admin`. There are no visible admin buttons or links anywhere on public pages.

---

## 3. How Packages & Case Limits Work

Package tiers and limits are dynamically managed via Firestore and editable in real time:

- **Firestore Path**: `/packages/{tier}` (e.g., `/packages/Free`, `/packages/Tier2`, `/packages/Tier3`, `/packages/Tier4`).
- **Document Structure**:
  ```json
  {
    "tier": "Tier4",
    "label": "Tier 4 (VIP / Full Suite)",
    "price": 49,
    "caseLimit": 150
  }
  ```
- **Lifecycle & Flow**:
  1. **Registration Flow**: When a new doctor reaches the final step of the Portfolio Wizard, the visual 4-tier selector reads the `packages` collection once and caches it in session memory.
  2. **Enforcement**: If a doctor attempts to add more cases than their tier's `caseLimit`, the add button is disabled and a prefilled WhatsApp upgrade button appears.
  3. **Admin Overrides**: From the Admin Dashboard (`/admin` -> **Packages & Pricing**), you can change prices, labels, and limits at any time, or manually override the `packageTier` and `caseLimit` for any individual doctor.

---

## 4. How Doctor Pages Get Published

The complete publishing lifecycle follows a zero-leak review pipeline:

```
[ Doctor Registration / Edits ] 
              │
              ▼
Writes to portfolios/{uid} with status: "pending_review"
              │
              ▼
[ Admin Dashboard (/admin) Review Queue ]
  - Inspect full profile, clinical cases, and timeline
  - Click "Approve & Publish"
              │
              ├─► 1. Copies data to published_portfolios/{uid}
              ├─► 2. Sets portfolios/{uid}.status = "published"
              ├─► 3. Sets portfolios/{uid}.hasUnreviewedChanges = false
              └─► 4. Triggers GitHub Actions workflow via REST API
                                │
                                ▼
[ GitHub Actions Workflow (deploy.yml) ]
  - Queries published_portfolios where active == true
  - Generates config.toml for each doctor
  - Builds static Hugo pages to dist/{drname}/
  - Builds React SPA to dist/
  - Publishes full bundle to GitHub Pages
                                │
                                ▼
Live at https://portfoliohubs.github.io/{drname}/
```

---

## 5. How to Import an Existing Client

To onboard an existing doctor (e.g., from old manual Hugo repositories):

1. Sign in to your Admin account at `/login` and navigate to `/admin`.
2. Click the **Import Client (TOML)** tab.
3. Enter the doctor's **Email Address**.
4. Select their assigned **Package Tier** (e.g., `Tier4`).
5. Paste their existing Hugo `config.toml` file content into the text area.
6. Click **Import & Dispatch Password Email**.

### What happens automatically:
- The system parses the TOML into standard Firestore fields (name, clinic, graduation, timeline, cases, etc.).
- A new Firebase Auth account is created using a secure throwaway password.
- Firebase's official `sendPasswordResetEmail` is dispatched to the doctor's inbox so they can choose their own password.
- Both `portfolios/{uid}` and `published_portfolios/{uid}` are written immediately with `status: "published"`, `paymentConfirmed: true`, and `active: true`.

---

## 6. Operational & Troubleshooting Checklists

### What to check if a doctor's page doesn't build or appear:
1. **Approval Status**: Check `/admin` to confirm the doctor has `status: "published"` and `active: true`.
2. **GitHub Secret**: Ensure `FIREBASE_SERVICE_ACCOUNT` is set in GitHub repository settings (**Settings** -> **Secrets and variables** -> **Actions**).
3. **GitHub Actions Run**: Check the **Actions** tab on GitHub to verify the `Deploy to GitHub Pages` workflow completed green.
4. **URL Slug**: Verify the URL path matches their sanitized name: `https://portfoliohubs.github.io/{drname}/` (lowercase, alphanumeric characters only).

### What to check if a doctor reports a payment issue:
1. Verify payment in your bank/InstaPay/Vodafone Cash records.
2. In `/admin`, find the doctor and toggle their **Payment Status** button to `✓ Payment Confirmed`.

### How Quota Safeguards Work:
- **Zero Real-Time Cost**: By strictly banning `onSnapshot`, doctors browsing their dashboard never generate background reads.
- **Document-Level Quota Optimization**: 1 doctor profile with 150 clinical cases stored inside a single `portfolios/{uid}` document costs **exactly 1 read** when loading the dashboard.
- **Lazy Rendering**: Case photos use native `loading="lazy"` and `decoding="async"`, preventing excessive bandwidth consumption on mobile devices.

---

## 7. Complete File Inventory

| File / Path | Status | Purpose |
|---|---|---|
| `src/pages/HomePage.tsx` | **Modified** | Entry landing page offering pathways to Create Portfolio, CV Maker, or Sign In. |
| `src/pages/PortfolioWizard.tsx` | **Modified** | Multi-step portfolio builder with `localStorage` draft saving and live `/packages` selector. |
| `src/pages/Login.tsx` | **Created** | Unified auth screen (Google & Email/Password) with automatic admin allowlist detection. |
| `src/pages/Dashboard.tsx` | **Created** | Quota-conscious doctor dashboard with lazy-loaded cases and single-write edit batching. |
| `src/pages/AdminDashboard.tsx` | **Created** | Admin control center: review queue, package manager, and TOML client importer. |
| `src/pages/CVWizard.tsx` | **Preserved Untouched** | Original CV PDF creation wizard (100% untouched). |
| `src/lib/pdfGenerator.ts` | **Preserved Untouched** | Client-side PDF generator engine for CVs (100% untouched). |
| `src/components/ui/*` | **Preserved Untouched** | Core UI primitives (100% untouched). |
| `src/lib/firebase.ts` | **Created** | Client Firebase initialization (Auth, Firestore, Storage). |
| `src/lib/tomlGenerator.ts` | **Preserved** | Hugo TOML configuration generator. |
| `src/lib/tomlParser.ts` | **Created** | Reverses existing `config.toml` files into Firestore data models for client imports. |
| `src/lib/imageProcessor.ts` | **Preserved** | Client-side canvas image resizing and WebP conversion. |
| `hugo-template/layouts/index.html` | **Created** | Identical copy of original Hugo layout template for static doctor pages. |
| `scripts/build-doctor-portfolios.mjs` | **Created** | CI build script compiling all published doctor sites from Firestore using Hugo. |
| `.github/workflows/deploy.yml` | **Modified** | GitHub Actions workflow building React SPA + all Hugo doctor sites + 24h cron safety net. |
| `firestore.rules` | **Hardened** | Security rules enforcing role isolation, read/write permissions, and immutability. |
| `storage.rules` | **Hardened** | Storage rules restricting uploads to owner's folder under 5MB per image. |

---

## 8. Development & Build

```bash
# Install dependencies
npm install

# Start local Vite development server
npm run dev

# Run full TypeScript validation and production build
npm run build
```
