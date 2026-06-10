import { useState } from 'react'
import { T, CASE_STATUSES, PRIORITIES, genRef, calcSlaDate } from '../data.js'
import { Icon, StatusBadge, PriorityBadge, SLAChip, Tabs, Avatar, Btn } from '../ui.jsx'

const STAGE_CLR = { done:'#059669', active:'#1e5fd9', pending:T.gray }

export default function CaseDetail({ c, caseType, category, employer, users, currentUser, onClose, onUpdate, onAddBillingTask }) {
  const [tab, setTab] = useState('Overview')
  const [note, setNote] = useState('')
  const isInternal = !['employer_admin','employer_user'].includes(currentUser.role)
  const isAdmin    = currentUser.role === 'administrator'
  const isGM       = currentUser.role === 'general_manager'
  const canEdit    = isInternal

  const assignedUser = users.find(u=>u.id===c.assignedTo)
  const stages = caseType?.stages || []
  const currentStageIdx = c.currentStage

  function advanceStage() {
    if (currentStageIdx >= stages.length-1) return
    const nextIdx = currentStageIdx+1
    const next = stages[nextIdx]
    const audit = [...c.audit, { time:new Date().toISOString(), user:currentUser.id, action:`Stage advanced to "${next.name}"`, type:'stage' }]
    onUpdate({ ...c, currentStage:nextIdx, stageHistory:[...c.stageHistory, next.id], status:'In Progress', audit })
  }

  function sendToBilling() {
    // "Complete & Send to Billing" action
    const btRef = genRef('BT')
    const btId  = 'bt'+Date.now()
    const billingTask = {
      id: btId, ref: btRef,
      linkedCaseId: c.id, linkedCaseRef: c.ref,
      employerId: c.employerId, memberName: c.memberName,
      transactionType: caseType?.name || 'Unknown',
      effectiveDate: new Date().toISOString().split('T')[0],
      assignedTo: '', status: 'Pending Billing',
      priority: c.priority, createdBy: currentUser.id,
      created: new Date().toISOString().split('T')[0],
      notes: [],
      audit: [
        { time:new Date().toISOString(), user:currentUser.id, action:`Billing Task ${btRef} created from ${c.ref}`, type:'create' },
      ],
    }
    const audit = [...c.audit, { time:new Date().toISOString(), user:currentUser.id, action:`Complete & Send to Billing — Billing Task ${btRef} created`, type:'billing' }]
    onUpdate({ ...c, status:'Sent to Billing', billingTaskId:btId, audit })
    onAddBillingTask && onAddBillingTask(billingTask)
  }

  function completeCase() {
    const audit = [...c.audit, { time:new Date().toISOString(), user:currentUser.id, action:'Case marked Completed', type:'complete' }]
    onUpdate({ ...c, status:'Completed', audit })
  }

  function updateStatus(s) {
    const audit = [...c.audit, { time:new Date().toISOString(), user:currentUser.id, action:`Status changed to "${s}"`, type:'status' }]
    onUpdate({ ...c, status:s, audit })
  }

  function reassign(userId) {
    const u = users.find(x=>x.id===userId)
    const audit = [...c.audit, { time:new Date().toISOString(), user:currentUser.id, action:`Reassigned to ${u?.name||userId}`, type:'assign' }]
    const history = [...c.ownerHistory, { user:userId, from:new Date().toISOString().split('T')[0] }]
    onUpdate({ ...c, assignedTo:userId, ownerHistory:history, audit })
  }

  function addNote() {
    if (!note.trim()) return
    const n = { user:currentUser.id, date:new Date().toISOString().split('T')[0], text:note.trim() }
    const audit = [...c.audit, { time:new Date().toISOString(), user:currentUser.id, action:'Note added', type:'note' }]
    onUpdate({ ...c, notes:[...c.notes,n], audit })
    setNote('')
  }

  const auditColor = { create:T.blue, assign:T.purple, stage:T.green, billing:T.purple, escalate:T.red, complete:T.green, status:T.amber, note:T.amber }

  const isBillingTrigger = caseType?.isBillingTrigger
  const atFinalStage = currentStageIdx >= stages.length-1
  const alreadySentToBilling = !!c.billingTaskId

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={{ width:'min(740px,100vw)', height:'100vh', background:'#fff', display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.15)', animation:'slideIn .2s ease' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`, background:'#fafaf9' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ flex:1, marginRight:12 }}>
              <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
                <span style={{ fontFamily:'monospace', fontSize:12, color:T.gray, fontWeight:700 }}>{c.ref}</span>
                <StatusBadge status={c.status}/>
                <PriorityBadge priority={c.priority}/>
                {c.workspace==='internal' && <span style={{ fontSize:10, fontWeight:700, color:T.gray, background:'#f3f4f6', padding:'2px 8px', borderRadius:20 }}>INTERNAL</span>}
                {c.escalated && <span style={{ fontSize:10, fontWeight:700, color:T.red, background:'#fff1f2', padding:'2px 8px', borderRadius:20 }}>⚠ ESCALATED</span>}
                {c.billingTaskId && <span style={{ fontSize:10, fontWeight:700, color:T.purple, background:'#f5f3ff', padding:'2px 8px', borderRadius:20 }}>BILLING: {c.billingTaskId.toUpperCase()}</span>}
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:T.text, marginBottom:4 }}>{caseType?.name}</div>
              {category && <span style={{ fontSize:11, padding:'2px 8px', background:category.color+'18', color:category.color, borderRadius:4, fontWeight:700, marginBottom:6, display:'inline-block' }}>{category.name}</span>}
              <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginTop:4 }}>
                <span style={{ fontSize:12, color:T.gray }}>🏢 {employer?.name}</span>
                {c.memberName && <span style={{ fontSize:12, color:T.gray }}>👤 {c.memberName}</span>}
                <span style={{ fontSize:12, color:T.gray }}>📅 {c.created}</span>
                <SLAChip slaDate={c.slaDate} status={c.status}/>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:T.gray, padding:4 }}><Icon name="close" size={20}/></button>
          </div>
        </div>

        <Tabs tabs={['Overview','Workflow','Documents','Notes','Audit']} active={tab} onChange={setTab}/>

        <div style={{ flex:1, overflowY:'auto', padding:22 }}>

          {/* OVERVIEW */}
          {tab==='Overview' && (
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, background:'#f9fafb', borderRadius:10, padding:16, border:`1px solid ${T.border}` }}>
                {[
                  ['SLA Target',     caseType?.slaLabel],
                  ['Assigned To',    assignedUser?.name||'Unassigned'],
                  ['SLA Due',        c.slaDate],
                  ['Created',        c.created],
                  ['Responsible',    caseType?.responsibleTeam],
                  ['Member ID',      c.memberId||'—'],
                ].map(([k,v])=>(
                  <div key={k}>
                    <div style={{ fontSize:10, color:T.gray, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{v}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Description</div>
                <p style={{ fontSize:13, color:'#374151', lineHeight:1.7, margin:0 }}>{c.description}</p>
              </div>

              {/* Required docs checklist */}
              {caseType?.requiredDocs?.length > 0 && (
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Required Documents</div>
                  {caseType.requiredDocs.map(doc=>{
                    const uploaded = c.documents.some(d=>d.name.toLowerCase().includes(doc.toLowerCase().split(' ')[0].toLowerCase()))
                    return (
                      <div key={doc} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                        <Icon name={uploaded?'check':'warning'} size={14} color={uploaded?T.green:'#d1d5db'}/>
                        <span style={{ fontSize:13, color:uploaded?T.text:T.gray }}>{doc}</span>
                        {!uploaded && <span style={{ fontSize:10, color:T.amber, fontWeight:700 }}>OUTSTANDING</span>}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Actions — internal users only */}
              {canEdit && (
                <div style={{ background:'#f0f7ff', borderRadius:10, padding:16, border:'1px solid #bfdbfe' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.blue, marginBottom:12 }}>Actions</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                    {c.status!=='Completed' && c.status!=='Closed' && c.status!=='Sent to Billing' && currentStageIdx < stages.length-1 && (
                      <Btn onClick={advanceStage} small><Icon name="chevron_r" size={13} color="#fff"/> Advance Stage</Btn>
                    )}
                    {/* "Complete & Send to Billing" for billing-trigger case types */}
                    {isBillingTrigger && !alreadySentToBilling && atFinalStage && (
                      <Btn onClick={sendToBilling} small style={{ background:T.purple }}>
                        <Icon name="sla" size={13} color="#fff"/> Complete & Send to Billing
                      </Btn>
                    )}
                    {/* Standard complete for non-billing cases */}
                    {!isBillingTrigger && atFinalStage && c.status!=='Completed' && (
                      <Btn onClick={completeCase} small>
                        <Icon name="check" size={13} color="#fff"/> Mark Complete
                      </Btn>
                    )}
                    {alreadySentToBilling && (
                      <span style={{ fontSize:12, color:T.purple, fontWeight:600, background:'#f5f3ff', padding:'6px 12px', borderRadius:7 }}>
                        ✓ Sent to Billing · Task {c.billingTaskId}
                      </span>
                    )}
                  </div>

                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#374151', marginBottom:6 }}>Update Status</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {CASE_STATUSES.map(s=>(
                        <button key={s} onClick={()=>updateStatus(s)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${c.status===s?T.blue:T.border}`, background:c.status===s?T.blue:'#fff', color:c.status===s?'#fff':'#374151', fontSize:11, fontWeight:600, cursor:'pointer' }}>{s}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:'#374151', marginBottom:6 }}>Assign To</div>
                    <select value={c.assignedTo||''} onChange={e=>reassign(e.target.value)} style={{ padding:'6px 10px', border:`1px solid ${T.border}`, borderRadius:7, fontSize:12 }}>
                      <option value="">Unassigned</option>
                      {users.filter(u=>['administrator','billing_admin','general_manager'].includes(u.role) && u.status==='active').map(u=>(
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WORKFLOW */}
          {tab==='Workflow' && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:16 }}>
                Workflow — {caseType?.name} · Stage {Math.min(currentStageIdx+1, stages.length)} of {stages.length}
              </div>
              {stages.map((stage,idx)=>{
                const done   = idx < currentStageIdx
                const active = idx === currentStageIdx
                const clr    = done ? STAGE_CLR.done : active ? STAGE_CLR.active : STAGE_CLR.pending
                return (
                  <div key={stage.id} style={{ display:'flex', gap:14, marginBottom:20, position:'relative' }}>
                    {idx < stages.length-1 && <div style={{ position:'absolute', left:15, top:32, width:2, height:'calc(100% + 4px)', background:done?'#d1fae5':'#e5e7eb' }}/>}
                    <div style={{ width:32, height:32, borderRadius:'50%', border:`2px solid ${clr}`, background:done?'#d1fae5':active?'#eff6ff':'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {done ? <Icon name="check" size={14} color={T.green}/> : <span style={{ fontSize:11, fontWeight:700, color:clr }}>{idx+1}</span>}
                    </div>
                    <div style={{ flex:1, paddingTop:4 }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ fontSize:14, fontWeight:active?700:500, color:idx>currentStageIdx?T.gray:T.text }}>{stage.name}</span>
                        {active && <span style={{ fontSize:10, fontWeight:700, color:T.blue, background:'#eff6ff', padding:'2px 8px', borderRadius:20 }}>CURRENT</span>}
                        {done && <span style={{ fontSize:10, fontWeight:700, color:T.green, background:'#d1fae5', padding:'2px 8px', borderRadius:20 }}>DONE</span>}
                      </div>
                      <div style={{ fontSize:11, color:T.gray, marginTop:2 }}>
                        Owner: <span style={{ fontWeight:600 }}>{stage.owner?.replace(/_/g,' ')}</span>
                        {stage.notify && <> · <span style={{ color:T.amber }}>Notify on completion</span></>}
                      </div>
                    </div>
                  </div>
                )
              })}
              {/* Billing stage note */}
              {caseType?.isBillingTrigger && (
                <div style={{ background:'#f5f3ff', borderRadius:9, padding:'12px 14px', border:'1px solid #ddd6fe', marginTop:8 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.purple, marginBottom:3 }}>Billing Workflow</div>
                  <div style={{ fontSize:12, color:'#6d28d9' }}>After the final stage, use "Complete & Send to Billing" to create a Billing Task and notify the billing team.</div>
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS */}
          {tab==='Documents' && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:14 }}>Documents ({c.documents.length})</div>
              {c.documents.map((doc,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', background:'#f9fafb', borderRadius:8, marginBottom:8, border:`1px solid ${T.border}` }}>
                  <Icon name="attach" size={18} color={T.gray}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{doc.name}</div>
                    <div style={{ fontSize:11, color:T.gray }}>{doc.size} · {doc.date}</div>
                  </div>
                  <button style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                    <Icon name="download" size={12}/> Download
                  </button>
                </div>
              ))}
              {c.documents.length===0 && <div style={{ textAlign:'center', color:T.gray, padding:32 }}>No documents uploaded.</div>}
              <div style={{ marginTop:14, padding:18, border:'2px dashed #d1d5db', borderRadius:8, textAlign:'center', color:T.gray, cursor:'pointer', fontSize:12 }}>
                <Icon name="attach" size={18} color={T.border}/>
                <div style={{ marginTop:5 }}>Click to upload documents (PDF, DOCX, XLSX, JPG, PNG)</div>
              </div>
            </div>
          )}

          {/* NOTES */}
          {tab==='Notes' && (
            <div>
              {c.notes.map((n,i)=>{
                const u = users.find(x=>x.id===n.user)
                return (
                  <div key={i} style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:13, marginBottom:10 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:5 }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background:T.amber, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700 }}>{u?.avatar||'?'}</div>
                      <span style={{ fontSize:12, fontWeight:700, color:'#92400e' }}>{u?.name||'Unknown'}</span>
                      <span style={{ fontSize:11, color:T.gray }}>{n.date}</span>
                    </div>
                    <p style={{ margin:0, fontSize:13, color:'#374151' }}>{n.text}</p>
                  </div>
                )
              })}
              {c.notes.length===0 && <div style={{ textAlign:'center', color:T.gray, marginBottom:16 }}>No notes yet.</div>}
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note..." style={{ width:'100%', minHeight:72, padding:11, border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}/>
              <button onClick={addNote} style={{ marginTop:7, padding:'7px 14px', background:T.navy, color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                <Icon name="send" size={13} color="#fff"/> Add Note
              </button>
            </div>
          )}

          {/* AUDIT */}
          {tab==='Audit' && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:12 }}>Audit Trail — {c.ref}</div>
              {[...c.audit].reverse().map((ev,i)=>{
                const u = users.find(x=>x.id===ev.user)
                const clr = auditColor[ev.type]||T.gray
                return (
                  <div key={i} style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:'1px solid #f3f4f6' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:clr, marginTop:5, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:13, color:T.text }}>{ev.action}</span>
                      <div style={{ fontSize:11, color:T.gray, marginTop:1 }}>{u?.name||ev.user} · {new Date(ev.time).toLocaleString('en-ZA',{dateStyle:'short',timeStyle:'short'})}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
