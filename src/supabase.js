import { createClient } from '@supabase/supabase-js'

// ── CONNECTION ────────────────────────────────────────────────────────────────
// Project: AEB-PORTAL
// URL verified against: supabase.com → AEB-PORTAL → Settings → API
const SUPABASE_URL  = 'https://tjsofkrfqskrtnpjltf.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqc29ma3JmcXNrcnRucGpsdGYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0OTg5NjI0MSwiZXhwIjoyMDY1NDcyMjQxfQ.u3Xy72zdp8o-rEdI3EqIM2nY46n-PMlShwp64VcFwtA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── OFFLINE CACHE KEYS (emergency fallback only) ──────────────────────────────
// localStorage is written AFTER a successful Supabase fetch.
// It is read ONLY if Supabase is completely unreachable.
const LS_EMPLOYERS = 'aeb_employers_cache'
const LS_PROFILES  = 'aeb_benefit_profiles_cache'

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
  const n = name.trim(), p = password.trim()
  const local = LOCAL_USERS.find(u =>
    u.name.toLowerCase() === n.toLowerCase() && u.password === p && u.status === 'active'
  )
  if (local) return local
  try {
    const { data, error } = await supabase
      .from('portal_users').select('*').ilike('name', n).eq('status', 'active').single()
    if (!error && data && data.password === p) return data
  } catch(e) {}
  throw new Error('Incorrect name or password.')
}

export async function signOut() { return true }
export async function getSession() { return null }

// ── EMPLOYERS ─────────────────────────────────────────────────────────────────
// Primary: Supabase
// Fallback: localStorage cache (only if Supabase completely unreachable)

export async function fetchEmployers() {
  console.log('[DB] fetchEmployers — connecting to Supabase')

  try {
    const { data, error } = await supabase
      .from('employers')
      .select('*')
      .order('name')

    if (error) {
      console.error('[DB] fetchEmployers Supabase error:', error.message, '— falling back to cache')
      return readEmployerCache()
    }

    const employers = (data || []).map(normaliseEmployer)
    console.log('[DB] fetchEmployers OK:', employers.length, 'records from Supabase')

    // Update offline cache with fresh data
    try { localStorage.setItem(LS_EMPLOYERS, JSON.stringify(data)) } catch(e) {}

    return employers

  } catch(e) {
    console.error('[DB] fetchEmployers network error:', e.message, '— falling back to cache')
    return readEmployerCache()
  }
}

function readEmployerCache() {
  try {
    const stored = localStorage.getItem(LS_EMPLOYERS)
    if (stored) {
      const data = JSON.parse(stored)
      console.warn('[DB] fetchEmployers using offline cache:', data.length, 'records')
      return data.map(normaliseEmployer)
    }
  } catch(e) {}
  console.warn('[DB] fetchEmployers no cache available — returning empty')
  return []
}

function normaliseEmployer(e) {
  return {
    id:         e.id         || '',
    name:       e.name       || '',
    number:     e.number     || '',
    industry:   e.industry   || '',
    status:     e.status     || 'active',
    members:    e.members    || 0,
    contact:    e.contact    || '',
    phone:      e.phone      || '',
    email:      e.email      || '',
    portal:     e.portal     || false,
    consultant: e.consultant || null,
  }
}

export async function saveEmployer(emp) {
  console.log('[DB] saveEmployer:', emp.name)

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

  try {
    const { data, error } = await supabase.from('employers').upsert(row).select()

    if (error) {
      console.error('[DB] saveEmployer Supabase error:', error.message)
      updateEmployerCache(row)
      return false
    }

    console.log('[DB] saveEmployer OK — Supabase id:', data?.[0]?.id)
    updateEmployerCache(row)
    return true

  } catch(e) {
    console.error('[DB] saveEmployer network error:', e.message)
    updateEmployerCache(row)
    return false
  }
}

function updateEmployerCache(row) {
  try {
    const stored  = localStorage.getItem(LS_EMPLOYERS)
    const current = stored ? JSON.parse(stored) : []
    const updated = current.filter(e => e.id !== row.id)
    updated.push(row)
    localStorage.setItem(LS_EMPLOYERS, JSON.stringify(updated))
  } catch(e) {}
}

// ── BENEFIT PROFILES ──────────────────────────────────────────────────────────
export async function fetchBenefitProfiles() {
  console.log('[DB] fetchBenefitProfiles — connecting to Supabase')

  try {
    const { data, error } = await supabase
      .from('benefit_profiles')
      .select('employer_id, profile_data')

    if (error) {
      console.error('[DB] fetchBenefitProfiles Supabase error:', error.message, '— falling back to cache')
      return readProfileCache()
    }

    const map = {}
    ;(data || []).forEach(row => { map[row.employer_id] = row.profile_data })
    console.log('[DB] fetchBenefitProfiles OK:', Object.keys(map).length, 'profiles from Supabase')

    // Update offline cache
    try { localStorage.setItem(LS_PROFILES, JSON.stringify(map)) } catch(e) {}

    return map

  } catch(e) {
    console.error('[DB] fetchBenefitProfiles network error:', e.message, '— falling back to cache')
    return readProfileCache()
  }
}

function readProfileCache() {
  try {
    const stored = localStorage.getItem(LS_PROFILES)
    if (stored) {
      const data = JSON.parse(stored)
      console.warn('[DB] fetchBenefitProfiles using offline cache:', Object.keys(data).length, 'profiles')
      return data
    }
  } catch(e) {}
  return {}
}

export async function saveBenefitProfile(employerId, profile) {
  console.log('[DB] saveBenefitProfile:', employerId)

  try {
    const { data, error } = await supabase
      .from('benefit_profiles')
      .upsert({ employer_id: employerId, profile_data: profile, updated_at: new Date().toISOString() })
      .select()

    if (error) {
      console.error('[DB] saveBenefitProfile Supabase error:', error.message)
      updateProfileCache(employerId, profile)
      return false
    }

    console.log('[DB] saveBenefitProfile OK:', data?.[0]?.employer_id)
    updateProfileCache(employerId, profile)
    return true

  } catch(e) {
    console.error('[DB] saveBenefitProfile network error:', e.message)
    updateProfileCache(employerId, profile)
    return false
  }
}

function updateProfileCache(employerId, profile) {
  try {
    const stored  = localStorage.getItem(LS_PROFILES)
    const current = stored ? JSON.parse(stored) : {}
    current[employerId] = profile
    localStorage.setItem(LS_PROFILES, JSON.stringify(current))
  } catch(e) {}
}
