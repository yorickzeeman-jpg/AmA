import { useState, useRef } from 'react'
import { T } from '../data.js'
import { Card, Btn, Icon, inputSt, selectSt } from '../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// MEMBERSHIP REGISTER — Phase 1
//
// Purpose: Upload billing schedule → becomes active member database
// Supports: New Employee, Exit, Membership Amendment billing actions
// Rule: NEVER auto-update. Billing Administrator approves all changes.
// ═════════════════════════════════════════════════════════════════════════════

const MEMBER_STATUS = {
  'Active':                { color:'#059669', bg:'#f0fdf4', border:'#bbf7d0' },
  'Pending Addition':      { color:'#d97706', bg:'#fffbeb', border:'#fde68a' },
  'Pending Exit':          { color:'#dc2626', bg:'#fff1f2', border:'#fecaca' },
  'Pending Amendment':     { color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
  'Inactive':              { color:'#9ca3af', bg:'#f3f4f6', border:'#e5e7eb' },
  'Exited':                { color:'#9ca3af', bg:'#f3f4f6', border:'#e5e7eb' },
}

// Parse CSV/Excel-style billing schedule
function parseBillingSchedule(text, employerId, sourceFile) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 2) return []

  // Detect delimiter
  const header = lines[0]
  const delim  = header.includes('\t') ? '\t' : ','

  const headers = header.split(delim).map(h => h.replace(/"/g,'').trim().toLowerCase())

  // Column mapping — flexible header matching
  function colIdx(...names) {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name.toLowerCase()))
      if (idx !== -1) return idx
    }
    return -1
  }

  const cols = {
    name:      colIdx('name','first name','firstname','member name'),
    surname:   colIdx('surname','last name','lastname'),
    id:        colIdx('id number','id no','id_number','identity'),
    payroll:   colIdx('payroll','emp no','employee no','payroll no','payroll number'),
    category:  colIdx('category','benefit cat','cat'),
    pf:        colIdx('provident','pf','fund'),
    gla:       colIdx('gla','life assurance','group life'),
    phi:       colIdx('phi','disability','income disability'),
    medical:   colIdx('medical','med','health'),
    premium:   colIdx('premium','total','amount','monthly'),
    status:    colIdx('status'),
    effective: colIdx('effective','start date','date'),
  }

  const members = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delim).map(c => c.replace(/"/g,'').trim())
    if (cells.length < 2) continue

    const get = (idx) => idx !== -1 ? (cells[idx] || '') : ''

    const fullName = get(cols.name)
    if (!fullName) continue

    members.push({
      id:              'mr' + Date.now() + i,
      employerId,
      memberName:      fullName,
      surname:         get(cols.surname),
      idNumber:        get(cols.id),
      payrollNumber:   get(cols.payroll),
      benefitCategory: get(cols.category) || 'Category 1',
      providentFund:   get(cols.pf) !== 'No',
      gla:             get(cols.gla) !== 'No',
      phi:             get(cols.phi) !== 'No',
      medical:         get(cols.medical) !== 'No',
      monthlyPremium:  parseFloat(get(cols.premium).replace(/[R,\s]/g,'')) || 0,
      status:          get(cols.status) || 'Active',
      effectiveDate:   get(cols.effective) || new Date().toISOString().split('T')[0],
      sourceFile,
      createdAt:       new Date().toISOString(),
    })
  }
  return members
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function MembershipRegister({ employers, members, currentUser, onLoadMembers, onUpdateMember }) {
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilter]     = useState('')
  const [showUpload, setShowUpload]   = useState(false)
  const [selectedMember, setSelected] = useState(null)

  const canEdit = ['general_manager','administrator','billing_admin'].includes(currentUser.role)

  const empMembers = (members || []).filter(m => !selectedEmp || m.employerId === selectedEmp)

  const visible = empMembers.filter(m => {
    if (filterStatus && m.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!m.memberName?.toLowerCase().includes(q) &&
          !m.surname?.toLowerCase().includes(q) &&
          !m.idNumber?.includes(q) &&
          !m.payrollNumber?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const stats = {
    active:   empMembers.filter(m => m.status === 'Active').length,
    pending:  empMembers.filter(m => m.status.startsWith('Pending')).length,
    exited:   empMembers.filter(m => m.status === 'Exited' || m.status === 'Inactive').length,
    total:    empMembers.length,
  }

  const totalPremium = visible.filter(m=>m.status==='Active').reduce((s,m)=>s+(m.monthlyPremium||0),0)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn .3s ease' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:'0 0 3px' }}>Membership Register</h1>
          <p style={{ margin:0, fontSize:12, color:T.gray }}>Active member database — source of truth for billing.</p>
        </div>
        {canEdit && (
          <Btn onClick={() => setShowUpload(true)}>
            <Icon name="plus" size={15} color="#fff"/> Upload Billing Schedule
          </Btn>
        )}
      </div>

      {/* Employer selector */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button onClick={() => setSelectedEmp(null)}
          style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${!selectedEmp?T.orange:T.border}`, background:!selectedEmp?T.orangeL:'#fff', color:!selectedEmp?T.orange:'#374151', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          All Employers
        </button>
        {employers.map(emp => (
          <button key={emp.id} onClick={() => setSelectedEmp(emp.id)}
            style={{ padding:'7px 14px', borderRadius:20, border:`1.5px solid ${selectedEmp===emp.id?T.orange:T.border}`, background:selectedEmp===emp.id?T.orangeL:'#fff', color:selectedEmp===emp.id?T.orange:'#374151', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {emp.name}
          </button>
        ))}
      </div>

      {/* KPI row */}
      {empMembers.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
          {[
            ['Active Members',    stats.active,   '#059669','#f0fdf4'],
            ['Pending Actions',   stats.pending,  '#d97706','#fffbeb'],
            ['Exited',            stats.exited,   '#9ca3af','#f3f4f6'],
            ['Total Premium',     `R${totalPremium.toLocaleString()}`, '#1e5fd9','#eff6ff'],
          ].map(([l,v,c,bg])=>(
            <div key={l} style={{ background:bg, borderRadius:10, padding:'12px 14px', border:`1px solid ${c}30` }}>
              <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
              <div style={{ fontSize:11, color:c, fontWeight:600, marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ background:'#fff', borderRadius:10, padding:'10px 14px', border:`1px solid ${T.border}`, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative' }}>
          <div style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)' }}><Icon name="search" size={13} color={T.gray}/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, ID, payroll number…"
            style={{ padding:'6px 8px 6px 26px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, width:220 }}/>
        </div>
        <select value={filterStatus} onChange={e=>setFilter(e.target.value)} style={{ padding:'6px 8px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12 }}>
          <option value="">All Statuses</option>
          {Object.keys(MEMBER_STATUS).map(s=><option key={s}>{s}</option>)}
        </select>
        {(search||filterStatus) && <button onClick={()=>{setSearch('');setFilter('')}} style={{ fontSize:11, color:T.red, background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>Clear</button>}
        <div style={{ marginLeft:'auto', fontSize:11, color:T.gray }}>{visible.length} member{visible.length!==1?'s':''}</div>
      </div>

      {/* Register table */}
      {empMembers.length === 0 ? (
        <Card>
          <div style={{ textAlign:'center', padding:48, color:T.gray }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:6 }}>No members loaded</div>
            <div style={{ fontSize:12, marginBottom:16 }}>Upload a billing schedule to create the active membership register.</div>
            {canEdit && <Btn onClick={()=>setShowUpload(true)}>Upload Billing Schedule</Btn>}
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
              <thead>
                <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                  {['Member Name','Payroll No.','ID Number','Category','Benefits','Premium','Status',''].map(h=>(
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(m => {
                  const sc = MEMBER_STATUS[m.status] || MEMBER_STATUS['Active']
                  const fullName = [m.memberName, m.surname].filter(Boolean).join(' ')
                  return (
                    <tr key={m.id} onClick={()=>setSelected(m)}
                      style={{ borderBottom:'1px solid #f3f4f6', cursor:'pointer', transition:'background .1s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
                      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600, color:T.text }}>{fullName}</td>
                      <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:12, color:T.blue }}>{m.payrollNumber||'—'}</td>
                      <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11, color:T.gray }}>{m.idNumber||'—'}</td>
                      <td style={{ padding:'10px 12px', fontSize:12 }}>{m.benefitCategory||'—'}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex', gap:3 }}>
                          {[['PF',m.providentFund],['GLA',m.gla],['PHI',m.phi],['Med',m.medical]].map(([l,v])=>(
                            <span key={l} style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4, background:v?'#f0fdf4':'#f3f4f6', color:v?T.green:'#9ca3af' }}>{l}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:12, fontWeight:700, color:T.green }}>
                        {m.monthlyPremium ? `R${m.monthlyPremium}` : '—'}
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>
                          {m.status}
                        </span>
                      </td>
                      <td style={{ padding:'10px 12px' }}><Icon name="chevron_r" size={14} color={T.border}/></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadScheduleModal
          employers={employers}
          onClose={() => setShowUpload(false)}
          onLoad={(newMembers) => { onLoadMembers(newMembers); setShowUpload(false) }}
        />
      )}

      {/* Member detail */}
      {selectedMember && (
        <MemberDetail
          member={selectedMember}
          employers={employers}
          currentUser={currentUser}
          onClose={() => setSelected(null)}
          onUpdate={(updated) => { onUpdateMember(updated); setSelected(updated) }}
        />
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// UPLOAD BILLING SCHEDULE MODAL
// ═════════════════════════════════════════════════════════════════════════════
function UploadScheduleModal({ employers, onClose, onLoad }) {
  const [employerId, setEmpId] = useState(employers[0]?.id || '')
  const [file, setFile]        = useState(null)
  const [preview, setPreview]  = useState([])
  const [parsed, setParsed]    = useState([])
  const [step, setStep]        = useState(1)  // 1=select, 2=preview, 3=confirm

  function handleFile(f) {
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const text    = e.target.result
      const members = parseBillingSchedule(text, employerId, f.name)
      setParsed(members)
      setPreview(members.slice(0, 5))
      setStep(2)
    }
    reader.readAsText(f)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:14, width:'min(640px,100%)', maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:16, fontWeight:700, color:T.text }}>Upload Billing Schedule</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:T.gray }}>×</button>
        </div>

        <div style={{ padding:22 }}>
          {step === 1 && (
            <div>
              {/* Employer selector */}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase', display:'block', marginBottom:6 }}>Employer</label>
                <select value={employerId} onChange={e=>setEmpId(e.target.value)} style={selectSt}>
                  {employers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              {/* Format note */}
              <div style={{ background:'#f0f7ff', border:'1px solid #bfdbfe', borderRadius:9, padding:'10px 13px', marginBottom:16, fontSize:12, color:'#374151', lineHeight:1.6 }}>
                <strong style={{ color:T.blue }}>Accepted formats:</strong> CSV or tab-delimited text file.<br/>
                <strong>Required columns:</strong> Member Name · Payroll Number · ID Number · Category · Premium<br/>
                <strong>Optional:</strong> Surname · Benefits (PF/GLA/PHI/Medical) · Status · Effective Date
              </div>

              {/* Drop zone */}
              <label style={{ display:'block', border:`2px dashed ${T.border}`, borderRadius:10, padding:'32px 20px', textAlign:'center', cursor:'pointer', background:'#fafafa' }}
                onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=T.orange}}
                onDragLeave={e=>{e.currentTarget.style.borderColor=T.border}}
                onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=T.border;handleFile(e.dataTransfer.files[0])}}>
                <input type="file" accept=".csv,.txt,.tsv" onChange={e=>handleFile(e.target.files[0])} style={{ display:'none' }}/>
                <div style={{ fontSize:36, marginBottom:10 }}>📊</div>
                <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:4 }}>Drop billing schedule here</div>
                <div style={{ fontSize:12, color:T.gray }}>CSV or tab-delimited · or click to browse</div>
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:9, padding:'12px 14px', marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.green }}>
                  {parsed.length} members found in {file?.name}
                </div>
                <div style={{ fontSize:11, color:'#374151', marginTop:2 }}>Review the first 5 rows below, then confirm to load all members.</div>
              </div>

              {/* Preview table */}
              <div style={{ overflowX:'auto', marginBottom:16 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#f9fafb' }}>
                      {['Name','Payroll No.','ID Number','Category','Premium','Status'].map(h=>(
                        <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((m,i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #f3f4f6' }}>
                        <td style={{ padding:'7px 10px', fontWeight:600 }}>{[m.memberName,m.surname].filter(Boolean).join(' ')}</td>
                        <td style={{ padding:'7px 10px', fontFamily:'monospace', color:T.blue }}>{m.payrollNumber||'—'}</td>
                        <td style={{ padding:'7px 10px', fontFamily:'monospace', color:T.gray }}>{m.idNumber||'—'}</td>
                        <td style={{ padding:'7px 10px' }}>{m.benefitCategory}</td>
                        <td style={{ padding:'7px 10px', fontFamily:'monospace', color:T.green }}>{m.monthlyPremium?`R${m.monthlyPremium}`:'—'}</td>
                        <td style={{ padding:'7px 10px' }}>{m.status}</td>
                      </tr>
                    ))}
                    {parsed.length > 5 && (
                      <tr><td colSpan={6} style={{ padding:'7px 10px', fontSize:11, color:T.gray, textAlign:'center', fontStyle:'italic' }}>…and {parsed.length-5} more members</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <Btn variant="secondary" onClick={()=>setStep(1)}>← Back</Btn>
                <Btn onClick={()=>onLoad(parsed)}>Load {parsed.length} Members</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MEMBER DETAIL SLIDE-OVER
// ═════════════════════════════════════════════════════════════════════════════
function MemberDetail({ member, employers, currentUser, onClose, onUpdate }) {
  const emp     = employers.find(e => e.id === member.employerId)
  const fullName = [member.memberName, member.surname].filter(Boolean).join(' ')
  const sc       = MEMBER_STATUS[member.status] || MEMBER_STATUS['Active']
  const isBilling = ['billing_admin','general_manager'].includes(currentUser.role)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{ width:'min(560px,100vw)', height:'100vh', background:'#fff', display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,0.15)', animation:'slideInRight .22s ease' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px', background:T.navy, borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'#fff', marginBottom:4 }}>{fullName}</div>
            <div style={{ display:'flex', gap:7, alignItems:'center' }}>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:sc.bg, color:sc.color }}>{member.status}</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{emp?.name||'—'}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', color:'#fff', fontSize:18 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:14 }}>

          {/* Member details */}
          <div style={{ background:'#f9fafb', borderRadius:10, padding:14, border:`1px solid ${T.border}` }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                ['Payroll Number',   member.payrollNumber||'—'],
                ['ID Number',        member.idNumber||'—'],
                ['Benefit Category', member.benefitCategory||'—'],
                ['Monthly Premium',  member.monthlyPremium?`R${member.monthlyPremium}`:'—'],
                ['Effective Date',   member.effectiveDate||'—'],
                ['Source File',      member.sourceFile||'—'],
              ].map(([k,v])=>(
                <div key={k}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', marginBottom:3 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, overflow:'hidden' }}>
            <div style={{ padding:'9px 14px', background:'#f9fafb', borderBottom:`1px solid ${T.border}`, fontSize:12, fontWeight:700, color:T.text }}>Benefits</div>
            <div style={{ padding:'12px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                ['Provident Fund', member.providentFund],
                ['Group Life (GLA)', member.gla],
                ['Disability (PHI)', member.phi],
                ['Medical Aid', member.medical],
              ].map(([l,v])=>(
                <div key={l} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:v?'#f0fdf4':'#f9fafb', borderRadius:7, border:`1px solid ${v?'#bbf7d0':T.border}` }}>
                  <span style={{ fontSize:16 }}>{v?'✅':'❌'}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:v?T.green:T.gray }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Billing admin actions */}
          {isBilling && member.status === 'Active' && (
            <div style={{ background:'#f9fafb', border:`1px solid ${T.border}`, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:10 }}>Billing Actions</div>
              <div style={{ fontSize:11, color:T.gray, marginBottom:10, lineHeight:1.5 }}>
                All changes require approval before updating the register.
              </div>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                <button onClick={()=>onUpdate({...member, status:'Pending Exit'})}
                  style={{ padding:'7px 14px', background:'#fff1f2', border:'1px solid #fecaca', borderRadius:7, color:T.red, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  Mark Exit
                </button>
                <button onClick={()=>onUpdate({...member, status:'Pending Amendment'})}
                  style={{ padding:'7px 14px', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:7, color:T.purple, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  Mark Amendment
                </button>
              </div>
            </div>
          )}

          {/* Approve pending actions */}
          {isBilling && member.status.startsWith('Pending') && (
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:8 }}>
                {member.status} — awaiting approval
              </div>
              <div style={{ display:'flex', gap:7 }}>
                <button onClick={()=>onUpdate({...member, status: member.status==='Pending Exit'?'Exited':'Active'})}
                  style={{ padding:'7px 14px', background:T.green, border:'none', borderRadius:7, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  ✓ Approve
                </button>
                <button onClick={()=>onUpdate({...member, status:'Active'})}
                  style={{ padding:'7px 14px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:7, color:T.gray, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                  Decline
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}
