import { useState, useEffect, useRef, useCallback } from 'react'
import { T, CASE_STATUSES, PRIORITIES, calcSlaDate, allocateCase, BILLING_TRIGGER_CASE_TYPES, genRef, initWorkflow } from '../data.js'
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

// ─── FILE TYPE HELPERS ────────────────────────────────────────────────────────
const ACCEPTED_TYPES = {
  'application/pdf':                                                  { ext:'PDF',  icon:'📄', color:'#dc2626' },
  'application/msword':                                               { ext:'DOC',  icon:'📝', color:'#1d4ed8' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext:'DOCX', icon:'📝', color:'#1d4ed8' },
  'application/vnd.ms-excel':                                         { ext:'XLS',  icon:'📊', color:'#059669' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':{ ext:'XLSX', icon:'📊', color:'#059669' },
  'image/jpeg':                                                        { ext:'JPG',  icon:'🖼️', color:'#7c3aed' },
  'image/png':                                                         { ext:'PNG',  icon:'🖼️', color:'#7c3aed' },
}
const ACCEPT_STRING = Object.keys(ACCEPTED_TYPES).join(',')

function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB'
  return (b/1048576).toFixed(1) + ' MB'
}

// ─── DOCUMENT UPLOAD ZONE ─────────────────────────────────────────────────────
function UploadZone({ files, onAdd, onRemove }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState({})   // id → progress 0–100
  const inputRef = useRef()

  function processFiles(rawFiles) {
    const valid = Array.from(rawFiles).filter(f => ACCEPTED_TYPES[f.type])
    const invalid = Array.from(rawFiles).filter(f => !ACCEPTED_TYPES[f.type])
    if (invalid.length) {
      alert(`${invalid.length} file(s) skipped — only PDF, Word, Excel, JPG and PNG are supported.`)
    }
    valid.forEach(file => {
      const id = 'f' + Date.now() + Math.random()
      // Simulate upload progress (in production this would be a real XHR)
      setUploading(prev => ({ ...prev, [id]: 0 }))
      let prog = 0
      const iv = setInterval(() => {
        prog += Math.random() * 30 + 10
        if (prog >= 100) {
          prog = 100
          clearInterval(iv)
          setUploading(prev => { const n = {...prev}; delete n[id]; return n })
          // Read as base64 for preview / real upload
          const reader = new FileReader()
          reader.onload = e => {
            onAdd({
              id,
              name: file.name,
              size: formatBytes(file.size),
              type: file.type,
              ext:  ACCEPTED_TYPES[file.type]?.ext || 'FILE',
              icon: ACCEPTED_TYPES[file.type]?.icon || '📎',
              color:ACCEPTED_TYPES[file.type]?.color || T.gray,
              dataUrl: e.target.result,   // available for preview
              uploadedAt: new Date().toISOString(),
            })
          }
          reader.readAsDataURL(file)
        } else {
          setUploading(prev => ({ ...prev, [id]: Math.round(prog) }))
        }
      }, 80)
    })
  }

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    processFiles(e.dataTransfer.files)
  }, [])

  const onDragOver  = e => { e.preventDefault(); setDragging(true) }
  const onDragLeave = e => { e.preventDefault(); setDragging(false) }
  const onPick      = e => { if (e.target.files.length) processFiles(e.target.files); e.target.value = '' }

  const pendingIds = Object.keys(uploading)

  return (
    <div>
      {/* Drop zone */}
      <div
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? T.orange : '#d1d5db'}`,
          borderRadius: 10,
          padding: '22px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? T.orangeL : '#fafafa',
          transition: 'all .15s',
        }}
      >
        <input
          ref={inputRef} type="file" multiple accept={ACCEPT_STRING}
          onChange={onPick}
          style={{ display:'none' }}
        />
        <div style={{ fontSize: 28, marginBottom: 8, lineHeight: 1 }}>
          {dragging ? '📂' : '📎'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: dragging ? T.orange : T.text, marginBottom: 4 }}>
          {dragging ? 'Release to attach files' : 'Drag and drop files here'}
        </div>
        <div style={{ fontSize: 11, color: T.gray, marginBottom: 10 }}>
          or click to browse
        </div>
        <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['PDF','DOCX','XLSX','JPG','PNG'].map(ext => (
            <span key={ext} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', background: '#f3f4f6', borderRadius: 4, color: T.gray, letterSpacing: '0.3px' }}>{ext}</span>
          ))}
        </div>
      </div>

      {/* Upload progress indicators */}
      {pendingIds.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pendingIds.map(id => (
            <div key={id} style={{ background: '#f0f7ff', borderRadius: 8, padding: '8px 12px', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: T.blue, fontWeight: 600 }}>Uploading…</span>
                <span style={{ fontSize: 11, color: T.blue }}>{uploading[id]}%</span>
              </div>
              <div style={{ height: 4, background: '#bfdbfe', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${uploading[id]}%`, background: T.blue, borderRadius: 2, transition: 'width .08s linear' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attached files list */}
      {files.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8 }}>
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{f.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: T.gray, display: 'flex', gap: 8, marginTop: 1 }}>
                  <span style={{ fontWeight: 700, color: f.color, background: f.color + '18', padding: '0px 5px', borderRadius: 3 }}>{f.ext}</span>
                  <span>{f.size}</span>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onRemove(f.id) }}
                title="Remove file"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.gray, padding: 4, borderRadius: 4, display: 'flex', flexShrink: 0, transition: 'color .12s' }}
                onMouseEnter={e => e.currentTarget.style.color = T.red}
                onMouseLeave={e => e.currentTarget.style.color = T.gray}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: T.gray, textAlign: 'right' }}>
          {files.length} file{files.length !== 1 ? 's' : ''} attached · will be uploaded on submission
        </div>
      )}
    </div>
  )
}

// ─── NEW CASE MODAL — 3-step wizard ──────────────────────────────────────────
function NewCaseModal({ caseTypes, categories, employers, users, currentUser, workspace, onClose, onSubmit }) {
  const isEmployer = ['employer_admin','employer_user'].includes(currentUser.role)
  const [step, setStep]     = useState(1)
  const [attachedFiles, setAttachedFiles] = useState([])  // files staged for submission
  const [form, setForm]     = useState({
    categoryId:'', caseTypeId:'',
    employerId: isEmployer ? currentUser.employer : '',
    priority:'Medium', memberName:'', memberId:'', description:'',
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const activeCats         = [...new Set(caseTypes.filter(ct=>ct.active).map(ct=>ct.categoryId))]
  const visibleCategories  = categories.filter(c=>activeCats.includes(c.id))
  const availableTypes     = caseTypes.filter(ct=>ct.categoryId===form.categoryId && ct.active)
  const selectedCT         = caseTypes.find(ct=>ct.id===form.caseTypeId)

  function addFile(f)      { setAttachedFiles(prev => [...prev, f]) }
  function removeFile(id)  { setAttachedFiles(prev => prev.filter(f => f.id !== id)) }

  function submit() {
    if (!form.caseTypeId || !form.employerId || !form.description.trim()) {
      alert('Please complete all required fields.'); return
    }
    const assignedTo = allocateCase(selectedCT, users, { general:{ members:['u2','u3','u6'] }, billing:{ members:['u5','u7'] } }, {})
    const now        = new Date().toISOString()
    const today      = now.split('T')[0]

    // Build documents array from staged files
    const documents = attachedFiles.map(f => ({
      name:       f.name,
      size:       f.size,
      type:       f.type,
      uploadedBy: currentUser.id,
      date:       today,
    }))

    // Audit entries: case created + assignment + one entry per document
    const audit = [
      { time:now, user:currentUser.id, action:'Case created', type:'create' },
      ...(assignedTo ? [{ time:now, user:'system', action:`Auto-assigned to ${users.find(u=>u.id===assignedTo)?.name||assignedTo}`, type:'assign' }] : []),
      ...documents.map(d => ({ time:now, user:currentUser.id, action:`Document uploaded: ${d.name}`, type:'upload' })),
    ]

    onSubmit({
      id:'c'+Date.now(),
      ref: genRef(workspace==='internal' ? 'AEB-INT' : 'AEB'),
      workspace,
      caseTypeId:  form.caseTypeId,
      employerId:  form.employerId,
      status:      'Submitted',
      priority:    form.priority,
      assignedTo,
      createdBy:   currentUser.id,
      memberName:  form.memberName || null,
      memberId:    form.memberId   || null,
      currentStage: 0,
      stageHistory: [],
      created:     today,
      slaDate:     selectedCT ? calcSlaDate(selectedCT) : new Date(Date.now()+5*86400000).toISOString().split('T')[0],
      description: form.description,
      billingTaskId: null,
      workflow:      initWorkflow(form.caseTypeId),
      notes:       [],
      documents,
      audit,
      escalated:   false,
      ownerHistory: assignedTo ? [{ user:assignedTo, from:today }] : [],
    })
  }

  const stepLabel = ['Select Category', 'Select Case Type', 'Case Details']

  return (
    <Modal title="New Case" onClose={onClose} wide>
      {/* Step indicator */}
      <div style={{ display:'flex', alignItems:'center', marginBottom:22 }}>
        {stepLabel.map((lbl,i) => (
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
            {visibleCategories.map(cat => (
              <button key={cat.id}
                onClick={() => { set('categoryId',cat.id); set('caseTypeId',''); setStep(2) }}
                style={{ padding:'13px 12px', borderRadius:9, border:`2px solid ${form.categoryId===cat.id?cat.color:T.border}`, background:form.categoryId===cat.id?cat.color+'10':'#fff', textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:cat.color }}/>
                  <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{cat.name}</span>
                </div>
                <div style={{ fontSize:11, color:T.gray }}>
                  {caseTypes.filter(ct=>ct.categoryId===cat.id&&ct.active).length} case type{caseTypes.filter(ct=>ct.categoryId===cat.id&&ct.active).length!==1?'s':''}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Case Type ── */}
      {step===2 && (
        <div>
          <button onClick={()=>setStep(1)} style={{ fontSize:12, color:T.orange, background:'none', border:'none', cursor:'pointer', fontWeight:600, marginBottom:14, display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
            ← Back
          </button>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {availableTypes.map(ct => (
              <button key={ct.id}
                onClick={() => { set('caseTypeId',ct.id); setStep(3) }}
                style={{ padding:'12px 14px', borderRadius:9, border:`2px solid ${form.caseTypeId===ct.id?T.orange:T.border}`, background:form.caseTypeId===ct.id?T.orangeL:'#fff', textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}>
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

      {/* ── Step 3: Case Details + Document Upload ── */}
      {step===3 && (
        <div>
          <button onClick={()=>setStep(2)} style={{ fontSize:12, color:T.orange, background:'none', border:'none', cursor:'pointer', fontWeight:600, marginBottom:14, fontFamily:'inherit' }}>
            ← Back
          </button>

          {/* Workflow summary banner */}
          {selectedCT && (
            <div style={{ background:'#f0f7ff', borderRadius:9, padding:'12px 14px', marginBottom:16, border:'1px solid #bfdbfe' }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.blue, marginBottom:6 }}>Workflow: {selectedCT.name}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:selectedCT.isBillingTrigger?6:0 }}>
                {[['SLA',selectedCT.slaLabel],['Stages',selectedCT.stages.length],['Team',selectedCT.responsibleTeam]].map(([k,v])=>(
                  <div key={k}>
                    <div style={{ fontSize:10, color:T.gray, fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>{k}</div>
                    <div style={{ fontSize:12, fontWeight:700 }}>{v}</div>
                  </div>
                ))}
              </div>
              {selectedCT.isBillingTrigger && <div style={{ fontSize:11, color:T.purple, fontWeight:600 }}>⚡ "Complete & Send to Billing" triggered on completion</div>}
            </div>
          )}

          {/* Two-column layout on wider modal */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Left column: case fields */}
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
                    <button key={p}
                      onClick={()=>set('priority',p)}
                      style={{ flex:1, padding:'7px 2px', borderRadius:7, border:`1.5px solid ${form.priority===p?T.orange:T.border}`, background:form.priority===p?T.orange:'#fff', color:form.priority===p?'#fff':'#374151', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Member Name">
                <input value={form.memberName} onChange={e=>set('memberName',e.target.value)} style={inputSt} placeholder="Optional"/>
              </Field>

              <Field label="Member ID / Reference">
                <input value={form.memberId} onChange={e=>set('memberId',e.target.value)} style={inputSt} placeholder="Optional"/>
              </Field>

              <Field label="Description *">
                <textarea
                  value={form.description}
                  onChange={e=>set('description',e.target.value)}
                  placeholder="Describe the case in detail..."
                  style={{ ...inputSt, minHeight:120, resize:'vertical' }}
                />
              </Field>
            </div>

            {/* Right column: document upload */}
            <div>
              <div style={{ marginBottom:6 }}>
                <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>
                  Supporting Documents
                  <span style={{ fontSize:11, fontWeight:400, color:T.gray, marginLeft:6 }}>Optional</span>
                </label>
                <div style={{ fontSize:11, color:T.gray, marginBottom:8, lineHeight:1.5 }}>
                  Upload supporting documents now. They will be attached to the case on submission and visible to the assigned administrator.
                </div>
              </div>

              <UploadZone files={attachedFiles} onAdd={addFile} onRemove={removeFile}/>

              {/* Required docs hint from case type */}
              {selectedCT?.requiredDocs?.length > 0 && (
                <div style={{ marginTop:12, padding:'10px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#92400e', marginBottom:5 }}>Required for this case type:</div>
                  {selectedCT.requiredDocs.map(doc => {
                    const attached = attachedFiles.some(f => f.name.toLowerCase().includes(doc.toLowerCase().split(' ')[0].toLowerCase()))
                    return (
                      <div key={doc} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                        <span style={{ color:attached?T.green:'#d1d5db', fontSize:13 }}>{attached?'✓':'○'}</span>
                        <span style={{ fontSize:12, color:attached?T.green:'#92400e', textDecoration:attached?'line-through':'none' }}>{doc}</span>
                        {!attached && <span style={{ fontSize:10, color:T.amber, fontWeight:700 }}>OUTSTANDING</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Submit row */}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
            <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
            <Btn onClick={submit}>
              Submit Case{attachedFiles.length > 0 ? ` with ${attachedFiles.length} document${attachedFiles.length!==1?'s':''}` : ''}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}
