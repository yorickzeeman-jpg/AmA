// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
export const T = {
  green:   '#1a3d2b',
  green2:  '#2d6648',
  gold:    '#c8a84b',
  goldL:   '#f5ecd4',
  red:     '#dc2626',
  redL:    '#fef2f2',
  amber:   '#d97706',
  amberL:  '#fffbeb',
  blue:    '#1d4ed8',
  blueL:   '#eff6ff',
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
}

// ─── ROLES ───────────────────────────────────────────────────────────────────
export const ROLES = [
  { id: 'master_admin',     label: 'Master Administrator',  color: T.red    },
  { id: 'ops_manager',      label: 'Operations Manager',    color: T.green  },
  { id: 'consultant',       label: 'Consultant',            color: T.blue   },
  { id: 'claims_admin',     label: 'Claims Administrator',  color: T.purple },
  { id: 'service_admin',    label: 'Service Administrator', color: T.teal   },
  { id: 'employer_admin',   label: 'Employer Administrator',color: T.amber  },
  { id: 'employer_user',    label: 'Employer User',         color: T.amber  },
  { id: 'read_only',        label: 'Read Only',             color: T.gray   },
]

export const ROLE_PERMISSIONS = {
  master_admin:   ['all'],
  ops_manager:    ['cases:read','cases:write','cases:assign','reports:read','employers:read','workflow:read'],
  consultant:     ['cases:read','cases:write','cases:assign','reports:read'],
  claims_admin:   ['cases:read','cases:write'],
  service_admin:  ['cases:read','cases:write'],
  employer_admin: ['cases:read:own','cases:create'],
  employer_user:  ['cases:read:own','cases:create'],
  read_only:      ['cases:read','reports:read'],
}

// ─── USERS ───────────────────────────────────────────────────────────────────
export const INITIAL_USERS = [
  { id:'u1', name:'Naledi Dlamini',   email:'naledi@aeb.co.za',            role:'master_admin',   status:'active',   employer:null, avatar:'ND', joined:'2023-01-15' },
  { id:'u2', name:'Marcus van Wyk',   email:'marcus@aeb.co.za',            role:'ops_manager',    status:'active',   employer:null, avatar:'MV', joined:'2023-03-01' },
  { id:'u3', name:'Priya Naidoo',     email:'priya@aeb.co.za',             role:'consultant',     status:'active',   employer:null, avatar:'PN', joined:'2023-04-10' },
  { id:'u4', name:'Thabo Molefe',     email:'thabo@aeb.co.za',             role:'consultant',     status:'active',   employer:null, avatar:'TM', joined:'2023-05-20' },
  { id:'u5', name:'Sandra Botha',     email:'sandra@steelworks.co.za',     role:'employer_admin', status:'active',   employer:'e1', avatar:'SB', joined:'2024-01-10' },
  { id:'u6', name:'Kevin Mokoena',    email:'kevin@minetrust.co.za',       role:'employer_user',  status:'active',   employer:'e2', avatar:'KM', joined:'2024-02-15' },
  { id:'u7', name:'Ayanda Zulu',      email:'ayanda@aeb.co.za',            role:'claims_admin',   status:'active',   employer:null, avatar:'AZ', joined:'2023-06-01' },
  { id:'u8', name:'Liezel Pretorius', email:'liezel@aeb.co.za',            role:'service_admin',  status:'inactive', employer:null, avatar:'LP', joined:'2023-07-15' },
]

// ─── EMPLOYERS ────────────────────────────────────────────────────────────────
export const INITIAL_EMPLOYERS = [
  { id:'e1', name:'Steelworks SA',        number:'EMP-001', industry:'Mining & Steel', consultant:'u3', status:'active', members:4200,  contact:'Sandra Botha',       phone:'011 555 0100', email:'hr@steelworks.co.za', portal:true  },
  { id:'e2', name:'MineTrust Group',       number:'EMP-002', industry:'Mining',          consultant:'u3', status:'active', members:12500, contact:'Kevin Mokoena',       phone:'011 555 0200', email:'hr@minetrust.co.za',   portal:true  },
  { id:'e3', name:'PetroLogix',            number:'EMP-003', industry:'Petroleum',        consultant:'u4', status:'active', members:3100,  contact:'Nompumelelo Sithole', phone:'011 555 0300', email:'hr@petrologix.co.za',  portal:false },
  { id:'e4', name:'BuildRight Holdings',   number:'EMP-004', industry:'Construction',     consultant:'u3', status:'active', members:8700,  contact:'Pieter Swart',        phone:'011 555 0400', email:'hr@buildright.co.za',  portal:true  },
  { id:'e5', name:'TransAfrica Logistics', number:'EMP-005', industry:'Transport',        consultant:'u4', status:'review', members:5600,  contact:'Zanele Khumalo',      phone:'011 555 0500', email:'hr@transafrica.co.za', portal:false },
]

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
// Categories are fully configurable. They are used for grouping and reporting
// only — all business logic lives at the Case Type level.
export const INITIAL_CATEGORIES = [
  { id:'cat1', name:'Exits',              color:T.red,    description:'Member exit processing including retirement, resignation, retrenchment and death exits.' },
  { id:'cat2', name:'Claims',             color:T.purple, description:'Death, funeral, disability and retirement claim processing.' },
  { id:'cat3', name:'Entries',            color:T.blue,   description:'New member enrolment and onboarding.' },
  { id:'cat4', name:'Member Maintenance', color:T.teal,   description:'Beneficiary updates, member detail changes and reinstatements.' },
  { id:'cat5', name:'Payroll',            color:T.amber,  description:'Contribution queries, payroll reconciliation and billing.' },
  { id:'cat6', name:'Compliance',         color:T.green2, description:'Regulatory and audit compliance requirements.' },
  { id:'cat7', name:'Employer Maintenance',color:'#6366f1',description:'Employer profile, contact and portal administration.' },
  { id:'cat8', name:'Queries',            color:'#0f766e',description:'General benefit and administration queries.' },
]

// ─── CASE TYPES ───────────────────────────────────────────────────────────────
// Case Types are the PRIMARY drivers of all business logic:
// workflow stages, SLA, escalation rules, required documents, responsible teams.
// No business logic should live at category level.
export const INITIAL_CASE_TYPES = [
  // ── CLAIMS ─────────────────────────────────────────────────────────────────
  {
    id:'ct1', categoryId:'cat2', name:'Funeral Claim',
    slaDays:0.083, slaUnit:'hours', slaValue:48, slaLabel:'48 Hours',
    escalationDays:1, responsibleTeam:'Claims Team',
    requiredDocs:['Claim Form','Death Certificate','Burial Order','ID Copy of Deceased'],
    stages:[
      { id:'s1', name:'Claim Received',     owner:'claims_admin', notify:true,  requiredDocs:['Claim Form'] },
      { id:'s2', name:'Documents Verified', owner:'claims_admin', notify:true,  requiredDocs:['Death Certificate','Burial Order','ID Copy of Deceased'] },
      { id:'s3', name:'Claim Assessed',     owner:'claims_admin', notify:false, requiredDocs:[] },
      { id:'s4', name:'Payment Authorised', owner:'ops_manager',  notify:true,  requiredDocs:[] },
      { id:'s5', name:'Completed',          owner:'claims_admin', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On SLA Warning','On Completion'],
    active:true,
  },
  {
    id:'ct6', categoryId:'cat2', name:'Death Claim',
    slaDays:5, slaUnit:'business_days', slaValue:5, slaLabel:'5 Business Days',
    escalationDays:3, responsibleTeam:'Claims Team',
    requiredDocs:['Claim Form','Death Certificate','ID Copy of Deceased','Beneficiary ID Copy'],
    stages:[
      { id:'s1', name:'Claim Received',     owner:'claims_admin', notify:true,  requiredDocs:['Claim Form'] },
      { id:'s2', name:'Documents Verified', owner:'claims_admin', notify:true,  requiredDocs:['Death Certificate','ID Copy of Deceased'] },
      { id:'s3', name:'Beneficiary Check',  owner:'claims_admin', notify:false, requiredDocs:['Beneficiary ID Copy'] },
      { id:'s4', name:'Claim Assessed',     owner:'claims_admin', notify:false, requiredDocs:[] },
      { id:'s5', name:'Payment Authorised', owner:'ops_manager',  notify:true,  requiredDocs:[] },
      { id:'s6', name:'Completed',          owner:'claims_admin', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On SLA Warning','On Escalation','On Completion'],
    active:true,
  },
  {
    id:'ct9', categoryId:'cat2', name:'Disability Claim',
    slaDays:10, slaUnit:'business_days', slaValue:10, slaLabel:'10 Business Days',
    escalationDays:7, responsibleTeam:'Claims Team',
    requiredDocs:['Claim Form','Medical Report','ID Copy','Employer Confirmation'],
    stages:[
      { id:'s1', name:'Claim Received',       owner:'claims_admin', notify:true,  requiredDocs:['Claim Form'] },
      { id:'s2', name:'Medical Docs Verified',owner:'claims_admin', notify:false, requiredDocs:['Medical Report'] },
      { id:'s3', name:'Employer Confirmed',   owner:'service_admin',notify:false, requiredDocs:['Employer Confirmation'] },
      { id:'s4', name:'Claim Assessed',       owner:'claims_admin', notify:false, requiredDocs:[] },
      { id:'s5', name:'Payment Authorised',   owner:'ops_manager',  notify:true,  requiredDocs:[] },
      { id:'s6', name:'Completed',            owner:'claims_admin', notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On SLA Warning','On Escalation','On Completion'],
    active:true,
  },
  // ── EXITS ──────────────────────────────────────────────────────────────────
  {
    id:'ct2', categoryId:'cat1', name:'Retirement Exit',
    slaDays:20, slaUnit:'business_days', slaValue:20, slaLabel:'20 Business Days',
    escalationDays:15, responsibleTeam:'Exits Team',
    requiredDocs:['ID Copy','Fund Withdrawal Form','Tax Clearance','Retirement Letter'],
    stages:[
      { id:'s1', name:'Request Received',       owner:'service_admin', notify:true,  requiredDocs:['Fund Withdrawal Form'] },
      { id:'s2', name:'Documents Verified',     owner:'service_admin', notify:false, requiredDocs:['ID Copy','Tax Clearance'] },
      { id:'s3', name:'Fund Submission',         owner:'consultant',    notify:true,  requiredDocs:[] },
      { id:'s4', name:'Awaiting Fund Response', owner:'consultant',    notify:false, requiredDocs:[] },
      { id:'s5', name:'Benefit Calculation',    owner:'claims_admin',  notify:false, requiredDocs:[] },
      { id:'s6', name:'Completed',              owner:'consultant',    notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On SLA Warning','On Escalation','On Completion'],
    active:true,
  },
  {
    id:'ct3', categoryId:'cat1', name:'Resignation Exit',
    slaDays:10, slaUnit:'business_days', slaValue:10, slaLabel:'10 Business Days',
    escalationDays:7, responsibleTeam:'Exits Team',
    requiredDocs:['ID Copy','Resignation Letter','Fund Withdrawal Form'],
    stages:[
      { id:'s1', name:'Request Received',   owner:'service_admin', notify:true,  requiredDocs:['Resignation Letter'] },
      { id:'s2', name:'Documents Verified', owner:'service_admin', notify:false, requiredDocs:['ID Copy'] },
      { id:'s3', name:'Fund Submission',     owner:'consultant',    notify:true,  requiredDocs:['Fund Withdrawal Form'] },
      { id:'s4', name:'Processing',         owner:'consultant',    notify:false, requiredDocs:[] },
      { id:'s5', name:'Completed',          owner:'consultant',    notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On SLA Warning','On Completion'],
    active:true,
  },
  {
    id:'ct10', categoryId:'cat1', name:'Retrenchment Exit',
    slaDays:15, slaUnit:'business_days', slaValue:15, slaLabel:'15 Business Days',
    escalationDays:10, responsibleTeam:'Exits Team',
    requiredDocs:['ID Copy','Section 189 Notice','Retrenchment Letter','Fund Withdrawal Form'],
    stages:[
      { id:'s1', name:'Request Received',   owner:'service_admin', notify:true,  requiredDocs:['Section 189 Notice'] },
      { id:'s2', name:'Documents Verified', owner:'service_admin', notify:false, requiredDocs:['ID Copy','Retrenchment Letter'] },
      { id:'s3', name:'Fund Submission',     owner:'consultant',    notify:true,  requiredDocs:['Fund Withdrawal Form'] },
      { id:'s4', name:'Processing',         owner:'consultant',    notify:false, requiredDocs:[] },
      { id:'s5', name:'Completed',          owner:'consultant',    notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On SLA Warning','On Escalation','On Completion'],
    active:true,
  },
  {
    id:'ct11', categoryId:'cat1', name:'Death Exit',
    slaDays:5, slaUnit:'business_days', slaValue:5, slaLabel:'5 Business Days',
    escalationDays:3, responsibleTeam:'Exits Team',
    requiredDocs:['Death Certificate','ID Copy of Deceased','Next of Kin ID'],
    stages:[
      { id:'s1', name:'Notification Received', owner:'service_admin', notify:true,  requiredDocs:['Death Certificate'] },
      { id:'s2', name:'Documents Verified',    owner:'service_admin', notify:false, requiredDocs:['ID Copy of Deceased'] },
      { id:'s3', name:'Fund Notified',          owner:'consultant',    notify:true,  requiredDocs:[] },
      { id:'s4', name:'Completed',             owner:'consultant',    notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On Completion'],
    active:true,
  },
  {
    id:'ct12', categoryId:'cat1', name:'Medical Aid Exit',
    slaDays:5, slaUnit:'business_days', slaValue:5, slaLabel:'5 Business Days',
    escalationDays:3, responsibleTeam:'Exits Team',
    requiredDocs:['ID Copy','Medical Aid Termination Letter','Fund Withdrawal Form'],
    stages:[
      { id:'s1', name:'Request Received',   owner:'service_admin', notify:true,  requiredDocs:['Medical Aid Termination Letter'] },
      { id:'s2', name:'Documents Verified', owner:'service_admin', notify:false, requiredDocs:['ID Copy'] },
      { id:'s3', name:'Processing',         owner:'consultant',    notify:false, requiredDocs:['Fund Withdrawal Form'] },
      { id:'s4', name:'Completed',          owner:'consultant',    notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On Completion'],
    active:true,
  },
  // ── ENTRIES ────────────────────────────────────────────────────────────────
  {
    id:'ct4', categoryId:'cat3', name:'New Member Entry',
    slaDays:2, slaUnit:'business_days', slaValue:2, slaLabel:'2 Business Days',
    escalationDays:1, responsibleTeam:'Membership Team',
    requiredDocs:['ID Copy','Employment Contract','Enrolment Form','Beneficiary Form'],
    stages:[
      { id:'s1', name:'Received',          owner:'service_admin', notify:true,  requiredDocs:['Enrolment Form'] },
      { id:'s2', name:'Documents Checked', owner:'service_admin', notify:false, requiredDocs:['ID Copy'] },
      { id:'s3', name:'Fund Registration', owner:'consultant',    notify:true,  requiredDocs:[] },
      { id:'s4', name:'Confirmed',         owner:'consultant',    notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Completion'],
    active:true,
  },
  // ── MEMBER MAINTENANCE ─────────────────────────────────────────────────────
  {
    id:'ct5', categoryId:'cat4', name:'Beneficiary Update',
    slaDays:2, slaUnit:'business_days', slaValue:2, slaLabel:'2 Business Days',
    escalationDays:1, responsibleTeam:'Membership Team',
    requiredDocs:['Beneficiary Nomination Form','ID Copy of Beneficiary'],
    stages:[
      { id:'s1', name:'Request Received', owner:'service_admin', notify:true,  requiredDocs:['Beneficiary Nomination Form'] },
      { id:'s2', name:'Verified',         owner:'service_admin', notify:false, requiredDocs:['ID Copy of Beneficiary'] },
      { id:'s3', name:'Updated',          owner:'consultant',    notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Completion'],
    active:true,
  },
  {
    id:'ct13', categoryId:'cat4', name:'Member Detail Update',
    slaDays:2, slaUnit:'business_days', slaValue:2, slaLabel:'2 Business Days',
    escalationDays:1, responsibleTeam:'Membership Team',
    requiredDocs:['Member Detail Change Form','Supporting Document'],
    stages:[
      { id:'s1', name:'Request Received', owner:'service_admin', notify:true,  requiredDocs:['Member Detail Change Form'] },
      { id:'s2', name:'Verified',         owner:'service_admin', notify:false, requiredDocs:[] },
      { id:'s3', name:'Updated',          owner:'consultant',    notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Completion'],
    active:true,
  },
  // ── PAYROLL ────────────────────────────────────────────────────────────────
  {
    id:'ct7', categoryId:'cat5', name:'Payroll Reconciliation',
    slaDays:3, slaUnit:'business_days', slaValue:3, slaLabel:'3 Business Days',
    escalationDays:2, responsibleTeam:'Payroll Team',
    requiredDocs:['Payroll Schedule','Variance Report'],
    stages:[
      { id:'s1', name:'Query Received', owner:'service_admin', notify:true,  requiredDocs:['Payroll Schedule'] },
      { id:'s2', name:'Under Review',   owner:'consultant',    notify:false, requiredDocs:[] },
      { id:'s3', name:'Reconciled',     owner:'consultant',    notify:true,  requiredDocs:[] },
      { id:'s4', name:'Closed',         owner:'consultant',    notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Completion'],
    active:true,
  },
  {
    id:'ct14', categoryId:'cat5', name:'Contribution Query',
    slaDays:3, slaUnit:'business_days', slaValue:3, slaLabel:'3 Business Days',
    escalationDays:2, responsibleTeam:'Payroll Team',
    requiredDocs:['Contribution Schedule'],
    stages:[
      { id:'s1', name:'Query Received', owner:'service_admin', notify:true,  requiredDocs:['Contribution Schedule'] },
      { id:'s2', name:'Under Review',   owner:'consultant',    notify:false, requiredDocs:[] },
      { id:'s3', name:'Resolved',       owner:'consultant',    notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Completion'],
    active:true,
  },
  // ── COMPLIANCE ─────────────────────────────────────────────────────────────
  {
    id:'ct8', categoryId:'cat6', name:'Compliance Audit',
    slaDays:10, slaUnit:'business_days', slaValue:10, slaLabel:'10 Business Days',
    escalationDays:7, responsibleTeam:'Compliance Team',
    requiredDocs:['Board Resolution','FSP Certificate','Compliance Report'],
    stages:[
      { id:'s1', name:'Request Received', owner:'consultant',    notify:true,  requiredDocs:[] },
      { id:'s2', name:'Docs Requested',   owner:'consultant',    notify:true,  requiredDocs:['Board Resolution'] },
      { id:'s3', name:'Docs Received',    owner:'service_admin', notify:false, requiredDocs:['FSP Certificate','Compliance Report'] },
      { id:'s4', name:'Under Review',     owner:'ops_manager',   notify:false, requiredDocs:[] },
      { id:'s5', name:'Closed',           owner:'ops_manager',   notify:true,  requiredDocs:[] },
    ],
    notifications:['On Submission','On Stage Change','On SLA Warning','On Escalation','On Completion'],
    active:true,
  },
]

// ─── CASES ────────────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]
}
function daysFromNow(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]
}
function genRef() {
  return 'AEB-' + String(Date.now()).slice(-5)
}
export { daysAgo, daysFromNow, genRef }

export const INITIAL_CASES = [
  {
    id:'c1', ref:'AEB-00001', caseTypeId:'ct1', employerId:'e1',
    status:'In Progress', priority:'Critical',
    assignedTo:'u7', createdBy:'u5',
    memberName:'Sipho Zulu', memberId:'7809125432088',
    currentStage:1, stageHistory:['s1'],
    created:daysAgo(2), slaDate:daysFromNow(0),
    description:'Funeral claim following death of member on 7 June 2026.',
    notes:[{ user:'u7', date:daysAgo(1), text:'Death certificate received. Burial order outstanding.' }],
    documents:[{ name:'Claim_Form_Zulu.pdf', size:'0.8 MB', uploadedBy:'u5', date:daysAgo(2) }],
    audit:[
      { time:new Date(Date.now()-172800000).toISOString(), user:'u5', action:'Case AEB-00001 created', type:'create' },
      { time:new Date(Date.now()-169200000).toISOString(), user:'u2', action:'Assigned to Ayanda Zulu', type:'assign' },
      { time:new Date(Date.now()-86400000 ).toISOString(), user:'u7', action:'Stage advanced to "Documents Verified"', type:'stage' },
    ],
    escalated:false, ownerHistory:[{ user:'u7', from:daysAgo(2) }],
  },
  {
    id:'c2', ref:'AEB-00002', caseTypeId:'ct2', employerId:'e1',
    status:'Awaiting Information', priority:'High',
    assignedTo:'u3', createdBy:'u5',
    memberName:'Thandi Nkosi', memberId:'8802143219087',
    currentStage:1, stageHistory:['s1'],
    created:daysAgo(5), slaDate:daysFromNow(14),
    description:'Member retiring at end of June 2026 after 32 years of service.',
    notes:[], documents:[{ name:'Retirement_Form_Nkosi.pdf', size:'1.2 MB', uploadedBy:'u5', date:daysAgo(5) }],
    audit:[
      { time:new Date(Date.now()-432000000).toISOString(), user:'u5', action:'Case AEB-00002 created', type:'create' },
      { time:new Date(Date.now()-428400000).toISOString(), user:'u2', action:'Assigned to Priya Naidoo', type:'assign' },
    ],
    escalated:false, ownerHistory:[{ user:'u3', from:daysAgo(5) }],
  },
  {
    id:'c3', ref:'AEB-00003', caseTypeId:'ct4', employerId:'e4',
    status:'In Progress', priority:'Medium',
    assignedTo:'u4', createdBy:'u1',
    memberName:'Batch: 45 New Members', memberId:null,
    currentStage:2, stageHistory:['s1','s2'],
    created:daysAgo(1), slaDate:daysFromNow(1),
    description:'New member batch from BuildRight Vereeniging plant expansion.',
    notes:[{ user:'u4', date:daysAgo(0), text:'3 ID copies still outstanding from batch.' }],
    documents:[
      { name:'Enrolment_Forms_Batch.zip', size:'4.2 MB', uploadedBy:'u1', date:daysAgo(1) },
      { name:'ID_Docs_Partial.zip',       size:'2.1 MB', uploadedBy:'u1', date:daysAgo(0) },
    ],
    audit:[
      { time:new Date(Date.now()-86400000).toISOString(), user:'u1', action:'Case AEB-00003 created',               type:'create' },
      { time:new Date(Date.now()-82800000).toISOString(), user:'u2', action:'Assigned to Thabo Molefe',              type:'assign' },
      { time:new Date(Date.now()-43200000).toISOString(), user:'u4', action:'Stage advanced to "Documents Checked"', type:'stage'  },
    ],
    escalated:false, ownerHistory:[{ user:'u4', from:daysAgo(1) }],
  },
  {
    id:'c4', ref:'AEB-00004', caseTypeId:'ct8', employerId:'e1',
    status:'Escalated', priority:'High',
    assignedTo:'u3', createdBy:'u3',
    memberName:null, memberId:null,
    currentStage:1, stageHistory:['s1'],
    created:daysAgo(12), slaDate:daysFromNow(-3),
    description:'Annual FSP compliance audit — board resolution overdue.',
    notes:[{ user:'u2', date:daysAgo(1), text:'SLA breached. Escalated to management. Employer follow-up required.' }],
    documents:[],
    audit:[
      { time:new Date(Date.now()-1036800000).toISOString(), user:'u3', action:'Case AEB-00004 created', type:'create'   },
      { time:new Date(Date.now()- 259200000).toISOString(), user:'u2', action:'SLA breach — escalated', type:'escalate' },
    ],
    escalated:true, ownerHistory:[{ user:'u3', from:daysAgo(12) }],
  },
  {
    id:'c5', ref:'AEB-00005', caseTypeId:'ct7', employerId:'e4',
    status:'Completed', priority:'Medium',
    assignedTo:'u4', createdBy:'u1',
    memberName:null, memberId:null,
    currentStage:3, stageHistory:['s1','s2','s3','s4'],
    created:daysAgo(10), slaDate:daysAgo(7),
    description:'May 2026 payroll reconciliation — R14,200 discrepancy resolved.',
    notes:[], documents:[{ name:'May_Payroll_Recon.xlsx', size:'2.3 MB', uploadedBy:'u1', date:daysAgo(10) }],
    audit:[
      { time:new Date(Date.now()-864000000).toISOString(), user:'u1', action:'Case AEB-00005 created',        type:'create' },
      { time:new Date(Date.now()-777600000).toISOString(), user:'u4', action:'Stage advanced to "Under Review"', type:'stage' },
      { time:new Date(Date.now()-691200000).toISOString(), user:'u4', action:'Stage advanced to "Reconciled"',   type:'stage' },
      { time:new Date(Date.now()-604800000).toISOString(), user:'u4', action:'Stage advanced to "Closed"',       type:'stage' },
    ],
    escalated:false, ownerHistory:[{ user:'u4', from:daysAgo(10) }],
  },
  {
    id:'c6', ref:'AEB-00006', caseTypeId:'ct6', employerId:'e2',
    status:'In Progress', priority:'High',
    assignedTo:'u7', createdBy:'u6',
    memberName:'Johannes Pretorius', memberId:'6507124512083',
    currentStage:2, stageHistory:['s1','s2'],
    created:daysAgo(3), slaDate:daysFromNow(2),
    description:'Death claim — member deceased 5 June 2026. Beneficiary to be confirmed.',
    notes:[], documents:[{ name:'Death_Cert_Pretorius.pdf', size:'0.5 MB', uploadedBy:'u6', date:daysAgo(3) }],
    audit:[
      { time:new Date(Date.now()-259200000).toISOString(), user:'u6', action:'Case AEB-00006 created',                  type:'create' },
      { time:new Date(Date.now()-172800000).toISOString(), user:'u7', action:'Stage advanced to "Beneficiary Check"',    type:'stage'  },
    ],
    escalated:false, ownerHistory:[{ user:'u7', from:daysAgo(3) }],
  },
  {
    id:'c7', ref:'AEB-00007', caseTypeId:'ct10', employerId:'e5',
    status:'Submitted', priority:'Low',
    assignedTo:'', createdBy:'u4',
    memberName:'Batch: 32 Retrenchments', memberId:null,
    currentStage:0, stageHistory:[],
    created:daysAgo(0), slaDate:daysFromNow(15),
    description:'Section 189 retrenchment — 32 members exiting TransAfrica Logistics.',
    notes:[], documents:[
      { name:'Section189_Notices.pdf', size:'3.7 MB', uploadedBy:'u4', date:daysAgo(0) },
      { name:'Exit_Member_List.xlsx',  size:'0.9 MB', uploadedBy:'u4', date:daysAgo(0) },
    ],
    audit:[
      { time:new Date().toISOString(), user:'u4', action:'Case AEB-00007 created', type:'create' },
    ],
    escalated:false, ownerHistory:[],
  },
]

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
export const STATUS_CFG = {
  'Submitted':           { bg:'#f0f9ff', color:'#0369a1', dot:'#0ea5e9'  },
  'In Progress':         { bg:'#eff6ff', color:'#1d4ed8', dot:'#3b82f6'  },
  'Awaiting Information':{ bg:'#fffbeb', color:'#b45309', dot:'#f59e0b'  },
  'Processing':          { bg:'#f0fdf4', color:'#166534', dot:'#16a34a'  },
  'Escalated':           { bg:'#fff1f2', color:'#be123c', dot:'#f43f5e'  },
  'Completed':           { bg:'#f0fdf4', color:'#065f46', dot:'#059669'  },
  'Closed':              { bg:'#f9fafb', color:'#374151', dot:'#9ca3af'  },
}
export const CASE_STATUSES = Object.keys(STATUS_CFG)

export const PRIORITY_CFG = {
  Low:      { bg:'#f0fdf4', color:'#15803d' },
  Medium:   { bg:'#fffbeb', color:'#b45309' },
  High:     { bg:'#fff7ed', color:'#c2410c' },
  Critical: { bg:'#fff1f2', color:'#be123c' },
}
export const PRIORITIES = ['Low','Medium','High','Critical']

// ─── SLA HELPERS ─────────────────────────────────────────────────────────────
export function slaStatus(slaDate, status) {
  if (['Completed','Closed'].includes(status)) return 'done'
  const diff = Math.ceil((new Date(slaDate) - new Date()) / 86400000)
  if (diff < 0)  return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 2)  return 'warning'
  return 'ok'
}
export function slaDiff(slaDate) {
  return Math.ceil((new Date(slaDate) - new Date()) / 86400000)
}

// ─── SLA DUE DATE CALCULATOR ─────────────────────────────────────────────────
// Calculates due date from a Case Type's SLA configuration.
// All SLA logic is driven by the Case Type — never hardcoded elsewhere.
export function calcSlaDate(caseType) {
  const d = new Date()
  if (caseType.slaUnit === 'hours') {
    d.setTime(d.getTime() + caseType.slaValue * 3600000)
  } else {
    // business_days: add calendar days (simplified — extend for public holidays)
    d.setDate(d.getDate() + (caseType.slaDays || 5))
  }
  return d.toISOString().split('T')[0]
}
