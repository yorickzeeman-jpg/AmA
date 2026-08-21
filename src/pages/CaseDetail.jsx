import { useState } from 'react'
import {
  T, CASE_STATUSES, PRIORITIES, genRef,
  STEP_STATUSES, STEP_STATUS_CONFIG,
  workflowProgress, currentStep, initWorkflow, WORKFLOW_TEMPLATES, canReassignCase, canEditCase,
} from '../data.js'
import { Icon, StatusBadge, PriorityBadge, SLAChip, Tabs, Avatar, Btn, Card, inputSt } from '../ui.jsx'

export default function CaseDetail({ c, employers, users, members = [], currentUser, onClose, onUpdate, onAddBillingTask, onLaunchInduction, onLaunchConsultation, onLaunchJourney }) {
  const [tab, setTab]   = useState('Overview')
  const [note, setNote] = useState('')

  const isInternal = !['employer_admin','employer_user'].includes(currentUser.role)
  const isGM       = currentUser.role === 'general_manager'
  // VIEW ALL, EDIT OWN: any authorised staff member may open this case, but
  // editing is limited to the assignee, the creator, or admin/management.
  const canEdit    = isInternal && canEditCase(currentUser, c)
  const viewOnly   = isInternal && !canEdit

  const assignedUser = users.find(u => u.id === c.assignedTo)
  const employer     = employers.find(e => e.id === c.employerId)
  // Never show a case without a workflow: fall back to the case type's template
  // so cases created before workflow attachment still display and can be worked.
  const workflow     = c.workflow || initWorkflow(c.caseTypeName)
  const prog         = workflow ? workflowProgress(workflow) : null
  const curStep      = workflow ? currentStep(workflow) : null

  function addAudit(action, type = 'action') {
    return [...(c.audit || []), { time: new Date().toISOString(), user: currentUser.id, action, type }]
  }

  function saveNote() {
    if (!note.trim()) return
    const newNote = { id: crypto.randomUUID(), text: note.trim(), user: currentUser.id, userName: currentUser.name, time: new Date().toISOString() }
    onUpdate({ ...c, notes: [...(c.notes || []), newNote], audit: addAudit(`Note added: "${note.trim().slice(0, 60)}"`, 'note') })
    setNote('')
  }

  function changeStatus(newStatus) {
    const resolvedDate = newStatus === 'Closed'
      ? (c.resolvedDate || new Date().toISOString().split('T')[0])
      : (c.resolvedDate || null)
    onUpdate({ ...c, status: newStatus, resolvedDate, audit: addAudit(`Status changed to ${newStatus}`, 'status') })
  }

  function sendToBilling() {
    const btRef  = genRef('BT')
    const btId   = crypto.randomUUID()
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
          <Tabs tabs={['Overview','Workflow','Leandre AI','Documents','Notes','Audit']} active={tab} onChange={setTab}/>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:22 }}>

          {/* ── OVERVIEW ── */}
          {tab === 'Overview' && (
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              {viewOnly && (
                <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#1e40af', lineHeight:1.6 }}>
                  <strong>View only.</strong> This case is assigned to {assignedUser?.name || 'someone else'}. You can see its
                  status, workflow and history. To work on it, assign it to yourself using the Assigned To field below.
                </div>
              )}
              {/* Receive Notification: member financial position for review cases */}
              {['Member Review','Benefit Update'].includes(c.caseTypeName) && (
                <MemberPosition c={c} members={members} currentUser={currentUser} onUpdate={onUpdate}/>
              )}
              {/* Meta grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, background:'#f9fafb', borderRadius:10, padding:16, border:`1px solid ${T.border}` }}>
                {[
                  ['Employer',    employer?.name || '—'],
                  ['SLA Due',     c.slaDate],
                  ['Created',     c.created],
                  ['Member',      c.memberName || '—'],
                  ['Member ID',   c.memberId || '—'],
                  ['Mobile',      c.memberPhone || '—'],
                  ['Email',       c.memberEmail || '—'],
                  ['Case Type',   c.masterCaseType || c.caseTypeName || '—'],
                  ['Case Category', c.caseCategory || '—'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <div style={{ fontSize:10, color:T.gray, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{v}</div>
                  </div>
                ))}
                {/* Assigned To — with reassignment for managers/administrators */}
                <div>
                  <div style={{ fontSize:10, color:T.gray, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>Assigned To</div>
                  {canReassignCase(currentUser, c) ? (
                    <select
                      value={c.assignedTo || ''}
                      onChange={e => {
                        const newId   = e.target.value
                        const newUser = users.find(u => u.id === newId)
                        const prev    = users.find(u => u.id === c.assignedTo)
                        if (!window.confirm(`Reassign ${c.ref} from ${prev?.name || 'Unassigned'} to ${newUser?.name || 'Unassigned'}?`)) return
                        const audit = [...(c.audit||[]), {
                          time:   new Date().toISOString(),
                          user:   currentUser.id,
                          action: `Case reassigned: ${prev?.name || 'Unassigned'} → ${newUser?.name || 'Unassigned'} (by ${currentUser.name})`,
                          type:   'assign',
                        }]
                        const ownerHistory = [...(c.ownerHistory||[]), ...(newId ? [{ user:newId, from:new Date().toISOString().split('T')[0] }] : [])]
                        onUpdate({ ...c, assignedTo: newId, audit, ownerHistory })
                      }}
                      style={{ ...inputSt, padding:'6px 10px', fontSize:13, fontWeight:600 }}>
                      <option value="">Unassigned</option>
                      {users.filter(u => !['employer_admin','employer_user'].includes(u.role) && u.status==='active').map(u => (
                        <option key={u.id} value={u.id}>{u.name}{u.id===currentUser.id?' (me)':''}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{assignedUser?.name || 'Unassigned'}</div>
                  )}
                  {canReassignCase(currentUser, c) && c.assignedTo !== currentUser.id && (
                    <button onClick={() => {
                        const prev = users.find(u => u.id === c.assignedTo)
                        onUpdate({
                          ...c,
                          assignedTo: currentUser.id,
                          ownerHistory: [...(c.ownerHistory||[]), { user:currentUser.id, from:new Date().toISOString().split('T')[0] }],
                          audit: [...(c.audit||[]), {
                            time: new Date().toISOString(), user: currentUser.id, type:'assign',
                            action: `Case self-assigned: ${prev?.name || 'Unassigned'} → ${currentUser.name}`,
                          }],
                        })
                      }}
                      style={{ marginTop:6, fontSize:11, fontWeight:700, color:T.blue, background:'none', border:'none', padding:0, cursor:'pointer', fontFamily:'inherit', textDecoration:'underline' }}>
                      Assign to me
                    </button>
                  )}
                </div>
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

              {/* Death claim fields */}
              {c.extraFields && Object.keys(c.extraFields).filter(k=>c.extraFields[k]).length > 0 && (
                <div style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.red, marginBottom:10 }}>Death Claim Information</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {Object.entries(c.extraFields).filter(([,v])=>v).map(([key, val]) => {
                      const label = {
                        natural_unnatural: 'Natural / Unnatural',
                        date_of_death:     'Date of Death',
                        relationship:      'Relationship',
                        amount_paid:       'Amount Paid',
                        claim_number:      'Claim Number',
                        date_claim_paid:   'Date Claim Paid',
                        claim_status:      'Claim Status',
                        deceased_name:     'Deceased Name',
                        deceased_id:       'Deceased ID',
                        claimant_name:     'Claimant Name',
                        claimant_id:       'Claimant ID',
                        funeral_parlour:   'Funeral Parlour',
                        funeral_date:      'Funeral Date',
                        funeral_cost:      'Funeral Cost',
                        claim_type:        'Claim Type',
                        uploaded_docs:     'Documents Checked',
                        participating_employer: 'Participating Employer',
                        branch:            'Branch',
                      }[key] || key
                      // Render primitives only — objects/arrays are stringified safely (React error #31 guard)
                      const display = Array.isArray(val)
                        ? val.map(v => typeof v === 'object' ? (v?.name || JSON.stringify(v)) : String(v)).join(', ')
                        : typeof val === 'object'
                        ? JSON.stringify(val)
                        : String(val)
                      return (
                        <div key={key}>
                          <div style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', marginBottom:3 }}>{label}</div>
                          <div style={{ fontSize:13, fontWeight:key==='amount_paid'?800:500, color:key==='amount_paid'?T.red:T.text }}>
                            {key==='amount_paid' ? `R${Number(val).toLocaleString()}` : display}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Digital Induction + Financial Consultation for New Employee cases */}
              {['New','Member Review','Benefit Update'].includes(c.caseTypeName) && (onLaunchInduction || onLaunchConsultation) && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {onLaunchConsultation && (
                    <div style={{ background:`linear-gradient(135deg,${T.navy},#1a3a6b)`, borderRadius:11, padding:'16px 18px', color:'#fff' }}>
                      <div style={{ fontSize:13, fontWeight:800, marginBottom:4 }}>📊 Financial Consultation Workspace</div>
                      <div style={{ fontSize:11, opacity:0.8, marginBottom:12, lineHeight:1.5 }}>
                        Guided consultation — loads {c.memberName || 'the member'}'s salary, AVCs, fund value and date of birth automatically, calculates contributions, checks underwriting, projects retirement and generates adviser insights.
                      </div>
                      <button onClick={() => onLaunchConsultation(c)}
                        style={{ padding:'9px 18px', background:'#fff', border:'none', borderRadius:8, color:T.navy, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        ⚡ Launch Consultation →
                      </button>
                    </div>
                  )}
                  {onLaunchInduction && c.caseTypeName === 'New' && (
                    <div style={{ background:`linear-gradient(135deg,#059669,#047857)`, borderRadius:11, padding:'16px 18px', color:'#fff' }}>
                      <div style={{ fontSize:13, fontWeight:800, marginBottom:4 }}>🎯 Digital Induction Wizard</div>
                      <div style={{ fontSize:11, opacity:0.8, marginBottom:12, lineHeight:1.5 }}>
                        Capture personal details, benefits, beneficiaries and obtain digital signature.
                      </div>
                      <button onClick={() => onLaunchInduction(c)}
                        style={{ padding:'9px 18px', background:'#fff', border:'none', borderRadius:8, color:'#059669', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                        ⚡ Launch Induction Wizard →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Status controls */}
              {canEdit && (
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
            <WorkflowPanel c={c} users={users} currentUser={currentUser} onUpdate={onUpdate} onAddBillingTask={onAddBillingTask} setTab={setTab} onLaunchConsultation={onLaunchConsultation} onLaunchJourney={onLaunchJourney}/>
          )}

          {/* ── DOCUMENTS ── */}
          {tab === 'Leandre AI' && (
            <LeandrePanel c={c} users={users} currentUser={currentUser} onGoWorkflow={()=>setTab('Workflow')} onGoDocs={()=>setTab('Documents')}/>
          )}
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
function WorkflowPanel({ c, users, currentUser, onUpdate, onAddBillingTask, setTab, onLaunchConsultation, onLaunchJourney }) {
  const [expandedStep, setExpanded] = useState(null)
  const [stepNotes, setStepNotes]   = useState({})
  const canEdit = !['employer_admin','employer_user'].includes(currentUser.role) && canEditCase(currentUser, c)

  const workflow = c.workflow || initWorkflow(c.caseTypeName)
  if (!workflow) {
    // Case predates workflow attachment and its case type has no template —
    // let the administrator generate and link one now.
    return (
      <div style={{ textAlign:'center', padding:40, color:T.gray }}>
        <div style={{ fontSize:32, marginBottom:8 }}>⚙️</div>
        <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>No workflow has been assigned to this case.</div>
        <div style={{ fontSize:12, marginBottom:16 }}>Generate the default workflow to start working this case.</div>
        {canEdit && (
          <GenerateWorkflow c={c} currentUser={currentUser} onUpdate={onUpdate}/>
        )}
      </div>
    )
  }

  const steps   = workflow.steps || []
  const prog    = workflowProgress(workflow)
  const allDone = steps.every(s => s.status === 'Completed' || s.status === 'Skipped')

  function updateStep(stepId, updates) {
    const step     = steps.find(s => s.id === stepId)
    // Carry any typed-but-unsaved comment through so status changes never lose it
    const typed    = stepNotes[stepId]
    const withNote = typed !== undefined ? { notes: typed } : {}
    const newSteps = steps.map(s => s.id === stepId ? { ...s, ...withNote, ...updates } : s)
    const newWf    = { ...workflow, steps: newSteps, completedAt: newSteps.every(s=>s.status==='Completed'||s.status==='Skipped') ? new Date().toISOString() : null }
    const audit    = [...(c.audit||[]), {
      time:   new Date().toISOString(),
      user:   currentUser.id,
      action: `Workflow step "${step?.name}" → ${updates.status||'updated'}`,
      type:   'workflow',
    }]
    onUpdate({ ...c, workflow: newWf, audit })
  }

  // FIX: step comments previously lived only in local state and were written
  // to the case solely by completeStep — so any other action, or leaving the
  // case, silently discarded them. Now saved on blur against the workflow step.
  // Final step = last step in the workflow
  const isFinalStep = st => steps.length > 0 && steps[steps.length-1].id === st.id
  // Death/funeral claims carry the extra claim information
  // Death Claim Information applies ONLY to actual death claims. An explicit
  // allow-list — a substring match wrongly caught "Extended Funeral Application",
  // which is an APPLICATION for cover, not a claim against it.
  const DEATH_CLAIM_TYPES = [
    'Death - Funeral',
    'Death - Extended Funeral',
    'Death - Accidental Funeral',
    'Death - Retirement',
    'Death - GLA',
    'Death - GEB',
    'Death - GEB Review',
  ]
  const DEATH_CLAIM_CATEGORIES = [
    'Funeral',
    'Funeral - Flexicare',
    'Funeral - Accident',
    'Extended Funeral',
    'GEB Claim',
    'GLA Death Claim',
    'GEB Review',
    'Ret Death Claim',
    'Trust Account - Minor',
    'Estate Account',
  ]
  const isDeathClaim =
       DEATH_CLAIM_TYPES.includes(c.caseTypeName)
    || DEATH_CLAIM_CATEGORIES.includes(c.caseCategory)
    || c.masterCaseType === 'Death'

  // Reuse the existing extraFields store — no duplicate fields created
  function saveExtra(key, value) {
    if ((c.extraFields?.[key] || '') === value) return
    onUpdate({
      ...c,
      extraFields: { ...(c.extraFields||{}), [key]: value },
      audit: [...(c.audit||[]), {
        time: new Date().toISOString(), user: currentUser.id,
        action: `Claim information updated — ${key.replace(/_/g,' ')}: ${value || '(cleared)'}`, type:'update',
      }],
    })
  }

  // FIX: complete the final step AND close the case in one explicit action
  function completeAndClose(s) {
    if (isDeathClaim) {
      const missing = [
        ['Cause of Death',        c.extraFields?.natural_unnatural],
        ['Relationship to Member',c.extraFields?.relationship],
        ['Amount Paid',           c.extraFields?.amount_paid],
      ].filter(([,v]) => !v).map(([l]) => l)
      if (missing.length) {
        alert(`Death Claim Information incomplete.\n\nRequired before closing:\n\n${missing.map(m=>`✗ ${m}`).join('\n')}`)
        return
      }
    }
    if (s.requiredDocs?.length > 0 && (c.documents?.length || 0) < s.requiredDocs.length) {
      alert(`Required documents outstanding for "${s.name}":\n\n${s.requiredDocs.slice(c.documents?.length||0).map(d=>`✗ ${d}`).join('\n')}`)
      return
    }
    if (!window.confirm('Are you sure you want to complete and close this case?')) return

    const now      = new Date().toISOString()
    const finalNote = stepNotes[s.id] ?? s.notes ?? ''
    const newSteps = steps.map(x => x.id === s.id
      ? { ...x, status:'Completed', completedAt:now, notes:finalNote, noteBy:currentUser.id, noteAt:now }
      : x)
    onUpdate({
      ...c,
      status:       'Closed',
      resolvedDate: c.resolvedDate || now.split('T')[0],
      closedBy:     currentUser.id,
      closedAt:     now,
      workflow:     { ...workflow, steps:newSteps, completedAt:now },
      audit: [...(c.audit||[]), {
        time: now, user: currentUser.id, type:'status',
        action: `Case closed from final step "${s.name}" by ${currentUser.name}. Previous status: ${c.status}. Workflow 100% complete.${finalNote?` Final comment: ${finalNote.slice(0,150)}`:''}`,
      }],
    })
    setTab('Overview')
  }

  function saveStepNote(s) {
    const text = stepNotes[s.id]
    if (text === undefined || text === (s.notes || '')) return
    const newSteps = steps.map(x => x.id === s.id
      ? { ...x, notes: text, noteBy: currentUser.id, noteAt: new Date().toISOString() }
      : x)
    const audit = [...(c.audit||[]), {
      time:   new Date().toISOString(),
      user:   currentUser.id,
      action: `Comment saved on step "${s.name}": ${text.slice(0,120)}${text.length>120?'…':''}`,
      type:   'note',
    }]
    onUpdate({ ...c, workflow: { ...workflow, steps:newSteps }, audit })
  }

  function completeStep(s) {
    // Leandre AI validation gate: progression is blocked until required
    // documents are attached — the user is told exactly what is missing.
    if (s.requiredDocs?.length > 0) {
      const attached = c.documents?.length || 0
      if (attached < s.requiredDocs.length) {
        const missing = s.requiredDocs.slice(attached)
        alert(`Leandre AI — step blocked.\n\nRequired before "${s.name}" can be completed:\n\n${missing.map(d=>`✗ ${d}`).join('\n')}\n\nUpload the outstanding document${missing.length!==1?'s':''} on the Documents tab, then complete this step.`)
        return
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

                  {/* Allocation control — rendered on any "Allocate" step */}
                  {canReassignCase(currentUser, c) && /allocat/i.test(s.name) && (
                    <div style={{ marginBottom:12, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:9, padding:'11px 14px' }}>
                      <label style={{ fontSize:11, fontWeight:700, color:T.navy, display:'block', marginBottom:6 }}>Allocate this case to</label>
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                        <select
                          value={c.assignedTo || ''}
                          onChange={e => {
                            const newId   = e.target.value
                            const newUser = users.find(u => u.id === newId)
                            const audit   = [...(c.audit||[]), {
                              time: new Date().toISOString(), user: currentUser.id,
                              action: `Case reallocated to ${newUser?.name || 'Unassigned'} at step "${s.name}"`, type: 'assign',
                            }]
                            const ownerHistory = [...(c.ownerHistory||[]), ...(newId ? [{ user:newId, from:new Date().toISOString().split('T')[0] }] : [])]
                            onUpdate({ ...c, assignedTo: newId, audit, ownerHistory })
                          }}
                          style={{ ...inputSt, maxWidth:260 }}>
                          <option value="">Unassigned</option>
                          {users.filter(u => !['employer_admin','employer_user'].includes(u.role) && u.status==='active').map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role?.replace(/_/g,' ')})</option>
                          ))}
                        </select>
                        <span style={{ fontSize:11, color:T.gray }}>Reallocates immediately and writes to the audit trail.</span>
                      </div>
                    </div>
                  )}

                  {/* Death Claim Information — final step of a death/funeral claim */}
                  {canEdit && isFinalStep(s) && isDeathClaim && (
                    <div style={{ marginBottom:12, background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:10, padding:'13px 15px' }}>
                      <div style={{ fontSize:12, fontWeight:800, color:'#c2410c', marginBottom:3 }}>Death Claim Information</div>
                      <div style={{ fontSize:11, color:T.gray, marginBottom:10 }}>Complete before finalising the claim.</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:4 }}>Cause of Death <span style={{color:T.red}}>*</span></label>
                          <select value={c.extraFields?.natural_unnatural || ''} onChange={e=>saveExtra('natural_unnatural', e.target.value)} style={inputSt}>
                            <option value="">Select…</option>
                            <option>Natural</option>
                            <option>Unnatural</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:4 }}>Relationship to Member <span style={{color:T.red}}>*</span></label>
                          <input defaultValue={c.extraFields?.relationship || ''} onBlur={e=>saveExtra('relationship', e.target.value)}
                            placeholder="Main Member, Spouse, Child…" style={inputSt}/>
                        </div>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:4 }}>Amount Paid (R) <span style={{color:T.red}}>*</span></label>
                          <input type="number" defaultValue={c.extraFields?.amount_paid || ''} onBlur={e=>saveExtra('amount_paid', e.target.value)}
                            placeholder="0.00" style={inputSt}/>
                        </div>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:4 }}>Date Claim Paid</label>
                          <input type="date" defaultValue={c.extraFields?.date_claim_paid || ''} onBlur={e=>saveExtra('date_claim_paid', e.target.value)} style={inputSt}/>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Launch the EXISTING Financial Wizard from the consultation /
                      projection steps, and the Better Financial Journey from its step. */}
                  {canEdit && /financial consultation|retirement projection/i.test(s.name) && onLaunchConsultation && (
                    <div style={{ marginBottom:12, background:`linear-gradient(135deg,${T.navy},#1a3a6b)`, borderRadius:10, padding:'14px 16px', color:'#fff' }}>
                      <div style={{ fontSize:13, fontWeight:800, marginBottom:3 }}>Financial Wizard</div>
                      <div style={{ fontSize:11, opacity:0.75, lineHeight:1.55, marginBottom:11 }}>
                        Opens with {c.memberName || 'this member'}'s details already loaded — salary, AVCs, fund value and
                        date of birth pull through from the case. The retirement projection runs inside the wizard.
                      </div>
                      <button onClick={() => onLaunchConsultation(c)}
                        style={{ padding:'9px 18px', background:'#fff', border:'none', borderRadius:8, color:T.navy, fontSize:12.5, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                        ⚡ Open Financial Wizard →
                      </button>
                    </div>
                  )}
                  {canEdit && /better financial journey/i.test(s.name) && onLaunchJourney && (
                    <div style={{ marginBottom:12, background:'linear-gradient(135deg,#0b1220,#1b1440)', borderRadius:10, padding:'14px 16px', color:'#fff' }}>
                      <div style={{ fontSize:13, fontWeight:800, marginBottom:3 }}>Better Financial Journey</div>
                      <div style={{ fontSize:11, opacity:0.75, lineHeight:1.55, marginBottom:11 }}>
                        Transfer Boost · Contribution Boost · Long-term modelling · Discovery ecosystem.
                        {!c.consultationResult && ' Complete the Financial Wizard first so the journey has the member\'s position.'}
                      </div>
                      <button onClick={() => onLaunchJourney(c)} disabled={!c.consultationResult}
                        style={{ padding:'9px 18px', background: c.consultationResult ? '#fff' : 'rgba(255,255,255,0.25)', border:'none', borderRadius:8, color: c.consultationResult ? '#1b1440' : 'rgba(255,255,255,0.6)', fontSize:12.5, fontWeight:800, cursor: c.consultationResult ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>
                        ⚡ Open Better Financial Journey →
                      </button>
                    </div>
                  )}

                  {/* Notes */}
                  {canEdit && (
                    <div style={{ marginBottom:10 }}>
                      <label style={{ fontSize:11, fontWeight:700, color:T.text, display:'block', marginBottom:5 }}>Step Notes</label>
                      <textarea
                        value={stepNotes[s.id] ?? s.notes ?? ''}
                        onChange={e => setStepNotes(n => ({...n, [s.id]: e.target.value}))}
                        onBlur={() => saveStepNote(s)}
                        placeholder="Add notes for this step…"
                        style={{ ...inputSt, minHeight:60, resize:'vertical', width:'100%' }}
                      />
                      {s.notes && (
                        <div style={{ fontSize:10, color:'#059669', marginTop:4 }}>
                          ✓ Saved{s.noteAt ? ` ${s.noteAt.split('T')[0]}` : ''}{s.noteBy ? ` by ${users.find(u=>u.id===s.noteBy)?.name || ''}` : ''}
                        </div>
                      )}
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
                      {s.status !== 'Completed' && !isFinalStep(s) && (
                        <button onClick={() => completeStep(s)}
                          style={{ padding:'5px 14px', borderRadius:20, background:T.green, border:'none', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                          ✓ Mark Complete
                        </button>
                      )}
                      {isFinalStep(s) && c.status !== 'Closed' && (
                        <button onClick={() => completeAndClose(s)}
                          style={{ padding:'6px 16px', borderRadius:20, background:T.navy, border:'none', color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                          ✓ Complete &amp; Close Case
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
            const btId  = crypto.randomUUID()
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

// Generate and link a default workflow for legacy cases created without one
function GenerateWorkflow({ c, currentUser, onUpdate }) {
  const names = Object.keys(WORKFLOW_TEMPLATES)
  const guess = c.type === 'funeral_claim' || c.extraFields?.claim_type
    ? (c.extraFields?.claim_type === 'extended_family' ? 'Death - Extended Funeral' : 'Death - Funeral')
    : (names.includes(c.caseTypeName) ? c.caseTypeName : names[0])
  const [choice, setChoice] = useState(guess)
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', gap:10, alignItems:'center' }}>
      <select value={choice} onChange={e=>setChoice(e.target.value)}
        style={{ ...inputSt, width:280, textAlign:'center' }}>
        {names.map(n => <option key={n}>{n}</option>)}
      </select>
      <button onClick={()=>{
          const wf = initWorkflow(choice)
          if (!wf) return
          const audit = [...(c.audit||[]), {
            time: new Date().toISOString(), user: currentUser.id,
            action: `Default workflow generated and linked: ${choice}`, type:'workflow',
          }]
          onUpdate({ ...c, caseTypeName: c.caseTypeName || choice, workflow: wf, audit })
        }}
        style={{ padding:'10px 24px', background:T.orange, border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
        Generate Default Workflow
      </button>
    </div>
  )
}

// ─── LEANDRE AI PANEL — per-case operations view ─────────────────────────────
function LeandrePanel({ c, users, currentUser, onGoWorkflow, onGoDocs }) {
  const wf     = c.workflow || initWorkflow(c.caseTypeName)
  const steps  = wf?.steps || []
  const done   = steps.filter(s=>s.status==='Completed'||s.status==='Skipped')
  const cur    = steps.find(s=>s.status!=='Completed'&&s.status!=='Skipped')
  const pct    = steps.length ? Math.round((done.length/steps.length)*100) : 0

  // SLA position
  const today    = new Date(); today.setHours(0,0,0,0)
  const slaDate  = c.slaDate ? new Date(c.slaDate) : null
  const daysLeft = slaDate ? Math.ceil((slaDate - today)/86400000) : null
  const overdue  = daysLeft !== null && daysLeft < 0

  // Missing documents for the current step
  const attached    = c.documents?.length || 0
  const missingDocs = cur?.requiredDocs?.slice(attached) || []

  // Risk level
  const risk = overdue ? 'High' : (daysLeft !== null && daysLeft <= 1) ? 'Medium' : missingDocs.length > 0 ? 'Medium' : 'Low'
  const riskClr = { High:'#dc2626', Medium:'#d97706', Low:'#059669' }[risk]

  // Suggested next action
  const suggestion = !cur
    ? 'All workflow steps complete — close the case.'
    : missingDocs.length > 0
    ? `Request the outstanding document${missingDocs.length!==1?'s':''}: ${missingDocs.join(', ')}.`
    : overdue
    ? `"${cur.name}" is past SLA — complete it today or escalate to a supervisor.`
    : `Proceed with "${cur.name}"${cur.slaDays?` (${cur.slaDays} day SLA)`:''}.`

  const assignee = users.find(u=>u.id===c.assignedTo)

  const tiles = [
    ['Current Stage',   cur ? cur.name : 'Complete',                        T.navy],
    ['Progress',        `${pct}% · ${done.length}/${steps.length} steps`,   T.blue],
    ['SLA',             slaDate ? (overdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft===0 ? 'Due today' : `${daysLeft}d remaining`) : '—', overdue ? '#dc2626' : daysLeft<=1 ? '#d97706' : '#059669'],
    ['Risk Level',      risk,                                               riskClr],
    ['Assigned To',     assignee?.name || '—',                              T.text],
    ['Escalation',      c.escalated ? 'Escalated' : 'Normal',               c.escalated ? '#dc2626' : T.gray],
  ]

  return (
    <div>
      <div style={{ background:`linear-gradient(135deg,${T.navy},#1a3a6b)`, borderRadius:12, padding:'14px 18px', marginBottom:14, color:'#fff' }}>
        <div style={{ fontSize:11, opacity:0.55, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:3 }}>Leandre AI · Operations Manager</div>
        <div style={{ fontSize:14, fontWeight:700, lineHeight:1.5 }}>{suggestion}</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:8, marginBottom:14 }}>
        {tiles.map(([l,v,clr])=>(
          <div key={l} style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, padding:'11px 13px' }}>
            <div style={{ fontSize:9, fontWeight:700, color:T.gray, textTransform:'uppercase', marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:13, fontWeight:800, color:clr }}>{v}</div>
          </div>
        ))}
      </div>

      {missingDocs.length > 0 && (
        <div style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:800, color:'#dc2626', marginBottom:8 }}>Outstanding Documents</div>
          {missingDocs.map(d=>(
            <div key={d} style={{ fontSize:13, color:'#be123c', padding:'3px 0' }}>❌ {d}</div>
          ))}
          <button onClick={onGoDocs} style={{ marginTop:8, padding:'7px 14px', background:'#dc2626', border:'none', borderRadius:7, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Upload Documents →
          </button>
        </div>
      )}

      {/* Visual workflow progress */}
      <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 18px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase', marginBottom:10 }}>Workflow Progress</div>
        {steps.map(s=>{
          const isDone = s.status==='Completed'||s.status==='Skipped'
          const isCur  = s===cur
          return (
            <div key={s.id} style={{ display:'flex', gap:10, alignItems:'center', padding:'5px 0', fontSize:13 }}>
              <span style={{ width:20, textAlign:'center' }}>{isDone ? '✓' : isCur ? '⏳' : '⬜'}</span>
              <span style={{ color:isDone?'#059669':isCur?T.navy:T.gray, fontWeight:isCur?800:isDone?600:400, flex:1 }}>{s.name}</span>
              {s.slaDays && <span style={{ fontSize:10, color:T.gray }}>{s.slaDays}d</span>}
            </div>
          )
        })}
        <button onClick={onGoWorkflow} style={{ marginTop:10, padding:'7px 16px', background:T.orange, border:'none', borderRadius:7, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          Work the Steps →
        </button>
      </div>
    </div>
  )
}

// ─── MEMBER FINANCIAL POSITION (Member Review / Benefit Update) ──────────────
// Pulls from the membership register via the case's member ID. Missing values
// are shown as missing and captured here — never silently defaulted.
function MemberPosition({ c, members, currentUser, onUpdate }) {
  const reg = (members||[]).find(m =>
    (c.memberId && (m.idNumber===c.memberId || m.payrollNumber===c.memberId || m.membershipNo===c.memberId)) ||
    (c.memberName && `${m.memberName||''} ${m.surname||''}`.trim().toLowerCase() === c.memberName.trim().toLowerCase())
  ) || null

  // Case overrides win over the register (advisor captured a missing value)
  const ov = c.memberFinancials || {}
  const val = k => ov[k] ?? reg?.[k] ?? null
  const R = v => (v||v===0) ? 'R'+Number(v).toLocaleString('en-ZA') : null

  function capture(key, raw) {
    const v = key==='dateOfBirth' ? raw : (parseFloat(String(raw).replace(/[R,\s]/g,'')) || null)
    if (v === null || v === '') return
    onUpdate({
      ...c,
      memberFinancials: { ...(c.memberFinancials||{}), [key]: v },
      audit: [...(c.audit||[]), { time:new Date().toISOString(), user:currentUser.id, type:'update',
        action:`Member financial position captured — ${key}: ${v}` }],
    })
  }

  const rows = [
    ['Individual Salary',        'salary',      R(val('salary')),      'monthly'],
    ['AVCs',                     'avc',         R(val('avc')),         'monthly'],
    ['Current Retirement Fund Value','fundValue',R(val('fundValue')),  'current'],
    ['Date of Birth',            'dateOfBirth', val('dateOfBirth'),    ''],
  ]
  const missing = rows.filter(([,,v]) => !v).length

  return (
    <div style={{ background:'#fff', border:`1px solid ${missing?'#fed7aa':T.border}`, borderRadius:11, padding:'14px 16px', marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:800, color:T.navy, textTransform:'uppercase', letterSpacing:'0.6px' }}>Member Financial Position</div>
        {missing>0 && <span style={{ fontSize:10, fontWeight:700, color:'#c2410c', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:12, padding:'2px 9px' }}>{missing} missing</span>}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:10 }}>
        {[['Member', c.memberName||'—'],['Member ID', c.memberId||'—'],
          ['Employer', reg?.employerId ? undefined : undefined]].slice(0,2).map(([l,v])=>(
          <div key={l} style={{ background:'#f9fafb', borderRadius:8, padding:'9px 11px' }}>
            <div style={{ fontSize:9, color:T.gray, textTransform:'uppercase', marginBottom:2 }}>{l}</div>
            <div style={{ fontSize:12.5, fontWeight:700 }}>{v}</div>
          </div>
        ))}
        {rows.map(([label,key,value,note])=>(
          <div key={key} style={{ background: value?'#f9fafb':'#fff7ed', borderRadius:8, padding:'9px 11px', border: value?'none':'1px solid #fed7aa' }}>
            <div style={{ fontSize:9, color:T.gray, textTransform:'uppercase', marginBottom:2 }}>{label}</div>
            {value ? (
              <div style={{ fontSize:13, fontWeight:800, color:T.navy }}>{value}{note && <span style={{ fontSize:9, color:T.gray, fontWeight:400 }}> /{note}</span>}</div>
            ) : (
              <input
                type={key==='dateOfBirth'?'date':'number'}
                onBlur={e=>capture(key, e.target.value)}
                placeholder="Not on record — capture"
                style={{ ...inputSt, padding:'5px 8px', fontSize:12 }}/>
            )}
          </div>
        ))}
      </div>
      {!reg && (
        <div style={{ marginTop:9, fontSize:11, color:'#92400e' }}>
          Member not matched in the membership register — values captured here are saved to the case.
        </div>
      )}
    </div>
  )
}
