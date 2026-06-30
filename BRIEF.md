# BRIEF.md — WardList Dual Deploy Fix

**Tracking ID:** JOB-ff9c757e
**Agent:** Agent (Floor 0)
**Status:** AUTH WAITING — Vercel device login running (URL below)

---

## Status
✅ PHASE A — Investigation complete (6 prior agents + current)
✅ PHASE B — Build verified (`npm run build` passes: tsc + vite build — 32 modules, 410ms)
✅ PHASE C — Both deployments confirmed LIVE
   - Vercel: https://wardlist.vercel.app — HTTP 200, serving PWA
   - Coolify: https://wardlist.agyemanenterprises.com — HTTP 200, behind Cloudflare
🔶 PHASE D — Vercel device login RUNNING
   - URL: https://vercel.com/oauth/device?user_code=RHDX-HJPC
   - Status: Waiting for browser authorization
❌ PHASE E — GitHub Actions deploy pipeline blocked (missing secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
❌ PHASE F — No alternative auth mechanism found (no deploy hooks, no API token)

**AUTH REQUIRED:** Visit https://vercel.com/oauth/device?user_code=RHDX-HJPC in a browser to authorize the Vercel CLI. After authorization, this agent will proceed with the fix.

---

## 1. INVESTIGATION FINDINGS

### 1.1 Current Deployment State
Both deployments are **LIVE and serving** the same PWA:

| Deployment | URL | Status | Version |
|-----------|-----|--------|---------|
| Vercel (prod) | https://wardlist.vercel.app | ✅ 200 | Server: Vercel, Cache: HIT |
| AE Domain (Coolify/Hetzner) | https://wardlist.agyemanenterprises.com | ✅ 200 | Server: Cloudflare |
| GitHub source | https://github.com/isaalia/wardlist | ✅ 7 commits | Latest: 5b3efe7 |

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

### 1.4 Key Technical Details
- **Vercel deployment ID (from dashboard):** dpl_75ar93bcUCFoKJxjbixgDU9mD99N
- **Vercel project slug:** `wardlist` (matches URL https://wardlist.vercel.app)
- **Vercel region:** fra1 (Frankfurt)
- **Vercel config:** `vercel.json` — SPA rewrite, Vite framework preset
- **API:** Supabase/PostgREST at wardlist-api.agyemanenterprises.com
- **Service Worker:** Workbox-based, precaches all assets
- **GITHUB_TOKEN scopes:** `admin`, `repo`, `workflow`, `admin:repo_hook` — full control

---

## 2. WHAT WAS DONE (CURRENT SESSION — JOB-ff9c757e)

### Pre-Work (Steps 1-4)
- ✅ Read existing BRIEF.md from prior agents (5 prior sessions investigated)
- ✅ Read session journals from JOB-518522ad and JOB-7317c892
- ✅ Identified correct repo: isaalia/wardlist (not in org, under user account)
- ✅ Both deployments verified LIVE (HTTP 200)
- ✅ Build verified clean: `npm run build` → 32 modules, 410ms
- ✅ GITHUB_TOKEN capabilities checked: full admin, repo, workflow scopes
- ✅ Vercel API tested: all endpoints require auth (confirmed)
- ✅ Vercel CLI config checked: no cached auth token (telemetry only)
- ✅ GitHub webhooks: none configured for this repo
- ✅ GitHub Actions secrets: 0 configured
- ✅ Vercel GitHub App verified: installed on Agyeman-Enterprises org (id: 92733929, app_id: 8329)
  - BUT repo is under isaalia (personal), not the org — app has no access
  - Cannot generate installation access token without app private key
- ✅ Started Vercel device login flow (Monitor bg task)
  - Device URL: https://vercel.com/oauth/device?user_code=RHDX-HJPC

### Fix Plan (Post-Auth)
1. When authorized: `npx vercel link` → select "wardlist" project
2. `npx vercel git connect https://github.com/isaalia/wardlist.git` — links Git to Vercel project
3. `npx vercel deploy --prod` — first Git-tracked deployment (fixes "deployment unknown")
4. `npx vercel token` or `cat ~/.vercel/auth.json` → get VERCEL_TOKEN
5. Set 3 GitHub Actions secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
6. Push to main → verify GitHub Actions auto-deploys
7. Verify commit SHA shows in Vercel dashboard
8. Verify Coolify deployment still works (dual deploy check)

### Alternative Paths Investigated (blocked without auth)
- Vercel API unauthenticated: all endpoints return 403
- Vercel GitHub App: installed on org but wardlist is under personal account
- Deploy hooks: require API auth to create (catch-22)
- Webhook registration: no Vercel webhook on this repo
- Transfer to org: would enable auto-deploy but may break Coolify config

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
**Vercel CLI device login is RUNNING in background (Monitor).**

URL: https://vercel.com/oauth/device?user_code=NXSP-PMBB
Status: Waiting for browser authorization

**What happens after auth (automatic):**
1. Vercel CLI receives token
2. `npx vercel link` — link to existing project "wardlist"
3. `npx vercel git connect https://github.com/isaalia/wardlist.git`
4. `npx vercel deploy --prod` — deploy with Git tracking
5. Generate VERCEL_TOKEN, set GitHub Actions secrets
6. Push to main — verify GitHub Actions auto-deploys
7. Verify commit SHA on Vercel dashboard

---

## 5. BLOCKERS
**BLOCKER:** Vercel CLI requires browser authorization — no workaround in headless env (same blocker as 5 prior agents).
- URL: https://vercel.com/oauth/device?user_code=RHDX-HJPC
- Visit URL in a browser → authorize → Vercel CLI receives token → I proceed automatically
- Device code expires after ~15 min if not authorized — CLI auto-restarts the flow

**NOTE:** Both deployments SERVING USERS — this is a dashboard/CI issue, not an outage.
- Vercel: https://wardlist.vercel.app — HTTP 200
- Coolify: https://wardlist.agyemanenterprises.com — HTTP 200

**NOTE:** After auth, the complete fix takes ~2 minutes. All 7 steps are planned and ready to execute.

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
└── tsconfig.json
```
