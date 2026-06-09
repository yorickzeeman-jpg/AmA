import { T } from './data.js'
import { Icon, Avatar } from './ui.jsx'

const NAV = [
  { id:'dashboard',  label:'Dashboard',      icon:'dashboard' },
  { id:'cases',      label:'Cases',           icon:'cases'     },
  { id:'employers',  label:'Employers',       icon:'employers' },
  { id:'reports',    label:'Reports',         icon:'reports'   },
]
const ADMIN_NAV = [
  { id:'admin_users',     label:'User Management',     icon:'users'    },
  { id:'admin_roles',     label:'Roles & Permissions', icon:'settings' },
  { id:'admin_categories', label:'Category Management', icon:'workflow' },
  { id:'admin_casetypes', label:'Case Type Config',    icon:'workflow' },
  { id:'admin_employers', label:'Employer Management', icon:'employers'},
]

export default function Sidebar({ user, page, onNav, onLogout, open }) {
  const isMaster = user.role === 'master_admin'
  const isInternal = !['employer_admin','employer_user'].includes(user.role)

  return (
    <div style={{ width:open?232:56, background:T.green, transition:'width .2s ease', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
      {/* Logo */}
      <div style={{ padding:'18px 14px', borderBottom:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:30, height:30, borderRadius:8, background:T.gold, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontWeight:800, fontSize:16, color:T.green, fontFamily:'serif' }}>A</span>
        </div>
        {open && (
          <div>
            <div style={{ color:'#fff', fontWeight:800, fontSize:13, letterSpacing:'-0.3px', lineHeight:1.1 }}>AEB Portal</div>
            <div style={{ color:'rgba(255,255,255,0.45)', fontSize:9, fontWeight:600, letterSpacing:'1px' }}>EMPLOYER SERVICES</div>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav style={{ flex:1, padding:'10px 7px', overflowY:'auto' }}>
        {(isInternal ? NAV : NAV.slice(0,2)).map(item => (
          <NavBtn key={item.id} item={item} active={page===item.id} onClick={() => onNav(item.id)} open={open} />
        ))}

        {isMaster && (
          <>
            {open && <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'1px', padding:'14px 8px 6px', textTransform:'uppercase' }}>Administration</div>}
            {!open && <div style={{ height:1, background:'rgba(255,255,255,0.1)', margin:'8px 0' }} />}
            {ADMIN_NAV.map(item => (
              <NavBtn key={item.id} item={item} active={page===item.id} onClick={() => onNav(item.id)} open={open} admin />
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div style={{ padding:'10px 7px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', marginBottom:2 }}>
          <Avatar initials={user.avatar} size={28} bg={T.gold} />
          {open && (
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:'#fff', fontSize:11, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name}</div>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:9, textTransform:'capitalize' }}>{user.role.replace(/_/g,' ')}</div>
            </div>
          )}
        </div>
        <button onClick={onLogout} style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:'7px 10px', borderRadius:7, background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer' }}>
          <Icon name="logout" size={15} color="rgba(255,255,255,0.4)" />
          {open && <span style={{ fontSize:11 }}>Sign out</span>}
        </button>
      </div>
    </div>
  )
}

function NavBtn({ item, active, onClick, open, admin }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:7, background:active?'rgba(255,255,255,0.12)':'none', border:'none', color:active?'#fff':'rgba(255,255,255,0.55)', cursor:'pointer', marginBottom:1, textAlign:'left', whiteSpace:'nowrap', overflow:'hidden', transition:'all .12s' }}>
      <Icon name={item.icon} size={16} color={active?(admin?T.gold:'#fff'):'rgba(255,255,255,0.55)'} />
      {open && <span style={{ fontSize:12, fontWeight:active?700:400 }}>{item.label}</span>}
    </button>
  )
}
