import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://tjsofkrfqskrtnpjltf.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqc29ma3JmcXNrcnRucGpsdGYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0OTg5NjI0MSwiZXhwIjoyMDY1NDcyMjQxfQ.u3Xy72zdp8o-rEdI3EqIM2nY46n-PMlShwp64VcFwtA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── CUSTOM AUTH — name + password, no email ──────────────────
// Local fallback users — used if Supabase is unreachable
const LOCAL_USERS = [
  { id:'u0', name:'Yorick',    password:'Yorick2017', role:'general_manager', avatar:'YZ', status:'active' },
  { id:'u1', name:'Leandre',   password:'Yorick2017', role:'general_manager', avatar:'LV', status:'active' },
  { id:'u2', name:'Nokulunga', password:'Yorick2017', role:'administrator',   avatar:'NN', status:'active' },
  { id:'u3', name:'Tevin',     password:'Yorick2017', role:'administrator',   avatar:'TN', status:'active' },
  { id:'u4', name:'Sesi',      password:'Yorick2017', role:'administrator',   avatar:'SP', status:'active' },
  { id:'u5', name:'Daleen',    password:'Yorick2017', role:'billing_admin',   avatar:'DT', status:'active' },
  { id:'u6', name:'Mahlatse',  password:'Yorick2017', role:'administrator',   avatar:'MM', status:'active' },
  { id:'u7', name:'Ithasia',   password:'Yorick2017', role:'billing_admin',   avatar:'IT', status:'active' },
]

export async function signInWithName(name, password) {
  const nameTrimmed = name.trim()
  const passTrimmed = password.trim()

  // Always check local users first — fast and reliable
  const local = LOCAL_USERS.find(u =>
    u.name.toLowerCase() === nameTrimmed.toLowerCase() &&
    u.password === passTrimmed &&
    u.status === 'active'
  )
  if (local) return local

  // Try Supabase as secondary source
  try {
    const { data, error } = await supabase
      .from('portal_users')
      .select('*')
      .ilike('name', nameTrimmed)
      .eq('status', 'active')
      .single()

    if (!error && data && data.password === passTrimmed) return data
  } catch (e) {
    // Supabase unreachable — already checked local above
  }

  throw new Error('Incorrect name or password.')
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  // Just clear local — no auth session to sign out of
  return true
}

export async function getSession() {
  return null
}

export async function getStaffProfile(email) {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('email', email)
    .single()
  if (error) throw error
  return data
}

// ── EMPLOYERS ─────────────────────────────────────────────────
export async function fetchEmployers() {
  const { data, error } = await supabase
    .from('employers')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

// ── CASES ─────────────────────────────────────────────────────
export async function fetchCases() {
  const { data, error } = await supabase
    .from('cases')
    .select('*, employer:employers(name,number), assigned:staff!cases_assigned_to_fkey(name,avatar)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createCase(caseData) {
  const { data, error } = await supabase
    .from('cases')
    .insert([caseData])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCase(id, updates) {
  const { data, error } = await supabase
    .from('cases')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── CASE NOTES ────────────────────────────────────────────────
export async function addNote(caseId, userId, text) {
  const { data, error } = await supabase
    .from('case_notes')
    .insert([{ case_id: caseId, user_id: userId, text }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchNotes(caseId) {
  const { data, error } = await supabase
    .from('case_notes')
    .select('*, staff(name,avatar)')
    .eq('case_id', caseId)
    .order('created_at')
  if (error) throw error
  return data
}

// ── AUDIT LOG ─────────────────────────────────────────────────
export async function addAudit(caseId, userId, action, type = 'action') {
  const { error } = await supabase
    .from('audit_log')
    .insert([{ case_id: caseId, user_id: userId, action, type }])
  if (error) console.error('Audit log error:', error)
}

export async function fetchAudit(caseId) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*, staff(name,avatar)')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── BILLING TASKS ─────────────────────────────────────────────
export async function fetchBillingTasks() {
  const { data, error } = await supabase
    .from('billing_tasks')
    .select('*, employer:employers(name), assigned:staff!billing_tasks_assigned_to_fkey(name,avatar)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createBillingTask(taskData) {
  const { data, error } = await supabase
    .from('billing_tasks')
    .insert([taskData])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBillingTask(id, updates) {
  const { data, error } = await supabase
    .from('billing_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── STAFF ─────────────────────────────────────────────────────
export async function fetchStaff() {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}
