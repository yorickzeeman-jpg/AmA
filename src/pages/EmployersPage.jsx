import { useState, useRef } from 'react'
import { T, emptyBenefitProfile } from '../data.js'
import { Icon, Empty, Card, Btn, Modal, inputSt, selectSt } from '../ui.jsx'

// ─── PDF EXTRACTION VIA CLAUDE API ───────────────────────────────────────────
// Sends the PDF as base64 to Claude API and gets back structured JSON directly.
// This bypasses all binary PDF parsing issues entirely.

async function extractEmployerDataViaAPI(base64Data) {
  const prompt = `You are extracting data from an employer benefit summary / inhouse pack document.

Extract ALL of the following fields and return ONLY a valid JSON object — no markdown, no explanation:

{
  "employerName": "",
  "payrollContactName": "",
  "payrollContactSurname": "",
  "payrollPhone": "",
  "payrollEmail": "",
  "fundName": "",
  "fundCode": "",
  "fundAdministrator": "",
  "normalRetirementAge": null,
  "administrationCost": null,
  "startDate": "",
  "contributionCategories": [
    { "category": "Category 1", "employer": 5, "employee": 0 }
  ],
  "glaSchemeNumber": "",
  "glaAdministrator": "",
  "glaBenefit": "",
  "glaRate": null,
  "glaFreeCoverLimit": null,
  "glaBenefitExpiryAge": null,
  "glaGlobalEducationProtector": "",
  "glaMortgageProtector": false,
  "glaEducationBenefit": false,
  "phiRate": null,
  "phiWaitingPeriodMonths": null,
  "phiEscalationPercent": null,
  "phiBenefitExpiryAge": null,
  "phiContributionProtectorMonths": null,
  "medicalAidScheme": "",
  "medicalAidSchemeNumber": "",
  "billingMethod": "",
  "billingDueDate": "",
  "paymentMethod": "",
  "compulsory": false
}

Rules:
- Use null for numeric fields not found
- Use empty string for text fields not found
- contributionCategories must be an array, empty array if not found
- Return ONLY the JSON object, nothing else`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    })

    if (!response.ok) {
      console.warn('[InfoPack] API response not ok:', response.status)
      return null
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    // Strip any markdown fences if present
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch(e) {
    console.warn('[InfoPack] API extraction failed:', e.message)
    return null
  }
}

// ─── CONVERT API JSON TO PROFILE OBJECT ──────────────────────────────────────
function apiResultToProfile(d) {
  return {
    employerName:   d.employerName || '',
    payrollContact: [d.payrollContactName, d.payrollContactSurname].filter(Boolean).join(' '),
    payrollPhone:   d.payrollPhone || '',
    payrollEmail:   d.payrollEmail || '',
    effectiveDate:  d.startDate || new Date().toISOString().split('T')[0],
    retirementAge:  d.normalRetirementAge || 65,
    billingMethod:  d.billingMethod || '',
    billingDueDate: d.billingDueDate || '',
    paymentMethod:  d.paymentMethod || '',
    retirementFund: {
      name:                 d.fundName || '',
      fundCode:             d.fundCode || '',
      administrator:        d.fundAdministrator || '',
      normalRetirementAge:  d.normalRetirementAge || 65,
      administrationCost:   d.administrationCost || 0,
      consultingFee:        d.consultingFee || 0,
      contributionCategories: d.contributionCategories || [],
    },
    groupLife: {
      administrator:            d.glaAdministrator || '',
      schemeNumber:             d.glaSchemeNumber || '',
      benefit:                  d.glaBenefit || '',
      rate:                     d.glaRate || 0,
      educationBenefit:         d.glaEducationBenefit || false,
      globalEducationProtector: d.glaGlobalEducationProtector || '',
      mortgageProtector:        d.glaMortgageProtector || false,
      freeCoverLimit:           d.glaFreeCoverLimit || 0,
      benefitExpiryAge:         d.glaBenefitExpiryAge || 65,
    },
    capitalDisability: d.capitalDisabilityRate ? {
      rate:               d.capitalDisabilityRate,
      freeCoverLimit:     d.capitalDisabilityFreeCover || 0,
      waitingMonths:      d.capitalDisabilityWaitingMonths || 0,
    } : null,
    funeralBenefit: d.funeralRatePerMember ? {
      ratePerMember:    d.funeralRatePerMember,
      principalCover:   d.funeralPrincipalCover || 0,
    } : null,
    // funeralCover is the key read by EmployerProfile, FuneralClaims and consultations
    funeralCover: d.funeralRatePerMember ? {
      scheme:        '',
      administrator: d.fundAdministrator || '',
      memberPremium: d.funeralRatePerMember,
      memberCover:   d.funeralPrincipalCover || 0,
      spouseCover:   d.funeralPrincipalCover || 0,
      childCover:    0,
    } : null,
    disability: {
      rate:                       d.phiRate || 0,
      waitingPeriodMonths:        d.phiWaitingPeriodMonths || 0,
      escalationPercent:          d.phiEscalationPercent || 0,
      benefitExpiryAge:           d.phiBenefitExpiryAge || 65,
      contributionProtectorMonths:d.phiContributionProtectorMonths || 0,
    },
    medicalAid: {
      scheme:        d.medicalAidScheme || '',
      schemeNumber:  d.medicalAidSchemeNumber || '',
      billingMethod: d.billingMethod || '',
      billingDueDate:d.billingDueDate || '',
      paymentMethod: d.paymentMethod || '',
      compulsory:    d.compulsory || false,
    },
  }
}

// ─── BUILD DEBUG FIELDS FROM API RESULT ──────────────────────────────────────
function buildDebugFields(d) {
  const cats = d.contributionCategories || []
  return {
    'Employer Name':         { value: d.employerName,        source: 'Employer name' },
    'Payroll Contact':       { value: [d.payrollContactName, d.payrollContactSurname].filter(Boolean).join(' '), source: 'Name / Surname' },
    'Phone':                 { value: d.payrollPhone,        source: 'Contact number' },
    'Email':                 { value: d.payrollEmail,        source: 'Email address' },
    'Fund Name':             { value: d.fundName,            source: 'Fund name' },
    'Fund Code':             { value: d.fundCode,            source: 'Fund code' },
    'Fund Administrator':    { value: d.fundAdministrator,   source: 'Administrator' },
    'Start Date':            { value: d.startDate,           source: 'Start / Inception date' },
    'Retirement Age':        { value: d.normalRetirementAge ? String(d.normalRetirementAge) : '', source: 'Normal retirement age' },
    'Admin Cost':            { value: d.administrationCost   ? `R${d.administrationCost}`  : '', source: 'Administration fee' },
    'Consulting Fee':        { value: d.consultingFee        ? `R${d.consultingFee}`        : '', source: 'Consulting fee' },
    'Contribution Cats':     { value: cats.length > 0 ? cats.map(c=>`${c.category}: ${c.employer}%/${c.employee}%`).join(', ') : '', source: 'Category table' },
    'GLA Scheme No.':        { value: d.glaSchemeNumber,     source: 'Scheme number (GLA)' },
    'GLA Administrator':     { value: d.glaAdministrator,    source: 'Administrator (risk)' },
    'GLA Rate':              { value: d.glaRate              ? `${d.glaRate}%`              : '', source: 'Rate (GLA table)' },
    'GLA Free Cover':        { value: d.glaFreeCoverLimit    ? `R${d.glaFreeCoverLimit?.toLocaleString()}` : '', source: 'Free cover limit' },
    'GLA Expiry Age':        { value: d.glaBenefitExpiryAge  ? `Age ${d.glaBenefitExpiryAge}` : '', source: 'Benefit expiry age' },
    'Capital Disability %':  { value: d.capitalDisabilityRate ? `${d.capitalDisabilityRate}%` : '', source: 'Capital disability rate' },
    'Capital Dis. Cover':    { value: d.capitalDisabilityFreeCover ? `R${d.capitalDisabilityFreeCover?.toLocaleString()}` : '', source: 'Capital disability free cover' },
    'Funeral Rate/Member':   { value: d.funeralRatePerMember ? `R${d.funeralRatePerMember}/mo` : '', source: 'Rate per member per month' },
    'PHI Rate':              { value: d.phiRate              ? `${d.phiRate}%`              : '', source: 'Total rate for income disability' },
    'PHI Waiting Period':    { value: d.phiWaitingPeriodMonths ? `${d.phiWaitingPeriodMonths} months` : '', source: 'Waiting period' },
    'Medical Aid Scheme':    { value: d.medicalAidScheme,    source: 'Scheme name (health)' },
    'Med Scheme No.':        { value: d.medicalAidSchemeNumber, source: 'Scheme number (health)' },
    'Billing Method':        { value: d.billingMethod,       source: 'Billing method' },
    'Payment Method':        { value: d.paymentMethod,       source: 'Payment method' },
  }
}

// Legacy binary scanner and text parser removed.
// PDF extraction now handled by /api/extract-employer serverless function.
// apiResultToProfile() and buildDebugFields() below convert the API response.


// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function EmployersPage({ employers, cases, users, currentUser, onNav, onAddEmployer, onOpenBenefitProfile }) {
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
          const con       = users.find(u => u.id === emp.consultant)
          const empCases  = cases.filter(c => c.employerId === emp.id)
          const openCount = empCases.filter(c => !['Completed','Closed'].includes(c.status)).length
          const escalated = empCases.filter(c => c.escalated).length
          const completed = empCases.filter(c => c.status === 'Completed').length
          return (
            <div key={emp.id}
              style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, padding:18, transition:'all .15s', overflow:'hidden' }}>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ width:44, height:44, borderRadius:10, background:`linear-gradient(135deg,${T.navy},#2d5a8e)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#fff' }}>{emp.name[0]}</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {emp.portal && <span style={{ fontSize:9, fontWeight:700, color:T.blue, background:'#eff6ff', padding:'2px 6px', borderRadius:20 }}>PORTAL</span>}
                  <span style={{ fontSize:9, fontWeight:700, color:emp.status==='active'?'#059669':T.amber, background:emp.status==='active'?'#f0fdf4':'#fffbeb', padding:'2px 6px', borderRadius:20 }}>{emp.status?.toUpperCase()}</span>
                </div>
              </div>
              <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:2 }}>{emp.name}</div>
              <div style={{ fontSize:11, color:T.gray, marginBottom:12 }}>{emp.number}{emp.industry ? ` · ${emp.industry}` : ''}</div>

              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6, marginBottom:12 }}>
                {[['Members',emp.members?.toLocaleString()||'—'],['Open',openCount],['Done',completed],['Esc',escalated]].map(([l,v]) => (
                  <div key={l} style={{ textAlign:'center', padding:'7px 0', background:'#f9fafb', borderRadius:6 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:l==='Esc'&&escalated>0?T.red:T.text }}>{v}</div>
                    <div style={{ fontSize:9, color:T.gray, fontWeight:700, textTransform:'uppercase' }}>{l}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize:11, color:T.gray, marginBottom:12 }}>Consultant: {con?.name||'Unassigned'}</div>

              {/* Action buttons */}
              <div style={{ display:'flex', gap:7, borderTop:`1px solid #f3f4f6`, paddingTop:12 }}>
                <button onClick={() => onNav('cases', { employer: emp.id })}
                  style={{ flex:1, padding:'7px 0', background:'#f9fafb', border:`1px solid ${T.border}`, borderRadius:8, fontSize:11, fontWeight:600, color:T.text, cursor:'pointer', fontFamily:'inherit' }}>
                  View Cases
                </button>
                <button onClick={() => onOpenBenefitProfile(emp)}
                  style={{ flex:1, padding:'7px 0', background:T.navy, border:'none', borderRadius:8, fontSize:11, fontWeight:600, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                  Benefit Profile
                </button>
              </div>
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
  const [mode, setMode]           = useState(null)  // null | 'upload' | 'manual' | 'bulk'
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
      // Read as base64 DataURL
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = e => resolve(e.target.result.split(',')[1])
        reader.onerror = () => reject(new Error('Could not read file'))
        reader.readAsDataURL(file)
      })

      setUpPct(40)

      // Call serverless function — API key stays server-side
      const response = await fetch('/api/extract-employer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ base64, mediaType: file.type || 'application/pdf' }),
      })

      setUpPct(80)

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Extraction failed')
      }

      const { data } = await response.json()
      const profile  = apiResultToProfile(data)
      const debugFields = buildDebugFields(data)
      const extracted   = Object.values(debugFields).filter(f => f.value && f.value.length > 0).length

      setUpPct(100)
      setResult({ profile, employerName: data.employerName, extracted, totalFields: Object.keys(debugFields).length, debugFields, extractionMethod: 'claude-api' })
      setUploading(false)
      setUpDone(true)

      setForm(f => ({
        ...f,
        name:    data.employerName    || f.name,
        number:  f.number || `EMP-${String(existingCount + 1).padStart(3,'0')}`,
        contact: profile.payrollContact || f.contact,
        phone:   profile.payrollPhone   || f.phone,
        email:   profile.payrollEmail   || f.email,
      }))

    } catch(err) {
      setUploading(false)
      setUpPct(0)
      alert('Extraction failed: ' + err.message + '\n\nYou can still enter the employer details manually.')
    }
  }

  function handleSubmit() {
    if (!form.name.trim()) { alert('Employer name is required.'); return }
    const newEmp = {
      id:       crypto.randomUUID(),
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
            How would you like to add this employer?
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <button onClick={() => setMode('upload')}
              style={{ padding:'24px 16px', borderRadius:12, border:`2px solid ${T.border}`, background:'#fff', cursor:'pointer', textAlign:'center', fontFamily:'inherit', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.orange; e.currentTarget.style.background=T.orangeL }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background='#fff' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📄</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:4 }}>Upload Info Pack</div>
              <div style={{ fontSize:11, color:T.gray, lineHeight:1.5 }}>One employer — extract automatically</div>
            </button>

            <button onClick={() => setMode('bulk')}
              style={{ padding:'24px 16px', borderRadius:12, border:`2px solid ${T.border}`, background:'#fff', cursor:'pointer', textAlign:'center', fontFamily:'inherit', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.green; e.currentTarget.style.background='#f0fdf4' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background='#fff' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📦</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:4 }}>Bulk Upload</div>
              <div style={{ fontSize:11, color:T.gray, lineHeight:1.5 }}>Multiple info packs — process all at once</div>
            </button>

            <button onClick={() => { setMode('manual'); setForm(f => ({...f, number:`EMP-${String(existingCount+1).padStart(3,'0')}`})) }}
              style={{ padding:'24px 16px', borderRadius:12, border:`2px solid ${T.border}`, background:'#fff', cursor:'pointer', textAlign:'center', fontFamily:'inherit', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.blue; e.currentTarget.style.background='#f0f7ff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background='#fff' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>✏️</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:4 }}>Enter Manually</div>
              <div style={{ fontSize:11, color:T.gray, lineHeight:1.5 }}>Fill in the form by hand</div>
            </button>
          </div>
        </div>
      )}

      {/* ── BULK MODE ── */}
      {mode === 'bulk' && (
        <BulkUploadFlow
          existingCount={existingCount}
          onBack={() => setMode(null)}
          onSaveAll={(employers, profiles) => {
            employers.forEach((emp, i) => onAdd(emp, profiles[i]))
            onClose()
          }}
        />
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

// ═════════════════════════════════════════════════════════════════════════════
// BULK UPLOAD FLOW
// Drop multiple PDFs → process in parallel → review → save all
// ═════════════════════════════════════════════════════════════════════════════
function BulkUploadFlow({ existingCount, onBack, onSaveAll }) {
  const [items, setItems]     = useState([])  // { file, status, name, result, error }
  const [processing, setProc] = useState(false)
  const [done, setDone]       = useState(false)
  const inputRef              = useRef(null)

  function addFiles(files) {
    const newItems = Array.from(files)
      .filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf') || f.name.endsWith('.txt'))
      .map(f => ({ id: Math.random().toString(36).slice(2), file: f, status: 'queued', name: f.name, result: null, error: null }))
    setItems(prev => [...prev, ...newItems])
  }

  async function processAll() {
    if (items.length === 0) return
    setProc(true)

    // Process all in parallel
    const updated = await Promise.all(items.map(async item => {
      if (item.status === 'done') return item
      try {
        // Update status to processing
        setItems(prev => prev.map(x => x.id === item.id ? {...x, status:'processing'} : x))

        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload  = e => resolve(e.target.result.split(',')[1])
          reader.onerror = () => reject(new Error('Read failed'))
          reader.readAsDataURL(item.file)
        })

        const response = await fetch('/api/extract-employer', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ base64, mediaType: 'application/pdf' }),
        })

        if (!response.ok) throw new Error('Extraction failed')
        const { data } = await response.json()
        const profile  = apiResultToProfile(data)
        return { ...item, status: 'done', result: { data, profile } }
      } catch(e) {
        return { ...item, status: 'error', error: e.message }
      }
    }))

    setItems(updated)
    setProc(false)
    setDone(true)
  }

  function saveAll() {
    const successful = items.filter(i => i.status === 'done' && i.result)
    const employers  = successful.map((item, idx) => ({
      id:       crypto.randomUUID(),
      name:     item.result.data.employerName || item.name.replace('.pdf',''),
      number:   `EMP-${String(existingCount + idx + 1).padStart(3,'0')}`,
      industry: '',
      status:   'active',
      members:  0,
      contact:  item.result.profile.payrollContact || '',
      phone:    item.result.profile.payrollPhone   || '',
      email:    item.result.profile.payrollEmail   || '',
      portal:   false,
    }))
    const profiles = employers.map((emp, idx) => ({
      ...successful[idx].result.profile,
      employerId:   emp.id,
      employerName: emp.name,
    }))
    onSaveAll(employers, profiles)
  }

  const successCount = items.filter(i => i.status === 'done').length
  const errorCount   = items.filter(i => i.status === 'error').length

  return (
    <div>
      <button onClick={onBack} style={{ fontSize:12, color:T.orange, background:'none', border:'none', cursor:'pointer', fontWeight:600, marginBottom:16, fontFamily:'inherit' }}>← Back</button>

      {/* Drop zone */}
      {!processing && !done && (
        <label
          style={{ display:'block', border:`2px dashed ${T.border}`, borderRadius:12, padding:'32px 24px', textAlign:'center', cursor:'pointer', background:'#fafafa', marginBottom:16 }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor=T.green }}
          onDragLeave={e => { e.currentTarget.style.borderColor=T.border }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor=T.border; addFiles(e.dataTransfer.files) }}>
          <input ref={inputRef} type="file" accept=".pdf,.txt" multiple onChange={e => { addFiles(e.target.files); e.target.value='' }} style={{ display:'none' }}/>
          <div style={{ fontSize:40, marginBottom:10 }}>📦</div>
          <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:6 }}>Drop all info packs here</div>
          <div style={{ fontSize:12, color:T.gray }}>or click to browse · select multiple PDFs at once</div>
        </label>
      )}

      {/* File list */}
      {items.length > 0 && (
        <div style={{ marginBottom:16 }}>
          {items.map(item => {
            const statusConfig = {
              queued:     { icon:'○', color:T.gray,  bg:'#f9fafb' },
              processing: { icon:'⏳', color:T.blue,  bg:'#eff6ff' },
              done:       { icon:'✓', color:T.green, bg:'#f0fdf4' },
              error:      { icon:'✗', color:T.red,   bg:'#fff1f2' },
            }[item.status] || { icon:'○', color:T.gray, bg:'#f9fafb' }

            return (
              <div key={item.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:statusConfig.bg, borderRadius:9, marginBottom:6, border:`1px solid ${statusConfig.color}20` }}>
                <span style={{ fontSize:16, color:statusConfig.color, width:20, textAlign:'center' }}>{statusConfig.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                  {item.result && <div style={{ fontSize:11, color:T.green }}>{item.result.data.employerName || 'Extracted'}</div>}
                  {item.error  && <div style={{ fontSize:11, color:T.red }}>{item.error}</div>}
                </div>
                {!processing && !done && (
                  <button onClick={() => setItems(prev => prev.filter(x => x.id !== item.id))}
                    style={{ background:'none', border:'none', cursor:'pointer', color:T.gray, fontSize:16 }}>×</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Progress summary when done */}
      {done && (
        <div style={{ background: errorCount === 0 ? '#f0fdf4' : '#fffbeb', border:`1px solid ${errorCount===0?'#bbf7d0':'#fde68a'}`, borderRadius:10, padding:'12px 14px', marginBottom:16, display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:24 }}>{errorCount === 0 ? '✅' : '⚠️'}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color: errorCount===0 ? T.green : '#92400e' }}>
              {successCount} of {items.length} employers extracted successfully
            </div>
            {errorCount > 0 && <div style={{ fontSize:11, color:'#92400e' }}>{errorCount} failed — these will be skipped</div>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', paddingTop:16, borderTop:`1px solid ${T.border}` }}>
        {!done && !processing && items.length > 0 && (
          <button onClick={processAll}
            style={{ padding:'10px 20px', background:T.green, border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            ⚡ Extract {items.length} Info Pack{items.length!==1?'s':''}
          </button>
        )}
        {processing && (
          <div style={{ padding:'10px 20px', background:'#f3f4f6', borderRadius:9, fontSize:13, color:T.gray }}>
            Processing {items.filter(i=>i.status==='processing').length} files…
          </div>
        )}
        {done && successCount > 0 && (
          <button onClick={saveAll}
            style={{ padding:'10px 20px', background:T.orange, border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Save {successCount} Employer{successCount!==1?'s':''}
          </button>
        )}
      </div>
    </div>
  )
}
