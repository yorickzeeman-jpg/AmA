import { useState, useEffect, useMemo } from 'react'
import { T, businessDaysElapsed, businessDaysRemaining, escalationLevel } from '../data.js'
import { Card, Btn } from '../ui.jsx'

// ── Business day wrappers ─────────────────────────────────────────────────────
function daysSince(dateStr) { return businessDaysElapsed(dateStr) }
function getEscalationLevel(c) { return escalationLevel(c.created, c.slaDays || 5) }

function getHealthScore(stats) {
  let score = 100
  if (stats.slaBreached > 0)        score -= Math.min(stats.slaBreached * 8, 40)
  if (stats.pendingBilling > 5)     score -= Math.min((stats.pendingBilling - 5) * 3, 20)
  if (stats.noActivity > 0)         score -= Math.min(stats.noActivity * 5, 20)
  if (stats.escalated > 0)          score -= Math.min(stats.escalated * 5, 20)
  return Math.max(0, score)
}

function HealthBadge({ score }) {
  const cfg = score >= 80
    ? { label: 'HEALTHY',  color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' }
    : score >= 60
    ? { label: 'AMBER',    color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
    : { label: 'CRITICAL', color: '#dc2626', bg: '#fff1f2', border: '#fecaca' }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:56, height:56, borderRadius:'50%', background:cfg.bg, border:`3px solid ${cfg.color}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontSize:16, fontWeight:900, color:cfg.color }}>{score}</span>
      </div>
      <div>
        <div style={{ fontSize:18, fontWeight:800, color:cfg.color }}>{cfg.label}</div>
        <div style={{ fontSize:11, color:T.gray }}>Operations Health Score</div>
      </div>
    </div>
  )
}

function StatBlock({ label, value, color, sub, alert }) {
  return (
    <div style={{ background:'#fff', borderRadius:10, padding:'14px 16px', border:`1.5px solid ${alert?color+'50':T.border}`, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color }}/>
      <div style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color: alert ? color : T.text }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.gray, marginTop:2 }}>{sub}</div>}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function LeandreAI({ cases, billingTasks, employers, users, currentUser }) {
  const [activeTab, setTab]       = useState('dashboard')
  const [insights, setInsights]   = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [sendingReport, setSending] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const today = new Date().toISOString().split('T')[0]

  // ── COMPUTED STATS ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const open       = cases.filter(c => !['Completed','Closed','Sent to Billing'].includes(c.status))
    const closed     = cases.filter(c => ['Completed','Closed'].includes(c.status))
    const newToday   = cases.filter(c => c.created === today)
    const escalated  = cases.filter(c => c.escalated)

    const slaBreached = open.filter(c => {
      if (!c.slaDate) return false
      return businessDaysRemaining(c.slaDate) < 0
    })

    const noActivity = open.filter(c => daysSince(c.created) >= 3 && (!c.audit || c.audit.length <= 1))

    const pendingBilling = billingTasks.filter(bt => bt.billingStatus === 'Pending Review')

    // Staff workloads
    const workloads = {}
    open.forEach(c => {
      if (!c.assignedTo) return
      workloads[c.assignedTo] = (workloads[c.assignedTo] || 0) + 1
    })

    // Cases stuck in workflow (no step progress in 2+ days)
    const stalled = open.filter(c => {
      if (!c.workflow?.steps) return false
      const lastActivity = c.audit?.filter(a=>a.type==='workflow')?.slice(-1)?.[0]?.time
      return lastActivity ? daysSince(lastActivity) >= 2 : daysSince(c.created) >= 2
    })

    // Avg resolution time
    const resolved = closed.filter(c => c.created && c.audit?.some(a=>a.type==='status'&&a.action?.includes('Completed')))
    const avgResolution = resolved.length
      ? Math.round(resolved.reduce((s,c) => s + daysSince(c.created), 0) / resolved.length)
      : 0

    return {
      totalOpen:       open.length,
      totalClosed:     closed.length,
      newToday:        newToday.length,
      escalated:       escalated.length,
      slaBreached:     slaBreached.length,
      noActivity:      noActivity.length,
      pendingBilling:  pendingBilling.length,
      stalled:         stalled.length,
      workloads,
      slaBreachedCases:  slaBreached,
      noActivityCases:   noActivity,
      stalledCases:      stalled,
      escalatedCases:    escalated,
      openCases:         open,
      avgResolution,
    }
  }, [cases, billingTasks, today])

  const healthScore = getHealthScore(stats)

  // ── ESCALATION ALERTS ─────────────────────────────────────────────────────
  const escalationAlerts = useMemo(() => {
    return stats.openCases
      .map(c => ({ c, esc: getEscalationLevel(c) }))
      .filter(({ esc }) => esc !== null)
      .sort((a, b) => b.esc.level - a.esc.level)
  }, [stats.openCases])

  // ── AI INSIGHTS ───────────────────────────────────────────────────────────
  async function generateInsights() {
    setLoadingAI(true)
    try {
      const summary = {
        totalOpen:      stats.totalOpen,
        slaBreached:    stats.slaBreached,
        stalled:        stats.stalled,
        noActivity:     stats.noActivity,
        pendingBilling: stats.pendingBilling,
        escalated:      stats.escalated,
        healthScore,
        workloads: Object.entries(stats.workloads).map(([uid, count]) => ({
          name: users.find(u=>u.id===uid)?.name || uid,
          count
        })),
        slaBreachedCases: stats.slaBreachedCases.slice(0,5).map(c=>({ ref:c.ref, type:c.caseTypeName, days:daysSince(c.created) })),
        stalledCases: stats.stalledCases.slice(0,5).map(c=>({ ref:c.ref, type:c.caseTypeName, days:daysSince(c.created) })),
      }

      const response = await fetch('/api/leandre-insights', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ summary, date: today }),
      })

      if (response.ok) {
        const { insights: text } = await response.json()
        setInsights(text)
      } else {
        setInsights(generateLocalInsights(stats, users))
      }
    } catch(e) {
      setInsights(generateLocalInsights(stats, users))
    }
    setLoadingAI(false)
  }

  // Local fallback insights when API unavailable
  function generateLocalInsights(s, u) {
    const lines = []
    if (s.slaBreached > 0)   lines.push(`⚠️ ${s.slaBreached} case${s.slaBreached!==1?'s':''} have breached SLA and require immediate attention.`)
    if (s.stalled > 0)       lines.push(`🔴 ${s.stalled} case${s.stalled!==1?'s':''} show no workflow activity for 2+ days — possible bottleneck.`)
    if (s.noActivity > 0)    lines.push(`📋 ${s.noActivity} case${s.noActivity!==1?'s':''} have had no activity since creation — follow-up required.`)
    if (s.pendingBilling > 0) lines.push(`💳 ${s.pendingBilling} billing action${s.pendingBilling!==1?'s':''} are pending review — billing queue needs attention.`)

    // Workload imbalance
    const loads = Object.entries(s.workloads)
    if (loads.length > 1) {
      const max = Math.max(...loads.map(([,v])=>v))
      const min = Math.min(...loads.map(([,v])=>v))
      if (max > min * 2) {
        const overloaded = loads.find(([,v])=>v===max)
        const name = u.find(x=>x.id===overloaded[0])?.name || 'Unknown'
        lines.push(`📊 Workload imbalance detected: ${name} has ${max} cases vs others with ${min}. Consider rebalancing.`)
      }
    }

    if (s.totalOpen === 0)   lines.push(`✅ No open cases. All workflows clear.`)
    if (healthScore >= 80)   lines.push(`✅ Operations health is strong at ${healthScore}/100.`)

    return lines.join('\n\n')
  }

  // ── SEND DAILY REPORT ─────────────────────────────────────────────────────
  async function sendDailyReport() {
    setSending(true)
    try {
      const response = await fetch('/api/send-daily-report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          stats, healthScore, escalationAlerts: escalationAlerts.slice(0,10),
          insights: insights || generateLocalInsights(stats, users),
          date: today, generatedBy: currentUser.name,
        }),
      })
      setReportSent(response.ok)
    } catch(e) {
      setReportSent(false)
    }
    setSending(false)
    setTimeout(() => setReportSent(false), 5000)
  }

  const tabs = [
    { id:'dashboard', label:'Operations Dashboard' },
    { id:'sla',       label:'SLA Monitor' },
    { id:'workload',  label:'Staff Workload' },
    { id:'billing',   label:'Billing Monitor' },
    { id:'insights',  label:'AI Insights' },
    { id:'report',    label:'Daily Report' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, animation:'fadeIn .3s ease' }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${T.navy},#1e4a8a)`, borderRadius:12, padding:'20px 24px', marginBottom:16, color:'#fff' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>Amadwala Employee Benefits</div>
            <div style={{ fontSize:22, fontWeight:900, marginBottom:2 }}>Leandre AI</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>Operations Monitoring Engine · Last updated {lastUpdated.toLocaleTimeString()}</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={()=>setLastUpdated(new Date())}
              style={{ padding:'7px 14px', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, color:'#fff', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              Refresh
            </button>
            <button onClick={sendDailyReport} disabled={sendingReport}
              style={{ padding:'7px 14px', background:T.orange, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:sendingReport?0.7:1 }}>
              {sendingReport ? 'Sending…' : 'Send Daily Report'}
            </button>
          </div>
        </div>

        {/* Health score + key metrics */}
        <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:20, marginTop:16, alignItems:'center' }}>
          <HealthBadge score={healthScore}/>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:8 }}>
            {[
              ['Open Cases',      stats.totalOpen,      '#fff',     stats.totalOpen > 20],
              ['SLA Breached',    stats.slaBreached,    '#fca5a5',  stats.slaBreached > 0],
              ['No Activity',     stats.noActivity,     '#fde68a',  stats.noActivity > 0],
              ['Pending Billing', stats.pendingBilling, '#c4b5fd',  stats.pendingBilling > 5],
              ['Escalated',       stats.escalated,      '#fca5a5',  stats.escalated > 0],
            ].map(([l,v,c,alert])=>(
              <div key={l} style={{ background:'rgba(255,255,255,0.1)', borderRadius:8, padding:'10px 12px', border:`1px solid ${alert?c+'60':'rgba(255,255,255,0.15)'}` }}>
                <div style={{ fontSize:20, fontWeight:800, color:alert?c:'#fff' }}>{v}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)', fontWeight:600, textTransform:'uppercase' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {reportSent && (
          <div style={{ marginTop:12, padding:'8px 14px', background:'rgba(5,150,105,0.3)', border:'1px solid rgba(5,150,105,0.5)', borderRadius:8, fontSize:12, color:'#6ee7b7' }}>
            Daily report sent successfully to Leandre
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background:'#fff', borderRadius:'10px 10px 0 0', border:`1px solid ${T.border}`, borderBottom:'none', display:'flex', overflowX:'auto' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={()=>setTab(tab.id)}
            style={{ padding:'11px 18px', background:'none', border:'none', borderBottom:activeTab===tab.id?`2px solid ${T.orange}`:'2px solid transparent', color:activeTab===tab.id?T.orange:T.gray, fontWeight:activeTab===tab.id?700:400, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', marginBottom:-1 }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ border:`1px solid ${T.border}`, borderTop:'none', borderRadius:'0 0 10px 10px', background:'#fff', padding:20 }}>

        {/* ── OPERATIONS DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
              <StatBlock label="Total Open"       value={stats.totalOpen}      color={T.blue}    sub="active cases"/>
              <StatBlock label="Closed Today"     value={stats.totalClosed}    color='#059669'   sub="completed"/>
              <StatBlock label="New Today"        value={stats.newToday}       color={T.purple}  sub="created today"/>
              <StatBlock label="Avg Resolution"   value={`${stats.avgResolution}d`} color={T.navy} sub="average days"/>
              <StatBlock label="SLA Breached"     value={stats.slaBreached}    color={T.red}     sub="overdue" alert={stats.slaBreached>0}/>
              <StatBlock label="Stalled"          value={stats.stalled}        color={T.amber}   sub="no workflow activity" alert={stats.stalled>0}/>
            </div>

            {/* Escalation alerts */}
            {escalationAlerts.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>
                  Escalation Alerts ({escalationAlerts.length})
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {escalationAlerts.slice(0,8).map(({ c, esc }) => {
                    const emp = employers?.find(e=>e.id===c.employerId)
                    return (
                      <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:esc.bg, border:`1px solid ${esc.color}25`, borderRadius:9, borderLeft:`3px solid ${esc.color}` }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                            <span style={{ fontFamily:'monospace', fontSize:11, color:esc.color, fontWeight:700 }}>{c.ref}</span>
                            <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{c.caseTypeName}</span>
                            {emp && <span style={{ fontSize:11, color:T.gray }}>{emp.name}</span>}
                          </div>
                          <div style={{ fontSize:11, color:T.gray, marginTop:2 }}>
                            {daysSince(c.created)} days old · {c.memberName||'No member'} · Status: {c.status}
                          </div>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background:esc.color+'20', color:esc.color, whiteSpace:'nowrap', flexShrink:0 }}>
                          Escalate to {esc.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Cases needing attention */}
            {stats.noActivityCases.length > 0 && (
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>
                  Cases Without Activity ({stats.noActivityCases.length})
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
                    <thead><tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                      {['Ref','Case Type','Employer','Days Old','Assigned To'].map(h=>(
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{stats.noActivityCases.slice(0,10).map(c=>{
                      const emp  = employers?.find(e=>e.id===c.employerId)
                      const user = users?.find(u=>u.id===c.assignedTo)
                      return (
                        <tr key={c.id} style={{ borderBottom:'1px solid #f9fafb' }}>
                          <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:11, color:T.blue }}>{c.ref}</td>
                          <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600 }}>{c.caseTypeName}</td>
                          <td style={{ padding:'9px 12px', fontSize:12, color:T.gray }}>{emp?.name||'—'}</td>
                          <td style={{ padding:'9px 12px' }}>
                            <span style={{ fontSize:11, fontWeight:700, color:T.amber, background:'#fffbeb', padding:'2px 7px', borderRadius:10 }}>
                              {daysSince(c.created)}d
                            </span>
                          </td>
                          <td style={{ padding:'9px 12px', fontSize:12 }}>{user?.name||'Unassigned'}</td>
                        </tr>
                      )
                    })}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SLA MONITOR ── */}
        {activeTab === 'sla' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
              <StatBlock label="SLA Breached"   value={stats.slaBreached}  color={T.red}   alert={stats.slaBreached>0}/>
              <StatBlock label="At Risk (>80%)" value={stats.openCases.filter(c=>c.slaDate&&new Date(c.slaDate)>new Date()&&(new Date(c.slaDate)-new Date())<(2*86400000)).length} color={T.amber} sub="within 2 days"/>
              <StatBlock label="On Track"       value={stats.openCases.filter(c=>!c.slaDate||new Date(c.slaDate)>new Date()).length} color='#059669'/>
            </div>

            {stats.slaBreachedCases.length > 0 ? (
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>Breached Cases</div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#fff1f2', borderBottom:`1px solid #fecaca` }}>
                      {['Ref','Case Type','Employer','SLA Date','Days Overdue','Assigned To','Action'].map(h=>(
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.red, textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{stats.slaBreachedCases.map(c=>{
                      const emp  = employers?.find(e=>e.id===c.employerId)
                      const user = users?.find(u=>u.id===c.assignedTo)
                      const overdue = c.slaDate ? Math.ceil((new Date()-new Date(c.slaDate))/(86400000)) : 0
                      return (
                        <tr key={c.id} style={{ borderBottom:'1px solid #fef2f2', background:'#fffafa' }}>
                          <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:11, color:T.red, fontWeight:700 }}>{c.ref}</td>
                          <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600 }}>{c.caseTypeName}</td>
                          <td style={{ padding:'9px 12px', fontSize:12, color:T.gray }}>{emp?.name||'—'}</td>
                          <td style={{ padding:'9px 12px', fontSize:11, fontFamily:'monospace', color:T.red }}>{c.slaDate}</td>
                          <td style={{ padding:'9px 12px' }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'#fff', background:T.red, padding:'2px 8px', borderRadius:10 }}>+{overdue}d</span>
                          </td>
                          <td style={{ padding:'9px 12px', fontSize:12 }}>{user?.name||'Unassigned'}</td>
                          <td style={{ padding:'9px 12px' }}>
                            <button style={{ padding:'4px 10px', background:'#fff1f2', border:'1px solid #fecaca', borderRadius:6, color:T.red, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              Escalate
                            </button>
                          </td>
                        </tr>
                      )
                    })}</tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:40, color:T.gray }}>
                <div style={{ fontSize:32, marginBottom:8, color:'#059669' }}>✓</div>
                <div style={{ fontSize:14, fontWeight:600, color:T.text }}>No SLA breaches</div>
                <div style={{ fontSize:12, marginTop:4 }}>All cases are within their SLA targets.</div>
              </div>
            )}
          </div>
        )}

        {/* ── STAFF WORKLOAD ── */}
        {activeTab === 'workload' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:20 }}>
              {users.filter(u=>['administrator','general_manager','billing_admin'].includes(u.role)&&u.status==='active').map(u=>{
                const count    = stats.workloads[u.id] || 0
                const breached = stats.slaBreachedCases.filter(c=>c.assignedTo===u.id).length
                const pct      = Math.max(...Object.values(stats.workloads||{0:1})) > 0
                  ? Math.round((count / Math.max(...Object.values(stats.workloads||{0:1}))) * 100)
                  : 0
                const clr = count > 8 ? T.red : count > 5 ? T.amber : T.green
                return (
                  <div key={u.id} style={{ background:'#fff', borderRadius:12, padding:'16px', border:`1.5px solid ${T.border}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:T.navy, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>
                        {u.avatar||u.name.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{u.name}</div>
                        <div style={{ fontSize:10, color:T.gray, textTransform:'capitalize' }}>{u.role.replace(/_/g,' ')}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ fontSize:11, color:T.gray }}>Open cases</span>
                      <span style={{ fontSize:14, fontWeight:800, color:clr }}>{count}</span>
                    </div>
                    <div style={{ height:6, background:'#f3f4f6', borderRadius:3, overflow:'hidden', marginBottom:6 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:clr, borderRadius:3, transition:'width .4s' }}/>
                    </div>
                    {breached > 0 && (
                      <div style={{ fontSize:11, color:T.red, fontWeight:600 }}>⚠ {breached} SLA breach{breached!==1?'es':''}</div>
                    )}
                    {count === 0 && <div style={{ fontSize:11, color:T.gray, fontStyle:'italic' }}>No open cases</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── BILLING MONITOR ── */}
        {activeTab === 'billing' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
              <StatBlock label="Pending Review"    value={billingTasks.filter(bt=>bt.billingStatus==='Pending Review').length}    color={T.amber} alert={billingTasks.filter(bt=>bt.billingStatus==='Pending Review').length>0}/>
              <StatBlock label="Approved"          value={billingTasks.filter(bt=>bt.billingStatus==='Approved').length}          color={T.blue}/>
              <StatBlock label="Applied to Bill"   value={billingTasks.filter(bt=>bt.billingStatus==='Applied to Bill').length}   color='#059669'/>
              <StatBlock label="Declined"          value={billingTasks.filter(bt=>bt.billingStatus==='Declined').length}          color={T.gray}/>
            </div>

            {billingTasks.filter(bt=>bt.billingStatus==='Pending Review').length > 0 && (
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>Pending Review</div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#fffbeb', borderBottom:`1px solid #fde68a` }}>
                      {['Action Type','Member','Employer','Case Ref','Created'].map(h=>(
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#92400e', textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{billingTasks.filter(bt=>bt.billingStatus==='Pending Review').map(bt=>{
                      const emp = employers?.find(e=>e.id===bt.employerId)
                      return (
                        <tr key={bt.id} style={{ borderBottom:'1px solid #f9fafb' }}>
                          <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600 }}>{bt.actionType}</td>
                          <td style={{ padding:'9px 12px', fontSize:12 }}>{bt.memberName||'—'}</td>
                          <td style={{ padding:'9px 12px', fontSize:12, color:T.gray }}>{emp?.name||'—'}</td>
                          <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:11, color:T.blue }}>{bt.linkedCaseRef}</td>
                          <td style={{ padding:'9px 12px', fontSize:11, color:T.gray }}>{bt.created?.split('T')[0]||'—'}</td>
                        </tr>
                      )
                    })}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AI INSIGHTS ── */}
        {activeTab === 'insights' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:T.text }}>AI-Generated Operational Insights</div>
                <div style={{ fontSize:12, color:T.gray, marginTop:2 }}>Powered by Claude · Based on current portal data</div>
              </div>
              <button onClick={generateInsights} disabled={loadingAI}
                style={{ padding:'9px 18px', background:T.navy, border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:loadingAI?'not-allowed':'pointer', fontFamily:'inherit', opacity:loadingAI?0.7:1 }}>
                {loadingAI ? 'Analysing…' : 'Generate Insights'}
              </button>
            </div>

            {!insights && !loadingAI && (
              <div style={{ textAlign:'center', padding:48, color:T.gray, background:'#f9fafb', borderRadius:12, border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:6 }}>Ready to analyse</div>
                <div style={{ fontSize:12 }}>Click Generate Insights to get an AI-powered operational briefing based on current case data.</div>
              </div>
            )}

            {loadingAI && (
              <div style={{ textAlign:'center', padding:48, color:T.gray }}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:8 }}>Analysing operations…</div>
                <div style={{ height:4, background:'#f3f4f6', borderRadius:2, overflow:'hidden', maxWidth:300, margin:'0 auto' }}>
                  <div style={{ height:'100%', background:T.orange, borderRadius:2, animation:'pulse 1.5s infinite' }}/>
                </div>
              </div>
            )}

            {insights && (
              <div style={{ background:'#f8f9fb', borderRadius:12, padding:'20px 22px', border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>
                  Leandre AI · {new Date().toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                </div>
                {insights.split('\n\n').map((para, i) => (
                  <p key={i} style={{ fontSize:13, color:'#374151', lineHeight:1.7, marginBottom:10, margin:'0 0 10px' }}>{para}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DAILY REPORT ── */}
        {activeTab === 'report' && (
          <div>
            <div style={{ background:'#f0f7ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.blue, marginBottom:4 }}>Daily Operations Report</div>
              <div style={{ fontSize:12, color:'#374151', lineHeight:1.6 }}>
                Sends a comprehensive operations summary to <strong>Leandre van der Merwe</strong> via email.
                Includes open cases, SLA status, billing queue, staff workloads and AI insights.
              </div>
            </div>

            {/* Report preview */}
            <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden', marginBottom:16 }}>
              <div style={{ padding:'12px 16px', background:T.navy, color:'#fff', fontSize:13, fontWeight:700 }}>
                Report Preview — {today}
              </div>
              <div style={{ padding:'16px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                  {[
                    ['Open Cases',       stats.totalOpen],
                    ['Closed Today',     stats.totalClosed],
                    ['SLA Breached',     stats.slaBreached],
                    ['Pending Billing',  stats.pendingBilling],
                    ['Escalated',        stats.escalated],
                    ['No Activity',      stats.noActivity],
                  ].map(([l,v])=>(
                    <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', background:'#f9fafb', borderRadius:7 }}>
                      <span style={{ fontSize:12, color:T.gray }}>{l}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:12, color:T.gray, borderTop:`1px solid ${T.border}`, paddingTop:12 }}>
                  Health Score: <strong style={{ color:healthScore>=80?'#059669':healthScore>=60?T.amber:T.red }}>{healthScore}/100</strong> ·
                  Generated by {currentUser.name} · {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            <button onClick={sendDailyReport} disabled={sendingReport}
              style={{ padding:'11px 24px', background:T.orange, border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:sendingReport?'not-allowed':'pointer', fontFamily:'inherit', opacity:sendingReport?0.7:1 }}>
              {sendingReport ? 'Sending Report…' : 'Send Daily Report to Leandre'}
            </button>

            {reportSent && (
              <div style={{ marginTop:10, padding:'10px 14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, fontSize:12, fontWeight:700, color:'#059669' }}>
                Report sent successfully
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
