// ═══════════════════════════════════════════════════════════════════════════
// MASTER CASE CONFIGURATION
// Source of truth: "1_CASE TYPES AND CATEGORIES.xlsx"
// 52 case categories across 7 case types, with SLA days exactly as supplied.
// DO NOT invent, rename or alter values here without updating the source file.
//
// workflow: name of a WORKFLOW_TEMPLATES entry, or null = "Workflow not configured"
//           (never silently substitute an incorrect workflow)
// ═══════════════════════════════════════════════════════════════════════════

export const CASE_CONFIG = [
  // ── Benefit Expiry ──────────────────────────────────────────────────────
  { type:'Benefit Expiry', category:'Benefit Expiry', slaDays:2, workflow:'Expiry' },

  // ── Death ───────────────────────────────────────────────────────────────
  { type:'Death', category:'Funeral',              slaDays:7,   workflow:'Death - Funeral',
    note:'7-day SLA applies in case there are outstanding requirements.' },
  { type:'Death', category:'Funeral - Flexicare',  slaDays:7,   workflow:'Death - Funeral' },
  { type:'Death', category:'GEB Claim',            slaDays:15,  workflow:'Death - GEB' },
  { type:'Death', category:'Extended Funeral',     slaDays:7,   workflow:'Death - Extended Funeral' },
  { type:'Death', category:'Funeral - Accident',   slaDays:7,   workflow:'Death - Accidental Funeral' },
  { type:'Death', category:'GLA Death Claim',      slaDays:20,  workflow:'Death - GLA' },
  { type:'Death', category:'GEB Review',           slaDays:10,  workflow:'Death - GEB Review' },
  { type:'Death', category:'Ret Death Claim',      slaDays:365, workflow:null,
    note:'Trustees can take this long to decide on distribution.' },
  { type:'Death', category:'Trust Account - Minor',slaDays:20,  workflow:null },
  { type:'Death', category:'Estate Account',       slaDays:20,  workflow:null },

  // ── Disability ──────────────────────────────────────────────────────────
  { type:'Disability', category:'Capital Disability',   slaDays:20, workflow:'Disability' },
  { type:'Disability', category:'Temporary Disability', slaDays:20, workflow:'Disability' },
  { type:'Disability', category:'Income Disability',    slaDays:20, workflow:'Disability' },
  { type:'Disability', category:'Disability Review',    slaDays:20, workflow:'Disability - Review' },

  // ── Exit ────────────────────────────────────────────────────────────────
  { type:'Exit', category:'Retirement (Mbr over 60)',    slaDays:40, workflow:'Exit' },
  { type:'Exit', category:'Transfer funds',              slaDays:40, workflow:'Exit' },
  { type:'Exit', category:'Retirement Withdrawal',       slaDays:40, workflow:'Exit' },
  { type:'Exit', category:'Retirement Transfer',         slaDays:40, workflow:'Exit' },
  { type:'Exit', category:'Cancel Medical Aid',          slaDays:2,  workflow:null },
  { type:'Exit', category:'Retirement Preservation',     slaDays:40, workflow:'Exit' },
  { type:'Exit', category:'Healthy Company Termination', slaDays:2,  workflow:null },

  // ── Group Risk Underwriting ─────────────────────────────────────────────
  { type:'Group Risk Underwriting', category:'Group Risk Underwriting', slaDays:90, workflow:'Underwriting' },
  { type:'Group Risk Underwriting', category:'Decision letter',         slaDays:1,  workflow:null },
  { type:'Group Risk Underwriting', category:'Underwriting query',      slaDays:1,  workflow:null },

  // ── New Entrant ─────────────────────────────────────────────────────────
  { type:'New Entrant', category:'Medical Application',        slaDays:5, workflow:null },
  { type:'New Entrant', category:'Extended Application',       slaDays:1, workflow:'Extended Funeral Application' },
  { type:'New Entrant', category:'Healthy Company Activation', slaDays:4, workflow:null },
  { type:'New Entrant', category:'New Entrant Consultation',   slaDays:2, workflow:'New' },
  { type:'New Entrant', category:'Transfer to ER group',       slaDays:4, workflow:null },
  { type:'New Entrant', category:'Member Review',              slaDays:5, workflow:'Benefit Update' },

  // ── Benefit Update ──────────────────────────────────────────────────────
  { type:'Benefit Update', category:'Member Review', slaDays:5, workflow:'Benefit Update' },

  // ── Query ───────────────────────────────────────────────────────────────
  { type:'Query', category:'Medical reinstatement',   slaDays:2,  workflow:null },
  { type:'Query', category:'Addition of dependent',   slaDays:2,  workflow:null },
  { type:'Query', category:'Plan Change',             slaDays:2,  workflow:null },
  { type:'Query', category:'Removal of dependent',    slaDays:2,  workflow:null },
  { type:'Query', category:'Add Vitality',            slaDays:2,  workflow:null },
  { type:'Query', category:'Remove Vitality',         slaDays:2,  workflow:null },
  { type:'Query', category:'Medical Transfer',        slaDays:4,  workflow:null },
  { type:'Query', category:'Change main member',      slaDays:2,  workflow:null },
  { type:'Query', category:'Cancel Vitality',         slaDays:2,  workflow:null },
  { type:'Query', category:'Medical Card',            slaDays:2,  workflow:null },
  { type:'Query', category:'Tax Certificate',         slaDays:1,  workflow:null },
  { type:'Query', category:'Medical certificate',     slaDays:1,  workflow:null },
  { type:'Query', category:'Surname Change',          slaDays:2,  workflow:null },
  { type:'Query', category:'Medical Claims Query',    slaDays:1,  workflow:null },
  { type:'Query', category:'Benefit Statement',       slaDays:1,  workflow:null },
  { type:'Query', category:'Contribution Query',      slaDays:1,  workflow:null },
  { type:'Query', category:'Nomination Form',         slaDays:1,  workflow:null },
  { type:'Query', category:'Section 14',              slaDays:60, workflow:'Section 14' },
  { type:'Query', category:'Cancel Extended Cover',   slaDays:1,  workflow:'Query - Cancel Extended Cover' },
  { type:'Query', category:'Divorce Order',           slaDays:40, workflow:null },
  { type:'Query', category:'Home Loan',               slaDays:30, workflow:null },
  { type:'Query', category:'Risk PayBack',            slaDays:10, workflow:null },
]

// ─── LOOKUPS ──────────────────────────────────────────────────────────────
export const CASE_TYPE_LIST = [...new Set(CASE_CONFIG.map(c => c.type))]

export function categoriesForType(type) {
  return CASE_CONFIG.filter(c => c.type === type)
}

export function findConfig(type, category) {
  return CASE_CONFIG.find(c => c.type === type && c.category === category) || null
}

// Case Category is unique enough to resolve on its own for legacy/backfill use
export function findConfigByCategory(category) {
  return CASE_CONFIG.find(c => c.category === category) || null
}

export function slaDueDate(createdISO, slaDays) {
  const d = new Date(createdISO)
  d.setDate(d.getDate() + (slaDays || 0))
  return d.toISOString().split('T')[0]
}
