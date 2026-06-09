import { T, STATUS_CFG, slaStatus } from '../data.js'
import { KPI, BarRow, Card, CardHead, StatusBadge, PriorityBadge, SLAChip, Icon, Avatar, Empty } from '../ui.jsx'

export default function DashboardPage({ cases, caseTypes, categories, employers, users, currentUser, onOpenCase, onNav }) {
  const isEmployer = ['employer_admin','employer_user'].includes(currentUser.role)
  const visible = isEmployer ? cases.filter(c => {
    const emp = employers.find(e => e.id === c.employerId)
    return emp?.id === currentUser.employer
  }) : cases

  const open      = visible.filter(c => !['Completed','Closed'].includes(c.status))
  const overdue   = visible.filter(c => slaStatus(c.slaDate,c.status) === 'overdue')
  const escalated = visible.filter(c => c.escalated)
  const dueToday  = visible.filter(c => slaStatus(c.slaDate,c.status) === 'today')
  const completed = visible.filter(c => c.status === 'Completed')

  // by category
  const catCounts = categories.map(cat => {
    const catTypes = caseTypes.filter(ct => ct.categoryId === cat.id).map(ct => ct.id)
    return { ...cat, count: visible.filter(c => catTypes.includes(c.caseTypeId)).length }
  }).filter(c => c.count > 0)

  // workload per consultant
  const consultants = users.filter(u => ['consultant','claims_admin','service_admin'].includes(u.role))
  const workload = consultants.map(u => ({
    ...u,
    open: visible.filter(c => c.assignedTo === u.id && !['Completed','Closed'].includes(c.status)).length,
    completed: visible.filter(c => c.assignedTo === u.id && c.status === 'Completed').length,
  }))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22, animation:'fadeIn .3s ease' }}>
      <div>
        <h1 style={{ fontSize:21, fontWeight:800, color:T.text, margin:'0 0 3px', letterSpacing:'-0.5px' }}>
          {isEmployer ? `${employers.find(e=>e.id===currentUser.employer)?.name} — Service Dashboard` : 'Operations Dashboard'}
        </h1>
        <p style={{ margin:0, color:T.gray, fontSize:12 }}>{new Date().toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14 }}>
        <KPI label="Open Cases"   value={open.length}      icon="cases"   color={T.blue}   trend={3}  />
        <KPI label="Due Today"    value={dueToday.length}  icon="sla"     color={T.amber}            />
        <KPI label="Overdue"      value={overdue.length}   icon="warning" color={T.red}              />
        <KPI label="Escalated"    value={escalated.length} icon="bell"    color="#be123c"            />
        <KPI label="Completed"    value={completed.length} icon="check"   color="#059669" sub="All time" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:16 }}>
        {/* Recent open cases */}
        <Card>
          <CardHead title="Open Cases" action={<button onClick={() => onNav('cases')} style={{ fontSize:12, color:T.green, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>View all →</button>} />
          {open.length === 0 && <Empty message="No open cases." />}
          {open.slice(0,5).map(c => {
            const ct = caseTypes.find(x => x.id === c.caseTypeId)
            const emp = employers.find(x => x.id === c.employerId)
            return (
              <div key={c.id} onClick={() => onOpenCase(c)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', borderBottom:`1px solid #f9fafb`, cursor:'pointer', transition:'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:2 }}>
                    <span style={{ fontFamily:'monospace', fontSize:11, color:T.gray, fontWeight:700 }}>{c.ref}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ct?.name}</div>
                  <div style={{ fontSize:11, color:T.gray }}>{emp?.name} · {c.created}</div>
                </div>
                <SLAChip slaDate={c.slaDate} status={c.status} />
                <Icon name="chevron_r" size={16} color={T.border} />
              </div>
            )
          })}
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHead title="Cases by Category" />
          <div style={{ padding:'14px 18px' }}>
            {catCounts.map(cat => (
              <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, cursor:'pointer' }} onClick={() => onNav('cases',{category:cat.id})}>
                <div style={{ width:8, height:8, borderRadius:2, background:cat.color, flexShrink:0 }} />
                <div style={{ flex:1, fontSize:13, color:T.text }}>{cat.name}</div>
                <div style={{ fontSize:16, fontWeight:800, color:cat.color }}>{cat.count}</div>
              </div>
            ))}
            {catCounts.length===0 && <Empty message="No cases yet." />}
          </div>
        </Card>

        {/* Escalation queue */}
        {escalated.length > 0 && (
          <Card>
            <CardHead title={`Escalation Queue (${escalated.length})`} />
            {escalated.map(c => {
              const ct = caseTypes.find(x => x.id === c.caseTypeId)
              const emp = employers.find(x => x.id === c.employerId)
              return (
                <div key={c.id} onClick={() => onOpenCase(c)}
                  style={{ display:'flex', gap:10, padding:'12px 18px', borderBottom:`1px solid #fff1f2`, cursor:'pointer', background:'#fff8f8' }}
                  onMouseEnter={e => e.currentTarget.style.background='#fff1f2'}
                  onMouseLeave={e => e.currentTarget.style.background='#fff8f8'}>
                  <Icon name="warning" size={16} color={T.red} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{ct?.name}</div>
                    <div style={{ fontSize:11, color:T.gray }}>{emp?.name} · SLA: {c.slaDate}</div>
                  </div>
                </div>
              )
            })}
          </Card>
        )}

        {/* Consultant workload — internal only */}
        {!isEmployer && (
          <Card>
            <CardHead title="Consultant Workload" />
            <div style={{ padding:'14px 18px' }}>
              {workload.map(u => (
                <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <Avatar initials={u.avatar} size={30} bg={T.green2} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.name}</div>
                    <div style={{ height:4, background:'#f3f4f6', borderRadius:2, marginTop:4 }}>
                      <div style={{ height:'100%', width:`${Math.min((u.open/10)*100,100)}%`, background:T.green, borderRadius:2 }} />
                    </div>
                  </div>
                  <span style={{ fontSize:13, fontWeight:800, color:T.text, minWidth:20, textAlign:'right' }}>{u.open}</span>
                </div>
              ))}
              {workload.length===0 && <Empty message="No consultants found." />}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
