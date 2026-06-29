import { useState, useEffect, useCallback, useRef } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = {
  async upsert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async fetchAll(table) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async delete(table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) throw new Error(await res.text());
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function calcAge(dob) {
  if (!dob) return "";
  const b = new Date(dob);
  if (isNaN(b)) return "";
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const months = ((now.getMonth() - b.getMonth()) + 12) % 12;
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) years--;
  return years < 2 ? `${years}y ${months}m` : `${years}yo`;
}

function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("File read failed"));
    r.readAsDataURL(file);
  });
}

// ─── CHECKBOX STATES: 0=blank, 1=Ordered, 2=Done ─────────────────────────────
const CHECK_STATES = ["—", "Ordered", "Done"];
const CHECK_COLORS = [
  "bg-slate-100 text-slate-400 border-slate-200",
  "bg-amber-100 text-amber-700 border-amber-300",
  "bg-emerald-100 text-emerald-700 border-emerald-300",
];

function CheckItem({ label, value, onChange }) {
  const state = value || 0;
  const next = () => onChange((state + 1) % 3);
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-700 flex-1">{label}</span>
      <button
        onClick={next}
        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all min-w-[58px] text-center ${CHECK_COLORS[state]}`}
      >
        {CHECK_STATES[state]}
      </button>
    </div>
  );
}

// ─── EMPTY PATIENT ────────────────────────────────────────────────────────────
const emptyChecks = () => ({
  cx_gi_prop: 0, cx_sq_heparin: 0, cx_enoxaparin: 0, cx_dvt_boots: 0,
  cx_aspirin: 0, cx_bowel_reg: 0, cx_oral_care: 0, cx_hob: 0,
  cx_foley_dc: 0, cx_lines_dc: 0,
  prophylaxis_notes: "",
  cx_pt: 0, cx_ot: 0, cx_diet: 0, cx_sw: 0, cx_cm: 0,
  cx_chaplain: 0, cx_wound: 0, cx_palliative: 0, cx_speech: 0,
  cx_pharmacy: 0,
  consult_notes: "",
  dc_target_dispo: "",
  cx_dme: 0, cx_ssoc: 0, cx_home_health: 0, cx_snf: 0,
  cx_fu_md: 0, cx_pt_edu: 0, cx_ins_auth: 0, cx_transport: 0,
  cx_rx_dc: 0, cx_dc_summary: 0,
  dc_notes: "",
});

const emptyPatient = () => ({
  id: crypto.randomUUID(),
  room: "", name: "", mrn: "", dob: "", age: "", ht: "", wt: "",
  dx: "", md: "", consults: "", parent_guardian: "", admit_date: "",
  hx: "", diet: "", activity: "", ivf: "", ivf_site: "", meds: "",
  prn: "", allergies: "", neb_tx: "", code_status: "", precautions: "",
  notes: "", labs: "", echo: "", cxr: "", io: "", special_equipment: "",
  new_meds: "", new_concerns: "", pending_labs: "", pending_procedures: "",
  pending_consults: "", plan_of_care: "", other: "",
  pain_reassessment: "", restraints: "", suicide_level: "",
  critical_results: "", pews: "", hrfe: "", home_meds: "",
  ...emptyChecks(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// ─── AI CLIENT (routes through AE LiteLLM — ai.agyemanenterprises.com) ───────
const AI_BASE = import.meta.env.VITE_AI_BASE || "https://ai.agyemanenterprises.com";
const AI_KEY  = import.meta.env.VITE_AI_KEY  || "";

async function callAI(messages, systemPrompt, maxTokens = 2000, model = "claude-sonnet-4-6") {
  const res = await fetch(`${AI_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": AI_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.find(b => b.type === "text")?.text || "";
}

async function callAIVision(userContent, maxTokens = 4000) {
  const res = await fetch(`${AI_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": AI_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.find(b => b.type === "text")?.text || "";
}

// ─── DICTATION MODAL ──────────────────────────────────────────────────────────
const DICTATION_SYSTEM = `You are a clinical scribe for a hospitalist physician.
The doctor will free-talk about a patient. Extract and map every piece of information to the correct field.
Convert natural language to standard clinical shorthand used in US hospitals.

Shorthand rules:
- "NPO after midnight" → "NPO p MN"
- "normal saline at X per hour" → "NS @Xml/hr"
- "no known allergies" → "NKA"
- "do not resuscitate" → "DNR" | "full code" → "FC"
- "as needed" → "PRN" | "twice daily" → "BID" | "three times daily" → "TID"
- "tylenol" → "tyl" | "morphine" → "morph"
- "chest x-ray" → "CXR" | "complete blood count" → "CBC" | "comprehensive metabolic panel" → "CMP"
- "incentive spirometry" → "IS" | "non-rebreather" → "NRB"
- "physical therapy" → "PT" | "occupational therapy" → "OT"
- "skilled nursing facility" → "SNF" | "home health" → "HH"
- "durable medical equipment" → "DME"
- "social work" → "SW" | "case management" → "CM"
- "proton pump inhibitor" → "PPI" | "H2 blocker" → "H2B"
- "subcutaneous heparin" → "SQ hep" | "low molecular weight heparin" → "LMWH"
- "sequential compression device" → "SCD/DVT boots"
- "head of bed" → "HOB"
- "discharge" → "DC" | "disposition" → "dispo"
- Diagnoses: use standard medical abbreviations

For checkbox fields, if the doctor mentions ordering, starting, placing, or requesting something,
set value to 1 (Ordered). If they say it's done, completed, or finished, set to 2 (Done). Otherwise 0.

Checkbox keys and what triggers them:
cx_gi_prop: GI prophylaxis, PPI, H2 blocker, pantoprazole, famotidine
cx_sq_heparin: heparin subq, heparin SQ, DVT prophylaxis heparin
cx_enoxaparin: lovenox, enoxaparin, LMWH
cx_dvt_boots: SCDs, sequential compression, DVT boots, pneumatic compression
cx_aspirin: aspirin, ASA
cx_bowel_reg: bowel regimen, colace, miralax, senna, constipation
cx_oral_care: oral care, mouth care, chlorhexidine
cx_hob: head of bed elevated, HOB 30, HOB elevation
cx_foley_dc: foley out, remove foley, discontinue foley, foley DC
cx_lines_dc: line DC, remove IV, central line out, PICC out
cx_pt: PT, physical therapy
cx_ot: OT, occupational therapy
cx_diet: diet consult, nutrition consult, dietitian
cx_sw: social work, SW consult
cx_cm: case management, CM
cx_chaplain: chaplain, spiritual care
cx_wound: wound care, wound consult
cx_palliative: palliative, comfort care, hospice
cx_speech: speech therapy, speech, SLP, swallow eval
cx_pharmacy: pharmacy, pharmacist, med rec
cx_dme: DME, wheelchair, walker, crutches, equipment
cx_ssoc: SSOC, social services, community resources
cx_home_health: home health, HH, visiting nurse
cx_snf: SNF, skilled nursing, rehab facility, LTAC
cx_fu_md: follow up, follow-up appointment, outpatient MD
cx_pt_edu: patient education, teaching, discharge teaching
cx_ins_auth: insurance authorization, prior auth, insurance approval
cx_transport: transport, ambulance, wheelchair van
cx_rx_dc: discharge prescriptions, DC meds, prescriptions on discharge
cx_dc_summary: discharge summary, DC summary

Return ONLY a raw JSON object with these exact keys (empty string "" or 0 for anything not mentioned):
name, mrn, dob, age, room, md, admit_date, dx, consults, ht, wt, parent_guardian,
hx, diet, activity, ivf, ivf_site, meds, prn, allergies, neb_tx, code_status, precautions,
notes, labs, echo, cxr, io, special_equipment, new_meds, new_concerns,
pending_labs, pending_procedures, pending_consults, plan_of_care, other,
pain_reassessment, restraints, suicide_level, critical_results, pews, hrfe, home_meds,
cx_gi_prop, cx_sq_heparin, cx_enoxaparin, cx_dvt_boots, cx_aspirin, cx_bowel_reg,
cx_oral_care, cx_hob, cx_foley_dc, cx_lines_dc, prophylaxis_notes,
cx_pt, cx_ot, cx_diet, cx_sw, cx_cm, cx_chaplain, cx_wound, cx_palliative,
cx_speech, cx_pharmacy, consult_notes,
dc_target_dispo, cx_dme, cx_ssoc, cx_home_health, cx_snf, cx_fu_md,
cx_pt_edu, cx_ins_auth, cx_transport, cx_rx_dc, cx_dc_summary, dc_notes.
No markdown, no backticks, no explanation.`;

function DictationModal({ onClose, onFilled, existingPatient }) {
  const [phase, setPhase] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const recognitionRef = useRef(null);

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg("Speech recognition not supported. Use Chrome or Safari on iOS.");
      setPhase("error");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;
    let finalText = "";
    let silenceTimer = null;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim = t;
      }
      setTranscript(finalText + interim);
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (finalText.trim().length > 10) { rec.stop(); processTranscript(finalText); }
      }, 3000);
    };
    rec.onerror = (e) => { setErrorMsg("Mic error: " + e.error); setPhase("error"); };
    rec.onend = () => { if (phase === "listening") processTranscript(finalText); };
    rec.start();
    setPhase("listening");
    setTranscript("");
  }

  function handleStopBtn() { recognitionRef.current?.stop(); processTranscript(transcript); }

  async function processTranscript(text) {
    if (!text.trim()) return;
    setPhase("processing");
    try {
      const raw = await callAI(
        [{ role: "user", content: `Patient dictation:\n\n"${text}"` }],
        DICTATION_SYSTEM, 2000, "deepseek-r1"
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const merged = { ...existingPatient };
      for (const [k, v] of Object.entries(parsed)) {
        if (v !== "" && v !== null && v !== undefined) merged[k] = v;
      }
      if (merged.dob && !merged.age) merged.age = calcAge(merged.dob);
      merged.updated_at = new Date().toISOString();
      onFilled(merged);
      setPhase("done");
    } catch (e) {
      setErrorMsg("Processing failed: " + e.message);
      setPhase("error");
    }
  }

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Dictation Mode</p>
            <h2 className="text-base font-bold text-slate-800">{existingPatient.name || "New Patient"}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        {(phase === "idle" || phase === "listening") && (
          <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-100">
            <p className="text-sm font-semibold text-slate-700 mb-1">Tell me everything about this patient.</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Diagnosis, diet, fluids, meds, labs, prophylaxis ordered, consults placed, discharge plan, DME, social work — anything. Speak naturally.
            </p>
          </div>
        )}

        {phase === "idle" && (
          <button onClick={startListening} className="w-full bg-violet-600 text-white py-4 rounded-xl font-bold text-base hover:bg-violet-700 transition-colors flex items-center justify-center gap-3">
            <span className="text-2xl">🎙</span> Start Dictating
          </button>
        )}

        {phase === "listening" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <span className="text-red-500 animate-pulse text-xl">●</span>
              <div>
                <p className="text-sm font-bold text-red-700">Listening…</p>
                <p className="text-xs text-red-400">Auto-stops after 3s silence</p>
              </div>
            </div>
            {transcript && (
              <div className="bg-slate-50 rounded-xl p-3 max-h-36 overflow-y-auto">
                <p className="text-xs text-slate-600 leading-relaxed">{transcript}</p>
              </div>
            )}
            <button onClick={handleStopBtn} className="w-full border-2 border-slate-300 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50">
              ■ Done Talking
            </button>
          </div>
        )}

        {phase === "processing" && (
          <div className="bg-violet-50 rounded-xl p-6 text-center space-y-2">
            <p className="text-2xl animate-spin inline-block">⚙️</p>
            <p className="text-sm font-bold text-violet-700">Mapping to fields…</p>
            <p className="text-xs text-violet-400">Converting shorthand, filing checkboxes</p>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <p className="text-3xl mb-1">✓</p>
              <p className="text-sm font-bold text-emerald-700">Fields & checkboxes populated</p>
              <p className="text-xs text-emerald-500 mt-1">Review the card before saving</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setPhase("idle"); setTranscript(""); }} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50">
                Dictate More
              </button>
              <button onClick={onClose} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700">
                Done
              </button>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-sm font-bold text-red-700 mb-1">Something went wrong</p>
              <p className="text-xs text-red-500">{errorMsg}</p>
            </div>
            <button onClick={() => { setPhase("idle"); setErrorMsg(""); }} className="w-full border border-slate-200 text-slate-600 py-2.5 rounded-xl font-semibold text-sm">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SCAN MODAL ───────────────────────────────────────────────────────────────
function ScanModal({ onClose, onParsed }) {
  const [preview, setPreview] = useState(null);
  const [b64, setB64] = useState(null);
  const [mime, setMime] = useState("image/jpeg");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMime(file.type || "image/jpeg");
    setPreview(URL.createObjectURL(file));
    setB64(await toBase64(file));
    setError("");
  }

  async function runScan() {
    if (!b64) return;
    setScanning(true);
    setError("");
    try {
      const prompt = `You are a medical scribe reading a hospital patient census sheet or handwritten rounds list.
Extract EVERY patient visible. For each patient return a JSON object with these exact keys:
name, mrn, dob, room, md, admit_date, dx, age, consults, ht, wt, diet, activity, ivf, ivf_site,
meds, prn, allergies, neb_tx, code_status, precautions, hx, notes, labs, echo, cxr, io,
special_equipment, new_meds, new_concerns, pending_labs, pending_procedures, pending_consults,
plan_of_care, other, pain_reassessment, restraints, suicide_level, critical_results, pews, hrfe, home_meds.
Rules:
- Only what you can read. Leave fields "" if not visible.
- name: "Last, First Middle". room: e.g. "455-A". md: attending as shown.
- dob: MM/DD/YYYY. admit_date: as shown. age: calculate from DOB if not shown.
- Return ONLY a raw JSON array, no markdown, no backticks.`;

      const raw = await callAIVision([
        { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
        { type: "text", text: prompt }
      ], 4000);

      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No patients found. Try a clearer photo.");

      const patients = parsed.map(p => ({
        ...emptyPatient(),
        ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ""])),
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      onParsed(patients);
      onClose();
    } catch (e) {
      setError("Scan failed: " + e.message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">Scan Census Sheet</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Photo your ADT census — printed or handwritten. All patients extracted at once.</p>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        {!preview ? (
          <div onClick={() => fileRef.current.click()} className="border-2 border-dashed border-slate-200 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <span className="text-3xl mb-2">📷</span>
            <p className="text-sm font-semibold text-slate-600">Tap to take photo or upload</p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, HEIC</p>
          </div>
        ) : (
          <div className="relative">
            <img src={preview} alt="Census" className="w-full rounded-xl object-contain max-h-64" />
            <button onClick={() => { setPreview(null); setB64(null); setError(""); }} className="absolute top-2 right-2 bg-white rounded-full px-2 py-0.5 text-xs text-slate-600 shadow">Retake</button>
          </div>
        )}
        {error && <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 text-sm border border-slate-200 text-slate-600 py-2 rounded-lg hover:bg-slate-50 font-semibold">Cancel</button>
          <button onClick={runScan} disabled={!b64 || scanning} className="flex-1 text-sm bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-40">
            {scanning ? "Reading…" : "Extract Patients"}
          </button>
        </div>
        {scanning && <p className="text-center text-xs text-slate-400 mt-3 animate-pulse">Reading census…</p>}
      </div>
    </div>
  );
}

// ─── ORDERS SCAN MODAL ────────────────────────────────────────────────────────
function OrdersScanModal({ onClose, onMerged, existingPatient }) {
  const [preview, setPreview] = useState(null);
  const [b64, setB64] = useState(null);
  const [mime, setMime] = useState("image/jpeg");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMime(file.type || "image/jpeg");
    setPreview(URL.createObjectURL(file));
    setB64(await toBase64(file));
    setError("");
  }

  async function runScan() {
    if (!b64) return;
    setScanning(true);
    setError("");
    try {
      const prompt = `You are reading a CareVue (OpenVista/VistA) Active Orders screen screenshot from Guam Memorial Hospital.
Extract every piece of patient and order data visible and map it to these exact JSON keys.
Use standard clinical shorthand (NPO p MN, BID, TID, SQ, IV, PO, PRN, etc).

Keys to extract:
- name: patient name as shown (Last, First format)
- mrn: MRN/patient ID number
- dob: date of birth MM/DD/YYYY
- age: age as shown or calculated
- room: room/bed location (e.g. "RD34W1")
- md: attending provider name
- admit_date: admission date/time as shown
- dx: diagnosis from A/DT order or header
- code_status: from nursing orders (Full Code, DNR, etc)
- activity: from activity orders
- diet: from diet orders — include full diet name
- ivf: ALL infusion orders concatenated with semicolons — include drug, dose, rate, frequency, duration
- meds: ALL non-infusion medication orders (clinic orders, scheduled meds) concatenated with semicolons
- prn: PRN medications only
- allergies: if visible
- io: if intake/output order present, note "Routine I&O"
- neb_tx: any respiratory/nebulizer orders
- pending_labs: ALL lab orders concatenated (CBC, CHEM 7, CRP, etc) with collection times if shown
- pending_procedures: any procedure orders
- pending_consults: any consult orders
- notes: any nursing orders or special instructions not captured elsewhere
- new_meds: any new medication orders started today
- new_concerns: anything flagged as high alert, high risk, or requiring special attention

For checkbox fields — set to 1 (Ordered) if the order is active, 2 (Done) if completed:
cx_bowel_reg, cx_oral_care, cx_hob, cx_gi_prop, cx_sq_heparin, cx_enoxaparin,
cx_dvt_boots, cx_aspirin, cx_diet, cx_pt, cx_ot, cx_speech, cx_pharmacy

Leave all other keys as empty string "" or 0.
Return ONLY a raw JSON object (not array), no markdown, no backticks, no explanation.`;

      const raw = await callAIVision([
        { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
        { type: "text", text: prompt }
      ], 3000);

      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

      const merged = { ...existingPatient };
      const ORDER_FIELDS = [
        "diet","activity","ivf","ivf_site","meds","prn","code_status","io",
        "neb_tx","notes","new_meds","new_concerns","pending_labs",
        "pending_procedures","pending_consults",
        "cx_gi_prop","cx_sq_heparin","cx_enoxaparin","cx_dvt_boots","cx_aspirin",
        "cx_bowel_reg","cx_oral_care","cx_hob","cx_diet","cx_pt","cx_ot",
        "cx_speech","cx_pharmacy",
      ];
      const IDENTITY_FIELDS = ["name","mrn","dob","age","room","md","admit_date","dx","allergies"];

      for (const [k, v] of Object.entries(parsed)) {
        if (v === "" || v === null || v === undefined) continue;
        if (IDENTITY_FIELDS.includes(k)) {
          if (!merged[k]) merged[k] = v;
        } else if (ORDER_FIELDS.includes(k)) {
          merged[k] = v;
        }
      }
      merged.updated_at = new Date().toISOString();
      onMerged(merged);
      onClose();
    } catch (e) {
      setError("Scan failed: " + e.message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">CareVue Orders Scan</p>
            <h2 className="text-base font-bold text-slate-800">{existingPatient.name || "Patient"}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>

        <div className="bg-teal-50 rounded-xl p-3 mb-4 border border-teal-100">
          <p className="text-xs text-teal-700 font-semibold mb-0.5">Screenshot the Active Orders tab in CareVue</p>
          <p className="text-xs text-teal-500">Meds, IVF, diet, labs, nursing orders — all extracted and merged into this patient's card.</p>
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        {!preview ? (
          <div onClick={() => fileRef.current.click()} className="border-2 border-dashed border-teal-200 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors">
            <span className="text-3xl mb-2">🖥️</span>
            <p className="text-sm font-semibold text-slate-600">Screenshot or photo of CareVue orders</p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, HEIC</p>
          </div>
        ) : (
          <div className="relative">
            <img src={preview} alt="Orders preview" className="w-full rounded-xl object-contain max-h-64" />
            <button onClick={() => { setPreview(null); setB64(null); setError(""); }} className="absolute top-2 right-2 bg-white rounded-full px-2 py-0.5 text-xs text-slate-600 shadow">Retake</button>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 text-sm border border-slate-200 text-slate-600 py-2 rounded-lg hover:bg-slate-50 font-semibold">Cancel</button>
          <button onClick={runScan} disabled={!b64 || scanning} className="flex-1 text-sm bg-teal-600 text-white py-2 rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-40">
            {scanning ? "Reading orders…" : "Import Orders"}
          </button>
        </div>
        {scanning && <p className="text-center text-xs text-slate-400 mt-3 animate-pulse">Reading CareVue orders screen…</p>}
      </div>
    </div>
  );
}

// ─── FIELD ────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, wide, tall, placeholder, dim }) {
  const base = "bg-transparent border-b border-slate-300 focus:border-blue-600 outline-none text-slate-800 text-sm w-full transition-colors";
  return (
    <div className={`flex flex-col gap-0.5 ${wide ? "col-span-2" : ""} ${dim ? "opacity-50" : ""}`}>
      <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</label>
      {tall
        ? <textarea className={`${base} resize-none h-16 leading-snug pt-1`} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ""} />
        : <input className={`${base} h-7`} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ""} />
      }
    </div>
  );
}

function SectionHead({ children, color }) {
  const c = color || "text-blue-700 bg-blue-100";
  return (
    <div className="col-span-2 mt-4 mb-2 flex items-center gap-2">
      <span className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded ${c}`}>{children}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function CheckSection({ title, color, items, patient, onChange, notesKey, notesLabel }) {
  return (
    <div className="col-span-2">
      <SectionHead color={color}>{title}</SectionHead>
      <div className="bg-slate-50 rounded-xl px-3 py-1 mb-2">
        {items.map(([key, label]) => (
          <CheckItem key={key} label={label} value={patient[key]} onChange={v => onChange(key, v)} />
        ))}
      </div>
      <div className="col-span-2">
        <Field
          label={notesLabel || "Additional notes (dictate or type)"}
          value={patient[notesKey] || ""}
          onChange={v => onChange(notesKey, v)}
          wide tall
          placeholder="Anything not covered above…"
        />
      </div>
    </div>
  );
}

// ─── PATIENT CARD ─────────────────────────────────────────────────────────────
function PatientCard({ patient, onChange, onDelete, onDictate, onOrdersScan, index }) {
  const f = (key) => (val) => {
    onChange(key, val);
    if (key === "dob") onChange("age", calcAge(val));
  };

  const PROPHYLAXIS = [
    ["cx_gi_prop",    "GI Prophylaxis (PPI / H2 blocker)"],
    ["cx_sq_heparin", "SQ Heparin (DVT ppx)"],
    ["cx_enoxaparin", "Enoxaparin / LMWH"],
    ["cx_dvt_boots",  "DVT Boots / SCDs"],
    ["cx_aspirin",    "Aspirin / ASA"],
    ["cx_bowel_reg",  "Bowel Regimen"],
    ["cx_oral_care",  "Oral Care"],
    ["cx_hob",        "HOB Elevation ≥30°"],
    ["cx_foley_dc",   "Foley D/C"],
    ["cx_lines_dc",   "Lines / Tubes D/C"],
  ];

  const CONSULTS = [
    ["cx_pt",        "Physical Therapy (PT)"],
    ["cx_ot",        "Occupational Therapy (OT)"],
    ["cx_speech",    "Speech Therapy / Swallow"],
    ["cx_diet",      "Diet / Nutrition Consult"],
    ["cx_sw",        "Social Work (SW)"],
    ["cx_cm",        "Case Management (CM)"],
    ["cx_chaplain",  "Chaplain / Spiritual Care"],
    ["cx_wound",     "Wound Care"],
    ["cx_palliative","Palliative Care"],
    ["cx_pharmacy",  "Pharmacy / Med Rec"],
  ];

  const DISCHARGE = [
    ["cx_dme",        "DME Ordered"],
    ["cx_ssoc",       "SSOC / Community Services"],
    ["cx_home_health","Home Health (HH)"],
    ["cx_snf",        "SNF / Rehab Placement"],
    ["cx_fu_md",      "Follow-up MD Appt"],
    ["cx_pt_edu",     "Patient / Family Education"],
    ["cx_ins_auth",   "Insurance Authorization"],
    ["cx_transport",  "Transport Arranged"],
    ["cx_rx_dc",      "DC Prescriptions"],
    ["cx_dc_summary", "DC Summary"],
  ];

  return (
    <div className="patient-card bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-6 print:shadow-none print:border print:rounded-none print:mb-0 print:break-inside-avoid">
      <div className="flex items-center justify-between mb-3 print:hidden">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Patient {index + 1}</span>
        <div className="flex items-center gap-2">
          <button onClick={onOrdersScan} className="flex items-center gap-1.5 text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-teal-700 transition-colors">
            🖥️ Scan Orders
          </button>
          <button onClick={onDictate} className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-violet-700 transition-colors">
            🎙 Dictate
          </button>
          <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">

        <SectionHead>Patient Info</SectionHead>
        <Field label="Room #" value={patient.room} onChange={f("room")} placeholder="455-A" />
        <Field label="Name" value={patient.name} onChange={f("name")} placeholder="Last, First Middle" />
        <Field label="MRN" value={patient.mrn} onChange={f("mrn")} placeholder="2102205" />
        <Field label="DOB" value={patient.dob} onChange={f("dob")} placeholder="MM/DD/YYYY" />
        <Field label="Age (auto)" value={patient.age} onChange={f("age")} placeholder="16yo" dim={!!patient.dob} />
        <Field label="Attending / MD" value={patient.md} onChange={f("md")} placeholder="Agyeman, Akua" />
        <Field label="Admit Date" value={patient.admit_date} onChange={f("admit_date")} placeholder="06/27/2026 18:31" />
        <Field label="Consults" value={patient.consults} onChange={f("consults")} placeholder="Shay, ALG" />
        <Field label="HT" value={patient.ht} onChange={f("ht")} placeholder='63.78"' />
        <Field label="WT" value={patient.wt} onChange={f("wt")} placeholder="56.1 kg" />
        <Field label="Dx" value={patient.dx} onChange={f("dx")} wide placeholder="pneumothorax R/F/C/ RVP (−)" />
        <Field label="Parent / Guardian" value={patient.parent_guardian} onChange={f("parent_guardian")} wide />

        <SectionHead>History</SectionHead>
        <Field label="Hx" value={patient.hx} onChange={f("hx")} wide tall />

        <SectionHead>Diet / Orders</SectionHead>
        <Field label="Diet" value={patient.diet} onChange={f("diet")} placeholder="DFA, NPO p MN" />
        <Field label="Activity" value={patient.activity} onChange={f("activity")} placeholder="CTABL" />
        <Field label="IVF" value={patient.ivf} onChange={f("ivf")} placeholder="D5NS @100ml/hr" />
        <Field label="IV Site" value={patient.ivf_site} onChange={f("ivf_site")} placeholder="RAC 20G" />
        <Field label="Meds" value={patient.meds} onChange={f("meds")} wide />
        <Field label="PRN" value={patient.prn} onChange={f("prn")} placeholder="tyl, mot" />
        <Field label="Allergies" value={patient.allergies} onChange={f("allergies")} placeholder="NKA" />
        <Field label="Neb Tx" value={patient.neb_tx} onChange={f("neb_tx")} placeholder="IS" />
        <Field label="Code Status" value={patient.code_status} onChange={f("code_status")} />
        <Field label="Precautions" value={patient.precautions} onChange={f("precautions")} />

        <SectionHead>Notes</SectionHead>
        <Field label="Notes" value={patient.notes} onChange={f("notes")} wide tall />

        <SectionHead>Assessment & Plan</SectionHead>
        <Field label="Labs" value={patient.labs} onChange={f("labs")} wide tall />
        <Field label="Echo" value={patient.echo} onChange={f("echo")} />
        <Field label="CXR" value={patient.cxr} onChange={f("cxr")} />
        <Field label="I&O" value={patient.io} onChange={f("io")} wide />
        <Field label="Special Needs / Equipment" value={patient.special_equipment} onChange={f("special_equipment")} wide />
        <Field label="New Meds" value={patient.new_meds} onChange={f("new_meds")} wide />
        <Field label="New Concerns" value={patient.new_concerns} onChange={f("new_concerns")} wide />

        <SectionHead>Pending</SectionHead>
        <Field label="Pending Labs" value={patient.pending_labs} onChange={f("pending_labs")} wide />
        <Field label="Pending Procedures" value={patient.pending_procedures} onChange={f("pending_procedures")} wide />
        <Field label="Pending Consults" value={patient.pending_consults} onChange={f("pending_consults")} wide />
        <Field label="Plan of Care / Goals" value={patient.plan_of_care} onChange={f("plan_of_care")} wide tall />
        <Field label="Other" value={patient.other} onChange={f("other")} wide />

        <CheckSection
          title="Medicine Prophylaxis"
          color="text-orange-700 bg-orange-100"
          items={PROPHYLAXIS}
          patient={patient}
          onChange={f}
          notesKey="prophylaxis_notes"
          notesLabel="Additional prophylaxis / bundles (dictate or type)"
        />

        <CheckSection
          title="Service Consults"
          color="text-blue-700 bg-blue-100"
          items={CONSULTS}
          patient={patient}
          onChange={f}
          notesKey="consult_notes"
          notesLabel="Additional consults / notes (dictate or type)"
        />

        <SectionHead color="text-emerald-700 bg-emerald-100">Discharge Planning</SectionHead>
        <Field label="Target Disposition" value={patient.dc_target_dispo} onChange={f("dc_target_dispo")} wide placeholder="Home / SNF / LTAC / Hospice / AMA…" />
        <div className="col-span-2 bg-slate-50 rounded-xl px-3 py-1 mb-2">
          {DISCHARGE.map(([key, label]) => (
            <CheckItem key={key} label={label} value={patient[key]} onChange={v => f(key)(v)} />
          ))}
        </div>
        <Field label="Discharge notes (dictate or type)" value={patient.dc_notes} onChange={f("dc_notes")} wide tall placeholder="Barriers to discharge, family meeting needed, court ordered, APS…" />

        <SectionHead>Nursing Checks</SectionHead>
        <Field label="Pain Reassessment" value={patient.pain_reassessment} onChange={f("pain_reassessment")} />
        <Field label="Restraints" value={patient.restraints} onChange={f("restraints")} />
        <Field label="Suicide Level" value={patient.suicide_level} onChange={f("suicide_level")} />
        <Field label="Critical Test / Results" value={patient.critical_results} onChange={f("critical_results")} />
        <Field label="PEWS" value={patient.pews} onChange={f("pews")} />
        <Field label="HRFE" value={patient.hrfe} onChange={f("hrfe")} />
        <Field label="Home Meds Pending" value={patient.home_meds} onChange={f("home_meds")} wide />
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function WardList() {
  const [patients, setPatients] = useState([emptyPatient()]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [printPer, setPrintPer] = useState(1);
  const [tab, setTab] = useState("rounds");
  const [saved, setSaved] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [showScan, setShowScan] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [dictatingIdx, setDictatingIdx] = useState(null);
  const [ordersScanIdx, setOrdersScanIdx] = useState(null);

  useEffect(() => { loadSaved(); }, []);

  async function loadSaved() {
    setLoading(true); setLoadError("");
    try { setSaved(await supabase.fetchAll("rounds_patients") || []); }
    catch (e) { setLoadError("Could not connect to database."); }
    finally { setLoading(false); }
  }

  const updatePatient = useCallback((idx, key, val) => {
    setPatients(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val, updated_at: new Date().toISOString() };
      return next;
    });
  }, []);

  function applyDictation(idx, filled) {
    setPatients(prev => { const n = [...prev]; n[idx] = filled; return n; });
  }

  function applyOrdersScan(idx, merged) {
    setPatients(prev => { const n = [...prev]; n[idx] = merged; return n; });
  }

  function addPatient() { setPatients(p => [...p, emptyPatient()]); }
  function removePatient(idx) { setPatients(p => p.filter((_, i) => i !== idx)); }

  function handleParsed(extracted) {
    setPatients(extracted);
    setScanMsg(`✓ ${extracted.length} patient${extracted.length !== 1 ? "s" : ""} loaded from census`);
    setTimeout(() => setScanMsg(""), 5000);
  }

  async function saveAll() {
    setSaving(true); setSaveMsg("");
    try {
      for (const pt of patients) await supabase.upsert("rounds_patients", pt);
      setSaveMsg(`Saved ${patients.length} patient(s) ✓`);
      await loadSaved();
    } catch (e) { setSaveMsg("Save failed — " + e.message); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(""), 4000); }
  }

  async function deleteRecord(id) {
    if (!confirm("Delete this patient record?")) return;
    try { await supabase.delete("rounds_patients", id); await loadSaved(); }
    catch (e) { alert("Delete failed: " + e.message); }
  }

  function loadIntoForm(row) { setPatients([row]); setTab("rounds"); }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        @media print {
          body { margin: 0; background: white; }
          .no-print { display: none !important; }
          .patient-card { page-break-inside: avoid; break-inside: avoid; border: 1px solid #ccc !important; border-radius: 0 !important; box-shadow: none !important; margin-bottom: 0 !important; }
        }
        .print-1 .patient-card { page-break-after: always; break-after: page; }
        .print-2 .patient-card:nth-child(2n) { page-break-after: always; break-after: page; }
        .print-4 .patient-card:nth-child(4n) { page-break-after: always; break-after: page; }
        .print-4 .patient-card { font-size: 10px; padding: 8px !important; }
        .print-4 textarea { height: 40px !important; }
      `}</style>

      {showScan && <ScanModal onClose={() => setShowScan(false)} onParsed={handleParsed} />}
      {dictatingIdx !== null && (
        <DictationModal
          existingPatient={patients[dictatingIdx]}
          onClose={() => setDictatingIdx(null)}
          onFilled={filled => applyDictation(dictatingIdx, filled)}
        />
      )}
      {ordersScanIdx !== null && (
        <OrdersScanModal
          existingPatient={patients[ordersScanIdx]}
          onClose={() => setOrdersScanIdx(null)}
          onMerged={merged => applyOrdersScan(ordersScanIdx, merged)}
        />
      )}

      <div className="min-h-screen bg-slate-50">
        <header className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">GMH Hospitalist</p>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">WardList</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setTab("rounds")} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${tab === "rounds" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>Today's List</button>
              <button onClick={() => { setTab("saved"); loadSaved(); }} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${tab === "saved" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>Saved</button>
            </div>
          </div>
        </header>

        {tab === "rounds" && (
          <main className={`max-w-3xl mx-auto px-4 py-6 print-${printPer}`}>
            <div className="no-print flex flex-wrap items-center gap-3 mb-4">
              <button onClick={() => setShowScan(true)} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-1.5">📷 Scan Census</button>
              <button onClick={addPatient} className="text-sm border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-50">+ Add Patient</button>
              <button onClick={saveAll} disabled={saving} className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50">
                {saving ? "Saving…" : "Save All"}
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-500 font-medium">Print:</span>
                {[1,2,4].map(n => (
                  <button key={n} onClick={() => setPrintPer(n)} className={`text-xs px-2.5 py-1 rounded font-semibold border transition-colors ${printPer === n ? "bg-slate-700 text-white border-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}>{n}/pg</button>
                ))}
                <button onClick={() => window.print()} className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-800">🖨 Print</button>
              </div>
            </div>

            {scanMsg && <div className="no-print text-sm px-4 py-2 rounded-lg mb-4 font-medium bg-blue-50 text-blue-700">{scanMsg}</div>}
            {saveMsg && <div className={`no-print text-sm px-4 py-2 rounded-lg mb-4 font-medium ${saveMsg.includes("failed") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{saveMsg}</div>}

            {patients.map((pt, idx) => (
              <PatientCard key={pt.id} patient={pt} index={idx}
                onChange={(key, val) => updatePatient(idx, key, val)}
                onDelete={() => removePatient(idx)}
                onDictate={() => setDictatingIdx(idx)}
                onOrdersScan={() => setOrdersScanIdx(idx)}
              />
            ))}

            <div className="no-print text-center mt-4">
              <button onClick={addPatient} className="text-sm text-blue-600 hover:text-blue-800 font-semibold">+ Add another patient</button>
            </div>
          </main>
        )}

        {tab === "saved" && (
          <main className="max-w-3xl mx-auto px-4 py-6 no-print">
            <h2 className="text-base font-bold text-slate-700 mb-4">Saved Patient Records</h2>
            {loadError && <div className="text-sm px-4 py-3 bg-amber-50 text-amber-700 rounded-lg mb-4">{loadError}</div>}
            {loading && <p className="text-sm text-slate-400">Loading…</p>}
            {!loading && saved.length === 0 && !loadError && <p className="text-sm text-slate-400">No saved records yet.</p>}
            {!loading && saved.map(row => (
              <div key={row.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-3 flex items-center justify-between shadow-sm">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{row.name || "—"}</p>
                  <p className="text-xs text-slate-400">MRN {row.mrn || "—"} · Room {row.room || "—"} · {row.dx || "—"}</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">Saved {new Date(row.updated_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => loadIntoForm(row)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700">Load</button>
                  <button onClick={() => deleteRecord(row.id)} className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100">Delete</button>
                </div>
              </div>
            ))}
          </main>
        )}
      </div>
    </>
  );
}
