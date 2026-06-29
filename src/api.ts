import type { Patient } from './types'

const API_URL = 'https://wardlist-api.agyemanenterprises.com'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.ih6BQnrvMKzs5kfX9uOvvKSLWtK-i_WBwdaxAopNbWk'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

export async function upsertPatients(patients: Patient[]): Promise<Patient[]> {
  return request<Patient[]>('/rounds_patients', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(patients),
  })
}

export async function fetchSavedPatients(): Promise<Patient[]> {
  return request<Patient[]>('/rounds_patients?order=updated_at.desc')
}

export async function deletePatient(id: string): Promise<void> {
  await request(`/rounds_patients?id=eq.${id}`, { method: 'DELETE' })
}
