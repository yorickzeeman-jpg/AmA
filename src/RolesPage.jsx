import { useState } from 'react'
import { T, INITIAL_USERS } from '../../data.js'
import { Icon, Btn, Modal, Field, inputSt, selectSt, Card, Empty } from '../../ui.jsx'

const INDUSTRIES = ['Mining & Steel','Mining','Petroleum','Construction','Transport','Finance','Retail','Agriculture','Healthcare','Education']

export default function EmployerManagement({ employers, users, onUpdateEmployers }) {
  const [editing, setEditing] = useState(null)
  const [showNew, setShowNew] = useState(false)

  function save(form) {
    if (form.id && employers.find(e => e.id===form.id)) {
      onUpdateEmployers(employers.map(e => e.id===form.id ? { ...e, ...form } : e))
    } else {
      onUpdateEmployers([...employers, { id:'e'+Date.now(), members:0, portal:false, ...form }])
    }
    setEditing(null); setShowNew(false)
  }

  function toggleStatus(id) {
    onUpdateEmployers(employers.map(e => e.id===id ? { ...e, status: e.status==='active'?'review':'active' } : e))
  }

  const consultants = users.filter(u => ['administrator','general_manager'].includes(u.role) && u.status==='active')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>Employer Management</h1>
        <Btn onClick={() => setShowNew(true)}><Icon name="plus" size={15} color="#fff"/> New Employer</Btn>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))', gap:14 }}>
        {employers.map(emp => {
          const con = null
          return (
            <div key={emp.id} style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, padding:18, transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.green; e.currentTarget.style.boxShadow='0 4px 16px rgba(26,61,43,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.boxShadow='none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ width:40, height:40, borderRadius:9, background:'#f0f7f3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color:T.green }}>{emp.name[0]}</div>
                <div style={{ display:'flex', gap:6 }}>
                  {emp.portal && <span style={{ fontSize:10, fontWeight:700, color:T.blue, background:'#eff6ff', padding:'2px 7px', borderRadius:20 }}>PORTAL</span>}
                  <span style={{ fontSize:10, fontWeight:700, color:emp.status==='active'?'#059669':T.amber, background:emp.status==='active'?'#f0fdf4':'#fffbeb', padding:'2px 7px', borderRadius:20 }}>
                    {emp.status?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:2 }}>{emp.name}</div>
              <div style={{ fontSize:11, color:T.gray, marginBottom:10 }}>{emp.number} · {emp.industry}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                <div style={{ background:'#f9fafb', borderRadius:7, padding:'8px 10px', textAlign:'center' }}>
                  <div style={{ fontSize:18, fontWeight:800, color:T.text }}>{emp.members.toLocaleString()}</div>
                  <div style={{ fontSize:9, color:T.gray, fontWeight:700, textTransform:'uppercase' }}>Members</div>
                </div>
                <div style={{ background:'#f9fafb', borderRadius:7, padding:'8px 10px', textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{con?.name||'—'}</div>
                  <div style={{ fontSize:9, color:T.gray, fontWeight:700, textTransform:'uppercase' }}>Consultant</div>
                </div>
              </div>
              <div style={{ fontSize:11, color:T.gray, marginBottom:10 }}>📞 {emp.phone} · ✉ {emp.email}</div>
              <div style={{ display:'flex', gap:7 }}>
                <Btn small variant="secondary" onClick={() => setEditing(emp)}><Icon name="edit" size={12}/> Edit</Btn>
                <Btn small variant={emp.status==='active'?'secondary':'secondary'} onClick={() => toggleStatus(emp.id)}>
                  {emp.status==='active'?'Set Review':'Activate'}
                </Btn>
              </div>
            </div>
          )
        })}
      </div>

      {(editing || showNew) && (
        <EmployerModal emp={editing} consultants={consultants} onClose={() => { setEditing(null); setShowNew(false) }} onSave={save} />
      )}
    </div>
  )
}

function EmployerModal({ emp, consultants, onClose, onSave }) {
  const [form, setForm] = useState(emp || { name:'', number:'', industry:'', contact:'', phone:'', email:'', consultant:'', status:'active', members:0, portal:false })
  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  return (
    <Modal title={emp?`Edit: ${emp.name}`:'New Employer'} onClose={onClose} wide>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <Field label="Employer Name *"><input value={form.name} onChange={e => set('name',e.target.value)} style={inputSt} /></Field>
        <Field label="Employer Number"><input value={form.number} onChange={e => set('number',e.target.value)} style={inputSt} placeholder="EMP-XXX" /></Field>
        <Field label="Industry">
          <select value={form.industry} onChange={e => set('industry',e.target.value)} style={selectSt}>
            <option value="">Select industry</option>
            {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
          </select>
        </Field>
        <Field label="Member Count"><input type="number" value={form.members} onChange={e => set('members',parseInt(e.target.value)||0)} style={inputSt} /></Field>
        <Field label="Contact Person"><input value={form.contact} onChange={e => set('contact',e.target.value)} style={inputSt} /></Field>
        <Field label="Phone"><input value={form.phone} onChange={e => set('phone',e.target.value)} style={inputSt} /></Field>
        <Field label="Email"><input type="email" value={form.email} onChange={e => set('email',e.target.value)} style={inputSt} /></Field>
        <Field label="Assigned Consultant">
          <select value={form.consultant} onChange={e => set('consultant',e.target.value)} style={selectSt}>
            <option value="">Unassigned</option>
            {consultants.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={e => set('status',e.target.value)} style={selectSt}>
            <option value="active">Active</option>
            <option value="review">Under Review</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:20 }}>
          <input type="checkbox" id="portal" checked={form.portal} onChange={e => set('portal',e.target.checked)} />
          <label htmlFor="portal" style={{ fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer' }}>Enable employer portal access</label>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:14 }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => { if(!form.name) return alert('Employer name required.'); onSave(form) }}>{emp?'Save Changes':'Create Employer'}</Btn>
      </div>
    </Modal>
  )
}
