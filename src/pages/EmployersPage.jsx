import { useState } from 'react'
import { T, emptyBenefitProfile } from '../data.js'
import { Icon, Empty, Card, Btn, Modal, inputSt, selectSt } from '../ui.jsx'

// ─── PARSE INHOUSE PACK TEXT ─────────────────────────────────────────────────
// Extracts employer + benefit profile data from an uploaded info pack PDF/text.
// Uses the same label→value strategy as the Email Intake engine.
function parseInfoPack(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1)
  const lower = text.toLowerCase()

  function find(...labels) {
    for (const label of labels) {
      const idx = lower.indexOf(label.toLowerCase())
      if (idx === -1) continue
      // Look at the next content after the label
      const after = text.slice(idx + label.length, idx + label.length + 120).trim()
      const lineEnd = after.indexOf('\n')
      const val = (lineEnd > 0 ? after.slice(0, lineEnd) : after).replace(/^[:\s]+/, '').trim()
      if (val.length > 0 && val.length < 100) return val
    }
    return ''
  }

  // Employer info
  const employerName  = find('Employer name:', 'Employer name') || find('Scheme name:')
  const payrollFirst  = find('Name:', 'First name:')
  const payrollSur    = find('Surname:')
  const payrollPhone  = find('Contact number:')
  const payrollEmail  = find('Email address:')
  const payrollContact = [payrollFirst, payrollSur].filter(Boolean).join(' ')

  // Retirement fund
  const fundName      = find('Fund name:')
  const fundCode      = find('Fund code:')
  const fundAdmin     = find('Administrator:')
  const retireAge     = find('Normal retirement age:')
  const adminCost     = find('Administration cost amount:')
  const startDate     = find('Start date:', 'Inception date:')

  // Contribution categories — scan for table rows like "Category 1  5%  0%"
  const catRows = []
  const catRe = /Category\s+(\d)\s+([\d.]+)%\s+([\d.]+)%/g
  let m
  while ((m = catRe.exec(text)) !== null) {
    catRows.push({ category: `Category ${m[1]}`, employer: parseFloat(m[2]), employee: parseFloat(m[3]) })
  }

  // GLA
  const schemeNumber  = find('Scheme number:')
  const glaBenefit    = find('Group Life benefit Category:') || '3 × Annual Salary'
  const glaRate       = find('Rate:').replace('%','').trim()
  const freeCoverLimit= find('Free cover limit:').replace(/[R\s,]/g,'')
  const expiryAge     = find('Benefit expiry age:')
  const educBenefit   = lower.includes('education benefit') && lower.includes('yes') ? true : false
  const globalEdProt  = find('Global Education Protector:')
  const mortgageProt  = lower.includes('mortgage protector')

  // PHI / Disability
  const phiRate       = text.match(/Total rate for\s+income disability\s+benefit[:\s]+([\d.]+)%/i)?.[1] ||
                        find('Total rate for income disability benefit:').replace('%','') || ''
  const waitingPeriod = find('Waiting period:').replace(/\D/g,'')
  const escalation    = find('Escalation rate:').replace('%','')
  const contribProt   = find('Contribution Protector:').replace(/\D/g,'')

  // Medical aid
  const medScheme     = find('Scheme name:')  // second occurrence
  const medSchemeNo   = schemeNumber === find('Scheme number:') ? '' : find('Scheme number:')
  const billingMethod = find('Billing method:')
  const billingDue    = find('Billing due date')
  const paymentMethod = find('Payment method:')
  const compulsory    = lower.includes('compulsory: yes') || lower.includes('compulsory:\nyes')

  // Build profile object
  const profile = {
    employerName,
    payrollContact,
    payrollPhone,
    payrollEmail,
    effectiveDate: startDate || new Date().toISOString().split('T')[0],
    retirementAge: retireAge ? parseInt(retireAge) : 65,
    billingMethod:  billingMethod || 'Arrears',
    billingDueDate: billingDue || '14th',
    paymentMethod:  paymentMethod || 'Debit Order',

    retirementFund: {
      name: fundName,
      fundCode,
      administrator: fundAdmin,
      normalRetirementAge: retireAge ? parseInt(retireAge) : 65,
      administrationCost: adminCost ? parseFloat(adminCost.replace('R','').replace(',','')) : 0,
      contributionCategories: catRows.length > 0 ? catRows : [],
    },

    groupLife: {
      administrator: find('Administrator:') || 'Discovery',
      schemeNumber,
      benefit: '3 × Annual Salary',
      rate: glaRate ? parseFloat(glaRate) : 0,
      educationBenefit: educBenefit,
      globalEducationProtector: globalEdProt,
      mortgageProtector: mortgageProt,
      freeCoverLimit: freeCoverLimit ? parseInt(freeCoverLimit) : 0,
      benefitExpiryAge: expiryAge ? parseInt(expiryAge) : 65,
    },

    disability: {
      rate: phiRate ? parseFloat(phiRate) : 0,
      waitingPeriodMonths: waitingPeriod ? parseInt(waitingPeriod) : 3,
      escalationPercent: escalation ? parseFloat(escalation) : 5,
      benefitExpiryAge: expiryAge ? parseInt(expiryAge) : 65,
      contributionProtectorMonths: contribProt ? parseInt(contribProt) : 12,
    },

    medicalAid: {
      scheme: medScheme || 'Discovery Health',
      schemeNumber: medSchemeNo || find('Scheme number:'),
      billingMethod: billingMethod || 'Arrears',
      billingDueDate: billingDue || '14th',
      paymentMethod: paymentMethod || 'Debit Order',
      compulsory,
    },

    funeralCover: null,
  }

  // Count extracted fields
  const extracted = Object.entries({
    employerName, fundName, fundCode, fundAdmin, schemeNumber,
    glaRate, phiRate, billingMethod, payrollContact,
  }).filter(([,v]) => v && v.length > 0).length

  return { profile, employerName, extracted, totalFields: 9 }
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

  function handleFileUpload(file) {
    if (!file) return
    setUpName(file.name)
    setUploading(true)
    setUpPct(0)

    const reader = new FileReader()
    reader.onload = e => {
      // Simulate processing progress
      let pct = 0
      const iv = setInterval(() => {
        pct += 20
        setUpPct(Math.min(pct, 90))
        if (pct >= 90) {
          clearInterval(iv)
          const text = e.target.result
          const result = parseInfoPack(text)
          setResult(result)
          setUpPct(100)
          setUploading(false)
          setUpDone(true)
          // Pre-fill form with extracted employer name
          if (result.employerName) {
            setForm(f => ({
              ...f,
              name: result.employerName,
              number: `EMP-${String(existingCount + 1).padStart(3,'0')}`,
              contact: result.profile.payrollContact || '',
              phone: result.profile.payrollPhone || '',
              email: result.profile.payrollEmail || '',
            }))
          }
        }
      }, 200)
    }
    reader.readAsText(file)
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
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'12px 14px', marginBottom:16, display:'flex', gap:12, alignItems:'center' }}>
                <span style={{ fontSize:24 }}>✅</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.green }}>
                    Info pack processed — {parseResult.extracted} of {parseResult.totalFields} fields extracted
                  </div>
                  <div style={{ fontSize:11, color:'#374151', marginTop:2 }}>
                    {uploadedName} · Review and complete any missing fields below, then save.
                  </div>
                </div>
              </div>

              {/* Extracted fields preview */}
              <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.text, marginBottom:10 }}>Extracted from document</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  {[
                    ['Employer',          parseResult.profile.employerName],
                    ['Payroll Contact',   parseResult.profile.payrollContact],
                    ['Fund Name',         parseResult.profile.retirementFund?.name],
                    ['Fund Code',         parseResult.profile.retirementFund?.fundCode],
                    ['Fund Admin',        parseResult.profile.retirementFund?.administrator],
                    ['GLA Scheme No.',    parseResult.profile.groupLife?.schemeNumber],
                    ['GLA Rate',          parseResult.profile.groupLife?.rate ? `${parseResult.profile.groupLife.rate}%` : ''],
                    ['PHI Rate',          parseResult.profile.disability?.rate ? `${parseResult.profile.disability.rate}%` : ''],
                    ['Medical Aid',       parseResult.profile.medicalAid?.scheme],
                    ['Contribution Cats', parseResult.profile.retirementFund?.contributionCategories?.length ? `${parseResult.profile.retirementFund.contributionCategories.length} categories` : ''],
                    ['Billing Method',    parseResult.profile.billingMethod],
                    ['Retirement Age',    parseResult.profile.retirementAge ? `Age ${parseResult.profile.retirementAge}` : ''],
                  ].map(([l,v]) => (
                    <div key={l} style={{ fontSize:11 }}>
                      <div style={{ color:T.gray, fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>{l}</div>
                      <div style={{ color:v?T.text:'#d1d5db', fontWeight:v?600:400, fontStyle:v?'normal':'italic' }}>
                        {v || 'Not found'}
                        {v && <span style={{ color:T.green, marginLeft:4 }}>✓</span>}
                      </div>
                    </div>
                  ))}
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
