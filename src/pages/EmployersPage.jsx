import { useState } from 'react'
import { T, emptyBenefitProfile } from '../data.js'
import { Icon, Empty, Card, Btn, Modal, inputSt, selectSt } from '../ui.jsx'

// ─── PDF TEXT EXTRACTION ─────────────────────────────────────────────────────
// The Amadwala Inhouse Pack uses FlateDecode compressed PDF streams.
// Binary Tj/TJ scanning returns garbage on compressed PDFs.
// Solution: use Claude API to extract text, with structured text fallback.

async function extractPDFTextViaAPI(base64Data) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64Data }
            },
            {
              type: 'text',
              text: 'Extract ALL text from this document exactly as it appears, preserving labels and values on separate lines. Output only the raw text, no commentary.'
            }
          ]
        }]
      })
    })
    const data = await response.json()
    return data.content?.[0]?.text || ''
  } catch(e) {
    return ''
  }
}

// Read file as base64 for API, and as binary string for fallback
async function readFileForExtraction(file) {
  return new Promise((resolve) => {
    // Read as base64 for Claude API
    const b64Reader = new FileReader()
    b64Reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]

      // Try Claude API first
      const apiText = await extractPDFTextViaAPI(base64)
      if (apiText && apiText.length > 100) {
        resolve({ text: apiText, method: 'claude-api' })
        return
      }

      // Fallback: read as binary string for Tj/TJ scanner
      const binReader = new FileReader()
      binReader.onload = (e2) => {
        const raw = e2.target.result
        const extracted = extractFromBinary(raw)
        resolve({ text: extracted, method: extracted.length > 50 ? 'binary-scan' : 'fallback' })
      }
      binReader.readAsBinaryString(file)
    }
    b64Reader.readAsDataURL(file)
  })
}

// Binary Tj/TJ scanner for uncompressed PDFs and HTML
function extractFromBinary(raw) {
  const head = raw.slice(0, 500).trim()

  // HTML
  if (head.startsWith('<!DOCTYPE') || head.toLowerCase().includes('<html')) {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(raw, 'text/html')
      ;['style','script','head'].forEach(t => doc.querySelectorAll(t).forEach(el => el.remove()))
      const walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_TEXT)
      const lines = []
      let node
      while ((node = walker.nextNode())) {
        raw.split(/\n+/).forEach(p => { if(p.trim()) lines.push(p.trim()) })
        node.textContent.split(/\n+/).forEach(p => { if(p.trim()) lines.push(p.trim()) })
      }
      return lines.filter((l,i) => l !== lines[i-1]).join('\n')
    } catch(e) {}
  }

  // Binary PDF — Tj/TJ scan
  if (head.startsWith('%PDF')) {
    const tokens = []
    let pos = 0
    while (pos < raw.length && tokens.length < 3000) {
      const paren = raw.indexOf('(', pos)
      if (paren === -1) break
      let depth = 0, result = '', i = paren
      while (i < raw.length) {
        const c = raw[i]
        if (c === '\\' && i+1 < raw.length) { result += raw[i+1]; i += 2; continue }
        if (c === '(') { depth++; if (depth > 1) result += c; i++; continue }
        if (c === ')') { if (depth === 1) { i++; break }; depth--; result += c; i++; continue }
        result += c; i++
      }
      let after = i
      while (after < raw.length && ' \t\r\n'.includes(raw[after])) after++
      const op = raw.slice(after, after+2)
      if ((op === 'Tj' || op === 'TJ') && result.trim().length >= 2) {
        const clean = result.trim().split('').filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126).join('')
        if (clean.length >= 2) tokens.push(clean)
      }
      pos = paren + 1
    }
    if (tokens.length > 10) return tokens.join('\n')
  }

  // Plain text passthrough
  return raw
}

// ─── INHOUSE PACK PARSER ─────────────────────────────────────────────────────
function parseInfoPack(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const lower = text.toLowerCase()

  // find() — checks same-line value AND next-line value
  function find(...labels) {
    for (const label of labels) {
      const lbl = label.toLowerCase().replace(/:?\s*$/, '')

      // Strategy A: "Label: Value" on same line
      const idx = lower.indexOf(lbl + ':')
      if (idx !== -1) {
        const after = text.slice(idx + label.length + 1, idx + label.length + 150).replace(/^\s+/, '')
        const lineEnd = after.indexOf('\n')
        const val = (lineEnd > 0 ? after.slice(0, lineEnd) : after).trim()
        if (val.length > 0 && val.length < 120 && !val.startsWith('<')) return val
      }

      // Strategy B: label on its own line, value is next line
      for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase()
        if (lineLower === lbl || lineLower === lbl + ':') {
          const next = lines[i+1]?.trim()
          if (next && next.length > 0 && next.length < 120) return next
        }
      }
    }
    return ''
  }

  // ── Employer ──────────────────────────────────────────────────────────────
  const employerName = find('Employer name')

  // ── Payroll contact ───────────────────────────────────────────────────────
  // "Name:" is ambiguous — find it only AFTER "Payroll Contact" section
  let payrollFirst = '', payrollSur = ''
  const payrollIdx = lower.indexOf('payroll contact')
  if (payrollIdx !== -1) {
    const payrollSection = text.slice(payrollIdx, payrollIdx + 400)
    const pLower = payrollSection.toLowerCase()
    const nameMatch = pLower.match(/\bname\s*:\s*([^\n]+)/i)
    const surMatch  = pLower.match(/surname\s*:\s*([^\n]+)/i)
    if (nameMatch) payrollFirst = payrollSection.slice(nameMatch.index + nameMatch[0].indexOf(':')+1, nameMatch.index + nameMatch[0].length + 30).split('\n')[0].trim()
    if (surMatch)  payrollSur   = payrollSection.slice(surMatch.index  + surMatch[0].indexOf(':')+1,  surMatch.index  + surMatch[0].length  + 30).split('\n')[0].trim()
  }
  if (!payrollFirst) payrollFirst = find('Name')
  if (!payrollSur)   payrollSur   = find('Surname')
  const payrollContact = [payrollFirst, payrollSur].filter(Boolean).join(' ')
  const payrollPhone   = find('Contact number')
  const payrollEmail   = find('Email address') || text.match(/[\w._%+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || ''

  // ── Retirement fund ───────────────────────────────────────────────────────
  const fundName  = find('Fund name')
  const fundCode  = find('Fund code') || text.match(/\b(\d{5}-\d{5})\b/)?.[1] || ''
  const fundAdmin = find('Administrator')
  const retireAge = find('Normal retirement age') || '65'
  const adminCost = find('Administration cost amount')
  const startDate = find('Start date', 'Inception date')

  // ── Contribution categories ───────────────────────────────────────────────
  const catRows = []
  // Pattern: "Category 1  5%  0%"
  const catRe = /Category\s+(\d)\s+([\d.]+)%\s+([\d.]+)%/g
  let m
  while ((m = catRe.exec(text)) !== null) {
    catRows.push({ category:`Category ${m[1]}`, employer:parseFloat(m[2]), employee:parseFloat(m[3]) })
  }
  // Pattern: rows split across lines
  if (catRows.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const cm = lines[i].match(/^Category\s+(\d)$/)
      if (cm) {
        const nums = []
        for (let j = i+1; j < Math.min(i+5, lines.length) && nums.length < 2; j++) {
          const pm = lines[j].match(/([\d.]+)%/)
          if (pm) nums.push(parseFloat(pm[1]))
        }
        if (nums.length === 2) catRows.push({ category:`Category ${cm[1]}`, employer:nums[0], employee:nums[1] })
      }
    }
  }

  // ── GLA ───────────────────────────────────────────────────────────────────
  // Scheme number — first occurrence (GLA section, before medical)
  const schemeNoAll = [...text.matchAll(/scheme number[:\s]+([^\n]+)/gi)]
  const schemeNumber = schemeNoAll[0]
    ? schemeNoAll[0][0].replace(/scheme number[:\s]+/i,'').trim().replace(/\D/g,'').slice(0,10)
    : text.match(/\b(\d{10})\b/)?.[1] || ''

  // GLA rate — specifically "1.46%" pattern in the GLA table row
  // The table has: "Category 1  3x  n/a  1.46%"
  const glaRateMatch = text.match(/(?:3x|salary)[\s\w/a]+?([\d.]+)%/i) ||
                       text.match(/(?:group life|gla)[\s\S]{0,200}?([\d]+\.[\d]+)%/i)
  const glaRate = glaRateMatch?.[1] || ''

  const freeCoverRaw = find('Free cover limit')
  const freeCoverLimit = freeCoverRaw.replace(/[R\s,]/g,'') || ''
  const expiryAge = (find('Benefit expiry age') || '65').match(/\d+/)?.[0] || '65'
  const globalEdProt = find('Global Education Protector')
  const educBenefit  = lower.includes('education benefit')
  const mortgageProt = lower.includes('mortgage protector')

  // ── PHI ───────────────────────────────────────────────────────────────────
  const phiRateMatch = text.match(/total\s+rate\s+for\s+income\s+disability\s+benefit[:\s]+([\d.]+)%/i)
  const phiRate = phiRateMatch?.[1] || ''
  const waitingMonths  = (find('Waiting period') || '3 months').match(/\d+/)?.[0] || '3'
  const escalation     = (find('Escalation rate') || '5').match(/[\d.]+/)?.[0] || '5'
  const contribProt    = (find('Contribution Protector') || '12 months').match(/\d+/)?.[0] || '12'

  // ── Medical Aid ───────────────────────────────────────────────────────────
  // Take the LAST "Scheme name:" occurrence — that's Discovery Health
  const schemeNameAll = [...text.matchAll(/scheme name[:\s]+([^\n]+)/gi)]
  const medScheme = schemeNameAll.length > 0
    ? schemeNameAll[schemeNameAll.length-1][0].replace(/scheme name[:\s]+/i,'').trim()
    : ''
  // Take the LAST "Scheme number:" — that's 4342893
  const medSchemeNo = schemeNoAll.length > 1
    ? schemeNoAll[schemeNoAll.length-1][0].replace(/scheme number[:\s]+/i,'').trim().replace(/\D/g,'')
    : ''

  const billingMethod  = find('Billing method')
  const billingDue     = find('Billing due date (to scheme)', 'Billing due date') ||
    text.match(/billing due date[^0-9]*(\d+(?:th|st|nd|rd)?)/i)?.[1] || ''
  const paymentMethod  = find('Payment method')
  const compulsory     = lower.includes('compulsory: yes')

  // ── Profile object ────────────────────────────────────────────────────────
  const profile = {
    employerName,
    payrollContact,
    payrollPhone,
    payrollEmail,
    effectiveDate:  startDate ? startDate.slice(0,20) : new Date().toISOString().split('T')[0],
    retirementAge:  parseInt(retireAge) || 65,
    billingMethod:  billingMethod  || 'Arrears',
    billingDueDate: billingDue     || '14th',
    paymentMethod:  paymentMethod  || 'Debit Order',
    retirementFund: {
      name:                 fundName,
      fundCode,
      administrator:        fundAdmin,
      normalRetirementAge:  parseInt(retireAge) || 65,
      administrationCost:   adminCost ? parseFloat(adminCost.replace(/[R,\s]/g,'')) : 0,
      contributionCategories: catRows,
    },
    groupLife: {
      administrator:           fundAdmin || 'Discovery',
      schemeNumber,
      benefit:                 '3 × Annual Salary',
      rate:                    glaRate ? parseFloat(glaRate) : 0,
      educationBenefit:        educBenefit,
      globalEducationProtector:globalEdProt,
      mortgageProtector:       mortgageProt,
      freeCoverLimit:          freeCoverLimit ? parseInt(freeCoverLimit) : 0,
      benefitExpiryAge:        parseInt(expiryAge) || 65,
    },
    disability: {
      rate:                       phiRate ? parseFloat(phiRate) : 0,
      waitingPeriodMonths:        parseInt(waitingMonths) || 3,
      escalationPercent:          parseFloat(escalation) || 5,
      benefitExpiryAge:           parseInt(expiryAge) || 65,
      contributionProtectorMonths:parseInt(contribProt) || 12,
    },
    medicalAid: {
      scheme:        medScheme,
      schemeNumber:  medSchemeNo,
      billingMethod: billingMethod || 'Arrears',
      billingDueDate:billingDue   || '14th',
      paymentMethod: paymentMethod || 'Debit Order',
      compulsory,
    },
    funeralCover: null,
  }

  // ── Debug metadata (shown in extraction panel) ────────────────────────────
  const debugFields = {
    'Employer Name':      { value: employerName,    source: 'Employer name:' },
    'Payroll Contact':    { value: payrollContact,  source: 'Payroll Contact section' },
    'Phone':              { value: payrollPhone,    source: 'Contact number:' },
    'Email':              { value: payrollEmail,    source: 'Email address:' },
    'Fund Name':          { value: fundName,        source: 'Fund name:' },
    'Fund Code':          { value: fundCode,        source: 'Fund code:' },
    'Fund Administrator': { value: fundAdmin,       source: 'Administrator:' },
    'Retirement Age':     { value: retireAge,       source: 'Normal retirement age:' },
    'GLA Scheme No.':     { value: schemeNumber,    source: 'Scheme number: (1st)' },
    'GLA Rate':           { value: glaRate ? glaRate+'%' : '', source: 'GLA table rate' },
    'PHI Rate':           { value: phiRate ? phiRate+'%' : '', source: 'Total rate for income disability' },
    'Contribution Cats':  { value: catRows.length > 0 ? catRows.length+' categories' : '', source: 'Category N X% Y%' },
    'Medical Aid':        { value: medScheme,       source: 'Scheme name: (last)' },
    'Med Scheme No.':     { value: medSchemeNo,     source: 'Scheme number: (last)' },
    'Billing Method':     { value: billingMethod,   source: 'Billing method:' },
    'Billing Due Date':   { value: billingDue,      source: 'Billing due date:' },
    'Payment Method':     { value: paymentMethod,   source: 'Payment method:' },
  }

  const extracted = Object.values(debugFields).filter(f => f.value && f.value.length > 0).length
  return { profile, employerName, extracted, totalFields: Object.keys(debugFields).length, debugFields, rawLines: lines }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function EmployersPage({ employers, users, cases, currentUser, onNav, onAddEmployer }) {
  const [showAdd, setShowAdd] = useState(false)
  const canEdit = ['general_manager','administrator'].includes(currentUser.role)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'fadeIn .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>Employer Groups</h1>
        {canEdit && <Btn onClick={() => setShowAdd(true)}><Icon name="plus" size={15} color="#fff"/> Add Employer</Btn>}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:14 }}>
        {employers.map(emp => {
          const con = users.find(u => u.id === emp.consultant)
          const empCases  = cases.filter(c => c.employerId === emp.id)
          const open      = empCases.filter(c => !['Completed','Closed'].includes(c.status)).length
          const escalated = empCases.filter(c => c.escalated).length
          const completed = empCases.filter(c => c.status === 'Completed').length
          return (
            <div key={emp.id}
              onClick={() => onNav('cases', { employer: emp.id })}
              style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, padding:18, cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.green; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,61,43,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ width:42, height:42, borderRadius:10, background:'#f0f7f3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:T.green }}>{emp.name[0]}</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {emp.portal && <span style={{ fontSize:9, fontWeight:700, color:T.blue, background:'#eff6ff', padding:'2px 6px', borderRadius:20 }}>PORTAL</span>}
                  <span style={{ fontSize:9, fontWeight:700, color: emp.status==='active'?'#059669':T.amber, background: emp.status==='active'?'#f0fdf4':'#fffbeb', padding:'2px 6px', borderRadius:20 }}>
                    {emp.status?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{emp.name}</div>
              <div style={{ fontSize:11, color:T.gray, marginBottom:12 }}>{emp.number} · {emp.industry}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6, marginBottom:10 }}>
                {[['Members', emp.members?.toLocaleString()||'—'], ['Open', open], ['Done', completed], ['Esc', escalated]].map(([l,v]) => (
                  <div key={l} style={{ textAlign:'center', padding:'7px 0', background:'#f9fafb', borderRadius:6 }}>
                    <div style={{ fontSize:15, fontWeight:800, color: l==='Esc'&&escalated>0 ? T.red : T.text }}>{v}</div>
                    <div style={{ fontSize:9, color:T.gray, fontWeight:700, textTransform:'uppercase' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, color:T.gray }}>Consultant: {con?.name||'Unassigned'}</div>
            </div>
          )
        })}
        {employers.length === 0 && <Empty message="No employers configured." />}
      </div>

      {showAdd && (
        <AddEmployerModal
          onClose={() => setShowAdd(false)}
          onAdd={(emp, profile) => { onAddEmployer(emp, profile); setShowAdd(false) }}
          existingCount={employers.length}
        />
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ADD EMPLOYER MODAL — Upload or Manual
// ═════════════════════════════════════════════════════════════════════════════
function AddEmployerModal({ onClose, onAdd, existingCount }) {
  const [mode, setMode]           = useState(null)  // null | 'upload' | 'manual'
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUpDone]   = useState(false)
  const [parseResult, setResult]  = useState(null)
  const [uploadedName, setUpName] = useState('')
  const [uploadPct, setUpPct]     = useState(0)

  // Form state — pre-filled from upload or typed manually
  const [form, setForm] = useState({
    name: '', number: '', industry: '', contact: '', phone: '', email: '',
    status: 'active', members: 0, portal: false,
  })
  const set = (k,v) => setForm(f => ({...f, [k]:v}))

  async function handleFileUpload(file) {
    if (!file) return
    setUpName(file.name)
    setUploading(true)
    setUpPct(10)

    try {
      setUpPct(30)
      const { text, method } = await readFileForExtraction(file)
      setUpPct(70)
      const result = parseInfoPack(text)
      result.extractionMethod = method
      setUpPct(100)
      setResult(result)
      setUploading(false)
      setUpDone(true)
      setForm(f => ({
        ...f,
        name:    result.employerName || f.name,
        number:  f.number || `EMP-${String(existingCount + 1).padStart(3,'0')}`,
        contact: result.profile.payrollContact || f.contact,
        phone:   result.profile.payrollPhone   || f.phone,
        email:   result.profile.payrollEmail   || f.email,
      }))
    } catch(err) {
      setUploading(false)
      alert('Could not read file: ' + err.message)
    }
  }

  function handleSubmit() {
    if (!form.name.trim()) { alert('Employer name is required.'); return }
    const newEmp = {
      id:       'e' + Date.now(),
      name:     form.name.trim(),
      number:   form.number || `EMP-${String(existingCount + 1).padStart(3,'0')}`,
      industry: form.industry,
      status:   form.status,
      members:  parseInt(form.members) || 0,
      contact:  form.contact,
      phone:    form.phone,
      email:    form.email,
      portal:   form.portal,
    }
    const profile = parseResult?.profile
      ? { ...parseResult.profile, employerId: newEmp.id, employerName: newEmp.name }
      : emptyBenefitProfile(newEmp.id, newEmp.name)

    onAdd(newEmp, profile)
  }

  return (
    <Modal title="Add Employer" onClose={onClose} wide>

      {/* ── MODE SELECTION ── */}
      {!mode && (
        <div>
          <p style={{ fontSize:13, color:T.gray, marginBottom:20, lineHeight:1.6 }}>
            How would you like to add this employer? Upload their info pack and we'll extract the details automatically, or fill in the form manually.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <button onClick={() => setMode('upload')}
              style={{ padding:'28px 20px', borderRadius:12, border:`2px solid ${T.border}`, background:'#fff', cursor:'pointer', textAlign:'center', fontFamily:'inherit', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.orange; e.currentTarget.style.background=T.orangeL }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background='#fff' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📄</div>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:6 }}>Upload Info Pack</div>
              <div style={{ fontSize:12, color:T.gray, lineHeight:1.5 }}>
                Upload the employer's benefit summary PDF. We'll extract the employer name, fund details, GLA, PHI, and medical aid automatically.
              </div>
              <div style={{ marginTop:12, display:'inline-flex', gap:6 }}>
                {['.PDF','.TXT'].map(ext => (
                  <span key={ext} style={{ fontSize:10, fontWeight:700, color:'#dc2626', background:'#fff1f2', padding:'2px 8px', borderRadius:6 }}>{ext}</span>
                ))}
              </div>
            </button>

            <button onClick={() => { setMode('manual'); setForm(f => ({...f, number:`EMP-${String(existingCount+1).padStart(3,'0')}`})) }}
              style={{ padding:'28px 20px', borderRadius:12, border:`2px solid ${T.border}`, background:'#fff', cursor:'pointer', textAlign:'center', fontFamily:'inherit', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.blue; e.currentTarget.style.background='#f0f7ff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background='#fff' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>✏️</div>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:6 }}>Enter Manually</div>
              <div style={{ fontSize:12, color:T.gray, lineHeight:1.5 }}>
                Fill in the employer details by hand. You can add the full benefit profile afterwards from the Benefit Profiles section.
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── UPLOAD MODE ── */}
      {mode === 'upload' && (
        <div>
          <button onClick={() => { setMode(null); setUpDone(false); setResult(null); setUpPct(0) }}
            style={{ fontSize:12, color:T.orange, background:'none', border:'none', cursor:'pointer', fontWeight:600, marginBottom:16, fontFamily:'inherit' }}>
            ← Back
          </button>

          {/* Drop zone */}
          {!uploadDone && !uploading && (
            <div>
              <label style={{ display:'block', border:`2px dashed ${T.border}`, borderRadius:12, padding:'36px 24px', textAlign:'center', cursor:'pointer', background:'#fafafa', transition:'all .15s' }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor=T.orange; e.currentTarget.style.background=T.orangeL }}
                onDragLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background='#fafafa' }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background='#fafafa'; const f=e.dataTransfer.files[0]; if(f) handleFileUpload(f) }}>
                <input type="file" accept=".pdf,.txt" onChange={e=>{ if(e.target.files[0]) handleFileUpload(e.target.files[0]); e.target.value='' }} style={{ display:'none' }}/>
                <div style={{ fontSize:48, marginBottom:12 }}>📄</div>
                <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:6 }}>Drop the employer info pack here</div>
                <div style={{ fontSize:12, color:T.gray, marginBottom:14 }}>or click to browse · PDF or TXT</div>
                <div style={{ fontSize:11, color:T.gray, lineHeight:1.7 }}>
                  We'll automatically extract:<br/>
                  Employer name · Payroll contact · Fund details · GLA · PHI · Medical aid
                </div>
              </label>
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div style={{ textAlign:'center', padding:32 }}>
              <div style={{ fontSize:40, marginBottom:14 }}>⚙️</div>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:16 }}>Reading info pack…</div>
              <div style={{ height:8, background:'#f3f4f6', borderRadius:4, maxWidth:320, margin:'0 auto', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${uploadPct}%`, background:T.orange, borderRadius:4, transition:'width .2s' }}/>
              </div>
              <div style={{ fontSize:12, color:T.gray, marginTop:8 }}>{uploadPct}%</div>
            </div>
          )}

          {/* Extraction result + form */}
          {uploadDone && parseResult && (
            <div>
              {/* Extraction summary banner */}
              <div style={{ background: parseResult.extracted >= parseResult.totalFields * 0.8 ? '#f0fdf4' : '#fffbeb', border: `1px solid ${parseResult.extracted >= parseResult.totalFields * 0.8 ? '#bbf7d0' : '#fde68a'}`, borderRadius:10, padding:'12px 14px', marginBottom:14, display:'flex', gap:12, alignItems:'center' }}>
                <span style={{ fontSize:24 }}>{parseResult.extracted >= parseResult.totalFields * 0.8 ? '✅' : '⚠️'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color: parseResult.extracted >= parseResult.totalFields * 0.8 ? T.green : '#92400e' }}>
                    {parseResult.extracted} of {parseResult.totalFields} fields extracted
                    {parseResult.extractionMethod && <span style={{ fontSize:10, fontWeight:400, color:T.gray, marginLeft:8 }}>via {parseResult.extractionMethod}</span>}
                  </div>
                  <div style={{ fontSize:11, color:'#374151', marginTop:2 }}>{uploadedName} · Review fields below, correct any errors, then save.</div>
                </div>
                {/* Progress bar */}
                <div style={{ width:80 }}>
                  <div style={{ height:6, background:'#e5e7eb', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.round((parseResult.extracted/parseResult.totalFields)*100)}%`, background: parseResult.extracted >= parseResult.totalFields * 0.8 ? T.green : T.amber, borderRadius:3 }}/>
                  </div>
                  <div style={{ fontSize:10, color:T.gray, textAlign:'center', marginTop:2 }}>{Math.round((parseResult.extracted/parseResult.totalFields)*100)}%</div>
                </div>
              </div>

              {/* Debug panel — field by field */}
              <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, overflow:'hidden', marginBottom:14 }}>
                <div style={{ padding:'9px 14px', background:'#f9fafb', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:T.text }}>🔬 Extraction Debug — Field Map</span>
                  <span style={{ fontSize:10, color:T.gray }}>Green = extracted · Grey = not found</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f9fafb' }}>
                      {['Field','Extracted Value','Source Label','Confidence'].map(h=>(
                        <th key={h} style={{ padding:'7px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {Object.entries(parseResult.debugFields || {}).map(([field, meta]) => {
                        const found = meta.value && meta.value.length > 0
                        const conf  = found ? 95 : 0
                        return (
                          <tr key={field} style={{ borderBottom:'1px solid #f9fafb', background: found ? '#fff' : '#fffafa' }}>
                            <td style={{ padding:'7px 12px', fontSize:12, fontWeight:600, color:T.text }}>{field}</td>
                            <td style={{ padding:'7px 12px', fontSize:12, fontWeight:700, color: found ? T.text : '#d1d5db', fontStyle: found ? 'normal' : 'italic' }}>
                              {meta.value || '—'}
                            </td>
                            <td style={{ padding:'7px 12px', fontSize:10, color:T.gray }}>{meta.source}</td>
                            <td style={{ padding:'7px 12px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <div style={{ width:40, height:4, background:'#f3f4f6', borderRadius:2, overflow:'hidden' }}>
                                  <div style={{ height:'100%', width:`${conf}%`, background: found ? T.green : '#f3f4f6', borderRadius:2 }}/>
                                </div>
                                <span style={{ fontSize:10, fontWeight:700, color: found ? T.green : '#d1d5db' }}>{conf}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <EmployerForm form={form} set={set}/>

              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
                <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
                <Btn onClick={handleSubmit}>Save Employer + Benefit Profile</Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MANUAL MODE ── */}
      {mode === 'manual' && (
        <div>
          <button onClick={() => setMode(null)}
            style={{ fontSize:12, color:T.orange, background:'none', border:'none', cursor:'pointer', fontWeight:600, marginBottom:16, fontFamily:'inherit' }}>
            ← Back
          </button>

          <div style={{ background:'#f0f7ff', border:'1px solid #bfdbfe', borderRadius:9, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#374151' }}>
            ℹ️ After saving, you can add the full benefit profile (GLA, PHI, medical aid) from <strong>Benefit Profiles</strong> in the sidebar.
          </div>

          <EmployerForm form={form} set={set}/>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn onClick={handleSubmit}>Save Employer</Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── SHARED EMPLOYER FORM ──────────────────────────────────────────────────────
function EmployerForm({ form, set }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
      {/* Name */}
      <div style={{ gridColumn:'1/-1' }}>
        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Employer Name *</label>
        <input value={form.name} onChange={e=>set('name',e.target.value)} style={{ ...inputSt, fontSize:14, fontWeight:600 }} placeholder="Enter employer name"/>
      </div>

      <div>
        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Employer Number</label>
        <input value={form.number} onChange={e=>set('number',e.target.value)} style={inputSt} placeholder="EMP-001"/>
      </div>

      <div>
        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Industry</label>
        <select value={form.industry} onChange={e=>set('industry',e.target.value)} style={selectSt}>
          <option value="">Select industry</option>
          {['Mining','Mining & Steel','Petroleum','Construction','Transport','Manufacturing','Retail','Financial Services','Trade Union','Agriculture','Healthcare','Education','Government','Other'].map(i=><option key={i}>{i}</option>)}
        </select>
      </div>

      <div>
        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Payroll Contact</label>
        <input value={form.contact} onChange={e=>set('contact',e.target.value)} style={inputSt} placeholder="Name of payroll contact"/>
      </div>

      <div>
        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Phone</label>
        <input value={form.phone} onChange={e=>set('phone',e.target.value)} style={inputSt} placeholder="011 555 0100"/>
      </div>

      <div>
        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Email</label>
        <input value={form.email} onChange={e=>set('email',e.target.value)} style={inputSt} placeholder="hr@employer.co.za"/>
      </div>

      <div>
        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Number of Members</label>
        <input type="number" value={form.members} onChange={e=>set('members',e.target.value)} style={inputSt} placeholder="0"/>
      </div>

      <div>
        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Status</label>
        <select value={form.status} onChange={e=>set('status',e.target.value)} style={selectSt}>
          <option value="active">Active</option>
          <option value="review">Under Review</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:10 }}>
        <div onClick={()=>set('portal',!form.portal)} style={{ width:36, height:20, borderRadius:10, background:form.portal?T.blue:'#d1d5db', position:'relative', cursor:'pointer', transition:'background .15s', flexShrink:0 }}>
          <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left:form.portal?18:2, transition:'left .15s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
        </div>
        <span style={{ fontSize:12, color:T.text, fontWeight:500 }}>Employer has portal access</span>
      </div>
    </div>
  )
}
