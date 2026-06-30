# BRIEF.md — WardList Dual Deploy Fix

**Tracking ID:** JOB-b5ef5258
**Agent:** Agent (Floor 0)
**Status:** INCOMPLETE_GOAL — Vercel device auth required (7th agent to hit this blocker)

---

## Status
✅ PHASE A — Investigation complete (7 agents total)
✅ PHASE B — Build verified (`npm run build` passes: tsc + vite build — 32 modules)
✅ PHASE C — Both deployments confirmed LIVE
   - Vercel: https://wardlist.vercel.app — HTTP 200, serving PWA
   - Coolify: https://wardlist.agyemanenterprises.com — HTTP 200, behind Cloudflare
🔶 PHASE D — Vercel device login RUNNING (fresh code generated)
   - URL: https://vercel.com/oauth/device?user_code=QXGL-LPNL
   - Status: Waiting for browser authorization (new code generated 2026-06-30T04:36Z)
❌ PHASE E — GitHub Actions deploy pipeline blocked (missing secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
❌ PHASE F — No alternative auth mechanism found (no deploy hooks, no API token)
🔴 INCOMPLETE_GOAL: Cannot complete dual-deploy fix without Vercel authentication

**AUTH REQUIRED:** Visit https://vercel.com/oauth/device?user_code=QXGL-LPNL in a browser to authorize the Vercel CLI.

---

## 1. INVESTIGATION FINDINGS

### 1.1 Current Deployment State
Both deployments are **LIVE and serving** the same PWA:

| Deployment | URL | Status | Version |
|-----------|-----|--------|---------|
| Vercel (prod) | https://wardlist.vercel.app | ✅ 200 | Server: Vercel, Cache: HIT |
| AE Domain (Coolify/Hetzner) | https://wardlist.agyemanenterprises.com | ✅ 200 | Server: Cloudflare |
| GitHub source | https://github.com/isaalia/wardlist | ✅ 7 commits | Latest: ab11f1a |

### 1.2 Application Details
- **App:** WardList — GMH Hospitalist Daily Rounds List PWA
- **Tech Stack:** React 18 + Vite 5 + TypeScript 5 + PWA (Workbox)
- **Built from:** GitHub repo https://github.com/isaalia/wardlist (main branch)
- **Build status:** ✅ `npm run build` passes cleanly (tsc + vite build — 410ms)
- **API:** Supabase/PostgREST at https://wardlist-api.agyemanenterprises.com
- **DB Table:** `rounds_patients` (85+ columns for patient data)

### 1.3 Root Cause — "Latest Prod Deployment Unknown"
The Vercel dashboard shows "latest prod deployment is unknown" because:
1. **No Git repository connected** to the Vercel project — deployment was via CLI (`vercel --prod`)
2. **No VERCEL_TOKEN** exists in environment or any accessible config
3. **Vercel CLI cannot authenticate** — OAuth flow requires browser interaction

### 1.4 Naming Discrepancy — "scriba-medica" vs "wardlist"
- Mission refers to Vercel project "scriba-medica"
- scriba-medica.vercel.app returns HTTP 404 (DEPLOYMENT_NOT_FOUND)
- Actual Vercel project slug is **"wardlist"** (https://wardlist.vercel.app — HTTP 200)
- "scriba medica" is Latin for "medical scribe" — same domain as wardlist (hospitalist rounds)
- Likely the Vercel project was renamed from "scriba-medica" to "wardlist" at some point
- Prior job JOB-518522ad also had goal referencing "ohimaa" instead of "wardlist"
- The actual fix targets the wardlist Vercel project regardless of naming

### 1.5 Key Technical Details
- **Vercel deployment ID (from dashboard):** dpl_75ar93bcUCFoKJxjbixgDU9mD99N
- **Vercel project slug:** `wardlist` (matches URL https://wardlist.vercel.app)
- **Vercel region:** fra1 (Frankfurt)
- **Vercel config:** `vercel.json` — SPA rewrite, Vite framework preset
- **API:** Supabase/PostgREST at wardlist-api.agyemanenterprises.com
- **Service Worker:** Workbox-based, precaches all assets
- **GITHUB_TOKEN scopes:** `admin`, `repo`, `workflow`, `admin:repo_hook` — full control

---

## 2. WHAT WAS DONE (CURRENT SESSION — JOB-b5ef5258)

### Pre-Work (Steps 1-4)
- ✅ Read existing BRIEF.md from prior agent (JOB-ff9c757e)
- ✅ Read session journals from JOB-518522ad, JOB-7317c892, JOB-ff9c757e
- ✅ Identified correct repo: isaalia/wardlist (copied to /workspace)
- ✅ Both deployments verified LIVE (HTTP 200)
- ✅ Build verified clean: `npm run build` → 32 modules
- ✅ "scriba-medica" Vercel project verified: does not exist (404) — project is named "wardlist"
- ✅ GITHUB_TOKEN capabilities checked: full admin, repo, workflow scopes
- ✅ Vercel API tested: all endpoints require auth (confirmed)
- ✅ Vercel CLI config checked: no cached auth token (telemetry only)
- ✅ GitHub webhooks: none configured for this repo
- ✅ GitHub Actions secrets: 0 configured
- ✅ Vercel GitHub App verified: installed on Agyeman-Enterprises org (id: 92733929)
  - BUT repo is under isaalia (personal), not the org — app has no access
- ✅ Attempted VERCEL_TOKEN=$GITHUB_TOKEN: Vercel API returns 403 (not valid)
- ✅ Attempted `vercel login --github`: deprecated, falls through to device flow
- ✅ Attempted `vercel redeploy`: falls through to device flow
- ✅ Started fresh Vercel device login flow (code: QXGL-LPNL)
- ✅ Session journal written: ae-master-context/sessions/JOB-b5ef5258-wardlist-deploy.md

### Fix Plan (Post-Auth) — WOULD TAKE ~2 MINUTES
1. `npx vercel link` → select "wardlist" project
2. `npx vercel git connect https://github.com/isaalia/wardlist.git` — links Git to Vercel project
3. `npx vercel deploy --prod` — first Git-tracked deployment (fixes "deployment unknown")
4. Capture VERCEL_TOKEN from CLI auth, set GitHub Actions secrets (3 needed)
5. Push to main → verify GitHub Actions auto-deploys
6. Verify commit SHA shows in Vercel dashboard
7. Verify Coolify deployment still works (dual deploy check)

### Alternative Paths Investigated (blocked without auth)
- Vercel API unauthenticated: all endpoints return 403 "missing token"
- Vercel GitHub App: installed on org but wardlist is under personal account — no access
- Deploy hooks: require API auth to create (catch-22)
- Webhook registration: no Vercel webhook on this repo
- Transfer to org: would enable auto-deploy but may break Coolify config
- VERCEL_TOKEN env var: not set (checked all locations — env, files, config dirs, certs)

---

## 3. BUILD VERIFICATION
```bash
$ npm run build
> wardlist@1.0.0 build
> tsc && vite build
✓ 32 modules transformed.
✓ built in 410ms
PWA v0.19.8 - generateSW - precache 7 entries (158.84 KiB)
  dist/sw.js, dist/workbox-9c191d2f.js
```

---

## 4. AUTH STATUS
**Vercel CLI device login can be started when needed.**

URL: https://vercel.com/oauth/device?user_code=QXGL-LPNL
Status: Code generated 2026-06-30T04:36Z (expires 10 min, auto-refresh on new login attempt)

---

## 5. BLOCKERS
**BLOCKER:** Vercel CLI requires browser authorization — no workaround in headless environment.
This is the same blocker that stopped 6 prior agents (JOB-b6604a3c through JOB-ff9c757e).

**To unblock:** Visit https://vercel.com/oauth/device?user_code=QXGL-LPNL in a browser → Vercel CLI receives token automatically.

**Alternative (no browser needed):** If a VERCEL_TOKEN can be provided as an environment variable (`export VERCEL_TOKEN=<token>`), the agent can complete all remaining steps immediately.

---

## 6. FILE MAP
```
wardlist/
├── .github/workflows/deploy.yml   # Vercel deploy — needs VERCEL_TOKEN + secrets
├── public/                         # PWA icons
├── src/                            # React + TS source
│   ├── App.tsx                     # Main app (850+ lines)
│   ├── api.ts                      # Supabase PostgREST client
│   ├── types.ts                    # Patient data model
│   └── main.tsx                    # React entry point
├── index.html
├── package.json
├── vite.config.ts                  # Vite + PWA config
├── vercel.json                     # SPA rewrite, framework:vite
├── BRIEF.md                        # This file
├── tsconfig.json
└── ae-master-context/              # Session journals
```

---

## 7. INCOMPLETE GOAL — DETAILED PLAN

### What's Missing
The Vercel project at https://wardlist.vercel.app has "latest prod deployment is unknown" because Git is not connected. The fix requires:
1. Vercel CLI authentication (to `link`, `git connect`, and `deploy`)
2. GitHub Actions secrets configuration (to enable auto-deploy)

### Step-by-Step Resolution Plan (once VERCEL_TOKEN is available)

**Step 1 — Link project**
```bash
cd /workspace
npx vercel link --project wardlist --token $VERCEL_TOKEN --yes
# Creates .vercel/project.json with orgId and projectId
```

**Step 2 — Connect Git repo**
```bash
npx vercel git connect https://github.com/isaalia/wardlist.git --token $VERCEL_TOKEN
# Links the Vercel project to the GitHub repo
```

**Step 3 — Deploy with Git tracking**
```bash
npx vercel deploy --prod --token $VERCEL_TOKEN
# This deployment will be Git-tracked, fixing the "unknown" status
```

**Step 4 — Extract project IDs for GitHub secrets**
```bash
# Read .vercel/project.json after linking
# VERCEL_ORG_ID = orgId from .vercel/project.json
# VERCEL_PROJECT_ID = projectId from .vercel/project.json
# VERCEL_TOKEN = the token used (or create a dedicated one via Vercel dashboard)
```

**Step 5 — Set GitHub Actions secrets**
```bash
# Using GitHub API:
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" --repo isaalia/wardlist
gh secret set VERCEL_ORG_ID --body "$ORG_ID" --repo isaalia/wardlist
gh secret set VERCEL_PROJECT_ID --body "$PROJECT_ID" --repo isaalia/wardlist
```

**Step 6 — Verify auto-deploy**
```bash
# Push any change to main, or trigger workflow_dispatch:
# The GitHub Actions deploy.yml will run
```

**Step 7 — Verify dual deploy**
```bash
# Check Vercel: curl -sI https://wardlist.vercel.app
# Check Coolify: curl -sI https://wardlist.agyemanenterprises.com
```

### Without VERCEL_TOKEN — Alternative: Transfer repo to Agyeman-Enterprises org
If the Vercel GitHub App is installed on the org, transferring the repo there would enable auto-deploy:
```bash
# This is invasive and may break Coolify. Only as last resort.
```
