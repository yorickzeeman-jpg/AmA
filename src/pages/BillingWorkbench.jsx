import { useState } from 'react'
import { T, BILLING_STATUSES } from '../data.js'
import { Icon, StatusBadge, Card, CardHead, Btn, Modal, Field, selectSt, Empty } from '../ui.jsx'

export default function BillingWorkbench({ billingTasks, cases, employers, users, currentUser, onUpdateBilling }) {
  const [selected, setSelected] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')

  const isBilling = ['billing_admin','general_manager'].includes(currentUser.role)
  const visible = billingTasks.filter(bt => {
    if (!isBilling && bt.assignedTo !== currentUser.id) return false
    if (filterStatus && bt.status !== filterStatus) return false
    return true
  })

  function updateStatus(bt, newStatus) {
    const updated = {
      ...bt,
      status: newStatus,
      audit: [...bt.audit, { time:new Date().toISOString(), user:currentUser.id, action:`Status changed to "${newStatus}"`, type:'status' }],
    }
    onUpdateBilling(prev => prev.map(x => x.id===bt.id ? updated : x))
    if (selected?.id === bt.id) setSelected(updated)
  }

  function addNote(bt, text) {
    if (!text.trim()) return
    const n = { user:currentUser.id, date:new Date().toISOString().split('T')[0], text:text.trim() }
    const updated = { ...bt, notes:[...bt.notes,n], audit:[...bt.audit,{ time:new Date().toISOString(), user:currentUser.id, action:'Note added', type:'note' }] }
    onUpdateBilling(prev => prev.map(x => x.id===bt.id ? updated : x))
    setSelected(updated)
  }

  const stats = {
    pending:    billingTasks.filter(bt=>bt.status==='Pending Billing').length,
    inProgress: billingTasks.filter(bt=>bt.status==='Billing In Progress').length,
    exceptions: billingTasks.filter(bt=>bt.status==='Billing Exception').length,
    complete:   billingTasks.filter(bt=>bt.status==='Billing Complete').length,
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn .3s ease' }}>
      <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>Billing Workbench</h1>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
        {[['Pending',stats.pending,T.amber],['In Progress',stats.inProgress,T.blue],['Exceptions',stats.exceptions,T.red],['Complete',stats.complete,T.green]].map(([l,v,c])=>(
          <div key={l} style={{ background:'#fff', borderRadius:10, padding:'14px 16px', border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:24, fontWeight:800, color:c, letterSpacing:'-0.5px' }}>{v}</div>
            <div style={{ fontSize:12, color:T.gray, marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ background:'#fff', borderRadius:10, padding:'10px 14px', border:`1px solid ${T.border}`, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <Icon name="filter" size={15} color={T.gray}/>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ padding:'6px 8px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12 }}>
          <option value="">All Statuses</option>
          {BILLING_STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        {filterStatus && <button onClick={()=>setFilterStatus('')} style={{ fontSize:11, color:T.red, background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>Clear</button>}
        <div style={{ marginLeft:'auto', fontSize:11, color:T.gray }}>{visible.length} task{visible.length!==1?'s':''}</div>
      </div>

      {/* Table */}
      <Card>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                {['Billing Ref','Linked Case','Employer','Member','Transaction','Effective Date','Assigned','Status',''].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(bt=>{
                const emp = employers.find(x=>x.id===bt.employerId)
                const assignedUser = users.find(u=>u.id===bt.assignedTo)
                const linkedCase = cases.find(c=>c.id===bt.linkedCaseId)
                return (
                  <tr key={bt.id} onClick={()=>setSelected(bt)} style={{ cursor:'pointer', borderBottom:`1px solid #f3f4f6`, transition:'background .1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <td style={{ padding:'11px 14px', fontFamily:'monospace', fontSize:11, color:T.gray, fontWeight:700 }}>{bt.ref}</td>
                    <td style={{ padding:'11px 14px', fontFamily:'monospace', fontSize:11, color:T.blue }}>{bt.linkedCaseRef}</td>
                    <td style={{ padding:'11px 14px', fontSize:12 }}>{emp?.name||'—'}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bt.memberName||'—'}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, fontWeight:600 }}>{bt.transactionType}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:T.gray }}>{bt.effectiveDate}</td>
                    <td style={{ padding:'11px 14px', fontSize:12 }}>{assignedUser?.name||'Unassigned'}</td>
                    <td style={{ padding:'11px 14px' }}><StatusBadge status={bt.status}/></td>
                    <td style={{ padding:'11px 14px' }}><Icon name="chevron_r" size={14} color={T.border}/></td>
                  </tr>
                )
              })}
              {visible.length===0 && <tr><td colSpan={9} style={{ padding:40, textAlign:'center', color:T.gray }}>No billing tasks.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail panel */}
      {selected && <BillingDetail bt={selected} employers={employers} users={users} cases={cases} currentUser={currentUser} onClose={()=>setSelected(null)} onUpdateStatus={updateStatus} onAddNote={addNote}/>}
    </div>
  )
}

function BillingDetail({ bt, employers, users, cases, currentUser, onClose, onUpdateStatus, onAddNote }) {
  const [note, setNote] = useState('')
  const emp  = employers.find(x=>x.id===bt.employerId)
  const assignedUser = users.find(u=>u.id===bt.assignedTo)
  const linkedCase = cases.find(c=>c.id===bt.linkedCaseId)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={{ width:'min(640px,100vw)', height:'100vh', background:'#fff', display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.15)', animation:'slideIn .2s ease' }}>
        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`, background:'#fafaf9' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                <span style={{ fontFamily:'monospace', fontSize:12, color:T.gray, fontWeight:700 }}>{bt.ref}</span>
                <StatusBadge status={bt.status}/>
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:T.text }}>{bt.transactionType}</div>
              <div style={{ fontSize:12, color:T.gray, marginTop:3 }}>{emp?.name} · {bt.memberName} · Linked: {bt.linkedCaseRef}</div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:T.gray }}><Icon name="close" size={20}/></button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:22 }}>
          {/* Details */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, background:'#f9fafb', borderRadius:10, padding:16, border:`1px solid ${T.border}`, marginBottom:18 }}>
            {[['Assigned To',assignedUser?.name||'Unassigned'],['Effective Date',bt.effectiveDate],['Created',bt.created],['Linked Case',bt.linkedCaseRef]].map(([k,v])=>(
              <div key={k}>
                <div style={{ fontSize:10, color:T.gray, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{k}</div>
                <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{v}</div>
              </div>
            ))}
          </div>
          {/* Status update */}
          <div style={{ background:'#f0f7f3', borderRadius:10, padding:14, border:'1px solid #a7c9b5', marginBottom:18 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#1a3d2b', marginBottom:10 }}>Update Status</div>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              {BILLING_STATUSES.map(s=>(
                <button key={s} onClick={()=>onUpdateStatus(bt,s)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${bt.status===s?'#1a3d2b':T.border}`, background:bt.status===s?'#1a3d2b':'#fff', color:bt.status===s?'#fff':'#374151', fontSize:11, fontWeight:600, cursor:'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
          {/* Notes */}
          <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:10 }}>Notes</div>
          {bt.notes.map((n,i)=>{
            const u = users.find(x=>x.id===n.user)
            return <div key={i} style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:12, marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#92400e' }}>{u?.name||'Unknown'} · {n.date}</div>
              <div style={{ fontSize:13, color:'#374151', marginTop:4 }}>{n.text}</div>
            </div>
          })}
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note..." style={{ width:'100%', minHeight:70, padding:10, border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}/>
          <button onClick={()=>{ onAddNote(bt,note); setNote('') }} style={{ marginTop:7, padding:'7px 14px', background:'#1a3d2b', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            <Icon name="send" size={13} color="#fff"/> Add Note
          </button>
          {/* Audit */}
          <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginTop:20, marginBottom:10 }}>Audit Trail</div>
          {[...bt.audit].reverse().map((ev,i)=>{
            const u = users.find(x=>x.id===ev.user)
            return <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid #f3f4f6' }}>
              <div style={{ fontSize:11, color:T.gray, fontFamily:'monospace', minWidth:130 }}>{new Date(ev.time).toLocaleString('en-ZA',{dateStyle:'short',timeStyle:'short'})}</div>
              <div style={{ flex:1, fontSize:12, color:T.text }}>{ev.action} <span style={{ color:T.gray }}>— {u?.name||ev.user}</span></div>
            </div>
          })}
        </div>
      </div>
    </div>
  )
}
