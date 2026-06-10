import { useState, useRef, useCallback } from 'react'
import { T, genRef, calcSlaDate, allocateCase } from '../data.js'
import { inputSt, selectSt, StatusBadge } from '../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// AMCU FUNERAL PORTAL EXTRACTION ENGINE  v3
//
// ROOT CAUSE of v1/v2 failure:
//   FileReader.readAsText() on a PDF returns the raw PDF binary stream.
//   PDFs encode text as binary operators like "(Hello World) Tj" scattered
//   through compressed object streams. The browser cannot decode this as
//   readable text — so the parser received binary noise.
//
// v3 FIX — Two-layer approach:
//
//   Layer 1: PDF TEXT EXTRACTION
//     Scan the raw binary for PDF text operators:
//       (string) Tj       — single string
//       [(str1)(str2)] TJ — array of strings (kerned text)
//       BT...ET blocks    — text blocks
//     Decode escaped PDF string syntax: \n \r \t \( \) \\
//     Reconstruct readable lines from the extracted text tokens.
//
//   Layer 2: AMCU DOCUMENT PARSER
//     Three parsing strategies applied to the reconstructed text:
//       A. LABEL\nVALUE  — label line, value on next line (portal PDF format)
//       B. LABEL: VALUE  — colon-separated inline (email format)
//       C. REGEX patterns — SA ID (13 digits), R amounts, phone numbers
//
//   The Debug Panel shows both the raw PDF binary sample AND the
//   reconstructed text, so failures are immediately diagnosable.
// ═════════════════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — PDF BINARY TEXT EXTRACTOR
// ─────────────────────────────────────────────────────────────────────────────
function extractTextFromPDF(rawBinary) {
  // rawBinary is the string produced by FileReader.readAsText() on a .pdf
  // It contains the PDF binary with text operators embedded.

  const tokens = []

  // ── Strategy A: extract (string) Tj and [(array)] TJ operators ───────────
  // These are the primary PDF text-drawing operators.
  // Pattern: content between ( ) followed by Tj or TJ
  
  // Single string: (Hello World) Tj
  const tjRe = /\(([^)]*(?:\\.)*[^)]*)\)\s*Tj/g
  let m
  while ((m = tjRe.exec(rawBinary)) !== null) {
    tokens.push(decodePDFString(m[1]))
  }

  // Array of strings: [(Hello)(World)] TJ
  const tjArrayRe = /\[((?:\([^)]*\)|[^\]])*)\]\s*TJ/g
  while ((m = tjArrayRe.exec(rawBinary)) !== null) {
    const inner = m[1]
    // Extract each (string) from the array
    const innerRe = /\(([^)]*(?:\\.)*[^)]*)\)/g
    let im
    while ((im = innerRe.exec(inner)) !== null) {
      const decoded = decodePDFString(im[1])
      if (decoded.trim()) tokens.push(decoded)
    }
  }

  // ── Strategy B: extract BT...ET text blocks ───────────────────────────────
  // Some PDFs use BT (begin text) / ET (end text) blocks
  const btRe = /BT\s*([\s\S]*?)\s*ET/g
  while ((m = btRe.exec(rawBinary)) !== null) {
    const block = m[1]
    // Extract strings within the block
    const strRe = /\(([^)]*(?:\\.)*[^)]*)\)/g
    let sm
    while ((sm = strRe.exec(block)) !== null) {
      const decoded = decodePDFString(sm[1])
      if (decoded.trim()) tokens.push(decoded)
    }
  }

  // ── Strategy C: stream content (compressed PDFs) ─────────────────────────
  // If no tokens found, the PDF uses compressed streams (FlateDecode).
  // We can't decompress in the browser without a library, but we can still
  // try to find readable ASCII text embedded in the binary.
  if (tokens.length === 0) {
    // Extract any runs of printable ASCII characters 4+ chars long
    const asciiRe = /[ -~]{4,}/g
    const asciiTokens = []
    while ((m = asciiRe.exec(rawBinary)) !== null) {
      const s = m[0].trim()
      // Skip PDF structural tokens and paths
      if (s.length > 3 && !/^(stream|endstream|obj|endobj|xref|trailer|startxref|<<|>>)$/i.test(s)) {
        asciiTokens.push(s)
      }
    }
    tokens.push(...asciiTokens)
  }

  // ── Reconstruct lines from tokens ────────────────────────────────────────
  // PDF doesn't have explicit line breaks — we infer them from context.
  // Group tokens into "lines" by joining and then splitting on natural breaks.
  const joined = tokens.join('\n')
  const lines = joined
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    // Remove pure PDF noise lines
    .filter(l => !/^[\d\s.]+$/.test(l) || l.match(/\d{13}/))  // keep 13-digit IDs
    .filter(l => l.length >= 2)

  return { lines, tokenCount: tokens.length }
}

function decodePDFString(s) {
  // Decode PDF string escape sequences
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
}


// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 — AMCU FUNERAL PORTAL DOCUMENT PARSER
// ─────────────────────────────────────────────────────────────────────────────

// Canonical field → label variations (AMCU-specific labels listed first)
const LABEL_MAP = {
  policyRef:               ['reference', 'ref', 'policy reference', 'policy ref', 'application reference', 'ref no', 'policy number', 'application number', 'submission reference'],
  submissionDate:          ['submission date', 'date', 'created', 'created date', 'submission'],
  consultant:              ['consultant', 'agent', 'broker', 'advisor', 'sales consultant', 'submitted by'],
  memberSurname:           ['surname', 'last name', 'family name'],
  memberFirstName:         ['first name', 'given name', 'forename', 'first names', 'name(s)'],
  memberName:              ['member name', 'full name', 'member', 'employee name', 'applicant name'],
  idNumber:                ['id number', 'id no', 'identity number', 'id', 'sa id', 'south african id number'],
  payrollNumber:           ['payroll number', 'payroll no', 'employee number', 'employee no', 'staff number', 'payroll'],
  employer:                ['employer', 'company', 'employer name', 'organisation', 'employer/fund', 'fund'],
  mobile:                  ['mobile', 'cell', 'cell number', 'mobile number', 'contact number', 'phone', 'telephone', 'contact'],
  emailAddress:            ['email', 'e-mail', 'email address'],
  dateOfBirth:             ['date of birth', 'dob', 'birth date'],
  product:                 ['product', 'plan', 'policy type', 'cover', 'product name', 'benefit', 'scheme', 'cover type'],
  membershipType:          ['membership type', 'category', 'tier', 'cover level', 'member type', 'membership category'],
  premium:                 ['premium', 'monthly premium', 'monthly contribution', 'monthly deduction', 'deduction amount', 'contribution', 'total premium', 'total monthly', 'total deduction'],
  effectiveDate:           ['deduction start', 'deduction start date', 'effective date', 'start date', 'commencement date', 'commencement', 'inception date'],
  beneficiaryName:         ['beneficiary', 'beneficiary name', 'nominated beneficiary', 'main beneficiary', 'beneficiary full name'],
  beneficiaryRelationship: ['beneficiary relationship', 'relationship', 'relation'],
  beneficiaryContact:      ['beneficiary contact', 'beneficiary mobile', 'beneficiary phone', 'beneficiary number'],
  actionRequired:          ['action required', 'action', 'instruction', 'billing instruction'],
  billingFlag:             ['billing required', 'send to billing', 'billing'],
}

// AMCU case type signals
const CASE_TYPE_SIGNALS = [
  {
    id: 'ct_new_employee', name: 'New Employee',
    signals: [
      { terms: ['application record','new policy activation','new application','policy activation','enrolment','new employee','new member application','amcu application','new member','new policy'], weight: 15 },
      { terms: ['deduction start','effective date','commencement','monthly deduction'], weight: 6 },
      { terms: ['extended family','beneficiary','premium breakdown'], weight: 4 },
    ],
  },
  {
    id: 'ct_amcu_funeral', name: 'AMCU Funeral Claim',
    signals: [
      { terms: ['funeral claim','funeral benefit','death claim','deceased member','amcu funeral','claim form'], weight: 15 },
      { terms: ['death certificate','burial order','date of death','deceased'], weight: 10 },
    ],
  },
  {
    id: 'ct_extended_funeral', name: 'Extended Funeral Claim',
    signals: [
      { terms: ['extended funeral','extended cover','family member claim','dependent claim'], weight: 15 },
    ],
  },
  {
    id: 'ct_beneficiary', name: 'Beneficiary Nomination Form',
    signals: [
      { terms: ['beneficiary update','nomination form','change of beneficiary','beneficiary nomination'], weight: 15 },
    ],
  },
  {
    id: 'ct_exit_employee', name: 'Exit Employee',
    signals: [
      { terms: ['resignation','termination','retrenchment','section 189','exit'], weight: 15 },
    ],
  },
  {
    id: 'ct_general_query', name: 'General Query',
    signals: [{ terms: ['query','request','please advise'], weight: 2 }],
  },
]

const BILLING_SIGNALS = [
  'process this submission in the billing system',
  'billing required',
  'send to billing',
  'billing: yes',
  'billing required: yes',
  'billing system',
  'billing update',
]

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PARSE FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
function parseDocument(rawBinary, fileName) {
  const now   = new Date().toISOString()
  const isPDF = /\.pdf$/i.test(fileName || '') || rawBinary.startsWith('%PDF')
  
  let lines    = []
  let pdfInfo  = {}

  if (isPDF) {
    const result = extractTextFromPDF(rawBinary)
    lines   = result.lines
    pdfInfo = { tokenCount: result.tokenCount, isPDF: true }
  } else {
    // EML/MSG/TXT — already readable text
    lines = rawBinary
      .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      .split('\n').map(l => l.trim()).filter(l => l.length > 0)
    pdfInfo = { isPDF: false }
  }

  const fullText = lines.join('\n')
  const lower    = fullText.toLowerCase()

  // ─── EXTRACTION CORE ────────────────────────────────────────────────────
  const extracted = {}  // key → { value, source, confidence, strategy }

  // Build a normalised index: lineIndex → { normalised label, original line }
  const normLines = lines.map(l => l.toLowerCase().replace(/[:\-–—]+$/, '').trim())

  // ── Strategy A: LABEL↵VALUE (consecutive lines) ──────────────────────────
  for (let i = 0; i < lines.length; i++) {
    const norm = normLines[i]
    for (const [key, variants] of Object.entries(LABEL_MAP)) {
      if (extracted[key]) continue
      for (const variant of variants) {
        if (norm === variant || norm === variant + ':' || norm.startsWith(variant + ':') || norm.startsWith(variant + ' ')) {
          // Look at the next 1-3 lines for a value
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const candidate = lines[j].trim()
            if (!candidate) continue
            const candidateNorm = normLines[j]
            // Reject if the candidate is itself a label
            const isALabel = Object.values(LABEL_MAP).flat()
              .some(lbl => candidateNorm === lbl || candidateNorm.startsWith(lbl + ':'))
            if (isALabel) break
            // Reject section headers (all-caps, no digits)
            if (candidate === candidate.toUpperCase() && candidate.length > 5 && !/\d/.test(candidate)) break
            extracted[key] = {
              value:      candidate.replace(/^[:\-–—\s]+/, '').trim(),
              source:     `Line ${i+1}→${j+1}`,
              confidence: 92,
              strategy:   'label_newline',
            }
            break
          }
          if (extracted[key]) break
        }
      }
    }
  }

  // ── Strategy B: LABEL: VALUE on same line ────────────────────────────────
  for (const [key, variants] of Object.entries(LABEL_MAP)) {
    if (extracted[key]) continue
    for (const variant of variants) {
      const re = new RegExp(
        '(?:^|\\n)' +
        variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '\\s*[:\\-–—]\\s*(.+?)(?:\\n|$)',
        'i'
      )
      const m = fullText.match(re)
      if (m && m[1]) {
        const val = m[1].trim().replace(/[,;]+$/, '')
        if (val.length >= 1 && val.length <= 150) {
          extracted[key] = { value: val, source: `Inline: "${variant}: ${val}"`, confidence: 85, strategy: 'label_colon' }
          break
        }
      }
    }
  }

  // ── Strategy C: AMCU-specific inline regex patterns ──────────────────────
  const patterns = [
    // AMCU reference: AMCU-20260609-62605
    { key: 'policyRef',      re: /\b(AMCU[\-\/]\d{6,8}[\-\/]\d{4,8})\b/i,                        conf: 98, src: 'AMCU reference pattern' },
    // Generic portal ref: letters-digits-digits
    { key: 'policyRef',      re: /\b([A-Z]{2,8}[\-\/]\d{6,10}[\-\/]\d{3,8})\b/,                  conf: 88, src: 'Portal reference pattern' },
    // SA ID number: 13 digits
    { key: 'idNumber',       re: /\b(\d{13})\b/,                                                  conf: 96, src: '13-digit SA ID' },
    // SA mobile: 06x/07x
    { key: 'mobile',         re: /\b(0[67]\d[\s\-]?\d{3}[\s\-]?\d{4})\b/,                        conf: 90, src: 'SA mobile pattern' },
    // Email
    { key: 'emailAddress',   re: /\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/,      conf: 94, src: 'Email address' },
    // Premium with /mo, pm etc: R593/mo or R57.00
    { key: 'premium',        re: /\bR\s*(\d{2,6}(?:[.,]\d{2})?)\s*(?:\/mo|pm|per\s*month|p\/m|monthly)/i, conf: 95, src: 'R amount /mo' },
    { key: 'premium',        re: /\bR\s*(\d{2,6}(?:[.,]\d{2})?)\b/,                              conf: 70, src: 'R amount' },
    // Month Year: Jun 2026
    { key: 'effectiveDate',  re: /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/i, conf: 82, src: 'Month Year' },
    // Date formats: DD/MM/YYYY or YYYY-MM-DD
    { key: 'submissionDate', re: /\b(\d{4}[-\/]\d{2}[-\/]\d{2})\b/,                              conf: 80, src: 'ISO date' },
    { key: 'dateOfBirth',    re: /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b/,                          conf: 75, src: 'Date format DD/MM/YYYY' },
  ]

  for (const { key, re, conf, src } of patterns) {
    if (extracted[key]) continue
    const m = fullText.match(re)
    if (m) {
      const val = (m[2] ? `${m[1]} ${m[2]}` : m[1]).trim()
      // For premium, add R prefix if not present
      const finalVal = (key === 'premium' && !/^R/i.test(val)) ? `R${val}` : val
      extracted[key] = { value: finalVal, source: src, confidence: conf, strategy: 'inline' }
    }
  }

  // ── Post-processing ───────────────────────────────────────────────────────
  // Synthesise memberName from surname + firstName if not directly found
  if (!extracted.memberName && (extracted.memberSurname || extracted.memberFirstName)) {
    const combined = [extracted.memberFirstName?.value, extracted.memberSurname?.value].filter(Boolean).join(' ')
    if (combined.trim()) {
      extracted.memberName = { value: combined.trim(), source: 'Combined first name + surname', confidence: 82, strategy: 'synthesised' }
    }
  }

  // Clean all values: strip trailing punctuation, normalise whitespace
  for (const key of Object.keys(extracted)) {
    let v = extracted[key].value || ''
    v = v.replace(/[,;:]+$/, '').replace(/\s+/g, ' ').trim()
    if (key === 'billingFlag') v = /yes|true|required|1/i.test(v) ? 'Yes' : 'No'
    extracted[key].value = v
  }

  // ── Extended family extraction (table rows) ───────────────────────────────
  // AMCU application records have a table: Name | Relationship | Age | Cover | Premium
  const extFamily = []
  const familySection = fullText.match(/extended\s*family[\s\S]*?(?=declaration|authoris|total|$)/i)?.[0] || ''
  if (familySection) {
    // Look for lines that look like table rows: Name followed by relationship words
    const relWords = ['spouse','child','parent','sibling','brother','sister','mother','father','wife','husband','son','daughter']
    const famLines = familySection.split('\n').map(l => l.trim()).filter(l => l.length > 2)
    for (let i = 0; i < famLines.length; i++) {
      const l = famLines[i].toLowerCase()
      if (relWords.some(r => l.includes(r))) {
        const rel  = relWords.find(r => l.includes(r)) || ''
        const name = famLines[i - 1] || ''
        const age  = famLines[i + 1]?.match(/^\d{1,3}$/)?.[0] || ''
        const cover= famLines[i + 2]?.match(/R[\d,]+/)?.[0] || ''
        const prem = famLines[i + 3]?.match(/R[\d.,]+/)?.[0] || ''
        if (name && name.length > 1 && !/^(name|extended|family|cover|premium|age|relationship)/i.test(name)) {
          extFamily.push({ name, relationship: rel, age, cover, premium: prem })
        }
      }
    }
  }

  // ── Case type detection ───────────────────────────────────────────────────
  let scores = {}
  for (const ct of CASE_TYPE_SIGNALS) {
    scores[ct.id] = 0
    for (const group of ct.signals) {
      for (const term of group.terms) {
        if (lower.includes(term.toLowerCase())) { scores[ct.id] += group.weight; break }
      }
    }
  }
  // Bonus scores from extracted fields
  if (extracted.policyRef?.value?.toUpperCase().startsWith('AMCU')) scores['ct_new_employee'] = (scores['ct_new_employee'] || 0) + 10
  if (extracted.beneficiaryName) scores['ct_new_employee'] = (scores['ct_new_employee'] || 0) + 5
  if (extFamily.length > 0)      scores['ct_new_employee'] = (scores['ct_new_employee'] || 0) + 5

  const sortedTypes = Object.entries(scores).sort((a, b) => b[1] - a[1]).filter(([, s]) => s > 0)
  const detectedCaseTypeId  = sortedTypes[0]?.[0] || 'ct_new_employee'
  const detectionConfidence = sortedTypes[0]?.[1] || 0

  // ── Billing detection ─────────────────────────────────────────────────────
  let billingRequired = BILLING_SIGNALS.some(sig => lower.includes(sig.toLowerCase()))
  if (extracted.billingFlag?.value === 'Yes') billingRequired = true

  // ── Subject / sender ─────────────────────────────────────────────────────
  const subjectMatch = fullText.match(/^subject[:\s]+(.+)$/im) || fullText.match(/^re[:\s]+(.+)$/im)
  const emailSubject = subjectMatch?.[1]?.trim()
    || extracted.policyRef?.value
    || lines[0]?.slice(0, 80)
    || fileName?.replace(/\.(eml|msg|pdf)$/i, '')
    || 'Document Import'
  const fromMatch = fullText.match(/^from[:\s]+(.+)$/im)
  const emailFrom = fromMatch?.[1]?.trim() || ''

  // ── Build flat extracted values map (for form state) ─────────────────────
  const extractedValues = {}
  for (const [key, meta] of Object.entries(extracted)) {
    extractedValues[key] = meta.value || ''
  }
  // Also expose surname/firstName separately
  if (extracted.memberSurname)  extractedValues.memberSurname  = extracted.memberSurname.value
  if (extracted.memberFirstName)extractedValues.memberFirstName= extracted.memberFirstName.value

  // ── Debug metadata ────────────────────────────────────────────────────────
  const debugMeta = {}
  for (const [key, meta] of Object.entries(extracted)) {
    debugMeta[key] = { ...meta }
  }
  for (const key of Object.keys(LABEL_MAP)) {
    if (!debugMeta[key]) debugMeta[key] = { value: '', source: 'Not found', confidence: 0, strategy: 'none' }
  }

  return {
    emailSubject,
    emailFrom,
    detectedCaseTypeId,
    detectionConfidence,
    alternativeTypes: sortedTypes.slice(1, 4).map(([id]) => id),
    billingRequired,
    extracted:   extractedValues,
    extFamily,
    debugMeta,
    rawText:     fullText,
    rawLines:    lines,
    rawBinary:   rawBinary.slice(0, 800),  // first 800 chars of original for debug
    pdfInfo,
    processedAt: now,
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// REVIEW FIELDS — all fields shown in the review form
// ─────────────────────────────────────────────────────────────────────────────
const REVIEW_FIELDS = [
  { key:'policyRef',               label:'Reference Number',         section:'Header'     },
  { key:'submissionDate',          label:'Submission Date',          section:'Header'     },
  { key:'consultant',              label:'Consultant',               section:'Header'     },
  { key:'memberName',              label:'Member Full Name',         section:'Member'     },
  { key:'memberSurname',           label:'Surname',                  section:'Member'     },
  { key:'memberFirstName',         label:'First Name',               section:'Member'     },
  { key:'idNumber',                label:'ID Number',                section:'Member'     },
  { key:'payrollNumber',           label:'Payroll Number',           section:'Member'     },
  { key:'employer',                label:'Employer',                 section:'Member'     },
  { key:'mobile',                  label:'Mobile Number',            section:'Member'     },
  { key:'emailAddress',            label:'Email Address',            section:'Member'     },
  { key:'dateOfBirth',             label:'Date of Birth',            section:'Member'     },
  { key:'product',                 label:'Product / Cover',          section:'Product'    },
  { key:'membershipType',          label:'Membership Type',          section:'Product'    },
  { key:'premium',                 label:'Monthly Premium',          section:'Product'    },
  { key:'effectiveDate',           label:'Deduction Start Date',     section:'Product'    },
  { key:'beneficiaryName',         label:'Beneficiary Name',         section:'Beneficiary'},
  { key:'beneficiaryRelationship', label:'Relationship',             section:'Beneficiary'},
  { key:'beneficiaryContact',      label:'Beneficiary Contact',      section:'Beneficiary'},
  { key:'actionRequired',          label:'Action Required',          section:'Admin'      },
]

const SECTIONS = ['Header','Member','Product','Beneficiary','Admin']


// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function EmailIntake({ caseTypes, categories, employers, users, currentUser, onCaseCreated }) {
  const [phase, setPhase]               = useState('upload')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [parseResult, setParseResult]   = useState(null)
  const [dragging, setDragging]         = useState(false)
  const [progress, setProgress]         = useState(0)
  const [createdCase, setCreatedCase]   = useState(null)
  const fileInputRef = useRef()

  function readFile(file) {
    if (!file) return
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!['.eml','.msg','.pdf','.txt'].includes(ext)) {
      alert('Please upload an .eml, .msg, .pdf or .txt file.'); return
    }
    setUploadedFile(file); setPhase('processing'); setProgress(0)
    const reader = new FileReader()
    reader.onload = e => startProcessing(e.target.result, file.name)
    reader.onerror = () => { alert('Could not read file.'); setPhase('upload') }
    // MUST use readAsBinaryString for PDFs — readAsText mangles binary encodings
    reader.readAsBinaryString(file)
  }

  function startProcessing(rawBinary, fileName) {
    let i = 0
    const pcts = [15, 35, 55, 75, 90, 100]
    const iv = setInterval(() => {
      if (i < pcts.length) { setProgress(pcts[i]); i++ }
      else {
        clearInterval(iv)
        const result = parseDocument(rawBinary, fileName)
        setParseResult(result); setPhase('review')
      }
    }, 250)
  }

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) readFile(f)
  }, [])

  const reset = () => { setPhase('upload'); setUploadedFile(null); setParseResult(null); setProgress(0) }

  if (phase === 'upload')     return <UploadPhase dragging={dragging} setDragging={setDragging} onDrop={onDrop} fileInputRef={fileInputRef} onPickFile={readFile}/>
  if (phase === 'processing') return <ProcessingPhase progress={progress} fileName={uploadedFile?.name}/>
  if (phase === 'review')     return (
    <ReviewPhase parseResult={parseResult} uploadedFile={uploadedFile}
      caseTypes={caseTypes} categories={categories} employers={employers}
      users={users} currentUser={currentUser}
      onBack={reset}
      onCreated={c => { setCreatedCase(c); setPhase('done'); onCaseCreated(c) }}/>
  )
  if (phase === 'done') return <DonePhase c={createdCase} onNew={() => { reset(); setCreatedCase(null) }}/>
}


// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — UPLOAD
// ─────────────────────────────────────────────────────────────────────────────
function UploadPhase({ dragging, setDragging, onDrop, fileInputRef, onPickFile }) {
  return (
    <div style={{ maxWidth:680, margin:'0 auto', animation:'fadeIn .3s ease' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:42, height:42, borderRadius:10, background:T.orangeL, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={T.orange}><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        </div>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>Create Case from Email</h1>
          <p style={{ margin:'2px 0 0', fontSize:12, color:T.gray }}>Upload an AMCU Funeral Portal PDF or email file — information is extracted automatically.</p>
        </div>
      </div>

      <div onDrop={onDrop}
        onDragOver={e=>{e.preventDefault();setDragging(true)}}
        onDragLeave={e=>{e.preventDefault();setDragging(false)}}
        onClick={()=>fileInputRef.current.click()}
        style={{ border:`2px dashed ${dragging?T.orange:'#d1d5db'}`, borderRadius:14, padding:'52px 24px', textAlign:'center', cursor:'pointer', background:dragging?T.orangeL:'#fafafa', transition:'all .18s', marginBottom:20 }}>
        <input ref={fileInputRef} type="file" accept=".eml,.msg,.pdf,.txt"
          onChange={e=>{if(e.target.files[0])onPickFile(e.target.files[0]);e.target.value=''}}
          style={{display:'none'}}/>
        <div style={{ fontSize:52, marginBottom:14, lineHeight:1 }}>{dragging?'📂':'📧'}</div>
        <div style={{ fontSize:16, fontWeight:700, color:dragging?T.orange:T.text, marginBottom:6 }}>
          {dragging?'Release to process':'Drop AMCU Funeral Portal document here'}
        </div>
        <div style={{ fontSize:13, color:T.gray, marginBottom:18 }}>or click to browse</div>
        <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
          {[{ext:'.PDF',desc:'Funeral Portal PDF',c:'#dc2626'},{ext:'.EML',desc:'Email file',c:'#1e5fd9'},{ext:'.MSG',desc:'Outlook message',c:'#7c3aed'}].map(f=>(
            <span key={f.ext} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:8 }}>
              <span style={{ fontSize:11, fontWeight:800, color:f.c }}>{f.ext}</span>
              <span style={{ fontSize:11, color:T.gray }}>{f.desc}</span>
            </span>
          ))}
        </div>
      </div>

      <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, padding:'16px 20px' }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:14 }}>Extraction targets for AMCU Funeral Portal documents</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8 }}>
          {['Reference Number','Member Surname','ID Number','Employer','Consultant','Monthly Premium','Deduction Start','Beneficiary Name','Beneficiary Relationship','Mobile Number'].map(f=>(
            <div key={f} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#374151' }}>
              <span style={{ color:T.green, fontWeight:700 }}>✓</span>{f}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — PROCESSING
// ─────────────────────────────────────────────────────────────────────────────
function ProcessingPhase({ progress, fileName }) {
  const steps = [
    {pct:0,  l:'Reading PDF binary'},
    {pct:15, l:'Extracting text operators'},
    {pct:35, l:'Reconstructing document lines'},
    {pct:55, l:'Parsing AMCU field structure'},
    {pct:75, l:'Detecting case type'},
    {pct:90, l:'Checking billing flags'},
  ]
  const current = [...steps].reverse().find(s => progress >= s.pct) || steps[0]
  return (
    <div style={{ maxWidth:460, margin:'80px auto', textAlign:'center', animation:'fadeIn .3s ease' }}>
      <div style={{ fontSize:52, marginBottom:14, lineHeight:1 }}>
        <span style={{ display:'inline-block', animation:'spin 1.5s linear infinite' }}>⚙️</span>
      </div>
      <div style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:4 }}>Processing Document</div>
      <div style={{ fontSize:12, color:T.gray, marginBottom:6 }}>{fileName}</div>
      <div style={{ fontSize:12, color:T.orange, fontWeight:600, marginBottom:20 }}>{current.l}…</div>
      <div style={{ height:8, background:'#f3f4f6', borderRadius:4, maxWidth:340, margin:'0 auto 6px', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${progress}%`, background:`linear-gradient(90deg,${T.orange},#c95500)`, borderRadius:4, transition:'width .25s ease' }}/>
      </div>
      <div style={{ fontSize:11, color:T.gray, marginBottom:24 }}>{progress}%</div>
      <div style={{ display:'flex', flexDirection:'column', gap:5, maxWidth:300, margin:'0 auto' }}>
        {steps.map(s=>(
          <div key={s.l} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 12px', background:'#f9fafb', borderRadius:7 }}>
            <span style={{ fontSize:13, width:18 }}>{progress>s.pct?'✅':progress===s.pct?'⏳':'○'}</span>
            <span style={{ fontSize:12, color:progress>=s.pct?T.text:T.gray, fontWeight:progress>=s.pct?600:400 }}>{s.l}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — REVIEW
// ─────────────────────────────────────────────────────────────────────────────
function ReviewPhase({ parseResult, uploadedFile, caseTypes, categories, employers, users, currentUser, onBack, onCreated }) {
  const r          = parseResult
  const today      = new Date().toISOString().split('T')[0]
  const [fields, setFields] = useState({ ...r.extracted })
  const [selCT, setSelCT]   = useState(r.detectedCaseTypeId)
  const [selEmp, setSelEmp] = useState(
    employers.find(e => r.extracted.employer &&
      e.name.toLowerCase().includes((r.extracted.employer||'').toLowerCase().slice(0,6)))?.id || ''
  )
  const [priority, setPriority]   = useState('Medium')
  const [billing, setBilling]     = useState(r.billingRequired)
  const [desc, setDesc]           = useState(
    [r.emailSubject, r.extracted.actionRequired].filter(Boolean).join('\n\n') ||
    `Imported from: ${uploadedFile?.name}`
  )
  const [tab, setTab]             = useState('extracted')
  const [submitting, setSubmitting] = useState(false)

  const setF = (k, v) => setFields(f => ({ ...f, [k]: v }))
  const ct           = caseTypes.find(x => x.id === selCT)
  const visibleCTs   = caseTypes.filter(x => !x.isInternal && x.active)
  const extractedCt  = REVIEW_FIELDS.filter(f => r.extracted[f.key]?.trim()).length
  const totalF       = REVIEW_FIELDS.length
  const confColor    = r.detectionConfidence >= 15 ? T.green : r.detectionConfidence >= 8 ? T.amber : T.red
  const confLabel    = r.detectionConfidence >= 15 ? 'High ✓' : r.detectionConfidence >= 8 ? 'Medium ~' : 'Low ⚠'

  function handleCreate() {
    if (!selCT || !selEmp) { alert('Please select a Case Type and Employer.'); return }
    setSubmitting(true)
    setTimeout(() => {
      const assignedTo   = allocateCase(ct, users, { general:{members:['u2','u3','u6']}, billing:{members:['u5','u7']} }, {})
      const assignedUser = users.find(u => u.id === assignedTo)
      const caseRef      = genRef('AEB')
      const slaDate      = ct ? calcSlaDate(ct) : new Date(Date.now()+5*86400000).toISOString().split('T')[0]
      const now          = new Date().toISOString()
      const memberName   = fields.memberName || [fields.memberFirstName, fields.memberSurname].filter(Boolean).join(' ') || null
      const docs         = [{ name:uploadedFile?.name||'document.pdf', size:`${((uploadedFile?.size||0)/1024).toFixed(1)} KB`, type:uploadedFile?.type||'application/pdf', uploadedBy:currentUser.id, date:today, source:'email_import' }]
      const audit = [
        { time:now,                                  user:currentUser.id, action:`Document uploaded: ${uploadedFile?.name}`,                              type:'upload'  },
        { time:r.processedAt,                        user:'system',       action:`Parsed — ${extractedCt}/${totalF} fields extracted${r.pdfInfo?.isPDF?' (PDF)':''}`, type:'process' },
        { time:new Date(Date.now()+100).toISOString(), user:'system',     action:`Case type: ${ct?.name} (score ${r.detectionConfidence})`,              type:'process' },
        { time:new Date(Date.now()+200).toISOString(), user:currentUser.id, action:`Case ${caseRef} created from document import`,                       type:'create'  },
        ...(assignedTo ? [{ time:new Date(Date.now()+300).toISOString(), user:'system', action:`Auto-assigned to ${assignedUser?.name} (Round Robin)`, type:'assign' }] : []),
        ...(billing ? [{ time:new Date(Date.now()+400).toISOString(), user:'system', action:'Billing Required flag set', type:'billing' }] : []),
        ...(r.extFamily?.length ? [{ time:new Date(Date.now()+500).toISOString(), user:'system', action:`${r.extFamily.length} extended family member(s) imported`, type:'upload' }] : []),
      ]
      onCreated({
        id:'c'+Date.now(), ref:caseRef, workspace:'employer',
        caseTypeId:selCT, employerId:selEmp,
        status:'Submitted', priority, assignedTo,
        createdBy:currentUser.id, memberName,
        memberId:fields.idNumber||null, source:'email_import', sourceFile:uploadedFile?.name,
        currentStage:0, stageHistory:[], created:today, slaDate,
        description:desc.trim(), billingRequired:billing, billingTaskId:null,
        notes:[], documents:docs,
        extFamily:r.extFamily||[],
        emailData:{ subject:r.emailSubject, from:r.emailFrom, fileName:uploadedFile?.name, extractedFields:fields, processedAt:r.processedAt },
        audit, escalated:false,
        ownerHistory:assignedTo?[{user:assignedTo,from:today}]:[],
      })
    }, 500)
  }

  const tabs = [
    { id:'extracted', label:`📋 Extracted (${extractedCt}/${totalF})` },
    { id:'case',      label:'⚙️ Case Settings' },
    { id:'debug',     label:'🔬 Debug Panel' },
    { id:'raw',       label:'📄 Reconstructed Text' },
  ]

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', animation:'fadeIn .3s ease' }}>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18, gap:12, flexWrap:'wrap' }}>
        <div>
          <button onClick={onBack} style={{ fontSize:12, color:T.orange, background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:0, fontFamily:'inherit', marginBottom:5 }}>← Upload different file</button>
          <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:'0 0 2px' }}>Intake Review</h1>
          <p style={{ margin:0, fontSize:12, color:T.gray }}>Review extracted fields, correct any errors, then create the case.</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:10 }}>
          <span style={{ fontSize:22 }}>{r.pdfInfo?.isPDF?'📄':'📧'}</span>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{uploadedFile?.name}</div>
            <div style={{ fontSize:11, color:T.gray }}>
              <span style={{ color:confColor, fontWeight:700 }}>{extractedCt}/{totalF} fields</span>
              {' '} · Confidence: <span style={{ color:confColor, fontWeight:700 }}>{confLabel}</span>
              {r.pdfInfo?.isPDF && <> · <span style={{ color:T.blue }}>{r.pdfInfo.tokenCount} PDF tokens</span></>}
            </div>
          </div>
        </div>
      </div>

      {/* Extraction progress bar */}
      <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:11, fontWeight:700, color:T.text }}>Extraction Coverage</span>
            <span style={{ fontSize:11, fontWeight:700, color:confColor }}>{Math.round((extractedCt/totalF)*100)}%</span>
          </div>
          <div style={{ height:7, background:'#f3f4f6', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(extractedCt/totalF)*100}%`, background:confColor, borderRadius:4, transition:'width .5s ease' }}/>
          </div>
        </div>
        <div style={{ fontSize:22, fontWeight:800, color:confColor, minWidth:40, textAlign:'right' }}>{extractedCt}/{totalF}</div>
      </div>

      {billing && (
        <div style={{ background:'#f5f3ff', border:'1px solid #c4b5fd', borderRadius:10, padding:'11px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:18 }}>💳</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.purple }}>Billing Required detected</div>
            <div style={{ fontSize:12, color:'#6d28d9' }}>Document contains billing instructions. Use "Approve & Send to Billing" below.</div>
          </div>
          <button onClick={()=>setBilling(false)} style={{ background:'none', border:'none', cursor:'pointer', color:T.gray, fontSize:11 }}>Dismiss</button>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 292px', gap:18, alignItems:'start' }}>
        {/* LEFT */}
        <div>
          {/* Tab bar */}
          <div style={{ display:'flex', background:'#fff', borderRadius:'12px 12px 0 0', borderBottom:`1px solid ${T.border}`, overflowX:'auto' }}>
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ padding:'11px 16px', background:'none', border:'none', borderBottom:tab===t.id?`2px solid ${T.orange}`:'2px solid transparent', color:tab===t.id?T.orange:T.gray, fontWeight:tab===t.id?700:400, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', marginBottom:-1 }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Extracted Data ── */}
          {tab==='extracted' && (
            <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderTop:'none', borderRadius:'0 0 12px 12px', padding:'18px 20px' }}>
              {SECTIONS.map(section => {
                const sectionFields = REVIEW_FIELDS.filter(f => f.section === section)
                return (
                  <div key={section} style={{ marginBottom:22 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'1px', marginBottom:12, paddingBottom:6, borderBottom:`1px solid #f3f4f6` }}>
                      {section}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      {sectionFields.map(({ key, label }) => {
                        const wasExtracted = !!(r.extracted[key]?.trim())
                        const conf = r.debugMeta[key]?.confidence || 0
                        return (
                          <div key={key}>
                            <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4, display:'flex', alignItems:'center', gap:5 }}>
                              {label}
                              {wasExtracted
                                ? <span style={{ fontSize:9, color:T.green, fontWeight:700, background:'#f0fdf4', padding:'1px 6px', borderRadius:3, border:`1px solid #bbf7d0` }}>✓ AUTO {conf}%</span>
                                : <span style={{ fontSize:9, color:'#9ca3af', background:'#f3f4f6', padding:'1px 5px', borderRadius:3 }}>MANUAL</span>}
                            </label>
                            <input value={fields[key]||''} onChange={e=>setF(key,e.target.value)}
                              placeholder={`Enter ${label.toLowerCase()}…`}
                              style={{ ...inputSt, fontSize:13, background:wasExtracted?'#f0fdf4':'#fff', borderColor:wasExtracted?'#bbf7d0':T.border }}/>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Extended family */}
              {r.extFamily?.length > 0 && (
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'1px', marginBottom:10, paddingBottom:6, borderBottom:'1px solid #f3f4f6' }}>
                    Extended Family ({r.extFamily.length} members)
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead><tr style={{ background:'#f9fafb' }}>
                        {['Name','Relationship','Age','Cover','Premium'].map(h=>(
                          <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {r.extFamily.map((fm,i)=>(
                          <tr key={i} style={{ borderBottom:'1px solid #f9fafb' }}>
                            {[fm.name,fm.relationship,fm.age,fm.cover,fm.premium].map((v,j)=>(
                              <td key={j} style={{ padding:'7px 10px', color:T.text }}>{v||'—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4, display:'block' }}>Case Description *</label>
                <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} style={{ ...inputSt, resize:'vertical', fontSize:13 }}/>
              </div>
            </div>
          )}

          {/* ── Case Settings ── */}
          {tab==='case' && (
            <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderTop:'none', borderRadius:'0 0 12px 12px', padding:'18px 20px' }}>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                  Case Type
                  <span style={{ fontSize:10, fontWeight:700, color:confColor, background:confColor+'18', padding:'2px 8px', borderRadius:20 }}>{confLabel}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {visibleCTs.map(x=>{
                    const isDet = x.id===r.detectedCaseTypeId, isAlt=r.alternativeTypes.includes(x.id), isSel=x.id===selCT
                    return (
                      <button key={x.id} onClick={()=>setSelCT(x.id)}
                        style={{ padding:'10px 14px', borderRadius:9, border:`2px solid ${isSel?T.orange:isDet?T.green+'60':T.border}`, background:isSel?T.orangeL:isDet?'#f0fdf4':'#fff', textAlign:'left', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:'inherit' }}>
                        <span>
                          <span style={{ fontSize:13, fontWeight:isSel?700:500, color:T.text }}>{x.name}</span>
                          <span style={{ fontSize:11, color:T.gray, marginLeft:8 }}>{x.slaLabel}</span>
                        </span>
                        <span style={{ display:'flex', gap:4 }}>
                          {isDet&&<span style={{ fontSize:9, fontWeight:700, color:T.green, background:'#f0fdf4', padding:'2px 6px', borderRadius:3 }}>DETECTED</span>}
                          {!isDet&&isAlt&&<span style={{ fontSize:9, fontWeight:700, color:T.amber, background:'#fffbeb', padding:'2px 6px', borderRadius:3 }}>ALT</span>}
                          {isSel&&<span style={{ fontSize:9, fontWeight:700, color:T.orange, background:T.orangeL, padding:'2px 6px', borderRadius:3 }}>SELECTED</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6, display:'block' }}>Employer *</label>
                {r.extracted.employer && <div style={{ fontSize:11, color:T.gray, marginBottom:6 }}>From document: <strong style={{ color:T.text }}>{r.extracted.employer}</strong></div>}
                <select value={selEmp} onChange={e=>setSelEmp(e.target.value)} style={selectSt}>
                  <option value="">Select employer…</option>
                  {employers.map(e=><option key={e.id} value={e.id}>{e.name} ({e.number})</option>)}
                </select>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6, display:'block' }}>Priority</label>
                <div style={{ display:'flex', gap:6 }}>
                  {['Low','Medium','High','Critical'].map(p=>(
                    <button key={p} onClick={()=>setPriority(p)} style={{ flex:1, padding:'8px', borderRadius:7, border:`1.5px solid ${priority===p?T.orange:T.border}`, background:priority===p?T.orange:'#fff', color:priority===p?'#fff':'#374151', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{p}</button>
                  ))}
                </div>
              </div>

              <div style={{ padding:'12px 14px', background:billing?'#f5f3ff':'#f9fafb', border:`1px solid ${billing?'#c4b5fd':T.border}`, borderRadius:9 }}>
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                  <div onClick={()=>setBilling(b=>!b)} style={{ width:38, height:22, borderRadius:11, background:billing?T.purple:'#d1d5db', position:'relative', transition:'background .2s', flexShrink:0 }}>
                    <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:billing?18:2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:billing?T.purple:T.text }}>Billing Required</div>
                    <div style={{ fontSize:11, color:T.gray }}>Creates a Billing Task on the billing queue</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ── Debug Panel ── */}
          {tab==='debug' && (
            <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderTop:'none', borderRadius:'0 0 12px 12px', overflow:'hidden' }}>
              {/* PDF info banner */}
              {r.pdfInfo?.isPDF && (
                <div style={{ padding:'10px 16px', background:r.pdfInfo.tokenCount>0?'#f0fdf4':'#fff1f2', borderBottom:`1px solid ${T.border}`, display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ fontSize:16 }}>{r.pdfInfo.tokenCount>0?'✅':'⚠️'}</span>
                  <div style={{ fontSize:12 }}>
                    {r.pdfInfo.tokenCount>0
                      ? <><strong style={{ color:T.green }}>PDF text extracted</strong> — {r.pdfInfo.tokenCount} text tokens found, {r.rawLines?.length||0} lines reconstructed</>
                      : <><strong style={{ color:T.red }}>PDF text extraction limited</strong> — document may use compressed streams. Check Raw Text tab for what was recovered.</>
                    }
                  </div>
                </div>
              )}

              <div style={{ padding:'12px 16px', background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.text }}>🔬 Extraction Debug Panel</div>
                <div style={{ fontSize:11, color:T.gray, marginTop:2 }}>Every field, its extracted value, source location, strategy used, and confidence score.</div>
              </div>

              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f3f4f6' }}>
                      {['Field','Extracted Value','Source Location','Strategy','Confidence'].map(h=>(
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {REVIEW_FIELDS.map(({ key, label }) => {
                      const meta   = r.debugMeta[key] || { value:'', source:'Not found', confidence:0, strategy:'none' }
                      const found  = !!meta.value
                      const stratCfg = {
                        label_newline: { label:'Label↵Value', color:'#1e5fd9' },
                        label_colon:   { label:'Label: Value', color:'#059669' },
                        inline:        { label:'Pattern',      color:'#7c3aed' },
                        synthesised:   { label:'Synthesised',  color:'#d97706' },
                        none:          { label:'Not found',    color:'#9ca3af' },
                      }
                      const sc = stratCfg[meta.strategy||'none']
                      return (
                        <tr key={key} style={{ borderBottom:'1px solid #f9fafb', background:found?'#fff':'#fffafa' }}>
                          <td style={{ padding:'8px 12px', fontWeight:600, color:T.text, whiteSpace:'nowrap', fontSize:12 }}>{label}</td>
                          <td style={{ padding:'8px 12px', maxWidth:160 }}>
                            {found
                              ? <span style={{ fontSize:12, fontWeight:700, color:T.text, fontFamily:key==='idNumber'?'monospace':'inherit' }}>{meta.value}</span>
                              : <span style={{ fontSize:11, color:'#d1d5db', fontStyle:'italic' }}>—</span>}
                          </td>
                          <td style={{ padding:'8px 12px', maxWidth:220 }}>
                            <span style={{ fontSize:10, color:T.gray, lineHeight:1.5, display:'block' }}>{meta.source}</span>
                          </td>
                          <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                            <span style={{ fontSize:10, fontWeight:700, color:sc.color, background:sc.color+'18', padding:'2px 7px', borderRadius:4 }}>{sc.label}</span>
                          </td>
                          <td style={{ padding:'8px 12px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              <div style={{ width:50, height:5, background:'#f3f4f6', borderRadius:3, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${meta.confidence}%`, background:meta.confidence>=80?T.green:meta.confidence>=50?T.amber:meta.confidence>0?T.red:'transparent', borderRadius:3 }}/>
                              </div>
                              <span style={{ fontSize:11, fontWeight:700, color:meta.confidence>=80?T.green:meta.confidence>=50?T.amber:meta.confidence>0?T.red:'#d1d5db' }}>{meta.confidence}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Raw binary sample */}
              <div style={{ padding:'12px 16px', borderTop:`1px solid ${T.border}`, background:'#f9fafb' }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.text, marginBottom:6 }}>Raw PDF binary sample (first 600 chars)</div>
                <pre style={{ fontSize:10, color:'#6b7280', fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:120, overflowY:'auto', margin:0, background:'#1e1e2e', padding:'8px 10px', borderRadius:6, color:'#a8b5cc' }}>
                  {r.rawBinary||'(not available)'}
                </pre>
              </div>
            </div>
          )}

          {/* ── Reconstructed Text ── */}
          {tab==='raw' && (
            <div style={{ background:'#1e1e2e', border:`1px solid #2d2d3f`, borderTop:'none', borderRadius:'0 0 12px 12px' }}>
              <div style={{ padding:'10px 16px', borderBottom:'1px solid #2d2d3f', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:11, color:'#6b7280', fontFamily:'monospace' }}>{uploadedFile?.name} · {r.rawLines?.length||0} lines reconstructed</div>
                <span style={{ fontSize:10, color:T.orange, fontWeight:600 }}>This is what the parser sees</span>
              </div>
              {r.rawLines?.length > 0 ? (
                <div style={{ padding:'12px 16px', maxHeight:480, overflowY:'auto' }}>
                  {r.rawLines.map((line,i)=>(
                    <div key={i} style={{ display:'flex', gap:12, marginBottom:2, fontSize:11, fontFamily:'monospace' }}>
                      <span style={{ color:'#4a5568', minWidth:28, textAlign:'right', flexShrink:0 }}>{i+1}</span>
                      <span style={{ color:'#e2e8f0' }}>{line}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding:'32px 16px', textAlign:'center' }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>⚠️</div>
                  <div style={{ fontSize:13, color:'#a8b5cc', marginBottom:6 }}>No readable text could be reconstructed from this PDF.</div>
                  <div style={{ fontSize:11, color:'#6b7280' }}>The PDF may use compressed content streams (FlateDecode) which require a PDF library to decode.<br/>Check the Debug Panel raw binary sample to confirm.</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — summary + actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Summary card */}
          <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, padding:'15px 16px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:12 }}>Extraction Summary</div>
            {[
              ['Document',       uploadedFile?.name],
              ['Detected Type',  caseTypes.find(x=>x.id===selCT)?.name||'—'],
              ['Confidence',     confLabel],
              ['Fields Extracted',`${extractedCt} / ${totalF}`],
              ['Billing Flag',   billing?'Yes ⚡':'No'],
              ['SLA',            ct?.slaLabel||'—'],
              ['Extended Family',r.extFamily?.length ? `${r.extFamily.length} members` : 'None'],
            ].map(([k,v])=>v&&(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'4px 0', borderBottom:'1px solid #f9fafb' }}>
                <span style={{ fontSize:11, color:T.gray, flexShrink:0 }}>{k}</span>
                <span style={{ fontSize:11, fontWeight:600, color:k==='Detected Type'?T.orange:k==='Confidence'?confColor:T.text, textAlign:'right', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Key fields preview */}
          <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, padding:'15px 16px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:10 }}>Key Fields</div>
            {[
              ['Reference',  fields.policyRef],
              ['Member',     fields.memberName||[fields.memberFirstName,fields.memberSurname].filter(Boolean).join(' ')],
              ['ID Number',  fields.idNumber],
              ['Employer',   fields.employer],
              ['Consultant', fields.consultant],
              ['Premium',    fields.premium],
              ['Start Date', fields.effectiveDate],
              ['Beneficiary',fields.beneficiaryName],
              ['Contact',    fields.beneficiaryContact||fields.mobile],
            ].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'4px 0', borderBottom:'1px solid #f3f4f6' }}>
                <span style={{ fontSize:11, color:T.gray, flexShrink:0 }}>{k}</span>
                <span style={{ fontSize:11, fontWeight:600, color:T.text, textAlign:'right', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>
              </div>
            ))}
            {extractedCt===0 && <div style={{ fontSize:12, color:T.gray, textAlign:'center', padding:'8px 0' }}>No fields extracted. Enter manually.</div>}
          </div>

          {/* Actions */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {billing ? (
              <>
                <button onClick={handleCreate} disabled={submitting}
                  style={{ padding:'13px', background:T.purple, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:submitting?'not-allowed':'pointer', opacity:submitting?.7:1, fontFamily:'inherit' }}>
                  {submitting?'⏳ Creating…':'✅ Approve & Send to Billing'}
                </button>
                <button onClick={handleCreate} disabled={submitting}
                  style={{ padding:'13px', background:T.navy, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:submitting?'not-allowed':'pointer', opacity:submitting?.7:1, fontFamily:'inherit' }}>
                  Approve Only
                </button>
              </>
            ) : (
              <button onClick={handleCreate} disabled={submitting}
                style={{ padding:'13px', background:T.navy, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:submitting?'not-allowed':'pointer', opacity:submitting?.7:1, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {submitting?'⏳ Creating case…':'✅ Create Case'}
              </button>
            )}
            <button onClick={onBack} disabled={submitting}
              style={{ padding:'9px', background:'none', border:`1px solid ${T.border}`, borderRadius:9, fontSize:12, color:T.gray, cursor:'pointer', fontFamily:'inherit' }}>
              ← Upload Different File
            </button>
          </div>

          <div style={{ background:'#f0f7ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'11px 13px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.blue, marginBottom:3 }}>Auto-Allocation</div>
            <div style={{ fontSize:11, color:'#374151', lineHeight:1.5 }}>Assigned via Round Robin to <strong>General Administration Pool</strong>.</div>
          </div>
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4 — DONE
// ─────────────────────────────────────────────────────────────────────────────
function DonePhase({ c, onNew }) {
  return (
    <div style={{ maxWidth:520, margin:'60px auto', textAlign:'center', animation:'fadeIn .4s ease' }}>
      <div style={{ fontSize:60, marginBottom:14, lineHeight:1 }}>🎉</div>
      <h2 style={{ fontSize:22, fontWeight:800, color:T.text, margin:'0 0 6px' }}>Case Created Successfully</h2>
      <div style={{ fontSize:13, color:T.gray, marginBottom:24 }}>Document processed and case allocated to your team.</div>
      <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:'20px 22px', marginBottom:20, textAlign:'left' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ width:42, height:42, borderRadius:10, background:T.orangeL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📋</div>
          <div>
            <div style={{ fontFamily:'monospace', fontSize:15, fontWeight:800, color:T.orange }}>{c?.ref}</div>
            <StatusBadge status="Submitted"/>
          </div>
        </div>
        {[['Source','📧 Document Import'],['Member',c?.memberName||'—'],['SLA Due',c?.slaDate],['Source File',c?.sourceFile],['Extended Family',c?.extFamily?.length?`${c.extFamily.length} members`:'None']].map(([k,v])=>(
          <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #f9fafb' }}>
            <span style={{ fontSize:12, color:T.gray }}>{k}</span>
            <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{v||'—'}</span>
          </div>
        ))}
      </div>
      <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'12px 16px', marginBottom:20, textAlign:'left' }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.green, marginBottom:6 }}>✓ Timeline events recorded</div>
        {['Document uploaded and permanently attached','Fields extracted and reviewed','Case created with reference number','Auto-allocated to administrator (Round Robin)'].map(ev=>(
          <div key={ev} style={{ fontSize:11, color:'#374151', display:'flex', gap:6, marginBottom:3 }}>
            <span style={{ color:T.green }}>✓</span>{ev}
          </div>
        ))}
      </div>
      <button onClick={onNew} style={{ padding:'10px 22px', background:T.navy, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
        📧 Process Another Document
      </button>
    </div>
  )
}
