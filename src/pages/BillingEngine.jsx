import { useState, useRef, useMemo } from 'react'
import { T } from '../data.js'
import { Card, Btn, inputSt, selectSt } from '../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// AEB BILLING ENGINE — Phase 5
//
// Five billing streams for Amadwala Employee Benefits:
//   1. Medical Aid          — Discovery Health
//   2. Retirement Fund      — Igula / Alexander Forbes
//   3. Risk Benefits        — GLA + PHI / Discovery Group Risk
//   4. Funeral Cover        — R57 main policy
//   5. Extended Family      — Extended family funeral cover
//
// Member identification priority: Membership No. → Payroll No. → ID Number
// Flow: Upload previous month → view baseline → apply approved actions → produce new month bill
// ═════════════════════════════════════════════════════════════════════════════

const STREAMS = [
  { id:'medical',    label:'Medical Aid',           color:'#dc2626', sub:'Discovery Health · Scheme 4342893' },
  { id:'retirement', label:'Retirement Fund',        color:'#1e5fd9', sub:'Igula Umbrella · Alexander Forbes' },
  { id:'risk',       label:'Risk Benefits',          color:'#059669', sub:'GLA + PHI · Discovery Group Risk' },
  { id:'funeral',    label:'Funeral Cover',          color:'#7c3aed', sub:'Main Policy · R57/member' },
  { id:'extended',   label:'Extended Family Funeral',color:'#d97706', sub:'Extended family members' },
]

// ─── PARSE UPLOADED SCHEDULE ─────────────────────────────────────────────────
function parseSchedule(text, streamId) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 2) return []

  const header = lines[0]
  const delim  = header.includes('\t') ? '\t' : ','
  const headers = header.split(delim).map(h => h.replace(/"/g,'').trim().toLowerCase())

  function col(...names) {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name.toLowerCase()))
      if (idx !== -1) return idx
    }
    return -1
  }

  // All three identifiers
  const membershipIdx = col('membership','mem no','member no','memb')
  const payrollIdx    = col('payroll','pay no','emp no','employee no')
  const idIdx         = col('id number','id no','identity','id_number','national id')
  const nameIdx       = col('name','member name','first name','firstname')
  const surnameIdx    = col('surname','last name','lastname')
  const premiumIdx    = col('premium','amount','total','contribution','monthly')
  const statusIdx     = col('status')
  const employerIdx   = col('employer','company')

  // Stream-specific columns
  const planIdx       = col('plan','option','scheme option','medical plan')
  const categoryIdx   = col('category','benefit cat','cat','contribution cat')
  const coverIdx      = col('cover','cover amount','sum assured')
  const dependantsIdx = col('dependant','dependent','dep count')
  const relationIdx   = col('relationship','relation')
  const dobIdx        = col('date of birth','dob','birth date')

  const members = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delim).map(c => c.replace(/"/g,'').trim())
    if (cells.length < 2) continue
    const get = idx => idx !== -1 ? (cells[idx] || '') : ''
    const name = get(nameIdx)
    if (!name) continue

    const premium = parseFloat(get(premiumIdx).replace(/[R,\s]/g,'')) || 0

    members.push({
      id:           'bm' + Date.now() + i,
      membershipNo: get(membershipIdx),
      payrollNo:    get(payrollIdx),
      idNumber:     get(idIdx),
      name:         name,
      surname:      get(surnameIdx),
      employer:     get(employerIdx) || 'Amadwala Employee Benefits',
      premium,
      status:       get(statusIdx) || 'Active',
      // Stream-specific
      plan:         get(planIdx),
      category:     get(categoryIdx),
      coverAmount:  parseFloat(get(coverIdx).replace(/[R,\s]/g,'')) || 0,
      dependants:   parseInt(get(dependantsIdx)) || 0,
      relationship: get(relationIdx),
      dob:          get(dobIdx),
      streamId,
      changes:      [],  // pending billing actions applied to this member
    })
  }
  return members
}

// ─── MEMBER IDENTIFIER ───────────────────────────────────────────────────────
function MemberId({ m }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      {m.membershipNo && <span style={{ fontFamily:'monospace', fontSize:11, color:T.blue, fontWeight:700 }}>{m.membershipNo}</span>}
      {m.payrollNo    && <span style={{ fontFamily:'monospace', fontSize:10, color:T.gray }}>PR: {m.payrollNo}</span>}
      {m.idNumber     && <span style={{ fontFamily:'monospace', fontSize:10, color:T.gray }}>ID: {m.idNumber}</span>}
    </div>
  )
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const cfg = {
    'Active':   { color:'#059669', bg:'#f0fdf4' },
    'Pending':  { color:'#d97706', bg:'#fffbeb' },
    'Exited':   { color:'#dc2626', bg:'#fff1f2' },
    'New':      { color:'#1e5fd9', bg:'#eff6ff' },
  }[status] || { color:T.gray, bg:'#f3f4f6' }
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:cfg.bg, color:cfg.color }}>
      {status}
    </span>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function BillingEngine({ billingTasks, employers, users, currentUser }) {
  const [activeStream, setStream]   = useState('medical')
  const [schedules, setSchedules]   = useState({})   // streamId → members[]
  const [uploading, setUploading]   = useState(null)  // streamId being uploaded
  const [uploadPct, setUploadPct]   = useState(0)
  const [activeTab, setTab]         = useState('current') // current | reconciliation | upload
  const [search, setSearch]         = useState('')
  const fileRef                     = useRef()

  const isBilling = ['billing_admin','general_manager'].includes(currentUser.role)
  const stream    = STREAMS.find(s => s.id === activeStream)
  const members   = schedules[activeStream] || []

  // Stats for current stream
  const stats = useMemo(() => {
    const active  = members.filter(m => m.status === 'Active')
    const total   = active.reduce((s,m) => s + (m.premium||0), 0)
    const pending = billingTasks.filter(bt =>
      bt.billingStatus === 'Pending Review' || bt.billingStatus === 'Approved'
    ).length
    return { count: active.length, total, pending }
  }, [members, billingTasks])

  // Pending billing actions for this stream
  const pendingActions = billingTasks.filter(bt =>
    bt.billingStatus === 'Pending Review' || bt.billingStatus === 'Approved'
  )

  // Projected members after applying approved actions
  const projectedMembers = useMemo(() => {
    const approved = billingTasks.filter(bt => bt.billingStatus === 'Approved')
    let result = [...members]

    approved.forEach(bt => {
      if (bt.actionType === 'Add Member') {
        result.push({
          id: 'new_'+bt.id, membershipNo:'', payrollNo:'', idNumber:'',
          name: bt.memberName||'New Member', surname:'', employer:'Amadwala Employee Benefits',
          premium: bt.newPremium||0, status:'New', streamId: activeStream, changes:['Addition'],
        })
      } else if (bt.actionType === 'Remove Member') {
        result = result.map(m =>
          (m.membershipNo && m.membershipNo === bt.membershipNo) ||
          (m.payrollNo && m.payrollNo === bt.payrollNo) ||
          m.name === bt.memberName
            ? {...m, status:'Exited', changes:['Exit']}
            : m
        )
      }
    })
    return result
  }, [members, billingTasks, activeStream])

  const visible = members.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.name?.toLowerCase().includes(q) ||
      m.surname?.toLowerCase().includes(q) ||
      m.membershipNo?.includes(q) ||
      m.payrollNo?.includes(q) ||
      m.idNumber?.includes(q)
    )
  })

  function handleUpload(file) {
    if (!file) return
    setUploading(activeStream)
    setUploadPct(0)
    const reader = new FileReader()
    reader.onload = e => {
      let pct = 0
      const iv = setInterval(() => {
        pct += 20
        setUploadPct(Math.min(pct, 90))
        if (pct >= 90) {
          clearInterval(iv)
          const parsed = parseSchedule(e.target.result, activeStream)
          setSchedules(prev => ({...prev, [activeStream]: parsed}))
          setUploadPct(100)
          setUploading(null)
          setTab('current')
        }
      }, 150)
    }
    reader.readAsText(file)
  }

  const prevTotal = members.filter(m=>m.status==='Active').reduce((s,m)=>s+(m.premium||0),0)
  const projTotal = projectedMembers.filter(m=>m.status!=='Exited').reduce((s,m)=>s+(m.premium||0),0)
  const netChange = projTotal - prevTotal

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, height:'100%', animation:'fadeIn .3s ease' }}>

      {/* Header */}
      <div style={{ padding:'0 0 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:'0 0 3px' }}>Billing Engine</h1>
          <p style={{ margin:0, fontSize:12, color:T.gray }}>Amadwala Employee Benefits · Monthly billing reconciliation</p>
        </div>
        {isBilling && (
          <div style={{ display:'flex', gap:8 }}>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv,.xlsx" onChange={e=>{if(e.target.files[0])handleUpload(e.target.files[0]);e.target.value=''}} style={{display:'none'}}/>
            <button onClick={()=>fileRef.current.click()}
              style={{ padding:'8px 16px', background:T.orange, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Upload Schedule
            </button>
          </div>
        )}
      </div>

      {/* Stream tabs */}
      <div style={{ display:'flex', gap:0, background:'#fff', borderRadius:'10px 10px 0 0', border:`1px solid ${T.border}`, borderBottom:'none', overflowX:'auto' }}>
        {STREAMS.map(s => {
          const loaded  = !!(schedules[s.id]?.length)
          const isActive = activeStream === s.id
          return (
            <button key={s.id} onClick={()=>setStream(s.id)}
              style={{ padding:'12px 20px', background:'none', border:'none', borderBottom:isActive?`2px solid ${s.color}`:'2px solid transparent', color:isActive?s.color:T.gray, fontWeight:isActive?700:400, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', marginBottom:-1, display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:4, background:isActive?s.color+'18':'#f3f4f6', color:isActive?s.color:'#9ca3af' }}>
                {s.id.toUpperCase().slice(0,3)}
              </span>
              {s.label}
              {loaded && <span style={{ width:6, height:6, borderRadius:'50%', background:s.color, flexShrink:0 }}/>}
              {!loaded && <span style={{ fontSize:9, color:'#9ca3af' }}>NO DATA</span>}
            </button>
          )
        })}
      </div>

      <div style={{ border:`1px solid ${T.border}`, borderTop:'none', borderRadius:'0 0 10px 10px', background:'#fff', flex:1, overflow:'auto' }}>

        {/* Upload progress */}
        {uploading === activeStream && (
          <div style={{ padding:32, textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:16 }}>Reading {stream?.label} schedule…</div>
            <div style={{ height:8, background:'#f3f4f6', borderRadius:4, maxWidth:320, margin:'0 auto', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${uploadPct}%`, background:stream?.color, borderRadius:4, transition:'width .2s' }}/>
            </div>
          </div>
        )}

        {/* No data state */}
        {!uploading && members.length === 0 && (
          <div style={{ textAlign:'center', padding:60, color:T.gray }}>
            <div style={{ width:56, height:56, borderRadius:12, background:stream?.color+'15', border:`2px dashed ${stream?.color}40`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:11, fontWeight:800, color:stream?.color }}>
              {stream?.id.toUpperCase().slice(0,3)}
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:6 }}>{stream?.label}</div>
            <div style={{ fontSize:12, marginBottom:4 }}>{stream?.sub}</div>
            <div style={{ fontSize:12, color:T.gray, marginBottom:20 }}>Upload the previous month's billing schedule to get started.</div>
            {isBilling && (
              <button onClick={()=>fileRef.current.click()}
                style={{ padding:'10px 24px', background:stream?.color, border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Upload {stream?.label} Schedule
              </button>
            )}
          </div>
        )}

        {/* Data loaded */}
        {!uploading && members.length > 0 && (
          <div>
            {/* KPI row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:0, borderBottom:`1px solid ${T.border}` }}>
              {[
                ['Active Members', stats.count, stream?.color],
                ['Total Premium', `R${stats.total.toLocaleString()}`, '#059669'],
                ['Pending Actions', stats.pending, stats.pending>0?'#d97706':'#9ca3af'],
                ['Net Change', `${netChange>=0?'+':''}R${Math.round(netChange).toLocaleString()}`, netChange>0?'#059669':netChange<0?'#dc2626':'#9ca3af'],
              ].map(([l,v,c])=>(
                <div key={l} style={{ padding:'16px 20px', borderRight:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Sub-tabs */}
            <div style={{ display:'flex', borderBottom:`1px solid ${T.border}`, padding:'0 16px' }}>
              {[['current','Current Bill'],['reconciliation','Reconciliation'],['pending','Pending Actions']].map(([id,lbl])=>(
                <button key={id} onClick={()=>setTab(id)}
                  style={{ padding:'10px 14px', background:'none', border:'none', borderBottom:activeTab===id?`2px solid ${T.orange}`:'2px solid transparent', color:activeTab===id?T.orange:T.gray, fontWeight:activeTab===id?700:400, fontSize:12, cursor:'pointer', fontFamily:'inherit', marginBottom:-1 }}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* CURRENT BILL */}
            {activeTab === 'current' && (
              <div>
                <div style={{ padding:'10px 16px', background:'#f9fafb', borderBottom:`1px solid ${T.border}`, display:'flex', gap:8, alignItems:'center' }}>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, membership, payroll, ID…"
                    style={{ padding:'6px 10px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, width:280 }}/>
                  <div style={{ marginLeft:'auto', fontSize:11, color:T.gray }}>{visible.length} members</div>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
                    <thead>
                      <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                        {['Member','Identifiers','Employer',
                          activeStream==='medical'    ? 'Plan'       :
                          activeStream==='retirement' ? 'Category'   :
                          activeStream==='risk'       ? 'Cover'      :
                          activeStream==='extended'   ? 'Relationship' : 'Cover',
                          'Premium','Status'].map(h=>(
                          <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map(m => (
                        <tr key={m.id} style={{ borderBottom:'1px solid #f9fafb' }}
                          onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                          <td style={{ padding:'10px 14px' }}>
                            <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{m.name} {m.surname}</div>
                          </td>
                          <td style={{ padding:'10px 14px' }}><MemberId m={m}/></td>
                          <td style={{ padding:'10px 14px', fontSize:12, color:T.gray }}>{m.employer||'—'}</td>
                          <td style={{ padding:'10px 14px', fontSize:12 }}>
                            {activeStream==='medical'    ? m.plan     :
                             activeStream==='retirement' ? m.category :
                             activeStream==='risk'       ? (m.coverAmount?`R${m.coverAmount.toLocaleString()}`:'—') :
                             activeStream==='extended'   ? m.relationship :
                             m.coverAmount ? `R${m.coverAmount.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:13, fontWeight:700, color:stream?.color }}>
                            R{m.premium?.toFixed(2)||'0.00'}
                          </td>
                          <td style={{ padding:'10px 14px' }}><StatusPill status={m.status}/></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background:'#f0fdf4', borderTop:`2px solid #bbf7d0` }}>
                        <td colSpan={4} style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:'#059669', textAlign:'right' }}>TOTAL</td>
                        <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:14, fontWeight:800, color:'#059669' }}>
                          R{visible.reduce((s,m)=>s+(m.premium||0),0).toFixed(2)}
                        </td>
                        <td/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* RECONCILIATION */}
            {activeTab === 'reconciliation' && (
              <div style={{ padding:20 }}>
                <div style={{ background:'#f0f7ff', border:'1px solid #bfdbfe', borderRadius:10, padding:16, marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.blue, marginBottom:12 }}>
                    Previous Month → Current Month Reconciliation
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12 }}>
                    {[
                      ['Previous Bill', `R${prevTotal.toFixed(2)}`, T.navy],
                      ['Approved Additions', `+R${billingTasks.filter(bt=>bt.billingStatus==='Approved'&&bt.actionType==='Add Member').reduce((s,bt)=>s+(bt.newPremium||0),0).toFixed(2)}`, '#059669'],
                      ['Approved Exits', `-R${billingTasks.filter(bt=>bt.billingStatus==='Approved'&&bt.actionType==='Remove Member').reduce((s,bt)=>s+(bt.currentPremium||0),0).toFixed(2)}`, '#dc2626'],
                      ['Proposed Current Bill', `R${projTotal.toFixed(2)}`, netChange>=0?'#059669':'#dc2626'],
                    ].map(([l,v,c])=>(
                      <div key={l} style={{ background:'#fff', borderRadius:9, padding:'14px 16px', border:`1px solid ${T.border}` }}>
                        <div style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', marginBottom:6 }}>{l}</div>
                        <div style={{ fontSize:18, fontWeight:800, color:c, fontFamily:'monospace' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:12, padding:'10px 14px', background:'#fff', borderRadius:8, border:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:T.text }}>Net Premium Change</span>
                    <span style={{ fontSize:18, fontWeight:800, fontFamily:'monospace', color:netChange>=0?'#059669':'#dc2626' }}>
                      {netChange>=0?'+':''}R{Math.round(netChange).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Projected member list */}
                <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>Projected Current Month Members</div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                        {['Member','Identifiers','Premium','Change','Status'].map(h=>(
                          <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {projectedMembers.map(m=>(
                        <tr key={m.id} style={{ borderBottom:'1px solid #f9fafb', background:m.status==='New'?'#f0fdf4':m.status==='Exited'?'#fff1f2':'#fff' }}>
                          <td style={{ padding:'9px 12px', fontSize:13, fontWeight:600 }}>{m.name} {m.surname}</td>
                          <td style={{ padding:'9px 12px' }}><MemberId m={m}/></td>
                          <td style={{ padding:'9px 12px', fontFamily:'monospace', fontWeight:700, color:stream?.color }}>R{m.premium?.toFixed(2)||'0.00'}</td>
                          <td style={{ padding:'9px 12px' }}>
                            {m.changes?.length > 0
                              ? <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:m.status==='New'?'#f0fdf4':'#fff1f2', color:m.status==='New'?'#059669':'#dc2626' }}>{m.changes.join(', ')}</span>
                              : <span style={{ fontSize:11, color:'#d1d5db' }}>—</span>
                            }
                          </td>
                          <td style={{ padding:'9px 12px' }}><StatusPill status={m.status}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PENDING ACTIONS */}
            {activeTab === 'pending' && (
              <div style={{ padding:20 }}>
                {pendingActions.length === 0 ? (
                  <div style={{ textAlign:'center', padding:32, color:T.gray }}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:4 }}>No pending billing actions</div>
                    <div style={{ fontSize:12 }}>Approved case workflows will create billing actions here.</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:12, color:T.gray, marginBottom:14, padding:'10px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:9 }}>
                      These actions have been created from completed workflows. Approve them to include in the next month's bill.
                    </div>
                    {pendingActions.map(bt => {
                      const statusCfg = {
                        'Pending Review': { color:'#d97706', bg:'#fffbeb' },
                        'Approved':       { color:'#059669', bg:'#f0fdf4' },
                      }[bt.billingStatus] || { color:T.gray, bg:'#f3f4f6' }
                      return (
                        <div key={bt.id} style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, padding:'14px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                              <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{bt.memberName||'Member'}</span>
                              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:statusCfg.bg, color:statusCfg.color }}>{bt.billingStatus}</span>
                            </div>
                            <div style={{ fontSize:11, color:T.gray }}>
                              {bt.actionType} · Case {bt.linkedCaseRef} · {bt.effectiveDate}
                            </div>
                          </div>
                          {bt.newPremium && (
                            <div style={{ fontFamily:'monospace', fontSize:14, fontWeight:800, color:'#059669' }}>
                              R{bt.newPremium}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
