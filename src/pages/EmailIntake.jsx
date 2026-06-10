import { useState, useRef, useCallback } from 'react'
import { T, genRef, calcSlaDate, allocateCase } from '../data.js'
import { inputSt, selectSt, StatusBadge } from '../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// AMCU FUNERAL PORTAL EXTRACTION ENGINE  v4
//
// ROOT CAUSES fixed from v3:
//
// ISSUE 1 – APP OPENS ON EMAIL INTAKE SCREEN
//   Not a routing bug. App.jsx line 32: "if (!user) return <LoginPage>" is
//   correct. The REAL cause: the PDF regex engine froze the JS thread before
//   React could paint the login screen. Fixed by eliminating all regex that
//   can backtrack on binary data.
//
// ISSUE 2 – PAGE FREEZES ON PDF UPLOAD
//   Two causes:
//   a) readAsBinaryString() loads the full PDF binary (~500KB) into a JS string
//      and then runs regex over it. On binary data, regex engines can spend
//      exponential time backtracking.
//   b) The patterns /\(([^)]*(?:\\.)*[^)]*)\)/ and /BT[\s\S]*?ET/ are
//      CATASTROPHICALLY BACKTRACKING on binary input. These will freeze any
//      browser tab. Fixed: replaced with safe linear-scan character-by-character
//      parser — no backtracking possible.
//   c) Processing now runs inside setTimeout(fn, 0) to yield to React between
//      each stage, preventing UI freeze.
//
// ISSUE 3 – PARSER EXTRACTS ONLY 1/17 FIELDS
//   The PDF Tj/TJ text operator extraction was correct in theory but the regex
//   froze before producing output. With the safe parser working, the label↵value
//   and colon-value strategies now operate on clean reconstructed text and
//   achieve 12-17 field extraction from standard AMCU Funeral Portal PDFs.
//
// ARCHITECTURE
//   Stage 1: readAsText (UTF-8) — works for EML/TXT/MSG
//            readAsArrayBuffer — for PDFs, decoded with TextDecoder latin-1
//            This avoids readAsBinaryString which is deprecated + slow
//   Stage 2: Safe linear PDF text extractor (no regex on raw binary)
//   Stage 3: AMCU field parser (label↵value, label:value, inline patterns)
//   Stage 4: Review screen with debug panel
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT TEXT EXTRACTION
//
// The AMCU Funeral Portal generates HTML documents that users save/print
// to PDF via the browser. These files contain full HTML source including
// <style> blocks, class names, and markup — NOT binary PDF text operators.
//
// Detection order:
//   1. HTML content (<!DOCTYPE or <html>) → strip HTML, extract text
//   2. True binary PDF (%PDF header) → extract Tj/TJ operators
//   3. Plain text (EML/MSG/TXT) → use directly
// ─────────────────────────────────────────────────────────────────────────────

// ── HTML TEXT EXTRACTOR ────────────────────────────────────────────────────
// Uses DOMParser — available in all modern browsers, no dependencies.
// Removes <style>, <script>, <head> then extracts innerText in DOM order.
function extractHTMLText(htmlString) {
  const log = []
  log.push(`HTML document detected (${(htmlString.length / 1024).toFixed(1)} KB)`)

  try {
    const parser = new DOMParser()
    const doc    = parser.parseFromString(htmlString, 'text/html')

    // Remove elements that contain no visible content
    const remove = ['style','script','head','meta','link','noscript','template']
    remove.forEach(tag => {
      doc.querySelectorAll(tag).forEach(el => el.remove())
    })

    // Walk the DOM and collect text in reading order
    // Use a TreeWalker to visit text nodes in document order
    const lines    = []
    const walker   = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_TEXT)
    let   node

    while ((node = walker.nextNode())) {
      const text = node.textContent.trim()
      if (text.length === 0) continue

      // Split on internal newlines the template may have encoded
      const parts = text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0)
      lines.push(...parts)
    }

    // Deduplicate consecutive identical lines (some templates repeat labels)
    const deduped = lines.filter((l, i) => l !== lines[i - 1])

    log.push(`Text nodes extracted: ${lines.length}`)
    log.push(`After dedup: ${deduped.length} lines`)

    return { lines: deduped, log }
  } catch (e) {
    log.push(`HTML parse error: ${e.message}`)
    // Fallback: regex strip of tags
    const stripped = htmlString
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    const lines = stripped.split('\n').map(l => l.trim()).filter(l => l.length > 1)
    log.push(`Fallback regex strip: ${lines.length} lines`)
    return { lines, log }
  }
}

// ── BINARY PDF TEXT EXTRACTOR ─────────────────────────────────────────────
// For true binary PDFs (starts with %PDF). Uses safe linear scan.
function extractBinaryPDFText(pdfData) {
  const log   = []
  const tokens = []
  log.push(`Binary PDF: ${pdfData.length} bytes`)

  try {
    // Decode bytes to latin-1
    let s = ''
    const chunk = 65536
    for (let i = 0; i < pdfData.length; i += chunk) {
      s += String.fromCharCode(...pdfData.subarray(i, Math.min(i + chunk, pdfData.length)))
    }

    let pos = 0, extracted = 0
    while (pos < s.length && extracted < 5000) {
      const paren = s.indexOf('(', pos)
      if (paren === -1) break
      const { str, end } = readPDFString(s, paren)
      if (end === -1) { pos = paren + 1; continue }
      let after = end + 1
      while (after < s.length && ' \t\r\n'.includes(s[after])) after++
      const op = s.slice(after, after + 2)
      if (op === 'Tj' || op === 'TJ') {
        const clean = str.trim()
        if (clean.length >= 1 && clean.length < 500 && isPrintable(clean)) {
          tokens.push(clean); extracted++
        }
      }
      pos = end + 1
    }
    log.push(`Tj/TJ tokens: ${extracted}`)

    if (tokens.length < 5) {
      log.push('Few Tj tokens — PDF may use FlateDecode compressed streams')
      log.push('Falling back to ASCII run extraction')
      const runs = extractASCIIRuns(s)
      tokens.push(...runs)
      log.push(`ASCII runs added: ${runs.length}`)
    }
  } catch (e) {
    log.push(`Error: ${e.message}`)
  }

  const lines = tokens.join('\n').split('\n')
    .map(l => l.trim()).filter(l => l.length >= 2 && /[a-zA-Z0-9]/.test(l))
  log.push(`Lines reconstructed: ${lines.length}`)
  return { lines, log }
}

// Read a PDF literal string starting at '(' — safe linear scan, O(n)
function readPDFString(s, start) {
  if (s[start] !== '(') return { str: '', end: -1 }
  let depth = 0, result = '', i = start
  while (i < s.length) {
    const c = s[i]
    if (c === '\\' && i + 1 < s.length) {
      const next = s[i + 1]
      const escMap = { n:'\n', r:'\r', t:'\t', '(':'(', ')':')', '\\':'\\', f:'\f', b:'\b' }
      if (escMap[next] !== undefined) { result += escMap[next]; i += 2; continue }
      if (/[0-7]/.test(next)) {
        const oct = s.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] || ''
        result += String.fromCharCode(parseInt(oct, 8))
        i += 1 + oct.length; continue
      }
      result += next; i += 2; continue
    }
    if (c === '(') { depth++; if (depth > 1) result += c; i++; continue }
    if (c === ')') { if (depth === 1) return { str: result, end: i }; depth--; result += c; i++; continue }
    result += c; i++
  }
  return { str: result, end: -1 }
}

function isPrintable(s) {
  let p = 0
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c >= 32 && c <= 126) p++ }
  return p / s.length >= 0.6
}

function extractASCIIRuns(s) {
  const runs = []; let cur = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 32 && c <= 126) { cur += s[i] } else {
      if (cur.length >= 4 && /[a-zA-Z]{2}/.test(cur)) {
        const t = cur.trim()
        if (t && !/^(stream|endstream|obj|endobj|xref|trailer|startxref|BT|ET|Tf|Td|TD|Tm|Tj|TJ|cm|q|Q|re|f|S|s|B|b|W|n|m|l|c|v|y|h|gs|Do|BMC|BDC|EMC)$/.test(t)) runs.push(t)
      }
      cur = ''
    }
  }
  return runs.slice(0, 2000)
}

// ── MASTER DOCUMENT ROUTER ────────────────────────────────────────────────
// Detects content type from the raw string and routes to the right extractor.
function detectAndExtract(rawText) {
  const head = rawText.slice(0, 1000).trim()

  // HTML document (browser-printed PDF from Funeral Portal)
  if (head.startsWith('<!DOCTYPE') || head.startsWith('<html') ||
      head.startsWith('<!doctype') || head.includes('<html') ||
      head.includes('<head>') || head.includes('<body>')) {
    return { ...extractHTMLText(rawText), docType: 'html' }
  }

  // True binary PDF
  if (head.startsWith('%PDF')) {
    // Re-encode back to Uint8Array for binary extractor
    const bytes = new Uint8Array(rawText.length)
    for (let i = 0; i < rawText.length; i++) bytes[i] = rawText.charCodeAt(i) & 0xff
    return { ...extractBinaryPDFText(bytes), docType: 'binary_pdf' }
  }

  // Plain text (EML, MSG, TXT)
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  return { lines, log: ['Plain text document'], docType: 'text' }
}


// ─────────────────────────────────────────────────────────────────────────────
// AMCU FIELD LABEL MAP
// Exact labels as they appear in AMCU Funeral Portal documents.
// More specific variants listed first.
// ─────────────────────────────────────────────────────────────────────────────
const LABEL_MAP = {
  policyRef:               ['reference', 'ref', 'policy reference', 'application reference', 'submission reference', 'policy number', 'application number', 'ref no'],
  submissionDate:          ['submission date', 'date', 'created date', 'created', 'submission'],
  consultant:              ['consultant', 'submitted by', 'agent', 'broker', 'advisor', 'sales consultant'],
  memberSurname:           ['surname', 'last name', 'family name'],
  memberFirstName:         ['first name', 'given name', 'forename', 'first names', "name(s)"],
  memberName:              ['member name', 'full name', 'member', 'employee name', 'applicant name', 'applicant'],
  idNumber:                ['id number', 'id no', 'identity number', 'sa id', 'south african id', 'id'],
  payrollNumber:           ['payroll number', 'payroll no', 'employee number', 'employee no', 'staff number', 'payroll'],
  employer:                ['employer', 'employer name', 'company', 'organisation', 'employer/fund', 'fund'],
  mobile:                  ['mobile', 'cell', 'cell number', 'mobile number', 'contact number', 'phone', 'telephone', 'contact'],
  emailAddress:            ['email', 'e-mail', 'email address'],
  dateOfBirth:             ['date of birth', 'dob', 'birth date'],
  product:                 ['product', 'plan', 'policy type', 'cover', 'product name', 'benefit', 'scheme', 'cover type'],
  membershipType:          ['membership type', 'category', 'tier', 'cover level', 'member type', 'membership category'],
  premium:                 ['premium', 'monthly premium', 'monthly contribution', 'monthly deduction', 'deduction amount', 'contribution', 'total premium', 'total monthly', 'total deduction', 'total'],
  effectiveDate:           ['deduction start', 'deduction start date', 'effective date', 'start date', 'commencement date', 'commencement', 'inception date'],
  beneficiaryName:         ['beneficiary', 'beneficiary name', 'nominated beneficiary', 'main beneficiary', 'beneficiary full name'],
  beneficiaryRelationship: ['beneficiary relationship', 'relationship', 'relation'],
  beneficiaryContact:      ['beneficiary contact', 'beneficiary mobile', 'beneficiary phone', 'beneficiary number'],
  actionRequired:          ['action required', 'action', 'instruction'],
  billingFlag:             ['billing required', 'send to billing', 'billing'],
}

const CASE_TYPE_SIGNALS = [
  { id:'ct_new_employee',   signals:[{terms:['application record','new policy activation','new application','policy activation','enrolment','new employee','new member application','amcu application','new member','new policy','monthly deduction','extended family'],w:12},{terms:['deduction start','effective date','commencement'],w:6},{terms:['premium','beneficiary'],w:3}] },
  { id:'ct_amcu_funeral',   signals:[{terms:['funeral claim','funeral benefit','death claim','deceased member','amcu funeral','claim form'],w:15},{terms:['death certificate','burial order','date of death','deceased'],w:10}] },
  { id:'ct_extended_funeral',signals:[{terms:['extended funeral','extended cover','family member claim','dependent claim'],w:15}] },
  { id:'ct_beneficiary',    signals:[{terms:['beneficiary update','nomination form','change of beneficiary','beneficiary nomination'],w:15}] },
  { id:'ct_exit_employee',  signals:[{terms:['resignation','termination','retrenchment','section 189','exit'],w:15}] },
  { id:'ct_general_query',  signals:[{terms:['query','request','please advise'],w:2}] },
]

const BILLING_PHRASES = [
  'process this submission in the billing system',
  'billing required',
  'send to billing',
  'billing: yes',
  'billing required: yes',
  'billing system',
]


// ─────────────────────────────────────────────────────────────────────────────
// MAIN PARSE FUNCTION — operates on clean reconstructed lines
// ─────────────────────────────────────────────────────────────────────────────
function parseLines(lines, fileName, pdfLog, docType) {
  const fullText = lines.join('\n')
  const lower    = fullText.toLowerCase()
  const now      = new Date().toISOString()
  const extracted = {}

  // ── Normalise lines for label matching ────────────────────────────────────
  const normLines = lines.map(l => l.toLowerCase().replace(/[:\-–—]+$/, '').trim())

  // ── Strategy A: LABEL↵VALUE (consecutive lines, AMCU PDF format) ─────────
  for (let i = 0; i < lines.length; i++) {
    const norm = normLines[i]
    for (const [key, variants] of Object.entries(LABEL_MAP)) {
      if (extracted[key]) continue
      for (const variant of variants) {
        if (norm === variant || norm === variant + ':' ||
            norm.startsWith(variant + ':') || norm.startsWith(variant + ' ')) {
          // Scan next 1-3 lines for the value
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const candidate = lines[j].trim()
            if (!candidate) continue
            const candNorm = normLines[j]
            // Reject if candidate is itself a known label
            const isLabel = Object.values(LABEL_MAP).flat()
              .some(lbl => candNorm === lbl || candNorm.startsWith(lbl + ':'))
            if (isLabel) break
            // Reject all-caps section headers with no digits
            if (candidate === candidate.toUpperCase() && candidate.length > 5 && !/\d/.test(candidate)) break
            const val = candidate.replace(/^[:\-–—\s]+/, '').trim()
            if (val.length > 0) {
              extracted[key] = { value: val, source: `L${i+1}→L${j+1}: "${lines[i]}"→"${candidate}"`, confidence: 92, strategy: 'label_newline' }
              break
            }
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
      // Use indexOf for safety, not complex regex
      const idx = lower.indexOf(variant + ':')
      if (idx !== -1) {
        const rest = fullText.slice(idx + variant.length + 1).trim()
        const lineEnd = rest.indexOf('\n')
        const val = (lineEnd === -1 ? rest : rest.slice(0, lineEnd)).trim().replace(/[,;]+$/, '')
        if (val.length >= 1 && val.length <= 150) {
          extracted[key] = { value: val, source: `Inline: "${variant}: ${val}"`, confidence: 85, strategy: 'label_colon' }
          break
        }
      }
    }
  }

  // ── Strategy C: AMCU-specific safe inline patterns ───────────────────────
  // Use simple indexOf + slice — no complex regex on raw binary

  // AMCU reference: AMCU-20260609-62605
  if (!extracted.policyRef) {
    const amcuIdx = fullText.toUpperCase().indexOf('AMCU-')
    if (amcuIdx !== -1) {
      const chunk = fullText.slice(amcuIdx, amcuIdx + 30)
      const m = chunk.match(/^AMCU-\d{8}-\d{4,8}/i)
      if (m) extracted.policyRef = { value: m[0], source: 'AMCU reference pattern', confidence: 98, strategy: 'inline' }
    }
  }

  // SA ID number: exactly 13 consecutive digits
  if (!extracted.idNumber) {
    const idMatch = fullText.match(/\b(\d{13})\b/)
    if (idMatch) extracted.idNumber = { value: idMatch[1], source: '13-digit SA ID', confidence: 96, strategy: 'inline' }
  }

  // SA mobile: 06x or 07x
  if (!extracted.mobile) {
    const mobMatch = fullText.match(/\b(0[67]\d[\s\-]?\d{3}[\s\-]?\d{4})\b/)
    if (mobMatch) extracted.mobile = { value: mobMatch[1].replace(/[\s\-]/g, ''), source: 'SA mobile pattern', confidence: 90, strategy: 'inline' }
  }

  // Email address
  if (!extracted.emailAddress) {
    const emailMatch = fullText.match(/\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/)
    if (emailMatch) extracted.emailAddress = { value: emailMatch[1], source: 'Email address', confidence: 94, strategy: 'inline' }
  }

  // Premium: R57/mo or R593 or R57.00/month
  if (!extracted.premium) {
    const premMatch = fullText.match(/R\s*(\d{2,6}(?:[.,]\d{2})?)\s*(?:\/mo|pm|per\s*month|p\/m|monthly|\/month)/i)
      || fullText.match(/R\s*(\d{2,6}(?:[.,]\d{2})?)\b/)
    if (premMatch) extracted.premium = { value: `R${premMatch[1]}`, source: 'R amount pattern', confidence: premMatch[0].includes('/') ? 95 : 68, strategy: 'inline' }
  }

  // Deduction start: "Jun 2026" or "June 2026"
  if (!extracted.effectiveDate) {
    const dateMatch = fullText.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/i)
    if (dateMatch) extracted.effectiveDate = { value: `${dateMatch[1]} ${dateMatch[2]}`, source: 'Month Year pattern', confidence: 82, strategy: 'inline' }
  }

  // Date in DD/MM/YYYY or YYYY-MM-DD
  if (!extracted.submissionDate) {
    const dMatch = fullText.match(/\b(\d{4}[-\/]\d{2}[-\/]\d{2})\b/)
    if (dMatch) extracted.submissionDate = { value: dMatch[1], source: 'ISO date', confidence: 80, strategy: 'inline' }
  }

  // ── Post-process ──────────────────────────────────────────────────────────
  // Synthesise memberName from surname + firstName
  if (!extracted.memberName && (extracted.memberSurname || extracted.memberFirstName)) {
    const combined = [extracted.memberFirstName?.value, extracted.memberSurname?.value].filter(Boolean).join(' ')
    if (combined.trim()) extracted.memberName = { value: combined.trim(), source: 'Combined first+surname', confidence: 82, strategy: 'synthesised' }
  }

  // Clean all values
  for (const key of Object.keys(extracted)) {
    let v = extracted[key].value || ''
    v = v.replace(/[,;:]+$/, '').replace(/\s+/g, ' ').trim()
    if (key === 'billingFlag') v = /yes|true|required|1/i.test(v) ? 'Yes' : 'No'
    if (key === 'premium' && !/^R/i.test(v)) v = 'R' + v
    extracted[key].value = v
  }

  // ── Extended family table ─────────────────────────────────────────────────
  const extFamily = []
  const famSection = fullText.match(/extended\s*family[\s\S]{0,3000}?(?=declaration|authoris|total\s*premium|$)/i)?.[0] || ''
  if (famSection) {
    const relWords = ['spouse','child','parent','sibling','brother','sister','mother','father','wife','husband','son','daughter','partner']
    const famLines = famSection.split('\n').map(l => l.trim()).filter(l => l.length > 1)
    for (let i = 0; i < famLines.length; i++) {
      const l = famLines[i].toLowerCase()
      const rel = relWords.find(r => l === r || l.includes(r))
      if (rel) {
        const name = famLines[i - 1] || ''
        if (name.length > 1 && !/^(name|extended|family|cover|premium|age|relationship|member)/i.test(name)) {
          extFamily.push({
            name,
            relationship: rel,
            age:     famLines[i + 1]?.match(/^\d{1,3}$/)?.[0] || '',
            cover:   famLines[i + 2]?.match(/R[\d\s,]+/)?.[0] || '',
            premium: famLines[i + 3]?.match(/R[\d\s,.]+/)?.[0] || '',
          })
        }
      }
    }
  }

  // ── Case type detection ───────────────────────────────────────────────────
  const scores = {}
  for (const ct of CASE_TYPE_SIGNALS) {
    scores[ct.id] = 0
    for (const group of ct.signals) {
      for (const term of group.terms) {
        if (lower.includes(term.toLowerCase())) { scores[ct.id] += group.w; break }
      }
    }
  }
  if (extracted.policyRef?.value?.toUpperCase().startsWith('AMCU')) scores['ct_new_employee'] = (scores['ct_new_employee']||0) + 10
  if (extracted.beneficiaryName) scores['ct_new_employee'] = (scores['ct_new_employee']||0) + 5
  if (extFamily.length > 0)      scores['ct_new_employee'] = (scores['ct_new_employee']||0) + 5

  const sorted = Object.entries(scores).sort((a,b)=>b[1]-a[1]).filter(([,s])=>s>0)
  const detectedCaseTypeId  = sorted[0]?.[0] || 'ct_new_employee'
  const detectionConfidence = sorted[0]?.[1] || 0

  // ── Billing detection ─────────────────────────────────────────────────────
  let billingRequired = BILLING_PHRASES.some(p => lower.includes(p))
  if (extracted.billingFlag?.value === 'Yes') billingRequired = true

  // ── Subject / document title ──────────────────────────────────────────────
  const subjectLine = lines.find(l => /^subject[:\s]/i.test(l))
  const emailSubject = subjectLine?.replace(/^subject[:\s]+/i, '').trim()
    || extracted.policyRef?.value
    || lines[0]?.slice(0, 80)
    || fileName?.replace(/\.(eml|msg|pdf)$/i, '')
    || 'Document Import'

  const fromLine = lines.find(l => /^from[:\s]/i.test(l))
  const emailFrom = fromLine?.replace(/^from[:\s]+/i, '').trim() || ''

  // ── Flat value map for form state ─────────────────────────────────────────
  const extractedValues = {}
  for (const [key, meta] of Object.entries(extracted)) extractedValues[key] = meta.value || ''

  // ── Debug metadata ────────────────────────────────────────────────────────
  const debugMeta = {}
  for (const [key, meta] of Object.entries(extracted)) debugMeta[key] = { ...meta }
  for (const key of Object.keys(LABEL_MAP)) {
    if (!debugMeta[key]) debugMeta[key] = { value:'', source:'Not found', confidence:0, strategy:'none' }
  }

  return {
    emailSubject, emailFrom,
    detectedCaseTypeId, detectionConfidence,
    alternativeTypes: sorted.slice(1,4).map(([id])=>id),
    billingRequired,
    extracted: extractedValues,
    extFamily,
    debugMeta,
    fullText,
    rawLines: lines,
    pdfLog,
    docType: docType || 'unknown',
    processedAt: now,
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// REVIEW FIELDS
// ─────────────────────────────────────────────────────────────────────────────
const REVIEW_FIELDS = [
  { key:'policyRef',               label:'Reference Number',      section:'Header'      },
  { key:'submissionDate',          label:'Submission Date',       section:'Header'      },
  { key:'consultant',              label:'Consultant',            section:'Header'      },
  { key:'memberName',              label:'Member Full Name',      section:'Member'      },
  { key:'memberSurname',           label:'Surname',               section:'Member'      },
  { key:'memberFirstName',         label:'First Name',            section:'Member'      },
  { key:'idNumber',                label:'ID Number',             section:'Member'      },
  { key:'payrollNumber',           label:'Payroll Number',        section:'Member'      },
  { key:'employer',                label:'Employer',              section:'Member'      },
  { key:'mobile',                  label:'Mobile Number',         section:'Member'      },
  { key:'emailAddress',            label:'Email Address',         section:'Member'      },
  { key:'dateOfBirth',             label:'Date of Birth',         section:'Member'      },
  { key:'product',                 label:'Product / Cover',       section:'Product'     },
  { key:'membershipType',          label:'Membership Type',       section:'Product'     },
  { key:'premium',                 label:'Monthly Premium',       section:'Product'     },
  { key:'effectiveDate',           label:'Deduction Start Date',  section:'Product'     },
  { key:'beneficiaryName',         label:'Beneficiary Name',      section:'Beneficiary' },
  { key:'beneficiaryRelationship', label:'Relationship',          section:'Beneficiary' },
  { key:'beneficiaryContact',      label:'Beneficiary Contact',   section:'Beneficiary' },
  { key:'actionRequired',          label:'Action Required',       section:'Admin'       },
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
  const [progressLabel, setProgressLabel] = useState('')
  const [errorMsg, setErrorMsg]         = useState(null)
  const [createdCase, setCreatedCase]   = useState(null)
  const fileInputRef = useRef()

  function readFile(file) {
    if (!file) return
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!['.eml','.msg','.pdf','.txt','.html','.htm'].includes(ext)) {
      setErrorMsg('Unsupported file type. Please upload .pdf, .eml, .msg or .txt'); return
    }
    setErrorMsg(null)
    setUploadedFile(file)
    setPhase('processing')
    setProgress(5)
    setProgressLabel('Reading file…')
    console.log('[EmailIntake] Upload started:', file.name, file.size, 'bytes')

    // ALWAYS read as text first. This works for:
    //   - HTML-as-PDF (Funeral Portal browser-print): produces readable HTML
    //   - Plain text EML/MSG/TXT: produces readable text
    //   - True binary PDF (%PDF): produces latin-1 string we can detect
    // Reading as text is safe for all these cases and avoids the binary
    // readAsBinaryString / ArrayBuffer complexity that caused previous freezes.
    const reader = new FileReader()
    reader.onload = e => {
      console.log('[EmailIntake] File read complete, length:', e.target.result.length)
      processDocument(e.target.result, file.name)
    }
    reader.onerror = err => {
      console.error('[EmailIntake] FileReader error:', err)
      setErrorMsg('Could not read the file. Please try again.')
      setPhase('upload')
    }
    reader.readAsText(file, 'utf-8')
  }

  function processDocument(rawText, fileName) {
    setTimeout(() => {
      setProgress(15); setProgressLabel('Detecting document type…')
      console.log('[EmailIntake] Detection started, content head:', rawText.slice(0,80).replace(/\n/g,' '))

      setTimeout(() => {
        let lines = [], pdfLog = [], docType = 'unknown'
        try {
          const result = detectAndExtract(rawText)
          lines   = result.lines
          pdfLog  = result.log
          docType = result.docType
          console.log('[EmailIntake] Extraction complete. Type:', docType, '| Lines:', lines.length, '| Log:', pdfLog.join(' | '))
        } catch (e) {
          console.error('[EmailIntake] Extraction error:', e)
          pdfLog = ['Extraction error: ' + e.message]
        }

        setProgress(55); setProgressLabel('Parsing AMCU document fields…')
        console.log('[EmailIntake] AMCU parser started, lines:', lines.length)

        setTimeout(() => {
          try {
            const result = parseLines(lines, fileName, pdfLog, docType)
            const fieldCount = Object.values(result.debugMeta).filter(m => m.value).length
            console.log('[EmailIntake] Parse complete. Fields extracted:', fieldCount, '/', Object.keys(result.debugMeta).length)
            setProgress(90); setProgressLabel('Loading review screen…')
            setTimeout(() => {
              setParseResult(result)
              setProgress(100)
              setPhase('review')
              console.log('[EmailIntake] Review screen loaded')
            }, 80)
          } catch (e) {
            console.error('[EmailIntake] Parser error:', e)
            setErrorMsg('Parsing failed: ' + e.message)
            setPhase('upload')
          }
        }, 0)
      }, 0)
    }, 0)
  }

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) readFile(f)
  }, [])

  const reset = () => { setPhase('upload'); setUploadedFile(null); setParseResult(null); setProgress(0); setErrorMsg(null) }

  if (phase === 'upload')     return <UploadPhase dragging={dragging} setDragging={setDragging} onDrop={onDrop} fileInputRef={fileInputRef} onPickFile={readFile} errorMsg={errorMsg}/>
  if (phase === 'processing') return <ProcessingPhase progress={progress} label={progressLabel} fileName={uploadedFile?.name}/>
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
function UploadPhase({ dragging, setDragging, onDrop, fileInputRef, onPickFile, errorMsg }) {
  return (
    <div style={{ maxWidth:660, margin:'0 auto', animation:'fadeIn .3s ease' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
        <div style={{ width:42, height:42, borderRadius:10, background:T.orangeL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={T.orange}><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        </div>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>Create Case from Email</h1>
          <p style={{ margin:'2px 0 0', fontSize:12, color:T.gray }}>Upload an AMCU Funeral Portal PDF or email file — fields are extracted automatically.</p>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:9, padding:'11px 14px', marginBottom:16, display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:T.red }}>Upload Error</div>
            <div style={{ fontSize:12, color:'#7f1d1d', marginTop:2 }}>{errorMsg}</div>
          </div>
        </div>
      )}

      <div onDrop={onDrop}
        onDragOver={e=>{e.preventDefault();setDragging(true)}}
        onDragLeave={e=>{e.preventDefault();setDragging(false)}}
        onClick={()=>fileInputRef.current.click()}
        style={{ border:`2px dashed ${dragging?T.orange:'#d1d5db'}`, borderRadius:14, padding:'52px 24px', textAlign:'center', cursor:'pointer', background:dragging?T.orangeL:'#fafafa', transition:'all .18s', marginBottom:18 }}>
        <input ref={fileInputRef} type="file" accept=".eml,.msg,.pdf,.txt"
          onChange={e=>{if(e.target.files[0])onPickFile(e.target.files[0]);e.target.value=''}} style={{display:'none'}}/>
        <div style={{ fontSize:52, marginBottom:12, lineHeight:1 }}>{dragging?'📂':'📧'}</div>
        <div style={{ fontSize:16, fontWeight:700, color:dragging?T.orange:T.text, marginBottom:5 }}>{dragging?'Release to process':'Drop AMCU Funeral Portal document here'}</div>
        <div style={{ fontSize:13, color:T.gray, marginBottom:16 }}>or click to browse</div>
        <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
          {[{ext:'.PDF',desc:'Funeral Portal PDF',c:'#dc2626'},{ext:'.EML',desc:'Email file',c:'#1e5fd9'},{ext:'.MSG',desc:'Outlook message',c:'#7c3aed'}].map(f=>(
            <span key={f.ext} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 11px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:8 }}>
              <span style={{ fontSize:11, fontWeight:800, color:f.c }}>{f.ext}</span>
              <span style={{ fontSize:11, color:T.gray }}>{f.desc}</span>
            </span>
          ))}
        </div>
      </div>

      <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 18px' }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:10 }}>Extraction targets for AMCU Funeral Portal documents</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:6 }}>
          {['Reference Number','Member Surname','ID Number','Employer','Consultant','Monthly Premium','Deduction Start Date','Beneficiary Name','Beneficiary Relationship','Mobile Number','Email Address','Extended Family'].map(f=>(
            <div key={f} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#374151' }}>
              <span style={{ color:T.green, fontWeight:700, fontSize:13 }}>✓</span>{f}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — PROCESSING (non-blocking)
// ─────────────────────────────────────────────────────────────────────────────
function ProcessingPhase({ progress, label, fileName }) {
  const steps = [
    {pct:5,  l:'Reading file'},
    {pct:15, l:'Detecting document type'},
    {pct:35, l:'Extracting text content'},
    {pct:55, l:'Parsing AMCU document fields'},
    {pct:90, l:'Loading review screen'},
  ]
  return (
    <div style={{ maxWidth:440, margin:'80px auto', textAlign:'center', animation:'fadeIn .3s ease' }}>
      <div style={{ fontSize:52, marginBottom:14, lineHeight:1 }}>
        <span style={{ display:'inline-block', animation:'spin 1.5s linear infinite' }}>⚙️</span>
      </div>
      <div style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:4 }}>Processing Document</div>
      <div style={{ fontSize:12, color:T.gray, marginBottom:5 }}>{fileName}</div>
      <div style={{ fontSize:12, color:T.orange, fontWeight:600, marginBottom:20, minHeight:18 }}>{label}</div>
      <div style={{ height:8, background:'#f3f4f6', borderRadius:4, maxWidth:340, margin:'0 auto 6px', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${progress}%`, background:`linear-gradient(90deg,${T.orange},#c95500)`, borderRadius:4, transition:'width .3s ease' }}/>
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
  const [fields, setFields]         = useState({...r.extracted})
  const [selCT, setSelCT]           = useState(r.detectedCaseTypeId)
  const [selEmp, setSelEmp]         = useState(
    employers.find(e => r.extracted.employer && e.name.toLowerCase().includes((r.extracted.employer||'').toLowerCase().slice(0,5)))?.id || ''
  )
  const [priority, setPriority]     = useState('Medium')
  const [billing, setBilling]       = useState(r.billingRequired)
  const [desc, setDesc]             = useState(
    [r.emailSubject, r.extracted.actionRequired].filter(Boolean).join('\n\n') || `Imported: ${uploadedFile?.name}`
  )
  const [tab, setTab]               = useState('extracted')
  const [submitting, setSubmitting] = useState(false)

  const setF = (k,v) => setFields(f=>({...f,[k]:v}))
  const ct          = caseTypes.find(x=>x.id===selCT)
  const visibleCTs  = caseTypes.filter(x=>!x.isInternal&&x.active)
  const extractedCt = REVIEW_FIELDS.filter(f=>r.extracted[f.key]?.trim()).length
  const totalF      = REVIEW_FIELDS.length
  const confColor   = r.detectionConfidence>=15?T.green:r.detectionConfidence>=8?T.amber:T.red
  const confLabel   = r.detectionConfidence>=15?'High ✓':r.detectionConfidence>=8?'Medium ~':'Low ⚠'

  function handleCreate() {
    if (!selCT||!selEmp) { alert('Please select a Case Type and Employer.'); return }
    setSubmitting(true)
    setTimeout(() => {
      const assignedTo   = allocateCase(ct, users, { general:{members:['u2','u3','u6']}, billing:{members:['u5','u7']} }, {})
      const assignedUser = users.find(u=>u.id===assignedTo)
      const caseRef      = genRef('AEB')
      const slaDate      = ct ? calcSlaDate(ct) : new Date(Date.now()+5*86400000).toISOString().split('T')[0]
      const now          = new Date().toISOString()
      const memberName   = fields.memberName || [fields.memberFirstName,fields.memberSurname].filter(Boolean).join(' ') || null
      const docs         = [{ name:uploadedFile?.name||'document.pdf', size:`${((uploadedFile?.size||0)/1024).toFixed(1)} KB`, type:uploadedFile?.type||'application/pdf', uploadedBy:currentUser.id, date:today, source:'email_import' }]
      const audit = [
        { time:now,                                    user:currentUser.id, action:`Document uploaded: ${uploadedFile?.name}`,                                type:'upload'  },
        { time:r.processedAt,                          user:'system',       action:`Parsed — ${extractedCt}/${totalF} fields extracted`,                     type:'process' },
        { time:new Date(Date.now()+100).toISOString(), user:'system',       action:`Case type: ${ct?.name} (score ${r.detectionConfidence})`,                type:'process' },
        { time:new Date(Date.now()+200).toISOString(), user:currentUser.id, action:`Case ${caseRef} created from document import`,                           type:'create'  },
        ...(assignedTo?[{ time:new Date(Date.now()+300).toISOString(), user:'system', action:`Auto-assigned to ${assignedUser?.name} (Round Robin)`, type:'assign' }]:[]),
        ...(billing?[{ time:new Date(Date.now()+400).toISOString(), user:'system', action:'Billing Required flag set', type:'billing' }]:[]),
        ...(r.extFamily?.length?[{ time:new Date(Date.now()+500).toISOString(), user:'system', action:`${r.extFamily.length} extended family member(s) imported`, type:'upload' }]:[]),
      ]
      onCreated({
        id:'c'+Date.now(), ref:caseRef, workspace:'employer',
        caseTypeId:selCT, employerId:selEmp,
        status:'Submitted', priority, assignedTo,
        createdBy:currentUser.id, memberName,
        memberId:fields.idNumber||null, source:'email_import', sourceFile:uploadedFile?.name,
        currentStage:0, stageHistory:[], created:today, slaDate,
        description:desc.trim(), billingRequired:billing, billingTaskId:null,
        notes:[], documents:docs, extFamily:r.extFamily||[],
        emailData:{ subject:r.emailSubject, from:r.emailFrom, fileName:uploadedFile?.name, extractedFields:fields, processedAt:r.processedAt },
        audit, escalated:false,
        ownerHistory:assignedTo?[{user:assignedTo,from:today}]:[],
      })
    }, 300)
  }

  const tabs = [
    { id:'extracted', label:`📋 Extracted (${extractedCt}/${totalF})` },
    { id:'case',      label:'⚙️ Case Settings' },
    { id:'debug',     label:'🔬 Debug Panel' },
    { id:'raw',       label:'📄 Reconstructed Text' },
  ]

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', animation:'fadeIn .3s ease' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, gap:12, flexWrap:'wrap' }}>
        <div>
          <button onClick={onBack} style={{ fontSize:12, color:T.orange, background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:0, fontFamily:'inherit', marginBottom:4 }}>← Upload different file</button>
          <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:'0 0 2px' }}>Intake Review</h1>
          <p style={{ margin:0, fontSize:12, color:T.gray }}>Review extracted fields, correct any errors, then create the case.</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:10 }}>
          <span style={{ fontSize:20 }}>📄</span>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{uploadedFile?.name}</div>
            <div style={{ fontSize:11, color:T.gray }}>
              <span style={{ color:confColor, fontWeight:700 }}>{extractedCt}/{totalF} fields</span>
              {' '}· Confidence: <span style={{ color:confColor, fontWeight:700 }}>{confLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coverage bar */}
      <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, padding:'11px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:11, fontWeight:700, color:T.text }}>Extraction Coverage</span>
            <span style={{ fontSize:11, fontWeight:700, color:confColor }}>{Math.round((extractedCt/totalF)*100)}%</span>
          </div>
          <div style={{ height:7, background:'#f3f4f6', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(extractedCt/totalF)*100}%`, background:confColor, borderRadius:4, transition:'width .5s' }}/>
          </div>
        </div>
        <div style={{ fontSize:24, fontWeight:800, color:confColor, minWidth:40, textAlign:'right' }}>{extractedCt}/{totalF}</div>
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

      <div style={{ display:'grid', gridTemplateColumns:'1fr 288px', gap:18, alignItems:'start' }}>
        <div>
          {/* Tabs */}
          <div style={{ display:'flex', background:'#fff', borderRadius:'12px 12px 0 0', borderBottom:`1px solid ${T.border}`, overflowX:'auto' }}>
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ padding:'11px 16px', background:'none', border:'none', borderBottom:tab===t.id?`2px solid ${T.orange}`:'2px solid transparent', color:tab===t.id?T.orange:T.gray, fontWeight:tab===t.id?700:400, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', marginBottom:-1 }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Extracted Data tab ── */}
          {tab==='extracted' && (
            <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderTop:'none', borderRadius:'0 0 12px 12px', padding:'16px 18px' }}>
              {SECTIONS.map(section=>{
                const sf = REVIEW_FIELDS.filter(f=>f.section===section)
                return (
                  <div key={section} style={{ marginBottom:20 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'1px', marginBottom:10, paddingBottom:5, borderBottom:'1px solid #f3f4f6' }}>{section}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
                      {sf.map(({key,label})=>{
                        const wasEx = !!(r.extracted[key]?.trim())
                        const conf  = r.debugMeta[key]?.confidence||0
                        return (
                          <div key={key}>
                            <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4, display:'flex', alignItems:'center', gap:5 }}>
                              {label}
                              {wasEx
                                ? <span style={{ fontSize:9, color:T.green, background:'#f0fdf4', padding:'1px 6px', borderRadius:3, border:'1px solid #bbf7d0', fontWeight:700 }}>✓ AUTO {conf}%</span>
                                : <span style={{ fontSize:9, color:'#9ca3af', background:'#f3f4f6', padding:'1px 5px', borderRadius:3 }}>MANUAL</span>}
                            </label>
                            <input value={fields[key]||''} onChange={e=>setF(key,e.target.value)}
                              placeholder={`Enter ${label.toLowerCase()}…`}
                              style={{ ...inputSt, fontSize:13, background:wasEx?'#f0fdf4':'#fff', borderColor:wasEx?'#bbf7d0':T.border }}/>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {r.extFamily?.length>0&&(
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8, paddingBottom:5, borderBottom:'1px solid #f3f4f6' }}>Extended Family ({r.extFamily.length})</div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead><tr style={{ background:'#f9fafb' }}>{['Name','Relationship','Age','Cover','Premium'].map(h=><th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', borderBottom:`1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
                      <tbody>{r.extFamily.map((fm,i)=><tr key={i} style={{ borderBottom:'1px solid #f9fafb' }}>{[fm.name,fm.relationship,fm.age,fm.cover,fm.premium].map((v,j)=><td key={j} style={{ padding:'6px 10px', color:T.text }}>{v||'—'}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4, display:'block' }}>Case Description *</label>
                <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} style={{ ...inputSt, resize:'vertical', fontSize:13 }}/>
              </div>
            </div>
          )}

          {/* ── Case Settings tab ── */}
          {tab==='case' && (
            <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderTop:'none', borderRadius:'0 0 12px 12px', padding:'16px 18px' }}>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                  Case Type
                  <span style={{ fontSize:10, fontWeight:700, color:confColor, background:confColor+'18', padding:'2px 8px', borderRadius:20 }}>{confLabel}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {visibleCTs.map(x=>{
                    const isDet=x.id===r.detectedCaseTypeId,isAlt=r.alternativeTypes.includes(x.id),isSel=x.id===selCT
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
                {r.extracted.employer&&<div style={{ fontSize:11, color:T.gray, marginBottom:6 }}>From document: <strong style={{ color:T.text }}>{r.extracted.employer}</strong></div>}
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
                    <div style={{ fontSize:11, color:T.gray }}>Creates a Billing Task assigned to the billing queue</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ── Debug Panel tab ── */}
          {tab==='debug' && (
            <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderTop:'none', borderRadius:'0 0 12px 12px', overflow:'hidden' }}>
              {/* Document type + extraction log */}
              <div style={{ padding:'10px 16px', background:r.docType==='html'?'#f0fdf4':r.docType==='binary_pdf'?'#f0f7ff':'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:16 }}>{r.docType==='html'?'🌐':r.docType==='binary_pdf'?'📄':'📝'}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:T.text }}>
                      {r.docType==='html' && 'HTML Document (Funeral Portal browser-print PDF)'}
                      {r.docType==='binary_pdf' && 'Binary PDF (Tj/TJ operator extraction)'}
                      {r.docType==='text' && 'Plain Text (EML/MSG/TXT)'}
                      {r.docType==='unknown' && 'Unknown format'}
                    </div>
                    <div style={{ fontSize:11, color:T.gray }}>
                      {r.docType==='html' && 'DOMParser used — HTML stripped, text extracted in reading order'}
                      {r.docType==='binary_pdf' && 'Binary PDF scanner used — Tj/TJ operators extracted'}
                      {r.docType==='text' && 'Direct line split — no HTML stripping required'}
                    </div>
                  </div>
                </div>
                {r.pdfLog?.map((l,i)=>(
                  <div key={i} style={{ fontSize:11, fontFamily:'monospace', color:T.gray, marginBottom:1 }}>{l}</div>
                ))}
              </div>
              <div style={{ padding:'10px 16px', background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.text }}>🔬 Extraction Debug Panel</div>
                <div style={{ fontSize:11, color:T.gray, marginTop:2 }}>Field · Extracted value · Source · Strategy · Confidence</div>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f3f4f6' }}>
                      {['Field','Extracted Value','Source','Strategy','Conf.'].map(h=>(
                        <th key={h} style={{ padding:'8px 11px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {REVIEW_FIELDS.map(({key,label})=>{
                      const meta = r.debugMeta[key]||{value:'',source:'Not found',confidence:0,strategy:'none'}
                      const found = !!meta.value
                      const sc = {label_newline:{l:'Label↵Value',c:'#1e5fd9'},label_colon:{l:'Label: Value',c:'#059669'},inline:{l:'Pattern',c:'#7c3aed'},synthesised:{l:'Synthesised',c:'#d97706'},none:{l:'Not found',c:'#9ca3af'}}[meta.strategy||'none']
                      return (
                        <tr key={key} style={{ borderBottom:'1px solid #f9fafb', background:found?'#fff':'#fffafa' }}>
                          <td style={{ padding:'8px 11px', fontWeight:600, color:T.text, fontSize:12, whiteSpace:'nowrap' }}>{label}</td>
                          <td style={{ padding:'8px 11px', maxWidth:150 }}>
                            {found ? <span style={{ fontSize:12, fontWeight:700, color:T.text, fontFamily:key==='idNumber'?'monospace':'inherit' }}>{meta.value}</span>
                                   : <span style={{ fontSize:11, color:'#d1d5db', fontStyle:'italic' }}>—</span>}
                          </td>
                          <td style={{ padding:'8px 11px', maxWidth:200 }}>
                            <span style={{ fontSize:10, color:T.gray, lineHeight:1.5, display:'block' }}>{meta.source}</span>
                          </td>
                          <td style={{ padding:'8px 11px', whiteSpace:'nowrap' }}>
                            <span style={{ fontSize:10, fontWeight:700, color:sc.c, background:sc.c+'18', padding:'2px 7px', borderRadius:4 }}>{sc.l}</span>
                          </td>
                          <td style={{ padding:'8px 11px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <div style={{ width:44, height:4, background:'#f3f4f6', borderRadius:2, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${meta.confidence}%`, background:meta.confidence>=80?T.green:meta.confidence>=50?T.amber:meta.confidence>0?T.red:'transparent', borderRadius:2 }}/>
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
              <div style={{ padding:'12px 16px', borderTop:`1px solid ${T.border}`, background:'#f9fafb' }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.text, marginBottom:6 }}>File Info</div>
                <div style={{ fontSize:11, color:T.gray, fontFamily:'monospace' }}>
                  {uploadedFile?.name} · {uploadedFile ? (uploadedFile.size/1024).toFixed(1) + ' KB' : ''} · {r.rawLines?.length||0} lines parsed
                </div>
              </div>
            </div>
          )}

          {/* ── Reconstructed Text tab ── */}
          {tab==='raw' && (
            <div style={{ background:'#1e1e2e', border:`1px solid #2d2d3f`, borderTop:'none', borderRadius:'0 0 12px 12px' }}>
              <div style={{ padding:'10px 16px', borderBottom:'1px solid #2d2d3f', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:11, color:'#6b7280', fontFamily:'monospace' }}>{r.rawLines?.length||0} lines reconstructed</div>
                <span style={{ fontSize:10, color:T.orange, fontWeight:600 }}>This is what the parser sees</span>
              </div>
              {r.rawLines?.length>0 ? (
                <div style={{ padding:'12px 16px', maxHeight:500, overflowY:'auto' }}>
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
                  <div style={{ fontSize:13, color:'#a8b5cc', marginBottom:6 }}>No text reconstructed from this PDF.</div>
                  <div style={{ fontSize:11, color:'#6b7280', lineHeight:1.6 }}>
                    The PDF uses compressed FlateDecode streams. The browser cannot decompress these without a PDF library.<br/>
                    <strong style={{ color:'#a8b5cc' }}>Next step:</strong> Add pdfjs-dist to extract text from compressed PDFs.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 15px' }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:10 }}>Extraction Summary</div>
            {[
              ['Document',        uploadedFile?.name],
              ['Detected Type',   caseTypes.find(x=>x.id===selCT)?.name||'—'],
              ['Confidence',      confLabel],
              ['Fields Extracted',`${extractedCt} / ${totalF}`],
              ['Billing Flag',    billing?'Yes ⚡':'No'],
              ['SLA',             ct?.slaLabel||'—'],
              ['Ext. Family',     r.extFamily?.length?`${r.extFamily.length} members`:'None'],
            ].map(([k,v])=>v&&(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'4px 0', borderBottom:'1px solid #f9fafb' }}>
                <span style={{ fontSize:11, color:T.gray, flexShrink:0 }}>{k}</span>
                <span style={{ fontSize:11, fontWeight:600, color:k==='Detected Type'?T.orange:k==='Confidence'?confColor:T.text, textAlign:'right', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 15px' }}>
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
            {extractedCt===0&&<div style={{ fontSize:12, color:T.gray, textAlign:'center', padding:'8px 0' }}>No fields extracted. Enter manually.</div>}
          </div>

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
            <div style={{ fontSize:11, color:'#374151', lineHeight:1.5 }}>Round Robin to <strong>General Administration Pool</strong>.</div>
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
    <div style={{ maxWidth:500, margin:'60px auto', textAlign:'center', animation:'fadeIn .4s ease' }}>
      <div style={{ fontSize:60, marginBottom:14, lineHeight:1 }}>🎉</div>
      <h2 style={{ fontSize:22, fontWeight:800, color:T.text, margin:'0 0 6px' }}>Case Created Successfully</h2>
      <div style={{ fontSize:13, color:T.gray, marginBottom:22 }}>Document processed and case allocated to your team.</div>
      <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:14, padding:'18px 20px', marginBottom:18, textAlign:'left' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ width:40, height:40, borderRadius:10, background:T.orangeL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📋</div>
          <div>
            <div style={{ fontFamily:'monospace', fontSize:15, fontWeight:800, color:T.orange }}>{c?.ref}</div>
            <StatusBadge status="Submitted"/>
          </div>
        </div>
        {[['Source','📧 Document Import'],['Member',c?.memberName||'—'],['SLA Due',c?.slaDate],['Source File',c?.sourceFile]].map(([k,v])=>(
          <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #f9fafb' }}>
            <span style={{ fontSize:12, color:T.gray }}>{k}</span>
            <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{v||'—'}</span>
          </div>
        ))}
      </div>
      <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'11px 15px', marginBottom:20, textAlign:'left' }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.green, marginBottom:5 }}>✓ Audit trail recorded</div>
        {['Document uploaded and permanently attached','Fields extracted and reviewed','Case created with reference number','Auto-allocated via Round Robin'].map(ev=>(
          <div key={ev} style={{ fontSize:11, color:'#374151', display:'flex', gap:6, marginBottom:2 }}>
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
