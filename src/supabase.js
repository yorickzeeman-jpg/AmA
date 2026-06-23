import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://tjsofkrfqskrtnpjltf.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqc29ma3JmcXNrcnRucGpsdGYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0OTg5NjI0MSwiZXhwIjoyMDY1NDcyMjQxfQ.u3Xy72zdp8o-rEdI3EqIM2nY46n-PMlShwp64VcFwtA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── AUTH — name + password only, no email ────────────────────────────────────
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

  // Check local users first — always works
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
    // Supabase unreachable — local auth already handled above
  }

  throw new Error('Incorrect name or password.')
}

export async function signOut() {
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

// ── EMPLOYERS — localStorage persistence ─────────────────────────────────────
const LS_EMPLOYERS    = 'aeb_employers'
const LS_PROFILES     = 'aeb_benefit_profiles'

export async function fetchEmployers() {
  try {
    const stored = localStorage.getItem(LS_EMPLOYERS)
    if (stored) return JSON.parse(stored)
    return []
  } catch(e) {
    console.warn('[Storage] fetchEmployers:', e.message)
    return []
  }
}

export async function saveEmployer(emp) {
  try {
    const stored  = localStorage.getItem(LS_EMPLOYERS)
    const current = stored ? JSON.parse(stored) : []
    const updated = current.filter(e => e.id !== emp.id)
    updated.push(emp)
    localStorage.setItem(LS_EMPLOYERS, JSON.stringify(updated))
    console.log('[Storage] saveEmployer OK:', emp.name)
    return true
  } catch(e) {
    console.warn('[Storage] saveEmployer:', e.message)
    return false
  }
}

// ── BENEFIT PROFILES — localStorage persistence ───────────────────────────────
export async function fetchBenefitProfiles() {
  try {
    const stored = localStorage.getItem(LS_PROFILES)
    if (stored) return JSON.parse(stored)
    return {}
  } catch(e) {
    console.warn('[Storage] fetchBenefitProfiles:', e.message)
    return {}
  }
}

export async function saveBenefitProfile(employerId, profile) {
  try {
    const stored  = localStorage.getItem(LS_PROFILES)
    const current = stored ? JSON.parse(stored) : {}
    current[employerId] = profile
    localStorage.setItem(LS_PROFILES, JSON.stringify(current))
    console.log('[Storage] saveBenefitProfile OK:', employerId)
    return true
  } catch(e) {
    console.warn('[Storage] saveBenefitProfile:', e.message)
    return false
  }
}
