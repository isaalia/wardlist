# BRIEF.md — WardList Dual Deploy Fix

**Tracking ID:** JOB-40fccff8
**Agent:** Agent (Floor 0)
**Status:** INVESTIGATION COMPLETE — Blocked on VERCEL_TOKEN / device auth

---

## Status
✅ PHASE A — Investigation complete (prior + current)
✅ PHASE B — Build verified (npm run build passes: tsc + vite build — 32 modules)
✅ PHASE C — Both deployments confirmed LIVE
   - Vercel: https://wardlist.vercel.app — HTTP 200, serving PWA
   - Coolify: https://wardlist.agyemanenterprises.com — HTTP 200, serving same PWA
✅ PHASE D1 — Vercel CLI device login attempted (URL available — see below)
❌ PHASE D2 — Vercel device auth NOT completed (no one visited the URL)
❌ PHASE E — GitHub Actions deploy pipeline blocked (missing secrets)
❌ INCOMPLETE_GOAL: No VERCEL_TOKEN available and Vercel device login not authenticated
**HANDOFF:** See Section 5 for complete steps

---

## 1. INVESTIGATION FINDINGS

### 1.1 Current Deployment State
Both deployments are **LIVE and serving** the same PWA:

| Deployment | URL | Status | Version |
|-----------|-----|--------|---------|
| Vercel (prod) | https://wardlist.vercel.app | ✅ 200 | Bundle: index-C32JCrzc.js |
| AE Domain (Coolify/Hetzner) | https://wardlist.agyemanenterprises.com | ✅ 200 | Bundle: index-C32JCrzc.js |
| GitHub source | https://github.com/isaalia/wardlist | ✅ Has 4 commits | Latest: 0bd0b68 |

### 1.2 Application Details
- **App:** WardList — GMH Hospitalist Daily Rounds List PWA
- **Tech Stack:** React 18 + Vite 5 + TypeScript 5 + PWA (Workbox)
- **Built from:** GitHub repo https://github.com/isaalia/wardlist (main branch)
- **Build status:** ✅ `npm run build` passes cleanly (tsc + vite build)
- **API:** Supabase/PostgREST at https://wardlist-api.agyemanenterprises.com
- **DB Table:** `rounds_patients` (85+ columns for patient data)

### 1.3 What Was Already Done (Prior Agent JOB-b6604a3c)
- ✅ Source code created (React + Vite + TS + PWA)
- ✅ GitHub repo created and pushed
- ✅ GitHub Actions deploy workflow added (`.github/workflows/deploy.yml`)
- ✅ Git identity configured
- ✅ Clear investigation documented

### 1.4 Root Cause — "Latest Prod Deployment Unknown"
The Vercel dashboard shows "latest prod deployment is unknown" because:
1. **No Git repository is connected** to the Vercel project — deployment was via CLI (`vercel --prod`)
2. **No VERCEL_TOKEN** exists in the environment or any accessible config
3. **Vercel CLI cannot authenticate** — OAuth flow requires browser interaction

### 1.5 Key Technical Details
- **Vercel deployment ID (from dashboard):** dpl_75ar93bcUCFoKJxjbixgDU9mD99N
- **Vercel project slug:** `wardlist` (matches URL https://wardlist.vercel.app)
- **Vercel region:** fra1 (Frankfurt)
- **Vercel config:** `vercel.json` — SPA rewrite, Vite framework preset
- **API:** Supabase/PostgREST at wardlist-api.agyemanenterprises.com
- **CORS:** Vercel returns `access-control-allow-origin: *` (noted for security review)
- **Service Worker:** Workbox-based, precaches all assets

---

## 2. WHAT WAS DONE (THIS SESSION)

### Prior Agent (JOB-4839bd22)
- ✅ Confirmed both deployments LIVE and serving identical content
- ✅ Confirmed build passes cleanly (`npm run build`)
- ✅ Confirmed git repo is at https://github.com/isaalia/wardlist with 4 commits
- ✅ Deployed JS bundle hash verified across both environments
- ✅ Vercel deployment ID documented: `dpl_75ar93bcUCFoKJxjbixgDU9mD99N`
- ❌ Tried Vercel CLI auth — requires browser OAuth (headless env)
- ❌ Searched for VERCEL_TOKEN env var — not set
- ❌ Searched Vercel CLI config files — no auth token cached locally
- ❌ Tried Vercel API with GITHUB_TOKEN — rejected
- ❌ Checked Connxt API for stored credentials — no integration found

### Current Agent (JOB-40fccff8 — this session)
- ✅ Re-verified both deployments LIVE (2026-06-29T22:43Z)
   - Vercel: HTTP 200, last-modified: Mon, 29 Jun 2026 21:08:51 GMT
   - Coolify: HTTP 200, last-modified: Mon, 29 Jun 2026 21:04:11 GMT, behind Cloudflare
- ✅ Re-verified build: `npm run build` → 32 modules, all clean
- ✅ Confirmed Vercel API requires auth on ALL endpoints (403 missingToken)
- ✅ Discovered `vercel git connect` — can link Git repo to Vercel project post-auth
- ✅ Discovered `vercel deploy-hooks` — can manage deploy hooks post-auth
- ✅ Attempted Vercel device login: got device code `ZKDR-TQTC`
   - URL: https://vercel.com/oauth/device?user_code=ZKDR-TQTC
   - ❌ No one authorized within session timeout
- ✅ Checked GitHub Actions: 1 workflow active (deploy.yml), not workflow_dispatch
- ✅ Updated BRIEF.md with expanded blocker + multiple fix options
- ✅ Wrote session journal to ae-master-context/sessions/

---

## 3. BUILD VERIFICATION
```bash
# Verified: npm install && npm run build passes
# Output:
> wardlist@1.0.0 build
> tsc && vite build
✓ 32 modules transformed.
✓ dist/ output: index.html, assets/*.js, assets/*.css, sw.js, manifest.webmanifest

# Local build hash differs from deployed (expected):
# Local:  index-CP8C38OV.js
# Deployed: index-C32JCrzc.js
```

---

## 4. BLOCKERS
**BLOCKER:** No VERCEL_TOKEN available in environment. Cannot authenticate to Vercel API or CLI.
- Cannot modify Vercel project settings
- Cannot connect Git integration (`npx vercel git connect`)
- Cannot trigger new deployments via API or CLI
- Cannot create/list deploy hooks (`npx vercel deploy-hooks`)
- Vercel CLI OAuth flow requires browser interaction (device flow available, see below)

**Device Login URL (Vercel OAuth):** https://vercel.com/oauth/device?user_code=ZKDR-TQTC
- Visit URL → authorize → CLI receives token
- After auth: `npx vercel link` → `npx vercel git connect` → `npx vercel deploy --prod`
- These commands are READY in the CLI — just need the token

**Workaround:** Manual connection via Vercel dashboard (requires human with Vercel access) — see Section 5

---

## 5. HANDOFF — Complete Fix Steps

### Option A: Vercel Device Login via CLI (Quickest — if someone can visit a URL)
From the workspace, run:
```bash
# Step 1: Login via device flow
npx vercel login
# Visit the URL shown, authorize in browser
# The CLI will receive the token automatically

# Step 2: Link to existing project
npx vercel link
# Select existing project "wardlist"

# Step 3: Connect Git repository
npx vercel git connect https://github.com/isaalia/wardlist.git

# Step 4: Deploy with Git tracking
npx vercel deploy --prod

# Step 5: Verify
# https://wardlist.vercel.app should show updated content
# Vercel dashboard should show Git-linked deployment
```
Note: This flow needs someone to visit the device URL in a browser. The CLI session must stay alive.

### Option B: Vercel Dashboard (Manual — always works)
Someone with Vercel dashboard access needs to:

**Step 1: Connect Git repo to Vercel project**
- Visit https://vercel.com/[team]/wardlist/settings/git
- Click "Connect Git Repository"
- Select `isaalia/wardlist`
- Select `main` branch for auto-deploy

**Step 2: Add GitHub Actions secrets**
- Visit https://github.com/isaalia/wardlist/settings/secrets/actions
- Add `VERCEL_TOKEN` (generate at https://vercel.com/account/tokens — create token with appropriate scope)
- Add `VERCEL_ORG_ID` (run `npx vercel whoami` or check team settings in Vercel dashboard)
- Add `VERCEL_PROJECT_ID` (Vercel project settings → General → Project ID)

**Step 3: Trigger a deployment**
- Push to main branch on GitHub
- GitHub Actions will auto-deploy via `.github/workflows/deploy.yml`
- OR after Step 1, just push and Vercel's Git integration handles it

**Step 4: Verify**
- https://wardlist.vercel.app shows updated content
- Vercel dashboard shows "latest prod deployment" with commit SHA
- https://wardlist.agyemanenterprises.com still works (Coolify side)

### Option C: Deploy Hook (Automated — requires prior dashboard setup)
If a deploy hook URL was created for this project:
```bash
curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_XXXX/YYYY
```
This triggers a new deployment without a token. Check Vercel dashboard → Deploy Hooks.

### Option D: Add workflow_dispatch to GitHub Actions (Enables manual CI trigger)
Edit `.github/workflows/deploy.yml` to add `workflow_dispatch:` under the `on:` block.
This lets anyone with repo access manually trigger the deploy from GitHub Actions tab.
Note: Secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID) must still be set first.

---

## 6. ADDITIONAL NOTES
- The app is **functioning in production** — users are not impacted by this issue
- Both Vercel and Coolify serve the same build from their respective caches
- The "latest prod deployment unknown" is a **dashboard display issue**, not a service outage
- Git integration will also enable preview deployments for PRs
- Security note: CORS wildcard (`access-control-allow-origin: *`) on Vercel should be reviewed
- The Supabase anon key in the JS bundle is the standard PostgREST pattern (public-facing, RLS-protected)

---

## 7. FILE MAP (Current State)
```
wardlist/
├── .github/workflows/deploy.yml   # Vercel deploy — needs VERCEL_TOKEN + secrets
├── public/
│   ├── icon-192.png                # PWA icon
│   ├── icon-512.png                # PWA icon
│   └── apple-touch-icon.png        # iOS icon
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Main app + all components
│   ├── api.ts                      # Supabase PostgREST client
│   ├── types.ts                    # Patient data model (85+ fields)
│   └── vite-env.d.ts               # Vite type declarations
├── index.html                      # HTML entry point
├── package.json                    # Dependencies
├── vite.config.ts                  # Vite + PWA config
├── tsconfig.json                   # TypeScript config
├── tsconfig.node.json              # TS Node config
├── vercel.json                     # SPA rewrite, Vite framework
├── .gitignore
├── BRIEF.md                        # This file
└── dist/                           # Build output (gitignored)
```
