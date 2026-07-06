import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://tjsofkrfqskrtnpjltf.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqc29ma3JmcXNrcnRucGpsdGYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0OTg5NjI0MSwiZXhwIjoyMDY1NDcyMjQxfQ.u3Xy72zdp8o-rEdI3EqIM2nY46n-PMlShwp64VcFwtA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── LOCAL STORAGE KEYS ────────────────────────────────────────────────────────
const LS_EMPLOYERS = 'aeb_employers'
const LS_PROFILES  = 'aeb_benefit_profiles'

// ── AUTH ──────────────────────────────────────────────────────────────────────
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
  const local = LOCAL_USERS.find(u =>
    u.name.toLowerCase() === nameTrimmed.toLowerCase() &&
    u.password === passTrimmed && u.status === 'active'
  )
  if (local) return local
  try {
    const { data, error } = await supabase
      .from('portal_users').select('*')
      .ilike('name', nameTrimmed).eq('status', 'active').single()
    if (!error && data && data.password === passTrimmed) return data
  } catch(e) {}
  throw new Error('Incorrect name or password.')
}

export async function signOut() { return true }
export async function getSession() { return null }

// ── EMPLOYERS ─────────────────────────────────────────────────────────────────
// Strategy: Supabase primary + localStorage backup
// On save: write to BOTH
// On load: try Supabase first, fall back to localStorage

export async function fetchEmployers() {
  console.log('[DB] fetchEmployers: starting')

  // Retry up to 3 times with backoff — handles Vercel cold-start DNS delays
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data, error } = await supabase
        .from('employers')
        .select('*')
        .order('name')

      if (error) {
        console.warn(`[DB] fetchEmployers attempt ${attempt} Supabase error:`, error.message)
        if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1500))
        continue
      }

      console.log('[DB] fetchEmployers OK:', data?.length, 'records')
      if (data && data.length > 0) {
        localStorage.setItem(LS_EMPLOYERS, JSON.stringify(data))
        return data.map(normaliseEmployer)
      }
      // Supabase returned empty — check localStorage before returning empty
      break
    } catch(e) {
      console.warn(`[DB] fetchEmployers attempt ${attempt} exception:`, e.message)
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1500))
    }
  }

  // Fall back to localStorage
  try {
    const stored = localStorage.getItem(LS_EMPLOYERS)
    if (stored) {
      const data = JSON.parse(stored)
      console.log('[DB] fetchEmployers localStorage fallback:', data.length, 'records')
      return data.map(normaliseEmployer)
    }
  } catch(e) {
    console.warn('[DB] fetchEmployers localStorage error:', e.message)
  }

  console.log('[DB] fetchEmployers: no data found anywhere')
  return []
}

function normaliseEmployer(e) {
  return {
    id:         e.id        || '',
    name:       e.name      || '',
    number:     e.number    || '',
    industry:   e.industry  || '',
    status:     e.status    || 'active',
    members:    e.members   || 0,
    contact:    e.contact   || '',
    phone:      e.phone     || '',
    email:      e.email     || '',
    portal:     e.portal    || false,
    consultant: e.consultant|| null,
  }
}

export async function saveEmployer(emp) {
  console.log('[DB] saveEmployer: starting for', emp.name, 'id:', emp.id)

  const row = {
    id:         emp.id,
    name:       emp.name       || '',
    number:     emp.number     || '',
    industry:   emp.industry   || '',
    status:     emp.status     || 'active',
    members:    emp.members    || 0,
    contact:    emp.contact    || '',
    phone:      emp.phone      || '',
    email:      emp.email      || '',
    portal:     emp.portal     || false,
    consultant: emp.consultant || null,
  }

  // Always write to localStorage immediately
  try {
    const stored  = localStorage.getItem(LS_EMPLOYERS)
    const current = stored ? JSON.parse(stored) : []
    const updated = current.filter(e => e.id !== emp.id)
    updated.push(row)
    localStorage.setItem(LS_EMPLOYERS, JSON.stringify(updated))
    console.log('[DB] saveEmployer localStorage OK')
  } catch(e) {
    console.warn('[DB] saveEmployer localStorage error:', e.message)
  }

  // Also write to Supabase
  try {
    const { data, error } = await supabase
      .from('employers')
      .upsert(row)
      .select()

    if (error) {
      console.error('[DB] saveEmployer Supabase error:', error.message, error.code, error.details)
      return false
    }

    console.log('[DB] saveEmployer Supabase OK — record:', data?.[0]?.id)
    return true
  } catch(e) {
    console.error('[DB] saveEmployer Supabase exception:', e.message)
    return false
  }
}

// ── BENEFIT PROFILES ──────────────────────────────────────────────────────────
export async function fetchBenefitProfiles() {
  console.log('[DB] fetchBenefitProfiles: starting')

  // Try Supabase first
  try {
    const { data, error } = await supabase
      .from('benefit_profiles')
      .select('employer_id, profile_data')

    if (error) {
      console.warn('[DB] fetchBenefitProfiles Supabase error:', error.message, error.code)
    } else {
      console.log('[DB] fetchBenefitProfiles Supabase OK:', data?.length, 'records')
      if (data && data.length > 0) {
        const map = {}
        data.forEach(row => { map[row.employer_id] = row.profile_data })
        localStorage.setItem(LS_PROFILES, JSON.stringify(map))
        return map
      }
    }
  } catch(e) {
    console.warn('[DB] fetchBenefitProfiles Supabase exception:', e.message)
  }

  // Fall back to localStorage
  try {
    const stored = localStorage.getItem(LS_PROFILES)
    if (stored) {
      const data = JSON.parse(stored)
      console.log('[DB] fetchBenefitProfiles localStorage fallback:', Object.keys(data).length, 'profiles')
      return data
    }
  } catch(e) {
    console.warn('[DB] fetchBenefitProfiles localStorage error:', e.message)
  }

  return {}
}

export async function saveBenefitProfile(employerId, profile) {
  console.log('[DB] saveBenefitProfile: starting for employer', employerId)

  // Always write to localStorage immediately
  try {
    const stored  = localStorage.getItem(LS_PROFILES)
    const current = stored ? JSON.parse(stored) : {}
    current[employerId] = profile
    localStorage.setItem(LS_PROFILES, JSON.stringify(current))
    console.log('[DB] saveBenefitProfile localStorage OK')
  } catch(e) {
    console.warn('[DB] saveBenefitProfile localStorage error:', e.message)
  }

  // Also write to Supabase
  try {
    const { data, error } = await supabase
      .from('benefit_profiles')
      .upsert({ employer_id: employerId, profile_data: profile, updated_at: new Date().toISOString() })
      .select()

    if (error) {
      console.error('[DB] saveBenefitProfile Supabase error:', error.message, error.code, error.details)
      return false
    }

    console.log('[DB] saveBenefitProfile Supabase OK — employer:', data?.[0]?.employer_id)
    return true
  } catch(e) {
    console.error('[DB] saveBenefitProfile Supabase exception:', e.message)
    return false
  }
}
