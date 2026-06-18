import { useState, useRef, useCallback } from 'react'
import {
  T, genRef, calcSlaDate, allocateCase,
  WORKFLOW_TEMPLATES, WORKFLOW_CATEGORIES, CASE_TYPES_BY_CATEGORY,
  CASE_STATUSES, PRIORITIES, STEP_STATUS_CONFIG,
  initWorkflow, workflowProgress, currentStep,
} from '../data.js'
import { Icon, StatusBadge, PriorityBadge, SLAChip, Card, Btn, Modal, Field, inputSt, selectSt, Empty } from '../ui.jsx'

// ─── DOCUMENT UPLOAD ZONE (unchanged from v15) ────────────────────────────────
const ACCEPTED_TYPES = {
  'application/pdf': { ext:'PDF', icon:'📄', color:'#dc2626' },
  'application/msword': { ext:'DOC', icon:'📝', color:'#1d4ed8' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext:'DOCX', icon:'📝', color:'#1d4ed8' },
  'application/vnd.ms-excel': { ext:'XLS', icon:'📊', color:'#059669' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext:'XLSX', icon:'📊', color:'#059669' },
  'image/jpeg': { ext:'JPG', icon:'🖼️', color:'#7c3aed' },
  'image/png':  { ext:'PNG', icon:'🖼️', color:'#7c3aed' },
}
const ACCEPT_STRING = Object.keys(ACCEPTED_TYPES).join(',')
function formatBytes(b) { return b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB' }

function UploadZone({ files, onAdd, onRemove }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState({})
  const inputRef = useRef()

  function processFiles(rawFiles) {
    Array.from(rawFiles).filter(f => ACCEPTED_TYPES[f.type]).forEach(file => {
      const id = 'f'+Date.now()+Math.random()
      setUploading(prev => ({...prev, [id]:0}))
      let prog = 0
      const iv = setInterval(() => {
        prog += Math.random()*30+10
        if (prog >= 100) {
          clearInterval(iv)
          setUploading(prev => { const n={...prev}; delete n[id]; return n })
          const reader = new FileReader()
          reader.onload = e => onAdd({ id, name:file.name, size:formatBytes(file.size), type:file.type, ext:ACCEPTED_TYPES[file.type]?.ext||'FILE', icon:ACCEPTED_TYPES[file.type]?.icon||'📎', color:ACCEPTED_TYPES[file.type]?.color||T.gray, uploadedAt:new Date().toISOString() })
          reader.readAsDataURL(file)
        } else setUploading(prev => ({...prev, [id]:Math.round(prog)}))
      }, 80)
    })
  }

  const onDrop = useCallback(e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files) }, [])

  return (
    <div>
      <div onDrop={onDrop} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={e=>{e.preventDefault();setDragging(false)}} onClick={()=>inputRef.current.click()}
        style={{ border:`2px dashed ${dragging?T.orange:'#d1d5db'}`, borderRadius:10, padding:'20px 16px', textAlign:'center', cursor:'pointer', background:dragging?T.orangeL:'#fafafa', transition:'all .15s' }}>
        <input ref={inputRef} type="file" multiple accept={ACCEPT_STRING} onChange={e=>{if(e.target.files.length)processFiles(e.target.files);e.target.value=''}} style={{display:'none'}}/>
        <div style={{ fontSize:28, marginBottom:6 }}>{dragging?'📂':'📎'}</div>
        <div style={{ fontSize:13, fontWeight:600, color:dragging?T.orange:T.text, marginBottom:3 }}>{dragging?'Release to attach':'Drag and drop files here'}</div>
        <div style={{ fontSize:11, color:T.gray }}>or click to browse · PDF, DOCX, XLSX, JPG, PNG</div>
      </div>
      {Object.keys(uploading).map(id=>(
        <div key={id} style={{ background:'#f0f7ff', borderRadius:8, padding:'8px 12px', marginTop:8, border:'1px solid #bfdbfe' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:12, color:T.blue, fontWeight:600 }}>Uploading…</span>
            <span style={{ fontSize:11, color:T.blue }}>{uploading[id]}%</span>
          </div>
          <div style={{ height:4, background:'#bfdbfe', borderRadius:2 }}>
            <div style={{ height:'100%', width:`${uploading[id]}%`, background:T.blue, borderRadius:2, transition:'width .08s' }}/>
          </div>
        </div>
      ))}
      {files.length > 0 && (
        <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
          {files.map(f=>(
            <div key={f.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 11px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:8 }}>
              <span style={{ fontSize:18, lineHeight:1 }}>{f.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                <div style={{ fontSize:11, color:T.gray }}><span style={{ fontWeight:700, color:f.color, background:f.color+'18', padding:'0px 5px', borderRadius:3 }}>{f.ext}</span> · {f.size}</div>
              </div>
              <button onClick={e=>{e.stopPropagation();onRemove(f.id)}} style={{ background:'none', border:'none', cursor:'pointer', color:T.gray, padding:4, borderRadius:4 }} onMouseEnter={e=>e.currentTarget.style.color=T.red} onMouseLeave={e=>e.currentTarget.style.color=T.gray}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
          ))}
          <div style={{ fontSize:11, color:T.gray, textAlign:'right' }}>{files.length} file{files.length!==1?'s':''} attached</div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN CASES PAGE ─────────────────────────────────────────────────────────
export default function CasesPage({ cases, caseTypes, categories, employers, users, currentUser, onOpenCase, onAddCase, onAddBillingTask, initialFilter, workspace='employer' }) {
  const isEmployer = ['employer_admin','employer_user'].includes(currentUser.role)
  const [search, setSearch]   = useState('')
  const [f, setF]             = useState({ status:'', priority:'', category:'', employer:'', ...initialFilter })
  const [showNew, setShowNew] = useState(false)
  const setFF = (k,v) => setF(x=>({...x,[k]:v}))
  const hasFilter = Object.values(f).some(Boolean)

  const visible = cases.filter(c => {
    if (c.workspace !== workspace) return false
    if (isEmployer && c.employerId !== currentUser.employer) return false
    if (search) {
      const q = search.toLowerCase()
      const emp = employers.find(x=>x.id===c.employerId)
      if (!c.ref.toLowerCase().includes(q) && !(c.caseTypeName||'').toLowerCase().includes(q) && !(emp?.name||'').toLowerCase().includes(q) && !(c.memberName||'').toLowerCase().includes(q)) return false
    }
    if (f.status   && c.status!==f.status) return false
    if (f.priority && c.priority!==f.priority) return false
    if (f.category && c.workflowCategory!==f.category) return false
    if (f.employer && c.employerId!==f.employer) return false
    return true
  })

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
          <div style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)' }}><Icon name="search" size={13} color={T.gray}/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ref, case type, employer, member…" style={{ padding:'6px 8px 6px 26px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, width:220 }}/>
        </div>
        {[
          ['status','Status',CASE_STATUSES],
          ['priority','Priority',PRIORITIES],
          ['category','Category',WORKFLOW_CATEGORIES],
          ...(!isEmployer?[['employer','Employer',employers.map(e=>[e.id,e.name])]]:[]),
        ].map(([key,lbl,opts])=>(
          <select key={key} value={f[key]} onChange={e=>setFF(key,e.target.value)} style={{ padding:'6px 8px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, background:f[key]?'#f0f7ff':'#fff', color:f[key]?T.blue:'#374151' }}>
            <option value="">All {lbl}</option>
            {opts.map(o=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o}>{o}</option>)}
          </select>
        ))}
        {hasFilter && <button onClick={()=>setF({status:'',priority:'',category:'',employer:''})} style={{ fontSize:11, color:T.red, background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>Clear</button>}
        <div style={{ marginLeft:'auto', fontSize:11, color:T.gray }}>{visible.length} case{visible.length!==1?'s':''}</div>
      </div>

      {/* Table */}
      <Card>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                {['Ref','Case Type','Employer','Member','Progress','Status','Priority','SLA',''].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(c=>{
                const emp  = employers.find(x=>x.id===c.employerId)
                const au   = users.find(u=>u.id===c.assignedTo)
                const wf   = c.workflow
                const prog = wf ? workflowProgress(wf) : null
                const cur  = wf ? currentStep(wf) : null
                return (
                  <tr key={c.id} onClick={()=>onOpenCase(c)} style={{ cursor:'pointer', borderBottom:'1px solid #f3f4f6', transition:'background .1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <td style={{ padding:'11px 14px', fontFamily:'monospace', fontSize:11, color:T.gray, fontWeight:700, whiteSpace:'nowrap' }}>
                      {c.ref}
                      {c.escalated && <span style={{ marginLeft:4, color:T.red }}>⚠</span>}
                      {c.billingTaskId && <span style={{ marginLeft:4, color:T.purple }}>₿</span>}
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{c.caseTypeName||'—'}</div>
                      {c.workflowCategory && <span style={{ fontSize:10, padding:'1px 6px', background:'#f3f4f6', color:T.gray, borderRadius:4 }}>{c.workflowCategory}</span>}
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:12 }}>{emp?.name||'—'}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.memberName||'—'}</td>
                    <td style={{ padding:'11px 14px', minWidth:120 }}>
                      {prog !== null ? (
                        <div>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:T.gray, marginBottom:3 }}>
                            <span>{cur?.name||'Complete'}</span>
                            <span style={{ fontWeight:700, color:prog===100?T.green:T.orange }}>{prog}%</span>
                          </div>
                          <div style={{ height:4, background:'#f3f4f6', borderRadius:2, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${prog}%`, background:prog===100?T.green:T.orange, borderRadius:2 }}/>
                          </div>
                        </div>
                      ) : <span style={{ fontSize:11, color:'#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding:'11px 14px' }}><StatusBadge status={c.status}/></td>
                    <td style={{ padding:'11px 14px' }}><PriorityBadge priority={c.priority}/></td>
                    <td style={{ padding:'11px 14px' }}><SLAChip slaDate={c.slaDate} status={c.status}/></td>
                    <td style={{ padding:'11px 14px' }}><Icon name="chevron_r" size={15} color={T.border}/></td>
                  </tr>
                )
              })}
              {visible.length===0 && <tr><td colSpan={9} style={{ padding:48, textAlign:'center', color:T.gray }}>No cases match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {showNew && (
        <NewCaseModal
          employers={employers} users={users}
          currentUser={currentUser} workspace={workspace}
          onClose={()=>setShowNew(false)}
          onSubmit={c=>{ onAddCase(c); setShowNew(false) }}
          onAddBillingTask={onAddBillingTask}
        />
      )}
    </div>
  )
}

// ─── NEW CASE MODAL — 3 steps ─────────────────────────────────────────────────
function NewCaseModal({ employers, users, currentUser, workspace, onClose, onSubmit, onAddBillingTask }) {
  const isEmployer = ['employer_admin','employer_user'].includes(currentUser.role)
  const [step, setStep]           = useState(1)  // 1=category, 2=case type, 3=details
  const [selectedCategory, setCat] = useState('')
  const [selectedType, setType]    = useState('')   // template key
  const [attachedFiles, setFiles]  = useState([])
  const [form, setForm] = useState({
    employerId: isEmployer ? currentUser.employer : '',
    priority: 'Medium', memberName:'', memberId:'', description:'',
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const template     = selectedType ? WORKFLOW_TEMPLATES[selectedType] : null
  const categoryList = WORKFLOW_CATEGORIES
  const typesInCat   = selectedCategory ? (CASE_TYPES_BY_CATEGORY[selectedCategory] || []) : []

  function handleSubmit() {
    if (!selectedType || !form.employerId || !form.description.trim()) {
      alert('Please complete all required fields.'); return
    }
    const now   = new Date().toISOString()
    const today = now.split('T')[0]
    // Allocate using pool logic
    const generalPool = users.filter(u => ['administrator','general_manager'].includes(u.role) && u.status==='active')
    const assignedTo  = generalPool[Math.floor(Math.random()*generalPool.length)]?.id || ''
    const assignedUser = users.find(u=>u.id===assignedTo)
    const caseRef = genRef('AEB')
    const wf = initWorkflow(selectedType)

    const documents = attachedFiles.map(f=>({ name:f.name, size:f.size, type:f.type, uploadedBy:currentUser.id, date:today }))

    const audit = [
      { time:now, user:currentUser.id, action:`Case ${caseRef} created — ${selectedType}`, type:'create' },
      ...(assignedTo?[{ time:now, user:'system', action:`Auto-assigned to ${assignedUser?.name}`, type:'assign' }]:[]),
      { time:now, user:'system', action:`Workflow started: ${selectedType}`, type:'workflow' },
      ...documents.map(d=>({ time:now, user:currentUser.id, action:`Document uploaded: ${d.name}`, type:'upload' })),
    ]

    onSubmit({
      id:'c'+Date.now(), ref:caseRef, workspace,
      caseTypeName: selectedType,
      workflowCategory: template?.category || '',
      employerId: form.employerId,
      status:'Submitted', priority:form.priority,
      assignedTo, createdBy:currentUser.id,
      memberName: form.memberName||null,
      memberId:   form.memberId||null,
      currentStage:0, stageHistory:[],
      created:today,
      slaDate: new Date(Date.now()+5*86400000).toISOString().split('T')[0],
      description: form.description,
      billingTaskId:null,
      workflow: wf,
      notes:[], documents, audit,
      escalated:false,
      ownerHistory: assignedTo?[{user:assignedTo,from:today}]:[],
    })
  }

  const stepLabels = ['Select Category','Select Case Type','Case Details']

  return (
    <Modal title="New Case" onClose={onClose} wide>
      {/* Step indicator */}
      <div style={{ display:'flex', alignItems:'center', marginBottom:20 }}>
        {stepLabels.map((lbl,i)=>(
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

      {/* ── Step 1: Category ── */}
      {step===1 && (
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:12 }}>Select a category</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {categoryList.map(cat => {
              const count = CASE_TYPES_BY_CATEGORY[cat]?.length || 0
              const catColors = { 'Claims':'#dc2626', 'New Business':'#1e5fd9', 'Exits':'#d97706', 'Fund Administration':'#059669', 'Medical & Queries':'#7c3aed' }
              const clr = catColors[cat] || T.orange
              return (
                <button key={cat} onClick={()=>{ setCat(cat); setType(''); setStep(2) }}
                  style={{ padding:'13px 12px', borderRadius:9, border:`2px solid ${selectedCategory===cat?clr:T.border}`, background:selectedCategory===cat?clr+'10':'#fff', textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:clr }}/>
                    <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{cat}</span>
                  </div>
                  <div style={{ fontSize:11, color:T.gray }}>{count} case type{count!==1?'s':''}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Step 2: Case Type ── */}
      {step===2 && (
        <div>
          <button onClick={()=>setStep(1)} style={{ fontSize:12, color:T.orange, background:'none', border:'none', cursor:'pointer', fontWeight:600, marginBottom:14, fontFamily:'inherit' }}>← Back</button>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {typesInCat.map(tmpl => (
              <button key={tmpl.name} onClick={()=>{ setType(tmpl.name); setStep(3) }}
                style={{ padding:'12px 14px', borderRadius:9, border:`2px solid ${selectedType===tmpl.name?T.orange:T.border}`, background:selectedType===tmpl.name?T.orangeL:'#fff', textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}>

                {/* Case type name + billing badge */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{tmpl.name}</span>
                  <div style={{ display:'flex', gap:5, flexShrink:0, marginLeft:8 }}>
                    {tmpl.billingTrigger && <span style={{ fontSize:9, fontWeight:700, color:T.purple, background:'#f5f3ff', padding:'2px 7px', borderRadius:10 }}>₿ BILLING</span>}
                    <span style={{ fontSize:9, fontWeight:700, color:T.orange, background:T.orangeL, padding:'2px 7px', borderRadius:10 }}>{tmpl.steps.length} STEPS</span>
                  </div>
                </div>

                {/* Workflow steps as pills */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {tmpl.steps.map((s,i)=>(
                    <span key={s.id} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, color:T.gray, background:'#f3f4f6', padding:'3px 9px', borderRadius:20 }}>
                      <span style={{ fontWeight:700, color:'#9ca3af', fontSize:9 }}>{i+1}</span>
                      {s.name}
                      {s.requiredDocs?.length>0 && <span title="Documents required" style={{ color:T.blue }}>📎</span>}
                      {s.autoAction && <span title="Auto-action on completion" style={{ color:T.purple }}>⚡</span>}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 3: Details + Upload ── */}
      {step===3 && (
        <div>
          <button onClick={()=>setStep(2)} style={{ fontSize:12, color:T.orange, background:'none', border:'none', cursor:'pointer', fontWeight:600, marginBottom:14, fontFamily:'inherit' }}>← Back</button>

          {/* Workflow preview card */}
          {template && (
            <div style={{ background:'#f0f7ff', borderRadius:10, padding:'14px 16px', marginBottom:16, border:'1px solid #bfdbfe' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.blue }}>{template.name}</div>
                  <div style={{ fontSize:11, color:T.gray }}>{template.category}</div>
                </div>
                {template.billingTrigger && (
                  <span style={{ fontSize:10, fontWeight:700, color:T.purple, background:'#f5f3ff', padding:'3px 9px', borderRadius:10 }}>⚡ Triggers Billing on Completion</span>
                )}
              </div>

              {/* Numbered workflow checklist */}
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {template.steps.map((s,i)=>(
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                    <span style={{ width:18, height:18, borderRadius:'50%', background:'#dbeafe', color:T.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{i+1}</span>
                    <span style={{ color:'#374151' }}>{s.name}</span>
                    {s.slaDays && <span style={{ fontSize:10, color:T.gray, marginLeft:'auto' }}>{s.slaDays}d</span>}
                    {s.requiredDocs?.length>0 && <span style={{ fontSize:10, color:T.blue }}>📎 {s.requiredDocs.length}</span>}
                    {s.autoAction && <span style={{ fontSize:10, color:T.purple }}>⚡</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two column: fields left, upload right */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              {!isEmployer && (
                <Field label="Employer *">
                  <select value={form.employerId} onChange={e=>set('employerId',e.target.value)} style={selectSt}>
                    <option value="">Select employer</option>
                    {employers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Priority">
                <div style={{ display:'flex', gap:6 }}>
                  {['Low','Medium','High','Critical'].map(p=>(
                    <button key={p} onClick={()=>set('priority',p)} style={{ flex:1, padding:'7px 2px', borderRadius:7, border:`1.5px solid ${form.priority===p?T.orange:T.border}`, background:form.priority===p?T.orange:'#fff', color:form.priority===p?'#fff':'#374151', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>{p}</button>
                  ))}
                </div>
              </Field>
              <Field label="Member Name"><input value={form.memberName} onChange={e=>set('memberName',e.target.value)} style={inputSt} placeholder="Optional"/></Field>
              <Field label="Member ID / Reference"><input value={form.memberId} onChange={e=>set('memberId',e.target.value)} style={inputSt} placeholder="Optional"/></Field>
              <Field label="Description *">
                <textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Describe the case…" style={{ ...inputSt, minHeight:100, resize:'vertical' }}/>
              </Field>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>
                Supporting Documents <span style={{ fontSize:11, fontWeight:400, color:T.gray }}>Optional</span>
              </label>
              <div style={{ fontSize:11, color:T.gray, marginBottom:8 }}>
                Upload now — attached to the case on submission, visible to the assigned administrator.
              </div>
              <UploadZone files={attachedFiles} onAdd={f=>setFiles(p=>[...p,f])} onRemove={id=>setFiles(p=>p.filter(f=>f.id!==id))}/>

              {/* Required docs hint */}
              {template && (() => {
                const allRequired = [...new Set(template.steps.flatMap(s=>s.requiredDocs||[]))]
                return allRequired.length > 0 ? (
                  <div style={{ marginTop:10, padding:'10px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#92400e', marginBottom:5 }}>Documents needed for this workflow:</div>
                    {allRequired.map(doc=>{
                      const attached = attachedFiles.some(f=>f.name.toLowerCase().includes(doc.toLowerCase().split(' ')[0]))
                      return (
                        <div key={doc} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                          <span style={{ color:attached?T.green:'#d1d5db', fontSize:13 }}>{attached?'✓':'○'}</span>
                          <span style={{ fontSize:12, color:attached?T.green:'#92400e', textDecoration:attached?'line-through':'none' }}>{doc}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : null
              })()}
            </div>
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn onClick={handleSubmit}>
              Submit Case{attachedFiles.length>0?` with ${attachedFiles.length} document${attachedFiles.length!==1?'s':''}` : ''}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}
