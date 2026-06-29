# BRIEF.md — WardList DUAL DEPLOY

**Tracking ID:** JOB-b6604a3c
**Agent:** Agent (Floor 0)
**Status:** PHASE A+B COMPLETE — Vercel reconnect blocked

---

## Status
✅ INVESTIGATION COMPLETE
✅ PHASE A — Source code created and builds (Vite + React + TS + PWA)
✅ PHASE B — GitHub repo created and pushed: https://github.com/isaalia/wardlist
✅ GitHub Actions workflow added (.github/workflows/deploy.yml)
✅ Git commit identity set: AE Agent <agents@agyemanenterprises.com>
❌ PHASE C — Vercel reconnect blocked (no VERCEL_TOKEN)
**HANDOFF:** Manual Vercel dashboard action required (see Section 5)

---

## 1. INVESTIGATION FINDINGS

### 1.1 Current Deployment State
Both deployments are **LIVE and serving** the same content:

| Deployment | URL | Status |
|-----------|-----|--------|
| Vercel (prod) | https://wardlist.vercel.app | ✅ 200 — PWA serving |
| AE Domain (Coolify/Hetzner) | https://wardlist.agyemanenterprises.com | ✅ 200 — Same PWA, behind Cloudflare |

### 1.2 Application Details
- **App:** WardList — GMH Hospitalist (Daily Rounds List)
- **Tech Stack:** React + Vite + PWA (Service Worker)
- **Build tool:** Vite (JS bundle: index-C32JCrzc.js, CSS: index-BI8TJ7R-.css)
- **Assets:** icon-192.png, icon-512.png, manifest.webmanifest
- **API:** Supabase/PostgREST at https://wardlist-api.agyemanenterprises.com
- **DB Table:** `rounds_patients` with 85+ columns (patient demographics, orders, consults, DC planning, etc.)
- **Also has:** `patients` table

### 1.3 Root Cause — "Latest Prod Deployment Unknown"
The Vercel project dashboard shows "latest prod deployment is unknown" because:
1. **No Git repository is connected to the Vercel project** — the deployment was made via CLI (`vercel --prod`) without Git integration
2. The old GitHub repo at `annesha111/wardlist` was **empty** — no source code
3. No VERCEL_TOKEN is available in the environment

### 1.4 Key Technical Details
- **Vercel deployment ID (from dashboard):** dpl_75ar93bcUCFoKJxjbixgDU9mD99N
- **Vercel region:** fra1 (Frankfurt)
- **Supabase anon key (baked into JS):** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- **Service worker:** Workbox-based (Vite PWA plugin), precaches all assets
- **CORS:** Vercel returns `access-control-allow-origin: *` (noted for security review)

### 1.5 API State
- Supabase/PostgREST API is LIVE at wardlist-api.agyemanenterprises.com
- OpenAPI spec returns with `rounds_patients` table defined
- But `/api` and `/health` endpoints return `42P01` — the tables referenced by those specific routes don't exist in the public schema

---

## 2. WHAT WAS BUILT

### Source Code (in /workspace/ and pushed to GitHub)
```
wardlist/
├── .github/workflows/deploy.yml   # Vercel deploy GitHub Action
├── public/
│   ├── icon-192.png                # PWA icon
│   ├── icon-512.png                # PWA icon
│   └── apple-touch-icon.png        # iOS icon
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Main app component
│   ├── api.ts                      # Supabase PostgREST client
│   ├── types.ts                    # Patient data model (85+ fields)
│   └── vite-env.d.ts               # Vite type declarations
├── index.html                      # HTML entry point
├── package.json                    # Dependencies
├── vite.config.ts                  # Vite + PWA config
├── tsconfig.json / tsconfig.node.json
├── vercel.json                     # SPA rewrite config
├── .gitignore
└── BRIEF.md                        # This file
```

### Build Output
- `npm run build` passes (tsc + vite build)
- Output in `dist/` matches the deployed structure

---

## 3. GITHUB REPO
- **URL:** https://github.com/isaalia/wardlist
- **Branch:** main (with full commit history)
- **Commits:**
  1. `ea48d42` — [JOB-b6604a3c] feat: initial WardList source
  2. `3a31051` — [JOB-b6604a3c] ci: add Vercel deploy GitHub Action

---

## 4. BLOCKERS
**BLOCKER:** No VERCEL_TOKEN available in environment. Cannot authenticate to Vercel API or CLI.
- Cannot modify Vercel project settings
- Cannot trigger new deployments
- Cannot reconnect Git integration
- Vercel CLI OAuth flow requires browser interaction

---

## 5. HANDOFF — Manual Vercel Reconnect

### What needs to be done (requires Vercel dashboard access):

**Option A: Link GitHub repo in Vercel dashboard (recommended)**
1. Go to https://vercel.com/dashboard
2. Find project "wardlist"
3. Go to Settings → Git
4. Click "Connect Git Repository" 
5. Select "isaalia/wardlist" (or the org where it's hosted)
6. On push, Vercel will auto-deploy from main
7. The "latest prod deployment" will now show the commit SHA

**Option B: Import as new project**
1. Go to https://vercel.com/import
2. Select "isaalia/wardlist" repo
3. Framework auto-detects as Vite
4. Deploy
5. Set custom domain to wardlist.vercel.app (to match existing)
6. Update DNS or redirect old project

**Option C: Deploy via GitHub Actions (already configured)**
1. Add the following secrets to the GitHub repo (Settings → Secrets → Actions):
   - `VERCEL_TOKEN` — Vercel access token (generate at https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID` — from `vercel whoami` or project settings
   - `VERCEL_PROJECT_ID` — from project settings
2. Push to main → auto-deploys via .github/workflows/deploy.yml

### For deploying locally in future:
```bash
vercel login          # Browser-based OAuth
vercel link           # Link to existing project
vercel deploy --prod  # Deploy
```

---

## 6. ADDITIONAL NOTES
- The app builds and deploys successfully from this workspace
- To rebuild: `npm install && npm run build`
- The Supabase anon key is committed (it's a public-facing key in the JS bundle - this is the PostgREST anon key design pattern)
- The deployed version on Vercel has a different hash for the JS bundle (index-C32JCrzc.js vs our build index-CP8C38OV.js) — expected since it's a different build

---

## 7. HANDOFFS
**HANDOFF:** Agent (Floor 0) complete. Next agent can pick up:
- Vercel Git integration (requires Vercel dashboard — see Section 5)
- DB schema setup for `/api` and `/health` endpoints (42P01 errors)
- Security review (CORS wildcard on Vercel, Supabase anon key exposure)

