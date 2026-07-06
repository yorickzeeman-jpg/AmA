import { useState, useMemo } from 'react'
import { T } from '../../data.js'
import { inputSt, selectSt } from '../../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// WORKFLOW CONFIGURATION ENGINE
//
// Admins can:
//   - View all case types and their workflow steps
//   - Add / edit / remove workflow steps
//   - Configure SLA targets per case type
//   - Set assignment rules
//   - Enable / disable case types
//   - Import workflow spreadsheet to update config
//
// No code changes required — all driven from config stored in Supabase/localStorage
// ═════════════════════════════════════════════════════════════════════════════

const REQUIRED_FIELDS_MAP = {
  'Death - Retirement':       ['Natural/Unnatural','Date of Death','Relationship','Amount Paid'],
  'Death - Funeral':          ['Natural/Unnatural','Date of Death','Relationship'],
  'Death - Accidental Funeral':['Natural/Unnatural','Date of Death','Relationship','Police Report No.'],
  'Death - GLA':              ['Natural/Unnatural','Date of Death','Relationship','Amount Paid'],
  'Death - GEB':              ['Natural/Unnatural','Date of Death','Amount Paid'],
  'Death - GEB Review':       ['Natural/Unnatural','Date of Death','Amount Paid'],
  'Death - Extended Funeral': ['Natural/Unnatural','Date of Death','Relationship'],
  'Disability':               ['Disability Type','Date of Disability','Last Day Worked'],
  'Disability - Review':      ['Review Date','Current Status'],
}

const ASSIGNMENT_OPTIONS = [
  'Round Robin — General Pool',
  'Round Robin — Billing Pool',
  'Direct Assignment',
  'Supervisor Only',
]

const CATEGORIES = [
  'New Business',
  'Claims',
  'Exits',
  'Fund Administration',
  'Medical & Queries',
]

// Default SLA days per category
const DEFAULT_SLA = {
  'New Business':       5,
  'Claims':             10,
  'Exits':              7,
  'Fund Administration':14,
  'Medical & Queries':  3,
}

function Pill({ label, color, onRemove }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, background:color+'15', color, border:`1px solid ${color}25`, margin:'2px' }}>
      {label}
      {onRemove && <span onClick={onRemove} style={{ cursor:'pointer', fontSize:13, lineHeight:1, opacity:0.6 }}>×</span>}
    </span>
  )
}

// ─── STEP EDITOR ─────────────────────────────────────────────────────────────
function StepEditor({ steps, onChange }) {
  function updateStep(i, key, val) {
    const s = [...steps]
    s[i] = { ...s[i], [key]: val }
    onChange(s)
  }
  function addStep() {
    onChange([...steps, { id:`s${Date.now()}`, name:'', slaDays:2, requiredDocs:[], autoAction:null }])
  }
  function removeStep(i) { onChange(steps.filter((_,j)=>j!==i)) }
  function moveStep(i, dir) {
    const s = [...steps]
    const t = s[i]; s[i] = s[i+dir]; s[i+dir] = t
    onChange(s)
  }

  return (
    <div>
      {steps.map((step, i) => (
        <div key={step.id||i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-start' }}>
          <div style={{ width:24, height:24, borderRadius:'50%', background:T.blue+'18', color:T.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0, marginTop:8 }}>{i+1}</div>
          <div style={{ flex:1 }}>
            <input value={step.name} onChange={e=>updateStep(i,'name',e.target.value)}
              style={{ ...inputSt, marginBottom:4 }} placeholder={`Step ${i+1} name`}/>
            <div style={{ display:'flex', gap:6 }}>
              <input type="number" value={step.slaDays||2} onChange={e=>updateStep(i,'slaDays',+e.target.value)}
                style={{ ...inputSt, width:80, fontSize:11 }} placeholder="SLA days"/>
              <select value={step.autoAction||''} onChange={e=>updateStep(i,'autoAction',e.target.value||null)}
                style={{ ...selectSt, fontSize:11, flex:1 }}>
                <option value="">No auto-action</option>
                <option value="create_billing_task">Create Billing Task</option>
                <option value="notify_member">Notify Member</option>
                <option value="create_followup_reminder">Create Follow-up Reminder</option>
                <option value="notify_member_update_parent">Notify Member + Update Parent</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:3, flexShrink:0 }}>
            {i > 0              && <button onClick={()=>moveStep(i,-1)} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:4, padding:'2px 6px', cursor:'pointer', fontSize:11, color:T.gray }}>↑</button>}
            {i < steps.length-1 && <button onClick={()=>moveStep(i, 1)} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:4, padding:'2px 6px', cursor:'pointer', fontSize:11, color:T.gray }}>↓</button>}
            <button onClick={()=>removeStep(i)} style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:4, padding:'2px 6px', cursor:'pointer', fontSize:11, color:T.red }}>×</button>
          </div>
        </div>
      ))}
      <button onClick={addStep} style={{ fontSize:12, color:T.blue, background:'none', border:`1px dashed ${T.blue}`, borderRadius:7, padding:'5px 12px', cursor:'pointer', fontFamily:'inherit', marginTop:4, width:'100%' }}>
        + Add Step
      </button>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function WorkflowConfig({ workflowConfig, currentUser, onUpdateConfig }) {
  const [activeCategory, setCategory] = useState('All')
  const [selected, setSelected]       = useState(null)
  const [editing, setEditing]         = useState(false)
  const [draft, setDraft]             = useState(null)
  const [search, setSearch]           = useState('')
  const [showImport, setImport]       = useState(false)
  const [showAdd, setShowAdd]         = useState(false)

  const isAdmin = ['general_manager','administrator'].includes(currentUser.role)

  // Use live config from props, falling back to default
  const config = workflowConfig || {}
  const caseTypes = Object.values(config)

  const categories = ['All', ...CATEGORIES]

  const visible = caseTypes.filter(ct => {
    if (activeCategory !== 'All' && ct.category !== activeCategory) return false
    if (search && !ct.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function saveEdit() {
    const updated = { ...config, [draft.name]: draft }
    onUpdateConfig(updated)
    setEditing(false)
    setSelected(draft)
    setDraft(null)
  }

  function toggleEnabled(ct) {
    const updated = { ...config, [ct.name]: { ...ct, enabled: !ct.enabled } }
    onUpdateConfig(updated)
    if (selected?.name === ct.name) setSelected({ ...ct, enabled: !ct.enabled })
  }

  function addCaseType(newCt) {
    const updated = { ...config, [newCt.name]: newCt }
    onUpdateConfig(updated)
    setSelected(newCt)
    setShowAdd(false)
  }

  const ct   = editing ? draft : selected
  const catColors = { 'New Business':T.blue, 'Claims':T.red, 'Exits':T.amber, 'Fund Administration':'#059669', 'Medical & Queries':T.purple }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, animation:'fadeIn .3s ease' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:'0 0 3px' }}>Workflow Configuration</h1>
          <p style={{ margin:0, fontSize:12, color:T.gray }}>
            {caseTypes.length} case types · {caseTypes.filter(ct=>ct.enabled!==false).length} active · Master workflow source of truth
          </p>
        </div>
        {isAdmin && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setShowAdd(true)}
              style={{ padding:'8px 16px', background:T.orange, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              + Add Case Type
            </button>
            <button onClick={()=>setImport(true)}
              style={{ padding:'8px 16px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, color:T.text, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Import Spreadsheet
            </button>
          </div>
        )}
      </div>

      <div style={{ display:'flex', gap:16, height:'calc(100vh - 200px)', minHeight:500 }}>

        {/* LEFT — case type list */}
        <div style={{ width:280, flexShrink:0, background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Search + category filter */}
          <div style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}` }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search case types…"
              style={{ ...inputSt, marginBottom:8, fontSize:12 }}/>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {categories.map(cat => (
                <button key={cat} onClick={()=>setCategory(cat)}
                  style={{ padding:'3px 8px', borderRadius:12, border:`1px solid ${activeCategory===cat?(catColors[cat]||T.orange):T.border}`, background:activeCategory===cat?(catColors[cat]||T.orange)+'12':'#fff', color:activeCategory===cat?(catColors[cat]||T.orange):T.gray, fontSize:10, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div style={{ flex:1, overflowY:'auto', padding:'6px' }}>
            {visible.map(ct => {
              const isSelected = selected?.name === ct.name
              const disabled   = ct.enabled === false
              const clr        = catColors[ct.category] || T.orange
              return (
                <button key={ct.name} onClick={()=>{ setSelected(ct); setEditing(false); setDraft(null) }}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:`1.5px solid ${isSelected?clr:'transparent'}`, background:isSelected?clr+'10':'transparent', textAlign:'left', cursor:'pointer', fontFamily:'inherit', marginBottom:2, opacity:disabled?0.5:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:12, fontWeight:isSelected?700:500, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{ct.name}</div>
                    <div style={{ display:'flex', gap:4, flexShrink:0, marginLeft:4 }}>
                      <span style={{ fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:4, background:clr+'18', color:clr }}>{ct.category?.split(' ')[0]}</span>
                      {ct.billingTrigger && <span style={{ fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:4, background:T.purple+'15', color:T.purple }}>$</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:T.gray, marginTop:2 }}>{ct.steps?.length||0} steps · SLA {ct.slaDays||5}d</div>
                </button>
              )
            })}
            {visible.length === 0 && <div style={{ textAlign:'center', padding:24, color:T.gray, fontSize:12 }}>No case types found.</div>}
          </div>
        </div>

        {/* RIGHT — detail / editor */}
        <div style={{ flex:1, background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {!selected ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:T.gray, flexDirection:'column', gap:8 }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.text }}>Select a case type</div>
              <div style={{ fontSize:12 }}>Choose from the list to view or edit its workflow.</div>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:T.text, marginBottom:4 }}>{ct?.name}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <Pill label={ct?.category} color={catColors[ct?.category]||T.orange}/>
                    {ct?.billingTrigger && <Pill label="Billing Trigger" color={T.purple}/>}
                    {ct?.enabled === false && <Pill label="DISABLED" color={T.red}/>}
                    <Pill label={`${ct?.steps?.length||0} steps`} color={T.blue}/>
                    <Pill label={`SLA ${ct?.slaDays||5} days`} color={T.amber}/>
                  </div>
                </div>
                {isAdmin && !editing && (
                  <div style={{ display:'flex', gap:7 }}>
                    <button onClick={()=>{ setDraft(JSON.parse(JSON.stringify(selected))); setEditing(true) }}
                      style={{ padding:'7px 14px', background:'#f9fafb', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      Edit
                    </button>
                    <button onClick={()=>toggleEnabled(selected)}
                      style={{ padding:'7px 14px', background: selected.enabled===false?'#f0fdf4':'#fff1f2', border:`1px solid ${selected.enabled===false?'#bbf7d0':'#fecaca'}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', color:selected.enabled===false?'#059669':T.red }}>
                      {selected.enabled===false ? 'Enable' : 'Disable'}
                    </button>
                  </div>
                )}
                {editing && (
                  <div style={{ display:'flex', gap:7 }}>
                    <button onClick={saveEdit} style={{ padding:'7px 14px', background:T.green, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Save</button>
                    <button onClick={()=>{ setEditing(false); setDraft(null) }} style={{ padding:'7px 14px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                  </div>
                )}
              </div>

              {/* Detail body */}
              <div style={{ flex:1, overflowY:'auto', padding:'16px 18px' }}>
                {editing ? (
                  <div>
                    {/* Basic info */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                      <div>
                        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:5 }}>Case Type Name</label>
                        <input value={draft?.name} onChange={e=>setDraft({...draft,name:e.target.value})} style={inputSt}/>
                      </div>
                      <div>
                        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:5 }}>Category</label>
                        <select value={draft?.category} onChange={e=>setDraft({...draft,category:e.target.value})} style={selectSt}>
                          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:5 }}>SLA (days)</label>
                        <input type="number" value={draft?.slaDays||5} onChange={e=>setDraft({...draft,slaDays:+e.target.value})} style={inputSt}/>
                      </div>
                      <div>
                        <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:5 }}>Assignment Rule</label>
                        <select value={draft?.assignmentRule||'Round Robin — General Pool'} onChange={e=>setDraft({...draft,assignmentRule:e.target.value})} style={selectSt}>
                          {ASSIGNMENT_OPTIONS.map(o=><option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:16, marginBottom:16 }}>
                      <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, color:T.text }}>
                        <div onClick={()=>setDraft({...draft,billingTrigger:!draft.billingTrigger})} style={{ width:18, height:18, borderRadius:4, background:draft?.billingTrigger?T.purple:'#fff', border:`2px solid ${draft?.billingTrigger?T.purple:T.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                          {draft?.billingTrigger && <span style={{ color:'#fff', fontSize:11, fontWeight:700 }}>✓</span>}
                        </div>
                        Billing Trigger
                      </label>
                    </div>

                    {/* Workflow steps */}
                    <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:10 }}>Workflow Steps</div>
                    <StepEditor steps={draft?.steps||[]} onChange={steps=>setDraft({...draft,steps})}/>

                    {/* Required fields */}
                    <div style={{ marginTop:16 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:8 }}>Required Fields</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
                        {(draft?.requiredFields||[]).map((f,i)=>(
                          <Pill key={i} label={f} color={T.red} onRemove={()=>setDraft({...draft,requiredFields:(draft.requiredFields||[]).filter((_,j)=>j!==i)})}/>
                        ))}
                      </div>
                      <select onChange={e=>{ if(e.target.value&&!(draft?.requiredFields||[]).includes(e.target.value)){setDraft({...draft,requiredFields:[...(draft.requiredFields||[]),e.target.value]})}; e.target.value='' }} style={{...selectSt, fontSize:11}}>
                        <option value="">+ Add required field</option>
                        {['Natural/Unnatural','Date of Death','Relationship','Amount Paid','Police Report No.','Disability Type','Date of Disability','Last Day Worked','Review Date','Current Status'].map(f=><option key={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Meta grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:16 }}>
                      {[
                        ['Category',       ct?.category,        catColors[ct?.category]||T.orange],
                        ['SLA Target',     `${ct?.slaDays||5} days`, T.amber],
                        ['Assignment',     ct?.assignmentRule||'Round Robin — General Pool', T.blue],
                        ['Billing',        ct?.billingTrigger?'Required':'Not required', ct?.billingTrigger?T.purple:T.gray],
                      ].map(([l,v,c])=>(
                        <div key={l} style={{ background:c+'08', borderRadius:9, padding:'12px 14px', border:`1px solid ${c}20` }}>
                          <div style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', marginBottom:4 }}>{l}</div>
                          <div style={{ fontSize:13, fontWeight:700, color:c }}>{v||'—'}</div>
                        </div>
                      ))}
                    </div>

                    {/* Workflow steps */}
                    <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:10 }}>Workflow Steps</div>
                    {(ct?.steps||[]).length === 0 ? (
                      <div style={{ color:T.gray, fontSize:12, fontStyle:'italic' }}>No steps configured.</div>
                    ) : (
                      <div style={{ position:'relative' }}>
                        {ct.steps.map((step, i) => (
                          <div key={step.id||i} style={{ display:'flex', gap:12, marginBottom:12, position:'relative' }}>
                            {i < ct.steps.length-1 && (
                              <div style={{ position:'absolute', left:11, top:26, width:2, height:'calc(100% + 4px)', background:'#f3f4f6' }}/>
                            )}
                            <div style={{ width:24, height:24, borderRadius:'50%', background:T.blue+'18', color:T.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                            <div style={{ flex:1, paddingTop:2 }}>
                              <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{step.name}</div>
                              <div style={{ display:'flex', gap:6, marginTop:3, flexWrap:'wrap' }}>
                                <span style={{ fontSize:10, color:T.gray }}>SLA: {step.slaDays||2}d</span>
                                {step.autoAction && <span style={{ fontSize:10, color:T.purple, background:'#f5f3ff', padding:'1px 6px', borderRadius:10 }}>Auto: {step.autoAction.replace(/_/g,' ')}</span>}
                                {step.requiredDocs?.length > 0 && <span style={{ fontSize:10, color:T.blue, background:'#eff6ff', padding:'1px 6px', borderRadius:10 }}>{step.requiredDocs.length} doc{step.requiredDocs.length!==1?'s':''} required</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Required fields */}
                    {(ct?.requiredFields||REQUIRED_FIELDS_MAP[ct?.name]||[]).length > 0 && (
                      <div style={{ marginTop:16 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:8 }}>Required Fields</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                          {(ct?.requiredFields||REQUIRED_FIELDS_MAP[ct?.name]||[]).map((f,i)=>(
                            <Pill key={i} label={f} color={T.red}/>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Case Type modal */}
      {showAdd && (
        <AddCaseTypeModal onClose={()=>setShowAdd(false)} onAdd={addCaseType} existing={caseTypes.map(ct=>ct.name)}/>
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModal onClose={()=>setImport(false)} onImport={(imported)=>{ onUpdateConfig({...config,...imported}); setImport(false) }}/>
      )}
    </div>
  )
}

// ─── ADD CASE TYPE MODAL ──────────────────────────────────────────────────────
function AddCaseTypeModal({ onClose, onAdd, existing }) {
  const [name, setName]       = useState('')
  const [category, setCategory] = useState('Claims')
  const [slaDays, setSla]     = useState(5)
  const [billing, setBilling] = useState(false)
  const [assignment, setAssign] = useState('Round Robin — General Pool')
  const [steps, setSteps]     = useState([{ id:'s1', name:'', slaDays:2, requiredDocs:[], autoAction:null }])

  function save() {
    if (!name.trim()) { alert('Name required'); return }
    if (existing.includes(name.trim())) { alert('Case type already exists'); return }
    onAdd({
      name:           name.trim(),
      category,
      slaDays,
      billingTrigger: billing,
      assignmentRule: assignment,
      steps:          steps.filter(s=>s.name.trim()),
      requiredFields: [],
      enabled:        true,
    })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:14, width:'min(600px,100%)', maxHeight:'85vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between' }}>
          <div style={{ fontSize:16, fontWeight:700 }}>Add Case Type</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:T.gray }}>×</button>
        </div>
        <div style={{ padding:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:5 }}>Case Type Name *</label>
              <input value={name} onChange={e=>setName(e.target.value)} style={inputSt} placeholder="e.g. Medical - New Dependent"/>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:5 }}>Category</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} style={selectSt}>
                {['New Business','Claims','Exits','Fund Administration','Medical & Queries'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:5 }}>SLA (days)</label>
              <input type="number" value={slaDays} onChange={e=>setSla(+e.target.value)} style={inputSt}/>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:5 }}>Assignment</label>
              <select value={assignment} onChange={e=>setAssign(e.target.value)} style={selectSt}>
                {ASSIGNMENT_OPTIONS.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, color:T.text, paddingTop:20 }}>
                <div onClick={()=>setBilling(b=>!b)} style={{ width:18, height:18, borderRadius:4, background:billing?T.purple:'#fff', border:`2px solid ${billing?T.purple:T.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  {billing && <span style={{ color:'#fff', fontSize:11 }}>✓</span>}
                </div>
                Billing Trigger
              </label>
            </div>
          </div>
          <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:8 }}>Workflow Steps</div>
          <StepEditor steps={steps} onChange={setSteps}/>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'8px 16px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={save} style={{ padding:'8px 16px', background:T.orange, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Save Case Type</button>
        </div>
      </div>
    </div>
  )
}

// ─── IMPORT MODAL ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImport }) {
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)

  function handleFile(file) {
    if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = e => {
      const text  = e.target.result
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      const parsed = {}

      lines.forEach(line => {
        const cols = line.split('\t')
        // Format: [additional fields] [CRM updated] [num] [name] [step1] [step2] ...
        const nameIdx = 3
        const name = cols[nameIdx]?.trim()
        if (!name || name === 'Query' || !isNaN(+name)) return

        const steps = []
        for (let i = 4; i < cols.length; i++) {
          const s = cols[i]?.trim()
          if (s && !s.includes('Relevant steps') && !s.includes('Ensure you')) {
            steps.push({ id:`s${i-3}`, name:s, slaDays:2, requiredDocs:[], autoAction:null })
          }
        }

        // Determine category
        let category = 'Medical & Queries'
        if (['Exit','Death - Retirement','Expiry'].includes(name)) category = 'Exits'
        else if (name.startsWith('Death') || name.startsWith('Disability')) category = 'Claims'
        else if (['New','Underwriting','Extended Funeral Application','Section 14'].includes(name)) category = 'New Business'
        else if (name === 'Section 14') category = 'Fund Administration'

        const billingTrigger = ['Exit','New','Extended Funeral Application','Death - Retirement','Disability'].includes(name)

        parsed[name] = {
          name, category, steps, billingTrigger,
          slaDays: DEFAULT_SLA[category] || 5,
          assignmentRule: 'Round Robin — General Pool',
          requiredFields: REQUIRED_FIELDS_MAP[name] || [],
          enabled: true,
        }
      })

      setPreview(parsed)
      setImporting(false)
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:14, width:'min(640px,100%)', maxHeight:'85vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between' }}>
          <div style={{ fontSize:16, fontWeight:700 }}>Import Workflow Spreadsheet</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:T.gray }}>×</button>
        </div>
        <div style={{ padding:20 }}>
          {!preview ? (
            <div>
              <div style={{ background:'#f0f7ff', border:'1px solid #bfdbfe', borderRadius:9, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#374151', lineHeight:1.6 }}>
                Export your workflow spreadsheet as <strong>CSV or TSV</strong> and upload here.
                The importer reads case type names and their workflow steps automatically.
                Existing case types will be updated. New ones will be added.
              </div>
              <label style={{ display:'block', border:`2px dashed ${T.border}`, borderRadius:10, padding:'28px 20px', textAlign:'center', cursor:'pointer', background:'#fafafa' }}
                onDragOver={e=>{e.preventDefault(); e.currentTarget.style.borderColor=T.orange}}
                onDragLeave={e=>e.currentTarget.style.borderColor=T.border}
                onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=T.border;handleFile(e.dataTransfer.files[0])}}>
                <input type="file" accept=".csv,.tsv,.txt" onChange={e=>handleFile(e.target.files[0])} style={{display:'none'}}/>
                <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:6 }}>Drop workflow spreadsheet here</div>
                <div style={{ fontSize:12, color:T.gray }}>CSV or TSV · or click to browse</div>
              </label>
              {importing && <div style={{ textAlign:'center', padding:16, fontSize:12, color:T.gray }}>Reading file…</div>}
            </div>
          ) : (
            <div>
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:9, padding:'10px 14px', marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.green }}>{Object.keys(preview).length} case types found</div>
                <div style={{ fontSize:11, color:'#374151', marginTop:2 }}>Review below then confirm import.</div>
              </div>
              <div style={{ maxHeight:300, overflowY:'auto' }}>
                {Object.values(preview).map(ct=>(
                  <div key={ct.name} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', borderBottom:`1px solid #f3f4f6`, fontSize:12 }}>
                    <div style={{ fontWeight:600 }}>{ct.name}</div>
                    <div style={{ color:T.gray }}>{ct.category} · {ct.steps.length} steps</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'8px 16px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          {preview && (
            <button onClick={()=>onImport(preview)} style={{ padding:'8px 16px', background:T.green, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Confirm Import ({Object.keys(preview).length} case types)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
