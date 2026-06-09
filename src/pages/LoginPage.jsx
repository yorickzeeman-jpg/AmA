import { INITIAL_USERS, ROLES, T } from '../data.js'
import { Avatar, RoleBadge } from '../ui.jsx'

export default function LoginPage({ onLogin }) {
  return (
    <div style={{ minHeight:'100vh', background:`linear-gradient(145deg,${T.green} 0%,#0d2318 100%)`, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'40px 44px', width:'min(440px,100%)', boxShadow:'0 28px 80px rgba(0,0,0,0.35)', animation:'scaleIn .3s ease' }}>
        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:T.green, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <span style={{ fontWeight:800, fontSize:28, color:T.gold, fontFamily:'serif', lineHeight:1 }}>A</span>
          </div>
          <div style={{ fontSize:20, fontWeight:800, color:T.green, letterSpacing:'-0.5px' }}>AEB Portal</div>
          <div style={{ fontSize:12, color:T.gray, marginTop:3 }}>Employer Services Platform</div>
          <div style={{ fontSize:11, color:T.gray, marginTop:2 }}>Powered by Amadwala Employee Benefits</div>
        </div>

        <div style={{ textAlign:'center', marginBottom:18, paddingBottom:18, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:4 }}>Welcome to AEB Portal</div>
          <div style={{ fontSize:12, color:T.textSub }}>Sign in to access the Employer Services Platform</div>
        </div>

        <div style={{ fontSize:12, fontWeight:600, color:T.textSub, marginBottom:10 }}>Select a role to demo</div>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {INITIAL_USERS.map(u => (
            <button key={u.id} onClick={() => onLogin(u)}
              style={{ padding:'10px 14px', background:'#f9fafb', border:`1px solid ${T.border}`, borderRadius:10, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:12, transition:'all .12s' }}
              onMouseEnter={e => { e.currentTarget.style.background='#f0f7f3'; e.currentTarget.style.borderColor='#a7c9b5' }}
              onMouseLeave={e => { e.currentTarget.style.background='#f9fafb'; e.currentTarget.style.borderColor=T.border }}>
              <Avatar initials={u.avatar} size={34} bg={ROLES.find(r=>r.id===u.role)?.color||T.green} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{u.name}</div>
                <div style={{ fontSize:11, color:T.gray }}>{u.email}</div>
              </div>
              <RoleBadge roleId={u.role} />
            </button>
          ))}
        </div>
        <div style={{ textAlign:'center', fontSize:11, color:'#d1d5db', marginTop:20 }}>Demo platform · all data is illustrative</div>
      </div>
    </div>
  )
}
