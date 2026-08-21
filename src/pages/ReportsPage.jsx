import { useState } from 'react'
import { T, slaStatus } from '../data.js'
import { BarRow, Card, CardHead, KPI } from '../ui.jsx'

const RANGES = [
  { id:'week',  label:'This Week',  days:7   },
  { id:'month', label:'This Month', days:31  },
  { id:'all',   label:'All Time',   days:null },
]

export default function ReportsPage({ cases: allCases, caseTypes, categories, employers, users }) {
  const [range, setRange] = useState('all')

  // Date-range filter on case creation date
  const cutoff = RANGES.find(r=>r.id===range)?.days
  const cases  = cutoff
    ? allCases.filter(c => c.created && (Date.now() - new Date(c.created)) <= cutoff*86400000)
    : allCases

  // ── CSV EXPORT — full admin dataset for the selected range ──────────────
  function exportCSV() {
    const esc = v => `"${String(v??'').replace(/"/g,'""')}"`
    const rows = cases.map(c => {
      const emp = employers.find(e=>e.id===c.employerId)
      const usr = users.find(u=>u.id===c.assignedTo)
      const sla = slaStatus(c.slaDate, c.status)
      // Date resolved: stamped field, else derived from the audit trail
      const resolved = c.resolvedDate
        || (['Closed'].includes(c.status)
            ? (c.audit||[]).filter(a=>/Status changed to Closed/i.test(a.action)).slice(-1)[0]?.time?.split('T')[0] || ''
            : '')
      return [
        c.ref,
        c.masterCaseType||'',                        // Case Type (Death, Disability, Query…)
        c.caseCategory||c.caseTypeName||'',          // Case Category (Funeral, Capital Disability…)
        c.workflowCategory||'',                      // Workflow group (Claims, Exits…)
        c.status||'', c.priority||'',
        emp?.name||'', c.extraFields?.participating_employer||'', c.extraFields?.branch||'',
        c.memberName||'', c.memberId||'', usr?.name||'Unassigned',
        c.created||'', c.slaDate||'', resolved, sla==='overdue'?'OVERDUE':sla,
        c.extraFields?.date_of_death||'',            // Date of death
        c.extraFields?.natural_unnatural||'',        // Cause of death
        c.extraFields?.relationship||'',             // Relationship (who passed away)
        c.extraFields?.deceased_name||c.claimData?.deceasedName||'',
        c.extraFields?.amount_paid||'',
      ].map(esc).join(',')
    })
    const header = ['Ref','Case Type','Case Category','Workflow Group','Status','Priority','Employer','Participating Employer','Branch','Member','Member ID','Assigned To','Created','SLA Date','Date Resolved','SLA Status','Date of Death','Cause of Death','Relationship','Deceased Name','Amount Paid'].map(esc).join(',')
    const csv  = [header, ...rows].join('\r\n')
    const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `AEB-Admin-Report-${range}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const total     = cases.length
  const completed = cases.filter(c => c.status==='Closed').length
  const overdue   = cases.filter(c => slaStatus(c.slaDate,c.status)==='overdue').length
  const withinSla = cases.filter(c => { const s=slaStatus(c.slaDate,c.status); return ['ok','warning','today','done'].includes(s) }).length
  const slaPct    = total ? Math.round((withinSla/total)*100) : 100

  // Category summary (grouping only — no business logic)
  const byCat = categories.map(cat => {
    const typesInCat = caseTypes.filter(ct => ct.categoryId===cat.id)
    const ids = typesInCat.map(ct=>ct.id), names = typesInCat.map(ct=>ct.name)
    return { ...cat, count:cases.filter(c => ids.includes(c.caseTypeId) || names.includes(c.caseTypeName)).length }
  })

  // Case Type detail — the primary reporting unit
  const byCaseType = caseTypes.map(ct => {
    const ctCases     = cases.filter(c => c.caseTypeId===ct.id || c.caseTypeName===ct.name)
    const ctOpen      = ctCases.filter(c => !['Completed','Closed'].includes(c.status))
    const ctCompleted = ctCases.filter(c => c.status==='Closed')
    const ctOverdue   = ctCases.filter(c => slaStatus(c.slaDate,c.status)==='overdue')
    const ctWithinSla = ctCases.filter(c => { const s=slaStatus(c.slaDate,c.status); return ['ok','warning','today','done'].includes(s) })
    const cat         = categories.find(c => c.id===ct.categoryId)
    return {
      ...ct, cat,
      total:     ctCases.length,
      open:      ctOpen.length,
      completed: ctCompleted.length,
      overdue:   ctOverdue.length,
      slaPct:    ctCases.length ? Math.round((ctWithinSla.length/ctCases.length)*100) : 100,
    }
  }).filter(ct => ct.total > 0).sort((a,b) => b.total-a.total)

  const byEmployer = employers.map(emp => ({
    ...emp,
    total:     cases.filter(c => c.employerId===emp.id).length,
    open:      cases.filter(c => c.employerId===emp.id && !['Completed','Closed'].includes(c.status)).length,
    completed: cases.filter(c => c.employerId===emp.id && c.status==='Closed').length,
  })).sort((a,b) => b.total-a.total)

  const consultants  = users.filter(u => ['consultant','claims_admin','service_admin'].includes(u.role))
  const byConsultant = consultants.map(u => ({
    ...u,
    allocated: cases.filter(c => c.assignedTo===u.id).length,
    completed: cases.filter(c => c.assignedTo===u.id && c.status==='Closed').length,
    open:      cases.filter(c => c.assignedTo===u.id && !['Completed','Closed'].includes(c.status)).length,
    escalated: cases.filter(c => c.assignedTo===u.id && c.escalated).length,
  }))

  const maxCat = Math.max(...byCat.map(c => c.count), 1)
  const maxEmp = Math.max(...byEmployer.map(e => e.total), 1)

  // Funeral claims by participating employer (Impala / Sibanye / AMCU branches etc.)
  const funeralByEmployer = Object.entries(
    cases.filter(c => c.extraFields?.participating_employer).reduce((acc, c) => {
      const key = c.extraFields.participating_employer
      acc[key] = acc[key] || { total:0, open:0, completed:0 }
      acc[key].total++
      if (['Completed','Closed'].includes(c.status)) acc[key].completed++
      else acc[key].open++
      return acc
    }, {})
  ).map(([name, v]) => ({ name, ...v })).sort((a,b) => b.total - a.total)
  const maxFuneral = Math.max(...funeralByEmployer.map(e => e.total), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'fadeIn .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>Operational Reports</h1>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {RANGES.map(r => (
            <button key={r.id} onClick={()=>setRange(r.id)}
              style={{ padding:'7px 14px', borderRadius:8, border:`1.5px solid ${range===r.id?T.orange:T.border}`, background:range===r.id?T.orangeL:'#fff', color:range===r.id?T.orange:T.gray, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              {r.label}
            </button>
          ))}
          <button onClick={exportCSV}
            style={{ padding:'8px 18px', borderRadius:8, border:'none', background:T.navy, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            ⬇ Download Report ({cases.length} cases)
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14 }}>
        <KPI label="Total Cases"    value={total}        icon="cases"   color={T.blue}   />
        <KPI label="Completed"      value={completed}    icon="check"   color="#059669"  />
        <KPI label="Overdue"        value={overdue}      icon="warning" color={T.red}    />
        <KPI label="SLA Compliance" value={`${slaPct}%`} icon="sla"     color={slaPct>=90?'#059669':slaPct>=70?T.amber:T.red} />
      </div>

      {/* ── CASE TYPE PERFORMANCE — primary reporting unit ── */}
      <Card style={{ gridColumn:'1/-1' }}>
        <CardHead title="SLA Performance by Case Type" />
        <div style={{ padding:'4px 0 0' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(700px,1fr))' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:680 }}>
                <thead>
                  <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                    {['Case Type','Category','SLA Target','Total','Open','Completed','Overdue','SLA %'].map(h => (
                      <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byCaseType.map(ct => (
                    <tr key={ct.id} style={{ borderBottom:`1px solid #f3f4f6` }}>
                      <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, color:T.text }}>{ct.name}</td>
                      <td style={{ padding:'11px 14px' }}>
                        {ct.cat && <span style={{ fontSize:11, padding:'2px 8px', background:ct.cat.color+'18', color:ct.cat.color, borderRadius:4, fontWeight:700 }}>{ct.cat.name}</span>}
                      </td>
                      <td style={{ padding:'11px 14px', fontSize:12, color:T.gray }}>{ct.slaLabel}</td>
                      <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600 }}>{ct.total}</td>
                      <td style={{ padding:'11px 14px', fontSize:13, color:T.amber, fontWeight:600 }}>{ct.open}</td>
                      <td style={{ padding:'11px 14px', fontSize:13, color:'#059669', fontWeight:600 }}>{ct.completed}</td>
                      <td style={{ padding:'11px 14px', fontSize:13, color:ct.overdue>0?T.red:T.gray, fontWeight:ct.overdue>0?700:400 }}>{ct.overdue}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'#f3f4f6', borderRadius:3, minWidth:60 }}>
                            <div style={{ height:'100%', width:`${ct.slaPct}%`, background:ct.slaPct>=90?'#059669':ct.slaPct>=70?T.amber:T.red, borderRadius:3, transition:'width .4s' }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:ct.slaPct>=90?'#059669':ct.slaPct>=70?T.amber:T.red, minWidth:36, textAlign:'right' }}>{ct.slaPct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {byCaseType.length===0 && (
                    <tr><td colSpan={8} style={{ padding:32, textAlign:'center', color:T.gray, fontSize:13 }}>No case data yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:16 }}>
        {/* By Category (grouping only) */}
        <Card>
          <CardHead title="Volume by Category" />
          <div style={{ padding:'14px 18px' }}>
            {byCat.filter(c=>c.count>0).map(cat => <BarRow key={cat.id} label={cat.name} value={cat.count} max={maxCat} color={cat.color} />)}
            {byCat.every(c=>c.count===0) && <div style={{ fontSize:13, color:T.gray, textAlign:'center', padding:16 }}>No data yet.</div>}
          </div>
        </Card>

        {/* By Employer */}
        <Card>
          <CardHead title="Volume by Employer" />
          <div style={{ padding:'14px 18px' }}>
            {byEmployer.map(emp => <BarRow key={emp.id} label={emp.name} value={emp.total} max={maxEmp} color={T.blue} />)}
          </div>
        </Card>

        {/* Funeral Claims by Participating Employer */}
        <Card>
          <CardHead title="Cases by Participating Employer" />
          <div style={{ padding:'14px 18px' }}>
            {funeralByEmployer.length === 0 ? (
              <div style={{ fontSize:12, color:T.gray, textAlign:'center', padding:'12px 0' }}>No cases with a participating employer yet.</div>
            ) : (
              <>
                {funeralByEmployer.map(emp => (
                  <div key={emp.name} style={{ marginBottom:4 }}>
                    <BarRow label={emp.name} value={emp.total} max={maxFuneral} color={T.navy} />
                    <div style={{ fontSize:10, color:T.gray, margin:'-4px 0 6px 2px' }}>
                      {emp.open} open · {emp.completed} completed
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>

        {/* Consultant Productivity */}
        <Card>
          <CardHead title="Consultant Productivity" />
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:340 }}>
              <thead>
                <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                  {['Consultant','Allocated','Open','Completed','Escalated'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byConsultant.map(u => (
                  <tr key={u.id} style={{ borderBottom:`1px solid #f3f4f6` }}>
                    <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:T.text }}>{u.name}</td>
                    <td style={{ padding:'10px 12px', fontSize:13 }}>{u.allocated}</td>
                    <td style={{ padding:'10px 12px', fontSize:13, color:T.amber, fontWeight:600 }}>{u.open}</td>
                    <td style={{ padding:'10px 12px', fontSize:13, color:'#059669', fontWeight:600 }}>{u.completed}</td>
                    <td style={{ padding:'10px 12px', fontSize:13, color:u.escalated>0?T.red:T.gray, fontWeight:u.escalated>0?700:400 }}>{u.escalated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Employer Service Summary */}
        <Card style={{ gridColumn:'1/-1' }}>
          <CardHead title="Employer Service Summary" />
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
              <thead>
                <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                  {['Employer','Industry','Members','Total','Open','Completed','Consultant'].map(h => (
                    <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byEmployer.map(emp => {
                  const con = users.find(u => u.id===emp.consultant)
                  return (
                    <tr key={emp.id} style={{ borderBottom:`1px solid #f3f4f6` }}>
                      <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color:T.text }}>{emp.name}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:T.gray }}>{emp.industry}</td>
                      <td style={{ padding:'10px 14px', fontSize:12 }}>{emp.members.toLocaleString()}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>{emp.total}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, color:T.amber, fontWeight:600 }}>{emp.open}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, color:'#059669', fontWeight:600 }}>{emp.completed}</td>
                      <td style={{ padding:'10px 14px', fontSize:12 }}>{con?.name||'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
