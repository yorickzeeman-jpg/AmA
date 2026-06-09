import { useState, useEffect } from 'react'
import { T, CASE_STATUSES, PRIORITIES, calcSlaDate, allocateCase, BILLING_TRIGGER_CASE_TYPES, genRef } from '../data.js'
import { Icon, StatusBadge, PriorityBadge, SLAChip, Card, Btn, Modal, Field, inputSt, selectSt, Empty } from '../ui.jsx'

export default function CasesPage({ cases, caseTypes, categories, employers, users, currentUser, onOpenCase, onAddCase, onAddBillingTask, initialFilter, workspace='employer' }) {
  const isEmployer = ['employer_admin','employer_user'].includes(currentUser.role)
  const isGM       = currentUser.role === 'general_manager'
  const [search, setSearch]   = useState('')
  const [f, setF]             = useState({ status:'', priority:'', category:'', caseType:'', employer:'', assignedTo:'', ...initialFilter })
  const [showNew, setShowNew] = useState(false)

  useEffect(()=>{ if(initialFilter) setF(x=>({...x,...initialFilter})) },[initialFilter])
  const setFF = (k,v) => setF(x=>({...x,[k]:v}))
  const hasFilter = Object.values(f).some(Boolean)

  const visible = cases.filter(c => {
    if (c.workspace !== workspace) return false
    if (isEmployer && c.employerId !== currentUser.employer) return false
    // Admins only see their own cases by default (GM sees all)
    if (currentUser.role === 'administrator' && workspace === 'employer') {
      // show assigned + unassigned
    }
    if (search) {
      const q = search.toLowerCase()
      const ct  = caseTypes.find(x=>x.id===c.caseTypeId)
      const emp = employers.find(x=>x.id===c.employerId)
      if (!c.ref.toLowerCase().includes(q) && !ct?.name.toLowerCase().includes(q) && !emp?.name.toLowerCase().includes(q) && !(c.memberName||'').toLowerCase().includes(q)) return false
    }
    if (f.status   && c.status!==f.status) return false
    if (f.priority && c.priority!==f.priority) return false
    if (f.caseType && c.caseTypeId!==f.caseType) return false
    if (f.category && caseTypes.find(ct=>ct.id===c.caseTypeId)?.categoryId !== f.category) return false
    if (f.employer && c.employerId!==f.employer) return false
    if (f.assignedTo && c.assignedTo!==f.assignedTo) return false
    return true
  })

  // Case types visible for this workspace
  const visibleCaseTypes = caseTypes.filter(ct => workspace==='internal' ? ct.isInternal : !ct.isInternal)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>
          {workspace==='internal' ? 'Internal Cases' : isEmployer ? 'My Cases' : 'Employer Cases'}
        </h1>
        <Btn onClick={()=>setShowNew(true)}><Icon name="plus" size={15} color="#fff"/> New Case</Btn>
      </div>

      {/* Filter bar */}
      <div style={{ background:'#fff', borderRadius:10, padding:'10px 14px', border:`1px solid ${T.border}`, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <Icon name="filter" size={15} color={T.gray}/>
        <div style={{ position:'relative' }}>
          <div style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><Icon name="search" size={13} color={T.gray}/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ref, case type, employer, member..." style={{ padding:'6px 8px 6px 26px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, width:220 }}/>
        </div>
        {[
          ['status','Status',CASE_STATUSES],
          ['priority','Priority',PRIORITIES],
          ['category','Category',categories.map(c=>[c.id,c.name])],
          ['caseType','Case Type',visibleCaseTypes.map(ct=>[ct.id,ct.name])],
          ...(!isEmployer?[['employer','Employer',employers.map(e=>[e.id,e.name])]]:[]),
          ...(isGM?[['assignedTo','Assigned',users.filter(u=>['administrator','billing_admin'].includes(u.role)).map(u=>[u.id,u.name])]]:[]),
        ].map(([key,lbl,opts])=>(
          <select key={key} value={f[key]} onChange={e=>setFF(key,e.target.value)} style={{ padding:'6px 8px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, background:f[key]?'#f0f7ff':'#fff', color:f[key]?T.blue:'#374151' }}>
            <option value="">All {lbl}</option>
            {opts.map(o=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o}>{o}</option>)}
          </select>
        ))}
        {hasFilter && <button onClick={()=>setF({status:'',priority:'',category:'',caseType:'',employer:'',assignedTo:''})} style={{ fontSize:11, color:T.red, background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>Clear</button>}
        <div style={{ marginLeft:'auto', fontSize:11, color:T.gray }}>{visible.length} case{visible.length!==1?'s':''}</div>
      </div>

      {/* Table */}
      <Card>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:750 }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                {['Ref','Case Type','Employer','Member','Status','Priority','Assigned','SLA',''].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(c=>{
                const ct  = caseTypes.find(x=>x.id===c.caseTypeId)
                const cat = categories.find(x=>x.id===ct?.categoryId)
                const emp = employers.find(x=>x.id===c.employerId)
                const au  = users.find(u=>u.id===c.assignedTo)
                return (
                  <tr key={c.id} onClick={()=>onOpenCase(c)} style={{ cursor:'pointer', borderBottom:'1px solid #f3f4f6', transition:'background .1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <td style={{ padding:'11px 14px', fontFamily:'monospace', fontSize:11, color:T.gray, fontWeight:700, whiteSpace:'nowrap' }}>
                      {c.ref}
                      {c.escalated && <span style={{ marginLeft:4, fontSize:9, color:T.red, fontWeight:700 }}>⚠</span>}
                      {c.billingTaskId && <span style={{ marginLeft:4, fontSize:9, color:T.purple, fontWeight:700 }}>₿</span>}
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{ct?.name||'—'}</div>
                      {cat && <span style={{ fontSize:10, padding:'1px 6px', background:cat.color+'18', color:cat.color, borderRadius:4, fontWeight:700 }}>{cat.name}</span>}
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:'#374151' }}>{emp?.name||'—'}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:'#374151', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.memberName||'—'}</td>
                    <td style={{ padding:'11px 14px' }}><StatusBadge status={c.status}/></td>
                    <td style={{ padding:'11px 14px' }}><PriorityBadge priority={c.priority}/></td>
                    <td style={{ padding:'11px 14px', fontSize:12 }}>{au?.name||<span style={{ color:'#d1d5db', fontStyle:'italic' }}>Unassigned</span>}</td>
                    <td style={{ padding:'11px 14px' }}><SLAChip slaDate={c.slaDate} status={c.status}/></td>
                    <td style={{ padding:'11px 14px' }}><Icon name="chevron_r" size={15} color={T.border}/></td>
                  </tr>
                )
              })}
              {visible.length===0 && <tr><td colSpan={9} style={{ padding:48, textAlign:'center', color:T.gray, fontSize:13 }}>No cases match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {showNew && (
        <NewCaseModal
          caseTypes={visibleCaseTypes} categories={categories}
          employers={employers} users={users}
          currentUser={currentUser} workspace={workspace}
          onClose={()=>setShowNew(false)}
          onSubmit={form=>{ onAddCase(form); setShowNew(false) }}
        />
      )}
    </div>
  )
}

// ─── NEW CASE MODAL — 3-step wizard ──────────────────────────────────────────
function NewCaseModal({ caseTypes, categories, employers, users, currentUser, workspace, onClose, onSubmit }) {
  const isEmployer = ['employer_admin','employer_user'].includes(currentUser.role)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    categoryId:'', caseTypeId:'',
    employerId: isEmployer ? currentUser.employer : '',
    priority:'Medium', memberName:'', memberId:'', description:'',
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const activeCats = [...new Set(caseTypes.filter(ct=>ct.active).map(ct=>ct.categoryId))]
  const visibleCategories = categories.filter(c=>activeCats.includes(c.id))
  const availableTypes = caseTypes.filter(ct=>ct.categoryId===form.categoryId && ct.active)
  const selectedCT = caseTypes.find(ct=>ct.id===form.caseTypeId)

  function submit() {
    if (!form.caseTypeId||!form.employerId||!form.description.trim()) { alert('Please complete all required fields.'); return }
    // Auto-allocate
    const assignedTo = allocateCase(selectedCT, users, { general:{ members:['u2','u3','u6'] }, billing:{ members:['u5','u7'] } }, {})
    onSubmit({
      id:'c'+Date.now(), ref:genRef(workspace==='internal'?'AEB-INT':'AEB'),
      workspace, caseTypeId:form.caseTypeId, employerId:form.employerId,
      status:'Submitted', priority:form.priority,
      assignedTo, createdBy:currentUser.id,
      memberName:form.memberName||null, memberId:form.memberId||null,
      currentStage:0, stageHistory:[],
      created:new Date().toISOString().split('T')[0],
      slaDate: selectedCT ? calcSlaDate(selectedCT) : new Date(Date.now()+5*86400000).toISOString().split('T')[0],
      description:form.description, billingTaskId:null,
      notes:[], documents:[],
      audit:[
        { time:new Date().toISOString(), user:currentUser.id, action:'Case created', type:'create' },
        ...(assignedTo ? [{ time:new Date().toISOString(), user:'system', action:`Auto-assigned to ${users.find(u=>u.id===assignedTo)?.name||assignedTo}`, type:'assign' }] : []),
      ],
      escalated:false, ownerHistory: assignedTo ? [{ user:assignedTo, from:new Date().toISOString().split('T')[0] }] : [],
    })
  }

  const stepLabel = ['Select Category','Select Case Type','Case Details']
  return (
    <Modal title="New Case" onClose={onClose}>
      {/* Step indicator */}
      <div style={{ display:'flex', alignItems:'center', marginBottom:22 }}>
        {stepLabel.map((lbl,i)=>(
          <div key={lbl} style={{ display:'flex', alignItems:'center', flex:i<2?1:'auto' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:step>i+1?T.green:step===i+1?T.orange:'#e5e7eb', color:step>=i+1?'#fff':T.gray, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, transition:'all .2s' }}>
                {step>i+1?'✓':i+1}
              </div>
              <div style={{ fontSize:10, color:step===i+1?T.orange:T.gray, fontWeight:step===i+1?700:400, marginTop:3, whiteSpace:'nowrap' }}>{lbl}</div>
            </div>
            {i<2 && <div style={{ flex:1, height:2, background:step>i+1?T.green:'#e5e7eb', margin:'0 6px 14px', transition:'background .2s' }}/>}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step===1 && (
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:12 }}>Select a category</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {visibleCategories.map(cat=>{
              const count = availableTypes.filter(ct=>ct.categoryId===cat.id).length||caseTypes.filter(ct=>ct.categoryId===cat.id&&ct.active).length
              return (
                <button key={cat.id} onClick={()=>{ set('categoryId',cat.id); set('caseTypeId',''); setStep(2) }}
                  style={{ padding:'13px 12px', borderRadius:9, border:`2px solid ${form.categoryId===cat.id?cat.color:T.border}`, background:form.categoryId===cat.id?cat.color+'10':'#fff', textAlign:'left', cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:cat.color }}/>
                    <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{cat.name}</span>
                  </div>
                  <div style={{ fontSize:11, color:T.gray }}>{caseTypes.filter(ct=>ct.categoryId===cat.id&&ct.active).length} case type{caseTypes.filter(ct=>ct.categoryId===cat.id&&ct.active).length!==1?'s':''}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step===2 && (
        <div>
          <button onClick={()=>setStep(1)} style={{ fontSize:12, color:T.orange, background:'none', border:'none', cursor:'pointer', fontWeight:600, marginBottom:14, display:'flex', alignItems:'center', gap:4 }}>← Back</button>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {availableTypes.map(ct=>(
              <button key={ct.id} onClick={()=>{ set('caseTypeId',ct.id); setStep(3) }}
                style={{ padding:'12px 14px', borderRadius:9, border:`2px solid ${form.caseTypeId===ct.id?T.orange:T.border}`, background:form.caseTypeId===ct.id?T.orangeL:'#fff', textAlign:'left', cursor:'pointer' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{ct.name}</div>
                  <span style={{ fontSize:11, fontWeight:700, color:T.orange, background:T.orangeL, padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap', marginLeft:8 }}>{ct.slaLabel}</span>
                </div>
                <div style={{ fontSize:11, color:T.gray, marginTop:3 }}>{ct.stages.length} stages · {ct.responsibleTeam}</div>
                {ct.isBillingTrigger && <div style={{ fontSize:10, color:T.purple, marginTop:2, fontWeight:600 }}>↳ Triggers billing workflow on completion</div>}
              </button>
            ))}
            {availableTypes.length===0 && <div style={{ textAlign:'center', color:T.gray, fontSize:13, padding:24 }}>No active case types in this category.</div>}
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step===3 && (
        <div>
          <button onClick={()=>setStep(2)} style={{ fontSize:12, color:T.orange, background:'none', border:'none', cursor:'pointer', fontWeight:600, marginBottom:14 }}>← Back</button>
          {selectedCT && (
            <div style={{ background:'#f0f7ff', borderRadius:9, padding:'12px 14px', marginBottom:16, border:'1px solid #bfdbfe' }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.blue, marginBottom:6 }}>Workflow loaded: {selectedCT.name}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:6 }}>
                {[['SLA',selectedCT.slaLabel],['Stages',selectedCT.stages.length],['Team',selectedCT.responsibleTeam]].map(([k,v])=>(
                  <div key={k}><div style={{ fontSize:10, color:T.gray, fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>{k}</div><div style={{ fontSize:12, fontWeight:700 }}>{v}</div></div>
                ))}
              </div>
              {selectedCT.isBillingTrigger && <div style={{ fontSize:11, color:T.purple, fontWeight:600 }}>⚡ "Complete & Send to Billing" will be triggered on completion</div>}
            </div>
          )}
          {!isEmployer && (
            <Field label="Employer *">
              <select value={form.employerId} onChange={e=>set('employerId',e.target.value)} style={selectSt}>
                <option value="">Select employer</option>
                {employers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Priority">
            <div style={{ display:'flex', gap:7 }}>
              {['Low','Medium','High','Critical'].map(p=>(
                <button key={p} onClick={()=>set('priority',p)} style={{ flex:1, padding:'7px 4px', borderRadius:7, border:`1.5px solid ${form.priority===p?T.orange:T.border}`, background:form.priority===p?T.orange:'#fff', color:form.priority===p?'#fff':'#374151', fontSize:12, fontWeight:600, cursor:'pointer' }}>{p}</button>
              ))}
            </div>
          </Field>
          <Field label="Member Name"><input value={form.memberName} onChange={e=>set('memberName',e.target.value)} style={inputSt} placeholder="Optional"/></Field>
          <Field label="Member ID / Reference"><input value={form.memberId} onChange={e=>set('memberId',e.target.value)} style={inputSt} placeholder="Optional"/></Field>
          <Field label="Description *">
            <textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Describe the case..." style={{ ...inputSt, minHeight:80, resize:'vertical' }}/>
          </Field>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn onClick={submit}>Submit Case</Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}
