import { T, INITIAL_CATEGORIES, slaStatus } from '../data.js'
import { KPI, BarRow, Card, CardHead, StatusBadge, SLAChip, Icon, Empty } from '../ui.jsx'

export default function DashboardPage({ cases, billingTasks=[], caseTypes, categories, employers, users, currentUser, onOpenCase, onOpenBilling, onNav }) {
  const role = currentUser.role
  const isGM       = role === 'general_manager'
  const isAdmin     = role === 'administrator'
  const isBilling   = role === 'billing_admin'
  const isEmployer  = ['employer_admin','employer_user'].includes(role)

  // Filter to what this user can see
  const myCases = cases.filter(c => {
    if (isEmployer) return c.employerId === currentUser.employer && c.workspace === 'employer'
    if (isAdmin)    return c.assignedTo === currentUser.id
    if (isBilling)  return c.assignedTo === currentUser.id || c.status === 'Sent to Billing'
    return true // GM sees all
  })

  const empCases = cases.filter(c => c.workspace === 'employer')
  const intCases = cases.filter(c => c.workspace === 'internal')
  const myBilling = billingTasks.filter(bt => isBilling ? bt.assignedTo === currentUser.id : true)

  const open     = myCases.filter(c => !['Completed','Closed','Billing Complete'].includes(c.status))
  const overdue  = myCases.filter(c => slaStatus(c.slaDate, c.status) === 'overdue')
  const escalated= myCases.filter(c => c.escalated)
  const closed   = myCases.filter(c => ['Completed','Closed'].includes(c.status))

  // Workload per team member (GM view)
  const staffWorkload = users.filter(u => ['administrator','billing_admin'].includes(u.role)).map(u => ({
    ...u,
    open: cases.filter(c => c.assignedTo === u.id && !['Completed','Closed','Billing Complete'].includes(c.status)).length,
  }))

  // Category breakdown
  const catBreakdown = categories.filter(c => c.id !== 'cat7').map(cat => {
    const typeIds = caseTypes.filter(ct => ct.categoryId === cat.id).map(ct => ct.id)
    return { ...cat, count: empCases.filter(c => typeIds.includes(c.caseTypeId)).length }
  }).filter(c => c.count > 0)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'fadeIn .3s ease' }}>
      <div>
        <h1 style={{ fontSize:21, fontWeight:800, color:T.text, margin:'0 0 3px', letterSpacing:'-0.5px' }}>
          {isGM ? 'Management Dashboard' : isAdmin ? 'My Workbench' : isBilling ? 'Billing Dashboard' : 'My Cases'}
        </h1>
        <p style={{ margin:0, color:T.gray, fontSize:12 }}>
          {currentUser.name} · {new Date().toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
        </p>
      </div>

      {/* Quick actions — internal staff only */}
      {(isAdmin || isGM) && (
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button onClick={()=>onNav('cases')} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:9, cursor:'pointer', fontSize:12, fontWeight:600, color:T.text, fontFamily:'inherit', transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.orange; e.currentTarget.style.background=T.orangeL}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background='#fff'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill={T.orange}><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            New Case
          </button>
          <button onClick={()=>onNav('email_intake')} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', background:T.orangeL, border:`1px solid ${T.orange}40`, borderRadius:9, cursor:'pointer', fontSize:12, fontWeight:700, color:T.orange, fontFamily:'inherit', transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background=T.orange; e.currentTarget.style.color='#fff'}}
            onMouseLeave={e=>{e.currentTarget.style.background=T.orangeL; e.currentTarget.style.color=T.orange}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            📧 Case from Email
          </button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14 }}>
        <KPI label="Open Cases"     value={open.length}      icon="cases"   color={T.blue}  trend={3} />
        <KPI label="Overdue"        value={overdue.length}   icon="warning" color={T.red}   />
        <KPI label="Escalated"      value={escalated.length} icon="bell"    color="#be123c" />
        <KPI label="Completed"      value={closed.length}    icon="check"   color={T.green} sub="All time"/>
        {(isGM || isBilling) && <KPI label="Billing Queue" value={myBilling.filter(bt=>!['Billing Complete'].includes(bt.status)).length} icon="sla" color={T.purple} />}
        {isGM && <KPI label="Internal Cases" value={intCases.filter(c=>!['Completed','Closed'].includes(c.status)).length} icon="audit" color={T.gray} />}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:16 }}>

        {/* Open / recent cases */}
        <Card>
          <CardHead title={isAdmin ? 'My Assigned Cases' : isEmployer ? 'Recent Cases' : 'Open Cases'}
            action={<button onClick={()=>onNav('cases')} style={{ fontSize:12, color:T.orange, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>View all →</button>} />
          {open.slice(0,6).map(c => {
            const ct  = caseTypes.find(x => x.id===c.caseTypeId)
            const emp = employers.find(x => x.id===c.employerId)
            return (
              <div key={c.id} onClick={()=>onOpenCase(c)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderBottom:'1px solid #f9fafb', cursor:'pointer', transition:'background .1s' }}
                onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:2 }}>
                    <span style={{ fontFamily:'monospace', fontSize:11, color:T.gray, fontWeight:700 }}>{c.ref}</span>
                    <StatusBadge status={c.status}/>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ct?.name}</div>
                  <div style={{ fontSize:11, color:T.gray }}>{emp?.name}{c.memberName ? ` · ${c.memberName}` : ''}</div>
                </div>
                <SLAChip slaDate={c.slaDate} status={c.status}/>
                <Icon name="chevron_r" size={14} color={T.border}/>
              </div>
            )
          })}
          {open.length===0 && <Empty message="No open cases." />}
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHead title="Cases by Category"/>
          <div style={{ padding:'14px 16px' }}>
            {catBreakdown.map(cat => (
              <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, cursor:'pointer' }}
                onClick={()=>onNav('cases',{category:cat.id})}>
                <div style={{ width:8, height:8, borderRadius:2, background:cat.color, flexShrink:0 }}/>
                <div style={{ flex:1, fontSize:13, color:T.text }}>{cat.name}</div>
                <div style={{ fontSize:16, fontWeight:800, color:cat.color }}>{cat.count}</div>
              </div>
            ))}
            {catBreakdown.length===0 && <Empty message="No cases yet." />}
          </div>
        </Card>

        {/* GM: Team workload */}
        {isGM && (
          <Card>
            <CardHead title="Team Workload"/>
            <div style={{ padding:'12px 16px' }}>
              {staffWorkload.map(u => (
                <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:u.role==='billing_admin'?T.purple:T.blue, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{u.avatar}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
                    <div style={{ height:4, background:'#f3f4f6', borderRadius:2, marginTop:4 }}>
                      <div style={{ height:'100%', width:`${Math.min((u.open/8)*100,100)}%`, background:u.role==='billing_admin'?T.purple:T.blue, borderRadius:2, transition:'width .4s' }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:13, fontWeight:800, color:T.text, minWidth:20, textAlign:'right' }}>{u.open}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* GM: SLA / escalation queue */}
        {isGM && escalated.length > 0 && (
          <Card>
            <CardHead title={`Escalation Queue (${escalated.length})`}/>
            {escalated.map(c => {
              const ct  = caseTypes.find(x=>x.id===c.caseTypeId)
              const emp = employers.find(x=>x.id===c.employerId)
              return (
                <div key={c.id} onClick={()=>onOpenCase(c)}
                  style={{ display:'flex', gap:10, padding:'11px 16px', borderBottom:'1px solid #fff1f2', cursor:'pointer', background:'#fff8f8' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#fff1f2'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff8f8'}>
                  <Icon name="warning" size={15} color={T.red}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{ct?.name}</div>
                    <div style={{ fontSize:11, color:T.gray }}>{emp?.name} · SLA: {c.slaDate}</div>
                  </div>
                </div>
              )
            })}
          </Card>
        )}

        {/* Billing dashboard — pending tasks */}
        {(isGM || isBilling) && (
          <Card>
            <CardHead title="Billing Queue"
              action={<button onClick={()=>onNav('billing')} style={{ fontSize:12, color:T.orange, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>Open Workbench →</button>}/>
            {myBilling.filter(bt=>bt.status!=='Billing Complete').slice(0,5).map(bt => {
              const emp = employers.find(x=>x.id===bt.employerId)
              return (
                <div key={bt.id} onClick={()=>onOpenBilling&&onOpenBilling(bt)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderBottom:'1px solid #f9fafb', cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:2 }}>
                      <span style={{ fontFamily:'monospace', fontSize:11, color:T.gray, fontWeight:700 }}>{bt.ref}</span>
                      <StatusBadge status={bt.status}/>
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{bt.transactionType}</div>
                    <div style={{ fontSize:11, color:T.gray }}>{emp?.name} · {bt.memberName}</div>
                  </div>
                  <Icon name="chevron_r" size={14} color={T.border}/>
                </div>
              )
            })}
            {myBilling.filter(bt=>bt.status!=='Billing Complete').length===0 && <Empty message="No pending billing tasks." />}
          </Card>
        )}

      </div>
    </div>
  )
}
