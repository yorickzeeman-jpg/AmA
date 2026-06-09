import { KPICard, Badge, SLAIndicator, Icon, CategoryBadge } from '../components.jsx'
import { REQUEST_TYPES } from '../data.js'

export default function DashboardPage({ requests, currentUser, onOpenRequest, onNavigate, onNewRequest }) {
  const isExternal = ['employer_hr', 'employer_payroll'].includes(currentUser.role)
  const visible = isExternal ? requests.filter(r => r.employer === currentUser.employer) : requests

  const stats = {
    open:      visible.filter(r => !['Completed', 'Closed'].includes(r.status)).length,
    inProgress:visible.filter(r => r.status === 'In Progress').length,
    awaiting:  visible.filter(r => r.status === 'Awaiting Information').length,
    escalated: visible.filter(r => r.status === 'Escalated').length,
    completed: visible.filter(r => r.status === 'Completed').length,
    overdue:   visible.filter(r => {
      const d = Math.ceil((new Date(r.sla) - new Date()) / 86400000)
      return d < 0 && !['Completed', 'Closed'].includes(r.status)
    }).length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn .3s ease' }}>
      {/* Heading */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          {isExternal ? `${currentUser.employer} — Request Overview` : 'Operations Dashboard'}
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
          {new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <KPICard label="Open Requests"  value={stats.open}       icon="requests"  color="#3b82f6" trend={5}       />
        <KPICard label="In Progress"    value={stats.inProgress} icon="sla"        color="#8b5cf6"                />
        <KPICard label="Awaiting Info"  value={stats.awaiting}   icon="bell"       color="#f59e0b"                />
        <KPICard label="Escalated"      value={stats.escalated}  icon="escalate"   color="#ef4444"                />
        <KPICard label="Completed"      value={stats.completed}  icon="check"      color="#059669" sub="This month" />
        <KPICard label="SLA Breaches"   value={stats.overdue}    icon="warning"    color="#dc2626"                />
      </div>

      {/* Recent requests */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, color: '#111827' }}>Recent Requests</div>
          <button onClick={() => onNavigate('requests')} style={{ background: 'none', border: 'none', color: '#2d6bc4', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            View all →
          </button>
        </div>
        {visible.slice(0, 6).map(r => (
          <div
            key={r.id}
            onClick={() => onOpenRequest(r)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #f9fafb', cursor: 'pointer', transition: 'background .1s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#9ca3af', fontWeight: 700 }}>{r.ref}</span>
                <Badge status={r.status} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{r.type}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.employer} · {r.created}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <Badge status={r.priority} type="priority" />
              <SLAIndicator sla={r.sla} />
            </div>
            <Icon name="chevron_right" size={18} color="#d1d5db" />
          </div>
        ))}
        {visible.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No requests yet.</div>
        )}
      </div>

      {/* Category tiles — internal only */}
      {!isExternal && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {Object.entries(REQUEST_TYPES).map(([key, cat]) => {
            const count = requests.filter(r => r.category === key).length
            return (
              <div
                key={key}
                onClick={() => onNavigate('requests', { category: key })}
                style={{
                  background: '#fff', borderRadius: 10, padding: 16,
                  border: `1px solid ${cat.color}30`,
                  borderLeft: `4px solid ${cat.color}`,
                  cursor: 'pointer', transition: 'transform 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ fontSize: 24, fontWeight: 800, color: cat.color }}>{count}</div>
                <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, marginTop: 4 }}>{cat.label}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
