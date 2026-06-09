import { T, slaStatus } from '../data.js'
import { BarRow, Card, CardHead, KPI } from '../ui.jsx'

export default function ReportsPage({ cases, caseTypes, categories, employers, users }) {
  const total     = cases.length
  const completed = cases.filter(c => c.status==='Completed').length
  const overdue   = cases.filter(c => slaStatus(c.slaDate,c.status)==='overdue').length
  const withinSla = cases.filter(c => { const s=slaStatus(c.slaDate,c.status); return ['ok','warning','today','done'].includes(s) }).length
  const slaPct    = total ? Math.round((withinSla/total)*100) : 100

  // Category summary (grouping only — no business logic)
  const byCat = categories.map(cat => {
    const typeIds = caseTypes.filter(ct => ct.categoryId===cat.id).map(ct => ct.id)
    return { ...cat, count:cases.filter(c => typeIds.includes(c.caseTypeId)).length }
  })

  // Case Type detail — the primary reporting unit
  const byCaseType = caseTypes.map(ct => {
    const ctCases     = cases.filter(c => c.caseTypeId===ct.id)
    const ctOpen      = ctCases.filter(c => !['Completed','Closed'].includes(c.status))
    const ctCompleted = ctCases.filter(c => c.status==='Completed')
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
    completed: cases.filter(c => c.employerId===emp.id && c.status==='Completed').length,
  })).sort((a,b) => b.total-a.total)

  const consultants  = users.filter(u => ['consultant','claims_admin','service_admin'].includes(u.role))
  const byConsultant = consultants.map(u => ({
    ...u,
    allocated: cases.filter(c => c.assignedTo===u.id).length,
    completed: cases.filter(c => c.assignedTo===u.id && c.status==='Completed').length,
    open:      cases.filter(c => c.assignedTo===u.id && !['Completed','Closed'].includes(c.status)).length,
    escalated: cases.filter(c => c.assignedTo===u.id && c.escalated).length,
  }))

  const maxCat = Math.max(...byCat.map(c => c.count), 1)
  const maxEmp = Math.max(...byEmployer.map(e => e.total), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'fadeIn .3s ease' }}>
      <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>Operational Reports</h1>

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
