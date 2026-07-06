import { T, INITIAL_CATEGORIES, slaStatus } from '../data.js'
import { KPI, BarRow, Card, CardHead, StatusBadge, SLAChip, Icon, Empty } from '../ui.jsx'

function calcHealthScore(open, overdue, billingPending, escalated) {
  let score = 100
  if (overdue.length > 0)       score -= Math.min(overdue.length * 8, 40)
  if (billingPending > 5)       score -= Math.min((billingPending - 5) * 3, 20)
  if (escalated.length > 0)     score -= Math.min(escalated.length * 5, 20)
  return Math.max(0, score)
}

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

  const pendingBillingCount = myBilling.filter(bt=>!['Billing Complete'].includes(bt.status)).length
  const healthScore = calcHealthScore(open, overdue, pendingBillingCount, escalated)
  const healthCfg   = healthScore >= 80
    ? { label:'HEALTHY',  color:'#059669', bg:'#f0fdf4', border:'#bbf7d0' }
    : healthScore >= 60
    ? { label:'AMBER',    color:'#d97706', bg:'#fffbeb', border:'#fde68a' }
    : { label:'CRITICAL', color:'#dc2626', bg:'#fff1f2', border:'#fecaca' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'fadeIn .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:21, fontWeight:800, color:T.text, margin:'0 0 3px', letterSpacing:'-0.5px' }}>
            {isGM ? 'Management Dashboard' : isAdmin ? 'My Workbench' : isBilling ? 'Billing Dashboard' : 'My Cases'}
          </h1>
          <p style={{ margin:0, color:T.gray, fontSize:12 }}>
            {currentUser.name} · {new Date().toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </p>
        </div>
        {(isGM || isAdmin) && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:healthCfg.bg, border:`1.5px solid ${healthCfg.border}`, borderRadius:10, cursor:'pointer' }}
            onClick={()=>onNav('leandre_ai')}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'#fff', border:`2px solid ${healthCfg.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:healthCfg.color }}>
              {healthScore}
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:healthCfg.color }}>{healthCfg.label}</div>
              <div style={{ fontSize:10, color:T.gray }}>Operations Health · View Leandre AI →</div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions — Administrator and General Manager only */}
      {(isAdmin || isGM) && (
        <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, padding:'16px 18px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Quick Actions</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>

            {/* New Case */}
            <QuickAction
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>}
              label="Create New Case"
              color={T.orange}
              onClick={()=>onNav('cases')}
            />

            {/* Internal Case */}
            <QuickAction
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>}
              label="Create Internal Case"
              color={T.blue}
              onClick={()=>onNav('internal_cases')}
            />

            {/* Case from Email — admin/GM only */}
            <QuickAction
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>}
              label="📧 Case from Email"
              color={T.navy}
              highlight
              onClick={()=>onNav('email_intake')}
            />

            {/* Billing Task — GM and billing-accessible admins */}
            {(isGM) && (
              <QuickAction
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>}
                label="Create Billing Task"
                color={T.purple}
                onClick={()=>onNav('billing')}
              />
            )}

          </div>
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

// ─── Quick Action button component ───────────────────────────────────────────
function QuickAction({ icon, label, color, onClick, highlight }) {
  const base = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 16px',
    background: highlight ? color : '#fff',
    border: `1px solid ${highlight ? color : T.border}`,
    borderRadius: 9, cursor: 'pointer',
    fontSize: 12, fontWeight: 700,
    color: highlight ? '#fff' : T.text,
    fontFamily: 'inherit', transition: 'all .15s',
  }
  return (
    <button
      onClick={onClick}
      style={base}
      onMouseEnter={e => {
        e.currentTarget.style.background = color
        e.currentTarget.style.color = '#fff'
        e.currentTarget.style.borderColor = color
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = highlight ? color : '#fff'
        e.currentTarget.style.color = highlight ? '#fff' : T.text
        e.currentTarget.style.borderColor = highlight ? color : T.border
      }}
    >
      <span style={{ color: 'inherit', display: 'flex' }}>{icon}</span>
      {label}
    </button>
  )
}
