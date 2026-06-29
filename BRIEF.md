# BRIEF.md — WardList DUAL DEPLOY

**Tracking ID:** JOB-b6604a3c
**Agent:** Agent (Floor 0)
**Status:** INVESTIGATION COMPLETE — executing plan

---

## Status
INVESTIGATION COMPLETE — proceeding to execution phase

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
2. The GitHub repo at `annesha111/wardlist` is **empty** — no source code
3. The `ae-org` GitHub org exists but has 0 repos
4. No VERCEL_TOKEN is available in the environment

### 1.4 Key Technical Details
- **Vercel deployment ID (from dashboard):** dpl_75ar93bcUCFoKJxjbixgDU9mD99N
- **Vercel x-vercel-id pattern:** fra1::<instance-id> (fra1 = Frankfurt region)
- **Supabase anon key (baked into JS):** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- **Service worker:** standard Vite PWA plugin registration (`registerSW.js` → `sw.js`)

### 1.5 API State
- Supabase/PostgREST API is LIVE at wardlist-api.agyemanenterprises.com
- OpenAPI spec returns with `rounds_patients` table defined
- But `/api` and `/health` endpoints return `42P01` — the tables referenced by those specific routes don't exist in the public schema (the `rounds_patients` table IS defined though)
- This suggests the DB schema was partially set up

---

## 2. CONSTRAINTS
- **No VERCEL_TOKEN** available — can't use Vercel API or CLI for auth
- **No source code** in workspace — only an empty git repo
- **Budget:** $5.00 hard cap (LiteLLM enforcement)
- **Vercel CLI** installed at /home/agent/.npm-global/bin/vercel but requires OAuth login
- **GitHub token** available (GITHUB_TOKEN) for repo operations

---

## 3. EXECUTION PLAN

### Phase A — Create Source Code (Sequential)
1. Write package.json with React + Vite + PWA dependencies
2. Write vite.config.ts with PWA plugin config
3. Write index.html (from the deployed version)
4. Write src/main.tsx — React entry point
5. Write src/App.tsx — Main app component (WardList rounds manager)
6. Write src/api.ts — Supabase client + API helpers
7. Write CSS/styles
8. Write PWA assets (manifest, icons)
9. Write vercel.json for deployment config

### Phase B — Create GitHub Repo (Parallel with Phase A possible)
1. Create ae-org/wardlist repo via GitHub API
2. Push source code to main branch

### Phase C — Redeploy / Reconnect (Sequential after Phase B)
1. Try Vercel CLI with token from env or auth file
2. If no token: create a deploy hook URL or document manual reconnect steps
3. Verify production deployment status updates

### Expected Outcome
- Source code in GitHub repo connected to Vercel project
- Vercel dashboard shows production deployment with commit info
- App continues to serve from both Vercel and AE domain

---

## 4. BLOCKERS
**BLOCKER:** No VERCEL_TOKEN available in environment. Cannot authenticate to Vercel API or CLI.
- Cannot modify Vercel project settings
- Cannot trigger new deployments
- Cannot reconnect Git integration

**MITIGATION:** Will create source code + GitHub repo, then attempt Vercel deploy hook or manual reconnect. If Vercel auth remains blocked, will write HANDOFF with complete instructions for manual reconnect.

---

## 5. HANDOFFS
(none yet)

