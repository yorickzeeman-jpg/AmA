// ═══════════════════════════════════════════════════════════════════════════
// CONSOLIDATED PARTICIPATING EMPLOYER LIST
//
// ONE selector across all benefits. Reuses the two EXISTING datasets — no new
// table, no duplicated records:
//   employers          → Retirement / Employee Benefits participating employers
//   funeral_employers  → Funeral participating employers (with branches)
//
// Employers appearing in both are merged into a single option, so the user
// never sees a duplicate and both links are preserved on the case.
// ═══════════════════════════════════════════════════════════════════════════
import { fetchEmployers, fetchFuneralEmployers } from './supabase.js'

const norm = n => (n || '').trim().toUpperCase().replace(/\s+/g, ' ')

export async function fetchParticipatingEmployers() {
  const [eb, funeral] = await Promise.all([
    fetchEmployers().catch(() => []),
    fetchFuneralEmployers().catch(() => []),
  ])

  const byName = new Map()

  // Employee Benefits employers — carry the employerId that benefit profiles,
  // billing and the membership register depend on.
  ;(eb || []).forEach(e => {
    const key = norm(e.name)
    if (!key) return
    byName.set(key, {
      key,
      name: e.name,
      employerId: e.id,        // EB link — must be preserved
      number: e.number || '',
      branches: [],
      sources: ['Employee Benefits'],
    })
  })

  // Funeral participating employers — merge onto the same name where it exists
  ;(funeral || []).forEach(f => {
    const key = norm(f.name)
    if (!key) return
    const existing = byName.get(key)
    if (existing) {
      if (f.branch && !existing.branches.includes(f.branch)) existing.branches.push(f.branch)
      if (!existing.sources.includes('Funeral')) existing.sources.push('Funeral')
      existing.region = existing.region || f.region || ''
    } else {
      byName.set(key, {
        key,
        name: f.name,
        employerId: null,      // funeral-only: no EB benefit profile
        number: '',
        branches: f.branch ? [f.branch] : [],
        region: f.region || '',
        sources: ['Funeral'],
      })
    }
  })

  return [...byName.values()]
    .map(e => ({ ...e, branches: e.branches.sort() }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Build the fields to save on a case from a selected participating employer.
// Keeps employerId populated wherever an EB record exists, so benefit profiles,
// billing and the Financial Wizard keep working exactly as before.
export function employerCaseFields(entry, branch) {
  if (!entry) return { employerId: '', participating_employer: '', branch: '' }
  return {
    employerId: entry.employerId || '',
    participating_employer: entry.name,
    branch: branch || '',
  }
}
