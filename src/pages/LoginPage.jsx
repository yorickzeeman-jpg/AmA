import { useState } from 'react'
import { T } from '../data.js'
import { signIn, getStaffProfile } from '../supabase.js'

export default function LoginPage({ onLogin }) {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    if (!email || !password) { setError('Please enter your name and password.'); return }
    setError(''); setLoading(true)
    try {
      // Convert name to internal email format
      const internalEmail = email.trim().toLowerCase().replace(/\s+/g, '') + '@login'
      await signIn(internalEmail, password)
      const profile = await getStaffProfile(internalEmail)
      onLogin({
        id:     profile.id,
        name:   profile.name,
        email:  profile.email,
        role:   profile.role,
        avatar: profile.avatar || profile.name.split(' ').map(n=>n[0]).join('').slice(0,2),
        employer: profile.employer_id || null,
        status: profile.status,
      })
    } catch (err) {
      setError('Incorrect name or password. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(145deg,#07122a 0%,#0c1d3e 60%,#0f2347 100%)',
      display:'flex', flexDirection:'column',
      fontFamily:"'Inter',-apple-system,sans-serif",
      position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'fixed', right:'-80px', bottom:'-80px', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle,rgba(232,104,10,0.18) 0%,transparent 70%)', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', left:'-100px', top:'20%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(30,95,217,0.15) 0%,transparent 65%)', pointerEvents:'none' }}/>

      {/* Header */}
      <header style={{ height:58, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 40px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(7,18,42,0.7)', backdropFilter:'blur(12px)', position:'relative', zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:14, fontWeight:700, color:'#fff' }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#1e5fd9,#3b9eff)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="white" strokeWidth="1.5"/><path d="M10 6.5v3.5l2.5 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            Discovery
          </div>
          <div style={{ width:1, height:28, background:'rgba(255,255,255,0.15)' }}/>
          <div>
            <div style={{ fontSize:12, fontWeight:800, letterSpacing:'0.3px', color:'#fff' }}>
              <span style={{ color:'#3b9eff' }}>AMA</span><span style={{ color:T.orange }}>DWALA</span>
            </div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', letterSpacing:'1.5px', textTransform:'uppercase' }}>Employee Benefits</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'rgba(255,255,255,0.4)' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 8px rgba(34,197,94,0.6)' }}/>
          Secure Platform
        </div>
      </header>

      {/* Body */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', position:'relative', zIndex:5 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:40, maxWidth:860, width:'100%', alignItems:'start' }}>

          {/* Left hero */}
          <div style={{ paddingTop:20 }}>
            <div style={{ fontSize:'clamp(44px,6vw,68px)', fontWeight:900, lineHeight:0.95, letterSpacing:'-2px', marginBottom:10 }}>
              <span style={{ color:'#fff' }}>AEB </span>
              <span style={{ color:T.orange }}>Portal</span>
            </div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:18, fontWeight:500 }}>Employer Services Platform</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.4)', lineHeight:1.7, maxWidth:340, marginBottom:36 }}>
              Manage members, claims, billing and employer services from one secure platform.
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
              {['Member lifecycle management','Claims processing & tracking','Billing & reconciliation','Real-time SLA monitoring','Complete audit trail'].map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:9, fontSize:13, color:'rgba(255,255,255,0.45)' }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:T.orange, flexShrink:0 }}/>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Login card */}
          <div style={{ width:'min(390px,90vw)', background:'rgba(15,35,71,0.8)', backdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, boxShadow:'0 24px 64px rgba(0,0,0,0.5)', position:'relative', overflow:'hidden' }}>
            <div style={{ height:2, background:'linear-gradient(90deg,transparent,#e8680a 40%,#3b9eff 70%,transparent)' }}/>
            <div style={{ padding:'28px 28px 24px' }}>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ fontSize:20, fontWeight:700, color:'#fff', marginBottom:4 }}>Welcome to AEB Portal</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Sign in to access the Employer Services Platform</div>
              </div>

              {/* Name */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(139,164,200,0.8)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>Your Name</div>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(139,164,200,0.5)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </span>
                  <input value={email} onChange={e=>{setEmail(e.target.value);setError('')}} onKeyDown={e=>e.key==='Enter'&&handleSignIn()} type="text" placeholder="Enter your first name" autoComplete="username"
                    style={{ width:'100%', padding:'12px 12px 12px 40px', background:'rgba(255,255,255,0.06)', border:`1px solid ${error?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.1)'}`, borderRadius:9, color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(139,164,200,0.8)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>Password</div>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(139,164,200,0.5)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                  </span>
                  <input value={password} onChange={e=>{setPassword(e.target.value);setError('')}} onKeyDown={e=>e.key==='Enter'&&handleSignIn()} type={showPw?'text':'password'} placeholder="Enter your password" autoComplete="current-password"
                    style={{ width:'100%', padding:'12px 38px 12px 40px', background:'rgba(255,255,255,0.06)', border:`1px solid ${error?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.1)'}`, borderRadius:9, color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
                  <button onClick={()=>setShowPw(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(139,164,200,0.5)', display:'flex', padding:2 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d={showPw?"M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z":"M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"}/></svg>
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer' }}>
                  <div onClick={()=>setRemember(r=>!r)} style={{ width:15, height:15, borderRadius:4, background:remember?T.orange:'rgba(255,255,255,0.07)', border:`1px solid ${remember?T.orange:'rgba(255,255,255,0.18)'}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s', cursor:'pointer' }}>
                    {remember && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize:12, color:'rgba(139,164,200,0.7)' }}>Remember me</span>
                </label>
                <a href="#" style={{ fontSize:12, color:T.orange, textDecoration:'none' }}>Forgot Password?</a>
              </div>

              {error && (
                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#fca5a5', marginBottom:14 }}>
                  {error}
                </div>
              )}

              {/* Sign In button */}
              <button onClick={handleSignIn} disabled={loading} style={{ width:'100%', padding:'14px', background:loading?'rgba(232,104,10,0.6)':'linear-gradient(135deg,#e8680a,#c95500)', border:'none', borderRadius:9, color:'#fff', fontSize:14, fontWeight:700, letterSpacing:'0.5px', cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 20px rgba(232,104,10,0.3)', transition:'all .2s', fontFamily:'inherit' }}>
                {loading
                  ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="white" style={{animation:'spin 1s linear infinite'}}><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>Signing in…</>
                  : <><svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>Sign In</>
                }
              </button>

              <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid rgba(255,255,255,0.07)', textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.2)' }}>
                AEB Portal · Powered by Amadwala Employee Benefits
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign:'center', padding:'14px', borderTop:'1px solid rgba(255,255,255,0.05)', background:'rgba(7,18,42,0.8)', position:'relative', zIndex:5 }}>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>© 2024 Amadwala Employee Benefits. All rights reserved.</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
