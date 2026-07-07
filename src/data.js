// ─── DESIGN TOKENS — Discovery Navy / AEB Orange ────────────────────────────
export const T = {
  navy:    '#07122a',
  navy2:   '#0c1d3e',
  navy3:   '#0f2347',
  navy4:   '#162d54',
  orange:  '#e8680a',
  orange2: '#f07a20',
  orangeL: '#fff3e8',
  blue:    '#1e5fd9',
  blueL:   '#e8f0fe',
  red:     '#dc2626',
  redL:    '#fef2f2',
  amber:   '#d97706',
  amberL:  '#fffbeb',
  green:   '#059669',
  greenL:  '#f0fdf4',
  purple:  '#7c3aed',
  purpleL: '#f5f3ff',
  teal:    '#0891b2',
  tealL:   '#ecfeff',
  gray:    '#6b7280',
  grayL:   '#f9fafb',
  border:  '#e5e7eb',
  white:   '#ffffff',
  text:    '#111827',
  textSub: '#6b7280',
  // Sidebar
  sidebarBg:    '#07122a',
  sidebarBg2:   '#0c1d3e',
}

// ─── ROLES ────────────────────────────────────────────────────────────────────
export const ROLES = [
  { id: 'general_manager',  label: 'General Manager',      color: T.orange  },
  { id: 'administrator',    label: 'Administrator',         color: T.blue    },
  { id: 'billing_admin',    label: 'Billing Administrator', color: T.purple  },
  { id: 'employer_admin',   label: 'Employer Admin',        color: T.teal    },
  { id: 'employer_user',    label: 'Employer User',         color: T.teal    },
]

export const ROLE_PERMISSIONS = {
  general_manager: ['all'],
  administrator:   ['cases:read','cases:write','cases:assign','internal:read','internal:write','reports:read','employers:read'],
  billing_admin:   ['cases:read','billing:read','billing:write'],
  employer_admin:  ['cases:read:own','cases:create'],
  employer_user:   ['cases:read:own','cases:create'],
}

// ─── NAMED AEB STAFF ──────────────────────────────────────────────────────────
export const INITIAL_USERS = [
  { id:'a0000000-0000-0000-0000-000000000001', name:'Yorick Zeeman',        email:'yorick@amadwala.co.za',    role:'general_manager', status:'active', employer:null, avatar:'YZ', joined:'2022-01-01',
    allocation:{ directTypes:[], pool:null, excludeTypes:[] } },
  { id:'a0000000-0000-0000-0000-000000000002', name:'Leandre van der Merwe',email:'leandre@amadwala.co.za',   role:'general_manager', status:'active', employer:null, avatar:'LV', joined:'2022-01-01',
    allocation:{ directTypes:['ct_underwriting'], pool:null, excludeTypes:[] } },
  { id:'a0000000-0000-0000-0000-000000000003', name:'Nokulunga Nyundu',     email:'nokulunga@amadwala.co.za', role:'administrator',   status:'active', employer:null, avatar:'NN', joined:'2022-03-01',
    allocation:{ directTypes:[], pool:'general', excludeTypes:['ct_underwriting'] } },
  { id:'a0000000-0000-0000-0000-000000000004', name:'Tevin Nxumalo',        email:'tevin@amadwala.co.za',     role:'administrator',   status:'active', employer:null, avatar:'TN', joined:'2022-06-01',
    allocation:{ directTypes:[], pool:'general', excludeTypes:['ct_underwriting','ct_amcu_funeral'] } },
  { id:'a0000000-0000-0000-0000-000000000005', name:'Sesi Phiri',           email:'sesi@amadwala.co.za',      role:'administrator',   status:'active', employer:null, avatar:'SP', joined:'2023-01-01',
    allocation:{ directTypes:['ct_amcu_funeral','ct_benefit_statement','ct_beneficiary'], pool:null, excludeTypes:[] } },
  { id:'a0000000-0000-0000-0000-000000000006', name:'Daleen Taute',         email:'daleen@amadwala.co.za',    role:'billing_admin',   status:'active', employer:null, avatar:'DT', joined:'2022-01-01',
    allocation:{ directTypes:['ct_extended_funeral'], pool:'billing', excludeTypes:[] } },
  { id:'a0000000-0000-0000-0000-000000000007', name:'Mahlatse Manyathi',    email:'mahlatse@amadwala.co.za',  role:'administrator',   status:'active', employer:null, avatar:'MM', joined:'2023-04-01',
    allocation:{ directTypes:[], pool:'general', excludeTypes:['ct_underwriting'] } },
  { id:'a0000000-0000-0000-0000-000000000008', name:'Ithasia',              email:'ithasia@amadwala.co.za',   role:'billing_admin',   status:'active', employer:null, avatar:'IT', joined:'2023-06-01',
    allocation:{ directTypes:[], pool:'billing', excludeTypes:[] } },
]

// ─── ALLOCATION POOLS ─────────────────────────────────────────────────────────
export const ALLOCATION_POOLS = {
  general: {
    name: 'General Administration Pool',
    members: ['u2','u3','u6'],   // Nokulunga, Tevin, Mahlatse
    strategy: 'round_robin',
    currentIndex: 0,
  },
  billing: {
    name: 'Billing Pool',
    members: ['u5','u7'],        // Daleen, Ithasia
    strategy: 'round_robin',
    currentIndex: 0,
  },
}

// ─── EMPLOYERS ────────────────────────────────────────────────────────────────
export const INITIAL_EMPLOYERS = []

// ─── CATEGORIES (grouping/reporting only) ────────────────────────────────────
export const INITIAL_CATEGORIES = [
  { id:'cat1', name:'Member Administration', color:'#1e5fd9',  description:'New employee, exit, membership amendments.' },
  { id:'cat2', name:'Claims',                color:'#dc2626',  description:'Funeral, death and disability claims.' },
  { id:'cat3', name:'Beneficiary & Statements', color:'#7c3aed', description:'Beneficiary nominations and benefit statements.' },
  { id:'cat4', name:'Billing & Payroll',     color:'#d97706',  description:'Billing queries, payroll reconciliation and administration.' },
  { id:'cat5', name:'Employer Maintenance',  color:'#0891b2',  description:'Employer information changes and portal administration.' },
  { id:'cat6', name:'Queries',               color:'#059669',  description:'General queries and information requests.' },
  { id:'cat7', name:'Internal',              color:'#374151',  description:'Internal AEB workflow cases — not visible to employers.' },
]

// ─── EMPLOYER-VISIBLE CASE TYPES ─────────────────────────────────────────────
// isBillingTrigger: true = "Complete & Send to Billing" instead of standard close
// isInternal: true = not visible to employers (Medical Underwriting etc.)
// directAssignTo: userId for direct assignment; null = pool allocation
export const INITIAL_CASE_TYPES = [
  // ── Member Administration ──────────────────────────────────────────────────
  {
    id:'ct_new_employee', categoryId:'cat1', name:'New Employee',
    slaLabel:'2 Business Days', slaDays:2, slaUnit:'business_days',
    escalationDays:1, responsibleTeam:'General Administration Pool',
    isBillingTrigger:true, isInternal:false,
    directAssignTo:null, pool:'general',
    requiredDocs:['ID Copy','Employment Contract','Enrolment Form','Beneficiary Form'],
    stages:[
      { id:'s1', name:'Request Received',   owner:'administrator', notify:true,  requiredDocs:['Enrolment Form'] },
      { id:'s2', name:'Documents Verified', owner:'administrator', notify:false, requiredDocs:['ID Copy','Employment Contract'] },
      { id:'s3', name:'Member Captured',    owner:'administrator', notify:true,  requiredDocs:[] },
      { id:'s4', name:'Sent to Billing',    owner:'billing_admin', notify:true,  requiredDocs:[] },
      { id:'s5', name:'Billing Complete',   owner:'billing_admin', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On SLA Warning','On Completion'],
    active:true,
  },
  {
    id:'ct_exit_employee', categoryId:'cat1', name:'Exit Employee',
    slaLabel:'5 Business Days', slaDays:5, slaUnit:'business_days',
    escalationDays:3, responsibleTeam:'General Administration Pool',
    isBillingTrigger:true, isInternal:false,
    directAssignTo:null, pool:'general',
    requiredDocs:['ID Copy','Termination Letter','Exit Form'],
    stages:[
      { id:'s1', name:'Request Received',   owner:'administrator', notify:true,  requiredDocs:['Exit Form'] },
      { id:'s2', name:'Documents Verified', owner:'administrator', notify:false, requiredDocs:['ID Copy','Termination Letter'] },
      { id:'s3', name:'Member Exited',      owner:'administrator', notify:true,  requiredDocs:[] },
      { id:'s4', name:'Sent to Billing',    owner:'billing_admin', notify:true,  requiredDocs:[] },
      { id:'s5', name:'Billing Complete',   owner:'billing_admin', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On SLA Warning','On Completion'],
    active:true,
  },
  {
    id:'ct_membership_amendment', categoryId:'cat1', name:'Membership Amendment',
    slaLabel:'3 Business Days', slaDays:3, slaUnit:'business_days',
    escalationDays:2, responsibleTeam:'General Administration Pool',
    isBillingTrigger:true, isInternal:false,
    directAssignTo:null, pool:'general',
    requiredDocs:['Amendment Form','Supporting Document'],
    stages:[
      { id:'s1', name:'Request Received', owner:'administrator', notify:true,  requiredDocs:['Amendment Form'] },
      { id:'s2', name:'Verified',         owner:'administrator', notify:false, requiredDocs:[] },
      { id:'s3', name:'Updated',          owner:'administrator', notify:true,  requiredDocs:[] },
      { id:'s4', name:'Sent to Billing',  owner:'billing_admin', notify:true,  requiredDocs:[] },
      { id:'s5', name:'Billing Complete', owner:'billing_admin', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Completion'],
    active:true,
  },
  // ── Claims ─────────────────────────────────────────────────────────────────
  {
    id:'ct_amcu_funeral', categoryId:'cat2', name:'AMCU Funeral Claim',
    slaLabel:'48 Hours', slaDays:0.083, slaUnit:'hours', slaValue:48,
    escalationDays:1, responsibleTeam:'Sesi Phiri',
    isBillingTrigger:false, isInternal:false,
    directAssignTo:'u4', pool:null,    // Sesi Phiri
    requiredDocs:['Claim Form','Death Certificate','Burial Order','ID Copy of Deceased'],
    stages:[
      { id:'s1', name:'Claim Received',     owner:'administrator', notify:true,  requiredDocs:['Claim Form'] },
      { id:'s2', name:'Documents Verified', owner:'administrator', notify:true,  requiredDocs:['Death Certificate','Burial Order','ID Copy of Deceased'] },
      { id:'s3', name:'Claim Assessed',     owner:'administrator', notify:false, requiredDocs:[] },
      { id:'s4', name:'Payment Authorised', owner:'general_manager', notify:true, requiredDocs:[] },
      { id:'s5', name:'Completed',          owner:'administrator', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On SLA Warning','On Escalation','On Completion'],
    active:true,
  },
  {
    id:'ct_extended_funeral', categoryId:'cat2', name:'Extended Funeral Claim',
    slaLabel:'5 Business Days', slaDays:5, slaUnit:'business_days',
    escalationDays:3, responsibleTeam:'Daleen Taute',
    isBillingTrigger:false, isInternal:false,
    directAssignTo:'u5', pool:null,    // Daleen Taute
    requiredDocs:['Claim Form','Death Certificate','ID Copy of Deceased','Relationship Proof'],
    stages:[
      { id:'s1', name:'Claim Received',     owner:'billing_admin', notify:true,  requiredDocs:['Claim Form'] },
      { id:'s2', name:'Documents Verified', owner:'billing_admin', notify:true,  requiredDocs:['Death Certificate','ID Copy of Deceased','Relationship Proof'] },
      { id:'s3', name:'Claim Assessed',     owner:'billing_admin', notify:false, requiredDocs:[] },
      { id:'s4', name:'Payment Authorised', owner:'general_manager', notify:true, requiredDocs:[] },
      { id:'s5', name:'Completed',          owner:'billing_admin', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On SLA Warning','On Escalation','On Completion'],
    active:true,
  },
  // ── Beneficiary & Statements ───────────────────────────────────────────────
  {
    id:'ct_beneficiary', categoryId:'cat3', name:'Beneficiary Nomination Form',
    slaLabel:'2 Business Days', slaDays:2, slaUnit:'business_days',
    escalationDays:1, responsibleTeam:'Sesi Phiri',
    isBillingTrigger:false, isInternal:false,
    directAssignTo:'u4', pool:null,    // Sesi Phiri
    requiredDocs:['Beneficiary Nomination Form','ID Copy of Beneficiary'],
    stages:[
      { id:'s1', name:'Request Received', owner:'administrator', notify:true,  requiredDocs:['Beneficiary Nomination Form'] },
      { id:'s2', name:'Verified',         owner:'administrator', notify:false, requiredDocs:['ID Copy of Beneficiary'] },
      { id:'s3', name:'Updated',          owner:'administrator', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Completion'],
    active:true,
  },
  {
    id:'ct_benefit_statement', categoryId:'cat3', name:'Benefit Statement Request',
    slaLabel:'3 Business Days', slaDays:3, slaUnit:'business_days',
    escalationDays:2, responsibleTeam:'Sesi Phiri',
    isBillingTrigger:false, isInternal:false,
    directAssignTo:'u4', pool:null,    // Sesi Phiri
    requiredDocs:['Member ID Confirmation'],
    stages:[
      { id:'s1', name:'Request Received',    owner:'administrator', notify:true,  requiredDocs:[] },
      { id:'s2', name:'Statement Generated', owner:'administrator', notify:false, requiredDocs:[] },
      { id:'s3', name:'Sent to Employer',    owner:'administrator', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Completion'],
    active:true,
  },
  // ── Billing & Payroll ──────────────────────────────────────────────────────
  {
    id:'ct_billing_query', categoryId:'cat4', name:'Payroll/Billing Query',
    slaLabel:'3 Business Days', slaDays:3, slaUnit:'business_days',
    escalationDays:2, responsibleTeam:'Billing Pool',
    isBillingTrigger:false, isInternal:false,
    directAssignTo:null, pool:'billing',
    requiredDocs:['Payroll Schedule','Query Detail'],
    stages:[
      { id:'s1', name:'Query Received',  owner:'billing_admin', notify:true,  requiredDocs:['Payroll Schedule'] },
      { id:'s2', name:'Under Review',    owner:'billing_admin', notify:false, requiredDocs:[] },
      { id:'s3', name:'Resolved',        owner:'billing_admin', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Completion'],
    active:true,
  },
  // ── Employer Maintenance ───────────────────────────────────────────────────
  {
    id:'ct_employer_change', categoryId:'cat5', name:'Employer Information Change',
    slaLabel:'3 Business Days', slaDays:3, slaUnit:'business_days',
    escalationDays:2, responsibleTeam:'General Administration Pool',
    isBillingTrigger:false, isInternal:false,
    directAssignTo:null, pool:'general',
    requiredDocs:['Change Request Form','Supporting Documents'],
    stages:[
      { id:'s1', name:'Request Received', owner:'administrator', notify:true,  requiredDocs:['Change Request Form'] },
      { id:'s2', name:'Verified',         owner:'administrator', notify:false, requiredDocs:[] },
      { id:'s3', name:'Updated',          owner:'administrator', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Completion'],
    active:true,
  },
  // ── Funeral Notification ───────────────────────────────────────────────────
  {
    id:'ct_funeral_notification', categoryId:'cat2', name:'Funeral Notification',
    slaLabel:'24 Hours', slaDays:0.042, slaUnit:'hours', slaValue:24,
    escalationDays:0.5, responsibleTeam:'General Administration Pool',
    isBillingTrigger:false, isInternal:false,
    directAssignTo:null, pool:'general',
    requiredDocs:['Death Certificate','Notification Form'],
    stages:[
      { id:'s1', name:'Notification Received', owner:'administrator', notify:true,  requiredDocs:['Death Certificate'] },
      { id:'s2', name:'Verified',              owner:'administrator', notify:false, requiredDocs:[] },
      { id:'s3', name:'Fund Notified',          owner:'administrator', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On Completion'],
    active:true,
  },
  // ── General Query ──────────────────────────────────────────────────────────
  {
    id:'ct_general_query', categoryId:'cat6', name:'General Query',
    slaLabel:'2 Business Days', slaDays:2, slaUnit:'business_days',
    escalationDays:1, responsibleTeam:'General Administration Pool',
    isBillingTrigger:false, isInternal:false,
    directAssignTo:null, pool:'general',
    requiredDocs:[],
    stages:[
      { id:'s1', name:'Query Received', owner:'administrator', notify:true,  requiredDocs:[] },
      { id:'s2', name:'Under Review',   owner:'administrator', notify:false, requiredDocs:[] },
      { id:'s3', name:'Resolved',       owner:'administrator', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Completion'],
    active:true,
  },
  // ── INTERNAL ONLY — not visible to employers ───────────────────────────────
  {
    id:'ct_underwriting', categoryId:'cat7', name:'Medical Underwriting',
    slaLabel:'10 Business Days', slaDays:10, slaUnit:'business_days',
    escalationDays:7, responsibleTeam:'Leandre van der Merwe',
    isBillingTrigger:false, isInternal:true,
    directAssignTo:'u1', pool:null,    // Leandre
    requiredDocs:['Medical Report','ID Copy','Underwriting Application'],
    stages:[
      { id:'s1', name:'Application Received', owner:'general_manager', notify:true,  requiredDocs:['Medical Report','Underwriting Application'] },
      { id:'s2', name:'Medical Review',       owner:'general_manager', notify:false, requiredDocs:[] },
      { id:'s3', name:'Decision Made',        owner:'general_manager', notify:true,  requiredDocs:[] },
      { id:'s4', name:'Employer Updated',     owner:'general_manager', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On Completion'],
    active:true,
  },
  {
    id:'ct_internal_billing_review', categoryId:'cat7', name:'Billing Review (Internal)',
    slaLabel:'2 Business Days', slaDays:2, slaUnit:'business_days',
    escalationDays:1, responsibleTeam:'Billing Pool',
    isBillingTrigger:false, isInternal:true,
    directAssignTo:null, pool:'billing',
    requiredDocs:[],
    stages:[
      { id:'s1', name:'Review Initiated', owner:'billing_admin', notify:true,  requiredDocs:[] },
      { id:'s2', name:'Under Review',     owner:'billing_admin', notify:false, requiredDocs:[] },
      { id:'s3', name:'Review Complete',  owner:'billing_admin', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Completion'],
    active:true,
  },
  {
    id:'ct_escalation', categoryId:'cat7', name:'Escalation (Internal)',
    slaLabel:'24 Hours', slaDays:0.042, slaUnit:'hours', slaValue:24,
    escalationDays:0.5, responsibleTeam:'Leandre van der Merwe',
    isBillingTrigger:false, isInternal:true,
    directAssignTo:'u1', pool:null,
    requiredDocs:[],
    stages:[
      { id:'s1', name:'Escalation Received',  owner:'general_manager', notify:true,  requiredDocs:[] },
      { id:'s2', name:'Under Review',         owner:'general_manager', notify:false, requiredDocs:[] },
      { id:'s3', name:'Resolution Reached',   owner:'general_manager', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On Completion'],
    active:true,
  },
]

// ─── BUSINESS DAY ENGINE ─────────────────────────────────────────────────────
// All SLA calculations use business days (Mon–Fri).
// Public holidays can be added to SA_HOLIDAYS in YYYY-MM-DD format.
// This list is the single source of truth for the entire portal.

export const SA_HOLIDAYS = [
  // 2025
  '2025-01-01', // New Year's Day
  '2025-03-21', // Human Rights Day
  '2025-04-18', // Good Friday
  '2025-04-21', // Family Day
  '2025-04-27', // Freedom Day
  '2025-05-01', // Workers Day
  '2025-06-16', // Youth Day
  '2025-08-09', // National Women's Day
  '2025-09-24', // Heritage Day
  '2025-12-16', // Day of Reconciliation
  '2025-12-25', // Christmas Day
  '2025-12-26', // Day of Goodwill
  // 2026
  '2026-01-01',
  '2026-03-21',
  '2026-04-03', // Good Friday 2026
  '2026-04-06', // Family Day 2026
  '2026-04-27',
  '2026-05-01',
  '2026-06-16',
  '2026-08-10', // Women's Day observed
  '2026-09-24',
  '2026-12-16',
  '2026-12-25',
  '2026-12-26',
]

function isHoliday(dateStr) {
  return SA_HOLIDAYS.includes(dateStr)
}

function isBusinessDay(date) {
  const day = date.getDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false
  const str = date.toISOString().split('T')[0]
  return !isHoliday(str)
}

// Add N business days to a date, returns YYYY-MM-DD string
export function addBusinessDays(fromDate, days) {
  const d = new Date(fromDate)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    if (isBusinessDay(d)) added++
  }
  return d.toISOString().split('T')[0]
}

// Count business days between two dates (from → to)
export function businessDaysBetween(fromStr, toStr) {
  const from = new Date(fromStr)
  const to   = new Date(toStr)
  if (from >= to) return 0
  let count = 0
  const d = new Date(from)
  d.setDate(d.getDate() + 1)
  while (d <= to) {
    if (isBusinessDay(d)) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

// Business days elapsed since a date (how long has a case been open)
export function businessDaysElapsed(fromStr) {
  return businessDaysBetween(fromStr, new Date().toISOString().split('T')[0])
}

// Business days remaining until a date (negative = overdue)
export function businessDaysRemaining(toStr) {
  const today = new Date().toISOString().split('T')[0]
  if (toStr <= today) return -businessDaysBetween(toStr, today)
  return businessDaysBetween(today, toStr)
}

// Is a date overdue (SLA date is in the past on a business day basis)
export function isOverdue(slaDateStr) {
  if (!slaDateStr) return false
  return businessDaysRemaining(slaDateStr) < 0
}

// SLA health: returns 'ok' | 'warning' | 'breached'
export function slaHealth(slaDateStr) {
  if (!slaDateStr) return 'ok'
  const remaining = businessDaysRemaining(slaDateStr)
  if (remaining < 0)  return 'breached'
  if (remaining <= 1) return 'warning'
  return 'ok'
}

// Escalation level based on business days elapsed vs SLA
// Day 30% of SLA: notify assigned user
// Day 60%: notify supervisor
// Day 100%: notify Leandre
// Day 140%: notify General Manager
export function escalationLevel(createdStr, slaDays) {
  if (!createdStr || !slaDays) return null
  const elapsed = businessDaysElapsed(createdStr)
  const ratio   = elapsed / slaDays
  if (ratio >= 1.4) return { level:4, label:'General Manager', color:'#7f1d1d', bg:'#fff1f2' }
  if (ratio >= 1.0) return { level:3, label:'Leandre',         color:'#dc2626', bg:'#fff1f2' }
  if (ratio >= 0.6) return { level:2, label:'Supervisor',      color:'#d97706', bg:'#fffbeb' }
  if (ratio >= 0.3) return { level:1, label:'Assigned User',   color:'#1e5fd9', bg:'#eff6ff' }
  return null
}

// ─── LEGACY HELPERS (kept for backwards compat) ──────────────────────────────
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]
}
function daysFromNow(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]
}
export { daysAgo, daysFromNow }

export function genRef(prefix='AEB') {
  return prefix + '-' + String(Date.now()).slice(-6)
}

export function calcSlaDate(caseType) {
  const d = new Date()
  if (caseType.slaUnit === 'hours') {
    // Hours-based SLA — still uses calendar time
    d.setTime(d.getTime() + (caseType.slaValue || 48) * 3600000)
    return d.toISOString().split('T')[0]
  }
  // Business days SLA
  return addBusinessDays(d.toISOString().split('T')[0], caseType.slaDays || 5)
}

// Auto-allocate a case type to a user based on allocation rules
export function allocateCase(caseType, users, pools, poolIndexes) {
  // Direct assignment
  if (caseType.directAssignTo) {
    const u = users.find(x => x.id === caseType.directAssignTo && x.status === 'active')
    return u?.id || ''
  }
  // Pool round-robin
  if (caseType.pool && pools[caseType.pool]) {
    const pool = pools[caseType.pool]
    const activeMembers = pool.members.filter(uid => {
      const u = users.find(x => x.id === uid)
      if (!u || u.status !== 'active') return false
      // Exclude if this case type is in their exclude list
      if (u.allocation?.excludeTypes?.includes(caseType.id)) return false
      return true
    })
    if (activeMembers.length === 0) return ''
    const idx = (poolIndexes?.[caseType.pool] || 0) % activeMembers.length
    return activeMembers[idx]
  }
  return ''
}

// ─── BILLING TRANSACTION TYPES ────────────────────────────────────────────────
export const BILLING_TRIGGER_CASE_TYPES = [
  'ct_new_employee', 'ct_exit_employee', 'ct_membership_amendment',
]

export const BILLING_STATUSES = [
  'Pending Billing', 'Billing In Progress', 'Awaiting Information',
  'Billing Updated', 'Billing Exception', 'Billing Complete',
]

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
export const STATUS_CFG = {
  'Submitted':            { bg:'#f0f9ff', color:'#0369a1', dot:'#0ea5e9'  },
  'Received':             { bg:'#f0fdf4', color:'#166534', dot:'#22c55e'  },
  'In Progress':          { bg:'#eff6ff', color:'#1d4ed8', dot:'#3b82f6'  },
  'Awaiting Information': { bg:'#fffbeb', color:'#b45309', dot:'#f59e0b'  },
  'Pending Billing':      { bg:'#fdf4ff', color:'#7e22ce', dot:'#a855f7'  },
  'Sent to Billing':      { bg:'#fdf4ff', color:'#7e22ce', dot:'#a855f7'  },
  'Escalated':            { bg:'#fff1f2', color:'#be123c', dot:'#f43f5e'  },
  'Completed':            { bg:'#f0fdf4', color:'#065f46', dot:'#059669'  },
  'Closed':               { bg:'#f9fafb', color:'#374151', dot:'#9ca3af'  },
  // Billing statuses
  'Billing In Progress':  { bg:'#fdf4ff', color:'#7e22ce', dot:'#a855f7'  },
  'Awaiting Information (Billing)':{ bg:'#fffbeb', color:'#b45309', dot:'#f59e0b' },
  'Billing Updated':      { bg:'#f0fdf4', color:'#065f46', dot:'#059669'  },
  'Billing Exception':    { bg:'#fff1f2', color:'#be123c', dot:'#f43f5e'  },
  'Billing Complete':     { bg:'#f0fdf4', color:'#065f46', dot:'#059669'  },
}
export const CASE_STATUSES = ['Submitted','Received','In Progress','Awaiting Information','Escalated','Completed','Closed']

export const PRIORITY_CFG = {
  Low:      { bg:'#f0fdf4', color:'#15803d' },
  Medium:   { bg:'#fffbeb', color:'#b45309' },
  High:     { bg:'#fff7ed', color:'#c2410c' },
  Critical: { bg:'#fff1f2', color:'#be123c' },
}
export const PRIORITIES = ['Low','Medium','High','Critical']

export function slaStatus(slaDate, status) {
  if (['Completed','Closed','Billing Complete'].includes(status)) return 'done'
  if (!slaDate) return 'ok'
  const remaining = businessDaysRemaining(slaDate)
  if (remaining < 0)  return 'overdue'
  if (remaining === 0) return 'today'
  if (remaining <= 1)  return 'warning'
  return 'ok'
}

export function slaDiff(slaDate) {
  if (!slaDate) return 99
  return businessDaysRemaining(slaDate)
}

// ─── INITIAL CASES ────────────────────────────────────────────────────────────
export const INITIAL_CASES = []


// ─── INITIAL BILLING TASKS ─────────────────────────────────────────────────────
export const INITIAL_BILLING_TASKS = []



// ═════════════════════════════════════════════════════════════════════════════
// WORKFLOW ENGINE — sourced directly from Cases.xlsx
// Column D = Case Type name, Columns E–N = Step 1–10
// These are the ACTUAL operational workflows used by Amadwala Employee Benefits
// ═════════════════════════════════════════════════════════════════════════════

// Billing-trigger case types (final step → "Complete & Send to Billing")
const BILLING_CASE_TYPES = new Set([
  'Exit', 'New', 'Extended Funeral Application',
  'Death - Retirement', 'Disability',
  'Medical - Add Dependent', 'Medical - Removal of Dependent',
  'Medical - Plan Change', 'Medical - Cancellation',
  'Medical - Change Main Member', 'Medical - Transfer',
])

// Auto-action for final step
function finalStepAction(caseTypeName) {
  if (BILLING_CASE_TYPES.has(caseTypeName)) return 'create_billing_task'
  if (caseTypeName === 'Underwriting') return 'notify_member_update_parent'
  if (caseTypeName.startsWith('Death') || caseTypeName.startsWith('Disability')) return 'create_followup_reminder'
  return null
}

// Build a step object
function step(id, name, slaDays = 2, requiredDocs = [], autoAction = null) {
  return { id: `s${id}`, name, slaDays, requiredDocs, autoAction }
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER WORKFLOW TEMPLATES — exact copy of Cases.xlsx
// ─────────────────────────────────────────────────────────────────────────────
export const WORKFLOW_TEMPLATES = {

  // ── SECTION 1: MAIN WORKFLOWS ─────────────────────────────────────────────

  'Exit': {
    name: 'Exit', category: 'Exits', billingTrigger: true,
    steps: [
      step(1, 'Investment statement',   2, ['Investment Statement']),
      step(2, 'Consultation',           2),
      step(3, 'Obtain withdrawal form', 2, ['Withdrawal Form']),
      step(4, 'Submit',                 1, ['Submission Confirmation']),
      step(5, 'Follow-up',              5),
      step(6, 'Feedback to EE & ER',    1, [], 'create_billing_task'),
    ],
  },

  'Death - Retirement': {
    name: 'Death - Retirement', category: 'Claims', billingTrigger: false,
    requiredFields: [
      { id:'natural_unnatural', label:'Natural / Unnatural', type:'select', options:['Natural','Unnatural'], required:true },
      { id:'date_of_death',     label:'Date of Death',       type:'date',   required:true },
      { id:'relationship',      label:'Relationship to Member', type:'select', options:['Spouse','Child','Parent','Sibling','Other'], required:true },
      { id:'amount_paid',       label:'Amount Paid',         type:'currency', required:true,  reportingField:true },
      { id:'claim_number',      label:'Claim Number',        type:'text',   required:false },
      { id:'date_claim_paid',   label:'Date Claim Paid',     type:'date',   required:false },
      { id:'claim_status',      label:'Claim Status',        type:'select', options:['Pending','Approved','Paid','Declined'], required:false },
    ],
    steps: [
      step(1,  'Investment statement',  2, ['Investment Statement']),
      step(2,  'Nomination form',       2, ['Nomination Form']),
      step(3,  'Send claims pack',      1, ['Claims Pack']),
      step(4,  'Open Estate Acc',       5, ['Estate Account Confirmation']),
      step(5,  'Trust Acc - Minor',     5),
      step(6,  'Trustee resolution',    3, ['Trustee Resolution']),
      step(7,  'Follow-up',             5),
      step(8,  'Submit',                1, ['Submission Confirmation']),
      step(9,  'Follow-up',             5, [], 'create_followup_reminder'),
      step(10, 'Feedback',              1),
    ],
  },

  'Death - Funeral': {
    name: 'Death - Funeral', category: 'Claims', billingTrigger: false,
    requiredFields: [
      { id:'natural_unnatural', label:'Natural / Unnatural', type:'select', options:['Natural','Unnatural'], required:true },
      { id:'date_of_death',     label:'Date of Death',       type:'date',   required:true },
      { id:'relationship',      label:'Relationship to Member', type:'select', options:['Spouse','Child','Parent','Sibling','Other'], required:true },
      { id:'amount_paid',       label:'Amount Paid',         type:'currency', required:true,  reportingField:true },
      { id:'claim_number',      label:'Claim Number',        type:'text',   required:false },
      { id:'date_claim_paid',   label:'Date Claim Paid',     type:'date',   required:false },
      { id:'claim_status',      label:'Claim Status',        type:'select', options:['Pending','Approved','Paid','Declined'], required:false },
    ],
    steps: [
      step(1, 'Verify contribution',       1),
      step(2, 'Obtain relevant documents', 3, ['Death Certificate', 'ID Copy', 'Burial Order']),
      step(3, 'Complete form',             1, ['Completed Claim Form']),
      step(4, 'Submit',                    1, ['Submission Confirmation']),
      step(5, 'Follow-up',                 5, [], 'create_followup_reminder'),
      step(6, 'Feedback',                  1),
    ],
  },

  'Death - Accidental Funeral': {
    name: 'Death - Accidental Funeral', category: 'Claims', billingTrigger: false,
    requiredFields: [
      { id:'natural_unnatural', label:'Natural / Unnatural', type:'select', options:['Natural','Unnatural'], required:true },
      { id:'date_of_death',     label:'Date of Death',       type:'date',   required:true },
      { id:'relationship',      label:'Relationship to Member', type:'select', options:['Spouse','Child','Parent','Sibling','Other'], required:true },
      { id:'amount_paid',       label:'Amount Paid',         type:'currency', required:true,  reportingField:true },
      { id:'claim_number',      label:'Claim Number',        type:'text',   required:false },
      { id:'date_claim_paid',   label:'Date Claim Paid',     type:'date',   required:false },
      { id:'claim_status',      label:'Claim Status',        type:'select', options:['Pending','Approved','Paid','Declined'], required:false },
    ],
    steps: [
      step(1, 'Verify contribution',       1),
      step(2, 'Obtain relevant documents', 3, ['Death Certificate', 'ID Copy', 'Burial Order', 'Police Report']),
      step(3, 'Complete form',             1, ['Completed Claim Form']),
      step(4, 'Submit',                    1, ['Submission Confirmation']),
      step(5, 'Follow-up',                 5, [], 'create_followup_reminder'),
      step(6, 'Feedback',                  1),
    ],
  },

  'Death - GLA': {
    name: 'Death - GLA', category: 'Claims', billingTrigger: false,
    requiredFields: [
      { id:'natural_unnatural', label:'Natural / Unnatural', type:'select', options:['Natural','Unnatural'], required:true },
      { id:'date_of_death',     label:'Date of Death',       type:'date',   required:true },
      { id:'relationship',      label:'Relationship to Member', type:'select', options:['Spouse','Child','Parent','Sibling','Other'], required:true },
      { id:'amount_paid',       label:'Amount Paid',         type:'currency', required:true,  reportingField:true },
      { id:'claim_number',      label:'Claim Number',        type:'text',   required:false },
      { id:'date_claim_paid',   label:'Date Claim Paid',     type:'date',   required:false },
      { id:'claim_status',      label:'Claim Status',        type:'select', options:['Pending','Approved','Paid','Declined'], required:false },
    ],
    steps: [
      step(1, 'Benefit statement',   1, ['Benefit Statement']),
      step(2, 'Nomination form',     2, ['Nomination Form']),
      step(3, 'Send claims pack',    1, ['Claims Pack']),
      step(4, 'Open Estate Acc',     5, ['Estate Account Confirmation']),
      step(5, 'Trust Acc - Minor',   5),
      step(6, 'Follow-up',           5),
      step(7, 'Submit',              1, ['Submission Confirmation']),
      step(8, 'Follow-up',           5, [], 'create_followup_reminder'),
      step(9, 'Feedback',            1),
    ],
  },

  'Death - GEB': {
    name: 'Death - GEB', category: 'Claims', billingTrigger: false,
    requiredFields: [
      { id:'natural_unnatural', label:'Natural / Unnatural', type:'select', options:['Natural','Unnatural'], required:true },
      { id:'date_of_death',     label:'Date of Death',       type:'date',   required:true },
      { id:'relationship',      label:'Relationship to Member', type:'select', options:['Spouse','Child','Parent','Sibling','Other'], required:true },
      { id:'amount_paid',       label:'Amount Paid',         type:'currency', required:true,  reportingField:true },
      { id:'claim_number',      label:'Claim Number',        type:'text',   required:false },
      { id:'date_claim_paid',   label:'Date Claim Paid',     type:'date',   required:false },
      { id:'claim_status',      label:'Claim Status',        type:'select', options:['Pending','Approved','Paid','Declined'], required:false },
    ],
    steps: [
      step(1, 'Send claims pack', 1, ['Claims Pack']),
      step(2, 'Follow-up',        5),
      step(3, 'Submit',           1, ['Submission Confirmation']),
      step(4, 'Follow-up',        5, [], 'create_followup_reminder'),
      step(5, 'Feedback',         1),
    ],
  },

  'Death - GEB Review': {
    name: 'Death - GEB Review', category: 'Claims', billingTrigger: false,
    requiredFields: [
      { id:'natural_unnatural', label:'Natural / Unnatural', type:'select', options:['Natural','Unnatural'], required:true },
      { id:'date_of_death',     label:'Date of Death',       type:'date',   required:true },
      { id:'relationship',      label:'Relationship to Member', type:'select', options:['Spouse','Child','Parent','Sibling','Other'], required:true },
      { id:'amount_paid',       label:'Amount Paid',         type:'currency', required:true,  reportingField:true },
      { id:'claim_number',      label:'Claim Number',        type:'text',   required:false },
      { id:'date_claim_paid',   label:'Date Claim Paid',     type:'date',   required:false },
      { id:'claim_status',      label:'Claim Status',        type:'select', options:['Pending','Approved','Paid','Declined'], required:false },
    ],
    steps: [
      step(1, 'Send claims pack', 1, ['Claims Pack']),
      step(2, 'Follow-up',        5),
      step(3, 'Submit',           1, ['Submission Confirmation']),
      step(4, 'Follow-up',        5, [], 'create_followup_reminder'),
      step(5, 'Feedback',         1),
    ],
  },

  'Death - Extended Funeral': {
    name: 'Death - Extended Funeral', category: 'Claims', billingTrigger: false,
    requiredFields: [
      { id:'natural_unnatural', label:'Natural / Unnatural', type:'select', options:['Natural','Unnatural'], required:true },
      { id:'date_of_death',     label:'Date of Death',       type:'date',   required:true },
      { id:'relationship',      label:'Relationship to Member', type:'select', options:['Spouse','Child','Parent','Sibling','Other'], required:true },
      { id:'amount_paid',       label:'Amount Paid',         type:'currency', required:true,  reportingField:true },
      { id:'claim_number',      label:'Claim Number',        type:'text',   required:false },
      { id:'date_claim_paid',   label:'Date Claim Paid',     type:'date',   required:false },
      { id:'claim_status',      label:'Claim Status',        type:'select', options:['Pending','Approved','Paid','Declined'], required:false },
    ],
    steps: [
      step(1, 'Verify contribution',       1),
      step(2, 'Obtain relevant documents', 3, ['Death Certificate', 'ID Copy', 'Burial Order']),
      step(3, 'Complete form',             1, ['Completed Claim Form']),
      step(4, 'Submit',                    1, ['Submission Confirmation']),
      step(5, 'Follow-up',                 5),
      step(6, 'Update program',            1, [], 'create_billing_task'),
      step(7, 'Feedback',                  1),
    ],
  },

  'Disability': {
    name: 'Disability', category: 'Claims', billingTrigger: true,
    steps: [
      step(1, 'Verify benefit',         1, ['Benefit Verification']),
      step(2, 'Claims pack to ER & EE', 2, ['Claims Pack']),
      step(3, 'Follow-up',              5),
      step(4, 'Submit',                 1, ['Submission Confirmation']),
      step(5, 'Follow-up',              5, [], 'create_followup_reminder'),
      step(6, 'Feedback to EE & ER',    1),
    ],
  },

  'Disability - Review': {
    name: 'Disability - Review', category: 'Claims', billingTrigger: false,
    steps: [
      step(1, 'Send claims pack', 1, ['Claims Pack']),
      step(2, 'Follow-up',        5),
      step(3, 'Submit',           1, ['Submission Confirmation']),
      step(4, 'Follow-up',        5, [], 'create_followup_reminder'),
      step(5, 'Feedback',         1),
    ],
  },

  'Expiry': {
    name: 'Expiry', category: 'Exits', billingTrigger: false,
    steps: [
      step(1, 'Check expiry age', 1),
      step(2, 'Notify member',    1, [], 'notify_member'),
    ],
  },

  'New': {
    name: 'New', category: 'New Business', billingTrigger: true,
    steps: [
      step(1, 'Verify benefit',                              1),
      step(2, 'Consultation',                                2),
      step(3, 'Medical application',                         3, ['Medical Application Form']),
      step(4, 'Follow-up',                                   3),
      step(5, 'Submit',                                      1, ['Completed Application']),
      step(6, 'Follow-up',                                   5),
      step(7, 'Feedback to EE & ER and billing specialist',  1, [], 'create_billing_task'),
    ],
  },

  'Underwriting': {
    name: 'Underwriting', category: 'New Business', billingTrigger: false,
    steps: [
      step(1, 'Verify letter',            1, ['Underwriting Letter']),
      step(2, 'Notify member',            1, [], 'notify_member'),
      step(3, 'Arrange nurse appointment',3),
      step(4, 'First reminder',           5),
      step(5, 'Second reminder',          5),
      step(6, 'Final reminder',           5),
      step(7, 'Decision letter',          2, ['Decision Letter'], 'notify_member_update_parent'),
    ],
  },

  'Extended Funeral Application': {
    name: 'Extended Funeral Application', category: 'New Business', billingTrigger: true,
    steps: [
      step(1, 'Verify contribution', 1),
      step(2, 'QA',                  2, ['QA Checklist']),
      step(3, 'Update program',      1, [], 'create_billing_task'),
    ],
  },

  'Section 14': {
    name: 'Section 14', category: 'Fund Administration', billingTrigger: false,
    steps: [
      step(1, 'Benefit comparison',   3, ['Benefit Comparison Document']),
      step(2, 'Member communication', 2, ['Member Communication Letter']),
      step(3, 'FSCA Pack',            3, ['FSCA Pack']),
      step(4, 'Submit',               1, ['Submission Confirmation']),
      step(5, 'Follow-up',            5, [], 'create_followup_reminder'),
      step(6, 'Statements',           3, ['Statements']),
      step(7, 'Feedback',             1),
    ],
  },

  // ── SECTION 2: MEDICAL & QUERIES ──────────────────────────────────────────
  // Note from spreadsheet: "Relevant steps loaded under Query Value, Action Value
  // and Confirm Value. Ensure you remain on Action Value with all comments loaded
  // until case is resolved because on Confirm Value you will merely state
  // confirmation was sent to member."
  // Standard 3-step query workflow applies to all medical and query types.

  'Medical - Add Vitality':        { name: 'Medical - Add Vitality',        category: 'Medical & Queries', billingTrigger: false, steps: querySteps() },
  'Medical - Add Dependent':       { name: 'Medical - Add Dependent',       category: 'Medical & Queries', billingTrigger: true, steps: querySteps() },
  'Medical - Cancellation':        { name: 'Medical - Cancellation',        category: 'Medical & Queries', billingTrigger: true, steps: querySteps() },
  'Medical - Cancel Vitality':     { name: 'Medical - Cancel Vitality',     category: 'Medical & Queries', billingTrigger: false, steps: querySteps() },
  'Medical - Claim Query':         { name: 'Medical - Claim Query',         category: 'Medical & Queries', billingTrigger: false, steps: querySteps() },
  'Medical - Change Main Member':  { name: 'Medical - Change Main Member',  category: 'Medical & Queries', billingTrigger: true, steps: querySteps() },
  'Medical - Plan Change':         { name: 'Medical - Plan Change',         category: 'Medical & Queries', billingTrigger: true, steps: querySteps() },
  'Medical - Transfer':            { name: 'Medical - Transfer',            category: 'Medical & Queries', billingTrigger: true, steps: querySteps() },
  'Medical - Removal of Dependent':{ name: 'Medical - Removal of Dependent',category: 'Medical & Queries', billingTrigger: true, steps: querySteps() },
  'Query - Underwriting':          { name: 'Query - Underwriting',          category: 'Medical & Queries', billingTrigger: false, steps: querySteps() },
  'Query - Homeloan':              { name: 'Query - Homeloan',              category: 'Medical & Queries', billingTrigger: false, steps: querySteps() },
  'Query - Divorce Order':         { name: 'Query - Divorce Order',         category: 'Medical & Queries', billingTrigger: false, steps: querySteps() },
  'Query - Benefit Statement':     { name: 'Query - Benefit Statement',     category: 'Medical & Queries', billingTrigger: false, steps: querySteps() },
  'Query - Cancel Extended Cover': { name: 'Query - Cancel Extended Cover', category: 'Medical & Queries', billingTrigger: false, steps: querySteps() },
  'Query - Contribution':          { name: 'Query - Contribution',          category: 'Medical & Queries', billingTrigger: false, steps: querySteps() },
  'Query - Nomination Form':       { name: 'Query - Nomination Form',       category: 'Medical & Queries', billingTrigger: false, steps: querySteps() },
  'Query - Surname Change':        { name: 'Query - Surname Change',        category: 'Medical & Queries', billingTrigger: false, steps: querySteps() },
}

// Standard 3-step query workflow (per spreadsheet note)
function querySteps() {
  return [
    step(1, 'Query Value',   1),
    step(2, 'Action Value',  2),
    step(3, 'Confirm Value', 1, [], 'notify_member'),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// DERIVED LOOKUPS
// ─────────────────────────────────────────────────────────────────────────────

// All unique categories from templates
export const WORKFLOW_CATEGORIES = [...new Set(
  Object.values(WORKFLOW_TEMPLATES).map(t => t.category)
)]

// Case types grouped by category for the case creation picker
export const CASE_TYPES_BY_CATEGORY = WORKFLOW_CATEGORIES.reduce((acc, cat) => {
  acc[cat] = Object.values(WORKFLOW_TEMPLATES).filter(t => t.category === cat)
  return acc
}, {})

export const STEP_STATUSES = [
  'Not Started',
  'In Progress',
  'Waiting for Information',
  'Completed',
  'Skipped',
]

export const STEP_STATUS_CONFIG = {
  'Not Started':             { icon:'○',  color:'#9ca3af', bg:'#f9fafb' },
  'In Progress':             { icon:'⏳', color:'#1e5fd9', bg:'#eff6ff' },
  'Waiting for Information': { icon:'⚠',  color:'#d97706', bg:'#fffbeb' },
  'Completed':               { icon:'✓',  color:'#059669', bg:'#f0fdf4' },
  'Skipped':                 { icon:'⏭', color:'#9ca3af', bg:'#f3f4f6' },
}

// Initialise a fresh workflow instance for a new case
export function initWorkflow(caseTypeName) {
  const template = WORKFLOW_TEMPLATES[caseTypeName]
  if (!template) return null
  return {
    templateName: template.name,
    category:     template.category,
    billingTrigger: template.billingTrigger,
    steps: template.steps.map(s => ({
      ...s,
      status:      'Not Started',
      assignedTo:  null,
      startDate:   null,
      completedAt: null,
      notes:       '',
      documents:   [],
    })),
    startedAt:   new Date().toISOString(),
    completedAt: null,
  }
}

// Calculate % progress
export function workflowProgress(workflow) {
  if (!workflow?.steps?.length) return 0
  const done = workflow.steps.filter(s =>
    s.status === 'Completed' || s.status === 'Skipped'
  ).length
  return Math.round((done / workflow.steps.length) * 100)
}

// Get current active step
export function currentStep(workflow) {
  if (!workflow?.steps) return null
  return workflow.steps.find(s =>
    s.status === 'Not Started' ||
    s.status === 'In Progress' ||
    s.status === 'Waiting for Information'
  ) || null
}

// ═════════════════════════════════════════════════════════════════════════════
// EMPLOYER BENEFIT PROFILES
// Source of truth for all billing calculations per employer.
// ═════════════════════════════════════════════════════════════════════════════

export const INITIAL_BENEFIT_PROFILES = {

  'e1': {
    employerId: 'e1',
    employerName: 'Steelworks SA',
    payrollContact: 'Sandra Botha',
    effectiveDate: '2024-01-01',
    retirementAge: 65,
    billingMethod: 'Arrears',
    billingDueDate: '14th',
    paymentMethod: 'Debit Order',

    retirementFund: {
      name: 'Steelworks Provident Fund',
      fundCode: '',
      administrator: 'Alexander Forbes',
      normalRetirementAge: 65,
      administrationCost: 50.28,
      contributionCategories: [
        { category: 'Category 1', employer: 5, employee: 0 },
        { category: 'Category 2', employer: 5, employee: 2.5 },
        { category: 'Category 3', employer: 5, employee: 5 },
        { category: 'Category 4', employer: 5, employee: 7 },
      ],
    },

    groupLife: {
      administrator: 'Discovery',
      schemeNumber: '',
      benefit: '3 × Annual Salary',
      rate: 1.46,
      educationBenefit: true,
      globalEducationProtector: 'Unlimited',
      mortgageProtector: true,
      freeCoverLimit: 2000000,
      benefitExpiryAge: 65,
    },

    disability: {
      rate: 1.42,
      waitingPeriodMonths: 3,
      escalationPercent: 5,
      benefitExpiryAge: 65,
      contributionProtectorMonths: 12,
    },

    medicalAid: {
      scheme: 'Discovery Health',
      schemeNumber: '',
      billingMethod: 'Arrears',
      billingDueDate: '14th',
      paymentMethod: 'Debit Order',
      compulsory: true,
    },

    funeralCover: null,
  },

  'e6': {
    employerId: 'e6',
    employerName: 'AMCU',
    payrollContact: 'HR Department',
    effectiveDate: '2024-01-01',
    retirementAge: 65,
    billingMethod: 'Arrears',
    billingDueDate: '14th',
    paymentMethod: 'Debit Order',

    retirementFund: {
      name: 'Igula Umbrella Provident Fund',
      fundCode: '24193-44733',
      administrator: 'Alexander Forbes',
      normalRetirementAge: 65,
      administrationCost: 50.28,
      contributionCategories: [
        { category: 'Category 1', employer: 5, employee: 0 },
        { category: 'Category 2', employer: 5, employee: 2.5 },
        { category: 'Category 3', employer: 5, employee: 5 },
        { category: 'Category 4', employer: 5, employee: 7 },
      ],
    },

    groupLife: {
      administrator: 'Discovery',
      schemeNumber: '6600009630',
      benefit: '3 × Annual Salary',
      rate: 1.46,
      educationBenefit: true,
      globalEducationProtector: 'Unlimited',
      mortgageProtector: true,
      freeCoverLimit: 2000000,
      benefitExpiryAge: 65,
    },

    disability: {
      rate: 1.42,
      waitingPeriodMonths: 3,
      escalationPercent: 5,
      benefitExpiryAge: 65,
      contributionProtectorMonths: 12,
    },

    medicalAid: {
      scheme: 'Discovery Health',
      schemeNumber: '4342893',
      billingMethod: 'Arrears',
      billingDueDate: '14th',
      paymentMethod: 'Debit Order',
      compulsory: true,
    },

    funeralCover: {
      scheme: 'AMCU Family Funeral Plan',
      administrator: 'Amadwala Employee Benefits',
      memberPremium: 57,
      extendedFamilyAvailable: true,
    },
  },
}

// Empty profile template for new employers
export function emptyBenefitProfile(employerId, employerName) {
  return {
    employerId,
    employerName,
    payrollContact: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    retirementAge: 65,
    billingMethod: 'Arrears',
    billingDueDate: '14th',
    paymentMethod: 'Debit Order',
    retirementFund: { name:'', fundCode:'', administrator:'', normalRetirementAge:65, administrationCost:0, contributionCategories:[] },
    groupLife:      { administrator:'', schemeNumber:'', benefit:'', rate:0, educationBenefit:false, globalEducationProtector:'', mortgageProtector:false, freeCoverLimit:0, benefitExpiryAge:65 },
    disability:     { rate:0, waitingPeriodMonths:3, escalationPercent:5, benefitExpiryAge:65, contributionProtectorMonths:12 },
    medicalAid:     { scheme:'', schemeNumber:'', billingMethod:'Arrears', billingDueDate:'14th', paymentMethod:'Debit Order', compulsory:false },
    funeralCover:   null,
  }
}
