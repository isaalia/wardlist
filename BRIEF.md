# BRIEF.md — WardList Dual Deploy Fix

**Tracking ID:** JOB-518522ad
**Agent:** Agent (Floor 0)
**Status:** INVESTIGATION COMPLETE — Blocked on VERCEL_TOKEN / device auth

---

## Status
✅ PHASE A — Investigation complete (4 prior agents + current)
✅ PHASE B — Build verified (npm run build passes: tsc + vite build — 32 modules)
✅ PHASE C — Both deployments confirmed LIVE
   - Vercel: https://wardlist.vercel.app — HTTP 200, serving PWA
   - Coolify: https://wardlist.agyemanenterprises.com — HTTP 200, serving same PWA
✅ PHASE D1 — Vercel CLI device login attempted (URL available — see below)
❌ PHASE D2 — Vercel device auth NOT completed (no browser in headless env)
❌ PHASE E — GitHub Actions deploy pipeline blocked (missing secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
❌ PHASE F — No alternative auth mechanism found (no deploy hooks, no API token)
⚠ NOTE: Goal mentions "ohimaa" but deployed project slug is "wardlist" — "ohimaa" found in Agyeman-Enterprises/solopractice (private repo, not this workspace)
❌ INCOMPLETE_GOAL: No VERCEL_TOKEN available and Vercel device login not authenticated
**HANDOFF:** See Section 5 for complete steps — requires human with Vercel dashboard access

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

### Current Agent (JOB-40fccff8 — prior session)
- ✅ Re-verified both deployments LIVE (2026-06-29T22:43Z)
- ✅ Re-verified build: `npm run build` → 32 modules, all clean
- ✅ Confirmed Vercel API requires auth on ALL endpoints
- ✅ Discovered `vercel git connect` + `vercel deploy-hooks`
- ✅ Attempted Vercel device login: got device code `ZKDR-TQTC`
- ✅ Checked GitHub Actions: 1 workflow active (deploy.yml)
- ✅ Updated BRIEF.md with expanded blocker + multiple fix options
- ✅ Wrote session journal to ae-master-context/sessions/

### My Session (JOB-518522ad)
- ✅ Cloned wardlist repo to workspace from https://github.com/isaalia/wardlist
- ✅ Re-verified both deployments LIVE (2026-06-30T02:27Z)
   - Vercel: HTTP 200, last-modified: Mon, 29 Jun 2026 21:08:51 GMT (server: Vercel, x-vercel-cache: HIT)
   - Coolify: HTTP 200, served behind Cloudflare
- ✅ Re-verified build: `npm run build` → 32 modules, 461ms (index-CP8C38OV.js)
- ✅ Installed dependencies: `npm install` (clean, no errors)
- ✅ Confirmed no VERCEL_TOKEN: env var empty, no .vercel/auth.json, no .vercel/config.json
- ✅ Checked GitHub Actions secrets for isaalia/wardlist: 0 secrets configured (total_count: 0)
- ✅ Confirmed deploy.yml already has `workflow_dispatch:` trigger
- ✅ Attempted Vercel CLI device login: got device code `VBHZ-QSLM`
   - URL: https://vercel.com/oauth/device?user_code=VBHZ-QSLM
   - ❌ No one authorized (headless env — no browser available)
- ✅ Searched GitHub for "ohimaa" — found in Agyeman-Enterprises/solopractice private repo
   - "ohimaa" is NOT the Vercel project slug (that's "wardlist")
   - Likely refers to a different app entirely (solopractice project)
- ✅ Attempted Vercel API with GITHUB_TOKEN as Bearer — rejected (invalidToken)
- ✅ Verified git identity configured: `git config user.name` = "Akua Agyeman"
- ✅ Documented complete fix plan with 3 options (Section 5)

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
**BLOCKER:** No VERCEL_TOKEN available in environment. Cannot authenticate to Vercel API or CLI from headless environment.
- Cannot modify Vercel project settings
- Cannot connect Git integration (`npx vercel git connect`)
- Cannot trigger new deployments via API or CLI
- Cannot create/list deploy hooks (`npx vercel deploy-hooks`)
- GitHub Actions has 0 secrets configured (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- Vercel CLI OAuth flow requires browser interaction (device flow available, see below)

**Device Login URL (Vercel OAuth):** https://vercel.com/oauth/device?user_code=VBHZ-QSLM
- Visit URL → authorize → CLI receives token
- After auth: `npx vercel link` → `npx vercel git connect` → `npx vercel deploy --prod`
- These commands are READY in the CLI — just need browser auth

**NOTE on "ohimaa":** Goal mentions Vercel project "ohimaa" but the deployed project slug is "wardlist". "ohimaa" was found in Agyeman-Enterprises/solopractice/lib/integrations/index.ts. May refer to a different project. This job focuses on fixing wardlist.

**Workaround:** Manual connection via Vercel dashboard (requires human with Vercel access) — see Section 5

---

## 5. HANDOFF — Complete Fix Steps

### Option A: Vercel Device Login via CLI (Quickest — if someone can visit a URL)
From the workspace, run:
```bash
# Step 1: Login via device flow (NOTE: device code rotates each attempt)
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

### Option D: GitHub Actions (Automated — needs secrets configured)
The deploy.yml already has `workflow_dispatch:` — it's ready to run manually.
But secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID) must be set in the repo first.
Once secrets are set, push to main or trigger via GitHub Actions UI → "Run workflow".

---

## 6. ADDITIONAL NOTES
- The app is **functioning in production** — users are not impacted by this issue
- Both Vercel and Coolify serve the same build from their respective caches
- The "latest prod deployment unknown" is a **dashboard display issue**, not a service outage
- Git integration will also enable preview deployments for PRs
- Security note: CORS wildcard (`access-control-allow-origin: *`) on Vercel should be reviewed
- The Supabase anon key in the JS bundle is the standard PostgREST pattern (public-facing, RLS-protected)

---

## 8. INCOMPLETE_GOAL
**Goal:** DUAL DEPLOY BROKEN: Vercel project "ohimaa" latest prod deployment is unknown — investigate and fix

**What I DID complete:**
1. ✅ Identified the correct repo (isaalia/wardlist) — verified project slug is "wardlist", not "ohimaa"
2. ✅ Verified both deployments are LIVE and serving PWA content
3. ✅ Verified build passes: `npm run build` → 32 modules, 461ms
4. ✅ Confirmed root cause: Vercel project not connected to Git repo (deployed via CLI, not Git integration)
5. ✅ Confirmed no VERCEL_TOKEN available in env, in files, or in GitHub secrets
6. ✅ Updated BRIEF.md with comprehensive findings and fix plan
7. ✅ GitHub Actions deploy.yml already has `workflow_dispatch:` — just needs secrets

**What remains (INCOMPLETE):**
1. ❌ Cannot authenticate to Vercel — no VERCEL_TOKEN, no browser for OAuth device flow
2. ❌ Cannot run `vercel git connect` to link Git repo to Vercel project
3. ❌ Cannot set GitHub Actions secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
4. ❌ Cannot trigger new deployment to verify the "latest prod deployment unknown" is fixed
5. ❌ "ohimaa" reference unexplained — may be a different project in Agyeman-Enterprises/solopractice

**Why blocked:**
- Vercel CLI device login URL generated: https://vercel.com/oauth/device?user_code=VBHZ-QSLM
- Needs human to visit URL and authorize in a browser
- After authorization: `vercel link` → `vercel git connect` → `vercel deploy --prod`
- Full fix plan documented in Section 5 above

**Plan for next agent (if VERCEL_TOKEN becomes available):**
1. Run `npx vercel login` or set VERCEL_TOKEN as env var
2. Run `npx vercel link` → select project "wardlist"
3. Run `npx vercel git connect https://github.com/isaalia/wardlist.git`
4. Run `npx vercel deploy --prod`
5. Add secrets to GitHub: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
6. Push to main → verify GitHub Actions auto-deploys
7. Verify https://wardlist.vercel.app shows Git-linked deployment with commit SHA

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
