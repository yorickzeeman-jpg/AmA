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

// ── EMPLOYERS ────────────────────────────────────────────────────────────────
export async function fetchEmployers() {
  try {
    const { data, error } = await supabase
      .from('employers')
      .select('*')
      .order('name')
    if (error) {
      console.warn('[Supabase] fetchEmployers:', error.message)
      return null
    }
    // Normalise rows to match app's employer object shape
    return (data || []).map(e => ({
      id:         e.id,
      name:       e.name || '',
      number:     e.number || '',
      industry:   e.industry || '',
      status:     e.status || 'active',
      members:    e.members || 0,
      contact:    e.contact || '',
      phone:      e.phone || '',
      email:      e.email || '',
      portal:     e.portal || false,
      consultant: e.consultant || null,
    }))
  } catch(e) {
    console.warn('[Supabase] fetchEmployers exception:', e.message)
    return null
  }
}

export async function saveEmployer(emp) {
  try {
    const { error } = await supabase
      .from('employers')
      .upsert({
        id:         emp.id,
        name:       emp.name,
        number:     emp.number,
        industry:   emp.industry,
        status:     emp.status,
        members:    emp.members || 0,
        contact:    emp.contact,
        phone:      emp.phone,
        email:      emp.email,
        portal:     emp.portal || false,
        consultant: emp.consultant || null,
      })
    if (error) console.warn('[Supabase] saveEmployer:', error.message)
    return !error
  } catch(e) {
    console.warn('[Supabase] saveEmployer exception:', e.message)
    return false
  }
}

// ── BENEFIT PROFILES ─────────────────────────────────────────────────────────
export async function fetchBenefitProfiles() {
  const { data, error } = await supabase
    .from('benefit_profiles')
    .select('employer_id, profile_data')
  if (error) {
    console.warn('[Supabase] fetchBenefitProfiles:', error.message)
    return null
  }
  const map = {}
  ;(data || []).forEach(row => { map[row.employer_id] = row.profile_data })
  return map
}

export async function saveBenefitProfile(employerId, profile) {
  const { error } = await supabase
    .from('benefit_profiles')
    .upsert({
      employer_id:  employerId,
      profile_data: profile,
      updated_at:   new Date().toISOString(),
    })
  if (error) console.warn('[Supabase] saveBenefitProfile:', error.message)
  return !error
}
