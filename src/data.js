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
  { id:'u1', name:'Leandre van der Merwe', email:'leandre@amadwala.co.za',  role:'general_manager', status:'active', employer:null, avatar:'LV', joined:'2022-01-01',
    allocation:{ directTypes:['ct_underwriting'], pool:null, excludeTypes:[] } },
  { id:'u2', name:'Nokulunga Nyundu',      email:'nokulunga@amadwala.co.za', role:'administrator',   status:'active', employer:null, avatar:'NN', joined:'2022-03-01',
    allocation:{ directTypes:[], pool:'general', excludeTypes:['ct_underwriting'] } },
  { id:'u3', name:'Tevin Nxumalo',         email:'tevin@amadwala.co.za',     role:'administrator',   status:'active', employer:null, avatar:'TN', joined:'2022-06-01',
    allocation:{ directTypes:[], pool:'general', excludeTypes:['ct_underwriting','ct_amcu_funeral'] } },
  { id:'u4', name:'Sesi Phiri',            email:'sesi@amadwala.co.za',      role:'administrator',   status:'active', employer:null, avatar:'SP', joined:'2023-01-01',
    allocation:{ directTypes:['ct_amcu_funeral','ct_benefit_statement','ct_beneficiary'], pool:null, excludeTypes:[] } },
  { id:'u5', name:'Daleen Taute',          email:'daleen@amadwala.co.za',    role:'billing_admin',   status:'active', employer:null, avatar:'DT', joined:'2022-01-01',
    allocation:{ directTypes:['ct_extended_funeral'], pool:'billing', excludeTypes:[] } },
  { id:'u6', name:'Mahlatse Manyathi',     email:'mahlatse@amadwala.co.za',  role:'administrator',   status:'active', employer:null, avatar:'MM', joined:'2023-04-01',
    allocation:{ directTypes:[], pool:'general', excludeTypes:['ct_underwriting'] } },
  { id:'u7', name:'Ithasia',               email:'ithasia@amadwala.co.za',   role:'billing_admin',   status:'active', employer:null, avatar:'IT', joined:'2023-06-01',
    allocation:{ directTypes:[], pool:'billing', excludeTypes:[] } },
  // Employer contacts
  { id:'u10', name:'Sandra Botha',     email:'sandra@steelworks.co.za',   role:'employer_admin', status:'active', employer:'e1', avatar:'SB', joined:'2024-01-10', allocation:null },
  { id:'u11', name:'Kevin Mokoena',    email:'kevin@minetrust.co.za',     role:'employer_user',  status:'active', employer:'e2', avatar:'KM', joined:'2024-02-15', allocation:null },
  { id:'u12', name:'Pieter Swart',     email:'pieter@buildright.co.za',   role:'employer_admin', status:'active', employer:'e4', avatar:'PS', joined:'2024-03-01', allocation:null },
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
export const INITIAL_EMPLOYERS = [
  { id:'e1', name:'Steelworks SA',         number:'EMP-001', industry:'Mining & Steel',  status:'active', members:4200,  contact:'Sandra Botha',       phone:'011 555 0100', email:'hr@steelworks.co.za',  portal:true  },
  { id:'e2', name:'MineTrust Group',        number:'EMP-002', industry:'Mining',           status:'active', members:12500, contact:'Kevin Mokoena',       phone:'011 555 0200', email:'hr@minetrust.co.za',    portal:true  },
  { id:'e3', name:'PetroLogix',             number:'EMP-003', industry:'Petroleum',         status:'active', members:3100,  contact:'Nompumelelo Sithole', phone:'011 555 0300', email:'hr@petrologix.co.za',   portal:false },
  { id:'e4', name:'BuildRight Holdings',    number:'EMP-004', industry:'Construction',      status:'active', members:8700,  contact:'Pieter Swart',        phone:'011 555 0400', email:'hr@buildright.co.za',   portal:true  },
  { id:'e5', name:'TransAfrica Logistics',  number:'EMP-005', industry:'Transport',         status:'review', members:5600,  contact:'Zanele Khumalo',      phone:'011 555 0500', email:'hr@transafrica.co.za',  portal:false },
  { id:'e6', name:'AMCU',                   number:'EMP-006', industry:'Trade Union',       status:'active', members:71000, contact:'HR Department',       phone:'011 555 0600', email:'hr@amcu.co.za',         portal:true  },
]

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

// ─── HELPERS ─────────────────────────────────────────────────────────────────
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
    d.setTime(d.getTime() + (caseType.slaValue || 48) * 3600000)
  } else {
    d.setDate(d.getDate() + (caseType.slaDays || 5))
  }
  return d.toISOString().split('T')[0]
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
  const diff = Math.ceil((new Date(slaDate) - new Date()) / 86400000)
  if (diff < 0)  return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 2)  return 'warning'
  return 'ok'
}
export function slaDiff(slaDate) {
  return Math.ceil((new Date(slaDate) - new Date()) / 86400000)
}

// ─── INITIAL CASES ────────────────────────────────────────────────────────────
export const INITIAL_CASES = [
  {
    id:'c1', ref:'AEB-001001', workspace:'employer',
    caseTypeId:'ct_amcu_funeral', employerId:'e6',
    status:'In Progress', priority:'Critical',
    assignedTo:'u4', createdBy:'u10',
    memberName:'Sipho Zulu', memberId:'7809125432088',
    currentStage:1, stageHistory:['s1'],
    created:daysAgo(1), slaDate:daysFromNow(0),
    description:'Funeral claim following death of member on duty.',
    billingTaskId:null,
    notes:[{ user:'u4', date:daysAgo(0), text:'Death certificate received. Burial order still outstanding.' }],
    documents:[{ name:'Claim_Form_Zulu.pdf', size:'0.8 MB', uploadedBy:'u10', date:daysAgo(1) }],
    audit:[
      { time:new Date(Date.now()-86400000).toISOString(), user:'u10', action:'Case AEB-001001 created', type:'create' },
      { time:new Date(Date.now()-84600000).toISOString(), user:'system', action:'Auto-assigned to Sesi Phiri', type:'assign' },
      { time:new Date(Date.now()-43200000).toISOString(), user:'u4', action:'Stage advanced to "Documents Verified"', type:'stage' },
    ],
    escalated:false, ownerHistory:[{ user:'u4', from:daysAgo(1) }],
  },
  {
    id:'c2', ref:'AEB-001002', workspace:'employer',
    caseTypeId:'ct_new_employee', employerId:'e1',
    status:'In Progress', priority:'Medium',
    assignedTo:'u2', createdBy:'u10',
    memberName:'Batch: 12 New Employees', memberId:null,
    currentStage:1, stageHistory:['s1'],
    created:daysAgo(1), slaDate:daysFromNow(1),
    description:'New employee batch from Steelworks SA — Vereeniging plant.',
    billingTaskId:null,
    notes:[], documents:[{ name:'Enrolment_Batch_SW.zip', size:'3.2 MB', uploadedBy:'u10', date:daysAgo(1) }],
    audit:[
      { time:new Date(Date.now()-86400000).toISOString(), user:'u10', action:'Case AEB-001002 created', type:'create' },
      { time:new Date(Date.now()-85000000).toISOString(), user:'system', action:'Auto-assigned to Nokulunga Nyundu (Round Robin)', type:'assign' },
    ],
    escalated:false, ownerHistory:[{ user:'u2', from:daysAgo(1) }],
  },
  {
    id:'c3', ref:'AEB-001003', workspace:'employer',
    caseTypeId:'ct_exit_employee', employerId:'e5',
    status:'Awaiting Information', priority:'Medium',
    assignedTo:'u6', createdBy:'u10',
    memberName:'Batch: 32 Exits (Section 189)', memberId:null,
    currentStage:1, stageHistory:['s1'],
    created:daysAgo(3), slaDate:daysFromNow(2),
    description:'Section 189 retrenchment — TransAfrica Logistics.',
    billingTaskId:null,
    notes:[{ user:'u6', date:daysAgo(1), text:'Termination letters outstanding for 8 members.' }],
    documents:[{ name:'Exit_List_TA.xlsx', size:'1.1 MB', uploadedBy:'u10', date:daysAgo(3) }],
    audit:[
      { time:new Date(Date.now()-259200000).toISOString(), user:'u10', action:'Case AEB-001003 created', type:'create' },
      { time:new Date(Date.now()-259000000).toISOString(), user:'system', action:'Auto-assigned to Mahlatse Manyathi (Round Robin)', type:'assign' },
    ],
    escalated:false, ownerHistory:[{ user:'u6', from:daysAgo(3) }],
  },
  {
    id:'c4', ref:'AEB-001004', workspace:'employer',
    caseTypeId:'ct_beneficiary', employerId:'e2',
    status:'Submitted', priority:'Low',
    assignedTo:'u4', createdBy:'u11',
    memberName:'Thabo Dlamini', memberId:'8802143219087',
    currentStage:0, stageHistory:[],
    created:daysAgo(0), slaDate:daysFromNow(2),
    description:'Beneficiary nomination update — new spouse added.',
    billingTaskId:null,
    notes:[], documents:[{ name:'Beneficiary_Form_Dlamini.pdf', size:'0.4 MB', uploadedBy:'u11', date:daysAgo(0) }],
    audit:[
      { time:new Date().toISOString(), user:'u11', action:'Case AEB-001004 created', type:'create' },
      { time:new Date().toISOString(), user:'system', action:'Auto-assigned to Sesi Phiri (Direct)', type:'assign' },
    ],
    escalated:false, ownerHistory:[{ user:'u4', from:daysAgo(0) }],
  },
  {
    id:'c5', ref:'AEB-001005', workspace:'employer',
    caseTypeId:'ct_new_employee', employerId:'e4',
    status:'Sent to Billing', priority:'Medium',
    assignedTo:'u5', createdBy:'u12',
    memberName:'Pieter Joubert', memberId:'9001015432083',
    currentStage:3, stageHistory:['s1','s2','s3'],
    created:daysAgo(4), slaDate:daysFromNow(0),
    description:'New employee — BuildRight Holdings, site supervisor role.',
    billingTaskId:'bt1',
    notes:[], documents:[{ name:'Enrolment_Joubert.pdf', size:'0.9 MB', uploadedBy:'u12', date:daysAgo(4) }],
    audit:[
      { time:new Date(Date.now()-345600000).toISOString(), user:'u12', action:'Case AEB-001005 created', type:'create' },
      { time:new Date(Date.now()-300000000).toISOString(), user:'u3', action:'Stage advanced to "Documents Verified"', type:'stage' },
      { time:new Date(Date.now()-200000000).toISOString(), user:'u3', action:'Stage advanced to "Member Captured"', type:'stage' },
      { time:new Date(Date.now()-100000000).toISOString(), user:'u3', action:'Complete & Send to Billing — Billing Task bt1 created', type:'billing' },
    ],
    escalated:false, ownerHistory:[{ user:'u3', from:daysAgo(4) },{ user:'u5', from:daysAgo(1) }],
  },
  // Internal case
  {
    id:'c6', ref:'AEB-INT001', workspace:'internal',
    caseTypeId:'ct_underwriting', employerId:'e2',
    status:'In Progress', priority:'High',
    assignedTo:'u1', createdBy:'u2',
    memberName:'Johannes Pretorius', memberId:'6507124512083',
    currentStage:1, stageHistory:['s1'],
    created:daysAgo(2), slaDate:daysFromNow(7),
    description:'Medical underwriting required — member over 65 joining MineTrust Group.',
    billingTaskId:null, linkedCaseId:null,
    notes:[{ user:'u1', date:daysAgo(1), text:'Medical report received. Review in progress.' }],
    documents:[{ name:'Medical_Report_Pretorius.pdf', size:'2.1 MB', uploadedBy:'u2', date:daysAgo(2) }],
    audit:[
      { time:new Date(Date.now()-172800000).toISOString(), user:'u2', action:'Internal Case AEB-INT001 created', type:'create' },
      { time:new Date(Date.now()-172000000).toISOString(), user:'system', action:'Auto-assigned to Leandre van der Merwe (Direct)', type:'assign' },
    ],
    escalated:false, ownerHistory:[{ user:'u1', from:daysAgo(2) }],
  },
]

// ─── INITIAL BILLING TASKS ─────────────────────────────────────────────────────
export const INITIAL_BILLING_TASKS = [
  {
    id:'bt1', ref:'BT-001001',
    linkedCaseId:'c5', linkedCaseRef:'AEB-001005',
    employerId:'e4', memberName:'Pieter Joubert',
    transactionType:'New Employee',
    effectiveDate: daysFromNow(-4),
    assignedTo:'u5',
    status:'Billing In Progress',
    priority:'Medium',
    createdBy:'u3',
    created:daysAgo(1),
    notes:[],
    audit:[
      { time:new Date(Date.now()-86400000).toISOString(), user:'u3', action:'Billing Task BT-001001 created from AEB-001005', type:'create' },
      { time:new Date(Date.now()-86000000).toISOString(), user:'system', action:'Assigned to Daleen Taute (Billing Pool)', type:'assign' },
    ],
  },
]
