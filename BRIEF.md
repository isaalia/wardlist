# BRIEF.md — WardList Dual Deploy Fix

**Tracking ID:** JOB-4839bd22
**Agent:** Agent (Floor 0)
**Status:** INVESTIGATION COMPLETE — Blocked on VERCEL_TOKEN

---

## Status
✅ PHASE A — Investigation complete
✅ PHASE B — Build verified (npm run build passes: tsc + vite build)
✅ PHASE C — Both deployments confirmed LIVE
   - Vercel: https://wardlist.vercel.app — HTTP 200, serving PWA
   - Coolify: https://wardlist.agyemanenterprises.com — HTTP 200, serving same PWA
❌ PHASE D — Vercel Git integration blocked (no VERCEL_TOKEN available)
❌ PHASE E — GitHub Actions deploy pipeline blocked (missing secrets)
**HANDOFF:** Manual Vercel dashboard action required (see Section 4)

---

## 1. INVESTIGATION FINDINGS

### 1.1 Current Deployment State
Both deployments are **LIVE and serving** the same PWA:

| Deployment | URL | Status | Version |
|-----------|-----|--------|---------|
| Vercel (prod) | https://wardlist.vercel.app | ✅ 200 | Bundle: index-C32JCrzc.js |
| AE Domain (Coolify/Hetzner) | https://wardlist.agyemanenterprises.com | ✅ 200 | Bundle: index-C32JCrzc.js |
| GitHub source | https://github.com/isaalia/wardlist | ✅ Has 3 commits | Latest: 284b36b |

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
  - NOTE: Mission statement references project "web" — but the actual Vercel project is `wardlist`
- **Vercel region:** fra1 (Frankfurt)
- **Vercel config:** `vercel.json` — SPA rewrite, Vite framework preset
- **API:** Supabase/PostgREST at wardlist-api.agyemanenterprises.com
- **CORS:** Vercel returns `access-control-allow-origin: *` (noted for security review)
- **Service Worker:** Workbox-based, precaches all assets

---

## 2. FIX PLAN

### Phase A: Get VERCEL_TOKEN (Critical Path)
The entire fix depends on obtaining a VERCEL_TOKEN. Options:

**Option 1: Generate from Vercel Dashboard (Recommended)**
1. Open https://vercel.com/account/tokens
2. Create a new token with appropriate scope
3. Set as `VERCEL_TOKEN` in GitHub repo secrets (Settings → Secrets → Actions)
4. Also set `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` secrets
5. Push to main → GitHub Actions auto-deploys and connects Git

**Option 2: Authenticate Vercel CLI via Device Flow**
```bash
export PATH="/home/agent/.npm-global/bin:$PATH"
vercel login
# Opens browser at https://vercel.com/oauth/device?user_code=XXXX-XXXX
# Then:
vercel link --project wardlist
vercel deploy --prod
```

**Option 3: Manual Git Connection in Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Find project "wardlist"
3. Settings → Git → "Connect Git Repository"
4. Select "isaalia/wardlist"
5. Auto-deploys on push to main

### Phase B: Configure GitHub Actions Secrets
Once token is available, set these secrets in GitHub repo:
```
VERCEL_TOKEN=<from Phase A>
VERCEL_ORG_ID=<from 'vercel whoami' or team settings>
VERCEL_PROJECT_ID=<from project settings>
```

### Phase C: Verify End-to-End
1. Push a change to main
2. GitHub Actions triggers deploy
3. Verify "latest prod deployment" shows commit SHA in Vercel dashboard
4. Verify https://wardlist.vercel.app serves updated content
5. Verify https://wardlist.agyemanenterprises.com still works (Coolify side)

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
- Cannot connect Git integration
- Cannot trigger new deployments via API
- Vercel CLI OAuth flow requires browser interaction (headless environment)
- **Workaround:** Manual connection via Vercel dashboard (requires human with Vercel access)

---

## 5. HANDOFF — What Needs Human Action

### Required: Someone with Vercel dashboard access needs to:

**Step 1:** Connect git repo
- Visit https://vercel.com/[team]/wardlist/settings/git
- Click "Connect Git Repository"
- Select `isaalia/wardlist`
- Select `main` branch for auto-deploy

**Step 2:** Add GitHub Actions secrets
- Visit https://github.com/isaalia/wardlist/settings/secrets/actions
- Add `VERCEL_TOKEN` (from https://vercel.com/account/tokens)
- Add `VERCEL_ORG_ID` (run `vercel whoami` or check team settings)
- Add `VERCEL_PROJECT_ID` (project settings → Project ID)

**Step 3:** Verify
- Push to main → auto-deploy
- Confirm "latest prod deployment" now shows commit SHA

### Optional: Alternative quick fix
```bash
# On any machine with Vercel CLI:
vercel login                    # browser OAuth
vercel link --project wardlist  # link to existing project
vercel deploy --prod            # redeploy with Git tracking
```

---

## 6. ADDITIONAL NOTES
- The app is **functioning in production** — users are not impacted
- Both Vercel and Coolify serve the same build
- The "latest prod deployment unknown" is a **dashboard display issue**, not a service outage
- Git integration will also enable preview deployments for PRs
- Security note: CORS wildcard (`access-control-allow-origin: *`) on Vercel should be reviewed
- The Supabase anon key in the JS bundle is the standard PostgREST pattern (public-facing, RLS-protected)
