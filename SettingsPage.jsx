import { Icon } from '../components.jsx'

const SETTINGS = [
  { title: 'Users & Access',       desc: 'Manage internal users, roles and permissions',                  icon: 'user'     },
  { title: 'SLA Configuration',    desc: 'Define SLA rules per service type and priority level',          icon: 'sla'      },
  { title: 'Notification Rules',   desc: 'Configure email and in-app notification triggers',              icon: 'bell'     },
  { title: 'Audit Configuration',  desc: 'Audit log retention and export settings',                       icon: 'timeline' },
  { title: 'Employer Management',  desc: 'Add, edit or deactivate employer groups',                       icon: 'employers'},
  { title: 'Service Types',        desc: 'Manage request categories and types',                           icon: 'requests' },
]

export default function SettingsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn .3s ease' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Settings</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {SETTINGS.map(({ title, desc, icon }) => (
          <div
            key={title}
            style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#bfdbfe' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff';    e.currentTarget.style.borderColor = '#e5e7eb' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={icon} size={22} color="#1d4ed8" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#111827', marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{desc}</div>
            </div>
            <Icon name="chevron_right" size={18} color="#d1d5db" />
          </div>
        ))}
      </div>
    </div>
  )
}
