import { useState, useMemo } from 'react'
import { T } from '../data.js'
import { Icon, StatusBadge, Card, Btn, Modal, inputSt, selectSt } from '../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// BILLING ENGINE — Phase 4
//
// PRINCIPLE: The system recommends. The Billing Administrator approves.
//            Nothing is added to or removed from billing automatically.
//
// FLOW:
//   Case workflow completed
//   → Pending Billing Action created (status: Pending Review)
//   → Billing Administrator reviews queue
//   → Approve / Decline / Request Information
//   → Approved actions applied to Current Month Bill
//   → Monthly reconciliation: Previous Bill ± Approved Changes = New Bill
// ═════════════════════════════════════════════════════════════════════════════

// ── ACTION TYPES & COLOURS ───────────────────────────────────────────────────
const ACTION_CONFIG = {
  'Add Member':              { color:'#059669', bg:'#f0fdf4', border:'#bbf7d0', label:'ADD',     icon:'➕' },
  'Remove Member':           { color:'#dc2626', bg:'#fff1f2', border:'#fecaca', label:'EXIT',    icon:'➖' },
  'Change Benefit':          { color:'#1e5fd9', bg:'#eff6ff', border:'#bfdbfe', label:'CHANGE',  icon:'🔄' },
  'Change Premium':          { color:'#1e5fd9', bg:'#eff6ff', border:'#bfdbfe', label:'CHANGE',  icon:'💲' },
  'Add Dependent':           { color:'#059669', bg:'#f0fdf4', border:'#bbf7d0', label:'ADD DEP', icon:'👤' },
  'Remove Dependent':        { color:'#dc2626', bg:'#fff1f2', border:'#fecaca', label:'REM DEP', icon:'👤' },
  'Change Payroll Number':   { color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe', label:'PAYROLL', icon:'🔢' },
  'Membership Amendment':    { color:'#d97706', bg:'#fffbeb', border:'#fde68a', label:'AMEND',   icon:'✏️' },
  'Extended Funeral':        { color:'#059669', bg:'#f0fdf4', border:'#bbf7d0', label:'EXT FUN', icon:'🏛️' },
}

// ── STATUS CONFIGS ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  'Pending Review':      { color:'#d97706', bg:'#fffbeb', border:'#fde68a',  label:'PENDING'  },
  'Approved':            { color:'#059669', bg:'#f0fdf4', border:'#bbf7d0',  label:'APPROVED' },
  'Declined':            { color:'#9ca3af', bg:'#f3f4f6', border:'#e5e7eb',  label:'DECLINED' },
  'Info Requested':      { color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe',  label:'INFO REQ' },
  'Applied to Bill':     { color:'#059669', bg:'#dcfce7', border:'#86efac',  label:'APPLIED'  },
}

// ── MAP CASE TYPES TO BILLING ACTIONS ───────────────────────────────────────
export function caseTypeToBillingAction(caseTypeName) {
  if (!caseTypeName) return null
  const n = caseTypeName.toLowerCase()
  if (n.includes('new') || n === 'new') return 'Add Member'
  if (n.includes('exit'))               return 'Remove Member'
  if (n.includes('death - retirement')) return 'Remove Member'
  if (n.includes('disability'))         return 'Change Benefit'
  if (n.includes('extended funeral application')) return 'Extended Funeral'
  if (n.includes('extended funeral'))   return 'Extended Funeral'
  if (n.includes('plan change'))        return 'Change Benefit'
  if (n.includes('transfer'))           return 'Change Benefit'
  if (n.includes('add dependent'))      return 'Add Dependent'
  if (n.includes('removal of dependent')) return 'Remove Dependent'
  if (n.includes('cancellation'))       return 'Remove Member'
  if (n.includes('surname change'))     return 'Change Payroll Number'
  return 'Membership Amendment'
}

// ── BILLING IMPACT CASE TYPES (from Phase 4 spec) ────────────────────────────
const BILLING_IMPACT_TYPES = new Set([
  'New', 'Exit', 'Extended Funeral Application',
  'Death - Retirement', 'Disability', 'Disability - Review',
  'Death - Extended Funeral', 'Medical - Add Dependent',
  'Medical - Removal of Dependent', 'Medical - Plan Change',
  'Medical - Transfer', 'Medical - Cancellation',
  'Medical - Change Main Member',
])

export function hasBillingImpact(caseTypeName) {
  return BILLING_IMPACT_TYPES.has(caseTypeName)
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function BillingWorkbench({ billingTasks, cases, employers, users, currentUser, onUpdateBilling }) {
  const [view, setView]         = useState('queue')   // queue | reconciliation | history
  const [selected, setSelected] = useState(null)
  const [filterStatus, setFilter] = useState('')
  const [filterEmployer, setFilterEmp] = useState('')
  const [filterAction, setFilterAction] = useState('')

  const isBillingAdmin = ['billing_admin','general_manager'].includes(currentUser.role)

  // Enrich billing tasks with resolved employer/case data
  const enriched = useMemo(() => billingTasks.map(bt => ({
    ...bt,
    employerName: employers.find(e => e.id === bt.employerId)?.name || '—',
    assignedUser: users.find(u => u.id === bt.assignedTo)?.name || 'Unassigned',
    linkedCase:   cases.find(c => c.id === bt.linkedCaseId),
    actionConfig: ACTION_CONFIG[bt.actionType] || ACTION_CONFIG['Membership Amendment'],
    statusConfig: STATUS_CONFIG[bt.billingStatus] || STATUS_CONFIG['Pending Review'],
  })), [billingTasks, employers, users, cases])

  const visible = enriched.filter(bt => {
    if (!isBillingAdmin && bt.assignedTo !== currentUser.id) return false
    if (filterStatus   && bt.billingStatus !== filterStatus)   return false
    if (filterEmployer && bt.employerId    !== filterEmployer)  return false
    if (filterAction   && bt.actionType    !== filterAction)    return false
    return true
  })

  // Stats
  const stats = useMemo(() => ({
    pending:   enriched.filter(bt => bt.billingStatus === 'Pending Review').length,
    approved:  enriched.filter(bt => bt.billingStatus === 'Approved').length,
    declined:  enriched.filter(bt => bt.billingStatus === 'Declined').length,
    applied:   enriched.filter(bt => bt.billingStatus === 'Applied to Bill').length,
    totalPending: enriched.filter(bt => bt.billingStatus === 'Pending Review')
      .reduce((sum, bt) => sum + (bt.newPremium || bt.currentPremium || 0), 0),
  }), [enriched])

  function updateBillingStatus(bt, newStatus, note = '') {
    const now     = new Date().toISOString()
    const updated = {
      ...bt,
      billingStatus: newStatus,
      approvedBy:    newStatus === 'Approved' ? currentUser.id   : bt.approvedBy,
      approvedAt:    newStatus === 'Approved' ? now              : bt.approvedAt,
      declinedBy:    newStatus === 'Declined' ? currentUser.id   : bt.declinedBy,
      declinedAt:    newStatus === 'Declined' ? now              : bt.declinedAt,
      audit: [...(bt.audit||[]), {
        time:   now,
        user:   currentUser.id,
        userName: currentUser.name,
        action: `Status changed to "${newStatus}"${note ? ` — ${note}` : ''}`,
        type:   'billing_status',
      }],
      notes: note.trim() ? [...(bt.notes||[]), {
        id:   'n'+Date.now(),
        text: note.trim(),
        user: currentUser.id,
        userName: currentUser.name,
        time: now,
      }] : (bt.notes||[]),
    }
    onUpdateBilling(prev => prev.map(x => x.id === bt.id ? updated : x))
    if (selected?.id === bt.id) setSelected(updated)
  }

  function addNote(bt, text) {
    if (!text.trim()) return
    const updated = {
      ...bt,
      notes: [...(bt.notes||[]), { id:'n'+Date.now(), text:text.trim(), user:currentUser.id, userName:currentUser.name, time:new Date().toISOString() }],
      audit: [...(bt.audit||[]), { time:new Date().toISOString(), user:currentUser.id, action:'Note added', type:'note' }],
    }
    onUpdateBilling(prev => prev.map(x => x.id === bt.id ? updated : x))
    if (selected?.id === bt.id) setSelected(updated)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn .3s ease' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:'0 0 3px' }}>Billing Engine</h1>
          <p style={{ margin:0, fontSize:12, color:T.gray }}>Review and approve all billing changes before they apply to the monthly bill.</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {['queue','reconciliation','history'].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding:'7px 14px', borderRadius:8, border:`1.5px solid ${view===v?T.orange:T.border}`, background:view===v?T.orangeL:'#fff', color:view===v?T.orange:'#374151', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>
              {v === 'queue' ? '📋 Pending Queue' : v === 'reconciliation' ? '📊 Reconciliation' : '📁 History'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10 }}>
        {[
          ['Pending Review', stats.pending,  '#d97706', '#fffbeb', '⏳'],
          ['Approved',       stats.approved, '#059669', '#f0fdf4', '✅'],
          ['Declined',       stats.declined, '#9ca3af', '#f3f4f6', '⛔'],
          ['Applied to Bill',stats.applied,  '#1e5fd9', '#eff6ff', '✓'],
        ].map(([l,v,c,bg,ic])=>(
          <div key={l} style={{ background:bg, borderRadius:10, padding:'14px 16px', border:`1px solid ${c}30` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ fontSize:26, fontWeight:800, color:c, letterSpacing:'-0.5px' }}>{v}</div>
              <span style={{ fontSize:20 }}>{ic}</span>
            </div>
            <div style={{ fontSize:11, color:c, fontWeight:600, marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* ── PENDING QUEUE ── */}
      {view === 'queue' && (
        <>
          {/* Filters */}
          <div style={{ background:'#fff', borderRadius:10, padding:'10px 14px', border:`1px solid ${T.border}`, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <Icon name="filter" size={14} color={T.gray}/>
            <select value={filterStatus} onChange={e=>setFilter(e.target.value)} style={{ padding:'6px 8px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12 }}>
              <option value="">All Statuses</option>
              {Object.keys(STATUS_CONFIG).map(s=><option key={s}>{s}</option>)}
            </select>
            <select value={filterAction} onChange={e=>setFilterAction(e.target.value)} style={{ padding:'6px 8px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12 }}>
              <option value="">All Action Types</option>
              {Object.keys(ACTION_CONFIG).map(a=><option key={a}>{a}</option>)}
            </select>
            <select value={filterEmployer} onChange={e=>setFilterEmp(e.target.value)} style={{ padding:'6px 8px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12 }}>
              <option value="">All Employers</option>
              {employers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            {(filterStatus||filterAction||filterEmployer) && (
              <button onClick={()=>{setFilter('');setFilterAction('');setFilterEmp('')}} style={{ fontSize:11, color:T.red, background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>Clear</button>
            )}
            <div style={{ marginLeft:'auto', fontSize:11, color:T.gray }}>{visible.length} action{visible.length!==1?'s':''}</div>
          </div>

          {/* Notice */}
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:9, padding:'11px 14px', display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ fontSize:18 }}>⚠️</span>
            <div style={{ fontSize:12, color:'#92400e', lineHeight:1.5 }}>
              <strong>Billing Administrator Approval Required.</strong> No billing change takes effect until approved below. Review each action carefully before approving.
            </div>
          </div>

          {/* Table */}
          <Card>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
                <thead>
                  <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                    {['Action Type','Member','Employer','Current Premium','New Premium','Δ','Effective Date','Case Ref','Status',''].map(h=>(
                      <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map(bt => {
                    const ac   = bt.actionConfig
                    const sc   = bt.statusConfig
                    const diff = (bt.newPremium || 0) - (bt.currentPremium || 0)
                    return (
                      <tr key={bt.id} onClick={() => setSelected(bt)}
                        style={{ cursor:'pointer', borderBottom:'1px solid #f3f4f6', transition:'background .1s' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>

                        {/* Action type */}
                        <td style={{ padding:'11px 12px' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, background:ac.bg, border:`1px solid ${ac.border}`, fontSize:11, fontWeight:700, color:ac.color }}>
                            {ac.icon} {bt.actionType}
                          </span>
                        </td>
                        <td style={{ padding:'11px 12px', fontSize:13, fontWeight:600, color:T.text }}>{bt.memberName||'—'}</td>
                        <td style={{ padding:'11px 12px', fontSize:12, color:T.gray }}>{bt.employerName}</td>
                        <td style={{ padding:'11px 12px', fontSize:12, fontFamily:'monospace' }}>{bt.currentPremium ? `R${bt.currentPremium}` : '—'}</td>
                        <td style={{ padding:'11px 12px', fontSize:12, fontFamily:'monospace', fontWeight:600 }}>{bt.newPremium ? `R${bt.newPremium}` : '—'}</td>
                        <td style={{ padding:'11px 12px', fontSize:12, fontFamily:'monospace', fontWeight:700, color:diff>0?T.green:diff<0?T.red:T.gray }}>
                          {diff !== 0 ? `${diff>0?'+':''}R${diff}` : '—'}
                        </td>
                        <td style={{ padding:'11px 12px', fontSize:12, color:T.gray }}>{bt.effectiveDate}</td>
                        <td style={{ padding:'11px 12px', fontFamily:'monospace', fontSize:11, color:T.blue }}>{bt.linkedCaseRef}</td>
                        <td style={{ padding:'11px 12px' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, background:sc.bg, border:`1px solid ${sc.border}`, fontSize:10, fontWeight:700, color:sc.color }}>
                            {bt.billingStatus}
                          </span>
                        </td>
                        <td style={{ padding:'11px 12px' }}><Icon name="chevron_r" size={14} color={T.border}/></td>
                      </tr>
                    )
                  })}
                  {visible.length === 0 && (
                    <tr><td colSpan={10} style={{ padding:48, textAlign:'center', color:T.gray, fontSize:13 }}>
                      No pending billing actions.{stats.pending > 0 ? ' Adjust your filters to see all actions.' : ' All clear.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ── RECONCILIATION ── */}
      {view === 'reconciliation' && (
        <ReconciliationView billingTasks={enriched} employers={employers}/>
      )}

      {/* ── HISTORY ── */}
      {view === 'history' && (
        <HistoryView billingTasks={enriched} users={users}/>
      )}

      {/* Detail slide-over */}
      {selected && (
        <BillingActionDetail
          bt={enriched.find(b => b.id === selected.id) || selected}
          users={users} currentUser={currentUser}
          isBillingAdmin={isBillingAdmin}
          onClose={() => setSelected(null)}
          onUpdateStatus={updateBillingStatus}
          onAddNote={addNote}
        />
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// BILLING ACTION DETAIL SLIDE-OVER
// ═════════════════════════════════════════════════════════════════════════════
function BillingActionDetail({ bt, users, currentUser, isBillingAdmin, onClose, onUpdateStatus, onAddNote }) {
  const [note, setNote]           = useState('')
  const [declineNote, setDecNote] = useState('')
  const [infoNote, setInfoNote]   = useState('')
  const [showDecline, setShowDec] = useState(false)
  const [showInfo, setShowInfo]   = useState(false)

  const ac = bt.actionConfig || ACTION_CONFIG['Membership Amendment']
  const sc = bt.statusConfig  || STATUS_CONFIG['Pending Review']
  const isPending = bt.billingStatus === 'Pending Review'

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:300, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={{ width:'min(640px,100vw)', height:'100vh', background:'#fff', display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.18)', animation:'slideInRight .22s ease' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`, background:'#f9fafb', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:7, flexWrap:'wrap' }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:ac.bg, border:`1px solid ${ac.border}`, fontSize:12, fontWeight:700, color:ac.color }}>
                  {ac.icon} {bt.actionType}
                </span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, background:sc.bg, border:`1px solid ${sc.border}`, fontSize:10, fontWeight:700, color:sc.color }}>
                  {bt.billingStatus}
                </span>
              </div>
              <div style={{ fontSize:18, fontWeight:800, color:T.text }}>{bt.memberName||'Member'}</div>
              <div style={{ fontSize:12, color:T.gray, marginTop:2 }}>{bt.employerName} · Case: {bt.linkedCaseRef}</div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:T.gray, fontSize:20, lineHeight:1 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:22 }}>

          {/* Billing change summary */}
          <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:11, overflow:'hidden', marginBottom:18 }}>
            <div style={{ padding:'10px 14px', background:'#f9fafb', borderBottom:`1px solid ${T.border}`, fontSize:12, fontWeight:700, color:T.text }}>Billing Change Summary</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
              {[
                ['Action Type',   bt.actionType],
                ['Employer',      bt.employerName],
                ['Member',        bt.memberName||'—'],
                ['Linked Case',   bt.linkedCaseRef],
                ['Effective Date',bt.effectiveDate],
                ['Current Premium', bt.currentPremium ? `R${bt.currentPremium}/mo` : '—'],
                ['New Premium',   bt.newPremium ? `R${bt.newPremium}/mo` : '—'],
                ['Net Change',    bt.newPremium && bt.currentPremium ? `${bt.newPremium>bt.currentPremium?'+':''}R${bt.newPremium-bt.currentPremium}/mo` : '—'],
              ].map(([k,v],i) => (
                <div key={k} style={{ padding:'10px 14px', borderBottom:i<6?`1px solid #f3f4f6`:'none', borderRight:i%2===0?`1px solid #f3f4f6`:'none' }}>
                  <div style={{ fontSize:10, color:T.gray, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* APPROVAL ACTIONS — billing admin only, pending only */}
          {isBillingAdmin && isPending && (
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:11, padding:16, marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#166534', marginBottom:12 }}>Billing Administrator Action</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                <button onClick={() => onUpdateStatus(bt, 'Approved', '')}
                  style={{ padding:'10px 20px', background:'#059669', border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                  ✅ Approve
                </button>
                <button onClick={() => setShowDec(true)}
                  style={{ padding:'10px 20px', background:'#fff', border:'2px solid #dc2626', borderRadius:9, color:'#dc2626', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  ⛔ Decline
                </button>
                <button onClick={() => setShowInfo(true)}
                  style={{ padding:'10px 20px', background:'#fff', border:'2px solid #7c3aed', borderRadius:9, color:'#7c3aed', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  ℹ️ Request Info
                </button>
              </div>

              {showDecline && (
                <div style={{ background:'#fff', border:'1px solid #fecaca', borderRadius:9, padding:12 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#dc2626', marginBottom:7 }}>Reason for declining</div>
                  <textarea value={declineNote} onChange={e=>setDecNote(e.target.value)} placeholder="Explain why this action is being declined…"
                    style={{ ...inputSt, minHeight:60, width:'100%', marginBottom:8 }}/>
                  <div style={{ display:'flex', gap:7 }}>
                    <button onClick={() => { onUpdateStatus(bt, 'Declined', declineNote); setShowDec(false); setDecNote('') }}
                      style={{ padding:'7px 14px', background:'#dc2626', border:'none', borderRadius:7, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Confirm Decline
                    </button>
                    <button onClick={() => { setShowDec(false); setDecNote('') }}
                      style={{ padding:'7px 14px', background:'none', border:`1px solid ${T.border}`, borderRadius:7, color:T.gray, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {showInfo && (
                <div style={{ background:'#fff', border:'1px solid #ddd6fe', borderRadius:9, padding:12 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#7c3aed', marginBottom:7 }}>What information is needed?</div>
                  <textarea value={infoNote} onChange={e=>setInfoNote(e.target.value)} placeholder="Describe what information is required…"
                    style={{ ...inputSt, minHeight:60, width:'100%', marginBottom:8 }}/>
                  <div style={{ display:'flex', gap:7 }}>
                    <button onClick={() => { onUpdateStatus(bt, 'Info Requested', infoNote); setShowInfo(false); setInfoNote('') }}
                      style={{ padding:'7px 14px', background:'#7c3aed', border:'none', borderRadius:7, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Send Request
                    </button>
                    <button onClick={() => { setShowInfo(false); setInfoNote('') }}
                      style={{ padding:'7px 14px', background:'none', border:`1px solid ${T.border}`, borderRadius:7, color:T.gray, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Approved — apply to bill */}
          {isBillingAdmin && bt.billingStatus === 'Approved' && (
            <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:11, padding:14, marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.blue, marginBottom:8 }}>Approved — Ready to Apply</div>
              <div style={{ fontSize:12, color:'#374151', marginBottom:10 }}>This action has been approved and can now be applied to the current month's bill.</div>
              <button onClick={() => onUpdateStatus(bt, 'Applied to Bill', 'Applied to current month billing')}
                style={{ padding:'9px 18px', background:T.blue, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Apply to Current Bill
              </button>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:10 }}>Notes</div>
            {(bt.notes||[]).length === 0 ? (
              <div style={{ fontSize:12, color:T.gray, fontStyle:'italic', marginBottom:10 }}>No notes yet.</div>
            ) : (
              [...(bt.notes||[])].reverse().map(n => (
                <div key={n.id} style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:12, marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'#92400e' }}>{n.userName||n.user}</span>
                    <span style={{ fontSize:10, color:T.gray }}>{n.time?.slice(0,16).replace('T',' ')}</span>
                  </div>
                  <div style={{ fontSize:13, color:'#374151' }}>{n.text}</div>
                </div>
              ))
            )}
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note…"
              style={{ ...inputSt, minHeight:70, width:'100%', marginBottom:7 }}/>
            <button onClick={() => { onAddNote(bt, note); setNote('') }} disabled={!note.trim()}
              style={{ padding:'7px 14px', background:T.navy, border:'none', borderRadius:7, color:'#fff', fontSize:12, fontWeight:600, cursor:note.trim()?'pointer':'not-allowed', opacity:note.trim()?1:0.5, fontFamily:'inherit' }}>
              Add Note
            </button>
          </div>

          {/* Audit trail */}
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:10 }}>Audit Trail</div>
            {(bt.audit||[]).length === 0 ? (
              <div style={{ fontSize:12, color:T.gray, fontStyle:'italic' }}>No audit events.</div>
            ) : (
              [...(bt.audit||[])].reverse().map((ev,i) => {
                const u = users.find(x => x.id === ev.user)
                const typeColors = { billing_status:'#7c3aed', note:'#374151', create:'#059669', assign:'#1e5fd9' }
                const clr = typeColors[ev.type] || T.gray
                return (
                  <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid #f3f4f6' }}>
                    <div style={{ fontSize:11, color:T.gray, fontFamily:'monospace', minWidth:130, flexShrink:0 }}>
                      {ev.time?.slice(0,16).replace('T',' ')}
                    </div>
                    <div style={{ flex:1, fontSize:12 }}>
                      <span style={{ color:T.text }}>{ev.action}</span>
                      <span style={{ color:T.gray }}> — {u?.name||ev.userName||ev.user}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// RECONCILIATION VIEW
// Previous Month ± Approved Changes = Proposed Current Month
// ═════════════════════════════════════════════════════════════════════════════
function ReconciliationView({ billingTasks, employers }) {
  const [selEmployer, setSelEmp] = useState('')

  const empList = employers.filter(e =>
    billingTasks.some(bt => bt.employerId === e.id)
  )

  // Group approved actions by employer
  const approvedByEmp = useMemo(() => {
    const map = {}
    billingTasks.filter(bt => bt.billingStatus === 'Approved' || bt.billingStatus === 'Applied to Bill')
      .forEach(bt => {
        if (!map[bt.employerId]) map[bt.employerId] = []
        map[bt.employerId].push(bt)
      })
    return map
  }, [billingTasks])

  const filteredEmps = selEmployer ? employers.filter(e => e.id === selEmployer) : empList

  return (
    <div>
      <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, padding:'11px 14px', marginBottom:16, display:'flex', gap:8, alignItems:'center' }}>
        <span style={{ fontSize:12, color:T.gray, fontWeight:600 }}>Employer:</span>
        <select value={selEmployer} onChange={e=>setSelEmp(e.target.value)} style={{ padding:'6px 8px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12 }}>
          <option value="">All Employers</option>
          {empList.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {filteredEmps.length === 0 ? (
        <div style={{ textAlign:'center', padding:48, color:T.gray, fontSize:13 }}>
          No billing actions to reconcile yet. Approved actions will appear here.
        </div>
      ) : (
        filteredEmps.map(emp => {
          const actions = approvedByEmp[emp.id] || []
          const additions    = actions.filter(a => ['Add Member','Add Dependent','Extended Funeral'].includes(a.actionType))
          const removals     = actions.filter(a => ['Remove Member','Remove Dependent'].includes(a.actionType))
          const changes      = actions.filter(a => ['Change Benefit','Change Premium','Membership Amendment','Change Payroll Number'].includes(a.actionType))
          const addPremium   = additions.reduce((s,a)=>s+(a.newPremium||0),0)
          const removePremium= removals.reduce((s,a)=>s+(a.currentPremium||0),0)
          const changeDiff   = changes.reduce((s,a)=>s+((a.newPremium||0)-(a.currentPremium||0)),0)
          const netChange    = addPremium - removePremium + changeDiff

          return (
            <div key={emp.id} style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden', marginBottom:16 }}>
              {/* Employer header */}
              <div style={{ padding:'13px 16px', background:T.navy, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{emp.name}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{emp.number} · {actions.length} approved action{actions.length!==1?'s':''}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:18, fontWeight:800, color:netChange>=0?'#4ade80':'#f87171' }}>
                    {netChange>=0?'+':''}R{netChange}/mo
                  </div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Net premium change</div>
                </div>
              </div>

              {/* Summary row */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', borderBottom:`1px solid ${T.border}` }}>
                {[
                  ['Additions',  additions.length,  '+R'+addPremium+'/mo',    '#059669'],
                  ['Removals',   removals.length,   '-R'+removePremium+'/mo', '#dc2626'],
                  ['Changes',    changes.length,    (changeDiff>=0?'+':'')+'R'+changeDiff+'/mo', '#1e5fd9'],
                  ['Net Impact', '',                (netChange>=0?'+':'')+'R'+netChange+'/mo',   netChange>=0?'#059669':'#dc2626'],
                ].map(([l,count,val,clr])=>(
                  <div key={l} style={{ padding:'12px 14px', borderRight:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:10, color:T.gray, fontWeight:700, textTransform:'uppercase', marginBottom:3 }}>{l}</div>
                    {count !== '' && <div style={{ fontSize:16, fontWeight:700, color:T.text }}>{count}</div>}
                    <div style={{ fontSize:12, fontWeight:700, color:clr }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Action list */}
              {actions.length > 0 && (
                <div>
                  {actions.map(bt => {
                    const ac  = bt.actionConfig || ACTION_CONFIG['Membership Amendment']
                    const diff= (bt.newPremium||0)-(bt.currentPremium||0)
                    return (
                      <div key={bt.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom:`1px solid #f9fafb` }}>
                        <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, background:ac.bg, color:ac.color, border:`1px solid ${ac.border}`, whiteSpace:'nowrap' }}>
                          {ac.label}
                        </span>
                        <span style={{ fontSize:13, fontWeight:600, color:T.text, flex:1 }}>{bt.memberName||'—'}</span>
                        <span style={{ fontSize:11, color:T.gray }}>{bt.effectiveDate}</span>
                        {bt.currentPremium && <span style={{ fontSize:11, fontFamily:'monospace', color:T.gray }}>R{bt.currentPremium}</span>}
                        {bt.newPremium && <><span style={{ fontSize:11, color:T.gray }}>→</span><span style={{ fontSize:11, fontFamily:'monospace', fontWeight:700, color:diff>=0?T.green:T.red }}>R{bt.newPremium}</span></>}
                        <span style={{ fontFamily:'monospace', fontSize:10, color:T.blue }}>{bt.linkedCaseRef}</span>
                        <span style={{ fontSize:10, fontWeight:700, color:bt.billingStatus==='Applied to Bill'?T.green:T.orange, background:bt.billingStatus==='Applied to Bill'?'#f0fdf4':'#fffbeb', padding:'2px 7px', borderRadius:10 }}>{bt.billingStatus}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {actions.length === 0 && (
                <div style={{ padding:'20px 16px', fontSize:12, color:T.gray, textAlign:'center' }}>No approved actions for this employer yet.</div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// HISTORY VIEW
// ═════════════════════════════════════════════════════════════════════════════
function HistoryView({ billingTasks, users }) {
  const completed = billingTasks.filter(bt =>
    bt.billingStatus === 'Applied to Bill' || bt.billingStatus === 'Declined'
  ).sort((a,b) => (b.approvedAt||b.declinedAt||'').localeCompare(a.approvedAt||a.declinedAt||''))

  return (
    <Card>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
          <thead>
            <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
              {['Action Type','Member','Employer','Premium Change','Case Ref','Actioned By','Date','Result'].map(h=>(
                <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {completed.map(bt => {
              const ac   = bt.actionConfig || ACTION_CONFIG['Membership Amendment']
              const actUser = users.find(u => u.id === (bt.approvedBy||bt.declinedBy))
              const diff = (bt.newPremium||0)-(bt.currentPremium||0)
              return (
                <tr key={bt.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background:ac.bg, color:ac.color }}>{ac.label}</span>
                  </td>
                  <td style={{ padding:'10px 12px', fontSize:12, fontWeight:600 }}>{bt.memberName||'—'}</td>
                  <td style={{ padding:'10px 12px', fontSize:12, color:T.gray }}>{bt.employerName}</td>
                  <td style={{ padding:'10px 12px', fontSize:12, fontFamily:'monospace', fontWeight:700, color:diff>=0?T.green:T.red }}>
                    {diff!==0?`${diff>0?'+':''}R${diff}/mo`:'—'}
                  </td>
                  <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11, color:T.blue }}>{bt.linkedCaseRef}</td>
                  <td style={{ padding:'10px 12px', fontSize:12 }}>{actUser?.name||'—'}</td>
                  <td style={{ padding:'10px 12px', fontSize:11, color:T.gray }}>{(bt.approvedAt||bt.declinedAt||'').slice(0,10)}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background:bt.billingStatus==='Applied to Bill'?'#f0fdf4':'#f3f4f6', color:bt.billingStatus==='Applied to Bill'?T.green:'#9ca3af' }}>
                      {bt.billingStatus}
                    </span>
                  </td>
                </tr>
              )
            })}
            {completed.length === 0 && (
              <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:T.gray, fontSize:13 }}>No completed billing actions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
