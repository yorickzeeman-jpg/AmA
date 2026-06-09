export const USERS = {
  super_admin:      { id: 'u1', name: 'Naledi Dlamini',   role: 'super_admin',      avatar: 'ND', email: 'naledi@benefitspro.co.za' },
  ops_manager:      { id: 'u2', name: 'Marcus van Wyk',   role: 'ops_manager',       avatar: 'MV', email: 'marcus@benefitspro.co.za' },
  consultant:       { id: 'u3', name: 'Priya Naidoo',     role: 'consultant',        avatar: 'PN', email: 'priya@benefitspro.co.za' },
  admin:            { id: 'u4', name: 'Thabo Molefe',     role: 'admin',             avatar: 'TM', email: 'thabo@benefitspro.co.za' },
  employer_hr:      { id: 'u5', name: 'Sandra Botha',     role: 'employer_hr',       avatar: 'SB', email: 'sandra@steelworks.co.za',  employer: 'Steelworks SA' },
  employer_payroll: { id: 'u6', name: 'Kevin Mokoena',    role: 'employer_payroll',  avatar: 'KM', email: 'kevin@minetrust.co.za',    employer: 'MineTrust Group' },
}

export const EMPLOYERS = [
  { id: 'e1', name: 'Steelworks SA',          members: 4200,  status: 'active', consultant: 'Priya Naidoo',  industry: 'Mining & Steel' },
  { id: 'e2', name: 'MineTrust Group',         members: 12500, status: 'active', consultant: 'Priya Naidoo',  industry: 'Mining' },
  { id: 'e3', name: 'PetroLogix',              members: 3100,  status: 'active', consultant: 'Thabo Molefe',  industry: 'Petroleum' },
  { id: 'e4', name: 'BuildRight Holdings',     members: 8700,  status: 'active', consultant: 'Priya Naidoo',  industry: 'Construction' },
  { id: 'e5', name: 'TransAfrica Logistics',   members: 5600,  status: 'review', consultant: 'Thabo Molefe',  industry: 'Transport' },
]

export const REQUEST_TYPES = {
  membership: {
    label: 'Membership Administration', color: '#6366f1', bg: '#eef2ff',
    types: ['New Member Entry', 'Member Exit', 'Beneficiary Update', 'Member Detail Update', 'Reinstatement', 'Category Change'],
  },
  claims: {
    label: 'Claims Administration', color: '#dc2626', bg: '#fef2f2',
    types: ['Funeral Claim', 'Death Claim', 'Disability Claim', 'Withdrawal Claim', 'Retirement Claim'],
  },
  payroll: {
    label: 'Payroll Administration', color: '#d97706', bg: '#fffbeb',
    types: ['Contribution Query', 'Payroll Reconciliation', 'Billing Query', 'Membership Reconciliation'],
  },
  employer_support: {
    label: 'Employer Support', color: '#0891b2', bg: '#ecfeff',
    types: ['Benefit Query', 'General Administration Query', 'Employer Visit Request', 'Training Request'],
  },
  compliance: {
    label: 'Compliance Administration', color: '#7c3aed', bg: '#f5f3ff',
    types: ['Outstanding Documents', 'Audit Requests', 'Regulatory Requests'],
  },
}

export const STATUSES = [
  'Submitted', 'Received', 'Assigned', 'In Progress',
  'Awaiting Information', 'Processing', 'Completed', 'Closed', 'Escalated',
]

export const STATUS_COLORS = {
  'Submitted':           { bg: '#f0f9ff', color: '#0369a1', dot: '#0ea5e9' },
  'Received':            { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  'Assigned':            { bg: '#faf5ff', color: '#7e22ce', dot: '#a855f7' },
  'In Progress':         { bg: '#eff6ff', color: '#1d4ed8', dot: '#3b82f6' },
  'Awaiting Information':{ bg: '#fffbeb', color: '#b45309', dot: '#f59e0b' },
  'Processing':          { bg: '#f0fdf4', color: '#166534', dot: '#16a34a' },
  'Completed':           { bg: '#f0fdf4', color: '#065f46', dot: '#059669' },
  'Closed':              { bg: '#f9fafb', color: '#374151', dot: '#9ca3af' },
  'Escalated':           { bg: '#fff1f2', color: '#be123c', dot: '#f43f5e' },
}

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

export const PRIORITY_COLORS = {
  Low:      { bg: '#f0fdf4', color: '#15803d' },
  Medium:   { bg: '#fffbeb', color: '#b45309' },
  High:     { bg: '#fff7ed', color: '#c2410c' },
  Critical: { bg: '#fff1f2', color: '#be123c' },
}

function daysFromNow(d) {
  const n = new Date()
  n.setDate(n.getDate() + d)
  return n.toISOString().split('T')[0]
}

export function genRef() {
  return 'BPR-' + Date.now().toString(36).toUpperCase().slice(-6)
}

export const INITIAL_REQUESTS = [
  {
    id: 'r1', ref: 'BPR-A1B2C3', employer: 'Steelworks SA', employerId: 'e1',
    category: 'membership', type: 'New Member Entry', status: 'In Progress',
    priority: 'High', assigned: 'Priya Naidoo', contact: 'Sandra Botha',
    created: '2026-06-01', sla: daysFromNow(2),
    description: 'Onboarding 45 new members from the Vereeniging plant expansion. ID docs and nomination forms attached.',
    notes: [],
    documents: [
      { name: 'ID_Documents_Batch.zip', size: '4.2 MB', date: '2026-06-01' },
      { name: 'Nomination_Forms.pdf',   size: '1.1 MB', date: '2026-06-01' },
    ],
    timeline: [
      { time: '08:15', date: '2026-06-01', user: 'Sandra Botha',  action: 'Request submitted',                                          type: 'submitted' },
      { time: '08:42', date: '2026-06-01', user: 'System',         action: 'Auto-assigned to Priya Naidoo',                              type: 'assign'    },
      { time: '09:10', date: '2026-06-02', user: 'Priya Naidoo',  action: 'Reviewed — 3 ID copies missing. Information requested.',     type: 'info'      },
      { time: '11:30', date: '2026-06-02', user: 'Sandra Botha',  action: 'Missing ID copies uploaded.',                                type: 'upload'    },
      { time: '09:00', date: '2026-06-03', user: 'Priya Naidoo',  action: 'Processing started',                                         type: 'progress'  },
    ],
  },
  {
    id: 'r2', ref: 'BPR-D4E5F6', employer: 'MineTrust Group', employerId: 'e2',
    category: 'claims', type: 'Funeral Claim', status: 'Awaiting Information',
    priority: 'Critical', assigned: 'Priya Naidoo', contact: 'Kevin Mokoena',
    created: '2026-06-05', sla: daysFromNow(1),
    description: 'Funeral claim for deceased member Sipho Zulu (ID: 7809125432088). Death certificate and burial order required.',
    notes: [{ user: 'Priya Naidoo', date: '2026-06-06', text: 'Family contacted. Documents expected by end of day.' }],
    documents: [{ name: 'Claim_Form_Zulu.pdf', size: '0.8 MB', date: '2026-06-05' }],
    timeline: [
      { time: '14:30', date: '2026-06-05', user: 'Kevin Mokoena', action: 'Claim submitted',                                            type: 'submitted' },
      { time: '14:35', date: '2026-06-05', user: 'System',         action: 'Priority set to Critical — death claim SLA triggered',      type: 'escalate'  },
      { time: '15:00', date: '2026-06-05', user: 'Priya Naidoo',  action: 'Assigned and reviewed. Death certificate outstanding.',      type: 'assign'    },
      { time: '15:20', date: '2026-06-05', user: 'Priya Naidoo',  action: 'Information requested from employer',                        type: 'info'      },
    ],
  },
  {
    id: 'r3', ref: 'BPR-G7H8I9', employer: 'BuildRight Holdings', employerId: 'e4',
    category: 'payroll', type: 'Payroll Reconciliation', status: 'Submitted',
    priority: 'Medium', assigned: '', contact: 'HR Manager',
    created: '2026-06-07', sla: daysFromNow(5),
    description: 'May 2026 payroll reconciliation — discrepancy of R14,200 noted on the June schedule.',
    notes: [],
    documents: [{ name: 'May_Payroll_Schedule.xlsx', size: '2.3 MB', date: '2026-06-07' }],
    timeline: [
      { time: '09:00', date: '2026-06-07', user: 'HR Manager', action: 'Request submitted', type: 'submitted' },
    ],
  },
  {
    id: 'r4', ref: 'BPR-J1K2L3', employer: 'PetroLogix', employerId: 'e3',
    category: 'employer_support', type: 'Training Request', status: 'Completed',
    priority: 'Low', assigned: 'Thabo Molefe', contact: 'Nompumelelo Sithole',
    created: '2026-05-20', sla: '2026-05-27',
    description: 'Requesting product training session for 12 HR team members on the new member portal.',
    notes: [],
    documents: [{ name: 'Training_Materials_v2.pdf', size: '5.1 MB', date: '2026-05-24' }],
    timeline: [
      { time: '10:00', date: '2026-05-20', user: 'Nompumelelo Sithole', action: 'Training request submitted',                   type: 'submitted' },
      { time: '10:30', date: '2026-05-20', user: 'Thabo Molefe',        action: 'Assigned — session confirmed for 23 May',      type: 'assign'    },
      { time: '09:00', date: '2026-05-23', user: 'Thabo Molefe',        action: 'Training conducted — 12 attendees',             type: 'progress'  },
      { time: '16:00', date: '2026-05-23', user: 'Thabo Molefe',        action: 'Request completed and closed',                  type: 'complete'  },
    ],
  },
  {
    id: 'r5', ref: 'BPR-M4N5O6', employer: 'Steelworks SA', employerId: 'e1',
    category: 'compliance', type: 'Outstanding Documents', status: 'Escalated',
    priority: 'High', assigned: 'Priya Naidoo', contact: 'Sandra Botha',
    created: '2026-06-02', sla: daysFromNow(-1),
    description: 'Overdue signed board resolution and FSP compliance documents for annual audit.',
    notes: [{ user: 'Marcus van Wyk', date: '2026-06-08', text: 'Escalated — SLA breached. Employer flagged for management review.' }],
    documents: [],
    timeline: [
      { time: '08:00', date: '2026-06-02', user: 'Priya Naidoo',  action: 'Compliance request opened',       type: 'submitted' },
      { time: '12:00', date: '2026-06-05', user: 'Priya Naidoo',  action: 'Reminder sent to employer',       type: 'info'      },
      { time: '09:00', date: '2026-06-09', user: 'Marcus van Wyk', action: 'Escalated — SLA breached',       type: 'escalate'  },
    ],
  },
  {
    id: 'r6', ref: 'BPR-P7Q8R9', employer: 'TransAfrica Logistics', employerId: 'e5',
    category: 'membership', type: 'Member Exit', status: 'Processing',
    priority: 'Medium', assigned: 'Thabo Molefe', contact: 'HR Director',
    created: '2026-06-04', sla: daysFromNow(3),
    description: '32 member exits due to retrenchment. Section 189 process documentation attached.',
    notes: [],
    documents: [
      { name: 'Section189_Notices.pdf',  size: '3.7 MB', date: '2026-06-04' },
      { name: 'Exit_Member_List.xlsx',   size: '0.9 MB', date: '2026-06-04' },
    ],
    timeline: [
      { time: '11:00', date: '2026-06-04', user: 'HR Director',   action: 'Exit request submitted',             type: 'submitted' },
      { time: '11:15', date: '2026-06-04', user: 'System',         action: 'Assigned to Thabo Molefe',           type: 'assign'    },
      { time: '14:00', date: '2026-06-05', user: 'Thabo Molefe',  action: 'Documents verified. Processing commenced.', type: 'progress' },
    ],
  },
]
