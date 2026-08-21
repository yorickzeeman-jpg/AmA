import { useState, useRef, useCallback, useEffect } from 'react'
import {
  T, genRef, calcSlaDate, allocateCase, addBusinessDays, slaStatus, ROUND_ROBIN_MEMBER_IDS,
  WORKFLOW_TEMPLATES, WORKFLOW_CATEGORIES, CASE_TYPES_BY_CATEGORY,
  CASE_STATUSES, PRIORITIES, STEP_STATUS_CONFIG,
  initWorkflow, workflowProgress, currentStep,
} from '../data.js'
import { Icon, StatusBadge, PriorityBadge, SLAChip, Card, Btn, Modal, Field, inputSt, selectSt, Empty } from '../ui.jsx'
import { CASE_CONFIG, CASE_TYPE_LIST, categoriesForType, findConfig, slaDueDate } from '../caseConfig.js'
import { fetchFuneralEmployers } from '../supabase.js'

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
  const [f, setF]             = useState({ status:'', priority:'', category:'', employer:'', assignee:'', overdue:false, ...initialFilter })
  const [showNew, setShowNew] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const setFF = (k,v) => setF(x=>({...x,[k]:v}))
  const hasFilter = f.status||f.priority||f.category||f.employer||f.assignee||f.overdue

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
    if (f.assignee && c.assignedTo!==f.assignee) return false
    if (f.overdue  && !(slaStatus(c.slaDate, c.status)==='overdue')) return false
    return true
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>
          {workspace==='internal' ? 'Internal Cases' : isEmployer ? 'My Cases' : 'Employer Cases'}
        </h1>
        <Btn onClick={()=>setShowNew(true)}><Icon name="plus" size={15} color="#fff"/> New Case</Btn>
        {!isEmployer && (
          <button onClick={()=>setShowBulk(true)}
            style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:9, border:`1px solid ${T.border}`, background:'#fff', color:T.text, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginLeft:8 }}>
            ⇪ Bulk Member Review
          </button>
        )}
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
        {hasFilter && <button onClick={()=>setF({status:'',priority:'',category:'',employer:'',assignee:'',overdue:false})} style={{ fontSize:11, color:T.red, background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>Clear</button>}
        {f.overdue && <span style={{ fontSize:11, fontWeight:700, color:T.red, background:'#fff1f2', border:'1px solid #fecaca', borderRadius:14, padding:'3px 10px' }}>⚠ Overdue only</span>}
        {f.assignee && <span style={{ fontSize:11, fontWeight:700, color:T.blue, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:14, padding:'3px 10px' }}>👤 {users.find(u=>u.id===f.assignee)?.name || 'Assignee'}</span>}
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

      {showBulk && (
        <BulkMemberReviewModal
          employers={employers} users={users} cases={cases} currentUser={currentUser}
          onClose={()=>setShowBulk(false)}
          onSubmitAll={list=>{ list.forEach(onAddCase); setShowBulk(false) }}
        />
      )}
      {showNew && (
        <NewCaseModal
          employers={employers} users={users} cases={cases}
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
function NewCaseModal({ employers, users, currentUser, workspace, cases=[], onClose, onSubmit, onAddBillingTask }) {
  const isEmployer = ['employer_admin','employer_user'].includes(currentUser.role)
  const [step, setStep]           = useState(1)  // 1=category, 2=case type, 3=details
  const [selectedCategory, setCat] = useState('')
  const [selectedType, setType]    = useState('')   // template key
  const [cfgType, setCfgType]      = useState('')   // master Case Type (Excel)
  const [cfgCategory, setCfgCat]   = useState('')   // master Case Category (Excel)
  // Participating employers (AMCU scheme) — available on ANY case type, not just claims
  const [schemeEmployers, setSchemeEmployers] = useState([])
  const [peName, setPeName]        = useState('')
  const [peBranch, setPeBranch]    = useState('')
  useEffect(() => { fetchFuneralEmployers().then(setSchemeEmployers) }, [])
  const peNames = [...new Set(schemeEmployers.map(r => r.name))].sort()
  const peBranches = [...new Set(schemeEmployers.filter(r => r.name === peName && r.branch).map(r => r.branch))].sort()
  const [attachedFiles, setFiles]  = useState([])
  const [form, setForm] = useState({
    employerId: isEmployer ? currentUser.employer : '',
    priority: 'Medium', memberName:'', memberId:'', memberPhone:'', memberEmail:'', description:'', extraFields:{},
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const template     = selectedType ? WORKFLOW_TEMPLATES[selectedType] : null
  // Master configuration (source of truth: 1_CASE TYPES AND CATEGORIES.xlsx)
  const masterCfg    = (cfgType && cfgCategory) ? findConfig(cfgType, cfgCategory) : null
  const effSlaDays   = masterCfg ? masterCfg.slaDays : (template?.slaDays || 5)
  const categoryList = WORKFLOW_CATEGORIES
  const typesInCat   = selectedCategory ? (CASE_TYPES_BY_CATEGORY[selectedCategory] || []) : []

  function handleSubmit() {
    if (!selectedType || !form.employerId || !form.description.trim()) {
      alert('Please complete all required fields.'); return
    }
    const now   = new Date().toISOString()
    const today = now.split('T')[0]
    // Allocate using pool logic. Advice work (Benefit Update / Member Review /
    // New Entrant Consultation) must reach a qualified Financial Adviser —
    // factual administration stays with administrators.
    const needsAdviser = ['Benefit Update','Member Review','New Entrant Consultation'].includes(cfgCategory)
                      || cfgType === 'Benefit Update'
    const pool = needsAdviser
      ? users.filter(u => u.role === 'financial_adviser' && u.status === 'active')
      // General round-robin rotates between Mahlatse, Sesi and Nokulunga only
      : ROUND_ROBIN_MEMBER_IDS
          .map(id => users.find(u => u.id === id && u.status === 'active'))
          .filter(Boolean)
    // Round robin on open case count — least loaded first
    const counts = Object.fromEntries(pool.map(u => [u.id, cases.filter(c => c.assignedTo===u.id && !['Closed'].includes(c.status)).length]))
    const ordered = [...pool].sort((a,b) => (counts[a.id]||0) - (counts[b.id]||0))
    const assignedTo  = ordered[0]?.id || ''
    const assignedUser = users.find(u=>u.id===assignedTo)
    const caseRef = genRef('AEB')
    const wf = initWorkflow(selectedType)

    const documents = attachedFiles.map(f=>({ name:f.name, size:f.size, type:f.type, uploadedBy:currentUser.id, date:today }))

    const audit = [
      { time:now, user:currentUser.id, action:`Case ${caseRef} created — ${selectedType}`, type:'create' },
      { time:now, user:'system', action:`Leandre AI: workflow attached (${wf?.steps?.length||0} steps)${assignedUser?`, allocated to ${assignedUser.name} (round robin)`:''}, SLA ${template?.slaDays||5} days`, type:'workflow' },
      ...(assignedTo?[{ time:now, user:'system', action:`Auto-assigned to ${assignedUser?.name}`, type:'assign' }]:[]),
      { time:now, user:'system', action:`Workflow started: ${selectedType}`, type:'workflow' },
      ...documents.map(d=>({ time:now, user:currentUser.id, action:`Document uploaded: ${d.name}`, type:'upload' })),
    ]

    onSubmit({
      id: crypto.randomUUID(), ref:caseRef, workspace,
      caseTypeName: selectedType,
      workflowCategory: template?.category || '',
      masterCaseType: cfgType || null,
      caseCategory:   cfgCategory || null,
      slaNote:        masterCfg?.note || null,
      employerId: form.employerId,
      status:'Submitted', priority:form.priority,
      assignedTo, createdBy:currentUser.id,
      memberName:  form.memberName||null,
      memberId:    form.memberId||null,
      memberPhone: form.memberPhone||null,
      memberEmail: form.memberEmail||null,
      currentStage:0, stageHistory:[],
      created:today,
      slaDate: masterCfg
        ? slaDueDate(new Date().toISOString().split('T')[0], masterCfg.slaDays)
        : addBusinessDays(new Date().toISOString().split('T')[0], template?.slaDays || 5),
      slaDays: effSlaDays,
      description: form.description,
      extraFields:  {
        ...(form.extraFields || {}),
        ...(peName   ? { participating_employer: peName } : {}),
        ...(peBranch ? { branch: peBranch } : {}),
      },
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

          {/* Master Case Type / Category — SLA loads automatically from configuration */}
          <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Case Classification & SLA</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Case Type">
                <select value={cfgType} onChange={e=>{ setCfgType(e.target.value); setCfgCat('') }} style={selectSt}>
                  <option value="">Select case type…</option>
                  {CASE_TYPE_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Case Category">
                <select value={cfgCategory} onChange={e=>setCfgCat(e.target.value)} style={selectSt} disabled={!cfgType}>
                  <option value="">{cfgType ? 'Select category…' : 'Select case type first'}</option>
                  {categoriesForType(cfgType).map(c => <option key={c.category} value={c.category}>{c.category}</option>)}
                </select>
              </Field>
            </div>
            {masterCfg && (
              <div style={{ marginTop:12, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:800, color:'#059669', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'6px 12px' }}>
                  SLA: {masterCfg.slaDays} day{masterCfg.slaDays!==1?'s':''} · due {slaDueDate(new Date().toISOString().split('T')[0], masterCfg.slaDays)}
                </span>
                <span style={{ fontSize:11, fontWeight:700, borderRadius:8, padding:'6px 12px',
                  color: masterCfg.workflow ? T.blue : '#c2410c',
                  background: masterCfg.workflow ? '#eff6ff' : '#fff7ed',
                  border: `1px solid ${masterCfg.workflow ? '#bfdbfe' : '#fed7aa'}` }}>
                  {masterCfg.workflow ? `Workflow: ${masterCfg.workflow}` : '⚠ Workflow not configured'}
                </span>
                {masterCfg.note && (
                  <div style={{ fontSize:11, color:T.gray, fontStyle:'italic', width:'100%' }}>Note: {masterCfg.note}</div>
                )}
              </div>
            )}
          </div>

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
              {/* Participating employer — available on EVERY case type, so weekly
                  stats can be broken down per PE (not just funeral claims) */}
              {!isEmployer && peNames.length > 0 && (
                <>
                  <Field label="Participating Employer">
                    <select value={peName} onChange={e=>{ setPeName(e.target.value); setPeBranch('') }} style={selectSt}>
                      <option value="">Not applicable</option>
                      {peNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Field>
                  {peName && peBranches.length > 0 && (
                    <Field label="Branch">
                      <select value={peBranch} onChange={e=>setPeBranch(e.target.value)} style={selectSt}>
                        <option value="">Select branch…</option>
                        {peBranches.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </Field>
                  )}
                </>
              )}
              <Field label="Member Name"><input value={form.memberName} onChange={e=>set('memberName',e.target.value)} style={inputSt} placeholder="Optional"/></Field>
              <Field label="Member ID Number"><input value={form.memberId} onChange={e=>set('memberId',e.target.value)} style={inputSt} placeholder="13-digit SA ID / reference"/></Field>
              <Field label="Member Mobile Number"><input value={form.memberPhone} onChange={e=>set('memberPhone',e.target.value)} style={inputSt} placeholder="Optional"/></Field>
              <Field label="Member Email Address"><input value={form.memberEmail} onChange={e=>set('memberEmail',e.target.value)} style={inputSt} placeholder="Optional"/></Field>

              {/* Death claim required fields */}
              {template?.requiredFields?.length > 0 && (
                <div style={{ gridColumn:'1/-1', background:'#fff1f2', border:'1px solid #fecaca', borderRadius:9, padding:'12px 14px' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.red, marginBottom:10 }}>Death Claim Information</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {template.requiredFields.map(field => (
                      <div key={field.id} style={{ gridColumn: field.id==='claim_number'||field.id==='date_claim_paid'||field.id==='claim_status' ? undefined : undefined }}>
                        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:4 }}>
                          {field.label}{field.required && <span style={{ color:T.red }}> *</span>}{!field.required && <span style={{ color:T.gray, fontWeight:400 }}> (optional)</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select value={form.extraFields?.[field.id]||''} onChange={e=>set('extraFields',{...form.extraFields,[field.id]:e.target.value})} style={selectSt}>
                            <option value="">Select…</option>
                            {field.options.map(o=><option key={o}>{o}</option>)}
                          </select>
                        ) : field.type === 'currency' ? (
                          <div style={{ position:'relative' }}>
                            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:12, fontWeight:700, color:T.gray }}>R</span>
                            <input type="number" step="0.01" value={form.extraFields?.[field.id]||''} onChange={e=>set('extraFields',{...form.extraFields,[field.id]:e.target.value})} style={{...inputSt, paddingLeft:24}} placeholder="0.00"/>
                          </div>
                        ) : field.type === 'date' ? (
                          <input type="date" value={form.extraFields?.[field.id]||''} onChange={e=>set('extraFields',{...form.extraFields,[field.id]:e.target.value})} style={inputSt}/>
                        ) : (
                          <input value={form.extraFields?.[field.id]||''} onChange={e=>set('extraFields',{...form.extraFields,[field.id]:e.target.value})} style={inputSt}/>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

// ─── BULK MEMBER REVIEW ──────────────────────────────────────────────────────
// Creates one Member Review case per member. Reuses the existing case shape,
// workflow template, SLA config and round-robin pool — nothing duplicated.
function BulkMemberReviewModal({ employers, users, cases = [], currentUser, onClose, onSubmitAll }) {
  const [employerId, setEmployerId] = useState('')
  const [bulkPe, setBulkPe]         = useState('')
  const [bulkBranch, setBulkBranch] = useState('')
  const [schemeEmps, setSchemeEmps] = useState([])
  useEffect(() => { fetchFuneralEmployers().then(setSchemeEmps) }, [])
  const bulkPeNames = [...new Set(schemeEmps.map(r => r.name))].sort()
  const bulkBranches = [...new Set(schemeEmps.filter(r => r.name === bulkPe && r.branch).map(r => r.branch))].sort()
  const [raw, setRaw]               = useState('')
  const [caseType, setCaseType]     = useState('Member Review')
  const [preview, setPreview]       = useState(null)
  const fileRef = useRef()

  const cfg = findConfig(caseType === 'Member Review' ? 'Member Review' : 'Benefit Update', 'Member Review')

  function parseRows(text) {
    return text.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
      const p = line.split(/\t|,|;/).map(x => x.trim().replace(/^["']|["']$/g, ''))
      const [name, idNumber, phone, email] = p
      const errors = []
      if (!name) errors.push('name missing')
      if (idNumber && !/^\d{13}$/.test(idNumber.replace(/\s/g,''))) errors.push('ID must be 13 digits')
      return { row:i+1, name, idNumber:(idNumber||'').replace(/\s/g,''), phone:phone||'', email:email||'', errors }
    }).filter(r => r.name && r.name.toLowerCase() !== 'name' && !/member\s*name/i.test(r.name))
  }

  function buildPreview() {
    if (!employerId) { alert('Select an employer first.'); return }
    const rows = parseRows(raw)
    if (!rows.length) { alert('No member rows found. Paste one member per line.'); return }
    // Round-robin across the general pool, continuing from current workload
    const pool = ROUND_ROBIN_MEMBER_IDS
      .map(id => users.find(u => u.id === id && u.status === 'active'))
      .filter(Boolean)
    const counts = Object.fromEntries(pool.map(u => [u.id, cases.filter(c => c.assignedTo===u.id && c.status!=='Closed').length]))
    const assigned = rows.map(r => {
      const next = [...pool].sort((a,b)=>(counts[a.id]||0)-(counts[b.id]||0))[0]
      if (next) counts[next.id] = (counts[next.id]||0) + 1
      return { ...r, assignedTo: next?.id || '', assignedName: next?.name || 'Unassigned' }
    })
    setPreview(assigned)
  }

  function createAll() {
    const valid = preview.filter(r => r.errors.length === 0)
    if (!valid.length) { alert('No valid rows to create.'); return }
    if (!window.confirm(`Create ${valid.length} ${caseType} case${valid.length!==1?'s':''}?`)) return

    const today = new Date().toISOString().split('T')[0]
    const now   = new Date().toISOString()
    const emp   = employers.find(e => e.id === employerId)

    const list = valid.map(r => {
      const ref = genRef('AEB')
      return {
        id: crypto.randomUUID(), ref, workspace:'employer',
        caseTypeName:     caseType,
        workflowCategory: 'New Business',
        masterCaseType:   caseType,
        caseCategory:     'Member Review',
        employerId,
        status:'Submitted', priority:'Medium',
        assignedTo: r.assignedTo, createdBy: currentUser.id,
        memberName: r.name, memberId: r.idNumber || null,
        memberPhone: r.phone || null, memberEmail: r.email || null,
        currentStage:0, stageHistory:[],
        created: today,
        slaDate: slaDueDate(today, cfg?.slaDays || 5),
        slaDays: cfg?.slaDays || 5,
        description: `${caseType} — bulk upload for ${emp?.name || 'employer'}`,
        extraFields:{
          ...(bulkPe     ? { participating_employer: bulkPe } : {}),
          ...(bulkBranch ? { branch: bulkBranch } : {}),
        },
        billingTaskId:null,
        workflow: initWorkflow(caseType),
        notes:[], documents:[],
        audit:[
          { time:now, user:currentUser.id, action:`Case ${ref} created via bulk ${caseType} upload`, type:'create' },
          { time:now, user:'system', action:`Leandre AI: workflow attached, allocated to ${r.assignedName} (round robin), SLA ${cfg?.slaDays||5} days`, type:'workflow' },
        ],
        escalated:false,
        ownerHistory: r.assignedTo ? [{ user:r.assignedTo, from:today }] : [],
      }
    })
    onSubmitAll(list)
  }

  const validCount = preview ? preview.filter(r=>!r.errors.length).length : 0
  const errCount   = preview ? preview.length - validCount : 0

  return (
    <Modal title="Bulk Member Review Upload" onClose={onClose} wide>
      {!preview ? (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <Field label="Employer" required>
              <select value={employerId} onChange={e=>setEmployerId(e.target.value)} style={selectSt}>
                <option value="">Select employer…</option>
                {employers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Case Type">
              <select value={caseType} onChange={e=>setCaseType(e.target.value)} style={selectSt}>
                <option>Member Review</option>
                <option>Benefit Update</option>
              </select>
            </Field>
            {bulkPeNames.length > 0 && (
              <Field label="Participating Employer">
                <select value={bulkPe} onChange={e=>{ setBulkPe(e.target.value); setBulkBranch('') }} style={selectSt}>
                  <option value="">Not applicable</option>
                  {bulkPeNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            )}
            {bulkPe && bulkBranches.length > 0 && (
              <Field label="Branch">
                <select value={bulkBranch} onChange={e=>setBulkBranch(e.target.value)} style={selectSt}>
                  <option value="">Select branch…</option>
                  {bulkBranches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
            )}
          </div>

          <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:9, padding:'11px 14px', marginBottom:12, fontSize:12, color:'#1e40af', lineHeight:1.6 }}>
            One member per line: <strong>Name, ID Number, Mobile, Email</strong> — ID, mobile and email optional.
            Copy straight from Excel. Each member gets their own case, allocated round-robin.
          </div>

          <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:'none'}}
            onChange={e=>{ const f=e.target.files?.[0]; if(!f) return
              const rd=new FileReader(); rd.onload=ev=>setRaw(String(ev.target.result)); rd.readAsText(f); e.target.value='' }}/>
          <button onClick={()=>fileRef.current?.click()}
            style={{ marginBottom:10, padding:'7px 14px', borderRadius:8, border:`1px dashed ${T.border}`, background:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:T.blue }}>
            ⇪ Upload CSV instead
          </button>

          <textarea value={raw} onChange={e=>setRaw(e.target.value)}
            style={{ ...inputSt, minHeight:170, resize:'vertical', fontFamily:'monospace', fontSize:12 }}
            placeholder={"Thabo Molefe, 8501015800083, 0821234567, thabo@example.com\nNomsa Dlamini, 9203125800081\nPieter van Wyk"}/>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14 }}>
            <span style={{ fontSize:12, color:T.gray }}>{raw.split('\n').filter(l=>l.trim()).length} line(s)</span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onClose} style={{ padding:'9px 16px', borderRadius:8, border:`1px solid ${T.border}`, background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={buildPreview} style={{ padding:'9px 20px', borderRadius:8, border:'none', background:T.orange, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Preview →</button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#059669', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:20, padding:'4px 12px' }}>{validCount} ready</span>
            {errCount>0 && <span style={{ fontSize:12, fontWeight:700, color:'#dc2626', background:'#fff1f2', border:'1px solid #fecaca', borderRadius:20, padding:'4px 12px' }}>{errCount} with errors — will be skipped</span>}
            <span style={{ fontSize:12, color:T.gray, alignSelf:'center' }}>SLA {cfg?.slaDays||5} days each</span>
          </div>

          <div style={{ maxHeight:320, overflowY:'auto', border:`1px solid ${T.border}`, borderRadius:9 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr style={{ background:'#f9fafb', position:'sticky', top:0 }}>
                {['#','Member','ID Number','Contact','Allocated To','Status'].map(h=>(
                  <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {preview.map(r=>(
                  <tr key={r.row} style={{ borderBottom:'1px solid #f9fafb', background: r.errors.length?'#fff8f8':'#fff' }}>
                    <td style={{ padding:'7px 10px', color:T.gray }}>{r.row}</td>
                    <td style={{ padding:'7px 10px', fontWeight:600 }}>{r.name}</td>
                    <td style={{ padding:'7px 10px', fontFamily:'monospace' }}>{r.idNumber||'—'}</td>
                    <td style={{ padding:'7px 10px', color:T.gray }}>{[r.phone,r.email].filter(Boolean).join(' · ')||'—'}</td>
                    <td style={{ padding:'7px 10px' }}>{r.assignedName}</td>
                    <td style={{ padding:'7px 10px' }}>
                      {r.errors.length
                        ? <span style={{ color:'#dc2626', fontWeight:600 }}>✗ {r.errors.join(', ')}</span>
                        : <span style={{ color:'#059669', fontWeight:600 }}>✓ Ready</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:14 }}>
            <button onClick={()=>setPreview(null)} style={{ padding:'9px 16px', borderRadius:8, border:`1px solid ${T.border}`, background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
            <button onClick={createAll} disabled={!validCount}
              style={{ padding:'9px 22px', borderRadius:8, border:'none', background: validCount?T.green:'#d1d5db', color:'#fff', fontSize:13, fontWeight:800, cursor: validCount?'pointer':'not-allowed', fontFamily:'inherit' }}>
              Create {validCount} Case{validCount!==1?'s':''}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
