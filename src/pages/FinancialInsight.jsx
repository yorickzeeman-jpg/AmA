import { useState, useMemo, useCallback } from 'react'
import { T } from '../data.js'
import { inputSt, selectSt } from '../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// FINANCIAL INSIGHT ENGINE — AEB Portal Add-On Module
//
// Standalone module. Does NOT modify any existing functionality.
// Assists licensed Financial Advisers in providing compliant retirement guidance.
//
// Data sources:
//   - Employer benefit profile (contribution rates, retirement age, GLA, PHI)
//   - Member age (from ID number)
//   - Member salary (captured by adviser)
//   - Additional funds (manually entered by adviser)
// ═════════════════════════════════════════════════════════════════════════════

// ─── CALCULATION ENGINE ───────────────────────────────────────────────────────
// Standalone pure functions — no side effects, fully testable
// All assumptions configurable

const DEFAULT_ASSUMPTIONS = {
  investmentGrowth:    10.0,  // % pa nominal
  salaryEscalation:    6.0,   // % pa
  inflation:           5.5,   // % pa
  drawdownRate:        5.0,   // % pa (sustainable withdrawal rate)
  targetReplacement:   75,    // % of final salary
}

function calcAgeFromId(idNumber) {
  if (!idNumber || idNumber.length < 6) return null
  const yy = parseInt(idNumber.slice(0, 2))
  const mm = parseInt(idNumber.slice(2, 4))
  const dd = parseInt(idNumber.slice(4, 6))
  const currentYear = new Date().getFullYear()
  const fullYear = yy > (currentYear % 100) ? 1900 + yy : 2000 + yy
  const dob  = new Date(fullYear, mm - 1, dd)
  const diff = new Date() - dob
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

function calcContributions(salary, benefitProfile, category) {
  const cats = benefitProfile?.retirementFund?.contributionCategories || []
  const cat  = cats.find(c => c.category === category) || cats[0] || { employer: 5, employee: 5 }
  const glaRate = benefitProfile?.groupLife?.rate || 0
  const phiRate = benefitProfile?.disability?.rate || 0
  const adminCost = benefitProfile?.retirementFund?.administrationCost || 0

  const employerRF   = salary * (cat.employer / 100)
  const employeeRF   = salary * (cat.employee / 100)
  const totalRF      = employerRF + employeeRF
  const glaRand      = salary * (glaRate / 100)
  const phiRand      = salary * (phiRate / 100)
  const riskTotal    = glaRand + phiRand
  const netInvestment = totalRF - riskTotal - adminCost

  return {
    employerRF, employeeRF, totalRF,
    glaRand, phiRand, riskTotal, adminCost,
    netInvestment: Math.max(netInvestment, 0),
    employerPct: cat.employer,
    employeePct: cat.employee,
  }
}

function calcFreeCoverCheck(salary, benefitProfile) {
  const freeCoverLimit = benefitProfile?.groupLife?.freeCoverLimit || 0
  const benefit        = benefitProfile?.groupLife?.benefit || '3'
  const multiple       = parseFloat(benefit.match(/[\d.]+/)?.[0] || 3)
  const annualSalary   = salary * 12
  const glaBenefit     = annualSalary * multiple
  return {
    freeCoverLimit,
    glaBenefit,
    uwRequired: freeCoverLimit > 0 && glaBenefit > freeCoverLimit,
    multiple,
  }
}

function projectRetirement(params) {
  const {
    currentAge, retirementAge, monthlySalary, monthlyContribution,
    existingFunds, assumptions,
  } = params

  const yearsToRetirement = retirementAge - currentAge
  if (yearsToRetirement <= 0) return null

  const monthlyRate  = assumptions.investmentGrowth / 100 / 12
  const salaryGrowth = assumptions.salaryEscalation / 100 / 12
  const months       = yearsToRetirement * 12

  // Project existing funds
  const existingFVTotal = existingFunds.reduce((sum, f) => {
    const fv = f.value * Math.pow(1 + assumptions.investmentGrowth / 100, yearsToRetirement)
    return sum + fv
  }, 0)

  // Project ongoing contributions with salary escalation
  let fv = 0
  let currentContrib = monthlyContribution
  for (let m = 0; m < months; m++) {
    fv = (fv + currentContrib) * (1 + monthlyRate)
    if (m % 12 === 11) currentContrib *= (1 + assumptions.salaryEscalation / 100)
  }

  const totalFV = fv + existingFVTotal

  // Convert to today's money
  const inflationFactor = Math.pow(1 + assumptions.inflation / 100, yearsToRetirement)
  const todayValue      = totalFV / inflationFactor

  // Project final salary
  const finalSalary = monthlySalary * Math.pow(1 + assumptions.salaryEscalation / 100, yearsToRetirement)

  // Monthly income at retirement (sustainable withdrawal)
  const monthlyIncome       = (totalFV * assumptions.drawdownRate / 100) / 12
  const monthlyIncomeToday  = (todayValue * assumptions.drawdownRate / 100) / 12

  // Target
  const targetMonthlyToday = monthlySalary * (assumptions.targetReplacement / 100)
  const targetMonthlyFinal = finalSalary   * (assumptions.targetReplacement / 100)

  const fundingRatio  = targetMonthlyToday > 0 ? (monthlyIncomeToday / targetMonthlyToday) * 100 : 0
  const monthlyGap    = Math.max(targetMonthlyToday - monthlyIncomeToday, 0)
  const annualGap     = monthlyGap * 12
  const lifetimeGap   = annualGap * (90 - retirementAge)  // assume life to 90

  return {
    yearsToRetirement,
    totalFV, existingFVTotal, ongoingFV: fv,
    todayValue, finalSalary,
    monthlyIncome, monthlyIncomeToday,
    targetMonthlyToday, targetMonthlyFinal,
    fundingRatio,
    monthlyGap, annualGap, lifetimeGap,
    inflationFactor,
  }
}

function projectWithScenario(base, scenario, params, assumptions) {
  const modified = { ...params }
  if (scenario.extraMonthly)      modified.monthlyContribution += scenario.extraMonthly
  if (scenario.retirementAge)     modified.retirementAge = scenario.retirementAge
  if (scenario.extraFundValue)    modified.existingFunds = [...params.existingFunds, { label:'Additional', value: scenario.extraFundValue }]
  if (scenario.growthBoost)       assumptions = { ...assumptions, investmentGrowth: assumptions.investmentGrowth + scenario.growthBoost }
  return projectRetirement({ ...modified, assumptions })
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────
function R(val, decimals = 0) {
  if (!val && val !== 0) return '—'
  return 'R' + Number(val).toLocaleString('en-ZA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function Pct(val) {
  if (!val && val !== 0) return '—'
  return Number(val).toFixed(1) + '%'
}

function SectionCard({ title, color = T.blue, children, badge }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden', marginBottom:14 }}>
      <div style={{ padding:'11px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:`linear-gradient(90deg,${color}08,transparent)` }}>
        <div style={{ fontSize:12, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.5px' }}>{title}</div>
        {badge}
      </div>
      <div style={{ padding:'16px' }}>{children}</div>
    </div>
  )
}

function DataRow({ label, value, valueColor, bold, sub }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'7px 0', borderBottom:`1px solid #f9fafb` }}>
      <div>
        <span style={{ fontSize:13, color:T.gray }}>{label}</span>
        {sub && <div style={{ fontSize:10, color:'#9ca3af' }}>{sub}</div>}
      </div>
      <span style={{ fontSize:bold?16:13, fontWeight:bold?800:600, color:valueColor||T.text, fontFamily:'monospace' }}>{value}</span>
    </div>
  )
}

function FundingGauge({ ratio }) {
  const clr = ratio >= 90 ? '#059669' : ratio >= 70 ? '#d97706' : '#dc2626'
  const lbl = ratio >= 90 ? 'On Track' : ratio >= 70 ? 'Needs Attention' : 'Behind Target'
  const pct = Math.min(ratio, 100)
  return (
    <div style={{ textAlign:'center', padding:'8px 0' }}>
      <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center', width:120, height:120 }}>
        <svg width="120" height="120" style={{ transform:'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="12"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke={clr} strokeWidth="12"
            strokeDasharray={`${2 * Math.PI * 50 * pct / 100} ${2 * Math.PI * 50}`}
            strokeLinecap="round" style={{ transition:'stroke-dasharray .6s ease' }}/>
        </svg>
        <div style={{ position:'absolute', textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:900, color:clr }}>{Math.round(ratio)}%</div>
        </div>
      </div>
      <div style={{ fontSize:13, fontWeight:700, color:clr, marginTop:4 }}>{lbl}</div>
      <div style={{ fontSize:11, color:T.gray }}>Funding Ratio</div>
    </div>
  )
}

function InsightChip({ text, type }) {
  const cfg = {
    warning: { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa' },
    danger:  { bg:'#fff1f2', color:'#be123c', border:'#fecaca' },
    success: { bg:'#f0fdf4', color:'#15803d', border:'#bbf7d0' },
    info:    { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
  }[type] || { bg:'#f9fafb', color:T.gray, border:T.border }
  return (
    <div style={{ padding:'10px 14px', background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:9, marginBottom:8, fontSize:13, color:cfg.color, lineHeight:1.5 }}>
      {text}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function FinancialInsight({ member, employer, benefitProfile, currentUser, onCreateAction, onClose }) {
  const [salary, setSalary]         = useState(member?.salary || '')
  const [category, setCategory]     = useState(member?.benefitCategory || 'Category 1')
  const [existingFunds, setFunds]   = useState([])
  const [targetPct, setTargetPct]   = useState(75)
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS)
  const [activeTab, setTab]         = useState('overview')
  const [showAssumptions, setShowA] = useState(false)
  const [scenarios, setScenarios]   = useState({})
  const [actions, setActions]       = useState([])
  const [timeline, setTimeline]     = useState([
    { date: member?.startDate || new Date().toISOString().split('T')[0], event:'Employer Joined', type:'join' },
  ])

  const retirementAge = benefitProfile?.retirementFund?.normalRetirementAge
    || benefitProfile?.retirementAge
    || 65

  const idNumber  = member?.idNumber || ''
  const memberAge = calcAgeFromId(idNumber) || (member?.age ? parseInt(member.age) : null)
  const salaryNum = parseFloat(String(salary).replace(/[^0-9.]/g,'')) || 0

  const contributions = useMemo(() =>
    salaryNum > 0 ? calcContributions(salaryNum, benefitProfile, category) : null,
    [salaryNum, benefitProfile, category]
  )

  const uwCheck = useMemo(() =>
    salaryNum > 0 ? calcFreeCoverCheck(salaryNum, benefitProfile) : null,
    [salaryNum, benefitProfile]
  )

  const projParams = useMemo(() => ({
    currentAge:          memberAge || 30,
    retirementAge,
    monthlySalary:       salaryNum,
    monthlyContribution: contributions?.netInvestment || 0,
    existingFunds,
    assumptions:         { ...assumptions, targetReplacement: targetPct },
  }), [memberAge, retirementAge, salaryNum, contributions, existingFunds, assumptions, targetPct])

  const projection = useMemo(() =>
    salaryNum > 0 && memberAge ? projectRetirement(projParams) : null,
    [projParams, salaryNum, memberAge]
  )

  // Gap closing scenarios
  const scenarioResults = useMemo(() => {
    if (!projection) return {}
    const base = projParams
    const a    = { ...assumptions, targetReplacement: targetPct }
    return {
      extraR500:    projectWithScenario(null, { extraMonthly: 500  }, base, a),
      extraR1000:   projectWithScenario(null, { extraMonthly: 1000 }, base, a),
      extraR2000:   projectWithScenario(null, { extraMonthly: 2000 }, base, a),
      retire2Later: projectWithScenario(null, { retirementAge: retirementAge + 2 }, base, a),
      retire5Later: projectWithScenario(null, { retirementAge: retirementAge + 5 }, base, a),
      growthBoost:  projectWithScenario(null, { growthBoost: 1.5 }, base, a),
    }
  }, [projection, projParams, assumptions, targetPct, retirementAge])

  // Auto-generate insights
  const insights = useMemo(() => {
    const list = []
    if (!projection) return list
    const r = projection
    if (r.fundingRatio >= 90)  list.push({ text:`You are on track to replace ${Pct(r.fundingRatio)} of your target retirement income.`, type:'success' })
    if (r.fundingRatio < 90 && r.fundingRatio >= 70) list.push({ text:`You are projected to replace ${Math.round(r.fundingRatio)}% of your target. Increasing contributions by ${R(r.monthlyGap * 0.3)} per month could close this gap.`, type:'warning' })
    if (r.fundingRatio < 70)   list.push({ text:`You are projected to replace only ${Math.round(r.fundingRatio)}% of your target retirement income. Immediate action is recommended.`, type:'danger' })
    if (r.monthlyGap > 0)      list.push({ text:`Monthly retirement income shortfall: ${R(r.monthlyGap)} in today's money. Annual shortfall: ${R(r.annualGap)}.`, type:'warning' })
    if (uwCheck?.uwRequired)   list.push({ text:`Medical Underwriting Required — GLA benefit of ${R(uwCheck.glaBenefit)} exceeds free cover limit of ${R(uwCheck.freeCoverLimit)}.`, type:'danger' })
    if (existingFunds.length === 0) list.push({ text:`No previous retirement funds captured. If the member has funds from a previous employer, capturing them may significantly improve the projection.`, type:'info' })
    if (r.yearsToRetirement < 10)   list.push({ text:`The member has fewer than 10 years to retirement. A preservation and drawdown strategy should be discussed urgently.`, type:'warning' })
    return list
  }, [projection, uwCheck, existingFunds])

  function addExistingFund() {
    setFunds(prev => [...prev, { id: crypto.randomUUID(), label:'Previous Employer Fund', value:0 }])
  }

  function addAction(type) {
    const action = { id: crypto.randomUUID(), type, date: new Date().toISOString().split('T')[0], adviser: currentUser?.name, status:'Pending' }
    setActions(prev => [...prev, action])
    setTimeline(prev => [...prev, { date: action.date, event: type, type:'action' }])
    if (onCreateAction) onCreateAction(action)
  }

  const tabs = [
    { id:'overview',   label:'Overview'          },
    { id:'projection', label:'Retirement Plan'   },
    { id:'scenarios',  label:'Scenarios'         },
    { id:'insights',   label:`Insights${insights.length>0?` (${insights.length})`:''}` },
    { id:'timeline',   label:'Journey Timeline'  },
    { id:'actions',    label:'Adviser Actions'   },
  ]

  const cats = benefitProfile?.retirementFund?.contributionCategories || []

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:600, display:'flex', alignItems:'stretch', justifyContent:'flex-end' }}>
      <div style={{ width:'min(960px,100vw)', height:'100vh', background:'#f8f9fb', display:'flex', flexDirection:'column', boxShadow:'-12px 0 48px rgba(0,0,0,0.2)', animation:'slideInRight .25s ease' }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${T.navy},#1a3a6b)`, padding:'18px 24px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:4 }}>Financial Insight Engine</div>
              <div style={{ fontSize:20, fontWeight:900, color:'#fff', marginBottom:2 }}>
                {member?.memberName || member?.name || 'Member'} {member?.surname || ''}
              </div>
              <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                {employer?.name  && <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{employer.name}</span>}
                {memberAge       && <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Age {memberAge}</span>}
                {member?.idNumber && <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)', fontFamily:'monospace' }}>{member.idNumber}</span>}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button onClick={() => setShowA(!showAssumptions)}
                style={{ padding:'7px 14px', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, color:'#fff', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                ⚙ Assumptions
              </button>
              {onClose && (
                <button onClick={onClose}
                  style={{ width:34, height:34, background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, cursor:'pointer', color:'#fff', fontSize:18 }}>×</button>
              )}
            </div>
          </div>

          {/* Quick stats */}
          {projection && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:8 }}>
              {[
                ['Years to Retire', projection.yearsToRetirement+'y',     '#fff'],
                ['Monthly Contrib', R(contributions?.netInvestment),      '#93c5fd'],
                ['Projected Fund',  R(projection.totalFV),                '#6ee7b7'],
                ['Today\'s Value',  R(projection.todayValue),             '#fde68a'],
                ['Monthly Income',  R(projection.monthlyIncomeToday)+'/mo','#c4b5fd'],
                ['Funding Ratio',   Math.round(projection.fundingRatio)+'%',
                  projection.fundingRatio >= 90 ? '#6ee7b7' : projection.fundingRatio >= 70 ? '#fde68a' : '#fca5a5'],
              ].map(([l,v,c])=>(
                <div key={l} style={{ background:'rgba(255,255,255,0.08)', borderRadius:8, padding:'8px 10px' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:c, fontFamily:'monospace' }}>{v}</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.4px' }}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assumptions panel */}
        {showAssumptions && (
          <div style={{ background:'#1e293b', padding:'12px 24px', display:'flex', gap:16, flexWrap:'wrap', borderBottom:`1px solid rgba(255,255,255,0.1)`, flexShrink:0 }}>
            {[
              ['Investment Growth %', 'investmentGrowth'],
              ['Salary Escalation %', 'salaryEscalation'],
              ['Inflation %',         'inflation'],
              ['Drawdown Rate %',     'drawdownRate'],
            ].map(([label, key]) => (
              <div key={key} style={{ display:'flex', flexDirection:'column', gap:3 }}>
                <label style={{ fontSize:9, color:'rgba(255,255,255,0.5)', textTransform:'uppercase' }}>{label}</label>
                <input type="number" step="0.5" value={assumptions[key]}
                  onChange={e=>setAssumptions(prev=>({...prev,[key]:+e.target.value}))}
                  style={{ width:70, padding:'4px 6px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:6, color:'#fff', fontSize:13, fontFamily:'monospace', textAlign:'center' }}/>
              </div>
            ))}
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              <label style={{ fontSize:9, color:'rgba(255,255,255,0.5)', textTransform:'uppercase' }}>Target Income %</label>
              <input type="number" step="5" value={targetPct} onChange={e=>setTargetPct(+e.target.value)}
                style={{ width:70, padding:'4px 6px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:6, color:'#fff', fontSize:13, fontFamily:'monospace', textAlign:'center' }}/>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ background:'#fff', borderBottom:`1px solid ${T.border}`, display:'flex', overflowX:'auto', flexShrink:0 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={()=>setTab(tab.id)}
              style={{ padding:'11px 18px', background:'none', border:'none', borderBottom:activeTab===tab.id?`2px solid ${T.orange}`:'2px solid transparent', color:activeTab===tab.id?T.orange:T.gray, fontWeight:activeTab===tab.id?700:400, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', marginBottom:-1 }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:20 }}>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div>
              {/* Member input */}
              <SectionCard title="Member Details" color={T.blue}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }}>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:5 }}>Monthly Salary (R) *</label>
                    <div style={{ position:'relative' }}>
                      <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:12, fontWeight:700, color:T.gray }}>R</span>
                      <input type="number" value={salary} onChange={e=>setSalary(e.target.value)}
                        style={{ ...inputSt, paddingLeft:24 }} placeholder="e.g. 20000"/>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:5 }}>Benefit Category</label>
                    <select value={category} onChange={e=>setCategory(e.target.value)} style={selectSt}>
                      {cats.length > 0
                        ? cats.map(c => <option key={c.category}>{c.category}</option>)
                        : ['Category 1','Category 2','Category 3','Category 4'].map(c => <option key={c}>{c}</option>)
                      }
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:5 }}>Member Age</label>
                    <div style={{ padding:'8px 12px', background:'#f9fafb', borderRadius:7, border:`1px solid ${T.border}`, fontSize:14, fontWeight:700, color:T.text }}>
                      {memberAge ? `${memberAge} years` : idNumber ? 'Check ID number' : 'Enter ID number on case'}
                    </div>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:8 }}>
                  {[
                    ['Employer',          employer?.name || '—'],
                    ['Retirement Age',    `Age ${retirementAge}`],
                    ['Years to Retire',   memberAge ? `${retirementAge - memberAge} years` : '—'],
                    ['Fund',              benefitProfile?.retirementFund?.name || '—'],
                    ['Administrator',     benefitProfile?.retirementFund?.administrator || '—'],
                  ].map(([l,v])=>(
                    <div key={l} style={{ background:'#f9fafb', borderRadius:8, padding:'10px 12px' }}>
                      <div style={{ fontSize:9, fontWeight:700, color:T.gray, textTransform:'uppercase', marginBottom:3 }}>{l}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{v}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Benefit Value Calculator */}
              {contributions && (
                <SectionCard title="Monthly Benefit Value Calculator" color='#059669'>
                  <DataRow label="Monthly Salary" value={R(salaryNum)} bold/>
                  <div style={{ height:8 }}/>
                  <DataRow label={`Employer Retirement Contribution (${contributions.employerPct}%)`} value={R(contributions.employerRF)} valueColor={T.blue}/>
                  <DataRow label={`Employee Retirement Contribution (${contributions.employeePct}%)`} value={R(contributions.employeeRF)} valueColor={T.orange}/>
                  <DataRow label="Total Retirement Contribution" value={R(contributions.totalRF)} bold/>
                  <div style={{ height:8 }}/>
                  <DataRow label={`Group Life Premium (${Pct(benefitProfile?.groupLife?.rate)})`} value={`-${R(contributions.glaRand)}`} valueColor={T.red}/>
                  <DataRow label={`PHI Premium (${Pct(benefitProfile?.disability?.rate)})`} value={`-${R(contributions.phiRand)}`} valueColor={T.red}/>
                  <DataRow label="Administration Cost" value={`-${R(contributions.adminCost)}`} valueColor={T.gray}/>
                  <div style={{ height:8, borderTop:`2px solid ${T.border}`, marginTop:8, marginBottom:8 }}/>
                  <DataRow label="Net Investment into Retirement Fund" value={R(contributions.netInvestment)} bold valueColor='#059669'/>
                </SectionCard>
              )}

              {/* Free Cover Check */}
              {uwCheck && (
                <SectionCard title="Free Cover Limit Check" color={uwCheck.uwRequired ? T.red : '#059669'}>
                  <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:uwCheck.uwRequired?'#fff1f2':'#f0fdf4', border:`2px solid ${uwCheck.uwRequired?T.red:'#059669'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:uwCheck.uwRequired?T.red:'#059669', flexShrink:0 }}>
                      {uwCheck.uwRequired ? '!' : '✓'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:uwCheck.uwRequired?T.red:'#059669', marginBottom:6 }}>
                        {uwCheck.uwRequired ? 'Medical Underwriting Required' : 'Within Free Cover Limit — No Underwriting Required'}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                        <div><div style={{ fontSize:10, color:T.gray, textTransform:'uppercase', marginBottom:2 }}>Annual Salary</div><div style={{ fontSize:13, fontWeight:700 }}>{R(salaryNum * 12)}</div></div>
                        <div><div style={{ fontSize:10, color:T.gray, textTransform:'uppercase', marginBottom:2 }}>GLA Benefit ({uwCheck.multiple}×)</div><div style={{ fontSize:13, fontWeight:700 }}>{R(uwCheck.glaBenefit)}</div></div>
                        <div><div style={{ fontSize:10, color:T.gray, textTransform:'uppercase', marginBottom:2 }}>Free Cover Limit</div><div style={{ fontSize:13, fontWeight:700 }}>{R(uwCheck.freeCoverLimit)}</div></div>
                      </div>
                      {uwCheck.uwRequired && (
                        <button onClick={() => addAction('Medical Underwriting Required')}
                          style={{ marginTop:10, padding:'7px 14px', background:T.red, border:'none', borderRadius:7, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                          Create Underwriting Task
                        </button>
                      )}
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* Existing funds */}
              <SectionCard title="Additional Retirement Funds" color={T.purple}>
                {existingFunds.length === 0 ? (
                  <div style={{ fontSize:12, color:T.gray, marginBottom:10 }}>No additional funds captured. Add any previous employer funds, preservation funds or RAs below.</div>
                ) : (
                  existingFunds.map((f, i) => (
                    <div key={f.id} style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:8, marginBottom:8, alignItems:'center' }}>
                      <input value={f.label} onChange={e=>{const n=[...existingFunds];n[i]={...n[i],label:e.target.value};setFunds(n)}} style={{...inputSt,fontSize:12}} placeholder="Fund description"/>
                      <div style={{ position:'relative' }}>
                        <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', fontSize:11, color:T.gray, fontWeight:700 }}>R</span>
                        <input type="number" value={f.value||''} onChange={e=>{const n=[...existingFunds];n[i]={...n[i],value:+e.target.value};setFunds(n)}} style={{...inputSt,paddingLeft:20,width:130,fontSize:12}} placeholder="Current value"/>
                      </div>
                      <button onClick={()=>setFunds(prev=>prev.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:T.red, fontSize:18 }}>×</button>
                    </div>
                  ))
                )}
                <button onClick={addExistingFund} style={{ fontSize:12, color:T.purple, background:'none', border:`1px dashed ${T.purple}`, borderRadius:7, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit', width:'100%' }}>
                  + Add Fund
                </button>
              </SectionCard>
            </div>
          )}

          {/* ── RETIREMENT PROJECTION ── */}
          {activeTab === 'projection' && (
            <div>
              {!projection ? (
                <div style={{ textAlign:'center', padding:48, color:T.gray }}>
                  <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:6 }}>Enter salary to generate projection</div>
                  <div style={{ fontSize:12 }}>Go to Overview and enter the member's monthly salary to calculate retirement projections.</div>
                </div>
              ) : (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:20, marginBottom:16, alignItems:'center', background:'#fff', borderRadius:12, padding:20, border:`1px solid ${T.border}` }}>
                    <FundingGauge ratio={projection.fundingRatio}/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>Target Income</div>
                      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:8 }}>
                        <div style={{ flex:1 }}>
                          <input type="range" min="50" max="100" value={targetPct} onChange={e=>setTargetPct(+e.target.value)}
                            style={{ width:'100%', accentColor:T.orange }}/>
                        </div>
                        <span style={{ fontSize:16, fontWeight:800, color:T.orange, width:40 }}>{targetPct}%</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        <div style={{ background:'#f9fafb', borderRadius:8, padding:'10px 12px' }}>
                          <div style={{ fontSize:10, color:T.gray, textTransform:'uppercase' }}>Target Monthly</div>
                          <div style={{ fontSize:16, fontWeight:800, color:T.orange }}>{R(projection.targetMonthlyToday)}</div>
                          <div style={{ fontSize:10, color:T.gray }}>in today's money</div>
                        </div>
                        <div style={{ background:'#f9fafb', borderRadius:8, padding:'10px 12px' }}>
                          <div style={{ fontSize:10, color:T.gray, textTransform:'uppercase' }}>Projected Monthly</div>
                          <div style={{ fontSize:16, fontWeight:800, color:projection.fundingRatio>=90?'#059669':projection.fundingRatio>=70?T.amber:T.red }}>{R(projection.monthlyIncomeToday)}</div>
                          <div style={{ fontSize:10, color:T.gray }}>in today's money</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <SectionCard title="Retirement Projection" color={T.blue}>
                    <DataRow label="Years to Retirement"         value={projection.yearsToRetirement + ' years'}/>
                    <DataRow label="Monthly Net Investment"       value={R(contributions?.netInvestment)} valueColor={T.blue}/>
                    <DataRow label="Existing Funds (current value)" value={R(projection.existingFVTotal / Math.pow(1 + assumptions.investmentGrowth/100, projection.yearsToRetirement))} valueColor={T.purple}/>
                    <div style={{ height:8 }}/>
                    <DataRow label="Projected Retirement Fund"   value={R(projection.totalFV)}    bold valueColor={T.blue}/>
                    <DataRow label="Today's Purchasing Value"    value={R(projection.todayValue)}  bold valueColor='#059669' sub={`Adjusted for ${assumptions.inflation}% inflation over ${projection.yearsToRetirement} years`}/>
                    <DataRow label="Projected Final Salary"      value={R(projection.finalSalary) + '/mo'} valueColor={T.gray}/>
                  </SectionCard>

                  <SectionCard title="Retirement Income" color='#059669'>
                    <DataRow label="Estimated Monthly Income at Retirement" value={R(projection.monthlyIncome) + '/mo'} bold valueColor={T.blue} sub="Nominal (future value)"/>
                    <DataRow label="In Today's Money"                       value={R(projection.monthlyIncomeToday) + '/mo'} bold valueColor='#059669' sub={`${assumptions.drawdownRate}% sustainable drawdown rate`}/>
                  </SectionCard>

                  {projection.monthlyGap > 0 && (
                    <SectionCard title="Retirement Gap" color={T.red}>
                      <DataRow label="Target Monthly Income"    value={R(projection.targetMonthlyToday) + '/mo'} bold/>
                      <DataRow label="Projected Monthly Income" value={R(projection.monthlyIncomeToday) + '/mo'}/>
                      <div style={{ height:8, borderTop:`2px solid ${T.border}`, margin:'8px 0' }}/>
                      <DataRow label="Monthly Gap"   value={R(projection.monthlyGap) + '/mo'} bold valueColor={T.red}/>
                      <DataRow label="Annual Gap"    value={R(projection.annualGap)  + '/yr'} valueColor={T.red}/>
                      <DataRow label="Lifetime Gap"  value={R(projection.lifetimeGap)}        valueColor={T.red} sub={`Based on ${90 - retirementAge} years in retirement`}/>
                    </SectionCard>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SCENARIOS ── */}
          {activeTab === 'scenarios' && (
            <div>
              {!projection ? (
                <div style={{ textAlign:'center', padding:48, color:T.gray, fontSize:13 }}>Enter salary on Overview tab first.</div>
              ) : (
                <div>
                  <div style={{ fontSize:12, color:T.gray, marginBottom:14, lineHeight:1.6 }}>
                    Each scenario shows how a single change improves the retirement outcome. All other assumptions remain constant.
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    {[
                      { key:'extraR500',    label:'Increase AVC by R500/mo',          icon:'💰', amount: '+R500/mo' },
                      { key:'extraR1000',   label:'Increase AVC by R1,000/mo',         icon:'💰', amount: '+R1,000/mo' },
                      { key:'extraR2000',   label:'Increase AVC by R2,000/mo',         icon:'💰', amount: '+R2,000/mo' },
                      { key:'retire2Later', label:'Retire 2 years later',              icon:'📅', amount: `Age ${retirementAge + 2}` },
                      { key:'retire5Later', label:'Retire 5 years later',              icon:'📅', amount: `Age ${retirementAge + 5}` },
                      { key:'growthBoost',  label:'Higher growth portfolio (+1.5%)',   icon:'📈', amount: `${assumptions.investmentGrowth + 1.5}% pa` },
                    ].map(s => {
                      const r = scenarioResults[s.key]
                      if (!r) return null
                      const ratioClr = r.fundingRatio >= 90 ? '#059669' : r.fundingRatio >= 70 ? T.amber : T.red
                      const improvement = r.fundingRatio - projection.fundingRatio
                      return (
                        <div key={s.key} style={{ background:'#fff', borderRadius:12, padding:16, border:`1px solid ${T.border}` }}>
                          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
                            <span style={{ fontSize:20 }}>{s.icon}</span>
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{s.label}</div>
                              <div style={{ fontSize:11, color:T.gray }}>{s.amount}</div>
                            </div>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                            <div style={{ background:'#f9fafb', borderRadius:7, padding:'8px 10px', textAlign:'center' }}>
                              <div style={{ fontSize:10, color:T.gray, textTransform:'uppercase' }}>Fund at Retirement</div>
                              <div style={{ fontSize:13, fontWeight:700, color:T.blue }}>{R(r.totalFV)}</div>
                            </div>
                            <div style={{ background:'#f9fafb', borderRadius:7, padding:'8px 10px', textAlign:'center' }}>
                              <div style={{ fontSize:10, color:T.gray, textTransform:'uppercase' }}>Monthly Income</div>
                              <div style={{ fontSize:13, fontWeight:700, color:'#059669' }}>{R(r.monthlyIncomeToday)}/mo</div>
                            </div>
                          </div>
                          <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div style={{ fontSize:12, fontWeight:700, color:ratioClr }}>Funding Ratio: {Math.round(r.fundingRatio)}%</div>
                            {improvement > 0 && (
                              <div style={{ fontSize:11, fontWeight:700, color:'#059669', background:'#f0fdf4', padding:'2px 8px', borderRadius:12 }}>
                                +{Math.round(improvement)}% improvement
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── INSIGHTS ── */}
          {activeTab === 'insights' && (
            <div>
              <div style={{ fontSize:12, color:T.gray, marginBottom:14 }}>
                AI-generated insights based on the member's current benefit structure and retirement projection.
              </div>
              {insights.length === 0 ? (
                <div style={{ textAlign:'center', padding:40, color:T.gray }}>
                  <div style={{ fontSize:13 }}>Enter salary on Overview to generate insights.</div>
                </div>
              ) : (
                insights.map((ins, i) => <InsightChip key={i} text={ins.text} type={ins.type}/>)
              )}
            </div>
          )}

          {/* ── TIMELINE ── */}
          {activeTab === 'timeline' && (
            <div>
              <div style={{ position:'relative' }}>
                {[...timeline].sort((a,b)=>a.date.localeCompare(b.date)).map((t, i) => (
                  <div key={i} style={{ display:'flex', gap:14, marginBottom:16 }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                      <div style={{ width:12, height:12, borderRadius:'50%', background:t.type==='join'?T.blue:t.type==='action'?T.orange:'#059669', flexShrink:0, marginTop:3 }}/>
                      {i < timeline.length-1 && <div style={{ width:2, flex:1, background:'#f3f4f6', minHeight:20 }}/>}
                    </div>
                    <div style={{ flex:1, paddingBottom:8 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{t.event}</div>
                      <div style={{ fontSize:11, color:T.gray }}>{t.date}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:8, display:'flex', gap:8 }}>
                <button onClick={()=>{const e=prompt('Event description');if(e){setTimeline(prev=>[...prev,{date:new Date().toISOString().split('T')[0],event:e,type:'note'}])}}}
                  style={{ fontSize:12, color:T.blue, background:'none', border:`1px dashed ${T.blue}`, borderRadius:7, padding:'6px 14px', cursor:'pointer', fontFamily:'inherit' }}>
                  + Add Timeline Event
                </button>
              </div>
            </div>
          )}

          {/* ── ACTIONS ── */}
          {activeTab === 'actions' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10, marginBottom:20 }}>
                {[
                  'Schedule Annual Review',
                  'Medical Underwriting',
                  'Beneficiary Review',
                  'Increase Contributions',
                  'Fund Transfer Advice',
                  'Preservation Advice',
                  'Investment Review',
                  'Risk Benefit Review',
                  'Estate Planning',
                  'Will Discussion',
                  'Exit Consultation',
                  'Retirement Consultation',
                ].map(type => (
                  <button key={type} onClick={() => addAction(type)}
                    style={{ padding:'10px 12px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:9, fontSize:12, fontWeight:600, color:T.text, cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all .12s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.orange;e.currentTarget.style.background=T.orangeL}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background='#fff'}}>
                    {type}
                  </button>
                ))}
              </div>

              {actions.length > 0 && (
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>Created Actions</div>
                  {actions.map(a => (
                    <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:9, marginBottom:7 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{a.type}</div>
                        <div style={{ fontSize:11, color:T.gray }}>{a.date} · {a.adviser}</div>
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#fffbeb', color:T.amber }}>Pending</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}
