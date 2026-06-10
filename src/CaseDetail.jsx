import { T } from '../data.js'
import { Icon, Empty, Card, KPI } from '../ui.jsx'

export default function EmployersPage({ employers, users, cases, onNav }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'fadeIn .3s ease' }}>
      <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>Employer Groups</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:14 }}>
        {employers.map(emp => {
          const con = users.find(u => u.id===emp.consultant)
          const empCases = cases.filter(c => c.employerId===emp.id)
          const open = empCases.filter(c => !['Completed','Closed'].includes(c.status)).length
          const escalated = empCases.filter(c => c.escalated).length
          const completed = empCases.filter(c => c.status==='Completed').length
          return (
            <div key={emp.id}
              onClick={() => onNav('cases',{employer:emp.id})}
              style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, padding:18, cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.green; e.currentTarget.style.boxShadow='0 4px 16px rgba(26,61,43,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.boxShadow='none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ width:42, height:42, borderRadius:10, background:'#f0f7f3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:T.green }}>{emp.name[0]}</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {emp.portal && <span style={{ fontSize:9, fontWeight:700, color:T.blue, background:'#eff6ff', padding:'2px 6px', borderRadius:20 }}>PORTAL</span>}
                  <span style={{ fontSize:9, fontWeight:700, color:emp.status==='active'?'#059669':T.amber, background:emp.status==='active'?'#f0fdf4':'#fffbeb', padding:'2px 6px', borderRadius:20 }}>
                    {emp.status?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{emp.name}</div>
              <div style={{ fontSize:11, color:T.gray, marginBottom:12 }}>{emp.number} · {emp.industry}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6, marginBottom:10 }}>
                {[['Members',emp.members.toLocaleString()],['Open',open],['Done',completed],['Esc',escalated]].map(([l,v]) => (
                  <div key={l} style={{ textAlign:'center', padding:'7px 0', background:'#f9fafb', borderRadius:6 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:l==='Esc'&&escalated>0?T.red:T.text }}>{v}</div>
                    <div style={{ fontSize:9, color:T.gray, fontWeight:700, textTransform:'uppercase' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, color:T.gray }}>Consultant: {con?.name||'Unassigned'}</div>
            </div>
          )
        })}
        {employers.length===0 && <Empty message="No employers configured." />}
      </div>
    </div>
  )
}
