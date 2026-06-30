# WardList — UX Documentation
**App:** WardList — GMH Hospitalist Daily Rounds Tool
**URLs:** https://wardlist.app (Vercel) · https://wardlist.agyemanenterprises.com (Aurora/Hetzner)
**Stack:** Vite + React PWA + nginx Docker · PostgREST API · Postgres
**Date tested:** 2026-06-30

---

## App Overview

WardList is a single-page PWA for GMH hospitalist physicians to track daily rounds patients. No login required — single-user internal tool. Data persists via a self-hosted PostgREST API backed by Postgres on Aurora.

---

## Navigation

The app has two tabs in the header, always visible:

| Tab | Purpose |
|-----|---------|
| **Today's List** | Active working view — patient cards for the current rounds shift |
| **Saved** | Persistent records — previously saved patient data stored in the database |

Switching tabs is instant (state-based, no route change, no page reload).

---

## Today's List Tab

### Action Bar (top, below tabs)
| Button | Behavior |
|--------|---------|
| `📷 Scan Census` | Opens Scan Census modal |
| `+ Add Patient` | Adds a blank patient card above the existing list |
| `Save All` | Upserts all current patient cards to `rounds_patients` table; shows "Saved N patient(s) ✓" toast for 4 seconds |
| `1/pg` / `2/pg` / `4/pg` | Sets print density — selected state shown with dark background; controls page break CSS class on patient cards |
| `🖨 Print` | Triggers browser print dialog |

### Patient Card
Each patient has a card with:
- **Header row:** "Patient N" label · `🖥️ Scan Orders` · `🎙 Dictate` · `Remove`
- **Patient Info section:** Room #, Name, MRN, DOB, Age (auto-computed from DOB), Attending/MD, Admit Date, Consults, HT, WT, Dx, Parent/Guardian
- **History:** Hx (textarea)
- **Diet / Orders:** Diet, Activity, IVF, IV Site, Meds, PRN, Allergies, Neb Tx, Code Status, Precautions, Notes
- **Assessment & Plan:** Labs, Echo, CXR, I&O, Special Needs, New Meds, New Concerns
- **Pending:** Pending Labs, Pending Procedures, Pending Consults, Plan of Care/Goals, Other
- **Medicine Prophylaxis:** 11 checkbox items (3-state: blank → Ordered → Done)
- **Service Consults:** 9 checkbox items (3-state)
- **Discharge Planning:** 10 checkbox items (3-state) + Target Disposition + Discharge Notes
- **Nursing Checks:** Pain Reassessment, Restraints, Suicide Level, Critical Test/Results, PEWS, HRFE, Home Meds Pending

All fields are plain text inputs or textareas. No required fields. All changes are local state until Save All is clicked.

### Patient Card Actions

**Remove** — removes the card from the local list immediately. Does NOT delete from the database.

**🎙 Dictate** — opens Dictation Modal for that patient.

**🖥️ Scan Orders** — opens Scan Orders Modal for that patient.

### Bottom of List
`+ Add another patient` link appears below all patient cards. Equivalent to `+ Add Patient` in the action bar.

---

## Saved Tab

Shows all records persisted in the `rounds_patients` database table, ordered by `created_at DESC` (most recent first).

### Record Row
Each saved record shows:
- Patient name (bold)
- MRN · Room · Dx (secondary line)
- "Saved [date/time]" timestamp
- `Load` and `Delete` buttons

### Load
Clicks the Load button → loads that patient record into Today's List (replaces current list with just that one patient) → switches tab to Today's List.

### Delete (Inline Confirmation)
1. Click **Delete** → button is replaced inline with **Confirm** + **Cancel**
2. Click **Confirm** → record deleted from DB → list refreshes → record disappears
3. Click **Cancel** → confirmation dismissed → Delete button restored

No native browser `confirm()` dialog is used. No automation blocker.

### Empty State
"No saved records yet." — shown when the database table is empty or all records have been deleted.

### Error State
"Could not connect to database." — shown if the PostgREST API is unreachable (network failure or service down).

---

## Modals

### 📷 Scan Census Modal
- Title: "Scan Census Sheet"
- Instruction: "Photo your ADT census — printed or handwritten. All patients extracted at once."
- File input: JPG, PNG, HEIC
- Camera/upload icon for mobile tap
- Buttons: **Cancel** (closes modal) · **Extract Patients** (disabled until file selected; sends image to Claude Sonnet vision via LiteLLM → parses all patients → populates Today's List)
- Close button (×) top-left

### 🎙 Dictate Modal (per patient)
- Title: "Dictation Mode" / patient name or "New Patient"
- Instruction: "Tell me everything about this patient. Diagnosis, diet, fluids, meds, labs, prophylaxis ordered, consults placed, discharge plan, DME, social work — anything. Speak naturally."
- Button: **🎙 Start Dictating** (browser microphone API → sends transcript to DeepSeek-R1 via LiteLLM → fills patient form fields)
- Close button (×) top-left

### 🖥️ Scan Orders Modal (per patient)
- Title: "CareVue Orders Scan"
- Subtitle: patient name
- Instruction: "Screenshot the Active Orders tab in CareVue. Meds, IVF, diet, labs, nursing orders — all extracted and merged into this patient's card."
- File input: JPG, PNG, HEIC
- Camera/upload icon for mobile tap
- Buttons: **Cancel** · **Import Orders** (disabled until file selected)
- Close button (×) top-left

---

## PWA Behavior

- Installable on iOS/Android/Desktop as a standalone app
- Service worker caches assets for offline shell (form data requires API connectivity)
- Theme color: blue (#2563eb)
- Apple touch icon: `/apple-touch-icon.png`

---

## AI Integration (via LiteLLM at ai.agyemanenterprises.com)

| Feature | Model | Flow |
|---------|-------|------|
| Census Scan (Scan Census) | `claude-sonnet-4-6` | Image → vision extraction → JSON array of patients |
| Dictation | `deepseek-r1` | Audio transcript → structured patient fields |
| Orders Scan | `claude-sonnet-4-6` | Image → orders extraction → merge into patient card |

All AI calls route through `ai.agyemanenterprises.com` (Cardinal Inference Stack). No direct provider calls.

---

## Print

- Print button triggers `window.print()`
- Patient cards have `page-break-inside: avoid`
- Print density classes control page breaks:
  - `print-1`: every card on its own page
  - `print-2`: 2 cards per page
  - `print-4`: 4 cards per page (smaller font/textareas)
- Header and action bar hidden in print (`no-print` class)

---

## Responsive / Mobile

- Tested at 375px viewport — no horizontal scroll, all tap targets accessible
- Action bar buttons fit on one row at 375px
- All form fields full-width on mobile
- Print controls hidden on mobile (no-print CSS class applies in print media)

---

## Data Architecture

- **Database:** Postgres on Aurora port 5453, database `wardlist`, table `rounds_patients` (82 columns)
- **API:** PostgREST v12.2.0 at `wardlist-api.agyemanenterprises.com` (Traefik static YAML config)
- **Auth:** JWT HS256, anon role, RLS enabled
- **CORS:** Allows `wardlist.app` and `wardlist.agyemanenterprises.com`
- **Upsert strategy:** `Prefer: resolution=merge-duplicates` on `id` column

---

## Known Limitations

- No user authentication — single-user tool, anyone with the URL can read/write
- Patient data in Today's List is ephemeral (lost on page refresh unless saved)
- Dictation requires browser microphone permission
- Scan features require good image quality; handwritten census may have lower accuracy
- AI features require connectivity to `ai.agyemanenterprises.com` (LiteLLM)
