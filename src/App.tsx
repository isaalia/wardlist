import { useState, useEffect, useCallback } from 'react'
import type { Patient } from './types'
import { EMPTY_PATIENT } from './types'
import { upsertPatients, fetchSavedPatients, deletePatient } from './api'

type View = 'rounds' | 'saved'
type PrintLayout = 1 | 2 | 4

export default function App() {
  const [view, setView] = useState<View>('rounds')
  const [patients, setPatients] = useState<Patient[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Saved view state
  const [savedPatients, setSavedPatients] = useState<Patient[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Print layout
  const [printLayout, setPrintLayout] = useState<PrintLayout>(1)

  // Scan census modal
  const [showScanModal, setShowScanModal] = useState(false)

  // Dictation modal
  const [dictateIndex, setDictateIndex] = useState<number | null>(null)

  // Orders scan modal
  const [ordersScanIndex, setOrdersScanIndex] = useState<number | null>(null)

  const addPatient = useCallback(() => {
    const newPatient: Patient = {
      ...EMPTY_PATIENT,
      id: crypto.randomUUID(),
    }
    setPatients(prev => [...prev, newPatient])
  }, [])

  const updatePatient = useCallback((index: number, updates: Partial<Patient>) => {
    setPatients(prev => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)))
  }, [])

  const removePatient = useCallback((index: number) => {
    setPatients(prev => prev.filter((_, i) => i !== index))
  }, [])

  const saveAll = useCallback(async () => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const saved = await upsertPatients(patients)
      setMessage(`Saved ${saved.length} patient(s) successfully`)
      setPatients([])
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }, [patients])

  const loadSaved = useCallback(async () => {
    setLoadingSaved(true)
    setSavedMessage('')
    try {
      const data = await fetchSavedPatients()
      setSavedPatients(data)
    } catch (err) {
      setSavedMessage(`Failed to load records: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoadingSaved(false)
    }
  }, [])

  const loadPatientToRounds = useCallback((patient: Patient) => {
    setPatients(prev => [...prev, { ...patient }])
    setView('rounds')
  }, [])

  const handleDeleteSaved = useCallback(async (id: string) => {
    try {
      await deletePatient(id)
      setSavedPatients(prev => prev.filter(p => p.id !== id))
      setConfirmDeleteId(null)
    } catch (err) {
      setSavedMessage(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  // Load saved when switching to saved view
  useEffect(() => {
    if (view === 'saved') {
      loadSaved()
    }
  }, [view, loadSaved])

  // Clear messages after timeout
  useEffect(() => {
    if (message || error || savedMessage) {
      const t = setTimeout(() => {
        setMessage('')
        setError('')
        setSavedMessage('')
      }, 4000)
      return () => clearTimeout(t)
    }
  }, [message, error, savedMessage])

  // Print handler
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
              GMH Hospitalist
            </p>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">
              WardList
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('rounds')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                view === 'rounds'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Today's List
            </button>
            <button
              onClick={() => { setView('saved'); loadSaved() }}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                view === 'saved'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Saved
            </button>
          </div>
        </div>
      </header>

      {view === 'rounds' && (
        <main className={`max-w-3xl mx-auto px-4 py-6 print-${printLayout}`}>
          <div className="no-print flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={() => setShowScanModal(true)}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-1.5"
            >
              📷 Scan Census
            </button>
            <button
              onClick={addPatient}
              className="text-sm border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-50"
            >
              + Add Patient
            </button>
            <button
              onClick={saveAll}
              disabled={saving || patients.length === 0}
              className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save All'}
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-500 font-medium">Print:</span>
              {([1, 2, 4] as PrintLayout[]).map(layout => (
                <button
                  key={layout}
                  onClick={() => setPrintLayout(layout)}
                  className={`text-xs px-2.5 py-1 rounded font-semibold border transition-colors ${
                    printLayout === layout
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {layout}/pg
                </button>
              ))}
              <button
                onClick={handlePrint}
                className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-800"
              >
                🖨 Print
              </button>
            </div>
          </div>

          {message && (
            <div className="no-print text-sm px-4 py-2 rounded-lg mb-4 font-medium bg-emerald-50 text-emerald-700">
              {message}
            </div>
          )}
          {error && (
            <div className="no-print text-sm px-4 py-2 rounded-lg mb-4 font-medium bg-red-50 text-red-700">
              {error}
            </div>
          )}

          {patients.map((patient, index) => (
            <PatientCard
              key={patient.id || index}
              patient={patient}
              index={index}
              onChange={(updates) => updatePatient(index, updates)}
              onDelete={() => removePatient(index)}
              onDictate={() => setDictateIndex(index)}
              onOrdersScan={() => setOrdersScanIndex(index)}
            />
          ))}

          <div className="no-print text-center mt-4">
            <button
              onClick={addPatient}
              className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
            >
              + Add another patient
            </button>
          </div>
        </main>
      )}

      {view === 'saved' && (
        <main className="max-w-3xl mx-auto px-4 py-6 no-print">
          <h2 className="text-base font-bold text-slate-700 mb-4">
            Saved Patient Records
          </h2>

          {savedMessage && (
            <div className="text-sm px-4 py-3 bg-amber-50 text-amber-700 rounded-lg mb-4">
              {savedMessage}
            </div>
          )}

          {loadingSaved && (
            <p className="text-sm text-slate-400">Loading…</p>
          )}

          {!loadingSaved && savedPatients.length === 0 && !savedMessage && (
            <p className="text-sm text-slate-400">No saved records yet.</p>
          )}

          {!loadingSaved && savedPatients.map(p => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-xl p-4 mb-3 flex items-center justify-between shadow-sm"
            >
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  {p.name || '—'}
                </p>
                <p className="text-xs text-slate-400">
                  MRN {p.mrn || '—'} · Room {p.room || '—'} · {p.dx || '—'}
                </p>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Saved {p.updated_at ? new Date(p.updated_at).toLocaleString() : ''}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => loadPatientToRounds(p)}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Load
                </button>
                {confirmDeleteId === p.id ? (
                  <>
                    <button
                      onClick={() => handleDeleteSaved(p.id!)}
                      className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(p.id!)}
                    className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </main>
      )}

      {/* Scan Modal */}
      {showScanModal && (
        <ScanModal
          onClose={() => setShowScanModal(false)}
          onParsed={(parsedPatients) => {
            setPatients(prev => [...prev, ...parsedPatients])
            setShowScanModal(false)
          }}
        />
      )}

      {/* Dictation Modal */}
      {dictateIndex !== null && (
        <DictationModal
          existingPatient={patients[dictateIndex]}
          onClose={() => setDictateIndex(null)}
          onFilled={(updates) => {
            updatePatient(dictateIndex, updates)
            setDictateIndex(null)
          }}
        />
      )}

      {/* Orders Scan Modal */}
      {ordersScanIndex !== null && (
        <OrdersScanModal
          existingPatient={patients[ordersScanIndex]}
          onClose={() => setOrdersScanIndex(null)}
          onMerged={(updates) => {
            updatePatient(ordersScanIndex, updates)
            setOrdersScanIndex(null)
          }}
        />
      )}
    </div>
  )
}

// ---- Patient Card Component ----

interface PatientCardProps {
  patient: Patient
  index: number
  onChange: (updates: Partial<Patient>) => void
  onDelete: () => void
  onDictate: () => void
  onOrdersScan: () => void
}

const SECTION_LABELS: Record<string, string> = {
  demographics: 'Demographics',
  history: 'History & Orders',
  consults: 'Consults & Therapy',
  discharge: 'Discharge Planning',
  safety: 'Safety & QI',
}

type FieldDef = {
  key: keyof Patient
  label: string
  section: string
  rows?: number
}

const FIELDS: FieldDef[] = [
  // Demographics
  { key: 'room', label: 'Room', section: 'demographics' },
  { key: 'name', label: 'Name', section: 'demographics' },
  { key: 'mrn', label: 'MRN', section: 'demographics' },
  { key: 'dob', label: 'DOB', section: 'demographics' },
  { key: 'age', label: 'Age', section: 'demographics' },
  { key: 'admit_date', label: 'Admit Date', section: 'demographics' },
  { key: 'ht', label: 'Ht', section: 'demographics' },
  { key: 'wt', label: 'Wt', section: 'demographics' },
  { key: 'dx', label: 'Dx', section: 'demographics' },
  { key: 'md', label: 'MD', section: 'demographics' },
  { key: 'parent_guardian', label: 'Parent/Guardian', section: 'demographics' },
  { key: 'code_status', label: 'Code Status', section: 'demographics' },
  { key: 'precautions', label: 'Precautions', section: 'demographics' },

  // History & Orders
  { key: 'hx', label: 'Hx', section: 'history', rows: 3 },
  { key: 'diet', label: 'Diet', section: 'history' },
  { key: 'activity', label: 'Activity', section: 'history' },
  { key: 'ivf', label: 'IVF', section: 'history', rows: 2 },
  { key: 'ivf_site', label: 'IVF Site', section: 'history' },
  { key: 'meds', label: 'Meds', section: 'history', rows: 3 },
  { key: 'prn', label: 'PRN', section: 'history', rows: 2 },
  { key: 'allergies', label: 'Allergies', section: 'history', rows: 2 },
  { key: 'neb_tx', label: 'Neb Tx', section: 'history' },
  { key: 'labs', label: 'Labs', section: 'history', rows: 3 },
  { key: 'io', label: 'I/O', section: 'history', rows: 2 },
  { key: 'notes', label: 'Notes', section: 'history', rows: 3 },
  { key: 'echo', label: 'Echo', section: 'history', rows: 2 },
  { key: 'cxr', label: 'CXR', section: 'history', rows: 2 },
  { key: 'new_meds', label: 'New Meds', section: 'history', rows: 2 },
  { key: 'new_concerns', label: 'New Concerns', section: 'history', rows: 2 },
  { key: 'pending_labs', label: 'Pending Labs', section: 'history', rows: 2 },
  { key: 'pending_procedures', label: 'Pending Procedures', section: 'history', rows: 2 },
  { key: 'pending_consults', label: 'Pending Consults', section: 'history', rows: 2 },
  { key: 'plan_of_care', label: 'Plan of Care', section: 'history', rows: 3 },
  { key: 'other', label: 'Other', section: 'history', rows: 2 },
  { key: 'special_equipment', label: 'Special Equipment', section: 'history', rows: 2 },
  { key: 'consults', label: 'Consults', section: 'consults', rows: 2 },

  // Safety & QI
  { key: 'pain_reassessment', label: 'Pain Reassessment', section: 'safety' },
  { key: 'restraints', label: 'Restraints', section: 'safety' },
  { key: 'suicide_level', label: 'Suicide Level', section: 'safety' },
  { key: 'critical_results', label: 'Critical Results', section: 'safety' },
  { key: 'pews', label: 'PEWS', section: 'safety' },
  { key: 'hrfe', label: 'HRFE', section: 'safety' },
  { key: 'home_meds', label: 'Home Meds', section: 'safety' },

  // Prophylaxis
  { key: 'cx_gi_prop', label: 'GI Prophylaxis', section: 'safety' },
  { key: 'cx_sq_heparin', label: 'SQ Heparin', section: 'safety' },
  { key: 'cx_enoxaparin', label: 'Enoxaparin', section: 'safety' },
  { key: 'cx_dvt_boots', label: 'DVT Boots', section: 'safety' },
  { key: 'cx_aspirin', label: 'Aspirin', section: 'safety' },
  { key: 'cx_bowel_reg', label: 'Bowel Reg', section: 'safety' },
  { key: 'cx_oral_care', label: 'Oral Care', section: 'safety' },
  { key: 'cx_hob', label: 'HOB', section: 'safety' },
  { key: 'cx_foley_dc', label: 'Foley DC', section: 'safety' },
  { key: 'cx_lines_dc', label: 'Lines DC', section: 'safety' },
  { key: 'prophylaxis_notes', label: 'Prophylaxis Notes', section: 'safety', rows: 2 },

  // Consults & Therapy
  { key: 'cx_pt', label: 'PT', section: 'consults' },
  { key: 'cx_ot', label: 'OT', section: 'consults' },
  { key: 'cx_speech', label: 'Speech', section: 'consults' },
  { key: 'cx_diet', label: 'Dietary', section: 'consults' },
  { key: 'cx_sw', label: 'SW', section: 'consults' },
  { key: 'cx_cm', label: 'CM', section: 'consults' },
  { key: 'cx_chaplain', label: 'Chaplain', section: 'consults' },
  { key: 'cx_wound', label: 'Wound Care', section: 'consults' },
  { key: 'cx_palliative', label: 'Palliative', section: 'consults' },
  { key: 'cx_pharmacy', label: 'Pharmacy', section: 'consults' },
  { key: 'consult_notes', label: 'Consult Notes', section: 'consults', rows: 2 },

  // Discharge Planning
  { key: 'dc_target_dispo', label: 'Target Dispo', section: 'discharge' },
  { key: 'cx_dme', label: 'DME', section: 'discharge' },
  { key: 'cx_ssoc', label: 'SSOC', section: 'discharge' },
  { key: 'cx_home_health', label: 'Home Health', section: 'discharge' },
  { key: 'cx_snf', label: 'SNF', section: 'discharge' },
  { key: 'cx_fu_md', label: 'F/U MD', section: 'discharge' },
  { key: 'cx_pt_edu', label: 'PT/Ed', section: 'discharge' },
  { key: 'cx_ins_auth', label: 'Ins Auth', section: 'discharge' },
  { key: 'cx_transport', label: 'Transport', section: 'discharge' },
  { key: 'cx_rx_dc', label: 'Rx DC', section: 'discharge' },
  { key: 'cx_dc_summary', label: 'DC Summary', section: 'discharge', rows: 2 },
  { key: 'dc_notes', label: 'DC Notes', section: 'discharge', rows: 2 },
]

function PatientCard({ patient, index, onChange, onDelete, onDictate, onOrdersScan }: PatientCardProps) {
  const grouped = FIELDS.reduce<Record<string, FieldDef[]>>((acc, field) => {
    if (!acc[field.section]) acc[field.section] = []
    acc[field.section].push(field)
    return acc
  }, {})

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
      <div className="no-print flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Patient {index + 1}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onDictate}
            className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-purple-100"
            title="Dictate notes"
          >
            🎙 Dictate
          </button>
          <button
            onClick={onOrdersScan}
            className="text-xs bg-cyan-50 text-cyan-600 px-2.5 py-1 rounded-lg font-semibold hover:bg-cyan-100"
            title="Scan orders"
          >
            📄 Orders
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-600 font-semibold"
          >
            ✕
          </button>
        </div>
      </div>

      {Object.entries(grouped).map(([section, fields]) => (
        <div key={section} className="mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            {SECTION_LABELS[section] || section}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {fields.map(field => (
              <div key={field.key}>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-0.5">
                  {field.label}
                </label>
                <textarea
                  value={patient[field.key] || ''}
                  onChange={(e) => onChange({ [field.key]: e.target.value })}
                  rows={field.rows || 1}
                  className="w-full text-sm border border-slate-200 rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none print:border-0 print:p-0 print:focus:ring-0 print:resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Scan Census Modal ----

interface ScanModalProps {
  onClose: () => void
  onParsed: (patients: Patient[]) => void
}

function ScanModal({ onClose, onParsed }: ScanModalProps) {
  const [text, setText] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleParse = () => {
    setProcessing(true)
    try {
      // Simple parser — split by blank lines, each block = one patient
      const blocks = text.split(/\n\s*\n/).filter(b => b.trim())
      const parsed: Patient[] = blocks.map(block => {
        const lines = block.split('\n').filter(l => l.trim())
        const p = { ...EMPTY_PATIENT, id: crypto.randomUUID() }
        // First line = name, MRN, room
        const first = lines[0] || ''
        const nameMatch = first.match(/^([A-Za-z\s-]+)/)
        if (nameMatch) p.name = nameMatch[1].trim()
        const mrnMatch = first.match(/MRN[:\s]*(\S+)/i)
        if (mrnMatch) p.mrn = mrnMatch[1]
        const roomMatch = first.match(/Room[:\s]*(\S+)/i)
        if (roomMatch) p.room = roomMatch[1]
        // Subsequent lines: key: value
        lines.slice(1).forEach(line => {
          const sep = line.indexOf(':')
          if (sep > 0) {
            const key = line.slice(0, sep).trim().toLowerCase().replace(/[^a-z_]/g, '')
            const val = line.slice(sep + 1).trim()
            if (key && val && key in p) {
              (p as Record<string, string>)[key] = val
            }
          }
        })
        return p as Patient
      })
      onParsed(parsed)
    } catch (err) {
      console.error('Parse error:', err)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">Scan Census</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Paste census text below. Blank lines separate patients.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          placeholder="John Doe, MRN: 12345, Room: 301&#10;Dx: Pneumonia&#10;MD: Dr. Smith&#10;&#10;Jane Smith, MRN: 12346, Room: 302&#10;Dx: Asthma&#10;MD: Dr. Jones"
        />
        <button
          onClick={handleParse}
          disabled={processing || !text.trim()}
          className="mt-3 w-full text-sm bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {processing ? 'Parsing…' : 'Parse & Add'}
        </button>
      </div>
    </div>
  )
}

// ---- Dictation Modal ----

interface DictationModalProps {
  existingPatient: Patient
  onClose: () => void
  onFilled: (updates: Partial<Patient>) => void
}

function DictationModal({ existingPatient, onClose, onFilled }: DictationModalProps) {
  const [transcript, setTranscript] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleFill = () => {
    setProcessing(true)
    try {
      const updates: Record<string, string> = {}
      const lines = transcript.split('\n').filter(l => l.trim())
      lines.forEach(line => {
        const sep = line.indexOf(':')
        if (sep > 0) {
          const key = line.slice(0, sep).trim().toLowerCase().replace(/[^a-z_]/g, '')
          const val = line.slice(sep + 1).trim()
          if (key && val && key in existingPatient) {
            updates[key] = val
          }
        }
      })
      onFilled(updates as Partial<Patient>)
    } catch (err) {
      console.error('Dictation parse error:', err)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">🎙 Dictate Notes</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Paste dictated text in &ldquo;Field: value&rdquo; format, one per line.
        </p>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={8}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          placeholder="Hx: 2-day history of fever and cough&#10;Plan: Continue IV antibiotics&#10;Labs: BMP, CBC in AM"
        />
        <button
          onClick={handleFill}
          disabled={processing || !transcript.trim()}
          className="mt-3 w-full text-sm bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
        >
          {processing ? 'Processing…' : 'Fill Fields'}
        </button>
      </div>
    </div>
  )
}

// ---- Orders Scan Modal ----

interface OrdersScanModalProps {
  existingPatient: Patient
  onClose: () => void
  onMerged: (updates: Partial<Patient>) => void
}

function OrdersScanModal({ existingPatient, onClose, onMerged }: OrdersScanModalProps) {
  const [ordersText, setOrdersText] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleMerge = () => {
    setProcessing(true)
    try {
      const updates: Record<string, string> = {}
      const lines = ordersText.split('\n').filter(l => l.trim())
      lines.forEach(line => {
        const sep = line.indexOf(':')
        if (sep > 0) {
          const key = line.slice(0, sep).trim().toLowerCase().replace(/[^a-z_]/g, '')
          const val = line.slice(sep + 1).trim()
          if (key && val && key in existingPatient) {
            updates[key] = val
          }
        }
      })
      onMerged(updates as Partial<Patient>)
    } catch (err) {
      console.error('Orders parse error:', err)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">📄 Scan Orders</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Paste orders in &ldquo;Field: value&rdquo; format.
        </p>
        <textarea
          value={ordersText}
          onChange={(e) => setOrdersText(e.target.value)}
          rows={8}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          placeholder="cx_gi_prop: Pantoprazole 40mg daily&#10;cx_sq_heparin: 5000 units BID&#10;cx_dvt_boots: Sequential compression"
        />
        <button
          onClick={handleMerge}
          disabled={processing || !ordersText.trim()}
          className="mt-3 w-full text-sm bg-cyan-600 text-white py-2 rounded-lg font-semibold hover:bg-cyan-700 disabled:opacity-50"
        >
          {processing ? 'Processing…' : 'Merge Orders'}
        </button>
      </div>
    </div>
  )
}
