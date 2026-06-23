import { useState } from 'react'
import { T, emptyBenefitProfile } from '../data.js'
import { Btn, inputSt, selectSt } from '../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// EMPLOYER BENEFIT PROFILES — Redesigned
// ═════════════════════════════════════════════════════════════════════════════

// ── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, mono, alert }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, padding:'16px 18px', border:`1.5px solid ${alert?'#fde68a':color+'25'}`, display:'flex', flexDirection:'column', gap:4, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${color},${color}88)` }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <span style={{ fontSize:22 }}>{icon}</span>
        {alert && <span style={{ fontSize:10, fontWeight:700, color:'#92400e', background:'#fef3c7', padding:'2px 8px', borderRadius:20 }}>⚠ {alert}</span>}
      </div>
      <div style={{ fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:800, color, fontFamily:mono?'monospace':'inherit', lineHeight:1.2 }}>{value||'—'}</div>
      {sub && <div style={{ fontSize:11, color:T.gray }}>{sub}</div>}
    </div>
  )
}

// ── DETAIL ROW ───────────────────────────────────────────────────────────────
function DetailRow({ label, value, mono, highlight, wide, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3, gridColumn:wide?'1/-1':undefined }}>
      <div style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
      {children || (
        <div style={{ fontSize:13, fontWeight:highlight?700:500, color:highlight?T.orange:T.text, fontFamily:mono?'monospace':'inherit' }}>{value||'—'}</div>
      )}
    </div>
  )
}

function DetailGrid({ children }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>{children}</div>
}

// ── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ label, active }) {
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:active?'#f0fdf4':'#f3f4f6', color:active?T.green:'#9ca3af', border:`1px solid ${active?'#bbf7d0':'#e5e7eb'}` }}>
      {active ? '✓' : '✗'} {label}
    </span>
  )
}

// ── SECTION CARD ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon, color, children, action }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden', marginBottom:16 }}>
      <div style={{ padding:'13px 18px', background:`linear-gradient(135deg,${color}15,${color}05)`, borderBottom:`1px solid ${color}20`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <span style={{ fontSize:20 }}>{icon}</span>
          <span style={{ fontSize:14, fontWeight:700, color }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding:'16px 18px' }}>{children}</div>
    </div>
  )
}

// ── UNDERWRITING CHECK ───────────────────────────────────────────────────────
function UnderwritingCheck({ salary, glaRate, freeCoverLimit, benefit }) {
  if (!salary || !freeCoverLimit) return null
  const salaryNum    = parseFloat(String(salary).replace(/[^0-9.]/g,''))
  const annualSalary = salaryNum * 12
  // Parse benefit multiple (e.g. "3 × Annual Salary" → 3)
  const multiple    = parseFloat((benefit||'3').match(/[\d.]+/)?.[0]||3)
  const glaBenefit  = annualSalary * multiple
  const requiresUW  = glaBenefit > freeCoverLimit

  return (
    <div style={{ background:requiresUW?'#fff7ed':'#f0fdf4', border:`1.5px solid ${requiresUW?'#fed7aa':'#bbf7d0'}`, borderRadius:10, padding:'12px 16px', marginTop:12 }}>
      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
        <span style={{ fontSize:22 }}>{requiresUW?'⚠️':'✅'}</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:requiresUW?'#c2410c':T.green, marginBottom:4 }}>
            {requiresUW ? 'Underwriting Required' : 'Within Free Cover Limit'}
          </div>
          <div style={{ fontSize:12, color:'#374151', lineHeight:1.6 }}>
            GLA Benefit: <strong>R{glaBenefit.toLocaleString()}</strong> ({multiple}× R{annualSalary.toLocaleString()} annual salary)<br/>
            Free Cover Limit: <strong>R{freeCoverLimit.toLocaleString()}</strong><br/>
            {requiresUW
              ? `Benefit exceeds free cover limit by R${(glaBenefit-freeCoverLimit).toLocaleString()} — underwriting required.`
              : `Benefit is within the free cover limit — no underwriting required.`
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ── EDIT FIELD ───────────────────────────────────────────────────────────────
function EField({ label, children, wide }) {
  return (
    <div style={{ gridColumn:wide?'1/-1':undefined }}>
      <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>{label}</label>
      {children}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function EmployerBenefitProfiles({ employers, benefitProfiles, currentUser, onUpdateProfile }) {
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [editing, setEditing]         = useState(false)
  const [draft, setDraft]             = useState(null)
  const [activeTab, setTab]           = useState('overview')
  const [testSalary, setTestSalary]   = useState('')

  const canEdit = ['general_manager','administrator'].includes(currentUser.role)

  const profile = selectedEmp
    ? (benefitProfiles[selectedEmp.id] || emptyBenefitProfile(selectedEmp.id, selectedEmp.name))
    : null

  function startEdit() { setDraft(JSON.parse(JSON.stringify(profile))); setEditing(true) }
  function saveEdit()  { onUpdateProfile(selectedEmp.id, draft); setEditing(false); setDraft(null) }

  function setD(path, value) {
    setDraft(prev => {
      const next  = { ...prev }
      const parts = path.split('.')
      let obj = next
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...obj[parts[i]] }
        obj = obj[parts[i]]
      }
      obj[parts[parts.length-1]] = value
      return next
    })
  }

  const tabs = ['overview','retirement_fund','group_life','disability','medical_aid','funeral_cover']
  const tabLabels = { overview:'Overview', retirement_fund:'Retirement Fund', group_life:'Group Life', disability:'Disability', medical_aid:'Medical Aid', funeral_cover:'Funeral Cover' }
  const tabIcons  = { overview:'🏢', retirement_fund:'🏦', group_life:'🛡️', disability:'♿', medical_aid:'🏥', funeral_cover:'🏛️' }

  return (
    <div style={{ display:'flex', gap:0, height:'100%', animation:'fadeIn .3s ease' }}>

      {/* LEFT PANEL — employer list */}
      <div style={{ width:260, flexShrink:0, borderRight:`1px solid ${T.border}`, display:'flex', flexDirection:'column', background:'#fff', height:'100%', overflowY:'auto' }}>
        <div style={{ padding:'16px 16px 10px', borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontSize:14, fontWeight:800, color:T.text, marginBottom:2 }}>Benefit Profiles</div>
          <div style={{ fontSize:11, color:T.gray }}>{employers.length} employer{employers.length!==1?'s':''}</div>
        </div>
        <div style={{ padding:'8px' }}>
          {employers.map(emp => {
            const hasProfile = !!benefitProfiles[emp.id]
            const isSelected = selectedEmp?.id === emp.id
            return (
              <button key={emp.id} onClick={() => { setSelectedEmp(emp); setEditing(false); setDraft(null); setTab('overview') }}
                style={{ width:'100%', padding:'10px 12px', borderRadius:9, border:`1.5px solid ${isSelected?T.orange:'transparent'}`, background:isSelected?T.orangeL:'transparent', textAlign:'left', cursor:'pointer', fontFamily:'inherit', marginBottom:2, transition:'all .12s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:13, fontWeight:isSelected?700:500, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, marginRight:6 }}>{emp.name}</div>
                  {hasProfile && <span style={{ fontSize:9, fontWeight:700, color:T.green, background:'#f0fdf4', padding:'1px 6px', borderRadius:8, flexShrink:0 }}>✓</span>}
                </div>
                <div style={{ fontSize:10, color:T.gray, marginTop:1 }}>{emp.number}</div>
              </button>
            )
          })}
          {employers.length === 0 && (
            <div style={{ textAlign:'center', padding:24, color:T.gray, fontSize:12 }}>No employers yet.</div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex:1, overflow:'auto', background:'#f8f9fb' }}>
        {!selectedEmp ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:T.gray, gap:12 }}>
            <div style={{ fontSize:56 }}>🏢</div>
            <div style={{ fontSize:15, fontWeight:700, color:T.text }}>Select an Employer</div>
            <div style={{ fontSize:12 }}>Choose from the list to view or edit their benefit profile.</div>
          </div>
        ) : (
          <div>
            {/* Employer hero header */}
            <div style={{ background:`linear-gradient(135deg,${T.navy},#2d5a8e)`, padding:'24px 28px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px' }}>Benefit Profile</div>
                  <div style={{ fontSize:22, fontWeight:900, color:'#fff', marginBottom:4 }}>{selectedEmp.name}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', display:'flex', gap:12 }}>
                    {profile?.payrollContact && <span>👤 {profile.payrollContact}</span>}
                    {profile?.effectiveDate  && <span>📅 Effective {profile.effectiveDate}</span>}
                  </div>
                </div>
                {canEdit && !editing && (
                  <button onClick={startEdit} style={{ padding:'8px 16px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:8, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', backdropFilter:'blur(4px)' }}>
                    ✏️ Edit Profile
                  </button>
                )}
                {editing && (
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={saveEdit} style={{ padding:'8px 16px', background:T.green, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Save Changes</button>
                    <button onClick={()=>{setEditing(false);setDraft(null)}} style={{ padding:'8px 16px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:8, color:'#fff', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                  </div>
                )}
              </div>

              {/* Benefit pills */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[
                  [!!profile?.retirementFund?.name,  '🏦', profile?.retirementFund?.name||'Retirement Fund'],
                  [!!profile?.groupLife?.schemeNumber,'🛡️', `GLA ${profile?.groupLife?.rate||0}%`],
                  [!!profile?.disability?.rate,       '♿', `PHI ${profile?.disability?.rate||0}%`],
                  [!!profile?.medicalAid?.scheme,     '🏥', profile?.medicalAid?.scheme],
                ].map(([active, icon, label], i) => (
                  <span key={i} style={{ fontSize:11, fontWeight:600, padding:'4px 12px', borderRadius:20, background:active?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.06)', color:active?'#fff':'rgba(255,255,255,0.3)', border:`1px solid ${active?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.1)'}` }}>
                    {icon} {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ background:'#fff', borderBottom:`1px solid ${T.border}`, display:'flex', overflowX:'auto', paddingLeft:8 }}>
              {tabs.map(t => (
                <button key={t} onClick={()=>setTab(t)}
                  style={{ padding:'12px 16px', background:'none', border:'none', borderBottom:activeTab===t?`2px solid ${T.orange}`:'2px solid transparent', color:activeTab===t?T.orange:T.gray, fontWeight:activeTab===t?700:400, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', marginBottom:-1, display:'flex', alignItems:'center', gap:5 }}>
                  {tabIcons[t]} {tabLabels[t]}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding:24 }}>

              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div>
                  {/* Key metrics grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
                    <StatCard icon="🏦" label="Retirement Fund"  value={profile?.retirementFund?.name||'—'}          color={T.blue}   sub={profile?.retirementFund?.fundCode}/>
                    <StatCard icon="🛡️" label="GLA Rate"         value={profile?.groupLife?.rate?`${profile.groupLife.rate}%`:'—'} color="#059669" sub={`Scheme ${profile?.groupLife?.schemeNumber||'—'}`}/>
                    <StatCard icon="♿" label="PHI Rate"          value={profile?.disability?.rate?`${profile.disability.rate}%`:'—'} color={T.amber} sub={`${profile?.disability?.waitingPeriodMonths||3} month waiting period`}/>
                    <StatCard icon="🏥" label="Medical Aid"       value={profile?.medicalAid?.scheme||'—'}             color={T.red}    sub={`Scheme ${profile?.medicalAid?.schemeNumber||'—'}`}/>
                    <StatCard icon="💰" label="Admin Cost"        value={profile?.retirementFund?.administrationCost?`R${profile.retirementFund.administrationCost}/member`:'—'} color={T.purple} mono/>
                    <StatCard icon="🎂" label="Retirement Age"    value={profile?.retirementAge?`Age ${profile.retirementAge}`:'—'} color={T.navy}/>
                  </div>

                  {/* Underwriting test tool */}
                  <SectionCard title="Underwriting Check" icon="⚖️" color={T.orange}>
                    <div style={{ fontSize:12, color:T.gray, marginBottom:10, lineHeight:1.6 }}>
                      Enter a member's monthly salary to check whether their GLA benefit exceeds the free cover limit and requires underwriting.
                    </div>
                    <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:4 }}>
                      <div style={{ position:'relative', flex:1, maxWidth:240 }}>
                        <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:12, color:T.gray, fontWeight:700 }}>R</span>
                        <input type="number" value={testSalary} onChange={e=>setTestSalary(e.target.value)}
                          placeholder="Monthly salary" style={{ ...inputSt, paddingLeft:24 }}/>
                      </div>
                      <span style={{ fontSize:11, color:T.gray }}>per month</span>
                    </div>
                    <UnderwritingCheck
                      salary={testSalary}
                      glaRate={profile?.groupLife?.rate}
                      freeCoverLimit={profile?.groupLife?.freeCoverLimit}
                      benefit={profile?.groupLife?.benefit}
                    />
                  </SectionCard>

                  {/* Contribution categories */}
                  {profile?.retirementFund?.contributionCategories?.length > 0 && (
                    <SectionCard title="Contribution Categories" icon="💰" color="#059669">
                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom:`2px solid #f3f4f6` }}>
                              {['Category','Employer %','Employee %','Total %'].map(h=>(
                                <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {profile.retirementFund.contributionCategories.map((cat,i)=>(
                              <tr key={i} style={{ borderBottom:'1px solid #f9fafb' }}>
                                <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600 }}>{cat.category}</td>
                                <td style={{ padding:'10px 12px' }}>
                                  <span style={{ fontSize:13, fontWeight:700, color:T.blue, background:'#eff6ff', padding:'2px 10px', borderRadius:20 }}>{cat.employer}%</span>
                                </td>
                                <td style={{ padding:'10px 12px' }}>
                                  <span style={{ fontSize:13, fontWeight:700, color:T.orange, background:T.orangeL, padding:'2px 10px', borderRadius:20 }}>{cat.employee}%</span>
                                </td>
                                <td style={{ padding:'10px 12px' }}>
                                  <span style={{ fontSize:13, fontWeight:800, color:T.green, background:'#f0fdf4', padding:'2px 10px', borderRadius:20 }}>{cat.employer+cat.employee}%</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </SectionCard>
                  )}

                  {/* Billing rules */}
                  <SectionCard title="Billing Rules" icon="💳" color={T.purple}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
                      {[
                        ['Billing Method',   profile?.billingMethod  ||'—'],
                        ['Due Date',         profile?.billingDueDate ||'—'],
                        ['Payment Method',   profile?.paymentMethod  ||'—'],
                        ['Payroll Contact',  profile?.payrollContact ||'—'],
                      ].map(([l,v])=>(
                        <div key={l} style={{ background:'#f5f3ff', borderRadius:9, padding:'12px 14px' }}>
                          <div style={{ fontSize:10, fontWeight:700, color:T.purple, textTransform:'uppercase', marginBottom:4 }}>{l}</div>
                          <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* ── RETIREMENT FUND ── */}
              {activeTab === 'retirement_fund' && (
                editing ? (
                  <SectionCard title="Retirement Fund" icon="🏦" color={T.blue}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <EField label="Fund Name" wide><input value={draft?.retirementFund?.name||''} onChange={e=>setD('retirementFund.name',e.target.value)} style={inputSt}/></EField>
                      <EField label="Fund Code"><input value={draft?.retirementFund?.fundCode||''} onChange={e=>setD('retirementFund.fundCode',e.target.value)} style={inputSt}/></EField>
                      <EField label="Administrator"><input value={draft?.retirementFund?.administrator||''} onChange={e=>setD('retirementFund.administrator',e.target.value)} style={inputSt}/></EField>
                      <EField label="Normal Retirement Age"><input type="number" value={draft?.retirementFund?.normalRetirementAge||65} onChange={e=>setD('retirementFund.normalRetirementAge',+e.target.value)} style={inputSt}/></EField>
                      <EField label="Administration Cost (R)"><input type="number" step="0.01" value={draft?.retirementFund?.administrationCost||0} onChange={e=>setD('retirementFund.administrationCost',+e.target.value)} style={inputSt}/></EField>
                    </div>
                    <div style={{ marginTop:16 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:10 }}>Contribution Categories</div>
                      {(draft?.retirementFund?.contributionCategories||[]).map((cat,i)=>(
                        <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:8, marginBottom:8, alignItems:'center' }}>
                          <input value={cat.category} onChange={e=>{const c=[...draft.retirementFund.contributionCategories];c[i]={...c[i],category:e.target.value};setD('retirementFund.contributionCategories',c)}} style={{...inputSt,fontSize:12}} placeholder="Category name"/>
                          <input type="number" value={cat.employer} onChange={e=>{const c=[...draft.retirementFund.contributionCategories];c[i]={...c[i],employer:+e.target.value};setD('retirementFund.contributionCategories',c)}} style={{...inputSt,fontSize:12}} placeholder="Employer %"/>
                          <input type="number" value={cat.employee} onChange={e=>{const c=[...draft.retirementFund.contributionCategories];c[i]={...c[i],employee:+e.target.value};setD('retirementFund.contributionCategories',c)}} style={{...inputSt,fontSize:12}} placeholder="Employee %"/>
                          <button onClick={()=>{const c=draft.retirementFund.contributionCategories.filter((_,j)=>j!==i);setD('retirementFund.contributionCategories',c)}} style={{background:'none',border:'none',cursor:'pointer',color:T.red,fontSize:18}}>×</button>
                        </div>
                      ))}
                      <button onClick={()=>{const c=[...(draft?.retirementFund?.contributionCategories||[]),{category:`Category ${(draft?.retirementFund?.contributionCategories?.length||0)+1}`,employer:5,employee:0}];setD('retirementFund.contributionCategories',c)}} style={{fontSize:12,color:T.blue,background:'none',border:`1px dashed ${T.blue}`,borderRadius:7,padding:'5px 12px',cursor:'pointer',fontFamily:'inherit'}}>+ Add Category</button>
                    </div>
                  </SectionCard>
                ) : (
                  <div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:20 }}>
                      <StatCard icon="🏦" label="Fund Name"          value={profile?.retirementFund?.name}         color={T.blue}   wide/>
                      <StatCard icon="🔢" label="Fund Code"          value={profile?.retirementFund?.fundCode}     color={T.blue}   mono/>
                      <StatCard icon="👤" label="Administrator"      value={profile?.retirementFund?.administrator} color={T.navy}/>
                      <StatCard icon="🎂" label="Retirement Age"     value={profile?.retirementFund?.normalRetirementAge?`Age ${profile.retirementFund.normalRetirementAge}`:'—'} color={T.navy}/>
                      <StatCard icon="💰" label="Administration Cost" value={profile?.retirementFund?.administrationCost?`R${profile.retirementFund.administrationCost}/member`:'—'} color={T.purple} mono/>
                    </div>
                    {profile?.retirementFund?.contributionCategories?.length > 0 && (
                      <SectionCard title="Contribution Categories" icon="💰" color="#059669">
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                          <thead><tr style={{ borderBottom:'2px solid #f3f4f6' }}>{['Category','Employer %','Employee %','Total %'].map(h=><th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>{h}</th>)}</tr></thead>
                          <tbody>{profile.retirementFund.contributionCategories.map((cat,i)=>(
                            <tr key={i} style={{ borderBottom:'1px solid #f9fafb' }}>
                              <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600 }}>{cat.category}</td>
                              <td style={{ padding:'10px 12px' }}><span style={{ fontSize:13, fontWeight:700, color:T.blue, background:'#eff6ff', padding:'2px 10px', borderRadius:20 }}>{cat.employer}%</span></td>
                              <td style={{ padding:'10px 12px' }}><span style={{ fontSize:13, fontWeight:700, color:T.orange, background:T.orangeL, padding:'2px 10px', borderRadius:20 }}>{cat.employee}%</span></td>
                              <td style={{ padding:'10px 12px' }}><span style={{ fontSize:13, fontWeight:800, color:T.green, background:'#f0fdf4', padding:'2px 10px', borderRadius:20 }}>{cat.employer+cat.employee}%</span></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </SectionCard>
                    )}
                  </div>
                )
              )}

              {/* ── GROUP LIFE ── */}
              {activeTab === 'group_life' && (
                editing ? (
                  <SectionCard title="Group Life Assurance" icon="🛡️" color="#059669">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <EField label="Administrator"><input value={draft?.groupLife?.administrator||''} onChange={e=>setD('groupLife.administrator',e.target.value)} style={inputSt}/></EField>
                      <EField label="Scheme Number"><input value={draft?.groupLife?.schemeNumber||''} onChange={e=>setD('groupLife.schemeNumber',e.target.value)} style={inputSt}/></EField>
                      <EField label="Benefit" wide><input value={draft?.groupLife?.benefit||''} onChange={e=>setD('groupLife.benefit',e.target.value)} style={inputSt} placeholder="e.g. 3 × Annual Salary"/></EField>
                      <EField label="Rate (%)"><input type="number" step="0.01" value={draft?.groupLife?.rate||0} onChange={e=>setD('groupLife.rate',+e.target.value)} style={inputSt}/></EField>
                      <EField label="Free Cover Limit (R)"><input type="number" value={draft?.groupLife?.freeCoverLimit||0} onChange={e=>setD('groupLife.freeCoverLimit',+e.target.value)} style={inputSt}/></EField>
                      <EField label="Benefit Expiry Age"><input type="number" value={draft?.groupLife?.benefitExpiryAge||65} onChange={e=>setD('groupLife.benefitExpiryAge',+e.target.value)} style={inputSt}/></EField>
                      <EField label="Global Education Protector"><input value={draft?.groupLife?.globalEducationProtector||''} onChange={e=>setD('groupLife.globalEducationProtector',e.target.value)} style={inputSt}/></EField>
                    </div>
                  </SectionCard>
                ) : (
                  <div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
                      <StatCard icon="🏢" label="Administrator"   value={profile?.groupLife?.administrator}         color={T.navy}/>
                      <StatCard icon="🔢" label="Scheme Number"  value={profile?.groupLife?.schemeNumber}          color={T.blue}   mono/>
                      <StatCard icon="📈" label="Benefit"        value={profile?.groupLife?.benefit}               color="#059669"/>
                      <StatCard icon="💲" label="GLA Rate"       value={profile?.groupLife?.rate?`${profile.groupLife.rate}%`:'—'} color="#059669" highlight/>
                      <StatCard icon="🔒" label="Free Cover Limit" value={profile?.groupLife?.freeCoverLimit?`R${profile.groupLife.freeCoverLimit.toLocaleString()}`:'—'} color={T.orange} alert={profile?.groupLife?.freeCoverLimit?'Underwriting above this':''}/>
                      <StatCard icon="🎂" label="Expiry Age"     value={profile?.groupLife?.benefitExpiryAge?`Age ${profile.groupLife.benefitExpiryAge}`:'—'} color={T.navy}/>
                      <StatCard icon="🎓" label="Ed. Protector"  value={profile?.groupLife?.globalEducationProtector||'—'} color={T.purple}/>
                      <StatCard icon="🏠" label="Mortgage Prot." value={profile?.groupLife?.mortgageProtector?'Yes':'No'} color={T.blue}/>
                    </div>

                    {/* Underwriting check tool */}
                    <SectionCard title="Underwriting Check" icon="⚖️" color={T.orange}>
                      <div style={{ fontSize:12, color:T.gray, marginBottom:10 }}>Enter a member's monthly salary to check if underwriting is required.</div>
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <div style={{ position:'relative', maxWidth:240 }}>
                          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:12, color:T.gray, fontWeight:700 }}>R</span>
                          <input type="number" value={testSalary} onChange={e=>setTestSalary(e.target.value)} placeholder="Monthly salary" style={{ ...inputSt, paddingLeft:24 }}/>
                        </div>
                        <span style={{ fontSize:11, color:T.gray }}>per month</span>
                      </div>
                      <UnderwritingCheck salary={testSalary} glaRate={profile?.groupLife?.rate} freeCoverLimit={profile?.groupLife?.freeCoverLimit} benefit={profile?.groupLife?.benefit}/>
                    </SectionCard>
                  </div>
                )
              )}

              {/* ── DISABILITY ── */}
              {activeTab === 'disability' && (
                editing ? (
                  <SectionCard title="Income Disability Benefit" icon="♿" color={T.amber}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <EField label="Rate (%)"><input type="number" step="0.01" value={draft?.disability?.rate||0} onChange={e=>setD('disability.rate',+e.target.value)} style={inputSt}/></EField>
                      <EField label="Waiting Period (months)"><input type="number" value={draft?.disability?.waitingPeriodMonths||3} onChange={e=>setD('disability.waitingPeriodMonths',+e.target.value)} style={inputSt}/></EField>
                      <EField label="Escalation (%)"><input type="number" step="0.01" value={draft?.disability?.escalationPercent||5} onChange={e=>setD('disability.escalationPercent',+e.target.value)} style={inputSt}/></EField>
                      <EField label="Benefit Expiry Age"><input type="number" value={draft?.disability?.benefitExpiryAge||65} onChange={e=>setD('disability.benefitExpiryAge',+e.target.value)} style={inputSt}/></EField>
                      <EField label="Contribution Protector (months)"><input type="number" value={draft?.disability?.contributionProtectorMonths||12} onChange={e=>setD('disability.contributionProtectorMonths',+e.target.value)} style={inputSt}/></EField>
                    </div>
                  </SectionCard>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
                    <StatCard icon="💲" label="PHI Rate"              value={profile?.disability?.rate?`${profile.disability.rate}%`:'—'}            color={T.amber}/>
                    <StatCard icon="⏳" label="Waiting Period"        value={profile?.disability?.waitingPeriodMonths?`${profile.disability.waitingPeriodMonths} months`:'—'} color={T.navy}/>
                    <StatCard icon="📈" label="Escalation"            value={profile?.disability?.escalationPercent?`${profile.disability.escalationPercent}%`:'—'}           color="#059669"/>
                    <StatCard icon="🎂" label="Expiry Age"            value={profile?.disability?.benefitExpiryAge?`Age ${profile.disability.benefitExpiryAge}`:'—'}          color={T.navy}/>
                    <StatCard icon="🛡️" label="Contribution Protector" value={profile?.disability?.contributionProtectorMonths?`${profile.disability.contributionProtectorMonths} months`:'—'} color={T.purple}/>
                  </div>
                )
              )}

              {/* ── MEDICAL AID ── */}
              {activeTab === 'medical_aid' && (
                editing ? (
                  <SectionCard title="Medical Aid" icon="🏥" color={T.red}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <EField label="Scheme" wide><input value={draft?.medicalAid?.scheme||''} onChange={e=>setD('medicalAid.scheme',e.target.value)} style={inputSt}/></EField>
                      <EField label="Scheme Number"><input value={draft?.medicalAid?.schemeNumber||''} onChange={e=>setD('medicalAid.schemeNumber',e.target.value)} style={inputSt}/></EField>
                      <EField label="Billing Method"><select value={draft?.medicalAid?.billingMethod||'Arrears'} onChange={e=>setD('medicalAid.billingMethod',e.target.value)} style={selectSt}><option>Arrears</option><option>In Advance</option></select></EField>
                      <EField label="Due Date"><input value={draft?.medicalAid?.billingDueDate||''} onChange={e=>setD('medicalAid.billingDueDate',e.target.value)} style={inputSt}/></EField>
                      <EField label="Payment Method"><select value={draft?.medicalAid?.paymentMethod||'Debit Order'} onChange={e=>setD('medicalAid.paymentMethod',e.target.value)} style={selectSt}><option>Debit Order</option><option>EFT</option><option>Payroll Deduction</option></select></EField>
                    </div>
                  </SectionCard>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
                    <StatCard icon="🏥" label="Scheme"          value={profile?.medicalAid?.scheme}              color={T.red}/>
                    <StatCard icon="🔢" label="Scheme Number"  value={profile?.medicalAid?.schemeNumber}        color={T.blue}  mono/>
                    <StatCard icon="💳" label="Billing Method" value={profile?.medicalAid?.billingMethod}       color={T.navy}/>
                    <StatCard icon="📅" label="Due Date"       value={profile?.medicalAid?.billingDueDate}      color={T.navy}/>
                    <StatCard icon="🏦" label="Payment Method" value={profile?.medicalAid?.paymentMethod}       color={T.purple}/>
                    <StatCard icon="✓"  label="Compulsory"     value={profile?.medicalAid?.compulsory?'Yes':'No'} color={profile?.medicalAid?.compulsory?T.green:'#9ca3af'}/>
                  </div>
                )
              )}

              {/* ── FUNERAL COVER ── */}
              {activeTab === 'funeral_cover' && (
                profile?.funeralCover ? (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
                    <StatCard icon="🏛️" label="Scheme"         value={profile.funeralCover.scheme}             color={T.navy}/>
                    <StatCard icon="👤" label="Administrator"  value={profile.funeralCover.administrator}      color={T.navy}/>
                    <StatCard icon="💰" label="Member Premium" value={`R${profile.funeralCover.memberPremium}/mo`} color={T.orange} mono/>
                    <StatCard icon="👨‍👩‍👧" label="Extended Family" value={profile.funeralCover.extendedFamilyAvailable?'Available':'Not Available'} color={T.green}/>
                  </div>
                ) : (
                  <div style={{ textAlign:'center', padding:48, color:T.gray }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>🏛️</div>
                    <div style={{ fontSize:13 }}>No funeral cover configured for this employer.</div>
                    {canEdit && !editing && <div style={{ marginTop:8 }}><button onClick={startEdit} style={{ fontSize:12, color:T.blue, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Add funeral cover →</button></div>}
                  </div>
                )
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
