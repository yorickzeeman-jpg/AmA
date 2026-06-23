import { useState } from 'react'
import {
  T, CASE_STATUSES, PRIORITIES, genRef,
  STEP_STATUSES, STEP_STATUS_CONFIG,
  workflowProgress, currentStep, initWorkflow,
} from '../data.js'
import { Icon, StatusBadge, PriorityBadge, SLAChip, Tabs, Avatar, Btn, Card, inputSt } from '../ui.jsx'

export default function CaseDetail({ c, employers, users, currentUser, onClose, onUpdate, onAddBillingTask, onLaunchInduction }) {
  const [tab, setTab]   = useState('Overview')
  const [note, setNote] = useState('')

  const isInternal = !['employer_admin','employer_user'].includes(currentUser.role)
  const isGM       = currentUser.role === 'general_manager'
  const canEdit    = isInternal

  const assignedUser = users.find(u => u.id === c.assignedTo)
  const employer     = employers.find(e => e.id === c.employerId)
  const workflow     = c.workflow || null
  const prog         = workflow ? workflowProgress(workflow) : null
  const curStep      = workflow ? currentStep(workflow) : null

  function addAudit(action, type = 'action') {
    return [...(c.audit || []), { time: new Date().toISOString(), user: currentUser.id, action, type }]
  }

  function saveNote() {
    if (!note.trim()) return
    const newNote = { id: 'n' + Date.now(), text: note.trim(), user: currentUser.id, userName: currentUser.name, time: new Date().toISOString() }
    onUpdate({ ...c, notes: [...(c.notes || []), newNote], audit: addAudit(`Note added: "${note.trim().slice(0, 60)}"`, 'note') })
    setNote('')
  }

  function changeStatus(newStatus) {
    onUpdate({ ...c, status: newStatus, audit: addAudit(`Status changed to ${newStatus}`, 'status') })
  }

  function sendToBilling() {
    const btRef  = genRef('BT')
    const btId   = 'bt' + Date.now()
    const now    = new Date().toISOString()
    const billingUsers = users.filter(u => u.role === 'billing_admin' && u.status === 'active')
    const assignBilling = billingUsers[Math.floor(Math.random() * billingUsers.length)]
    const bt = {
      id: btId, ref: btRef, linkedCaseId: c.id, linkedCaseRef: c.ref,
      employerId: c.employerId, memberName: c.memberName,
      transactionType: c.caseTypeName, effectiveDate: new Date().toISOString().split('T')[0],
      assignedTo: assignBilling?.id || '', status: 'Pending Billing', priority: c.priority,
      createdBy: currentUser.id, created: now,
    }
    onAddBillingTask(bt)
    onUpdate({
      ...c, status: 'Sent to Billing', billingTaskId: btId,
      audit: addAudit(`Sent to Billing — Task ${btRef} assigned to ${assignBilling?.name || 'billing queue'}`, 'billing'),
    })
  }

  const billingTrigger = workflow?.billingTrigger
  const allDone        = workflow?.steps?.every(s => s.status === 'Completed' || s.status === 'Skipped')
  const showBillingBtn = canEdit && billingTrigger && allDone && c.status !== 'Sent to Billing' && !c.billingTaskId

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', animation:'fadeIn .2s ease' }}>
      <div style={{ width:'min(720px,100vw)', height:'100vh', background:'#fff', boxShadow:'-8px 0 32px rgba(0,0,0,0.15)', display:'flex', flexDirection:'column', animation:'slideInRight .25s ease' }}>

        {/* Header */}
        <div style={{ padding:'16px 22px', borderBottom:`1px solid ${T.border}`, background:T.navy, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.5)', marginBottom:3 }}>{c.ref}</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#fff', marginBottom:4 }}>{c.caseTypeName}</div>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
              <StatusBadge status={c.status}/>
              <PriorityBadge priority={c.priority}/>
              <SLAChip slaDate={c.slaDate} status={c.status}/>
              {c.workflowCategory && <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.1)', padding:'2px 8px', borderRadius:10 }}>{c.workflowCategory}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, width:34, height:34, cursor:'pointer', color:'#fff', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom:`1px solid ${T.border}`, flexShrink:0, background:'#fff' }}>
          <Tabs tabs={['Overview','Workflow','Documents','Notes','Audit']} active={tab} onChange={setTab}/>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:22 }}>

          {/* ── OVERVIEW ── */}
          {tab === 'Overview' && (
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              {/* Meta grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, background:'#f9fafb', borderRadius:10, padding:16, border:`1px solid ${T.border}` }}>
                {[
                  ['Employer',    employer?.name || '—'],
                  ['Assigned To', assignedUser?.name || 'Unassigned'],
                  ['SLA Due',     c.slaDate],
                  ['Created',     c.created],
                  ['Member',      c.memberName || '—'],
                  ['Member ID',   c.memberId || '—'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <div style={{ fontSize:10, color:T.gray, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Workflow progress summary */}
              {workflow && (
                <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, overflow:'hidden' }}>
                  <div style={{ padding:'12px 14px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:T.text }}>Workflow: {workflow.templateName}</div>
                      {curStep && <div style={{ fontSize:11, color:T.orange, marginTop:1 }}>Current step: {curStep.name}</div>}
                      {allDone && <div style={{ fontSize:11, color:T.green, marginTop:1 }}>✓ All steps complete</div>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:22, fontWeight:800, color:prog===100?T.green:T.orange }}>{prog}%</div>
                      <div style={{ fontSize:10, color:T.gray }}>{workflow.steps.filter(s=>s.status==='Completed').length}/{workflow.steps.length} steps</div>
                    </div>
                  </div>
                  <div style={{ height:5, background:'#f3f4f6' }}>
                    <div style={{ height:'100%', width:`${prog}%`, background:prog===100?T.green:T.orange, transition:'width .4s' }}/>
                  </div>
                  {/* Step checklist */}
                  <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:6 }}>
                    {workflow.steps.map((s, i) => {
                      const cfg = STEP_STATUS_CONFIG[s.status] || STEP_STATUS_CONFIG['Not Started']
                      return (
                        <div key={s.id} style={{ display:'flex', alignItems:'center', gap:9 }}>
                          <span style={{ color:cfg.color, fontSize:13, width:16, textAlign:'center', flexShrink:0 }}>{cfg.icon}</span>
                          <span style={{ fontSize:12, fontWeight:400, color:s.status==='Completed'?T.green:s.status==='Skipped'?'#9ca3af':T.text, textDecoration:s.status==='Skipped'?'line-through':'none' }}>
                            {i+1}. {s.name}
                          </span>
                          {s.status==='In Progress' && <span style={{ fontSize:9, color:T.blue, background:'#eff6ff', padding:'1px 6px', borderRadius:10, fontWeight:700 }}>ACTIVE</span>}
                          {s.status==='Waiting for Information' && <span style={{ fontSize:9, color:T.amber, background:'#fffbeb', padding:'1px 6px', borderRadius:10, fontWeight:700 }}>WAITING</span>}
                          {s.completedAt && <span style={{ fontSize:9, color:T.gray, marginLeft:'auto' }}>{s.completedAt.split('T')[0]}</span>}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ padding:'8px 14px', borderTop:'1px solid #f9fafb' }}>
                    <button onClick={()=>setTab('Workflow')} style={{ fontSize:12, color:T.orange, fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                      Manage workflow steps →
                    </button>
                  </div>
                </div>
              )}

              {/* Description */}
              {c.description && (
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Description</div>
                  <p style={{ fontSize:13, color:'#374151', lineHeight:1.7, margin:0 }}>{c.description}</p>
                </div>
              )}

              {/* Digital Induction button for New Employee cases */}
              {c.caseTypeName === 'New' && onLaunchInduction && (
                <div style={{ background:'linear-gradient(135deg,#1e3a5f,#e8680a)', borderRadius:11, padding:'16px 18px', color:'#fff' }}>
                  <div style={{ fontSize:13, fontWeight:800, marginBottom:4 }}>🎯 Digital Induction Wizard</div>
                  <div style={{ fontSize:11, opacity:0.8, marginBottom:12, lineHeight:1.5 }}>
                    Capture all member information once — automatically populates benefit forms, beneficiary nominations and medical aid application.
                  </div>
                  <button onClick={() => onLaunchInduction(c)}
                    style={{ padding:'9px 18px', background:'#fff', border:'none', borderRadius:8, color:'#e8680a', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    ⚡ Launch Induction Wizard →
                  </button>
                </div>
              )}
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Update Status</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {CASE_STATUSES.filter(s=>s!==c.status).map(s=>(
                      <button key={s} onClick={()=>changeStatus(s)}
                        style={{ padding:'6px 12px', borderRadius:7, border:`1px solid ${T.border}`, background:'#fff', color:'#374151', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                        {s}
                      </button>
                    ))}
                    {showBillingBtn && (
                      <button onClick={sendToBilling}
                        style={{ padding:'6px 14px', borderRadius:7, background:T.purple, border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        ⚡ Complete & Send to Billing
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── WORKFLOW ── */}
          {tab === 'Workflow' && (
            <WorkflowPanel c={c} users={users} currentUser={currentUser} onUpdate={onUpdate} onAddBillingTask={onAddBillingTask}/>
          )}

          {/* ── DOCUMENTS ── */}
          {tab === 'Documents' && (
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>
                Documents ({c.documents?.length || 0})
              </div>
              {(c.documents||[]).length === 0
                ? <div style={{ textAlign:'center', color:T.gray, padding:32, fontSize:13 }}>No documents attached.</div>
                : (c.documents||[]).map((doc,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:9, marginBottom:8 }}>
                    <span style={{ fontSize:22 }}>📄</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{doc.name}</div>
                      <div style={{ fontSize:11, color:T.gray }}>{doc.size} · Uploaded {doc.date}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* ── NOTES ── */}
          {tab === 'Notes' && (
            <div>
              {canEdit && (
                <div style={{ marginBottom:16 }}>
                  <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a case note…"
                    style={{ ...inputSt, minHeight:80, resize:'vertical', width:'100%', marginBottom:8 }}/>
                  <Btn onClick={saveNote} disabled={!note.trim()}>Add Note</Btn>
                </div>
              )}
              {(c.notes||[]).length===0
                ? <div style={{ textAlign:'center', color:T.gray, padding:24, fontSize:13 }}>No notes yet.</div>
                : [...(c.notes||[])].reverse().map(n=>{
                  const u = users.find(x=>x.id===n.user)
                  return (
                    <div key={n.id} style={{ background:'#f9fafb', borderRadius:9, padding:'12px 14px', marginBottom:10, border:`1px solid ${T.border}` }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                        <Avatar user={u||{name:n.userName||'?'}} size={24}/>
                        <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{u?.name||n.userName||'User'}</span>
                        <span style={{ fontSize:11, color:T.gray }}>{n.time?.slice(0,16).replace('T',' ')}</span>
                      </div>
                      <div style={{ fontSize:13, color:'#374151', lineHeight:1.6 }}>{n.text}</div>
                    </div>
                  )
                })
              }
            </div>
          )}

          {/* ── AUDIT ── */}
          {tab === 'Audit' && (
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>
                Timeline ({c.audit?.length || 0} events)
              </div>
              {(c.audit||[]).length===0
                ? <div style={{ textAlign:'center', color:T.gray, padding:24, fontSize:13 }}>No audit events.</div>
                : [...(c.audit||[])].reverse().map((ev,i)=>{
                  const u    = users.find(x=>x.id===ev.user)
                  const typeColors = { create:'#059669',assign:'#1e5fd9',status:'#d97706',billing:'#7c3aed',upload:'#0891b2',note:'#374151',workflow:'#e8680a',stage:'#e8680a' }
                  const typeIcons  = { create:'🆕',assign:'👤',status:'🔄',billing:'💳',upload:'📎',note:'📝',workflow:'⚙️',stage:'➡️' }
                  const clr = typeColors[ev.type]||T.gray
                  return (
                    <div key={i} style={{ display:'flex', gap:12, marginBottom:14 }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:clr+'18', border:`2px solid ${clr}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
                          {typeIcons[ev.type]||'•'}
                        </div>
                        {i < (c.audit?.length||0)-1 && <div style={{ width:2, flex:1, background:'#f3f4f6', margin:'3px 0' }}/>}
                      </div>
                      <div style={{ paddingTop:4, flex:1 }}>
                        <div style={{ fontSize:12, color:'#374151', lineHeight:1.5 }}>{ev.action}</div>
                        <div style={{ fontSize:11, color:T.gray, marginTop:2 }}>
                          {u?.name||ev.user} · {ev.time?.slice(0,16).replace('T',' ')}
                        </div>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// WORKFLOW PANEL — interactive step management
// ═════════════════════════════════════════════════════════════════════════════
function WorkflowPanel({ c, users, currentUser, onUpdate, onAddBillingTask }) {
  const [expandedStep, setExpanded] = useState(null)
  const [stepNotes, setStepNotes]   = useState({})
  const canEdit = !['employer_admin','employer_user'].includes(currentUser.role)

  const workflow = c.workflow
  if (!workflow) {
    return (
      <div style={{ textAlign:'center', padding:40, color:T.gray }}>
        <div style={{ fontSize:32, marginBottom:8 }}>⚙️</div>
        <div style={{ fontSize:13 }}>No workflow configured for this case type.</div>
      </div>
    )
  }

  const steps   = workflow.steps || []
  const prog    = workflowProgress(workflow)
  const allDone = steps.every(s => s.status === 'Completed' || s.status === 'Skipped')

  function updateStep(stepId, updates) {
    const step     = steps.find(s => s.id === stepId)
    const newSteps = steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
    const newWf    = { ...workflow, steps: newSteps, completedAt: newSteps.every(s=>s.status==='Completed'||s.status==='Skipped') ? new Date().toISOString() : null }
    const audit    = [...(c.audit||[]), {
      time:   new Date().toISOString(),
      user:   currentUser.id,
      action: `Workflow step "${step?.name}" → ${updates.status||'updated'}`,
      type:   'workflow',
    }]
    onUpdate({ ...c, workflow: newWf, audit })
  }

  function completeStep(s) {
    if (s.requiredDocs?.length > 0) {
      const attached = c.documents?.length || 0
      if (attached < s.requiredDocs.length) {
        if (!window.confirm(`Required documents may be missing:\n${s.requiredDocs.join(', ')}\n\nComplete anyway?`)) return
      }
    }
    updateStep(s.id, {
      status:      'Completed',
      completedAt: new Date().toISOString(),
      notes:       stepNotes[s.id] || s.notes || '',
    })
  }

  const AUTO_ACTION_LABELS = {
    create_billing_task:         '⚡ Creates a billing task on completion — assigned to Daleen / Ithasia',
    notify_member:               '⚡ Member notification sent automatically on completion',
    create_followup_reminder:    '⚡ Follow-up reminder created on completion',
    notify_member_update_parent: '⚡ Member notified and parent case updated on completion',
  }

  return (
    <div>
      {/* Progress header */}
      <div style={{ background:'#f9fafb', borderRadius:10, padding:'14px 16px', marginBottom:16, border:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{workflow.templateName}</div>
            <div style={{ fontSize:11, color:T.gray }}>{steps.filter(s=>s.status==='Completed').length} of {steps.length} steps completed</div>
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:prog===100?T.green:T.orange }}>{prog}%</div>
        </div>
        <div style={{ height:8, background:'#e5e7eb', borderRadius:4, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${prog}%`, background:prog===100?T.green:T.orange, borderRadius:4, transition:'width .4s ease' }}/>
        </div>
      </div>

      {/* Step list */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {steps.map((s, idx) => {
          const cfg        = STEP_STATUS_CONFIG[s.status] || STEP_STATUS_CONFIG['Not Started']
          const isExpanded = expandedStep === s.id
          const isActive   = s.status === 'Not Started' || s.status === 'In Progress' || s.status === 'Waiting for Information'
          const isCurrent  = steps.findIndex(x => x.status === 'Not Started' || x.status === 'In Progress' || x.status === 'Waiting for Information') === idx

          return (
            <div key={s.id} style={{ border:`1.5px solid ${isCurrent?T.orange:cfg.color+'40'}`, borderRadius:10, overflow:'hidden', background:isCurrent?T.orangeL+'30':'#fff' }}>
              {/* Row */}
              <div onClick={() => setExpanded(isExpanded ? null : s.id)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', cursor:'pointer' }}>

                {/* Number / status icon */}
                <div style={{ width:30, height:30, borderRadius:'50%', background:cfg.bg, border:`2px solid ${cfg.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, color:cfg.color }}>
                  {s.status === 'Completed' ? '✓' : s.status === 'Skipped' ? '⏭' : <span style={{ fontSize:11, fontWeight:700 }}>{idx+1}</span>}
                </div>

                {/* Name + badges */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:13, fontWeight:isCurrent?700:500, color:s.status==='Skipped'?'#9ca3af':T.text, textDecoration:s.status==='Skipped'?'line-through':'none' }}>{s.name}</span>
                    {isCurrent && <span style={{ fontSize:9, fontWeight:700, color:T.orange, background:T.orangeL, padding:'1px 7px', borderRadius:10 }}>CURRENT</span>}
                    {s.requiredDocs?.length > 0 && <span style={{ fontSize:9, color:T.blue, background:'#eff6ff', padding:'1px 7px', borderRadius:10 }}>📎 {s.requiredDocs.length} doc{s.requiredDocs.length!==1?'s':''}</span>}
                    {s.autoAction && <span style={{ fontSize:9, color:T.purple, background:'#f5f3ff', padding:'1px 7px', borderRadius:10 }}>⚡</span>}
                  </div>
                  <div style={{ fontSize:11, color:T.gray, marginTop:1 }}>
                    SLA: {s.slaDays} day{s.slaDays!==1?'s':''}
                    {s.completedAt && ` · Done ${s.completedAt.split('T')[0]}`}
                  </div>
                </div>

                {/* Status pill */}
                <span style={{ fontSize:10, fontWeight:700, color:cfg.color, background:cfg.bg, padding:'3px 9px', borderRadius:20, border:`1px solid ${cfg.color}30`, whiteSpace:'nowrap', flexShrink:0 }}>
                  {cfg.icon} {s.status}
                </span>
                <span style={{ color:T.gray, fontSize:11 }}>{isExpanded?'▲':'▼'}</span>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div style={{ padding:'12px 14px', borderTop:`1px solid ${T.border}`, background:'#fafafa' }}>

                  {/* Required docs */}
                  {s.requiredDocs?.length > 0 && (
                    <div style={{ marginBottom:12, padding:'10px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#92400e', marginBottom:5 }}>Required Documents</div>
                      {s.requiredDocs.map(doc => {
                        const attached = c.documents?.some(d => d.name.toLowerCase().includes(doc.toLowerCase().split(' ')[0]))
                        return (
                          <div key={doc} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, marginBottom:3 }}>
                            <span style={{ color:attached?T.green:'#d1d5db' }}>{attached?'✓':'○'}</span>
                            <span style={{ color:attached?T.green:'#92400e', textDecoration:attached?'line-through':'none' }}>{doc}</span>
                            {!attached && <span style={{ fontSize:9, color:T.amber, fontWeight:700 }}>OUTSTANDING</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Auto-action info */}
                  {s.autoAction && (
                    <div style={{ marginBottom:12, fontSize:11, color:T.purple, background:'#f5f3ff', padding:'8px 10px', borderRadius:7, border:'1px solid #e9d5ff' }}>
                      {AUTO_ACTION_LABELS[s.autoAction] || s.autoAction}
                    </div>
                  )}

                  {/* Notes */}
                  {canEdit && (
                    <div style={{ marginBottom:10 }}>
                      <label style={{ fontSize:11, fontWeight:700, color:T.text, display:'block', marginBottom:5 }}>Step Notes</label>
                      <textarea
                        value={stepNotes[s.id] ?? s.notes ?? ''}
                        onChange={e => setStepNotes(n => ({...n, [s.id]: e.target.value}))}
                        placeholder="Add notes for this step…"
                        style={{ ...inputSt, minHeight:60, resize:'vertical', width:'100%' }}
                      />
                    </div>
                  )}

                  {/* Status buttons */}
                  {canEdit && (
                    <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                      {STEP_STATUSES.filter(st => st !== s.status).map(st => {
                        const scfg = STEP_STATUS_CONFIG[st]
                        return (
                          <button key={st} onClick={() => updateStep(s.id, { status:st, startDate: st==='In Progress'?new Date().toISOString():s.startDate })}
                            style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${scfg.color}30`, background:scfg.bg, color:scfg.color, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                            {scfg.icon} {st}
                          </button>
                        )
                      })}
                      {s.status !== 'Completed' && (
                        <button onClick={() => completeStep(s)}
                          style={{ padding:'5px 14px', borderRadius:20, background:T.green, border:'none', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                          ✓ Mark Complete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Billing CTA */}
      {workflow.billingTrigger && allDone && c.status !== 'Sent to Billing' && canEdit && (
        <div style={{ marginTop:16, padding:'14px 16px', background:'#f5f3ff', border:'1px solid #c4b5fd', borderRadius:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.purple, marginBottom:4 }}>All steps complete — billing action required</div>
          <div style={{ fontSize:12, color:'#6d28d9', marginBottom:10 }}>This case requires a billing task. Assign to Daleen or Ithasia using round robin.</div>
          <button onClick={() => {
            const now  = new Date().toISOString()
            const btRef = genRef('BT')
            const btId  = 'bt' + Date.now()
            const billingUsers = users.filter(u => u.role === 'billing_admin' && u.status === 'active')
            const assigned     = billingUsers[Math.floor(Math.random() * billingUsers.length)]
            const bt = {
              id: btId, ref: btRef,
              linkedCaseId: c.id, linkedCaseRef: c.ref,
              employerId: c.employerId, memberName: c.memberName,
              transactionType: c.caseTypeName,
              actionType: c.caseTypeName,
              effectiveDate: now.split('T')[0],
              assignedTo: assigned?.id || '',
              status: 'Pending Billing',
              priority: c.priority,
              createdBy: currentUser.id,
              created: now,
            }
            onAddBillingTask(bt)
            const audit = [...(c.audit||[]), { time:now, user:currentUser.id, action:`Sent to Billing — Task ${btRef} assigned to ${assigned?.name||'billing queue'}`, type:'billing' }]
            onUpdate({ ...c, status:'Sent to Billing', billingTaskId:btId, audit })
          }} style={{ padding:'9px 18px', background:T.purple, border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            ⚡ Complete & Send to Billing
          </button>
        </div>
      )}
    </div>
  )
}
