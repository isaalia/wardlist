# BRIEF.md — WardList Dual Deploy Fix

**Tracking ID:** JOB-657cb386
**Agent:** Agent (Floor 0)
**Status:** AUTH WAITING — Vercel device login URL ready

---

## Status
✅ PHASE A — Investigation complete (7 prior agents + current)
✅ PHASE B — Build verified (`npm run build` passes: tsc + vite build — 32 modules, 410ms)
✅ PHASE C — Both deployments confirmed LIVE
   - Vercel: https://wardlist.vercel.app — HTTP 200, serving PWA
   - Coolify: https://wardlist.agyemanenterprises.com — HTTP 200, behind Cloudflare
✅ PHASE D — Repo transferred to Agyeman-Enterprises/wardlist (Vercel GitHub App installed on org)
   - Vercel GitHub App has `repository_selection: "all"` — can access the repo
   - BUT project still needs manual Git connection via `vercel git connect`
🔶 PHASE E — Vercel device auth flow READY (fresh code generated)
   - URL: https://vercel.com/oauth/device?user_code=PHQN-MZFF
   - Status: Waiting for browser authorization (generated 2026-06-30T04:40Z)
❌ PHASE F — GitHub Actions deploy pipeline blocked (missing secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)

---

## 1. INVESTIGATION FINDINGS

### 1.1 Current Deployment State
Both deployments are **LIVE and serving** the same PWA:

| Deployment | URL | Status | Version |
|-----------|-----|--------|---------|
| Vercel (prod) | https://wardlist.vercel.app | ✅ 200 | Server: Vercel, Cache: HIT |
| AE Domain (Coolify/Hetzner) | https://wardlist.agyemanenterprises.com | ✅ 200 | Server: Cloudflare |
| GitHub source | https://github.com/Agyeman-Enterprises/wardlist | ✅ 8 commits | Latest: 1ae11ad |

### 1.2 Application Details
- **App:** WardList — GMH Hospitalist Daily Rounds List PWA
- **Tech Stack:** React 18 + Vite 5 + TypeScript 5 + PWA (Workbox)
- **Built from:** GitHub repo https://github.com/Agyeman-Enterprises/wardlist (main branch)
- **Build status:** ✅ `npm run build` passes cleanly (tsc + vite build — 410ms)
- **API:** Supabase/PostgREST at https://wardlist-api.agyemanenterprises.com
- **DB Table:** `rounds_patients` (85+ columns for patient data)

### 1.3 Root Cause — "Latest Prod Deployment Unknown"
The Vercel dashboard shows "latest prod deployment is unknown" because:
1. **No Git repository connected** to the Vercel project — deployment was via CLI (`vercel --prod`)
2. **No VERCEL_TOKEN** exists in environment or any accessible config
3. **Vercel CLI cannot authenticate** — OAuth flow requires browser interaction

### 1.4 NEW — Repo Now in Org (Vercel GitHub App Active)
A critical change has occurred since the prior agents investigated:
- **Repo was transferred** from `isaalia/wardlist` to `Agyeman-Enterprises/wardlist`
- **Vercel GitHub App IS installed** on the org (id: 92733929, `repository_selection: "all"`)
- This means the Vercel App CAN access the repo's webhook events
- **BUT** the Vercel project still needs `vercel git connect` to pair the project with the Git repo
- No webhooks or deployments were auto-created — manual configuration still needed

### 1.5 Key Technical Details
- **Vercel deployment ID (from dashboard):** dpl_75ar93bcUCFoKJxjbixgDU9mD99N
- **Vercel project slug:** `wardlist` (matches URL https://wardlist.vercel.app)
- **Vercel region:** fra1 (Frankfurt)
- **Vercel config:** `vercel.json` — SPA rewrite, Vite framework preset
- **API:** Supabase/PostgREST at wardlist-api.agyemanenterprises.com
- **Service Worker:** Workbox-based, precaches all assets
- **GITHUB_TOKEN scopes:** `admin`, `repo`, `workflow`, `admin:repo_hook` — full control

---

## 2. WHAT WAS DONE (CURRENT SESSION — JOB-657cb386)

### Pre-Work (Steps 1-6)
- ✅ Read existing BRIEF.md from prior agents (7 prior sessions: b6604a3c, 4839bd22, 40fccff8, 518522ad, 7317c892, ff9c757e, b5ef5258)
- ✅ Read session journals from all 7 prior agents
- ✅ Cloned repo and verified workspace
- ✅ Both deployments verified LIVE (HTTP 200)
- ✅ Build verified clean: `npm run build` → 32 modules, 410ms
- ✅ Source code read and understood (App.tsx, api.ts, types.ts, main.tsx)
- ✅ Vercel CLI checked: v54.18.5 available via npx
- ✅ Vercel CLI auth checked: no cached credentials (telemetry only)
- ✅ GitHub token checked: full admin, repo, workflow scopes
- ✅ Repo webhooks checked: none configured
- ✅ GitHub Actions secrets checked: 0 configured
- ✅ Vercel API tested unauthenticated: all return 403
- ✅ Vercel GitHub App verified: installed on Agyeman-Enterprises org (id: 92733929, all repos)
- ✅ **DISCOVERED: Repo transferred to Agyeman-Enterprises/wardlist** (prior agents saw isaalia/wardlist)
- ✅ Updated git remote to new org URL
- ✅ Verified Vercel API returns 403 with GITHUB_TOKEN (not interchangeable)
- ✅ Verified no Vercel OAuth client_credentials flow available (all endpoints require auth)
- ✅ Fresh Vercel device auth flow generated

### Fix Plan (Post-Auth — ~2 minutes total)

**Step 1 — Link project**
```bash
cd /workspace
npx vercel link --project wardlist --token $VERCEL_TOKEN --yes
```

**Step 2 — Connect Git repo**
```bash
npx vercel git connect https://github.com/Agyeman-Enterprises/wardlist.git --token $VERCEL_TOKEN
```

**Step 3 — Deploy with Git tracking**
```bash
npx vercel deploy --prod --token $VERCEL_TOKEN
```

**Step 4 — Extract project IDs for GitHub secrets**
```bash
# VERCEL_ORG_ID + VERCEL_PROJECT_ID from .vercel/project.json after linking
# VERCEL_TOKEN = the token used (or create dedicated one via Vercel dashboard)
```

**Step 5 — Set GitHub Actions secrets**
```bash
curl -s -X PUT -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/Agyeman-Enterprises/wardlist/actions/secrets/VERCEL_TOKEN" \
  -d "{\"encrypted_value\":\"$B64_TOKEN\",\"key_id\":\"$KEY_ID\"}"
```

**Step 6 — Verify auto-deploy**
```bash
# Push or trigger workflow_dispatch — verify GitHub Actions deploys
```

**Step 7 — Verify dual deploy**
```bash
curl -sI https://wardlist.vercel.app
curl -sI https://wardlist.agyemanenterprises.com
```

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

## 4. AUTH REQUIRED — BROWSER ACTION NEEDED

**The ONLY thing blocking the fix is Vercel CLI authentication.**

All 7 prior agents hit this same wall. The Vercel CLI uses OAuth device flow, which requires a browser.

### What to do:
1. **Visit this URL in any browser:** https://vercel.com/oauth/device?user_code=PHQN-MZFF
2. **Log in to Vercel** (Akua's account)
3. **Authorize the CLI** — click "Authorize"
4. **That's it** — the agent detects auth and auto-completes the fix

### Why this is the only option:
- Vercel API requires authentication for ALL endpoints (verified)
- No VERCEL_TOKEN exists anywhere (env, files, secrets — all checked)
- Vercel CLI has no headless auth mechanism
- The GitHub token can't authenticate with Vercel

### What happens after auth (fully automated):
1. `npx vercel link` → link to existing project "wardlist"
2. `npx vercel git connect` → connect GitHub repo
3. `npx vercel deploy --prod` → Git-tracked deployment
4. Extract VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
5. Set all 3 GitHub Actions secrets
6. Verify commit SHA on Vercel dashboard
7. Verify dual deploy (both Vercel + Coolify)

---

## 5. BLOCKERS
**BLOCKER:** Vercel CLI requires browser authorization — no workaround in headless environment.
This is the same blocker that stopped 7 prior agents (JOB-b6604a3c through JOB-b5ef5258).

**Device URL:** https://vercel.com/oauth/device?user_code=PHQN-MZFF
**Expires:** ~15 minutes from generation (code: PHQN-MZFF generated 2026-06-30T04:40Z)
**If expired:** Agent can regenerate — just re-run the auth flow.

**Alternative:** If a VERCEL_TOKEN is available from Vercel dashboard → Account → Settings → Tokens, set it as `export VERCEL_TOKEN=<value>` and the agent completes everything immediately.

---

## 6. FILE MAP
```
wardlist/
├── .github/workflows/deploy.yml   # Vercel deploy — needs VERCEL_TOKEN + secrets
├── public/                         # PWA icons
├── src/                            # React + TS source
│   ├── App.tsx                     # Main app (850+ lines)
│   ├── api.ts                      # Supabase PostgREST client
│   ├── types.ts                    # Patient data model (85+ fields)
│   └── main.tsx                    # React entry point
├── ae-master-context/sessions/     # Session journals (8 total)
├── index.html
├── package.json
├── vite.config.ts                  # Vite + PWA config
├── vercel.json                     # SPA rewrite, framework:vite
├── BRIEF.md                        # This file
└── tsconfig.json
```
