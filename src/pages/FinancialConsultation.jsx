import { useState, useRef, useMemo, useEffect } from 'react'
import { T } from '../data.js'
import { inputSt, selectSt } from '../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// FINANCIAL CONSULTATION WIZARD
//
// Guided consultation that launches from a New Employee case.
// Pre-loads employer benefit structure automatically.
// Walks adviser through a structured consultation in steps.
//
// Steps:
//   1. Member Profile      — pre-filled from case, adviser confirms
//   2. Employer Benefits   — auto-loaded, displayed for adviser
//   3. Contribution Calc   — auto-calculated, UW check
//   4. Financial Journey   — existing assets, cover, savings
//   5. Retirement Plan     — projection, funding ratio, gap
//   6. Adviser Insights    — auto-generated recommendations
//   7. Actions & Sign-off  — tasks created, consultation recorded
// ═════════════════════════════════════════════════════════════════════════════

const STEPS = [
  { id:'profile',      label:'Member Profile',     icon:'👤' },
  { id:'benefits',     label:'Employer Benefits',  icon:'🏢' },
  { id:'contributions',label:'Contributions',      icon:'💰' },
  { id:'journey',      label:'Financial Journey',  icon:'🗺️' },
  { id:'projection',   label:'Retirement Plan',    icon:'📈' },
  { id:'insights',     label:'Adviser Insights',   icon:'💡' },
  { id:'actions',      label:'Actions & Sign-off', icon:'✅' },
]

// ─── CALCULATION ENGINE ───────────────────────────────────────────────────────
function calcAgeFromDOB(dob) {
  if (!dob) return null
  const diff = new Date() - new Date(dob)
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

function calcAgeFromId(id) {
  if (!id || id.length < 6) return null
  const yy = parseInt(id.slice(0,2))
  const mm = parseInt(id.slice(2,4))
  const dd = parseInt(id.slice(4,6))
  const cy = new Date().getFullYear()
  const fy = yy > (cy % 100) ? 1900+yy : 2000+yy
  return calcAgeFromDOB(`${fy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`)
}

function calcContributions(salary, profile, category) {
  const cats   = profile?.retirementFund?.contributionCategories || []
  const cat    = cats.find(c=>c.category===category) || cats[0] || {employer:5,employee:5}
  const gla    = salary * ((profile?.groupLife?.rate||0)/100)
  const phi    = salary * ((profile?.disability?.rate||0)/100)
  const admin  = profile?.retirementFund?.administrationCost || 0
  const empRF  = salary * (cat.employer/100)
  const eeeRF  = salary * (cat.employee/100)
  const total  = empRF + eeeRF
  const risk   = gla + phi
  const net    = Math.max(total - risk - admin, 0)
  return { empRF, eeeRF, total, gla, phi, risk, admin, net, empPct:cat.employer, eeePct:cat.employee }
}

function calcUW(salary, profile) {
  const fcl      = profile?.groupLife?.freeCoverLimit || 0
  const benefit  = profile?.groupLife?.benefit || '3'
  const multiple = parseFloat(benefit.match(/[\d.]+/)?.[0]||3)
  const annual   = salary * 12
  const glaAmt   = annual * multiple
  return { fcl, glaAmt, required: fcl>0 && glaAmt>fcl, multiple }
}

function projectFund(age, retAge, salary, monthlyContrib, existingFunds, assumptions) {
  const years   = retAge - age
  if (years <= 0) return null
  const mRate   = assumptions.growth / 100 / 12
  const months  = years * 12

  // Existing funds FV
  const existFV = existingFunds.reduce((s,f) => s + (f.value||0)*Math.pow(1+assumptions.growth/100,years), 0)

  // Ongoing contributions FV with salary escalation
  let fv = 0, contrib = monthlyContrib
  for (let m=0; m<months; m++) {
    fv = (fv + contrib) * (1 + mRate)
    if (m%12===11) contrib *= (1+assumptions.escalation/100)
  }

  const total        = fv + existFV
  const inflFactor   = Math.pow(1+assumptions.inflation/100, years)
  const todayVal     = total / inflFactor
  const monthlyInc   = (todayVal * assumptions.drawdown/100) / 12
  const finalSalary  = salary * Math.pow(1+assumptions.escalation/100, years)
  const targetInc    = salary * (assumptions.targetPct/100)
  const fundingRatio = targetInc>0 ? (monthlyInc/targetInc)*100 : 0
  const gap          = Math.max(targetInc - monthlyInc, 0)

  return { years, total, existFV, ongoingFV:fv, todayVal, monthlyInc, finalSalary, targetInc, fundingRatio, gap, annualGap:gap*12 }
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const R = (v,d=0) => v!=null ? 'R'+Number(v).toLocaleString('en-ZA',{minimumFractionDigits:d,maximumFractionDigits:d}) : '—'
const Pct = v => v!=null ? Number(v).toFixed(1)+'%' : '—'

function Row({label, value, bold, color, sub}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'8px 0',borderBottom:'1px solid #f3f4f6'}}>
      <div>
        <span style={{fontSize:13,color:T.gray}}>{label}</span>
        {sub && <div style={{fontSize:10,color:'#9ca3af'}}>{sub}</div>}
      </div>
      <span style={{fontSize:bold?15:13,fontWeight:bold?800:600,color:color||T.text,fontFamily:'monospace'}}>{value}</span>
    </div>
  )
}

function Card({title, color=T.blue, children}) {
  return (
    <div style={{background:'#fff',borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden',marginBottom:14}}>
      <div style={{padding:'10px 16px',borderBottom:`1px solid ${T.border}`,background:`linear-gradient(90deg,${color}08,transparent)`,fontSize:11,fontWeight:700,color,textTransform:'uppercase',letterSpacing:'0.5px'}}>{title}</div>
      <div style={{padding:'14px 16px'}}>{children}</div>
    </div>
  )
}

function Field({label, children, required}) {
  return (
    <div>
      <label style={{fontSize:10,fontWeight:700,color:T.gray,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:5}}>
        {label}{required&&<span style={{color:T.red}}> *</span>}
      </label>
      {children}
    </div>
  )
}

function G2({children}) { return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{children}</div> }

function Insight({text, type}) {
  const c = {warning:{bg:'#fff7ed',color:'#c2410c',border:'#fed7aa'},danger:{bg:'#fff1f2',color:'#be123c',border:'#fecaca'},success:{bg:'#f0fdf4',color:'#15803d',border:'#bbf7d0'},info:{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'}}[type]||{bg:'#f9fafb',color:T.gray,border:T.border}
  return <div style={{padding:'10px 14px',background:c.bg,border:`1px solid ${c.border}`,borderRadius:9,marginBottom:8,fontSize:13,color:c.color,lineHeight:1.6}}>{text}</div>
}

// Discovery-style dual ring: dark goal track + pink/green progress arc,
// projected income and income goal in the centre
function GoalRing({ projected, goal, planActive, size=210 }) {
  const pct  = goal>0 ? Math.min(projected/goal, 1) : 0
  const met  = pct >= 0.999
  const r    = size*0.39, sw = size*0.062, circ = 2*Math.PI*r
  const arc  = circ * pct
  const clr  = met ? '#059669' : '#e8536f'
  const big  = size >= 190
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center', width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e9edf3" strokeWidth={sw}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e3a5f" strokeWidth={sw}
            strokeDasharray={`${circ} ${circ}`} opacity="0.18"/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={clr} strokeWidth={sw}
            strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
            style={{ transition:'stroke-dasharray .7s ease, stroke .4s ease' }}/>
        </svg>
        <div style={{ position:'absolute', textAlign:'center' }}>
          <div style={{ fontSize:big?11:9, color:'#6b7280', marginBottom:1 }}>Projected Income</div>
          <div style={{ fontSize:big?24:16, fontWeight:900, color:'#1e5fd9', lineHeight:1.15 }}>{R(projected)}</div>
          <div style={{ fontSize:big?10.5:8.5, color:'#6b7280', marginTop:big?5:3 }}>Income Goal</div>
          <div style={{ fontSize:big?14:11, fontWeight:700, color:'#1e3a5f' }}>{R(goal)}</div>
          {planActive && <div style={{ fontSize:big?9:8, fontWeight:700, color:'#059669', marginTop:3, textTransform:'uppercase', letterSpacing:'0.5px' }}>Plan applied</div>}
        </div>
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:clr, marginTop:2 }}>
        {met ? 'On track to meet your goal' : `${Math.round(pct*100)}% of income goal`}
      </div>
    </div>
  )
}

function FundingGauge({ratio}) {
  const clr = ratio>=90?'#059669':ratio>=70?'#d97706':'#dc2626'
  const lbl = ratio>=90?'On Track':ratio>=70?'Needs Attention':'Behind Target'
  const pct = Math.min(ratio,100)
  const r=50, circ=2*Math.PI*r
  return (
    <div style={{textAlign:'center'}}>
      <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',width:130,height:130}}>
        <svg width="130" height="130" style={{transform:'rotate(-90deg)'}}>
          <circle cx="65" cy="65" r={r} fill="none" stroke="#f3f4f6" strokeWidth="14"/>
          <circle cx="65" cy="65" r={r} fill="none" stroke={clr} strokeWidth="14"
            strokeDasharray={`${circ*pct/100} ${circ}`} strokeLinecap="round"
            style={{transition:'stroke-dasharray .6s ease'}}/>
        </svg>
        <div style={{position:'absolute',textAlign:'center'}}>
          <div style={{fontSize:24,fontWeight:900,color:clr}}>{Math.round(ratio)}%</div>
        </div>
      </div>
      <div style={{fontSize:13,fontWeight:700,color:clr}}>{lbl}</div>
      <div style={{fontSize:11,color:T.gray}}>Funding Ratio</div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN WIZARD
// ═════════════════════════════════════════════════════════════════════════════
export default function FinancialConsultation({ caseData, employer, benefitProfile, currentUser, onComplete, onClose }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [saved, setSaved]     = useState(false)

  // ── MEMBER PROFILE ────────────────────────────────────────────────────────
  const [member, setMember] = useState({
    firstName:  caseData?.memberName?.split(' ')[0] || '',
    surname:    caseData?.memberName?.split(' ').slice(1).join(' ') || '',
    idNumber:   caseData?.memberId || '',
    dob:        '',
    salary:     '',
    category:   caseData?.benefitCategory || benefitProfile?.retirementFund?.contributionCategories?.[0]?.category || 'Category 1',
    startDate:  caseData?.created || new Date().toISOString().split('T')[0],
    department: '',
  })

  // ── FINANCIAL JOURNEY ────────────────────────────────────────────────────
  const [journey, setJourney] = useState({
    hasPrevFund:    false, prevFundValue:   0,
    hasPreservation:false, preservationValue:0,
    hasRA:          false, raValue:         0,
    hasTFSA:        false, tfsaValue:       0,
    hasLifeCover:   false, lifeCoverAmount: 0,
    hasDisabilityCover: false,
    additionalNotes:'',
  })

  // ── ASSUMPTIONS ──────────────────────────────────────────────────────────
  const [assumptions, setAssumptions] = useState({
    growth:9.0, escalation:5.5, inflation:5.0, drawdown:5.0, targetPct:75
  })

  // Discovery-style journey: income goal in Rands + selected contribution plan
  const [incomeGoal, setIncomeGoal]   = useState(null)   // null → derive from targetPct
  const [selectedPlan, setSelPlan]    = useState(null)
  const [journeyPhase, setPhase]      = useState(1)      // 1 goal · 2 tracking · 3 plans

  // ── ACTIONS ──────────────────────────────────────────────────────────────
  const [actions, setActions] = useState([])
  const [adviserNotes, setNotes] = useState('')
  const [consultComplete, setConsultComplete] = useState(false)

  const step = STEPS[stepIdx]

  // Derived values
  const age        = calcAgeFromId(member.idNumber) || calcAgeFromDOB(member.dob)
  const ageForCalc = age || 30  // Default to 30 if age unknown
  const retAge     = benefitProfile?.retirementFund?.normalRetirementAge || benefitProfile?.retirementAge || 65
  const salaryNum  = parseFloat(String(member.salary).replace(/[^0-9.]/g,'')) || 0

  // Debug log on every render so we can trace the data flow
  if (salaryNum > 0) {
    console.log('[FC] salary:', salaryNum, '| age:', age, '| ageForCalc:', ageForCalc, '| retAge:', retAge, '| step:', stepIdx)
  }

  const contribs   = salaryNum>0 ? calcContributions(salaryNum, benefitProfile, member.category) : null
  const uw         = salaryNum>0 ? calcUW(salaryNum, benefitProfile) : null

  const existingFunds = [
    journey.hasPrevFund     && {label:'Previous Employer Fund',  value:journey.prevFundValue},
    journey.hasPreservation && {label:'Preservation Fund',       value:journey.preservationValue},
    journey.hasRA           && {label:'Retirement Annuity',      value:journey.raValue},
    journey.hasTFSA         && {label:'Tax Free Savings',        value:journey.tfsaValue},
  ].filter(Boolean)

  const projection = (salaryNum>0 && contribs)
    ? projectFund(ageForCalc, retAge, salaryNum, contribs.net, existingFunds, assumptions)
    : null

  // ── DISCOVERY-STYLE JOURNEY ENGINE ────────────────────────────────────────
  // Effective income goal in today's Rands
  const effectiveGoal = incomeGoal ?? (salaryNum>0 ? salaryNum*(assumptions.targetPct/100) : 0)

  // Project with a contribution plan: +extraPct of salary per year for planYears,
  // on top of existing contributions, applied on salary-increase dates
  function projectPlan(extraPct, planYears, delayRet=0) {
    if (!(salaryNum>0) || !contribs) return null
    const years = (retAge+delayRet) - ageForCalc
    if (years<=0) return null
    const mRate   = assumptions.growth/100/12
    const basePct = contribs.net / salaryNum
    let salary = salaryNum, extra = 0, fv = 0
    for (let m=0; m<years*12; m++) {
      fv = (fv + salary*(basePct+extra)) * (1+mRate)
      if (m%12===11) {
        salary *= (1+assumptions.escalation/100)
        if ((m+1)/12 <= planYears) extra += extraPct/100
      }
    }
    const existFV  = existingFunds.reduce((s,f)=>s+(f.value||0)*Math.pow(1+assumptions.growth/100,years),0)
    const total    = fv + existFV
    const todayVal = total / Math.pow(1+assumptions.inflation/100,years)
    const monthlyInc = todayVal*assumptions.drawdown/100/12
    return { total, todayVal, monthlyInc, extraPct, planYears, delayRet }
  }

  // Tailored plans (Discovery Contribution Optimiser model)
  const plans = useMemo(() => {
    if (!projection) return []
    return [
      { id:'p1', label:'1% per year, for 5 years',  sub:'Gentle increase on salary increase dates',  ...(projectPlan(1,5)||{}) },
      { id:'p2', label:'2% per year, for 7 years',  sub:'Steady increase on salary increase dates',  ...(projectPlan(2,7)||{}) },
      { id:'p3', label:'4% per year, for 4 years',  sub:'Accelerated catch-up',                       ...(projectPlan(4,4)||{}) },
      { id:'p4', label:`Retire at ${retAge+2}`,      sub:'Work 2 more years, same contributions',     ...(projectPlan(0,0,2)||{}) },
    ].filter(p=>p.monthlyInc)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection, assumptions, existingFunds, salaryNum, retAge])

  const activePlan      = plans.find(p=>p.id===selectedPlan)
  const displayedIncome = activePlan ? activePlan.monthlyInc : (projection?.monthlyInc||0)

  // Auto-generate insights
  const insights = useMemo(() => {
    const list = []
    if (!projection) return list
    if (projection.fundingRatio>=90)    list.push({text:`${member.firstName} is on track to replace ${Math.round(projection.fundingRatio)}% of salary at retirement.`, type:'success'})
    if (projection.fundingRatio<90&&projection.fundingRatio>=70) list.push({text:`${member.firstName} is projected to replace ${Math.round(projection.fundingRatio)}% of the target income. Consider increasing voluntary contributions.`, type:'warning'})
    if (projection.fundingRatio<70)     list.push({text:`${member.firstName} is projected to replace only ${Math.round(projection.fundingRatio)}% of the target income. Immediate retirement planning action is recommended.`, type:'danger'})
    if (projection.gap>0)               list.push({text:`Monthly income shortfall of ${R(projection.gap)} in today's money. Annual shortfall: ${R(projection.annualGap)}.`, type:'warning'})
    if (uw?.required)                   list.push({text:`Medical underwriting required — GLA benefit of ${R(uw.glaAmt)} exceeds the free cover limit of ${R(uw.fcl)}.`, type:'danger'})
    if (journey.hasPrevFund)            list.push({text:`Previous employer retirement fund valued at ${R(journey.prevFundValue)} should be reviewed for transfer or preservation.`, type:'info'})
    if (!journey.hasPrevFund&&existingFunds.length===0) list.push({text:`No previous retirement savings captured. This may be ${member.firstName}'s first retirement fund.`, type:'info'})
    if (projection.years<10)            list.push({text:`Fewer than 10 years to retirement. A preservation and drawdown strategy should be discussed urgently.`, type:'danger'})
    list.push({text:`Beneficiary nomination for retirement fund must be completed. Adviser to assist with Section 37C nomination.`, type:'info'})
    list.push({text:`Schedule 12-month annual review to track progress and update salary.`, type:'info'})
    return list
  }, [projection, uw, journey, member.firstName, existingFunds.length])

  // Auto-add UW action when detected (must run in effect, not during render)
  const uwActionAdded = useRef(false)
  useEffect(() => {
    if (uw?.required && !uwActionAdded.current && stepIdx >= 2) {
      uwActionAdded.current = true
      setActions(prev => prev.find(a=>a.type==='Medical Underwriting') ? prev : [...prev, {
        id: crypto.randomUUID(), type:'Medical Underwriting', priority:'High',
        note:'GLA benefit exceeds free cover limit', status:'Pending', created:new Date().toISOString().split('T')[0]
      }])
    }
  }, [uw?.required, stepIdx])

  function addAction(type, note='') {
    if (actions.find(a=>a.type===type)) return
    setActions(prev=>[...prev,{id:crypto.randomUUID(),type,priority:'Medium',note,status:'Pending',created:new Date().toISOString().split('T')[0]}])
  }

  function removeAction(id) { setActions(prev=>prev.filter(a=>a.id!==id)) }

  function next() { setStepIdx(i=>Math.min(i+1,STEPS.length-1)) }
  function back() { setStepIdx(i=>Math.max(i-1,0)) }

  function completeConsultation() {
    setConsultComplete(true)
    if (onComplete) onComplete({ member, journey, projection, insights, actions, adviserNotes, incomeGoal: effectiveGoal, selectedPlan: activePlan?.label || null })
  }

  const cats = benefitProfile?.retirementFund?.contributionCategories||[]
  const pct  = Math.round((stepIdx/(STEPS.length-1))*100)

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:600,display:'flex',alignItems:'stretch',justifyContent:'flex-end'}}>
      <div style={{width:'min(920px,100vw)',height:'100vh',background:'#f8f9fb',display:'flex',flexDirection:'column',boxShadow:'-12px 0 48px rgba(0,0,0,0.2)',animation:'slideInRight .25s ease'}}>

        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${T.navy},#1a3a6b)`,padding:'16px 24px',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:3}}>Financial Consultation</div>
              <div style={{fontSize:18,fontWeight:900,color:'#fff',marginBottom:2}}>
                {member.firstName||'Member'} {member.surname} {age?`· Age ${age}`:''}
              </div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>
                {employer?.name} · Case {caseData?.ref} · Adviser: {currentUser?.name}
              </div>
            </div>
            <button onClick={onClose} style={{width:34,height:34,background:'rgba(255,255,255,0.1)',border:'none',borderRadius:8,cursor:'pointer',color:'#fff',fontSize:18}}>×</button>
          </div>

          {/* Step indicators */}
          <div style={{display:'flex',gap:3,alignItems:'center',marginBottom:8}}>
            {STEPS.map((s,i)=>(
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:3}}>
                <div onClick={()=>i<stepIdx&&setStepIdx(i)}
                  style={{width:22,height:22,borderRadius:'50%',background:i<stepIdx?'#059669':i===stepIdx?T.orange:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',cursor:i<stepIdx?'pointer':'default',flexShrink:0,transition:'all .2s'}}>
                  {i<stepIdx?'✓':i+1}
                </div>
                {i<STEPS.length-1&&<div style={{width:14,height:2,background:i<stepIdx?'#059669':'rgba(255,255,255,0.15)',borderRadius:1}}/>}
              </div>
            ))}
            <div style={{marginLeft:8,fontSize:11,color:'rgba(255,255,255,0.5)'}}>Step {stepIdx+1} of {STEPS.length} — {step.icon} {step.label}</div>
          </div>

          {/* Progress bar */}
          <div style={{height:3,background:'rgba(255,255,255,0.15)',borderRadius:2,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${pct}%`,background:T.orange,borderRadius:2,transition:'width .3s ease'}}/>
          </div>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:20}}>

          {/* ── STEP 1: MEMBER PROFILE ── */}
          {step.id==='profile' && (
            <div>
              <Card title="Member Profile" color={T.blue}>
                <G2>
                  <Field label="First Name" required>
                    <input value={member.firstName} onChange={e=>setMember(m=>({...m,firstName:e.target.value}))} style={inputSt}/>
                  </Field>
                  <Field label="Surname" required>
                    <input value={member.surname} onChange={e=>setMember(m=>({...m,surname:e.target.value}))} style={inputSt}/>
                  </Field>
                  <Field label="ID Number">
                    <input value={member.idNumber} onChange={e=>setMember(m=>({...m,idNumber:e.target.value}))} style={inputSt} placeholder="13-digit SA ID"/>
                  </Field>
                  <Field label="Date of Birth">
                    <input type="date" value={member.dob} onChange={e=>setMember(m=>({...m,dob:e.target.value}))} style={inputSt}/>
                  </Field>
                  <Field label="Department">
                    <input value={member.department} onChange={e=>setMember(m=>({...m,department:e.target.value}))} style={inputSt}/>
                  </Field>
                  <Field label="Start Date">
                    <input type="date" value={member.startDate} onChange={e=>setMember(m=>({...m,startDate:e.target.value}))} style={inputSt}/>
                  </Field>
                  <Field label="Monthly Salary (R)" required>
                    <div style={{position:'relative'}}>
                      <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:12,fontWeight:700,color:T.gray}}>R</span>
                      <input type="number" value={member.salary} onChange={e=>setMember(m=>({...m,salary:e.target.value}))} style={{...inputSt,paddingLeft:24}} placeholder="e.g. 10000"/>
                    </div>
                  </Field>
                  <Field label="Benefit Category">
                    <select value={member.category} onChange={e=>setMember(m=>({...m,category:e.target.value}))} style={selectSt}>
                      {cats.length>0 ? cats.map(c=><option key={c.category}>{c.category}</option>)
                        : ['Category 1','Category 2','Category 3','Category 4'].map(c=><option key={c}>{c}</option>)}
                    </select>
                  </Field>
                </G2>
              </Card>
              {age && (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:9,padding:'10px 14px',fontSize:13,color:'#059669',fontWeight:600}}>
                  ✓ Member age calculated from ID: {age} years old · {retAge-age} years to retirement at age {retAge}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: EMPLOYER BENEFITS ── */}
          {step.id==='benefits' && (
            <div>
              <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:9,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#374151'}}>
                Benefits automatically loaded from <strong>{employer?.name}</strong> inhouse pack.
              </div>
              <Card title="Retirement Fund" color={T.blue}>
                <Row label="Fund Name"      value={benefitProfile?.retirementFund?.name||'—'}/>
                <Row label="Administrator"  value={benefitProfile?.retirementFund?.administrator||'—'}/>
                <Row label="Fund Code"      value={benefitProfile?.retirementFund?.fundCode||'—'}/>
                <Row label="Retirement Age" value={`Age ${retAge}`}/>
                {cats.map(c=><Row key={c.category} label={c.category} value={`Employer ${c.employer}% / Employee ${c.employee}%`}/>)}
              </Card>
              <Card title="Group Life & Disability" color='#059669'>
                <Row label="GLA Administrator" value={benefitProfile?.groupLife?.administrator||'—'}/>
                <Row label="GLA Benefit"       value={benefitProfile?.groupLife?.benefit||'—'}/>
                <Row label="GLA Rate"          value={Pct(benefitProfile?.groupLife?.rate)}/>
                <Row label="Free Cover Limit"  value={R(benefitProfile?.groupLife?.freeCoverLimit)} bold color={T.orange}/>
                <Row label="PHI Rate"          value={Pct(benefitProfile?.disability?.rate)}/>
                <Row label="PHI Waiting Period" value={`${benefitProfile?.disability?.waitingPeriodMonths||3} months`}/>
              </Card>
              <Card title="Medical Aid" color={T.red}>
                <Row label="Scheme"        value={benefitProfile?.medicalAid?.scheme||'—'}/>
                <Row label="Scheme Number" value={benefitProfile?.medicalAid?.schemeNumber||'—'}/>
                <Row label="Billing"       value={benefitProfile?.medicalAid?.billingMethod||'—'}/>
              </Card>
            </div>
          )}

          {/* ── STEP 3: CONTRIBUTIONS ── */}
          {step.id==='contributions' && (
            <div>
              {!salaryNum ? (
                <div style={{textAlign:'center',padding:40,color:T.gray}}>
                  <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:6}}>Salary not entered</div>
                  <div style={{fontSize:12}}>Go back to Step 1 and enter the member's monthly salary.</div>
                </div>
              ) : (
                <>
                  <Card title="Monthly Contribution Breakdown" color='#059669'>
                    <Row label="Monthly Salary" value={R(salaryNum)} bold/>
                    <div style={{height:6}}/>
                    <Row label={`Employer Retirement Contribution (${contribs.empPct}%)`} value={R(contribs.empRF)} color={T.blue}/>
                    <Row label={`Employee Retirement Contribution (${contribs.eeePct}%)`} value={R(contribs.eeeRF)} color={T.orange}/>
                    <Row label="Total Retirement Contribution" value={R(contribs.total)} bold/>
                    <div style={{height:6}}/>
                    <Row label={`Group Life Premium (${Pct(benefitProfile?.groupLife?.rate)})`} value={`-${R(contribs.gla)}`} color={T.red}/>
                    <Row label={`PHI Premium (${Pct(benefitProfile?.disability?.rate)})`}      value={`-${R(contribs.phi)}`} color={T.red}/>
                    <Row label="Administration Cost" value={`-${R(contribs.admin)}`} color={T.gray}/>
                    <div style={{height:8,borderTop:`2px solid ${T.border}`,margin:'8px 0'}}/>
                    <Row label="Net Monthly Investment into Retirement Fund" value={R(contribs.net)} bold color='#059669'/>
                  </Card>

                  {/* UW Check */}
                  <Card title="Free Cover Limit Check" color={uw.required?T.red:'#059669'}>
                    <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                      <div style={{width:44,height:44,borderRadius:'50%',background:uw.required?'#fff1f2':'#f0fdf4',border:`2px solid ${uw.required?T.red:'#059669'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:uw.required?T.red:'#059669',flexShrink:0}}>
                        {uw.required?'!':'✓'}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700,color:uw.required?T.red:'#059669',marginBottom:8}}>
                          {uw.required?'Medical Underwriting Required':'Within Free Cover Limit — No Underwriting Required'}
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                          <div><div style={{fontSize:10,color:T.gray,textTransform:'uppercase',marginBottom:2}}>Annual Salary</div><div style={{fontSize:14,fontWeight:700}}>{R(salaryNum*12)}</div></div>
                          <div><div style={{fontSize:10,color:T.gray,textTransform:'uppercase',marginBottom:2}}>GLA Benefit ({uw.multiple}×)</div><div style={{fontSize:14,fontWeight:700}}>{R(uw.glaAmt)}</div></div>
                          <div><div style={{fontSize:10,color:T.gray,textTransform:'uppercase',marginBottom:2}}>Free Cover Limit</div><div style={{fontSize:14,fontWeight:700,color:T.orange}}>{R(uw.fcl)}</div></div>
                        </div>
                        {uw.required && <div style={{marginTop:10,fontSize:12,fontWeight:700,color:T.red,background:'#fff1f2',padding:'8px 12px',borderRadius:7}}>⚡ Underwriting task has been automatically created</div>}
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ── STEP 4: FINANCIAL JOURNEY ── */}
          {step.id==='journey' && (
            <div>
              <div style={{fontSize:12,color:T.gray,marginBottom:14,lineHeight:1.6}}>
                Ask the member about existing financial assets. This information improves the retirement projection.
              </div>

              {[
                {key:'hasPrevFund',     valKey:'prevFundValue',    label:'Previous Employer Retirement Fund',  sub:'Pension, Provident or Umbrella Fund from a previous employer'},
                {key:'hasPreservation', valKey:'preservationValue', label:'Preservation Fund',                 sub:'Previously transferred retirement savings'},
                {key:'hasRA',           valKey:'raValue',           label:'Retirement Annuity (RA)',           sub:'Personal retirement savings outside of employer'},
                {key:'hasTFSA',         valKey:'tfsaValue',         label:'Tax Free Savings Account (TFSA)',   sub:'Tax free savings or investment account'},
                {key:'hasLifeCover',    valKey:'lifeCoverAmount',   label:'Individual Life Cover',             sub:'Personal life insurance policy'},
                {key:'hasDisabilityCover', valKey:null,             label:'Individual Disability Cover',       sub:'Personal income protection policy'},
              ].map(item=>(
                <div key={item.key} style={{background:'#fff',borderRadius:10,padding:'14px 16px',border:`1px solid ${journey[item.key]?T.orange:T.border}`,marginBottom:10,transition:'border-color .15s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:journey[item.key]&&item.valKey?10:0}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:T.text}}>{item.label}</div>
                      <div style={{fontSize:11,color:T.gray,marginTop:2}}>{item.sub}</div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      {['Yes','No'].map(opt=>(
                        <button key={opt} onClick={()=>setJourney(j=>({...j,[item.key]:opt==='Yes'}))}
                          style={{padding:'5px 14px',borderRadius:7,border:`1.5px solid ${(journey[item.key]?'Yes':'No')===opt?(opt==='Yes'?T.green:T.red):T.border}`,background:(journey[item.key]?'Yes':'No')===opt?(opt==='Yes'?'#f0fdf4':'#fff1f2'):'#fff',color:(journey[item.key]?'Yes':'No')===opt?(opt==='Yes'?'#059669':T.red):T.gray,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  {journey[item.key] && item.valKey && (
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <label style={{fontSize:11,color:T.gray,whiteSpace:'nowrap'}}>Current value:</label>
                      <div style={{position:'relative',flex:1,maxWidth:220}}>
                        <span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',fontSize:12,fontWeight:700,color:T.gray}}>R</span>
                        <input type="number" value={journey[item.valKey]||''} onChange={e=>setJourney(j=>({...j,[item.valKey]:+e.target.value}))} style={{...inputSt,paddingLeft:22,fontSize:13}} placeholder="0"/>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div style={{marginTop:14}}>
                <label style={{fontSize:10,fontWeight:700,color:T.gray,textTransform:'uppercase',display:'block',marginBottom:6}}>Additional Notes</label>
                <textarea value={journey.additionalNotes} onChange={e=>setJourney(j=>({...j,additionalNotes:e.target.value}))} style={{...inputSt,minHeight:80,resize:'vertical'}} placeholder="Any other relevant financial information..."/>
              </div>
            </div>
          )}

          {/* ── STEP 5: RETIREMENT PROJECTION ── */}
          {step.id==='projection' && (
            <div>
              {!salaryNum ? (
                <div style={{textAlign:'center',padding:40,color:T.gray}}>
                  <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:6}}>Salary not entered</div>
                  <div style={{fontSize:12}}>Go back to Step 1 and enter the member's monthly salary.</div>
                </div>
              ) : !projection ? (
                <div style={{textAlign:'center',padding:40,color:T.gray,fontSize:13}}>Calculating projection...</div>
              ) : (
                <>
                  {/* Assumptions */}
                  <div style={{background:'#1e293b',borderRadius:10,padding:'12px 16px',marginBottom:14,display:'flex',gap:14,flexWrap:'wrap'}}>
                    {[['Growth %','growth'],['Escalation %','escalation'],['Inflation %','inflation'],['Drawdown %','drawdown']].map(([l,k])=>(
                      <div key={k}>
                        <div style={{fontSize:9,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                        <input type="number" step="0.5" value={assumptions[k]} onChange={e=>setAssumptions(a=>({...a,[k]:+e.target.value}))}
                          style={{width:60,padding:'4px 6px',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:5,color:'#fff',fontSize:12,fontFamily:'monospace',textAlign:'center'}}/>
                      </div>
                    ))}
                  </div>

                  {/* Journey phase tracker */}
                  <div style={{display:'flex',justifyContent:'center',gap:24,marginBottom:16}}>
                    {[[1,'Set your income goal'],[2,'See how you\'re tracking'],[3,'Pick a plan to meet your goal']].map(([n,l])=>(
                      <div key={n} onClick={()=>n<journeyPhase&&setPhase(n)} style={{display:'flex',alignItems:'center',gap:8,cursor:n<journeyPhase?'pointer':'default',opacity:n>journeyPhase?0.35:1}}>
                        <div style={{width:30,height:30,borderRadius:'50%',background:n===journeyPhase?'linear-gradient(135deg,#7c3aed,#3b82f6)':n<journeyPhase?'#059669':'#e5e7eb',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800}}>{n<journeyPhase?'✓':n}</div>
                        <div style={{fontSize:11.5,fontWeight:n===journeyPhase?800:600,color:n===journeyPhase?T.navy:T.gray,maxWidth:110,lineHeight:1.25}}>{l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Phone-style screen */}
                  <div style={{maxWidth:420,margin:'0 auto',background:'#fff',border:`1px solid ${T.border}`,borderRadius:22,padding:'26px 24px',boxShadow:'0 8px 32px rgba(0,0,0,0.07)'}}>

                    {/* ── SCREEN 1: SET YOUR INCOME GOAL ── */}
                    {journeyPhase===1 && (
                      <div>
                        <div style={{fontSize:17,fontWeight:800,color:'#1e5fd9',marginBottom:10,lineHeight:1.3}}>Set your retirement income goal</div>
                        <div style={{fontSize:12,color:'#374151',marginBottom:16,lineHeight:1.6}}>Set your retirement income goal and we will help you achieve it.</div>
                        <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:8}}>If you retired today, what take home pay would you need per month?</div>
                        <div style={{position:'relative',marginBottom:18}}>
                          <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,fontWeight:700,color:T.gray}}>R</span>
                          <input type="number" value={Math.round(effectiveGoal)||''}
                            onChange={e=>{
                              const v=+e.target.value||0
                              setIncomeGoal(v)
                              if (salaryNum>0) setAssumptions(a=>({...a,targetPct:Math.round((v/salaryNum)*100)}))
                            }}
                            style={{width:'100%',padding:'11px 12px 11px 28px',border:'1.5px solid #1e5fd9',borderRadius:8,fontSize:17,fontWeight:800,fontFamily:'inherit',color:T.navy,boxSizing:'border-box'}}/>
                        </div>
                        <div style={{fontSize:11.5,color:'#374151',marginBottom:2}}>Retirement income goal (including growth)</div>
                        <div style={{fontSize:17,fontWeight:800,color:'#1e5fd9',marginBottom:2}}>{R(effectiveGoal)}</div>
                        <div style={{fontSize:11,color:'#1e5fd9',marginBottom:14}}>{salaryNum>0?((effectiveGoal/salaryNum)*100).toFixed(2):0}% of your salary</div>
                        <div style={{fontSize:10.5,color:'#6b7280',marginBottom:20}}>We will assume this grows in line with your salary</div>
                        <button onClick={()=>setPhase(2)}
                          style={{width:'100%',padding:'12px',background:'#7bc043',border:'none',borderRadius:8,color:'#fff',fontSize:13.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                          Save and next: achieve your goal
                        </button>
                      </div>
                    )}

                    {/* ── SCREEN 2: SEE HOW YOU'RE TRACKING ── */}
                    {journeyPhase===2 && (
                      <div style={{textAlign:'center'}}>
                        <GoalRing projected={displayedIncome} goal={effectiveGoal} planActive={!!activePlan} size={230}/>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,margin:'16px 0'}}>
                          {[
                            ['Projected Fund', R(activePlan?activePlan.total:projection.total)],
                            ['Monthly Gap',    displayedIncome>=effectiveGoal?'None':R(effectiveGoal-displayedIncome)+'/mo'],
                          ].map(([l,v])=>(
                            <div key={l} style={{background:'#f9fafb',borderRadius:8,padding:'8px 10px'}}>
                              <div style={{fontSize:9,color:T.gray,textTransform:'uppercase',marginBottom:2}}>{l}</div>
                              <div style={{fontSize:13,fontWeight:800,color:T.navy,fontFamily:'monospace'}}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{textAlign:'left',border:`1px solid ${T.border}`,borderRadius:10,padding:'14px 16px',marginBottom:16,borderLeft:'4px solid #1e5fd9'}}>
                          <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:6}}>Tailored contribution plans</div>
                          <div style={{fontSize:11.5,color:'#374151',lineHeight:1.55}}>On your salary increase dates, we will increase your contributions by:</div>
                        </div>
                        <button onClick={()=>setPhase(3)}
                          style={{width:'100%',padding:'12px',background:'#7bc043',border:'none',borderRadius:8,color:'#fff',fontSize:13.5,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                          View tailored plans
                        </button>
                      </div>
                    )}

                    {/* ── SCREEN 3: PICK A PLAN ── */}
                    {journeyPhase===3 && (
                      <div style={{textAlign:'center'}}>
                        <GoalRing projected={displayedIncome} goal={effectiveGoal} planActive={!!activePlan} size={160}/>
                        <div style={{textAlign:'left',border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 14px',marginTop:14,boxShadow:'0 4px 18px rgba(0,0,0,0.08)',borderLeft:'4px solid #1e5fd9'}}>
                          <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:4}}>Tailored contribution plans</div>
                          <div style={{fontSize:11,color:'#374151',marginBottom:12,lineHeight:1.5}}>On your salary increase dates, we will increase your contributions by:</div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                            {plans.map(p=>{
                              const selected = selectedPlan===p.id
                              const meets    = p.monthlyInc >= effectiveGoal
                              return (
                                <button key={p.id} onClick={()=>setSelPlan(selected?null:p.id)}
                                  style={{padding:'10px 10px',borderRadius:8,border:`1.5px solid ${selected?'#1e5fd9':T.border}`,background:selected?'#eff6ff':'#fafafa',cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all .15s'}}>
                                  <div style={{fontSize:11.5,fontWeight:800,color:T.text,lineHeight:1.35,marginBottom:5}}>{p.label}</div>
                                  <div style={{fontSize:12,fontWeight:900,color:meets?'#059669':'#e8536f',fontFamily:'monospace',marginBottom:4}}>{R(p.monthlyInc)}/mo</div>
                                  <div style={{fontSize:10,fontWeight:700,color:selected?'#1e5fd9':T.gray}}>{selected?'● Selected':'○ Select'}</div>
                                </button>
                              )
                            })}
                          </div>
                          <button
                            disabled={!activePlan}
                            onClick={()=>{
                              const t = `Contribution Plan: ${activePlan.label}`
                              if (!actions.find(a=>a.type===t)) addAction(t, `Projected income ${R(activePlan.monthlyInc)}/mo vs goal ${R(effectiveGoal)}/mo`)
                              next()
                            }}
                            style={{width:'100%',padding:'11px',background:'#7bc043',border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:800,cursor:activePlan?'pointer':'not-allowed',fontFamily:'inherit',opacity:activePlan?1:0.45}}>
                            Confirm plan
                          </button>
                        </div>
                        {!activePlan && displayedIncome>=effectiveGoal && (
                          <div style={{marginTop:10,fontSize:11.5,color:'#059669',fontWeight:700}}>Already on track — no plan required. Continue with Next below.</div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {step.id==='insights' && (
            <div>
              <div style={{fontSize:12,color:T.gray,marginBottom:14}}>
                System-generated insights based on member data. Review with the member and add any applicable actions.
              </div>
              {insights.length===0 ? (
                <div style={{textAlign:'center',padding:40,color:T.gray,fontSize:13}}>Complete earlier steps to generate insights.</div>
              ) : (
                insights.map((ins,i)=>(
                  <div key={i} style={{marginBottom:8}}>
                    <Insight text={ins.text} type={ins.type}/>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── STEP 7: ACTIONS & SIGN-OFF ── */}
          {step.id==='actions' && (
            <div>
              <Card title="Adviser Actions" color={T.orange}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:8,marginBottom:14}}>
                  {[
                    'Schedule Annual Review',
                    'Request Fund Transfer',
                    'Preservation Quotation',
                    'Beneficiary Nomination',
                    'Increase Contributions',
                    'Medical Underwriting',
                    'Investment Review',
                    'Will Discussion',
                    'Estate Planning',
                    'Disability Cover Review',
                    'Life Cover Review',
                    'Retirement Consultation',
                  ].map(type=>{
                    const added = actions.find(a=>a.type===type)
                    return (
                      <button key={type} onClick={()=>added?removeAction(added.id):addAction(type)}
                        style={{padding:'9px 10px',background:added?T.orangeL:'#fff',border:`1.5px solid ${added?T.orange:T.border}`,borderRadius:8,fontSize:11,fontWeight:600,color:added?T.orange:T.text,cursor:'pointer',fontFamily:'inherit',textAlign:'left',transition:'all .12s'}}>
                        {added?'✓ ':''}{type}
                      </button>
                    )
                  })}
                </div>
                {actions.length>0&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:T.gray,textTransform:'uppercase',marginBottom:8}}>Selected Actions ({actions.length})</div>
                    {actions.map(a=>(
                      <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',background:'#fff',border:`1px solid ${T.border}`,borderRadius:7,marginBottom:5}}>
                        <div style={{fontSize:12,fontWeight:600}}>{a.type}</div>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10,background:'#fffbeb',color:T.amber}}>{a.priority}</span>
                          <button onClick={()=>removeAction(a.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.red,fontSize:14}}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Adviser Notes" color={T.navy}>
                <textarea value={adviserNotes} onChange={e=>setNotes(e.target.value)}
                  style={{...inputSt,minHeight:100,resize:'vertical'}}
                  placeholder="Record advice provided, key discussion points, member decisions..."/>
              </Card>

              {!consultComplete ? (
                <button onClick={completeConsultation}
                  style={{width:'100%',padding:'14px',background:T.green,border:'none',borderRadius:10,color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',marginBottom:8}}>
                  ✓ Complete Consultation & Save
                </button>
              ) : (
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'16px',textAlign:'center'}}>
                  <div style={{fontSize:16,fontWeight:800,color:'#059669',marginBottom:4}}>Consultation Complete</div>
                  <div style={{fontSize:13,color:'#374151',marginBottom:12}}>
                    {actions.length} action{actions.length!==1?'s':''} created · Saved to member record
                  </div>
                  <button onClick={onClose}
                    style={{padding:'9px 24px',background:T.navy,border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'12px 24px',borderTop:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,background:'#fff'}}>
          <div style={{fontSize:11,color:T.gray}}>Step {stepIdx+1} of {STEPS.length} · {step.icon} {step.label}</div>
          <div style={{display:'flex',gap:8}}>
            {stepIdx>0&&<button onClick={back} style={{padding:'9px 18px',background:'#fff',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color:T.text}}>← Back</button>}
            {stepIdx<STEPS.length-1&&<button onClick={next} style={{padding:'9px 22px',background:T.orange,border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Next →</button>}
          </div>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}
