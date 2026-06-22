import { useState } from 'react'
import { T, emptyBenefitProfile } from '../data.js'
import { Card, Btn, inputSt, selectSt, Icon } from '../ui.jsx'

// ─── SECTION HEADING ─────────────────────────────────────────────────────────
function SectionHead({ title, icon, color = T.blue }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 14px', background:color+'10', borderRadius:'9px 9px 0 0', borderBottom:`2px solid ${color}30`, marginBottom:0 }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span style={{ fontSize:13, fontWeight:700, color }}>{title}</span>
    </div>
  )
}

function Section({ children }) {
  return (
    <div style={{ border:`1px solid ${T.border}`, borderRadius:9, overflow:'hidden', marginBottom:16 }}>
      {children}
    </div>
  )
}

function SectionBody({ children }) {
  return <div style={{ padding:'14px 16px', background:'#fff', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>{children}</div>
}

function Field({ label, children, wide }) {
  return (
    <div style={{ gridColumn: wide ? '1/-1' : undefined }}>
      <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>{label}</label>
      {children}
    </div>
  )
}

function ReadField({ label, value, mono, wide, highlight }) {
  return (
    <div style={{ gridColumn: wide ? '1/-1' : undefined }}>
      <div style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:highlight?700:500, color:highlight?T.orange:T.text, fontFamily:mono?'monospace':'inherit' }}>{value || '—'}</div>
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

  const canEdit = ['general_manager','administrator'].includes(currentUser.role)

  const profile = selectedEmp
    ? (benefitProfiles[selectedEmp.id] || emptyBenefitProfile(selectedEmp.id, selectedEmp.name))
    : null

  function startEdit() {
    setDraft(JSON.parse(JSON.stringify(profile)))
    setEditing(true)
  }

  function saveEdit() {
    onUpdateProfile(selectedEmp.id, draft)
    setEditing(false)
    setDraft(null)
  }

  function setD(path, value) {
    // e.g. path = 'groupLife.rate'
    setDraft(prev => {
      const next = { ...prev }
      const parts = path.split('.')
      let obj = next
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...obj[parts[i]] }
        obj = obj[parts[i]]
      }
      obj[parts[parts.length - 1]] = value
      return next
    })
  }

  const tabs = ['overview', 'retirement_fund', 'group_life', 'disability', 'medical_aid', 'funeral_cover']
  const tabLabels = { overview:'Overview', retirement_fund:'Retirement Fund', group_life:'Group Life', disability:'Disability', medical_aid:'Medical Aid', funeral_cover:'Funeral Cover' }

  return (
    <div style={{ display:'flex', gap:16, height:'100%', animation:'fadeIn .3s ease' }}>

      {/* LEFT — employer list */}
      <div style={{ width:260, flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontSize:14, fontWeight:800, color:T.text }}>Benefit Profiles</div>
        <div style={{ fontSize:11, color:T.gray, lineHeight:1.5 }}>
          Each employer has its own benefit structure. Select an employer to view or edit their profile.
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4 }}>
          {employers.map(emp => {
            const hasProfile = !!benefitProfiles[emp.id]
            const isSelected = selectedEmp?.id === emp.id
            return (
              <button key={emp.id} onClick={() => { setSelectedEmp(emp); setEditing(false); setDraft(null); setTab('overview') }}
                style={{ padding:'11px 13px', borderRadius:9, border:`2px solid ${isSelected?T.orange:T.border}`, background:isSelected?T.orangeL:'#fff', textAlign:'left', cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{emp.name}</div>
                  <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:8, background:hasProfile?'#f0fdf4':'#f3f4f6', color:hasProfile?T.green:'#9ca3af' }}>
                    {hasProfile ? '✓ PROFILE' : 'NO PROFILE'}
                  </span>
                </div>
                <div style={{ fontSize:11, color:T.gray, marginTop:2 }}>{emp.number} · {emp.industry}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* RIGHT — profile detail */}
      <div style={{ flex:1, overflow:'auto' }}>
        {!selectedEmp ? (
          <div style={{ textAlign:'center', padding:60, color:T.gray }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🏢</div>
            <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:4 }}>Select an Employer</div>
            <div style={{ fontSize:12 }}>Choose an employer from the left to view or edit their benefit profile.</div>
          </div>
        ) : (
          <div>
            {/* Profile header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:T.text, marginBottom:2 }}>{selectedEmp.name}</div>
                <div style={{ fontSize:12, color:T.gray }}>
                  {profile?.payrollContact && `Payroll: ${profile.payrollContact} · `}
                  Effective: {profile?.effectiveDate || 'Not set'}
                </div>
              </div>
              {canEdit && !editing && (
                <Btn onClick={startEdit}><Icon name="edit" size={14} color="#fff"/> Edit Profile</Btn>
              )}
              {editing && (
                <div style={{ display:'flex', gap:8 }}>
                  <Btn onClick={saveEdit}>Save Changes</Btn>
                  <Btn variant="secondary" onClick={() => { setEditing(false); setDraft(null) }}>Cancel</Btn>
                </div>
              )}
            </div>

            {/* Tab bar */}
            <div style={{ display:'flex', background:'#fff', borderRadius:'10px 10px 0 0', border:`1px solid ${T.border}`, borderBottom:'none', overflowX:'auto', marginBottom:0 }}>
              {tabs.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding:'10px 16px', background:'none', border:'none', borderBottom:activeTab===t?`2px solid ${T.orange}`:'2px solid transparent', color:activeTab===t?T.orange:T.gray, fontWeight:activeTab===t?700:400, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', marginBottom:-1 }}>
                  {tabLabels[t]}
                </button>
              ))}
            </div>

            <div style={{ border:`1px solid ${T.border}`, borderTop:'none', borderRadius:'0 0 10px 10px', background:'#f9fafb', padding:16 }}>

              {/* ── OVERVIEW ── */}
              {activeTab === 'overview' && (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
                    {[
                      ['Retirement Fund',   profile?.retirementFund?.name     || '—',  '🏦'],
                      ['Group Life Admin',  profile?.groupLife?.administrator  || '—',  '🛡️'],
                      ['Medical Aid',       profile?.medicalAid?.scheme        || '—',  '🏥'],
                      ['Fund Code',         profile?.retirementFund?.fundCode  || '—',  '🔢'],
                      ['GLA Scheme',        profile?.groupLife?.schemeNumber   || '—',  '📋'],
                      ['Med Scheme No.',    profile?.medicalAid?.schemeNumber  || '—',  '📋'],
                      ['GLA Rate',          profile?.groupLife?.rate ? `${profile.groupLife.rate}%` : '—', '💲'],
                      ['Disability Rate',   profile?.disability?.rate ? `${profile.disability.rate}%` : '—', '💲'],
                      ['Retirement Age',    profile?.retirementAge ? `Age ${profile.retirementAge}` : '—', '🎂'],
                    ].map(([l,v,ic]) => (
                      <div key={l} style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:9, padding:'12px 14px' }}>
                        <div style={{ fontSize:10, color:T.gray, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>
                          {ic} {l}
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Contribution categories */}
                  {profile?.retirementFund?.contributionCategories?.length > 0 && (
                    <Section>
                      <SectionHead title="Contribution Categories" icon="💰" color="#059669"/>
                      <div style={{ padding:'0', background:'#fff' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                          <thead>
                            <tr style={{ background:'#f9fafb' }}>
                              {['Category','Employer %','Employee %','Total %'].map(h=>(
                                <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {profile.retirementFund.contributionCategories.map((cat,i) => (
                              <tr key={i} style={{ borderBottom:'1px solid #f3f4f6' }}>
                                <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>{cat.category}</td>
                                <td style={{ padding:'10px 14px', fontSize:13, fontFamily:'monospace', color:T.blue }}>{cat.employer}%</td>
                                <td style={{ padding:'10px 14px', fontSize:13, fontFamily:'monospace', color:T.orange }}>{cat.employee}%</td>
                                <td style={{ padding:'10px 14px', fontSize:13, fontFamily:'monospace', fontWeight:700, color:T.green }}>{cat.employer + cat.employee}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Section>
                  )}

                  {/* Billing rules */}
                  <Section>
                    <SectionHead title="Billing Rules" icon="💳" color={T.purple}/>
                    <SectionBody>
                      <ReadField label="Billing Method"   value={profile?.billingMethod}/>
                      <ReadField label="Billing Due Date" value={profile?.billingDueDate}/>
                      <ReadField label="Payment Method"   value={profile?.paymentMethod}/>
                      <ReadField label="Payroll Contact"  value={profile?.payrollContact}/>
                    </SectionBody>
                  </Section>
                </div>
              )}

              {/* ── RETIREMENT FUND ── */}
              {activeTab === 'retirement_fund' && (
                editing ? (
                  <Section>
                    <SectionHead title="Retirement Fund" icon="🏦" color={T.blue}/>
                    <SectionBody>
                      <Field label="Fund Name" wide><input value={draft?.retirementFund?.name||''} onChange={e=>setD('retirementFund.name',e.target.value)} style={inputSt}/></Field>
                      <Field label="Fund Code"><input value={draft?.retirementFund?.fundCode||''} onChange={e=>setD('retirementFund.fundCode',e.target.value)} style={inputSt}/></Field>
                      <Field label="Administrator"><input value={draft?.retirementFund?.administrator||''} onChange={e=>setD('retirementFund.administrator',e.target.value)} style={inputSt}/></Field>
                      <Field label="Normal Retirement Age"><input type="number" value={draft?.retirementFund?.normalRetirementAge||65} onChange={e=>setD('retirementFund.normalRetirementAge',+e.target.value)} style={inputSt}/></Field>
                      <Field label="Administration Cost (R/member)"><input type="number" step="0.01" value={draft?.retirementFund?.administrationCost||0} onChange={e=>setD('retirementFund.administrationCost',+e.target.value)} style={inputSt}/></Field>
                    </SectionBody>
                    {/* Contribution categories */}
                    <div style={{ padding:'0 16px 14px' }}>
                      <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:10 }}>Contribution Categories</div>
                      {(draft?.retirementFund?.contributionCategories||[]).map((cat,i) => (
                        <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:8, marginBottom:8, alignItems:'center' }}>
                          <input value={cat.category} onChange={e=>{const cats=[...draft.retirementFund.contributionCategories];cats[i]={...cats[i],category:e.target.value};setD('retirementFund.contributionCategories',cats)}} style={{...inputSt,fontSize:12}} placeholder="Category name"/>
                          <input type="number" value={cat.employer} onChange={e=>{const cats=[...draft.retirementFund.contributionCategories];cats[i]={...cats[i],employer:+e.target.value};setD('retirementFund.contributionCategories',cats)}} style={{...inputSt,fontSize:12}} placeholder="Employer %"/>
                          <input type="number" value={cat.employee} onChange={e=>{const cats=[...draft.retirementFund.contributionCategories];cats[i]={...cats[i],employee:+e.target.value};setD('retirementFund.contributionCategories',cats)}} style={{...inputSt,fontSize:12}} placeholder="Employee %"/>
                          <button onClick={()=>{const cats=draft.retirementFund.contributionCategories.filter((_,j)=>j!==i);setD('retirementFund.contributionCategories',cats)}} style={{background:'none',border:'none',cursor:'pointer',color:T.red,fontSize:16}}>×</button>
                        </div>
                      ))}
                      <button onClick={()=>{const cats=[...(draft?.retirementFund?.contributionCategories||[]),{category:`Category ${(draft?.retirementFund?.contributionCategories?.length||0)+1}`,employer:5,employee:0}];setD('retirementFund.contributionCategories',cats)}}
                        style={{fontSize:12,color:T.blue,background:'none',border:`1px dashed ${T.blue}`,borderRadius:7,padding:'5px 12px',cursor:'pointer',fontFamily:'inherit'}}>
                        + Add Category
                      </button>
                    </div>
                  </Section>
                ) : (
                  <Section>
                    <SectionHead title="Retirement Fund" icon="🏦" color={T.blue}/>
                    <SectionBody>
                      <ReadField label="Fund Name"               value={profile?.retirementFund?.name} wide/>
                      <ReadField label="Fund Code"               value={profile?.retirementFund?.fundCode} mono/>
                      <ReadField label="Administrator"           value={profile?.retirementFund?.administrator}/>
                      <ReadField label="Normal Retirement Age"   value={profile?.retirementFund?.normalRetirementAge ? `Age ${profile.retirementFund.normalRetirementAge}` : '—'}/>
                      <ReadField label="Administration Cost"     value={profile?.retirementFund?.administrationCost ? `R${profile.retirementFund.administrationCost}/member` : '—'} highlight/>
                    </SectionBody>
                    {profile?.retirementFund?.contributionCategories?.length > 0 && (
                      <div style={{ padding:'0 16px 14px' }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:10 }}>Contribution Categories</div>
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                          <thead><tr style={{ background:'#f9fafb' }}>{['Category','Employer %','Employee %','Total %'].map(h=><th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', borderBottom:`1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
                          <tbody>{profile.retirementFund.contributionCategories.map((cat,i)=><tr key={i} style={{ borderBottom:'1px solid #f3f4f6' }}><td style={{ padding:'9px 12px', fontSize:13 }}>{cat.category}</td><td style={{ padding:'9px 12px', fontSize:13, fontFamily:'monospace', color:T.blue }}>{cat.employer}%</td><td style={{ padding:'9px 12px', fontSize:13, fontFamily:'monospace', color:T.orange }}>{cat.employee}%</td><td style={{ padding:'9px 12px', fontSize:13, fontFamily:'monospace', fontWeight:700, color:T.green }}>{cat.employer+cat.employee}%</td></tr>)}</tbody>
                        </table>
                      </div>
                    )}
                  </Section>
                )
              )}

              {/* ── GROUP LIFE ── */}
              {activeTab === 'group_life' && (
                editing ? (
                  <Section>
                    <SectionHead title="Group Life Assurance" icon="🛡️" color="#059669"/>
                    <SectionBody>
                      <Field label="Administrator"><input value={draft?.groupLife?.administrator||''} onChange={e=>setD('groupLife.administrator',e.target.value)} style={inputSt}/></Field>
                      <Field label="Scheme Number"><input value={draft?.groupLife?.schemeNumber||''} onChange={e=>setD('groupLife.schemeNumber',e.target.value)} style={inputSt}/></Field>
                      <Field label="Benefit"><input value={draft?.groupLife?.benefit||''} onChange={e=>setD('groupLife.benefit',e.target.value)} style={inputSt} placeholder="e.g. 3 × Annual Salary"/></Field>
                      <Field label="Rate (%)"><input type="number" step="0.01" value={draft?.groupLife?.rate||0} onChange={e=>setD('groupLife.rate',+e.target.value)} style={inputSt}/></Field>
                      <Field label="Free Cover Limit (R)"><input type="number" value={draft?.groupLife?.freeCoverLimit||0} onChange={e=>setD('groupLife.freeCoverLimit',+e.target.value)} style={inputSt}/></Field>
                      <Field label="Benefit Expiry Age"><input type="number" value={draft?.groupLife?.benefitExpiryAge||65} onChange={e=>setD('groupLife.benefitExpiryAge',+e.target.value)} style={inputSt}/></Field>
                      <Field label="Global Education Protector"><input value={draft?.groupLife?.globalEducationProtector||''} onChange={e=>setD('groupLife.globalEducationProtector',e.target.value)} style={inputSt}/></Field>
                    </SectionBody>
                  </Section>
                ) : (
                  <Section>
                    <SectionHead title="Group Life Assurance" icon="🛡️" color="#059669"/>
                    <SectionBody>
                      <ReadField label="Administrator"            value={profile?.groupLife?.administrator}/>
                      <ReadField label="Scheme Number"            value={profile?.groupLife?.schemeNumber} mono/>
                      <ReadField label="Benefit"                  value={profile?.groupLife?.benefit} wide/>
                      <ReadField label="Rate"                     value={profile?.groupLife?.rate ? `${profile.groupLife.rate}%` : '—'} highlight/>
                      <ReadField label="Free Cover Limit"         value={profile?.groupLife?.freeCoverLimit ? `R${profile.groupLife.freeCoverLimit.toLocaleString()}` : '—'} highlight/>
                      <ReadField label="Benefit Expiry Age"       value={profile?.groupLife?.benefitExpiryAge ? `Age ${profile.groupLife.benefitExpiryAge}` : '—'}/>
                      <ReadField label="Education Benefit"        value={profile?.groupLife?.educationBenefit ? 'Yes' : 'No'}/>
                      <ReadField label="Global Ed. Protector"     value={profile?.groupLife?.globalEducationProtector}/>
                      <ReadField label="Mortgage Protector"       value={profile?.groupLife?.mortgageProtector ? 'Yes' : 'No'}/>
                    </SectionBody>
                  </Section>
                )
              )}

              {/* ── DISABILITY ── */}
              {activeTab === 'disability' && (
                editing ? (
                  <Section>
                    <SectionHead title="Income Disability Benefit" icon="♿" color={T.amber}/>
                    <SectionBody>
                      <Field label="Rate (%)"><input type="number" step="0.01" value={draft?.disability?.rate||0} onChange={e=>setD('disability.rate',+e.target.value)} style={inputSt}/></Field>
                      <Field label="Waiting Period (months)"><input type="number" value={draft?.disability?.waitingPeriodMonths||3} onChange={e=>setD('disability.waitingPeriodMonths',+e.target.value)} style={inputSt}/></Field>
                      <Field label="Escalation (%)"><input type="number" step="0.01" value={draft?.disability?.escalationPercent||5} onChange={e=>setD('disability.escalationPercent',+e.target.value)} style={inputSt}/></Field>
                      <Field label="Benefit Expiry Age"><input type="number" value={draft?.disability?.benefitExpiryAge||65} onChange={e=>setD('disability.benefitExpiryAge',+e.target.value)} style={inputSt}/></Field>
                      <Field label="Contribution Protector (months)"><input type="number" value={draft?.disability?.contributionProtectorMonths||12} onChange={e=>setD('disability.contributionProtectorMonths',+e.target.value)} style={inputSt}/></Field>
                    </SectionBody>
                  </Section>
                ) : (
                  <Section>
                    <SectionHead title="Income Disability Benefit" icon="♿" color={T.amber}/>
                    <SectionBody>
                      <ReadField label="Rate"                          value={profile?.disability?.rate ? `${profile.disability.rate}%` : '—'} highlight/>
                      <ReadField label="Waiting Period"                value={profile?.disability?.waitingPeriodMonths ? `${profile.disability.waitingPeriodMonths} months` : '—'}/>
                      <ReadField label="Escalation"                    value={profile?.disability?.escalationPercent ? `${profile.disability.escalationPercent}%` : '—'}/>
                      <ReadField label="Benefit Expiry Age"            value={profile?.disability?.benefitExpiryAge ? `Age ${profile.disability.benefitExpiryAge}` : '—'}/>
                      <ReadField label="Contribution Protector"        value={profile?.disability?.contributionProtectorMonths ? `${profile.disability.contributionProtectorMonths} months` : '—'}/>
                    </SectionBody>
                  </Section>
                )
              )}

              {/* ── MEDICAL AID ── */}
              {activeTab === 'medical_aid' && (
                editing ? (
                  <Section>
                    <SectionHead title="Medical Aid" icon="🏥" color={T.red}/>
                    <SectionBody>
                      <Field label="Medical Aid Scheme"><input value={draft?.medicalAid?.scheme||''} onChange={e=>setD('medicalAid.scheme',e.target.value)} style={inputSt}/></Field>
                      <Field label="Scheme Number"><input value={draft?.medicalAid?.schemeNumber||''} onChange={e=>setD('medicalAid.schemeNumber',e.target.value)} style={inputSt}/></Field>
                      <Field label="Billing Method">
                        <select value={draft?.medicalAid?.billingMethod||'Arrears'} onChange={e=>setD('medicalAid.billingMethod',e.target.value)} style={selectSt}>
                          {['Arrears','In Advance'].map(o=><option key={o}>{o}</option>)}
                        </select>
                      </Field>
                      <Field label="Billing Due Date"><input value={draft?.medicalAid?.billingDueDate||'14th'} onChange={e=>setD('medicalAid.billingDueDate',e.target.value)} style={inputSt}/></Field>
                      <Field label="Payment Method">
                        <select value={draft?.medicalAid?.paymentMethod||'Debit Order'} onChange={e=>setD('medicalAid.paymentMethod',e.target.value)} style={selectSt}>
                          {['Debit Order','EFT','Payroll Deduction'].map(o=><option key={o}>{o}</option>)}
                        </select>
                      </Field>
                    </SectionBody>
                  </Section>
                ) : (
                  <Section>
                    <SectionHead title="Medical Aid" icon="🏥" color={T.red}/>
                    <SectionBody>
                      <ReadField label="Scheme"          value={profile?.medicalAid?.scheme}/>
                      <ReadField label="Scheme Number"   value={profile?.medicalAid?.schemeNumber} mono/>
                      <ReadField label="Billing Method"  value={profile?.medicalAid?.billingMethod}/>
                      <ReadField label="Due Date"        value={profile?.medicalAid?.billingDueDate}/>
                      <ReadField label="Payment Method"  value={profile?.medicalAid?.paymentMethod}/>
                      <ReadField label="Compulsory"      value={profile?.medicalAid?.compulsory ? 'Yes' : 'No'}/>
                    </SectionBody>
                  </Section>
                )
              )}

              {/* ── FUNERAL COVER ── */}
              {activeTab === 'funeral_cover' && (
                <Section>
                  <SectionHead title="Funeral Cover" icon="🏛️" color={T.navy}/>
                  {profile?.funeralCover ? (
                    <SectionBody>
                      <ReadField label="Scheme"               value={profile.funeralCover.scheme}/>
                      <ReadField label="Administrator"        value={profile.funeralCover.administrator}/>
                      <ReadField label="Member Premium"       value={`R${profile.funeralCover.memberPremium}/mo`} highlight/>
                      <ReadField label="Extended Family"      value={profile.funeralCover.extendedFamilyAvailable ? 'Available' : 'Not Available'}/>
                    </SectionBody>
                  ) : (
                    <div style={{ padding:'24px 16px', textAlign:'center', color:T.gray, fontSize:12 }}>
                      No funeral cover configured for this employer.
                      {canEdit && !editing && <><br/><button onClick={startEdit} style={{ marginTop:8, fontSize:12, color:T.blue, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Add funeral cover details →</button></>}
                    </div>
                  )}
                </Section>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
