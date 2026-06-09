import { useState, useRef, useCallback } from 'react'
import { T, genRef, calcSlaDate, allocateCase } from '../data.js'
import { Icon, Btn, Field, inputSt, selectSt, StatusBadge, Card, CardHead } from '../ui.jsx'

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL INTAKE ENGINE
// Designed as a reusable service. To support a new email type, add a detection
// rule to CASE_TYPE_SIGNALS and field patterns to FIELD_PATTERNS.
// In future this same engine can be connected to a mailbox polling service or
// REST API without changing any downstream case-creation logic.
// ─────────────────────────────────────────────────────────────────────────────

// ── Case Type Detection Rules ─────────────────────────────────────────────────
// Each rule has a set of signal strings (matched case-insensitively against the
// full email text) and a score weight. Highest total score wins.
const CASE_TYPE_SIGNALS = [
  {
    id: 'ct_new_employee',
    name: 'New Employee',
    signals: [
      { terms: ['new policy activation','new member application','new application','policy activation','enrolment','enroll','new employee','join date','commencement date','new member'], weight: 10 },
      { terms: ['deduction start','effective date','membership commencement'], weight: 6 },
      { terms: ['premium','monthly contribution','deduction amount'], weight: 3 },
    ],
  },
  {
    id: 'ct_amcu_funeral',
    name: 'AMCU Funeral Claim',
    signals: [
      { terms: ['funeral claim','funeral benefit','amcu funeral','claim submitted','death claim','deceased member'], weight: 10 },
      { terms: ['death certificate','burial order','date of death','deceased'], weight: 8 },
    ],
  },
  {
    id: 'ct_extended_funeral',
    name: 'Extended Funeral Claim',
    signals: [
      { terms: ['extended funeral','extended cover','extended benefit claim','family member claim','dependent claim'], weight: 10 },
    ],
  },
  {
    id: 'ct_beneficiary',
    name: 'Beneficiary Nomination Form',
    signals: [
      { terms: ['beneficiary','beneficiary update','nomination','nominee','dependent update','change of beneficiary'], weight: 10 },
    ],
  },
  {
    id: 'ct_benefit_statement',
    name: 'Benefit Statement Request',
    signals: [
      { terms: ['benefit statement','statement request','membership statement','policy statement','certificate of membership'], weight: 10 },
    ],
  },
  {
    id: 'ct_exit_employee',
    name: 'Exit Employee',
    signals: [
      { terms: ['exit','resignation','termination','retrenchment','section 189','end of employment','leaving','separation'], weight: 10 },
      { terms: ['last day','exit date','termination date'], weight: 6 },
    ],
  },
  {
    id: 'ct_billing_query',
    name: 'Payroll/Billing Query',
    signals: [
      { terms: ['billing query','payroll query','billing reconciliation','premium query','billing error','incorrect deduction'], weight: 10 },
    ],
  },
  {
    id: 'ct_funeral_notification',
    name: 'Funeral Notification',
    signals: [
      { terms: ['funeral notification','please note the passing','death notification','inform you of the death'], weight: 10 },
    ],
  },
  {
    id: 'ct_general_query',
    name: 'General Query',
    signals: [
      { terms: ['query','question','request information','please advise','kindly advise','please confirm'], weight: 2 },
    ],
  },
]

// ── Field Extraction Patterns ─────────────────────────────────────────────────
// Each pattern tries multiple regexes in order and returns the first match.
// labelRegex matches "Label: Value" style fields (most common in HTML emails).
const FIELD_PATTERNS = {
  policyRef: {
    label: 'Policy / Reference Number',
    regexes: [
      /policy\s*(?:reference|ref|number|no)[:\s#]+([A-Z0-9\/\-]{4,20})/i,
      /reference\s*(?:number|no|#)?[:\s]+([A-Z0-9\/\-]{4,20})/i,
      /ref[:\s#]+([A-Z0-9\/\-]{4,20})/i,
      /application\s*(?:number|no|#)?[:\s]+([A-Z0-9\/\-]{4,20})/i,
    ],
  },
  firstName: {
    label: 'First Name',
    regexes: [
      /first\s*name[:\s]+([A-Za-z\-']{2,30})/i,
      /given\s*name[:\s]+([A-Za-z\-']{2,30})/i,
      /name[:\s]+([A-Za-z\-']{2,20})\s+[A-Za-z]/i,
    ],
  },
  surname: {
    label: 'Surname',
    regexes: [
      /surname[:\s]+([A-Za-z\-']{2,30})/i,
      /last\s*name[:\s]+([A-Za-z\-']{2,30})/i,
      /family\s*name[:\s]+([A-Za-z\-']{2,30})/i,
    ],
  },
  memberName: {
    label: 'Full Name / Member',
    regexes: [
      /(?:full\s*name|member\s*name|name of member|employee name|applicant)[:\s]+([A-Za-z\s\-']{4,50}?)(?:\n|$|,|\|)/i,
      /member[:\s]+([A-Za-z\s\-']{4,50}?)(?:\n|$|,|\|)/i,
    ],
  },
  idNumber: {
    label: 'ID Number',
    regexes: [
      /(?:id\s*number|id\s*no|identity\s*number|id#)[:\s]+(\d{13})/i,
      /\b(\d{13})\b/,
    ],
  },
  payrollNumber: {
    label: 'Payroll Number',
    regexes: [
      /payroll\s*(?:number|no|#)[:\s]+([A-Z0-9\-]{2,20})/i,
      /employee\s*(?:number|no|#)[:\s]+([A-Z0-9\-]{2,20})/i,
      /staff\s*(?:number|no|#)[:\s]+([A-Z0-9\-]{2,20})/i,
    ],
  },
  employer: {
    label: 'Employer',
    regexes: [
      /employer[:\s]+([A-Za-z0-9\s&\-,'.]{3,60}?)(?:\n|$|,|\|)/i,
      /company[:\s]+([A-Za-z0-9\s&\-,'.]{3,60}?)(?:\n|$|,|\|)/i,
      /organisation[:\s]+([A-Za-z0-9\s&\-,'.]{3,60}?)(?:\n|$|,|\|)/i,
    ],
  },
  consultant: {
    label: 'Consultant',
    regexes: [
      /consultant[:\s]+([A-Za-z\s\-']{4,50}?)(?:\n|$|,|\|)/i,
      /agent[:\s]+([A-Za-z\s\-']{4,50}?)(?:\n|$|,|\|)/i,
      /broker[:\s]+([A-Za-z\s\-']{4,50}?)(?:\n|$|,|\|)/i,
    ],
  },
  product: {
    label: 'Product',
    regexes: [
      /product[:\s]+([A-Za-z0-9\s&\-']{3,60}?)(?:\n|$|,|\|)/i,
      /plan[:\s]+([A-Za-z0-9\s&\-']{3,60}?)(?:\n|$|,|\|)/i,
      /policy\s*type[:\s]+([A-Za-z0-9\s&\-']{3,60}?)(?:\n|$|,|\|)/i,
      /cover(?:\s*type)?[:\s]+([A-Za-z0-9\s&\-']{3,60}?)(?:\n|$|,|\|)/i,
    ],
  },
  membershipType: {
    label: 'Membership Type',
    regexes: [
      /membership\s*(?:type|category|tier)[:\s]+([A-Za-z0-9\s\-]{2,40}?)(?:\n|$|,|\|)/i,
      /category[:\s]+([A-Za-z0-9\s\-]{2,30}?)(?:\n|$|,|\|)/i,
    ],
  },
  premium: {
    label: 'Premium / Monthly Contribution',
    regexes: [
      /premium[:\s]+R?\s*([\d\s,]+\.?\d*)/i,
      /monthly\s*(?:contribution|deduction|premium)[:\s]+R?\s*([\d\s,]+\.?\d*)/i,
      /deduction\s*amount[:\s]+R?\s*([\d\s,]+\.?\d*)/i,
      /amount[:\s]+R?\s*([\d\s,]+\.?\d*)/i,
    ],
  },
  effectiveDate: {
    label: 'Deduction Start / Effective Date',
    regexes: [
      /(?:deduction\s*start|effective\s*date|start\s*date|commencement\s*date)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]+ \d{4}|\d{1,2} [A-Za-z]+ \d{4})/i,
      /from[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    ],
  },
  mobile: {
    label: 'Mobile Number',
    regexes: [
      /(?:mobile|cell|phone|contact\s*number)[:\s]+(\+?[\d\s\-()]{9,15})/i,
      /\b(0[67]\d[\s\-]?\d{3}[\s\-]?\d{4})\b/,
    ],
  },
  emailAddress: {
    label: 'Email Address',
    regexes: [
      /(?:email|e-mail)[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
      /\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/,
    ],
  },
  dateOfBirth: {
    label: 'Date of Birth',
    regexes: [
      /(?:date of birth|dob|birth date)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    ],
  },
  beneficiaryStatus: {
    label: 'Beneficiary Status',
    regexes: [
      /beneficiar(?:y|ies)\s*(?:status|details?|information|nominated)?[:\s]+([A-Za-z\s\-,]{3,80}?)(?:\n|$)/i,
    ],
  },
  actionRequired: {
    label: 'Action Required',
    regexes: [
      /action\s*required[:\s]+([A-Za-z0-9\s\-,.']{3,120}?)(?:\n|$)/i,
      /please\s+([a-z][a-z\s\-,.']{3,80}?)(?:\.|$)/i,
    ],
  },
}

// ── Billing Detection ─────────────────────────────────────────────────────────
const BILLING_SIGNALS = [
  'process.*billing', 'billing system', 'billing required', 'send to billing',
  'update.*billing', 'billing update', 'premium.*change', 'contribution.*change',
  'salary.*change', 'new.*premium', 'adjust.*premium', 'reinstatement',
]

// ─────────────────────────────────────────────────────────────────────────────
// CORE PARSE FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
function parseEmailText(rawText, fileName) {
  const text    = rawText || ''
  const lower   = text.toLowerCase()
  const now     = new Date().toISOString()

  // ── 1. Detect case type ──────────────────────────────────────────────────
  let scores = {}
  for (const ct of CASE_TYPE_SIGNALS) {
    scores[ct.id] = 0
    for (const group of ct.signals) {
      for (const term of group.terms) {
        if (lower.includes(term.toLowerCase())) {
          scores[ct.id] += group.weight
          break
        }
      }
    }
  }
  const sortedTypes = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, s]) => s > 0)
  const detectedCaseTypeId  = sortedTypes[0]?.[0] || 'ct_new_employee'
  const detectionConfidence = sortedTypes[0]?.[1] || 0

  // ── 2. Extract fields ────────────────────────────────────────────────────
  const extracted = {}
  for (const [key, pattern] of Object.entries(FIELD_PATTERNS)) {
    for (const regex of pattern.regexes) {
      const m = text.match(regex)
      if (m && m[1]) {
        extracted[key] = m[1].trim().replace(/\s+/g, ' ')
        break
      }
    }
  }

  // Build memberName from firstName + surname if full name not found
  if (!extracted.memberName && (extracted.firstName || extracted.surname)) {
    extracted.memberName = [extracted.firstName, extracted.surname].filter(Boolean).join(' ')
  }

  // ── 3. Detect subject line ───────────────────────────────────────────────
  const subjectMatch = text.match(/^subject[:\s]+(.+)$/im) || text.match(/^re[:\s]+(.+)$/im)
  const emailSubject = subjectMatch?.[1]?.trim() || fileName?.replace(/\.(eml|msg|pdf)$/i, '') || 'Email Import'

  // ── 4. Billing flag ──────────────────────────────────────────────────────
  const billingRequired = BILLING_SIGNALS.some(sig => new RegExp(sig, 'i').test(lower))

  // ── 5. Extract email sender ──────────────────────────────────────────────
  const fromMatch = text.match(/^from[:\s]+(.+)$/im)
  const emailFrom = fromMatch?.[1]?.trim() || ''

  // ── 6. Detect attachments mentioned in email ─────────────────────────────
  const attachmentKeywords = ['attachment', 'attached', 'please find attached', 'id copy', 'certified copy', 'application form', 'claim form', 'supporting document']
  const hasAttachmentMentions = attachmentKeywords.some(k => lower.includes(k))

  return {
    emailSubject,
    emailFrom,
    detectedCaseTypeId,
    detectionConfidence,
    alternativeTypes: sortedTypes.slice(1, 4).map(([id]) => id),
    billingRequired,
    hasAttachmentMentions,
    extracted: {
      policyRef:        extracted.policyRef        || '',
      memberName:       extracted.memberName        || '',
      firstName:        extracted.firstName         || '',
      surname:          extracted.surname           || '',
      idNumber:         extracted.idNumber          || '',
      payrollNumber:    extracted.payrollNumber     || '',
      employer:         extracted.employer          || '',
      consultant:       extracted.consultant        || '',
      product:          extracted.product           || '',
      membershipType:   extracted.membershipType    || '',
      premium:          extracted.premium           || '',
      effectiveDate:    extracted.effectiveDate     || '',
      mobile:           extracted.mobile            || '',
      emailAddress:     extracted.emailAddress      || '',
      dateOfBirth:      extracted.dateOfBirth       || '',
      beneficiaryStatus:extracted.beneficiaryStatus || '',
      actionRequired:   extracted.actionRequired    || '',
    },
    rawText: text,
    processedAt: now,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function EmailIntake({ caseTypes, categories, employers, users, currentUser, onCaseCreated }) {
  const [phase, setPhase]           = useState('upload')    // upload | processing | review | done
  const [uploadedFile, setUploadedFile] = useState(null)
  const [parseResult, setParseResult]   = useState(null)
  const [dragging, setDragging]         = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [createdCase, setCreatedCase]   = useState(null)
  const fileInputRef = useRef()

  // ── File reading ─────────────────────────────────────────────────────────
  function readFile(file) {
    if (!file) return
    const allowed = ['.eml', '.msg', '.pdf', '.txt']
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!allowed.includes(ext)) {
      alert('Unsupported file type. Please upload an .eml, .msg, .pdf or .txt file.')
      return
    }
    setUploadedFile(file)
    setPhase('processing')

    const reader = new FileReader()
    reader.onload = e => {
      const rawText = e.target.result
      simulateProcessing(rawText, file.name)
    }
    reader.onerror = () => {
      alert('Could not read file. Please try again.')
      setPhase('upload')
    }
    // For binary .msg and .pdf we still get some readable text
    reader.readAsText(file)
  }

  function simulateProcessing(rawText, fileName) {
    let prog = 0
    const steps = [
      { pct: 20, label: 'Reading email content…' },
      { pct: 45, label: 'Extracting member information…' },
      { pct: 65, label: 'Detecting case type…' },
      { pct: 82, label: 'Checking billing requirements…' },
      { pct: 100, label: 'Preparing review screen…' },
    ]
    let i = 0
    const iv = setInterval(() => {
      if (i < steps.length) {
        setProcessingProgress(steps[i].pct)
        i++
      } else {
        clearInterval(iv)
        const result = parseEmailText(rawText, fileName)
        setParseResult(result)
        setPhase('review')
      }
    }, 320)
  }

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) readFile(file)
  }, [])

  if (phase === 'upload')      return <UploadPhase dragging={dragging} setDragging={setDragging} onDrop={onDrop} fileInputRef={fileInputRef} onPickFile={readFile} />
  if (phase === 'processing')  return <ProcessingPhase progress={processingProgress} fileName={uploadedFile?.name} />
  if (phase === 'review')      return (
    <ReviewPhase
      parseResult={parseResult}
      uploadedFile={uploadedFile}
      caseTypes={caseTypes}
      categories={categories}
      employers={employers}
      users={users}
      currentUser={currentUser}
      onBack={() => { setPhase('upload'); setUploadedFile(null); setParseResult(null) }}
      onCreated={c => { setCreatedCase(c); setPhase('done'); onCaseCreated(c) }}
    />
  )
  if (phase === 'done')        return <DonePhase c={createdCase} onNew={() => { setPhase('upload'); setUploadedFile(null); setParseResult(null); setCreatedCase(null) }} />
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: UPLOAD
// ─────────────────────────────────────────────────────────────────────────────
function UploadPhase({ dragging, setDragging, onDrop, fileInputRef, onPickFile }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', animation: 'fadeIn .3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: T.orangeL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={T.orange}><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0, letterSpacing: '-0.4px' }}>Create Case from Email</h1>
            <p style={{ margin: 0, fontSize: 12, color: T.gray }}>Upload a Funeral Portal application email — the system will extract information and create a case automatically.</p>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={e => { e.preventDefault(); setDragging(false) }}
        onClick={() => fileInputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? T.orange : '#d1d5db'}`,
          borderRadius: 14,
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? T.orangeL : '#fafafa',
          transition: 'all .18s',
          marginBottom: 24,
        }}
      >
        <input ref={fileInputRef} type="file" accept=".eml,.msg,.pdf,.txt" onChange={e => { if (e.target.files[0]) onPickFile(e.target.files[0]); e.target.value = '' }} style={{ display: 'none' }} />

        <div style={{ fontSize: 48, marginBottom: 14, lineHeight: 1 }}>{dragging ? '📂' : '📧'}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: dragging ? T.orange : T.text, marginBottom: 6 }}>
          {dragging ? 'Release to process email' : 'Drop your email file here'}
        </div>
        <div style={{ fontSize: 13, color: T.gray, marginBottom: 18 }}>or click to browse</div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { ext: '.EML', desc: 'Email file',      color: '#1e5fd9' },
            { ext: '.MSG', desc: 'Outlook message', color: '#7c3aed' },
            { ext: '.PDF', desc: 'PDF email copy',  color: '#dc2626' },
          ].map(f => (
            <div key={f.ext} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: f.color }}>{f.ext}</span>
              <span style={{ fontSize: 11, color: T.gray }}>{f.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>How it works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          {[
            { n: '1', icon: '📧', title: 'Upload Email', desc: 'Drop the Funeral Portal email file' },
            { n: '2', icon: '🔍', title: 'Auto-Extract', desc: 'System reads member and policy info' },
            { n: '3', icon: '✏️', title: 'Review & Edit', desc: 'Confirm or correct extracted data' },
            { n: '4', icon: '✅', title: 'Case Created', desc: 'Auto-allocated to your team' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 6px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: T.orangeL, border: `2px solid ${T.orange}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: T.gray, lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2: PROCESSING
// ─────────────────────────────────────────────────────────────────────────────
function ProcessingPhase({ progress, fileName }) {
  const steps = [
    { pct: 0,   label: 'Reading email content' },
    { pct: 20,  label: 'Extracting member information' },
    { pct: 45,  label: 'Detecting case type' },
    { pct: 65,  label: 'Checking billing requirements' },
    { pct: 82,  label: 'Preparing review screen' },
    { pct: 100, label: 'Complete' },
  ]
  const currentStep = steps.findLast(s => progress >= s.pct) || steps[0]

  return (
    <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', animation: 'fadeIn .3s ease' }}>
      <div style={{ fontSize: 56, marginBottom: 20, lineHeight: 1 }}>
        <span style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite' }}>⚙️</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>Processing Email</div>
      <div style={{ fontSize: 13, color: T.gray, marginBottom: 6 }}>{fileName}</div>
      <div style={{ fontSize: 13, color: T.orange, fontWeight: 600, marginBottom: 24 }}>{currentStep.label}…</div>

      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, margin: '0 auto', maxWidth: 360, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${T.orange}, #c95500)`, borderRadius: 4, transition: 'width .3s ease' }} />
      </div>
      <div style={{ fontSize: 11, color: T.gray, marginTop: 8 }}>{progress}%</div>

      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.slice(0, -1).map(s => (
          <div key={s.pct} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', background: '#f9fafb', borderRadius: 8, maxWidth: 320, margin: '0 auto', width: '100%' }}>
            <span style={{ fontSize: 14, width: 20 }}>
              {progress > s.pct ? '✅' : progress === s.pct ? '🔄' : '○'}
            </span>
            <span style={{ fontSize: 12, color: progress > s.pct ? T.green : progress === s.pct ? T.orange : T.gray, fontWeight: progress >= s.pct ? 600 : 400 }}>{s.label}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: REVIEW & EDIT
// ─────────────────────────────────────────────────────────────────────────────
function ReviewPhase({ parseResult, uploadedFile, caseTypes, categories, employers, users, currentUser, onBack, onCreated }) {
  const r = parseResult
  const now = new Date().toISOString()
  const today = now.split('T')[0]

  // Editable form state — pre-populated from extraction
  const [fields, setFields] = useState({ ...r.extracted })
  const [selectedCaseTypeId, setSelectedCaseTypeId] = useState(r.detectedCaseTypeId)
  const [selectedEmployerId, setSelectedEmployerId] = useState(
    // Try to match extracted employer name to known employers
    employers.find(e => r.extracted.employer && e.name.toLowerCase().includes((r.extracted.employer||'').toLowerCase().slice(0,6)))?.id || ''
  )
  const [priority, setPriority]             = useState('Medium')
  const [billingRequired, setBillingRequired] = useState(r.billingRequired)
  const [description, setDescription]       = useState(
    [r.emailSubject, r.extracted.actionRequired].filter(Boolean).join('\n\n') ||
    `Imported from email: ${uploadedFile?.name}`
  )
  const [submitting, setSubmitting]         = useState(false)
  const [activeTab, setActiveTab]           = useState('extracted')

  const setF = (k, v) => setFields(f => ({ ...f, [k]: v }))

  const selectedCT = caseTypes.find(ct => ct.id === selectedCaseTypeId)
  const visibleCaseTypes = caseTypes.filter(ct => !ct.isInternal && ct.active)

  const extractedCount = Object.values(r.extracted).filter(v => v && v.trim()).length

  function handleCreate(sendToBilling) {
    if (!selectedCaseTypeId || !selectedEmployerId) {
      alert('Please select a Case Type and Employer before creating the case.'); return
    }
    setSubmitting(true)
    setTimeout(() => {
      const ct       = caseTypes.find(x => x.id === selectedCaseTypeId)
      const assignedTo = allocateCase(ct, users, { general: { members: ['u2','u3','u6'] }, billing: { members: ['u5','u7'] } }, {})
      const assignedUser = users.find(u => u.id === assignedTo)
      const caseRef  = genRef('AEB')
      const slaDate  = ct ? calcSlaDate(ct) : new Date(Date.now() + 5*86400000).toISOString().split('T')[0]

      // Build member name
      const memberName = [fields.firstName, fields.surname].filter(Boolean).join(' ') || fields.memberName || null

      // Email file becomes first document
      const documents = [{
        name:       uploadedFile?.name || 'email_import.eml',
        size:       uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB` : 'Unknown',
        type:       uploadedFile?.type || 'message/rfc822',
        uploadedBy: currentUser.id,
        date:       today,
        source:     'email_import',
      }]

      // Timeline + audit
      const audit = [
        { time: now,                         user: currentUser.id,   action: `Email uploaded: ${uploadedFile?.name}`,              type: 'upload'  },
        { time: r.processedAt,               user: 'system',          action: `Email processed — ${extractedCount} fields extracted`, type: 'process' },
        { time: new Date(Date.now()+100).toISOString(), user: 'system', action: `Case type detected: ${ct?.name} (confidence: ${r.detectionConfidence})`, type: 'process' },
        { time: new Date(Date.now()+200).toISOString(), user: currentUser.id, action: `Case ${caseRef} created from email import`, type: 'create'  },
        ...(assignedTo ? [{ time: new Date(Date.now()+300).toISOString(), user: 'system', action: `Auto-assigned to ${assignedUser?.name || assignedTo} (Round Robin)`, type: 'assign' }] : []),
        ...(billingRequired ? [{ time: new Date(Date.now()+400).toISOString(), user: 'system', action: 'Billing Required flag set automatically', type: 'billing' }] : []),
      ]

      const newCase = {
        id:           'c' + Date.now(),
        ref:          caseRef,
        workspace:    'employer',
        caseTypeId:   selectedCaseTypeId,
        employerId:   selectedEmployerId,
        status:       'Submitted',
        priority,
        assignedTo,
        createdBy:    currentUser.id,
        memberName,
        memberId:     fields.idNumber || null,
        source:       'email_import',
        sourceFile:   uploadedFile?.name,
        currentStage: 0,
        stageHistory: [],
        created:      today,
        slaDate,
        description:  description.trim(),
        billingRequired,
        billingTaskId: null,
        notes: [],
        documents,
        emailData: {
          subject:     r.emailSubject,
          from:        r.emailFrom,
          fileName:    uploadedFile?.name,
          extractedFields: fields,
          processedAt: r.processedAt,
        },
        audit,
        escalated:    false,
        ownerHistory: assignedTo ? [{ user: assignedTo, from: today }] : [],
      }

      onCreated(newCase)
    }, 600)
  }

  // Confidence colour
  const confColor = r.detectionConfidence >= 10 ? T.green : r.detectionConfidence >= 5 ? T.amber : T.gray

  const FIELD_LABELS = FIELD_PATTERNS // reuse labels

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', animation: 'fadeIn .3s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.orange, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'inherit' }}>
              ← Upload different file
            </button>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: '0 0 3px', letterSpacing: '-0.4px' }}>Intake Review</h1>
          <p style={{ margin: 0, fontSize: 12, color: T.gray }}>
            Review extracted information, make any corrections, then create the case.
          </p>
        </div>

        {/* Source file badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fff', border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <span style={{ fontSize: 18 }}>📧</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{uploadedFile?.name}</div>
            <div style={{ fontSize: 10, color: T.gray }}>{r.emailFrom || 'Email import'} · {extractedCount} fields extracted</div>
          </div>
        </div>
      </div>

      {/* Billing alert banner */}
      {billingRequired && (
        <div style={{ background: '#f5f3ff', border: `1px solid #c4b5fd`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>💳</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.purple }}>Billing Required detected</div>
            <div style={{ fontSize: 12, color: '#6d28d9' }}>The email contains billing instructions. You can approve this case and send it to billing in one step below.</div>
          </div>
          <button onClick={() => setBillingRequired(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 11 }}>Dismiss</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, alignItems: 'start' }}>

        {/* ── LEFT: extracted fields + case config ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, background: '#fff', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
            {[['extracted','📋 Extracted Data'],['case_config','⚙️ Case Settings'],['raw_email','📄 Raw Email']].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{ padding: '12px 18px', background: activeTab === id ? '#fff' : '#f9fafb', border: 'none', borderBottom: activeTab === id ? `2px solid ${T.orange}` : '2px solid transparent', color: activeTab === id ? T.orange : T.gray, fontWeight: activeTab === id ? 700 : 400, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Extracted Data tab */}
          {activeTab === 'extracted' && (
            <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: '0 0 12px 12px', padding: '18px 20px' }}>
              <div style={{ fontSize: 12, color: T.gray, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: confColor, display: 'inline-block' }} />
                {extractedCount} of {Object.keys(FIELD_PATTERNS).length} fields extracted from email.
                {extractedCount < 3 && <span style={{ color: T.amber }}> Low extraction — please fill in missing fields manually.</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {Object.entries(FIELD_PATTERNS).map(([key, pat]) => {
                  const val = fields[key] || ''
                  const wasExtracted = !!(parseResult.extracted[key])
                  return (
                    <div key={key}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: T.gray, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {pat.label}
                        {wasExtracted
                          ? <span style={{ fontSize: 9, color: T.green, fontWeight: 700, background: '#f0fdf4', padding: '1px 5px', borderRadius: 3 }}>AUTO</span>
                          : <span style={{ fontSize: 9, color: T.gray, fontWeight: 600, background: '#f3f4f6', padding: '1px 5px', borderRadius: 3 }}>MANUAL</span>
                        }
                      </label>
                      <input
                        value={val}
                        onChange={e => setF(key, e.target.value)}
                        placeholder={`Enter ${pat.label.toLowerCase()}…`}
                        style={{ ...inputSt, fontSize: 13, background: wasExtracted ? '#f0fdf4' : '#fff', borderColor: wasExtracted ? '#bbf7d0' : T.border }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Description */}
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: T.gray, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'block' }}>Case Description *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputSt, resize: 'vertical', fontSize: 13 }} />
              </div>
            </div>
          )}

          {/* Case Settings tab */}
          {activeTab === 'case_config' && (
            <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: '0 0 12px 12px', padding: '18px 20px' }}>

              {/* Case Type */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Case Type
                  <span style={{ fontSize: 10, fontWeight: 700, color: confColor, background: confColor + '18', padding: '2px 8px', borderRadius: 20 }}>
                    {r.detectionConfidence >= 10 ? '✓ High confidence' : r.detectionConfidence >= 5 ? '~ Medium confidence' : '? Low confidence — please verify'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {visibleCaseTypes.filter(ct => {
                    // Show detected + alternatives + all others
                    return ct.id === r.detectedCaseTypeId || r.alternativeTypes.includes(ct.id) || true
                  }).map(ct => {
                    const isDetected  = ct.id === r.detectedCaseTypeId
                    const isAlt       = r.alternativeTypes.includes(ct.id)
                    const isSelected  = ct.id === selectedCaseTypeId
                    return (
                      <button key={ct.id} onClick={() => setSelectedCaseTypeId(ct.id)}
                        style={{ padding: '10px 14px', borderRadius: 9, border: `2px solid ${isSelected ? T.orange : isDetected ? T.green + '60' : T.border}`, background: isSelected ? T.orangeL : isDetected ? '#f0fdf4' : '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: T.text }}>{ct.name}</span>
                          <span style={{ fontSize: 11, color: T.gray, marginLeft: 8 }}>{ct.slaLabel}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {isDetected && <span style={{ fontSize: 9, fontWeight: 700, color: T.green, background: '#f0fdf4', padding: '2px 6px', borderRadius: 3 }}>DETECTED</span>}
                          {!isDetected && isAlt && <span style={{ fontSize: 9, fontWeight: 700, color: T.amber, background: '#fffbeb', padding: '2px 6px', borderRadius: 3 }}>ALT</span>}
                          {isSelected && <span style={{ fontSize: 9, fontWeight: 700, color: T.orange, background: T.orangeL, padding: '2px 6px', borderRadius: 3 }}>SELECTED</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Employer */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: T.gray, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>Employer *</label>
                {r.extracted.employer && (
                  <div style={{ fontSize: 11, color: T.gray, marginBottom: 6 }}>
                    Extracted from email: <strong style={{ color: T.text }}>{r.extracted.employer}</strong>
                    {!selectedEmployerId && <span style={{ color: T.amber, marginLeft: 6 }}>— please select below</span>}
                  </div>
                )}
                <select value={selectedEmployerId} onChange={e => setSelectedEmployerId(e.target.value)} style={selectSt}>
                  <option value="">Select employer…</option>
                  {employers.map(e => <option key={e.id} value={e.id}>{e.name} ({e.number})</option>)}
                </select>
              </div>

              {/* Priority */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: T.gray, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>Priority</label>
                <div style={{ display: 'flex', gap: 7 }}>
                  {['Low','Medium','High','Critical'].map(p => (
                    <button key={p} onClick={() => setPriority(p)} style={{ flex: 1, padding: '8px 4px', borderRadius: 7, border: `1.5px solid ${priority === p ? T.orange : T.border}`, background: priority === p ? T.orange : '#fff', color: priority === p ? '#fff' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{p}</button>
                  ))}
                </div>
              </div>

              {/* Billing toggle */}
              <div style={{ padding: '12px 14px', background: billingRequired ? '#f5f3ff' : '#f9fafb', border: `1px solid ${billingRequired ? '#c4b5fd' : T.border}`, borderRadius: 9 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div onClick={() => setBillingRequired(b => !b)} style={{ width: 38, height: 22, borderRadius: 11, background: billingRequired ? T.purple : '#d1d5db', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: billingRequired ? 18 : 2, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: billingRequired ? T.purple : T.text }}>Billing Required</div>
                    <div style={{ fontSize: 11, color: T.gray }}>Creates a Billing Task and assigns to billing queue after case creation</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Raw email tab */}
          {activeTab === 'raw_email' && (
            <div style={{ background: '#1e1e2e', border: `1px solid #2d2d3f`, borderRadius: '0 0 12px 12px', padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, fontFamily: 'monospace' }}>
                {uploadedFile?.name} · {uploadedFile ? (uploadedFile.size / 1024).toFixed(1) + ' KB' : ''}
              </div>
              <pre style={{ fontSize: 11, color: '#a8b5cc', fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, overflowY: 'auto', margin: 0 }}>
                {r.rawText?.slice(0, 4000) || 'No readable text extracted from file.'}
                {r.rawText?.length > 4000 && '\n\n[... truncated ...]'}
              </pre>
            </div>
          )}
        </div>

        {/* ── RIGHT: summary + actions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Detection summary */}
          <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 12 }}>Detection Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SummaryRow label="Email Subject" value={r.emailSubject} mono={false} />
              <SummaryRow label="Detected Type" value={caseTypes.find(ct => ct.id === selectedCaseTypeId)?.name || '—'} highlight />
              <SummaryRow label="Confidence" value={r.detectionConfidence >= 10 ? 'High' : r.detectionConfidence >= 5 ? 'Medium' : 'Low'} color={confColor} />
              <SummaryRow label="Fields Found" value={`${extractedCount} / ${Object.keys(FIELD_PATTERNS).length}`} />
              <SummaryRow label="Billing Flag" value={billingRequired ? 'Yes ⚡' : 'No'} color={billingRequired ? T.purple : T.gray} />
              {selectedCT && <SummaryRow label="SLA" value={selectedCT.slaLabel} />}
            </div>
          </div>

          {/* Extracted key fields preview */}
          <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 12 }}>Key Fields</div>
            {[
              ['Member', fields.memberName || [fields.firstName, fields.surname].filter(Boolean).join(' ')],
              ['ID Number', fields.idNumber],
              ['Employer', fields.employer],
              ['Product', fields.product],
              ['Premium', fields.premium ? `R ${fields.premium}` : ''],
              ['Effective Date', fields.effectiveDate],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '5px 0', borderBottom: `1px solid #f3f4f6` }}>
                <span style={{ fontSize: 11, color: T.gray }}>{k}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.text, textAlign: 'right', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
              </div>
            ))}
            {extractedCount === 0 && <div style={{ fontSize: 12, color: T.gray, textAlign: 'center', padding: 8 }}>No fields extracted. Enter details manually.</div>}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {billingRequired ? (
              <>
                <button
                  onClick={() => handleCreate(true)}
                  disabled={submitting}
                  style={{ padding: '12px 16px', background: T.purple, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {submitting ? '⏳ Creating…' : '✅ Approve & Send to Billing'}
                </button>
                <button
                  onClick={() => handleCreate(false)}
                  disabled={submitting}
                  style={{ padding: '12px 16px', background: T.navy, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'inherit' }}>
                  Approve Only
                </button>
              </>
            ) : (
              <button
                onClick={() => handleCreate(false)}
                disabled={submitting}
                style={{ padding: '13px 16px', background: T.navy, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting ? '⏳ Creating case…' : '✅ Create Case'}
              </button>
            )}
            <button onClick={onBack} disabled={submitting} style={{ padding: '9px', background: 'none', border: `1px solid ${T.border}`, borderRadius: 9, fontSize: 12, color: T.gray, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Upload Different File
            </button>
          </div>

          {/* Allocation preview */}
          <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, marginBottom: 5 }}>Auto-Allocation</div>
            <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>
              Will be assigned via Round Robin to the <strong>General Administration Pool</strong>: Nokulunga, Tevin or Mahlatse.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, mono, highlight, color }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ fontSize: 11, color: T.gray, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: highlight ? 700 : 600, color: color || (highlight ? T.orange : T.text), textAlign: 'right', wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4: DONE
// ─────────────────────────────────────────────────────────────────────────────
function DonePhase({ c, onNew }) {
  return (
    <div style={{ maxWidth: 540, margin: '60px auto', textAlign: 'center', animation: 'fadeIn .4s ease' }}>
      <div style={{ fontSize: 64, marginBottom: 16, lineHeight: 1 }}>🎉</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 6, letterSpacing: '-0.5px' }}>Case Created Successfully</h2>
      <div style={{ fontSize: 14, color: T.gray, marginBottom: 24 }}>The email has been processed and a case has been created and allocated.</div>

      <div style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 14, padding: '22px 24px', marginBottom: 24, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: T.orangeL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📋</div>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: T.orange }}>{c?.ref}</div>
            <StatusBadge status="Submitted" />
          </div>
        </div>
        {[
          ['Source', '📧 Email Import'],
          ['Member', c?.memberName || '—'],
          ['Case Type', '—'],
          ['Assigned To', '—'],
          ['SLA Due', c?.slaDate],
          ['Source File', c?.sourceFile],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f9fafb' }}>
            <span style={{ fontSize: 12, color: T.gray }}>{k}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{v || '—'}</span>
          </div>
        ))}
      </div>

      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 22, textAlign: 'left' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.green, marginBottom: 6 }}>✓ Timeline events recorded</div>
        {['Email uploaded','Email processed','Case created','Auto-allocated to administrator'].map(ev => (
          <div key={ev} style={{ fontSize: 11, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ color: T.green }}>✓</span> {ev}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={onNew} style={{ padding: '10px 20px', background: T.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          📧 Process Another Email
        </button>
      </div>
    </div>
  )
}
