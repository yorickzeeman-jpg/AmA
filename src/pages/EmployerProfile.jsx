import { useState } from 'react'
import { T, emptyBenefitProfile } from '../data.js'
import { Btn, inputSt, selectSt, Icon } from '../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// EMPLOYER PROFILE — Master Record
//
// Tabs: Overview | Inhouse Pack | Benefit Structure | Retirement Fund |
//       Group Life | Disability | Medical Aid | Funeral | Extended Funeral |
//       Billing Rules | Documents | Membership | Cases | Billing History
// ═════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id:'overview',    label:'Overview'          },
  { id:'benefits',    label:'Benefit Structure' },
  { id:'retirement',  label:'Retirement Fund'   },
  { id:'risk',        label:'Group Life & PHI'  },
  { id:'medical',     label:'Medical Aid'       },
  { id:'funeral',     label:'Funeral Cover'     },
  { id:'billing',     label:'Billing Rules'     },
  { id:'documents',   label:'Documents'         },
  { id:'membership',  label:'Membership'        },
  { id:'cases',       label:'Cases'             },
  { id:'history',     label:'Billing History'   },
]

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return <div style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{children}</div>
}

function FieldValue({ children, mono, highlight, large }) {
  return (
    <div style={{
      fontSize: large ? 18 : 13,
      fontWeight: large ? 800 : highlight ? 700 : 500,
      color: highlight ? T.orange : T.text,
      fontFamily: mono ? 'monospace' : 'inherit',
      lineHeight: 1.3,
    }}>{children || '—'}</div>
  )
}

function InfoCard({ label, value, color, mono, sub, wide }) {
  return (
    <div style={{ gridColumn: wide ? '1/-1' : undefined, background:'#fff', borderRadius:10, padding:'14px 16px', border:`1.5px solid ${color}20`, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:color }}/>
      <FieldLabel>{label}</FieldLabel>
      <FieldValue mono={mono} large>{value || '—'}</FieldValue>
      {sub && <div style={{ fontSize:11, color:T.gray, marginTop:3 }}>{sub}</div>}
    </div>
  )
}

function Section({ title, color = T.blue, children, action }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden', marginBottom:14 }}>
      <div style={{ padding:'11px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:`linear-gradient(90deg,${color}08,transparent)` }}>
        <div style={{ fontSize:12, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.5px' }}>{title}</div>
        {action}
      </div>
      <div style={{ padding:'14px 16px' }}>{children}</div>
    </div>
  )
}

function Grid({ cols = 2, children }) {
  return <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:12 }}>{children}</div>
}

function EField({ label, children, wide, cols }) {
  return (
    <div style={{ gridColumn: wide ? '1/-1' : cols ? `span ${cols}` : undefined }}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  )
}

function RateCard({ label, rate, color, sub }) {
  return (
    <div style={{ background:color+'08', borderRadius:10, padding:'14px 16px', border:`1px solid ${color}20`, textAlign:'center' }}>
      <div style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:900, color, fontFamily:'monospace' }}>{rate ? `${rate}%` : '—'}</div>
      {sub && <div style={{ fontSize:10, color:T.gray, marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ─── UNDERWRITING CHECK ───────────────────────────────────────────────────────
function UWCheck({ salary, freeCoverLimit, benefit }) {
  if (!salary || !freeCoverLimit) return null
  const annual   = parseFloat(String(salary).replace(/[^0-9.]/g,'')) * 12
  const multiple = parseFloat((benefit||'3').match(/[\d.]+/)?.[0] || 3)
  const benefit$ = annual * multiple
  const required = benefit$ > freeCoverLimit
  return (
    <div style={{ background: required ? '#fff7ed' : '#f0fdf4', border:`1.5px solid ${required?'#fed7aa':'#bbf7d0'}`, borderRadius:10, padding:'12px 16px', marginTop:12 }}>
      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
        <div style={{ width:24, height:24, borderRadius:'50%', background: required?'#dc2626':'#059669', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800, flexShrink:0 }}>
          {required ? '!' : '✓'}
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color: required?'#c2410c':T.green, marginBottom:3 }}>
            {required ? 'Underwriting Required' : 'Within Free Cover Limit'}
          </div>
          <div style={{ fontSize:12, color:'#374151', lineHeight:1.6 }}>
            GLA Benefit: <strong>R{benefit$.toLocaleString()}</strong> ({multiple}× R{annual.toLocaleString()} annual)<br/>
            Free Cover Limit: <strong>R{freeCoverLimit.toLocaleString()}</strong><br/>
            {required ? `Exceeds limit by R${(benefit$-freeCoverLimit).toLocaleString()} — underwriting required.`
                      : 'No underwriting required.'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function EmployerProfile({
  employer, profile: initialProfile, cases, members,
  currentUser, billingTasks,
  onUpdateProfile, onClose
}) {
  const [activeTab, setTab]   = useState('overview')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(null)
  const [testSalary, setSalary] = useState('')

  const canEdit = ['general_manager','administrator'].includes(currentUser.role)
  const profile = initialProfile || emptyBenefitProfile(employer?.id, employer?.name)

  function startEdit() { setDraft(JSON.parse(JSON.stringify(profile))); setEditing(true) }
  function cancelEdit() { setEditing(false); setDraft(null) }
  function saveEdit()  { onUpdateProfile(employer.id, draft); setEditing(false); setDraft(null) }

  function setD(path, value) {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const parts = path.split('.')
      let obj = next
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {}
        obj = obj[parts[i]]
      }
      obj[parts[parts.length - 1]] = value
      return next
    })
  }

  const p          = editing ? draft : profile
  const empCases   = (cases   || []).filter(c => c.employerId === employer?.id)
  const empMembers = (members || []).filter(m => m.employerId === employer?.id)
  const openCases  = empCases.filter(c => !['Completed','Closed','Sent to Billing'].includes(c.status)).length
  const pendingBT  = (billingTasks||[]).filter(bt => bt.employerId === employer?.id && bt.billingStatus === 'Pending Review').length

  const cats = p?.retirementFund?.contributionCategories || []

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'stretch', justifyContent:'flex-end' }}>
      <div style={{ width:'min(920px,100vw)', height:'100vh', background:'#f8f9fb', display:'flex', flexDirection:'column', boxShadow:'-12px 0 48px rgba(0,0,0,0.2)', animation:'slideInRight .25s ease' }}>

        {/* Header */}
        <div style={{ background:T.navy, padding:'18px 24px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>Employer Profile</div>
              <div style={{ fontSize:22, fontWeight:900, color:'#fff', marginBottom:4 }}>{employer?.name}</div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                {employer?.number && <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{employer.number}</span>}
                {p?.payrollContact && <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>Contact: {p.payrollContact}</span>}
                {p?.effectiveDate  && <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>Effective: {p.effectiveDate}</span>}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {canEdit && !editing && (
                <button onClick={startEdit}
                  style={{ padding:'8px 16px', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:8, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  Edit Profile
                </button>
              )}
              {editing && (
                <>
                  <button onClick={saveEdit}
                    style={{ padding:'8px 16px', background:'#059669', border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    Save
                  </button>
                  <button onClick={cancelEdit}
                    style={{ padding:'8px 14px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, color:'#fff', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                    Cancel
                  </button>
                </>
              )}
              <button onClick={onClose}
                style={{ width:34, height:34, background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, cursor:'pointer', color:'#fff', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
                ×
              </button>
            </div>
          </div>

          {/* Benefit pills */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[
              [p?.retirementFund?.name,       p?.retirementFund?.name,                         T.blue],
              [p?.groupLife?.schemeNumber,     `GLA ${p?.groupLife?.rate||0}%`,                 '#059669'],
              [p?.disability?.rate,            `PHI ${p?.disability?.rate||0}%`,                T.amber],
              [p?.medicalAid?.scheme,          p?.medicalAid?.scheme,                           T.red],
              [p?.funeralCover?.memberPremium, `Funeral R${p?.funeralCover?.memberPremium}/mo`, T.purple],
            ].filter(([active]) => active).map(([,label,color], i) => (
              <span key={i} style={{ fontSize:11, fontWeight:600, padding:'3px 11px', borderRadius:20, background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.25)' }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Quick stats bar */}
        <div style={{ background:'#fff', borderBottom:`1px solid ${T.border}`, display:'flex', flexShrink:0 }}>
          {[
            ['Active Members', empMembers.filter(m=>m.status==='Active').length, T.blue],
            ['Open Cases',     openCases,                                         openCases>0?T.orange:T.gray],
            ['Pending Billing',pendingBT,                                         pendingBT>0?T.purple:T.gray],
          ].map(([l,v,c])=>(
            <div key={l} style={{ flex:1, padding:'12px 16px', borderRight:`1px solid ${T.border}`, textAlign:'center' }}>
              <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
              <div style={{ fontSize:10, fontWeight:600, color:T.gray, textTransform:'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ background:'#fff', borderBottom:`1px solid ${T.border}`, display:'flex', overflowX:'auto', flexShrink:0 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={()=>setTab(tab.id)}
              style={{ padding:'11px 16px', background:'none', border:'none', borderBottom:activeTab===tab.id?`2px solid ${T.orange}`:'2px solid transparent', color:activeTab===tab.id?T.orange:T.gray, fontWeight:activeTab===tab.id?700:400, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', marginBottom:-1 }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex:1, overflowY:'auto', padding:20 }}>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:16 }}>
                <InfoCard label="Retirement Fund"  value={p?.retirementFund?.name}          color={T.blue}   sub={p?.retirementFund?.fundCode}/>
                <InfoCard label="GLA Rate"         value={p?.groupLife?.rate?`${p.groupLife.rate}%`:'—'}     color='#059669' sub={`Scheme ${p?.groupLife?.schemeNumber||'—'}`}/>
                <InfoCard label="PHI Rate"         value={p?.disability?.rate?`${p.disability.rate}%`:'—'}   color={T.amber} sub={`${p?.disability?.waitingPeriodMonths||3} month waiting period`}/>
                <InfoCard label="Medical Aid"      value={p?.medicalAid?.scheme}             color={T.red}    sub={`Scheme ${p?.medicalAid?.schemeNumber||'—'}`}/>
                <InfoCard label="Funeral Cover"    value={p?.funeralCover?.memberPremium?`R${p.funeralCover.memberPremium}/mo`:'—'} color={T.purple} sub={p?.funeralCover?.scheme}/>
                <InfoCard label="Ext. Funeral"     value={p?.extendedFuneral?.available?'Available':'Not Set'} color='#7c3aed' sub={p?.extendedFuneral?.administrator}/>
              </div>

              {/* Underwriting check */}
              <Section title="Underwriting Check" color={T.orange}>
                <div style={{ fontSize:12, color:T.gray, marginBottom:10 }}>Enter a member's monthly salary to check if underwriting is required for GLA.</div>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ position:'relative', maxWidth:220 }}>
                    <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:12, fontWeight:700, color:T.gray }}>R</span>
                    <input type="number" value={testSalary} onChange={e=>setSalary(e.target.value)} placeholder="Monthly salary" style={{...inputSt, paddingLeft:24}}/>
                  </div>
                  <span style={{ fontSize:11, color:T.gray }}>per month</span>
                </div>
                <UWCheck salary={testSalary} freeCoverLimit={p?.groupLife?.freeCoverLimit} benefit={p?.groupLife?.benefit}/>
              </Section>

              {/* Contribution categories */}
              {cats.length > 0 && (
                <Section title="Contribution Categories" color={T.blue}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ borderBottom:`2px solid ${T.border}` }}>
                      {['Category','Employer %','Employee %','Total %'].map(h=>(
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{cats.map((cat,i)=>(
                      <tr key={i} style={{ borderBottom:'1px solid #f3f4f6' }}>
                        <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600 }}>{cat.category}</td>
                        <td style={{ padding:'10px 12px' }}><span style={{ fontSize:13, fontWeight:700, color:T.blue, background:'#eff6ff', padding:'2px 10px', borderRadius:20 }}>{cat.employer}%</span></td>
                        <td style={{ padding:'10px 12px' }}><span style={{ fontSize:13, fontWeight:700, color:T.orange, background:T.orangeL, padding:'2px 10px', borderRadius:20 }}>{cat.employee}%</span></td>
                        <td style={{ padding:'10px 12px' }}><span style={{ fontSize:13, fontWeight:800, color:'#059669', background:'#f0fdf4', padding:'2px 10px', borderRadius:20 }}>{(cat.employer||0)+(cat.employee||0)}%</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </Section>
              )}
            </div>
          )}

          {/* ── BENEFIT STRUCTURE ── */}
          {activeTab === 'benefits' && (
            <div>
              <Section title="Benefit Structure" color={T.navy}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
                  {[
                    ['Retirement Fund', !!p?.retirementFund?.name,  T.blue],
                    ['Group Life (GLA)',!!p?.groupLife?.rate,        '#059669'],
                    ['Disability (PHI)',!!p?.disability?.rate,       T.amber],
                    ['Medical Aid',    !!p?.medicalAid?.scheme,      T.red],
                    ['Funeral Cover',  !!p?.funeralCover?.memberPremium, T.purple],
                    ['Ext. Funeral',   !!p?.extendedFuneral?.available, '#7c3aed'],
                  ].map(([label,active,color])=>(
                    <div key={label} style={{ padding:'14px 16px', borderRadius:10, background:active?color+'10':'#f9fafb', border:`1.5px solid ${active?color+'30':T.border}`, display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:active?color:'#d1d5db', flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:active?color:T.gray }}>{label}</div>
                        <div style={{ fontSize:10, color:T.gray }}>{active?'Configured':'Not configured'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* ── RETIREMENT FUND ── */}
          {activeTab === 'retirement' && (
            editing ? (
              <Section title="Retirement Fund" color={T.blue}>
                <Grid>
                  <EField label="Fund Name" wide><input value={p?.retirementFund?.name||''} onChange={e=>setD('retirementFund.name',e.target.value)} style={inputSt}/></EField>
                  <EField label="Fund Code"><input value={p?.retirementFund?.fundCode||''} onChange={e=>setD('retirementFund.fundCode',e.target.value)} style={inputSt}/></EField>
                  <EField label="Administrator"><input value={p?.retirementFund?.administrator||''} onChange={e=>setD('retirementFund.administrator',e.target.value)} style={inputSt}/></EField>
                  <EField label="Normal Retirement Age"><input type="number" value={p?.retirementFund?.normalRetirementAge||65} onChange={e=>setD('retirementFund.normalRetirementAge',+e.target.value)} style={inputSt}/></EField>
                  <EField label="Administration Cost (R/member)"><input type="number" step="0.01" value={p?.retirementFund?.administrationCost||0} onChange={e=>setD('retirementFund.administrationCost',+e.target.value)} style={inputSt}/></EField>
                </Grid>
                <div style={{ marginTop:16 }}>
                  <FieldLabel>Contribution Categories</FieldLabel>
                  {cats.map((cat,i)=>(
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:8, marginBottom:8 }}>
                      <input value={cat.category} onChange={e=>{const c=[...cats];c[i]={...c[i],category:e.target.value};setD('retirementFund.contributionCategories',c)}} style={{...inputSt,fontSize:12}}/>
                      <input type="number" step="0.1" value={cat.employer} onChange={e=>{const c=[...cats];c[i]={...c[i],employer:+e.target.value};setD('retirementFund.contributionCategories',c)}} style={{...inputSt,fontSize:12}} placeholder="Employer %"/>
                      <input type="number" step="0.1" value={cat.employee} onChange={e=>{const c=[...cats];c[i]={...c[i],employee:+e.target.value};setD('retirementFund.contributionCategories',c)}} style={{...inputSt,fontSize:12}} placeholder="Employee %"/>
                      <button onClick={()=>{const c=cats.filter((_,j)=>j!==i);setD('retirementFund.contributionCategories',c)}} style={{background:'none',border:'none',cursor:'pointer',color:T.red,fontSize:18}}>×</button>
                    </div>
                  ))}
                  <button onClick={()=>setD('retirementFund.contributionCategories',[...cats,{category:`Category ${cats.length+1}`,employer:5,employee:0}])} style={{fontSize:12,color:T.blue,background:'none',border:`1px dashed ${T.blue}`,borderRadius:7,padding:'5px 12px',cursor:'pointer',fontFamily:'inherit'}}>+ Add Category</button>
                </div>
              </Section>
            ) : (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:16 }}>
                  <InfoCard label="Fund Name"      value={p?.retirementFund?.name}          color={T.blue} wide/>
                  <InfoCard label="Fund Code"      value={p?.retirementFund?.fundCode}      color={T.blue} mono/>
                  <InfoCard label="Administrator"  value={p?.retirementFund?.administrator} color={T.navy}/>
                  <InfoCard label="Retirement Age" value={p?.retirementFund?.normalRetirementAge?`Age ${p.retirementFund.normalRetirementAge}`:'—'} color={T.navy}/>
                  <InfoCard label="Admin Cost"     value={p?.retirementFund?.administrationCost?`R${p.retirementFund.administrationCost}/member`:'—'} color={T.purple} mono/>
                </div>
                {cats.length > 0 && (
                  <Section title="Contribution Categories" color={T.blue}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead><tr style={{ borderBottom:`2px solid ${T.border}` }}>{['Category','Employer %','Employee %','Total %'].map(h=><th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>{h}</th>)}</tr></thead>
                      <tbody>{cats.map((cat,i)=><tr key={i} style={{ borderBottom:'1px solid #f3f4f6' }}>
                        <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600 }}>{cat.category}</td>
                        <td style={{ padding:'10px 12px' }}><span style={{ fontSize:13, fontWeight:700, color:T.blue, background:'#eff6ff', padding:'2px 10px', borderRadius:20 }}>{cat.employer}%</span></td>
                        <td style={{ padding:'10px 12px' }}><span style={{ fontSize:13, fontWeight:700, color:T.orange, background:T.orangeL, padding:'2px 10px', borderRadius:20 }}>{cat.employee}%</span></td>
                        <td style={{ padding:'10px 12px' }}><span style={{ fontSize:13, fontWeight:800, color:'#059669', background:'#f0fdf4', padding:'2px 10px', borderRadius:20 }}>{(cat.employer||0)+(cat.employee||0)}%</span></td>
                      </tr>)}</tbody>
                    </table>
                  </Section>
                )}
              </div>
            )
          )}

          {/* ── GROUP LIFE & PHI ── */}
          {activeTab === 'risk' && (
            editing ? (
              <div>
                <Section title="Group Life Assurance" color='#059669'>
                  <Grid>
                    <EField label="Administrator"><input value={p?.groupLife?.administrator||''} onChange={e=>setD('groupLife.administrator',e.target.value)} style={inputSt}/></EField>
                    <EField label="Scheme Number"><input value={p?.groupLife?.schemeNumber||''} onChange={e=>setD('groupLife.schemeNumber',e.target.value)} style={inputSt}/></EField>
                    <EField label="Benefit"><input value={p?.groupLife?.benefit||''} onChange={e=>setD('groupLife.benefit',e.target.value)} style={inputSt} placeholder="e.g. 3 × Annual Salary"/></EField>
                    <EField label="Rate (%)"><input type="number" step="0.01" value={p?.groupLife?.rate||0} onChange={e=>setD('groupLife.rate',+e.target.value)} style={inputSt}/></EField>
                    <EField label="Free Cover Limit (R)"><input type="number" value={p?.groupLife?.freeCoverLimit||0} onChange={e=>setD('groupLife.freeCoverLimit',+e.target.value)} style={inputSt}/></EField>
                    <EField label="Benefit Expiry Age"><input type="number" value={p?.groupLife?.benefitExpiryAge||65} onChange={e=>setD('groupLife.benefitExpiryAge',+e.target.value)} style={inputSt}/></EField>
                    <EField label="Global Ed. Protector"><input value={p?.groupLife?.globalEducationProtector||''} onChange={e=>setD('groupLife.globalEducationProtector',e.target.value)} style={inputSt}/></EField>
                  </Grid>
                </Section>
                <Section title="Income Disability Benefit (PHI)" color={T.amber}>
                  <Grid>
                    <EField label="Rate (%)"><input type="number" step="0.01" value={p?.disability?.rate||0} onChange={e=>setD('disability.rate',+e.target.value)} style={inputSt}/></EField>
                    <EField label="Waiting Period (months)"><input type="number" value={p?.disability?.waitingPeriodMonths||3} onChange={e=>setD('disability.waitingPeriodMonths',+e.target.value)} style={inputSt}/></EField>
                    <EField label="Escalation (%)"><input type="number" step="0.01" value={p?.disability?.escalationPercent||5} onChange={e=>setD('disability.escalationPercent',+e.target.value)} style={inputSt}/></EField>
                    <EField label="Benefit Expiry Age"><input type="number" value={p?.disability?.benefitExpiryAge||65} onChange={e=>setD('disability.benefitExpiryAge',+e.target.value)} style={inputSt}/></EField>
                    <EField label="Contribution Protector (months)"><input type="number" value={p?.disability?.contributionProtectorMonths||12} onChange={e=>setD('disability.contributionProtectorMonths',+e.target.value)} style={inputSt}/></EField>
                  </Grid>
                </Section>
              </div>
            ) : (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:16 }}>
                  <RateCard label="GLA Rate"  rate={p?.groupLife?.rate}    color='#059669' sub={`Scheme ${p?.groupLife?.schemeNumber||'—'}`}/>
                  <RateCard label="PHI Rate"  rate={p?.disability?.rate}   color={T.amber} sub={`${p?.disability?.waitingPeriodMonths||3} month waiting`}/>
                  <InfoCard label="Benefit"          value={p?.groupLife?.benefit}               color='#059669'/>
                  <InfoCard label="Free Cover Limit" value={p?.groupLife?.freeCoverLimit?`R${p.groupLife.freeCoverLimit.toLocaleString()}`:'—'} color={T.orange}/>
                  <InfoCard label="GLA Expiry Age"   value={p?.groupLife?.benefitExpiryAge?`Age ${p.groupLife.benefitExpiryAge}`:'—'}           color={T.navy}/>
                  <InfoCard label="PHI Escalation"   value={p?.disability?.escalationPercent?`${p.disability.escalationPercent}%`:'—'}           color={T.amber}/>
                  <InfoCard label="GLA Administrator" value={p?.groupLife?.administrator}         color={T.navy}/>
                  <InfoCard label="Ed. Protector"    value={p?.groupLife?.globalEducationProtector} color={T.purple}/>
                </div>
                <Section title="Underwriting Check" color={T.orange}>
                  <div style={{ fontSize:12, color:T.gray, marginBottom:10 }}>Test if a member's salary requires underwriting.</div>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ position:'relative', maxWidth:220 }}>
                      <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:12, fontWeight:700, color:T.gray }}>R</span>
                      <input type="number" value={testSalary} onChange={e=>setSalary(e.target.value)} placeholder="Monthly salary" style={{...inputSt,paddingLeft:24}}/>
                    </div>
                    <span style={{ fontSize:11, color:T.gray }}>per month</span>
                  </div>
                  <UWCheck salary={testSalary} freeCoverLimit={p?.groupLife?.freeCoverLimit} benefit={p?.groupLife?.benefit}/>
                </Section>
              </div>
            )
          )}

          {/* ── MEDICAL AID ── */}
          {activeTab === 'medical' && (
            editing ? (
              <Section title="Medical Aid" color={T.red}>
                <Grid>
                  <EField label="Scheme" wide><input value={p?.medicalAid?.scheme||''} onChange={e=>setD('medicalAid.scheme',e.target.value)} style={inputSt}/></EField>
                  <EField label="Scheme Number"><input value={p?.medicalAid?.schemeNumber||''} onChange={e=>setD('medicalAid.schemeNumber',e.target.value)} style={inputSt}/></EField>
                  <EField label="Billing Method"><select value={p?.medicalAid?.billingMethod||'Arrears'} onChange={e=>setD('medicalAid.billingMethod',e.target.value)} style={selectSt}><option>Arrears</option><option>In Advance</option></select></EField>
                  <EField label="Billing Due Date"><input value={p?.medicalAid?.billingDueDate||''} onChange={e=>setD('medicalAid.billingDueDate',e.target.value)} style={inputSt} placeholder="e.g. 14th"/></EField>
                  <EField label="Payment Method"><select value={p?.medicalAid?.paymentMethod||'Debit Order'} onChange={e=>setD('medicalAid.paymentMethod',e.target.value)} style={selectSt}><option>Debit Order</option><option>EFT</option><option>Payroll Deduction</option></select></EField>
                </Grid>
              </Section>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
                <InfoCard label="Scheme"         value={p?.medicalAid?.scheme}          color={T.red} wide/>
                <InfoCard label="Scheme Number"  value={p?.medicalAid?.schemeNumber}    color={T.blue} mono/>
                <InfoCard label="Billing Method" value={p?.medicalAid?.billingMethod}   color={T.navy}/>
                <InfoCard label="Due Date"       value={p?.medicalAid?.billingDueDate}  color={T.navy}/>
                <InfoCard label="Payment Method" value={p?.medicalAid?.paymentMethod}   color={T.purple}/>
                <InfoCard label="Compulsory"     value={p?.medicalAid?.compulsory?'Yes':'No'} color={p?.medicalAid?.compulsory?'#059669':'#9ca3af'}/>
              </div>
            )
          )}

          {/* ── FUNERAL COVER ── */}
          {activeTab === 'funeral' && (
            editing ? (
              <div>
                <Section title="Main Policy Funeral Cover" color={T.purple}>
                  <Grid>
                    <EField label="Scheme" wide><input value={p?.funeralCover?.scheme||''} onChange={e=>setD('funeralCover.scheme',e.target.value)} style={inputSt}/></EField>
                    <EField label="Administrator"><input value={p?.funeralCover?.administrator||''} onChange={e=>setD('funeralCover.administrator',e.target.value)} style={inputSt}/></EField>
                    <EField label="Member Premium (R/mo)"><input type="number" step="0.01" value={p?.funeralCover?.memberPremium||0} onChange={e=>setD('funeralCover.memberPremium',+e.target.value)} style={inputSt}/></EField>
                    <EField label="Member Cover (R)"><input type="number" value={p?.funeralCover?.memberCover||0} onChange={e=>setD('funeralCover.memberCover',+e.target.value)} style={inputSt}/></EField>
                    <EField label="Spouse Cover (R)"><input type="number" value={p?.funeralCover?.spouseCover||0} onChange={e=>setD('funeralCover.spouseCover',+e.target.value)} style={inputSt}/></EField>
                    <EField label="Child Cover (R)"><input type="number" value={p?.funeralCover?.childCover||0} onChange={e=>setD('funeralCover.childCover',+e.target.value)} style={inputSt}/></EField>
                  </Grid>
                </Section>
                <Section title="Extended Family Funeral Cover" color='#7c3aed'>
                  <Grid>
                    <EField label="Available">
                      <div style={{ display:'flex', gap:12 }}>
                        {['Yes','No'].map(opt=>(
                          <button key={opt} onClick={()=>setD('extendedFuneral.available', opt==='Yes')}
                            style={{ padding:'7px 16px', borderRadius:7, border:`1.5px solid ${(p?.extendedFuneral?.available?'Yes':'No')===opt?'#7c3aed':T.border}`, background:(p?.extendedFuneral?.available?'Yes':'No')===opt?'#f5f3ff':'#fff', color:(p?.extendedFuneral?.available?'Yes':'No')===opt?'#7c3aed':T.text, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </EField>
                    <EField label="Administrator"><input value={p?.extendedFuneral?.administrator||''} onChange={e=>setD('extendedFuneral.administrator',e.target.value)} style={inputSt}/></EField>
                    <EField label="Scheme Name"><input value={p?.extendedFuneral?.scheme||''} onChange={e=>setD('extendedFuneral.scheme',e.target.value)} style={inputSt}/></EField>
                    <EField label="Spouse Premium (R/mo)"><input type="number" step="0.01" value={p?.extendedFuneral?.spousePremium||0} onChange={e=>setD('extendedFuneral.spousePremium',+e.target.value)} style={inputSt}/></EField>
                    <EField label="Child Premium (R/mo)"><input type="number" step="0.01" value={p?.extendedFuneral?.childPremium||0} onChange={e=>setD('extendedFuneral.childPremium',+e.target.value)} style={inputSt}/></EField>
                    <EField label="Parent Premium (R/mo)"><input type="number" step="0.01" value={p?.extendedFuneral?.parentPremium||0} onChange={e=>setD('extendedFuneral.parentPremium',+e.target.value)} style={inputSt}/></EField>
                  </Grid>
                </Section>
              </div>
            ) : (
              <div>
                <Section title="Main Policy Funeral Cover" color={T.purple}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
                    <InfoCard label="Scheme"          value={p?.funeralCover?.scheme}         color={T.purple}/>
                    <InfoCard label="Administrator"   value={p?.funeralCover?.administrator}  color={T.navy}/>
                    <InfoCard label="Member Premium"  value={p?.funeralCover?.memberPremium?`R${p.funeralCover.memberPremium}/mo`:'—'} color={T.purple} mono/>
                    <InfoCard label="Member Cover"    value={p?.funeralCover?.memberCover?`R${p.funeralCover.memberCover.toLocaleString()}`:'—'} color={T.purple}/>
                    <InfoCard label="Spouse Cover"    value={p?.funeralCover?.spouseCover?`R${p.funeralCover.spouseCover.toLocaleString()}`:'—'} color='#7c3aed'/>
                    <InfoCard label="Child Cover"     value={p?.funeralCover?.childCover?`R${p.funeralCover.childCover.toLocaleString()}`:'—'} color='#7c3aed'/>
                  </div>
                </Section>
                <Section title="Extended Family Funeral Cover" color='#7c3aed'>
                  {p?.extendedFuneral?.available ? (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
                      <InfoCard label="Scheme"          value={p?.extendedFuneral?.scheme}           color='#7c3aed'/>
                      <InfoCard label="Administrator"   value={p?.extendedFuneral?.administrator}    color={T.navy}/>
                      <InfoCard label="Spouse Premium"  value={p?.extendedFuneral?.spousePremium?`R${p.extendedFuneral.spousePremium}/mo`:'—'} color='#7c3aed' mono/>
                      <InfoCard label="Child Premium"   value={p?.extendedFuneral?.childPremium?`R${p.extendedFuneral.childPremium}/mo`:'—'}  color='#7c3aed' mono/>
                      <InfoCard label="Parent Premium"  value={p?.extendedFuneral?.parentPremium?`R${p.extendedFuneral.parentPremium}/mo`:'—'} color='#7c3aed' mono/>
                    </div>
                  ) : (
                    <div style={{ textAlign:'center', padding:24, color:T.gray }}>
                      <div style={{ fontSize:13, marginBottom:8 }}>Extended Family Funeral Cover not configured.</div>
                      {canEdit && !editing && <button onClick={startEdit} style={{ fontSize:12, color:'#7c3aed', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Configure now →</button>}
                    </div>
                  )}
                </Section>
              </div>
            )
          )}

          {/* ── BILLING RULES ── */}
          {activeTab === 'billing' && (
            editing ? (
              <Section title="Billing Rules" color={T.navy}>
                <Grid>
                  <EField label="Billing Method"><select value={p?.billingMethod||'Arrears'} onChange={e=>setD('billingMethod',e.target.value)} style={selectSt}><option>Arrears</option><option>In Advance</option></select></EField>
                  <EField label="Billing Due Date"><input value={p?.billingDueDate||''} onChange={e=>setD('billingDueDate',e.target.value)} style={inputSt} placeholder="e.g. 14th"/></EField>
                  <EField label="Payment Method"><select value={p?.paymentMethod||'Debit Order'} onChange={e=>setD('paymentMethod',e.target.value)} style={selectSt}><option>Debit Order</option><option>EFT</option><option>Payroll Deduction</option></select></EField>
                  <EField label="Payroll Contact"><input value={p?.payrollContact||''} onChange={e=>setD('payrollContact',e.target.value)} style={inputSt}/></EField>
                  <EField label="Payroll Email"><input value={p?.payrollEmail||''} onChange={e=>setD('payrollEmail',e.target.value)} style={inputSt}/></EField>
                  <EField label="Payroll Phone"><input value={p?.payrollPhone||''} onChange={e=>setD('payrollPhone',e.target.value)} style={inputSt}/></EField>
                </Grid>
              </Section>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
                <InfoCard label="Billing Method"  value={p?.billingMethod}   color={T.navy}/>
                <InfoCard label="Due Date"        value={p?.billingDueDate}  color={T.navy}/>
                <InfoCard label="Payment Method"  value={p?.paymentMethod}   color={T.purple}/>
                <InfoCard label="Payroll Contact" value={p?.payrollContact}  color={T.blue}/>
                <InfoCard label="Payroll Email"   value={p?.payrollEmail}    color={T.blue} mono/>
                <InfoCard label="Payroll Phone"   value={p?.payrollPhone}    color={T.blue} mono/>
              </div>
            )
          )}

          {/* ── DOCUMENTS ── */}
          {activeTab === 'documents' && (
            <div>
              <Section title="Documents" color={T.navy}>
                <div style={{ textAlign:'center', padding:32, color:T.gray }}>
                  <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:6 }}>Document storage coming in Phase 2</div>
                  <div style={{ fontSize:12 }}>Inhouse packs, amendment letters and correspondence will be stored here.</div>
                </div>
              </Section>
            </div>
          )}

          {/* ── MEMBERSHIP ── */}
          {activeTab === 'membership' && (
            <Section title="Membership Register" color={T.blue}>
              {empMembers.length === 0 ? (
                <div style={{ textAlign:'center', padding:32, color:T.gray }}>
                  <div style={{ fontSize:13 }}>No members loaded for this employer.</div>
                  <div style={{ fontSize:11, marginTop:4 }}>Upload a billing schedule via Billing to load members.</div>
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>
                      {['Member','Payroll No.','Category','Premium','Status'].map(h=>(
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{empMembers.slice(0,20).map(m=>(
                      <tr key={m.id} style={{ borderBottom:'1px solid #f9fafb' }}>
                        <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600 }}>{m.memberName} {m.surname}</td>
                        <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:11, color:T.blue }}>{m.payrollNumber||'—'}</td>
                        <td style={{ padding:'9px 12px', fontSize:12 }}>{m.benefitCategory||'—'}</td>
                        <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#059669' }}>{m.monthlyPremium?`R${m.monthlyPremium}`:'—'}</td>
                        <td style={{ padding:'9px 12px' }}>
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:m.status==='Active'?'#f0fdf4':'#fffbeb', color:m.status==='Active'?'#059669':'#d97706' }}>{m.status}</span>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {empMembers.length > 20 && <div style={{ textAlign:'center', padding:10, fontSize:12, color:T.gray }}>Showing 20 of {empMembers.length} members</div>}
                </div>
              )}
            </Section>
          )}

          {/* ── CASES ── */}
          {activeTab === 'cases' && (
            <Section title="Cases" color={T.blue}>
              {empCases.length === 0 ? (
                <div style={{ textAlign:'center', padding:32, color:T.gray, fontSize:13 }}>No cases for this employer.</div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>
                      {['Ref','Case Type','Member','Status','Created'].map(h=>(
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{empCases.slice(0,20).map(c=>(
                      <tr key={c.id} style={{ borderBottom:'1px solid #f9fafb' }}>
                        <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:11, color:T.blue }}>{c.ref}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600 }}>{c.caseTypeName}</td>
                        <td style={{ padding:'9px 12px', fontSize:12 }}>{c.memberName||'—'}</td>
                        <td style={{ padding:'9px 12px' }}>
                          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#f9fafb', color:T.gray }}>{c.status}</span>
                        </td>
                        <td style={{ padding:'9px 12px', fontSize:11, color:T.gray }}>{c.created}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          {/* ── BILLING HISTORY ── */}
          {activeTab === 'history' && (
            <Section title="Billing History" color={T.navy}>
              <div style={{ textAlign:'center', padding:32, color:T.gray }}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:6 }}>Billing history coming in Phase 3</div>
                <div style={{ fontSize:12 }}>Monthly billing records will be stored and accessible here once the billing engine is active.</div>
              </div>
            </Section>
          )}

        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}
