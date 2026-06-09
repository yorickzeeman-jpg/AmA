import { USERS } from '../data.js'
import { Avatar } from '../components.jsx'

const ROLE_COLORS = {
  super_admin: '#1e3a5f', ops_manager: '#1e3a5f',
  consultant: '#2d6bc4', admin: '#2d6bc4',
  employer_hr: '#059669', employer_payroll: '#059669',
}

export default function LoginPage({ onLogin }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f2444 0%, #1e3a5f 60%, #2d5f8a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif", padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 48,
        width: 'min(440px, 100%)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        animation: 'fadeIn .3s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 14,
            background: 'linear-gradient(135deg, #1e3a5f, #2d6bc4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>BenefitsPro</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Employer Services Portal</div>
        </div>

        {/* Role selector */}
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
          Sign in as
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(USERS).map(([key, u]) => (
            <button
              key={key}
              onClick={() => onLogin(u)}
              style={{
                padding: '12px 16px', background: '#f9fafb',
                border: '1px solid #e5e7eb', borderRadius: 10,
                cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0f7ff'; e.currentTarget.style.borderColor = '#bfdbfe' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb' }}
            >
              <Avatar initials={u.avatar} size={36} color={ROLE_COLORS[key]} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{u.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  {u.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  {u.employer ? ` · ${u.employer}` : ''}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#d1d5db', marginTop: 24 }}>
          Demo portal · All data is illustrative
        </div>
      </div>
    </div>
  )
}
