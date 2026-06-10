import { useState } from 'react'
import { T, ROLES, INITIAL_EMPLOYERS } from '../../data.js'
import { Avatar, RoleBadge, Icon, Btn, Modal, Field, inputSt, selectSt, Card, CardHead, Empty } from '../../ui.jsx'

export default function UserManagement({ users, onUpdateUsers }) {
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')

  const visible = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))

  function toggleStatus(id) {
    onUpdateUsers(users.map(u => u.id===id ? { ...u, status: u.status==='active'?'inactive':'active' } : u))
  }

  function saveUser(form) {
    if (editing) {
      onUpdateUsers(users.map(u => u.id===editing.id ? { ...u, ...form } : u))
    } else {
      onUpdateUsers([...users, { id:'u'+Date.now(), avatar:form.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(), status:'active', joined:new Date().toISOString().split('T')[0], ...form }])
    }
    setEditing(null); setShowNew(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>User Management</h1>
        <Btn onClick={() => setShowNew(true)}><Icon name="plus" size={15} color="#fff"/> New User</Btn>
      </div>

      <Card>
        <div style={{ padding:'10px 14px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:8, alignItems:'center' }}>
          <Icon name="search" size={14} color={T.gray} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." style={{ border:'none', fontSize:13, outline:'none', flex:1 }} />
          <span style={{ fontSize:11, color:T.gray }}>{visible.length} user{visible.length!==1?'s':''}</span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                {['User','Role','Employer','Status','Joined','Actions'].map(h => (
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(u => (
                <tr key={u.id} style={{ borderBottom:`1px solid #f3f4f6` }}>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <Avatar initials={u.avatar} size={32} bg={ROLES.find(r=>r.id===u.role)?.color||T.green} />
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{u.name}</div>
                        <div style={{ fontSize:11, color:T.gray }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px' }}><RoleBadge roleId={u.role}/></td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:'#374151' }}>{INITIAL_EMPLOYERS.find(e=>e.id===u.employer)?.name||'—'}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:u.status==='active'?'#059669':T.gray, background:u.status==='active'?'#f0fdf4':'#f9fafb', padding:'3px 8px', borderRadius:20 }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:T.gray }}>{u.joined}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <Btn small variant="secondary" onClick={() => setEditing(u)}><Icon name="edit" size={12}/> Edit</Btn>
                      <Btn small variant={u.status==='active'?'danger':'secondary'} onClick={() => toggleStatus(u.id)}>
                        {u.status==='active'?'Disable':'Enable'}
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {(showNew || editing) && (
        <UserModal
          user={editing}
          onClose={() => { setShowNew(false); setEditing(null) }}
          onSave={saveUser}
        />
      )}
    </div>
  )
}

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState(user ? { name:user.name, email:user.email, role:user.role, employer:user.employer||'' } : { name:'', email:'', role:'administrator', employer:'' })
  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  const needsEmployer = ['employer_admin','employer_user'].includes(form.role)

  return (
    <Modal title={user?'Edit User':'Create User'} onClose={onClose}>
      <Field label="Full Name *"><input value={form.name} onChange={e => set('name',e.target.value)} style={inputSt} /></Field>
      <Field label="Email *"><input type="email" value={form.email} onChange={e => set('email',e.target.value)} style={inputSt} /></Field>
      <Field label="Role *">
        <select value={form.role} onChange={e => set('role',e.target.value)} style={selectSt}>
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </Field>
      {needsEmployer && (
        <Field label="Employer">
          <select value={form.employer} onChange={e => set('employer',e.target.value)} style={selectSt}>
            <option value="">Select employer</option>
            {INITIAL_EMPLOYERS.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </Field>
      )}
      {!user && (
        <div style={{ background:'#f0f7f3', borderRadius:8, padding:10, marginBottom:14, fontSize:12, color:T.green }}>
          A temporary password will be auto-generated and sent to the user's email.
        </div>
      )}
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => { if(!form.name||!form.email) return alert('Name and email required.'); onSave(form) }}>{user?'Save Changes':'Create User'}</Btn>
      </div>
    </Modal>
  )
}
