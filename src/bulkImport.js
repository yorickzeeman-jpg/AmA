// ═══════════════════════════════════════════════════════════════════════════
// BULK MEMBER REVIEW IMPORT
// Parses the employer member data sheet, validates it, and produces member
// records + Member Review cases. Feeds the EXISTING member/case architecture —
// no separate member database, no separate wizard.
// ═══════════════════════════════════════════════════════════════════════════

// Column aliases — matched case-insensitively against the sheet header
const COLS = {
  firstName:    ['first names','first name','firstname'],
  middleNames:  ['middle names'],
  surname:      ['surname','last name','lastname'],
  dob:          ['dob (yyyymmdd)','dob','date of birth'],
  idNumber:     ['id no','id number','idno','id_number','identity'],
  passport:     ['passport number'],
  citizenship:  ['citizenship'],
  gender:       ['gender'],
  category:     ['member category name','member category alias','category'],
  maritalStatus:['marital status'],
  dateEmployed: ['date employed (yyyymmdd)','date employed'],
  dateJoinedFund:['date joined fund (yyyymmdd)','date joined fund'],
  exitDate:     ['exit date'],
  annualRisk:   ['annual risk salary'],
  riskSalary:   ['monthly risk salary'],
  annualPens:   ['annual pensionable  salary','annual pensionable salary'],
  salary:       ['monthly pensionable salary'],
  memberContribAmt: ['member contribution amount'],
  memberContribPct: ['member contribution %'],
  employerContribAmt:['employer contribution amount'],
  employerContribPct:['employer contribution %'],
  memberAvc:    ['member avc contribution'],
  employerAvc:  ['employer avc contribution'],
  glaPct:       ['gla percentage'],
  glaPremium:   ['gla premium'],
  phiPct:       ['phi percentage'],
  phiPremium:   ['phi premium'],
  funeral:      ['funeral premium','funeral'],
  adminFee:     ['admin fee'],
  otherExpenses:['other expenses'],
  totalContrib: ['total contributions','total contribution'],
  totalRisk:    ['total risk contributions','total risk contribution'],
  cell:         ['member cell number','cell','mobile'],
  emailBiz:     ['business email address'],
  emailPersonal:['personal email address'],
  taxNumber:    ['tax number'],
  fundValue:    ['fund value','current fund value','member share','fund credit'],
  notes:        ['notes / comments / remarks','notes','comments','remarks'],
}


const clean  = v => String(v ?? '').trim()
const money  = v => { const n = parseFloat(clean(v).replace(/[R,\s%]/g,'')); return isNaN(n) ? null : n }
const digits = v => clean(v).replace(/\D/g,'')

function splitLine(line) {
  // Tab-separated (Excel paste) wins; else comma, respecting simple quotes
  if (line.includes('\t')) return line.split('\t').map(c => c.trim().replace(/^"|"$/g,''))
  const out=[]; let cur=''; let q=false
  for (const ch of line) {
    if (ch === '"') q = !q
    else if (ch === ',' && !q) { out.push(cur.trim()); cur='' }
    else cur += ch
  }
  out.push(cur.trim())
  return out.map(c => c.replace(/^"|"$/g,''))
}

// SA ID number → date of birth (brief: derive if not separately supplied)
export function dobFromId(id) {
  const d = digits(id)
  if (d.length !== 13) return null
  const yy = +d.slice(0,2), mm = +d.slice(2,4), dd = +d.slice(4,6)
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const century = yy > (new Date().getFullYear() % 100) ? 1900 : 2000
  return `${century+yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`
}

// SA ID checksum (Luhn) — catches typos rather than only length errors
export function validSaId(id) {
  const d = digits(id)
  if (d.length !== 13) return false
  if (!dobFromId(d)) return false
  let sum=0, alt=false
  for (let i=d.length-1; i>=0; i--) {
    let n = +d[i]
    if (alt) { n*=2; if (n>9) n-=9 }
    sum += n; alt = !alt
  }
  return sum % 10 === 0
}

export function parseSheet(text, existingMembers = []) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) return { rows: [], headerFound: false }

  const header = splitLine(lines[0]).map(h => h.toLowerCase().trim())
  const idx = {}
  for (const [key, aliases] of Object.entries(COLS)) {
    idx[key] = header.findIndex(h => aliases.some(a => h === a || h.includes(a)))
  }
  const headerFound = idx.idNumber >= 0 || idx.surname >= 0
  const body = headerFound ? lines.slice(1) : lines

  const seen = new Map()
  const rows = body.map((line, i) => {
    const c = splitLine(line)
    const g = k => idx[k] >= 0 ? clean(c[idx[k]]) : ''

    const idNumber  = digits(g('idNumber'))
    const rawDob    = digits(g('dob'))
    const sheetDob  = rawDob.length === 8
      ? `${rawDob.slice(0,4)}-${rawDob.slice(4,6)}-${rawDob.slice(6,8)}` : null
    const firstName = g('firstName')
    const surname   = g('surname')
    const salary    = money(g('salary')) ?? money(g('riskSalary'))
                    ?? (money(g('annualPens')) != null ? money(g('annualPens'))/12 : null)
    const fundValue = money(g('fundValue'))

    const errors = [], warnings = []
    if (!firstName && !surname) errors.push('name missing')
    const passport = g('passport')
    if (!idNumber && !passport)   errors.push('ID or passport number required')
    else if (idNumber && !validSaId(idNumber)) errors.push('ID number invalid')
    if (salary == null)         warnings.push('no salary')
    if (fundValue == null)      warnings.push('no current fund value')

    // Duplicate ID inside the sheet itself
    if (idNumber) {
      if (seen.has(idNumber)) errors.push(`duplicate of row ${seen.get(idNumber)}`)
      else seen.set(idNumber, i + (headerFound?2:1))
    }

    const existing = idNumber ? existingMembers.find(m => digits(m.idNumber) === idNumber) : null

    return {
      row: i + (headerFound ? 2 : 1),
      firstName, surname,
      name: `${firstName} ${surname}`.trim(),
      idNumber,
      dateOfBirth: sheetDob || dobFromId(idNumber),   // sheet DOB wins; else derived from ID
      salary,
      riskSalary:  money(g('riskSalary')),
      fundValue,
      avc: (money(g('memberAvc')) || 0) + (money(g('employerAvc')) || 0) || null,
      memberAvc:   money(g('memberAvc')),
      employerAvc: money(g('employerAvc')),
      memberContribAmt:   money(g('memberContribAmt')),
      memberContribPct:   money(g('memberContribPct')),
      employerContribAmt: money(g('employerContribAmt')),
      employerContribPct: money(g('employerContribPct')),
      glaPct:      money(g('glaPct')),
      glaPremium:  money(g('glaPremium')),
      phiPct:      money(g('phiPct')),
      phiPremium:  money(g('phiPremium')),
      funeral:     money(g('funeral')),
      adminFee:    money(g('adminFee')),
      otherExpenses: money(g('otherExpenses')),
      totalContrib:  money(g('totalContrib')),
      totalRisk:     money(g('totalRisk')),
      cell:  g('cell'),
      email: g('emailPersonal') || g('emailBiz'),
      taxNumber: g('taxNumber'),
      middleNames: g('middleNames'),
      gender: g('gender'),
      category: g('category'),
      maritalStatus: g('maritalStatus'),
      dateEmployed: (d => d.length===8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : '')(digits(g('dateEmployed'))),
      dateJoinedFund: (d => d.length===8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : '')(digits(g('dateJoinedFund'))),
      passport: g('passport'),
      notes: g('notes'),
      existingId: existing?.id || null,
      action: errors.length ? 'reject' : existing ? 'update' : 'create',
      errors, warnings,
    }
  })

  return { rows, headerFound }
}

// Member record for the EXISTING membership register
export function toMemberRecord(r, employerId, existingId) {
  return {
    id: existingId || crypto.randomUUID(),
    employerId,
    memberName: r.firstName, surname: r.surname,
    idNumber: r.idNumber,
    dateOfBirth: r.dateOfBirth,
    salary: r.salary,
    fundValue: r.fundValue,
    avc: r.avc,
    memberContribution:   r.memberContribAmt,
    memberContributionPct:r.memberContribPct,
    employerContribution: r.employerContribAmt,
    employerContributionPct: r.employerContribPct,
    gla: r.glaPremium, glaPct: r.glaPct,
    phi: r.phiPremium, phiPct: r.phiPct,
    funeral: r.funeral,
    adminFee: r.adminFee,
    totalContribution: r.totalContrib,
    cell: r.cell, email: r.email,
    taxNumber: r.taxNumber,
    notes: r.notes,
    status: 'Active',
    effectiveDate: new Date().toISOString().split('T')[0],
  }
}

// CSV error report for rejected/flagged rows
export function buildErrorReport(rows) {
  const esc = v => `"${String(v ?? '').replace(/"/g,'""')}"`
  const head = ['Row','First Names','Surname','ID No','Action','Errors','Warnings'].map(esc).join(',')
  const body = rows.filter(r => r.errors.length || r.warnings.length).map(r =>
    [r.row, r.firstName, r.surname, r.idNumber, r.action, r.errors.join('; '), r.warnings.join('; ')].map(esc).join(',')
  )
  return [head, ...body].join('\r\n')
}
