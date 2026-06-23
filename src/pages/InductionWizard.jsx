import { useState, useRef, useEffect } from 'react'
import { T } from '../data.js'
import { Btn, inputSt, selectSt } from '../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// DIGITAL INDUCTION WIZARD — Amadwala Employee Benefits
//
// Flow:
//   1. Personal Details
//   2. Contact & Address
//   3. Employment Details
//   4. Banking Details
//   5. Benefit Selection (reads employer benefit profile)
//   6. Retirement Fund Beneficiaries
//   7. Group Risk Beneficiaries
//   8. Medical Aid Dependants
//   9. Document Review & Sign
//  10. Complete — email sent, billing action created
// ═════════════════════════════════════════════════════════════════════════════

const STEPS = [
  { id:'personal',     label:'Personal',      icon:'👤' },
  { id:'contact',      label:'Contact',        icon:'📱' },
  { id:'employment',   label:'Employment',     icon:'💼' },
  { id:'banking',      label:'Banking',        icon:'🏦' },
  { id:'benefits',     label:'Benefits',       icon:'🛡️' },
  { id:'rf_bene',      label:'RF Beneficiaries', icon:'📋' },
  { id:'risk_bene',    label:'Risk Beneficiaries', icon:'📋' },
  { id:'medical',      label:'Medical Aid',    icon:'🏥' },
  { id:'review',       label:'Review & Sign',  icon:'✍️' },
  { id:'complete',     label:'Complete',       icon:'✅' },
]

const EMPTY_PROFILE = {
  // Personal
  firstName:'', surname:'', idNumber:'', dateOfBirth:'',
  gender:'', maritalStatus:'', nationality:'South African',
  // Contact
  mobile:'', email:'', altPhone:'',
  residentialAddress:'', residentialCity:'', residentialCode:'',
  postalSame:true,
  postalAddress:'', postalCity:'', postalCode:'',
  // Employment
  employer:'', employeeNumber:'', payrollNumber:'', jobTitle:'',
  startDate:'', salary:'', salaryFrequency:'Monthly', benefitCategory:'Category 1',
  // Banking
  bank:'', accountNumber:'', branchCode:'', accountType:'Cheque',
  // Benefits
  retirementFund:true, gla:true, phi:true, medicalAid:true,
  investmentChoice:'Moderate',
  medicalPlan:'',
  // Beneficiaries
  rfBeneficiaries:[],
  riskBeneficiaries:[],
  // Medical dependants
  medicalDependants:[],
}

const EMPTY_BENE = { name:'', surname:'', relationship:'', dob:'', phone:'', percentage:'' }
const EMPTY_DEP  = { name:'', surname:'', idNumber:'', relationship:'', dob:'', medicalStatus:'Main Member' }

// ─── FIELD ───────────────────────────────────────────────────────────────────
function Field({ label, required, children, half, third }) {
  return (
    <div style={{ gridColumn: third ? 'span 1' : half ? 'span 1' : 'span 2' }}>
      <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>
        {label}{required && <span style={{ color:T.red }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function Grid({ children, cols=2 }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:12 }}>
      {children}
    </div>
  )
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
        <span style={{ fontSize:22 }}>{icon}</span>
        <span style={{ fontSize:16, fontWeight:800, color:T.text }}>{title}</span>
      </div>
      {subtitle && <div style={{ fontSize:12, color:T.gray, marginLeft:32 }}>{subtitle}</div>}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN WIZARD
// ═════════════════════════════════════════════════════════════════════════════
export default function InductionWizard({ caseData, employer, benefitProfile, users, currentUser, onComplete, onClose }) {
  const [stepIdx, setStepIdx]   = useState(0)
  const [profile, setProfile]   = useState({ ...EMPTY_PROFILE, employer: employer?.name || '', startDate: new Date().toISOString().split('T')[0] })
  const [signed, setSigned]     = useState(false)
  const [sending, setSending]   = useState(false)
  const [errors, setErrors]     = useState({})
  const sigCanvasRef            = useRef(null)
  const [sigDrawing, setSigDraw]= useState(false)
  const [hasSig, setHasSig]     = useState(false)

  const step = STEPS[stepIdx]
  const p    = profile
  const set  = (k, v) => setProfile(prev => ({...prev, [k]: v}))

  // Validate current step before advancing
  function validate() {
    const e = {}
    if (step.id === 'personal') {
      if (!p.firstName.trim())  e.firstName = 'Required'
      if (!p.surname.trim())    e.surname   = 'Required'
      if (!p.idNumber.trim())   e.idNumber  = 'Required'
      if (!p.dateOfBirth)       e.dateOfBirth = 'Required'
    }
    if (step.id === 'contact') {
      if (!p.mobile.trim())     e.mobile = 'Required'
    }
    if (step.id === 'employment') {
      if (!p.payrollNumber.trim()) e.payrollNumber = 'Required'
      if (!p.startDate)            e.startDate     = 'Required'
      if (!p.salary)               e.salary        = 'Required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (!validate()) return
    setStepIdx(i => Math.min(i+1, STEPS.length-1))
    setErrors({})
  }

  function back() {
    setStepIdx(i => Math.max(i-1, 0))
    setErrors({})
  }

  async function handleComplete() {
    setSending(true)
    try {
      await fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, employer: employer?.name, caseRef: caseData?.ref }),
      })
    } catch(e) { console.warn('Email send failed:', e.message) }
    setSending(false)
    onComplete(profile)
  }

  // Signature canvas
  function startSig(e) {
    setSigDraw(true)
    const canvas = sigCanvasRef.current
    const ctx    = canvas.getContext('2d')
    const rect   = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }
  function drawSig(e) {
    if (!sigDrawing) return
    const canvas = sigCanvasRef.current
    const ctx    = canvas.getContext('2d')
    const rect   = canvas.getBoundingClientRect()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#1e3a5f'
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
    setHasSig(true)
  }
  function endSig() { setSigDraw(false) }
  function clearSig() {
    const canvas = sigCanvasRef.current
    canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height)
    setHasSig(false)
  }

  const progressPct = Math.round((stepIdx / (STEPS.length-1)) * 100)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:400, display:'flex', alignItems:'stretch', justifyContent:'flex-end' }}>
      <div style={{ width:'min(780px,100vw)', height:'100vh', background:'#fff', display:'flex', flexDirection:'column', boxShadow:'-12px 0 48px rgba(0,0,0,0.2)', animation:'slideInRight .25s ease' }}>

        {/* Header */}
        <div style={{ background:T.navy, padding:'16px 24px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:3 }}>
                {caseData?.ref} · {employer?.name}
              </div>
              <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>New Employee Induction</div>
            </div>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, width:34, height:34, cursor:'pointer', color:'#fff', fontSize:18 }}>×</button>
          </div>

          {/* Step indicators */}
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {STEPS.map((s,i) => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background: i<stepIdx?T.green : i===stepIdx?T.orange : 'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', cursor: i<stepIdx?'pointer':'default', flexShrink:0, transition:'all .2s' }}
                  onClick={() => i < stepIdx && setStepIdx(i)}>
                  {i < stepIdx ? '✓' : i+1}
                </div>
                {i < STEPS.length-1 && <div style={{ width:16, height:2, background: i<stepIdx?T.green:'rgba(255,255,255,0.15)', borderRadius:1 }}/>}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ height:3, background:'rgba(255,255,255,0.15)', borderRadius:2, marginTop:10, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${progressPct}%`, background:T.orange, borderRadius:2, transition:'width .3s ease' }}/>
          </div>
        </div>

        {/* Step label */}
        <div style={{ padding:'12px 24px', background:'#f9fafb', borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.text }}>
            Step {stepIdx+1} of {STEPS.length} — {step.icon} {step.label}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:24 }}>

          {/* ── STEP 1: PERSONAL ── */}
          {step.id === 'personal' && (
            <div>
              <SectionTitle icon="👤" title="Personal Details" subtitle="Captured once — used across all benefit forms"/>
              <Grid>
                <Field label="First Name" required>
                  <input value={p.firstName} onChange={e=>set('firstName',e.target.value)} style={{...inputSt, borderColor: errors.firstName?T.red:undefined}} placeholder="Enter first name"/>
                  {errors.firstName && <div style={{ fontSize:11, color:T.red, marginTop:3 }}>{errors.firstName}</div>}
                </Field>
                <Field label="Surname" required>
                  <input value={p.surname} onChange={e=>set('surname',e.target.value)} style={{...inputSt, borderColor: errors.surname?T.red:undefined}} placeholder="Enter surname"/>
                  {errors.surname && <div style={{ fontSize:11, color:T.red, marginTop:3 }}>{errors.surname}</div>}
                </Field>
                <Field label="ID Number" required>
                  <input value={p.idNumber} onChange={e=>set('idNumber',e.target.value)} style={{...inputSt, borderColor: errors.idNumber?T.red:undefined}} placeholder="13-digit SA ID number"/>
                  {errors.idNumber && <div style={{ fontSize:11, color:T.red, marginTop:3 }}>{errors.idNumber}</div>}
                </Field>
                <Field label="Date of Birth" required>
                  <input type="date" value={p.dateOfBirth} onChange={e=>set('dateOfBirth',e.target.value)} style={{...inputSt, borderColor: errors.dateOfBirth?T.red:undefined}}/>
                  {errors.dateOfBirth && <div style={{ fontSize:11, color:T.red, marginTop:3 }}>{errors.dateOfBirth}</div>}
                </Field>
                <Field label="Gender">
                  <select value={p.gender} onChange={e=>set('gender',e.target.value)} style={selectSt}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </Field>
                <Field label="Marital Status">
                  <select value={p.maritalStatus} onChange={e=>set('maritalStatus',e.target.value)} style={selectSt}>
                    <option value="">Select</option>
                    <option>Single</option><option>Married</option><option>Divorced</option>
                    <option>Widowed</option><option>Life Partner</option>
                  </select>
                </Field>
                <Field label="Nationality">
                  <input value={p.nationality} onChange={e=>set('nationality',e.target.value)} style={inputSt} placeholder="South African"/>
                </Field>
              </Grid>
            </div>
          )}

          {/* ── STEP 2: CONTACT ── */}
          {step.id === 'contact' && (
            <div>
              <SectionTitle icon="📱" title="Contact & Address Details"/>
              <Grid>
                <Field label="Mobile Number" required>
                  <input value={p.mobile} onChange={e=>set('mobile',e.target.value)} style={{...inputSt, borderColor: errors.mobile?T.red:undefined}} placeholder="0XX XXX XXXX"/>
                  {errors.mobile && <div style={{ fontSize:11, color:T.red, marginTop:3 }}>{errors.mobile}</div>}
                </Field>
                <Field label="Email Address">
                  <input value={p.email} onChange={e=>set('email',e.target.value)} style={inputSt} placeholder="member@email.com"/>
                </Field>
                <Field label="Alternative Phone">
                  <input value={p.altPhone} onChange={e=>set('altPhone',e.target.value)} style={inputSt} placeholder="Optional"/>
                </Field>
              </Grid>

              <div style={{ marginTop:20, marginBottom:12, fontSize:13, fontWeight:700, color:T.text }}>Residential Address</div>
              <Grid>
                <Field label="Street Address">
                  <input value={p.residentialAddress} onChange={e=>set('residentialAddress',e.target.value)} style={inputSt} placeholder="Street number and name"/>
                </Field>
                <Field label="City / Suburb" half>
                  <input value={p.residentialCity} onChange={e=>set('residentialCity',e.target.value)} style={inputSt}/>
                </Field>
                <Field label="Postal Code" half>
                  <input value={p.residentialCode} onChange={e=>set('residentialCode',e.target.value)} style={inputSt}/>
                </Field>
              </Grid>

              <div style={{ margin:'16px 0 12px', display:'flex', alignItems:'center', gap:8 }}>
                <div onClick={()=>set('postalSame',!p.postalSame)} style={{ width:18, height:18, borderRadius:4, background:p.postalSame?T.orange:'#fff', border:`2px solid ${p.postalSame?T.orange:T.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {p.postalSame && <span style={{ color:'#fff', fontSize:11 }}>✓</span>}
                </div>
                <span style={{ fontSize:13, color:T.text }}>Postal address same as residential</span>
              </div>

              {!p.postalSame && (
                <Grid>
                  <Field label="Postal Address">
                    <input value={p.postalAddress} onChange={e=>set('postalAddress',e.target.value)} style={inputSt}/>
                  </Field>
                  <Field label="City" half>
                    <input value={p.postalCity} onChange={e=>set('postalCity',e.target.value)} style={inputSt}/>
                  </Field>
                  <Field label="Code" half>
                    <input value={p.postalCode} onChange={e=>set('postalCode',e.target.value)} style={inputSt}/>
                  </Field>
                </Grid>
              )}
            </div>
          )}

          {/* ── STEP 3: EMPLOYMENT ── */}
          {step.id === 'employment' && (
            <div>
              <SectionTitle icon="💼" title="Employment Details"/>
              <Grid>
                <Field label="Employer">
                  <input value={p.employer} onChange={e=>set('employer',e.target.value)} style={inputSt} readOnly/>
                </Field>
                <Field label="Employee Number">
                  <input value={p.employeeNumber} onChange={e=>set('employeeNumber',e.target.value)} style={inputSt}/>
                </Field>
                <Field label="Payroll Number" required>
                  <input value={p.payrollNumber} onChange={e=>set('payrollNumber',e.target.value)} style={{...inputSt, borderColor:errors.payrollNumber?T.red:undefined}}/>
                  {errors.payrollNumber && <div style={{ fontSize:11, color:T.red, marginTop:3 }}>{errors.payrollNumber}</div>}
                </Field>
                <Field label="Job Title">
                  <input value={p.jobTitle} onChange={e=>set('jobTitle',e.target.value)} style={inputSt}/>
                </Field>
                <Field label="Start Date" required>
                  <input type="date" value={p.startDate} onChange={e=>set('startDate',e.target.value)} style={{...inputSt, borderColor:errors.startDate?T.red:undefined}}/>
                  {errors.startDate && <div style={{ fontSize:11, color:T.red, marginTop:3 }}>{errors.startDate}</div>}
                </Field>
                <Field label="Benefit Category">
                  <select value={p.benefitCategory} onChange={e=>set('benefitCategory',e.target.value)} style={selectSt}>
                    {(benefitProfile?.retirementFund?.contributionCategories||[
                      {category:'Category 1'},{category:'Category 2'},
                      {category:'Category 3'},{category:'Category 4'},
                    ]).map(c=><option key={c.category}>{c.category}</option>)}
                  </select>
                </Field>
                <Field label="Monthly Salary (R)" required>
                  <input type="number" value={p.salary} onChange={e=>set('salary',e.target.value)} style={{...inputSt, borderColor:errors.salary?T.red:undefined}} placeholder="e.g. 15000"/>
                  {errors.salary && <div style={{ fontSize:11, color:T.red, marginTop:3 }}>{errors.salary}</div>}
                </Field>
              </Grid>
            </div>
          )}

          {/* ── STEP 4: BANKING ── */}
          {step.id === 'banking' && (
            <div>
              <SectionTitle icon="🏦" title="Banking Details" subtitle="Required for benefit payments"/>
              <Grid>
                <Field label="Bank Name">
                  <select value={p.bank} onChange={e=>set('bank',e.target.value)} style={selectSt}>
                    <option value="">Select bank</option>
                    {['ABSA','Capitec','FNB','Nedbank','Standard Bank','African Bank','Investec','TymeBank','Discovery Bank','Other'].map(b=><option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Account Type">
                  <select value={p.accountType} onChange={e=>set('accountType',e.target.value)} style={selectSt}>
                    <option>Cheque</option><option>Savings</option><option>Transmission</option>
                  </select>
                </Field>
                <Field label="Account Number">
                  <input value={p.accountNumber} onChange={e=>set('accountNumber',e.target.value)} style={inputSt}/>
                </Field>
                <Field label="Branch Code">
                  <input value={p.branchCode} onChange={e=>set('branchCode',e.target.value)} style={inputSt}/>
                </Field>
              </Grid>
            </div>
          )}

          {/* ── STEP 5: BENEFITS ── */}
          {step.id === 'benefits' && (
            <div>
              <SectionTitle icon="🛡️" title="Benefit Selection" subtitle="Based on Amadwala Employee Benefits benefit structure"/>

              {/* Benefits summary from profile */}
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                {[
                  { key:'retirementFund', icon:'🏦', label:'Igula Umbrella Provident Fund', sub:`Administrator: ${benefitProfile?.retirementFund?.administrator||'Alexander Forbes'} · Fund Code: ${benefitProfile?.retirementFund?.fundCode||'24193-44733'}` },
                  { key:'gla',            icon:'🛡️', label:'Group Life Assurance (Discovery)', sub:`Scheme: ${benefitProfile?.groupLife?.schemeNumber||'6600009630'} · Rate: ${benefitProfile?.groupLife?.rate||1.46}% · Benefit: ${benefitProfile?.groupLife?.benefit||'3× Annual Salary'}` },
                  { key:'phi',            icon:'♿', label:'Income Disability Benefit (PHI)', sub:`Rate: ${benefitProfile?.disability?.rate||1.42}% · Waiting: ${benefitProfile?.disability?.waitingPeriodMonths||3} months · Escalation: ${benefitProfile?.disability?.escalationPercent||5}%` },
                  { key:'medicalAid',     icon:'🏥', label:'Discovery Health Medical Aid', sub:`Scheme: ${benefitProfile?.medicalAid?.schemeNumber||'4342893'} · Billing: ${benefitProfile?.medicalAid?.billingMethod||'Arrears'}` },
                ].map(b => (
                  <div key={b.key} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'14px 16px', background: p[b.key]?'#f0fdf4':'#f9fafb', border:`1.5px solid ${p[b.key]?'#bbf7d0':T.border}`, borderRadius:10 }}>
                    <div onClick={()=>set(b.key,!p[b.key])} style={{ width:22, height:22, borderRadius:6, background:p[b.key]?T.green:'#fff', border:`2px solid ${p[b.key]?T.green:T.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                      {p[b.key] && <span style={{ color:'#fff', fontSize:12, fontWeight:700 }}>✓</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{b.icon} {b.label}</div>
                      <div style={{ fontSize:11, color:T.gray, marginTop:2 }}>{b.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {p.retirementFund && (
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:8 }}>Investment Choice</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                    {['Conservative','Moderate','Aggressive','Default'].map(opt=>(
                      <button key={opt} onClick={()=>set('investmentChoice',opt)}
                        style={{ padding:'10px 8px', borderRadius:8, border:`2px solid ${p.investmentChoice===opt?T.orange:T.border}`, background:p.investmentChoice===opt?T.orangeL:'#fff', fontSize:12, fontWeight:p.investmentChoice===opt?700:400, cursor:'pointer', fontFamily:'inherit', color:p.investmentChoice===opt?T.orange:T.text }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {p.medicalAid && (
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:8 }}>Medical Aid Plan</div>
                  <select value={p.medicalPlan} onChange={e=>set('medicalPlan',e.target.value)} style={selectSt}>
                    <option value="">Select plan</option>
                    {['KeyCare Core','KeyCare Plus','KeyCare Start','Essential Core','Essential Smart','Classic Core','Classic Smart','Classic Comprehensive','Executive'].map(plan=><option key={plan}>{plan}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 6: RF BENEFICIARIES ── */}
          {step.id === 'rf_bene' && (
            <BeneficiaryStep
              title="Retirement Fund Beneficiaries"
              subtitle="Igula Umbrella Provident Fund — Alexander Forbes"
              icon="🏦"
              beneficiaries={p.rfBeneficiaries}
              onChange={benes => set('rfBeneficiaries', benes)}
            />
          )}

          {/* ── STEP 7: RISK BENEFICIARIES ── */}
          {step.id === 'risk_bene' && (
            <BeneficiaryStep
              title="Group Life Beneficiaries"
              subtitle="Discovery Group Risk — stored separately from Retirement Fund beneficiaries"
              icon="🛡️"
              beneficiaries={p.riskBeneficiaries}
              onChange={benes => set('riskBeneficiaries', benes)}
            />
          )}

          {/* ── STEP 8: MEDICAL DEPENDANTS ── */}
          {step.id === 'medical' && (
            <DependantStep
              dependants={p.medicalDependants}
              memberName={`${p.firstName} ${p.surname}`}
              onChange={deps => set('medicalDependants', deps)}
            />
          )}

          {/* ── STEP 9: REVIEW & SIGN ── */}
          {step.id === 'review' && (
            <div>
              <SectionTitle icon="✍️" title="Review & Sign" subtitle="Review all captured information before signing"/>

              <ProfileSummary profile={p} benefitProfile={benefitProfile}/>

              {/* Signature */}
              <div style={{ marginTop:20, background:'#f9fafb', borderRadius:10, padding:16, border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:4 }}>Member Signature</div>
                <div style={{ fontSize:11, color:T.gray, marginBottom:10 }}>
                  By signing below, I confirm that all information captured is correct and I agree to the benefit enrolment.
                </div>
                <div style={{ position:'relative' }}>
                  <canvas ref={sigCanvasRef} width={480} height={120}
                    style={{ border:`2px solid ${hasSig?T.green:T.border}`, borderRadius:8, background:'#fff', cursor:'crosshair', display:'block', touchAction:'none' }}
                    onMouseDown={startSig} onMouseMove={drawSig} onMouseUp={endSig} onMouseLeave={endSig}/>
                  <div style={{ position:'absolute', bottom:8, left:10, fontSize:10, color:'#d1d5db', pointerEvents:'none' }}>
                    {hasSig ? '' : 'Sign here'}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <button onClick={clearSig} style={{ fontSize:11, color:T.gray, background:'none', border:`1px solid ${T.border}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', fontFamily:'inherit' }}>Clear</button>
                  {hasSig && <span style={{ fontSize:11, color:T.green, fontWeight:600 }}>✓ Signature captured</span>}
                </div>
              </div>

              {/* Documents that will be generated */}
              <div style={{ marginTop:16, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.blue, marginBottom:8 }}>Documents that will be generated:</div>
                {[
                  p.retirementFund && '📄 Igula Provident Fund Application',
                  p.retirementFund && '📄 Retirement Fund Beneficiary Nomination Form',
                  p.retirementFund && '📄 Investment Choice Form',
                  p.gla            && '📄 Discovery Group Life Beneficiary Form',
                  p.medicalAid     && '📄 Discovery Health Medical Aid Application',
                  p.medicalAid && p.medicalDependants.length > 0 && '📄 Medical Aid Dependant Addition Forms',
                  '📄 Welcome Pack',
                ].filter(Boolean).map((doc,i) => (
                  <div key={i} style={{ fontSize:12, color:'#374151', marginBottom:4 }}>{doc}</div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 10: COMPLETE ── */}
          {step.id === 'complete' && (
            <div style={{ textAlign:'center', padding:'32px 0' }}>
              <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
              <div style={{ fontSize:22, fontWeight:800, color:T.text, marginBottom:8 }}>Induction Complete</div>
              <div style={{ fontSize:13, color:T.gray, marginBottom:24, lineHeight:1.7 }}>
                {p.firstName} {p.surname} has been successfully enrolled.<br/>
                A welcome pack and signed documents have been emailed to {p.email||'the member'}.<br/>
                A pending billing addition has been created for review.
              </div>
              <div style={{ display:'inline-flex', flexDirection:'column', gap:10, textAlign:'left', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'16px 24px', marginBottom:24 }}>
                {[
                  ['Member',          `${p.firstName} ${p.surname}`],
                  ['ID Number',       p.idNumber],
                  ['Employer',        p.employer],
                  ['Category',        p.benefitCategory],
                  ['Start Date',      p.startDate],
                  ['Benefits',        [p.retirementFund&&'Provident Fund', p.gla&&'GLA', p.phi&&'PHI', p.medicalAid&&'Medical Aid'].filter(Boolean).join(' · ')],
                ].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', gap:16 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase', width:90, flexShrink:0 }}>{k}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{ padding:'14px 24px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, background:'#fafafa' }}>
          <div style={{ fontSize:11, color:T.gray }}>Step {stepIdx+1} of {STEPS.length}</div>
          <div style={{ display:'flex', gap:8 }}>
            {stepIdx > 0 && stepIdx < STEPS.length-1 && (
              <button onClick={back} style={{ padding:'9px 18px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:T.text }}>← Back</button>
            )}
            {step.id === 'review' && (
              <button onClick={()=>{ if(hasSig){setSigned(true);setStepIdx(STEPS.length-1);handleComplete()} else alert('Please sign before completing.') }}
                disabled={sending}
                style={{ padding:'9px 22px', background:T.green, border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:sending?0.7:1 }}>
                {sending ? 'Sending…' : '✓ Complete & Sign'}
              </button>
            )}
            {step.id !== 'review' && step.id !== 'complete' && (
              <button onClick={next} style={{ padding:'9px 22px', background:T.orange, border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Next →
              </button>
            )}
            {step.id === 'complete' && (
              <button onClick={onClose} style={{ padding:'9px 22px', background:T.navy, border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}

// ─── BENEFICIARY STEP ─────────────────────────────────────────────────────────
function BeneficiaryStep({ title, subtitle, icon, beneficiaries, onChange }) {
  function add()      { onChange([...beneficiaries, {...EMPTY_BENE}]) }
  function remove(i)  { onChange(beneficiaries.filter((_,j)=>j!==i)) }
  function update(i,k,v) { const b=[...beneficiaries]; b[i]={...b[i],[k]:v}; onChange(b) }

  const totalPct = beneficiaries.reduce((s,b)=>s+(parseFloat(b.percentage)||0),0)

  return (
    <div>
      <SectionTitle icon={icon} title={title} subtitle={subtitle}/>

      {beneficiaries.length === 0 ? (
        <div style={{ textAlign:'center', padding:24, color:T.gray, border:`2px dashed ${T.border}`, borderRadius:10, marginBottom:16 }}>
          No beneficiaries added yet. Click below to add.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
          {beneficiaries.map((b,i) => (
            <div key={i} style={{ background:'#f9fafb', borderRadius:10, padding:14, border:`1px solid ${T.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.text }}>Beneficiary {i+1}</div>
                <button onClick={()=>remove(i)} style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:6, padding:'3px 9px', fontSize:11, color:T.red, cursor:'pointer', fontFamily:'inherit' }}>Remove</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  ['name','First Name'], ['surname','Surname'],
                  ['relationship','Relationship'], ['dob','Date of Birth'],
                  ['phone','Contact Number'], ['percentage','Allocation %'],
                ].map(([k,lbl]) => (
                  <div key={k}>
                    <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:4 }}>{lbl}</label>
                    {k==='relationship' ? (
                      <select value={b[k]} onChange={e=>update(i,k,e.target.value)} style={selectSt}>
                        <option value="">Select</option>
                        {['Spouse','Child','Parent','Sibling','Other'].map(r=><option key={r}>{r}</option>)}
                      </select>
                    ) : k==='dob' ? (
                      <input type="date" value={b[k]} onChange={e=>update(i,k,e.target.value)} style={inputSt}/>
                    ) : (
                      <input value={b[k]} onChange={e=>update(i,k,e.target.value)} style={inputSt} placeholder={k==='percentage'?'e.g. 50':''}/>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {beneficiaries.length > 0 && (
        <div style={{ marginBottom:12, padding:'8px 12px', background: totalPct===100?'#f0fdf4':'#fffbeb', border:`1px solid ${totalPct===100?'#bbf7d0':'#fde68a'}`, borderRadius:8, fontSize:12, fontWeight:700, color:totalPct===100?T.green:'#92400e' }}>
          Total allocation: {totalPct}% {totalPct===100?'✓ — correctly allocated':'— must total 100%'}
        </div>
      )}

      <button onClick={add} style={{ padding:'9px 18px', background:'#fff', border:`2px dashed ${T.orange}`, borderRadius:8, color:T.orange, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', width:'100%' }}>
        + Add Beneficiary
      </button>
    </div>
  )
}

// ─── DEPENDANT STEP ───────────────────────────────────────────────────────────
function DependantStep({ dependants, memberName, onChange }) {
  function add()      { onChange([...dependants, {...EMPTY_DEP}]) }
  function remove(i)  { onChange(dependants.filter((_,j)=>j!==i)) }
  function update(i,k,v) { const d=[...dependants]; d[i]={...d[i],[k]:v}; onChange(d) }

  return (
    <div>
      <SectionTitle icon="🏥" title="Medical Aid Dependants" subtitle="Discovery Health — add spouse, children and adult dependants"/>

      {/* Main member */}
      <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'10px 14px', marginBottom:16, display:'flex', gap:10, alignItems:'center' }}>
        <span style={{ fontSize:20 }}>👤</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:T.blue }}>{memberName} — Main Member</div>
          <div style={{ fontSize:11, color:T.gray }}>Automatically included as main member</div>
        </div>
      </div>

      {dependants.map((d,i) => (
        <div key={i} style={{ background:'#f9fafb', borderRadius:10, padding:14, border:`1px solid ${T.border}`, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.text }}>Dependant {i+1}</div>
            <button onClick={()=>remove(i)} style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:6, padding:'3px 9px', fontSize:11, color:T.red, cursor:'pointer', fontFamily:'inherit' }}>Remove</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              ['name','First Name'],['surname','Surname'],
              ['idNumber','ID Number'],['dob','Date of Birth'],
            ].map(([k,lbl]) => (
              <div key={k}>
                <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:4 }}>{lbl}</label>
                {k==='dob'
                  ? <input type="date" value={d[k]} onChange={e=>update(i,k,e.target.value)} style={inputSt}/>
                  : <input value={d[k]} onChange={e=>update(i,k,e.target.value)} style={inputSt}/>
                }
              </div>
            ))}
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:4 }}>Relationship</label>
              <select value={d.relationship} onChange={e=>update(i,'relationship',e.target.value)} style={selectSt}>
                <option value="">Select</option>
                {['Spouse','Child','Adult Dependant','Life Partner'].map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}

      <button onClick={add} style={{ padding:'9px 18px', background:'#fff', border:`2px dashed ${T.blue}`, borderRadius:8, color:T.blue, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', width:'100%' }}>
        + Add Dependant
      </button>
    </div>
  )
}

// ─── PROFILE SUMMARY ─────────────────────────────────────────────────────────
function ProfileSummary({ profile: p, benefitProfile }) {
  const sections = [
    { title:'Personal', fields:[['Name',`${p.firstName} ${p.surname}`],['ID Number',p.idNumber],['Date of Birth',p.dateOfBirth],['Gender',p.gender],['Marital Status',p.maritalStatus]] },
    { title:'Contact',  fields:[['Mobile',p.mobile],['Email',p.email],['Address',p.residentialAddress?`${p.residentialAddress}, ${p.residentialCity}`:'']] },
    { title:'Employment',fields:[['Employer',p.employer],['Payroll No.',p.payrollNumber],['Job Title',p.jobTitle],['Start Date',p.startDate],['Salary',p.salary?`R${Number(p.salary).toLocaleString()}/mo`:''],['Category',p.benefitCategory]] },
    { title:'Banking',  fields:[['Bank',p.bank],['Account No.',p.accountNumber],['Account Type',p.accountType]] },
    { title:'Benefits', fields:[['Provident Fund',p.retirementFund?'✓ Enrolled':'Not enrolled'],['GLA',p.gla?'✓ Enrolled':'Not enrolled'],['PHI',p.phi?'✓ Enrolled':'Not enrolled'],['Medical Aid',p.medicalAid?`✓ ${p.medicalPlan||'Plan TBD'}`:'Not enrolled'],['Investment',p.investmentChoice]] },
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {sections.map(s=>(
        <div key={s.title} style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:9, overflow:'hidden' }}>
          <div style={{ padding:'8px 14px', background:'#f9fafb', borderBottom:`1px solid ${T.border}`, fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>{s.title}</div>
          <div style={{ padding:'10px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {s.fields.filter(([,v])=>v).map(([k,v])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.gray, fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>{k}</div>
                <div style={{ fontSize:12, fontWeight:500, color:T.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {p.rfBeneficiaries.length>0 && (
        <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:9, overflow:'hidden' }}>
          <div style={{ padding:'8px 14px', background:'#f9fafb', borderBottom:`1px solid ${T.border}`, fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>RF Beneficiaries ({p.rfBeneficiaries.length})</div>
          <div style={{ padding:'10px 14px' }}>
            {p.rfBeneficiaries.map((b,i)=><div key={i} style={{ fontSize:12, marginBottom:3 }}>{b.name} {b.surname} — {b.relationship} — {b.percentage}%</div>)}
          </div>
        </div>
      )}
      {p.medicalDependants.length>0 && (
        <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:9, overflow:'hidden' }}>
          <div style={{ padding:'8px 14px', background:'#f9fafb', borderBottom:`1px solid ${T.border}`, fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>Medical Dependants ({p.medicalDependants.length})</div>
          <div style={{ padding:'10px 14px' }}>
            {p.medicalDependants.map((d,i)=><div key={i} style={{ fontSize:12, marginBottom:3 }}>{d.name} {d.surname} — {d.relationship}</div>)}
          </div>
        </div>
      )}
    </div>
  )
}
