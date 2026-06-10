import { useState } from 'react'
import { T } from '../../data.js'
import { Icon, Btn, Modal, Field, inputSt, Card, CardHead, Empty } from '../../ui.jsx'

const PRESET_COLORS = [
  '#dc2626','#7c3aed','#1d4ed8','#0891b2','#d97706',
  '#2d6648','#6366f1','#0f766e','#be185d','#b45309',
]

export default function CategoryConfig({ categories, onUpdateCategories }) {
  const [editing, setEditing] = useState(null)
  const [showNew, setShowNew] = useState(false)

  function save(form) {
    if (form.id && categories.find(c => c.id===form.id)) {
      onUpdateCategories(categories.map(c => c.id===form.id ? { ...c, ...form } : c))
    } else {
      onUpdateCategories([...categories, { ...form, id:'cat'+Date.now() }])
    }
    setEditing(null); setShowNew(false)
  }

  function remove(id) {
    if (!confirm('Remove this category? Any Case Types linked to it will be unlinked.')) return
    onUpdateCategories(categories.filter(c => c.id!==id))
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:'0 0 3px' }}>Category Configuration</h1>
          <p style={{ margin:0, fontSize:12, color:T.gray }}>
            Categories group Case Types for reporting purposes only. All business logic lives at the Case Type level.
          </p>
        </div>
        <Btn onClick={() => setShowNew(true)}><Icon name="plus" size={15} color="#fff"/> New Category</Btn>
      </div>

      {/* Architecture reminder */}
      <div style={{ background:'#f0f7f3', borderRadius:10, padding:'12px 16px', border:`1px solid #a7c9b5`, display:'flex', gap:12, alignItems:'flex-start' }}>
        <Icon name="info" size={16} color={T.green} />
        <div style={{ fontSize:12, color:T.green, lineHeight:1.6 }}>
          <strong>Design principle:</strong> Categories are used for grouping and reporting only.
          Workflow stages, SLA rules, required documents and escalation logic are configured at the <strong>Case Type</strong> level — not here.
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
        {categories.map(cat => (
          <div key={cat.id} style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden' }}>
            <div style={{ height:4, background:cat.color }} />
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:cat.color, flexShrink:0 }} />
                  <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{cat.name}</div>
                </div>
                <span style={{ fontFamily:'monospace', fontSize:10, color:T.gray }}>{cat.id}</span>
              </div>
              {cat.description && (
                <div style={{ fontSize:12, color:T.gray, lineHeight:1.5, marginBottom:12 }}>{cat.description}</div>
              )}
              <div style={{ display:'flex', gap:7 }}>
                <Btn small variant="secondary" onClick={() => setEditing(cat)}><Icon name="edit" size={12}/> Edit</Btn>
                <Btn small variant="danger" onClick={() => remove(cat.id)}><Icon name="delete" size={12}/> Remove</Btn>
              </div>
            </div>
          </div>
        ))}
        {categories.length===0 && <Empty icon="workflow" message="No categories configured yet." />}
      </div>

      {(showNew || editing) && (
        <CategoryModal cat={editing} onClose={() => { setShowNew(false); setEditing(null) }} onSave={save} />
      )}
    </div>
  )
}

function CategoryModal({ cat, onClose, onSave }) {
  const [form, setForm] = useState(cat || { name:'', color:PRESET_COLORS[0], description:'' })
  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  return (
    <Modal title={cat?`Edit: ${cat.name}`:'New Category'} onClose={onClose}>
      <Field label="Category Name *">
        <input value={form.name} onChange={e => set('name',e.target.value)} style={inputSt} placeholder="e.g. Exits, Claims, Entries" />
      </Field>
      <Field label="Description">
        <textarea value={form.description} onChange={e => set('description',e.target.value)}
          placeholder="Brief description of what this category covers..."
          style={{ ...inputSt, minHeight:70, resize:'vertical' }} />
      </Field>
      <Field label="Colour">
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => set('color',c)} style={{
              width:28, height:28, borderRadius:'50%', background:c, border:`3px solid ${form.color===c?T.text:'transparent'}`,
              cursor:'pointer', transition:'border .12s',
            }} />
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
          <input type="color" value={form.color} onChange={e => set('color',e.target.value)}
            style={{ width:36, height:36, border:'none', borderRadius:6, cursor:'pointer', padding:2 }} />
          <span style={{ fontSize:12, color:T.gray }}>Or choose a custom colour</span>
          <span style={{ fontFamily:'monospace', fontSize:12, color:T.text, marginLeft:'auto' }}>{form.color}</span>
        </div>
      </Field>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => { if(!form.name.trim()) return alert('Category name required.'); onSave(form) }}>
          {cat?'Save Changes':'Create Category'}
        </Btn>
      </div>
    </Modal>
  )
}
