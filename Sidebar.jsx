import { Icon, Avatar } from '../components.jsx'

const NAV_INTERNAL = [
  { id: 'dashboard',  label: 'Dashboard',        icon: 'dashboard'  },
  { id: 'requests',   label: 'Service Requests',  icon: 'requests'   },
  { id: 'employers',  label: 'Employers',          icon: 'employers'  },
  { id: 'analytics',  label: 'Analytics',          icon: 'analytics'  },
]
const NAV_MGMT  = [{ id: 'settings', label: 'Settings', icon: 'settings' }]
const NAV_EXTERNAL = [
  { id: 'dashboard', label: 'Overview',          icon: 'dashboard' },
  { id: 'requests',  label: 'My Requests',       icon: 'requests'  },
]

export default function Sidebar({ currentUser, page, onNavigate, onLogout, open }) {
  const isExternal = ['employer_hr', 'employer_payroll'].includes(currentUser.role)
  const canSettings = ['super_admin', 'ops_manager'].includes(currentUser.role)
  const navItems = isExternal ? NAV_EXTERNAL : [...NAV_INTERNAL, ...(canSettings ? NAV_MGMT : [])]

  return (
    <div style={{
      width: open ? 240 : 60,
      background: '#0f2444',
      transition: 'width 0.2s ease',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2d6bc4, #4f9cf9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {open && (
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px' }}>BenefitsPro</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600, letterSpacing: '0.5px' }}>SERVICES PORTAL</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: page === item.id ? 'rgba(255,255,255,0.1)' : 'none',
              border: 'none',
              color: page === item.id ? '#fff' : 'rgba(255,255,255,0.55)',
              cursor: 'pointer', marginBottom: 2,
              textAlign: 'left', transition: 'all 0.15s',
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}
          >
            <Icon name={item.icon} size={18} color={page === item.id ? '#4f9cf9' : 'rgba(255,255,255,0.55)'} />
            {open && <span style={{ fontSize: 13, fontWeight: page === item.id ? 600 : 400 }}>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User + logout */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 4 }}>
          <Avatar initials={currentUser.avatar} size={30} color="#2d6bc4" />
          {open && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{currentUser.role.replace(/_/g, ' ')}</div>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', borderRadius: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
        >
          <Icon name="logout" size={16} color="rgba(255,255,255,0.4)" />
          {open && <span style={{ fontSize: 12 }}>Sign out</span>}
        </button>
      </div>
    </div>
  )
}
