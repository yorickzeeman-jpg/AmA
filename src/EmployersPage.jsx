import { useState } from 'react'
import { T, ROLES } from '../../data.js'
import { Icon, Btn, Modal, Field, inputSt, selectSt, Card, Empty } from '../../ui.jsx'

export default function CaseTypeConfig({ caseTypes, categories, onUpdateCaseTypes }) {
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew]   = useState(false)
  const [filterCat, setFilterCat] = useState('')

  function saveCT(ct) {
    if (ct.id && caseTypes.find(x => x.id===ct.id)) {
      onUpdateCaseTypes(caseTypes.map(x => x.id===ct.id ? ct : x))
    } else {
      onUpdateCaseTypes([...caseTypes, { ...ct, id:'ct'+Date.now() }])
    }
    setSelected(null); setShowNew(false)
  }

  function toggleActive(id) {
    onUpdateCaseTypes(caseTypes.map(ct => ct.id===id ? { ...ct, active:!ct.active } : ct))
  }

  const visible = filterCat ? caseTypes.filter(ct => ct.categoryId===filterCat) : caseTypes

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:'0 0 3px' }}>Case Type Configuration</h1>
          <p style={{ margin:0, fontSize:12, color:T.gray }}>
            Case Types are the primary drivers of business logic: workflow stages, SLA, escalation rules, documents and responsible teams.
          </p>
        </div>
        <Btn onClick={() => setShowNew(true)}><Icon name="plus" size={15} color="#fff"/> New Case Type</Btn>
      </div>

      {/* Filter by category */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:12, color:T.gray, fontWeight:600 }}>Filter:</span>
        <button onClick={() => setFilterCat('')} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${!filterCat?T.green:T.border}`, background:!filterCat?T.green:'#fff', color:!filterCat?'#fff':'#374151', fontSize:12, fontWeight:600, cursor:'pointer' }}>All</button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setFilterCat(cat.id)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${filterCat===cat.id?cat.color:T.border}`, background:filterCat===cat.id?cat.color+'18':'#fff', color:filterCat===cat.id?cat.color:'#374151', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            {cat.name}
          </button>
        ))}
        <span style={{ marginLeft:'auto', fontSize:11, color:T.gray }}>{visible.length} case type{visible.length!==1?'s':''}</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
        {visible.map(ct => {
          const cat = categories.find(c => c.id===ct.categoryId)
          return (
            <div key={ct.id} style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden', opacity:ct.active?1:.55 }}>
              <div style={{ padding:'13px 16px', borderBottom:`3px solid ${cat?.color||T.green}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{ct.name}</div>
                  <div style={{ marginTop:4 }}>
                    <span style={{ background:cat?.color+'20', color:cat?.color||T.gray, padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:700 }}>
                      {cat?.name||'No Category'}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:ct.active?'#059669':T.gray, background:ct.active?'#f0fdf4':'#f9fafb', padding:'3px 8px', borderRadius:20, whiteSpace:'nowrap' }}>
                  {ct.active?'Active':'Inactive'}
                </span>
              </div>
              <div style={{ padding:'12px 16px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                  {[
                    ['SLA',            ct.slaLabel],
                    ['Stages',         ct.stages.length],
                    ['Team',           ct.responsibleTeam],
                    ['Required Docs',  ct.requiredDocs.length],
                  ].map(([k,v]) => (
                    <div key={k}>
                      <div style={{ fontSize:10, color:T.gray, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:2 }}>{k}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Stage preview */}
                <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:12 }}>
                  {ct.stages.map((s,i) => (
                    <span key={s.id} style={{ fontSize:10, padding:'2px 7px', background:'#f3f4f6', borderRadius:4, color:T.gray, display:'flex', alignItems:'center', gap:3 }}>
                      <span style={{ fontWeight:700, color:T.green }}>{i+1}</span> {s.name}
                    </span>
                  ))}
                </div>

                <div style={{ display:'flex', gap:7 }}>
                  <Btn small variant="secondary" onClick={() => setSelected(ct)}><Icon name="edit" size={12}/> Configure</Btn>
                  <Btn small variant={ct.active?'danger':'secondary'} onClick={() => toggleActive(ct.id)}>
                    {ct.active?'Deactivate':'Activate'}
                  </Btn>
                </div>
              </div>
            </div>
          )
        })}
        {visible.length===0 && <Empty icon="workflow" message="No case types found." />}
      </div>

      {(selected || showNew) && (
        <CaseTypeModal
          ct={selected}
          categories={categories}
          onClose={() => { setSelected(null); setShowNew(false) }}
          onSave={saveCT}
        />
      )}
    </div>
  )
}

function CaseTypeModal({ ct, categories, onClose, onSave }) {
  const [form, setForm] = useState(ct || {
    name:'', categoryId:'', slaLabel:'', slaDays:5, slaUnit:'business_days',
    slaValue:5, escalationDays:3, responsibleTeam:'', requiredDocs:[],
    stages:[], notifications:[], active:true,
  })
  const [newDoc, setNewDoc] = useState('')
  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  function addStage() {
    set('stages', [...form.stages, { id:'s'+Date.now(), name:'New Stage', owner:'service_admin', notify:false, requiredDocs:[] }])
  }
  function removeStage(id)       { set('stages', form.stages.filter(s => s.id!==id)) }
  function updateStage(id, k, v) { set('stages', form.stages.map(s => s.id===id ? {...s,[k]:v} : s)) }
  function moveStage(id, dir) {
    const idx = form.stages.findIndex(s => s.id===id)
    if (idx+dir < 0 || idx+dir >= form.stages.length) return
    const arr = [...form.stages];
    [arr[idx], arr[idx+dir]] = [arr[idx+dir], arr[idx]]
    set('stages', arr)
  }

  const SLA_PRESETS = [
    { label:'48 Hours',          slaDays:0.083, slaUnit:'hours',          slaValue:48,  slaLabel:'48 Hours'          },
    { label:'2 Business Days',   slaDays:2,     slaUnit:'business_days',  slaValue:2,   slaLabel:'2 Business Days'   },
    { label:'5 Business Days',   slaDays:5,     slaUnit:'business_days',  slaValue:5,   slaLabel:'5 Business Days'   },
    { label:'10 Business Days',  slaDays:10,    slaUnit:'business_days',  slaValue:10,  slaLabel:'10 Business Days'  },
    { label:'15 Business Days',  slaDays:15,    slaUnit:'business_days',  slaValue:15,  slaLabel:'15 Business Days'  },
    { label:'20 Business Days',  slaDays:20,    slaUnit:'business_days',  slaValue:20,  slaLabel:'20 Business Days'  },
  ]

  return (
    <Modal title={ct?`Configure: ${ct.name}`:'New Case Type'} onClose={onClose} wide>
      {/* Basic info */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:4 }}>
        <Field label="Case Type Name *">
          <input value={form.name} onChange={e => set('name',e.target.value)} style={inputSt} placeholder="e.g. Retirement Exit" />
        </Field>
        <Field label="Category *">
          <select value={form.categoryId} onChange={e => set('categoryId',e.target.value)} style={selectSt}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Responsible Team">
          <input value={form.responsibleTeam} onChange={e => set('responsibleTeam',e.target.value)} style={inputSt} placeholder="e.g. Claims Team" />
        </Field>
        <Field label="Escalation After (days)">
          <input type="number" value={form.escalationDays} onChange={e => set('escalationDays',parseInt(e.target.value)||1)} style={inputSt} />
        </Field>
      </div>

      {/* SLA */}
      <Field label="SLA">
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
          {SLA_PRESETS.map(p => (
            <button key={p.label} onClick={() => set('slaDays',p.slaDays) || set('slaUnit',p.slaUnit) || set('slaValue',p.slaValue) || set('slaLabel',p.slaLabel)} style={{ padding:'5px 11px', borderRadius:20, border:`1px solid ${form.slaLabel===p.label?T.green:T.border}`, background:form.slaLabel===p.label?'#f0f7f3':'#fff', color:form.slaLabel===p.label?T.green:'#374151', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input value={form.slaLabel} onChange={e => set('slaLabel',e.target.value)} style={{ ...inputSt, flex:2 }} placeholder="Custom label e.g. 3 Business Days" />
          <input type="number" value={form.slaDays} onChange={e => set('slaDays',parseFloat(e.target.value))} style={{ ...inputSt, flex:1 }} placeholder="Days" />
        </div>
      </Field>

      {/* Required Documents */}
      <Field label="Required Documents">
        <div style={{ display:'flex', gap:7, marginBottom:8 }}>
          <input value={newDoc} onChange={e => setNewDoc(e.target.value)} style={{ ...inputSt, flex:1 }} placeholder="Document name..."
            onKeyDown={e => { if(e.key==='Enter' && newDoc.trim()) { set('requiredDocs',[...form.requiredDocs,newDoc.trim()]); setNewDoc('') }}} />
          <Btn small onClick={() => { if(newDoc.trim()) { set('requiredDocs',[...form.requiredDocs,newDoc.trim()]); setNewDoc('') }}}>Add</Btn>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {form.requiredDocs.map((doc,i) => (
            <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', background:'#f0f7f3', borderRadius:20, fontSize:12, color:T.green, fontWeight:600 }}>
              {doc}
              <button onClick={() => set('requiredDocs', form.requiredDocs.filter((_,j)=>j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:T.gray, fontSize:14, lineHeight:1 }}>×</button>
            </span>
          ))}
          {form.requiredDocs.length===0 && <span style={{ fontSize:12, color:T.gray, fontStyle:'italic' }}>No required documents configured.</span>}
        </div>
      </Field>

      {/* Workflow Stages */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <label style={{ fontSize:13, fontWeight:700, color:'#374151' }}>
            Workflow Stages ({form.stages.length})
          </label>
          <Btn small onClick={addStage}><Icon name="plus" size={13} color="#fff"/> Add Stage</Btn>
        </div>
        {form.stages.length===0 && (
          <div style={{ textAlign:'center', color:T.gray, fontSize:12, padding:16, background:'#f9fafb', borderRadius:8, border:`1px dashed ${T.border}` }}>
            No stages yet. Add stages to define the workflow for this Case Type.
          </div>
        )}
        {form.stages.map((stage, idx) => (
          <div key={stage.id} style={{ background:'#f9fafb', borderRadius:8, padding:'11px 13px', marginBottom:7, border:`1px solid ${T.border}` }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:T.green, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{idx+1}</div>
              <input value={stage.name} onChange={e => updateStage(stage.id,'name',e.target.value)} style={{ ...inputSt, flex:1, padding:'6px 10px', fontSize:13 }} />
              <button onClick={() => moveStage(stage.id,-1)} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:5, padding:'4px 7px', cursor:'pointer', color:T.gray }}><Icon name="arrow_up" size={12}/></button>
              <button onClick={() => moveStage(stage.id, 1)} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:5, padding:'4px 7px', cursor:'pointer', color:T.gray }}><Icon name="arrow_down" size={12}/></button>
              <button onClick={() => removeStage(stage.id)}  style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:5, padding:'4px 7px', cursor:'pointer', color:T.red }}><Icon name="delete" size={12}/></button>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              <select value={stage.owner} onChange={e => updateStage(stage.id,'owner',e.target.value)} style={{ ...selectSt, flex:1, minWidth:160, padding:'5px 8px', fontSize:12 }}>
                {ROLES.filter(r => !['employer_admin','employer_user','read_only'].includes(r.id)).map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#374151', cursor:'pointer', whiteSpace:'nowrap' }}>
                <input type="checkbox" checked={stage.notify} onChange={e => updateStage(stage.id,'notify',e.target.checked)} />
                Notify on completion
              </label>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => { if(!form.name||!form.categoryId) return alert('Name and category are required.'); onSave(form) }}>
          {ct?'Save Changes':'Create Case Type'}
        </Btn>
      </div>
    </Modal>
  )
}

