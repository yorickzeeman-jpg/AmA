import { T } from './data.js'
import { Icon, Avatar } from './ui.jsx'

// Workspace-aware navigation — employer users see a simpler set
const INTERNAL_NAV = [
  { id:'dashboard',      label:'Dashboard',       icon:'dashboard' },
  { id:'cases',          label:'Employer Cases',  icon:'cases'     },
  { id:'internal_cases', label:'Internal Cases',  icon:'audit'     },
  { id:'email_intake',   label:'Case from Email', icon:'send'      },
  { id:'billing',        label:'Billing',         icon:'sla'       },
  { id:'employers',      label:'Employers',       icon:'employers' },
  { id:'reports',        label:'Reports',         icon:'reports'   },
  { id:'leandre_ai',    label:'Leandre AI',       icon:'dashboard' },
]
const EMPLOYER_NAV = [
  { id:'dashboard',  label:'Dashboard',      icon:'dashboard' },
  { id:'cases',      label:'My Cases',       icon:'cases'     },
]
const ADMIN_NAV = [
  { id:'admin_users',      label:'User Management',  icon:'users'    },
  { id:'admin_casetypes',  label:'Workflow Config',  icon:'workflow' },
  { id:'admin_sla',        label:'SLA Configuration',icon:'sla'      },
  { id:'admin_categories', label:'Categories',       icon:'filter'   },
  { id:'admin_allocation', label:'Allocation Rules', icon:'transfer' },
]

const ROLE_COLORS = {
  general_manager:'#e8680a',
  administrator:  '#1e5fd9',
  billing_admin:  '#7c3aed',
  employer_admin: '#0891b2',
  employer_user:  '#0891b2',
}

export default function Sidebar({ user, page, onNav, onLogout, open }) {
  const isEmployer = ['employer_admin','employer_user'].includes(user.role)
  const isGM       = user.role === 'general_manager'
  const isBilling  = user.role === 'billing_admin'
  const canEmailIntake = ['general_manager','administrator'].includes(user.role)
  const nav        = isEmployer ? EMPLOYER_NAV : INTERNAL_NAV.filter(item => {
    if (item.id === 'billing' && !isGM && !isBilling) return false
    if (item.id === 'leandre_ai' && !isGM && user.role !== 'administrator') return false
    if (item.id === 'benefit_profiles' && !isGM && user.role !== 'administrator') return false
    if (item.id === 'internal_cases' && isEmployer) return false
    if (item.id === 'email_intake' && !canEmailIntake) return false
    return true
  })

  return (
    <div style={{
      width:open?228:52, background:'#07122a',
      transition:'width .2s ease', display:'flex', flexDirection:'column',
      overflow:'hidden', flexShrink:0,
      borderRight:'1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <div style={{ padding:'16px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#e8680a,#c95500)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontWeight:900, fontSize:14, color:'#fff', fontFamily:'sans-serif' }}>A</span>
        </div>
        {open && (
          <div>
            <div style={{ color:'#fff', fontWeight:800, fontSize:13, letterSpacing:'-0.3px', lineHeight:1.1 }}>AEB Portal</div>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:9, fontWeight:600, letterSpacing:'1.5px', textTransform:'uppercase' }}>Employer Services</div>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav style={{ flex:1, padding:'8px 6px', overflowY:'auto' }}>
        {nav.map(item => (
          <NavBtn key={item.id} item={item} active={page===item.id} onClick={() => onNav(item.id)} open={open} />
        ))}

        {/* Admin section — GM only */}
        {isGM && (
          <>
            {open && <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'1.5px', padding:'14px 8px 5px', textTransform:'uppercase' }}>Administration</div>}
            {!open && <div style={{ height:1, background:'rgba(255,255,255,0.08)', margin:'8px 0' }} />}
            {ADMIN_NAV.map(item => (
              <NavBtn key={item.id} item={item} active={page===item.id} onClick={() => onNav(item.id)} open={open} accent />
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div style={{ padding:'8px 6px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 8px', marginBottom:2 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:ROLE_COLORS[user.role]||T.orange, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>
            {user.avatar}
          </div>
          {open && (
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:'#fff', fontSize:11, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name}</div>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:9, textTransform:'capitalize' }}>{user.role.replace(/_/g,' ')}</div>
            </div>
          )}
        </div>
        <button onClick={onLogout} style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:'7px 8px', borderRadius:7, background:'none', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', fontFamily:'inherit' }}>
          <Icon name="logout" size={14} color="rgba(255,255,255,0.35)" />
          {open && <span style={{ fontSize:11 }}>Sign out</span>}
        </button>
      </div>
    </div>
  )
}

function NavBtn({ item, active, onClick, open, accent }) {
  const activeColor = accent ? T.orange : '#fff'
  const iconColor   = active ? (accent ? T.orange : '#fff') : 'rgba(255,255,255,0.4)'
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:10, width:'100%',
      padding:'9px 8px', borderRadius:7,
      background:active ? (accent ? 'rgba(232,104,10,0.12)' : 'rgba(255,255,255,0.1)') : 'none',
      border:'none', color:active ? activeColor : 'rgba(255,255,255,0.45)',
      cursor:'pointer', marginBottom:1, textAlign:'left',
      whiteSpace:'nowrap', overflow:'hidden', transition:'all .12s',
      fontFamily:'inherit',
    }}
    onMouseEnter={e => !active && (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
    onMouseLeave={e => !active && (e.currentTarget.style.background = 'none')}>
      <Icon name={item.icon} size={15} color={iconColor} />
      {open && <span style={{ fontSize:12, fontWeight:active?700:400 }}>{item.label}</span>}
    </button>
  )
}
