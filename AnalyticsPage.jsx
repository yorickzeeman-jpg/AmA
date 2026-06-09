import { STATUSES, PRIORITIES, REQUEST_TYPES, EMPLOYERS, STATUS_COLORS, PRIORITY_COLORS } from './data.js'

function Bar({ label, count, total, color }) {
  const pct = total ? (count / total) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{count}</span>
      </div>
      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width .5s ease' }} />
      </div>
    </div>
  )
}

export default function AnalyticsPage({ requests }) {
  const overdue = requests.filter(r => {
    const d = Math.ceil((new Date(r.sla) - new Date()) / 86400000)
    return d < 0 && !['Completed', 'Closed'].includes(r.status)
  }).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn .3s ease' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Analytics & Reporting</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* By Status */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: '#111827' }}>Requests by Status</div>
          {STATUSES.map(s => (
            <Bar key={s} label={s} count={requests.filter(r => r.status === s).length} total={requests.length} color={STATUS_COLORS[s]?.dot || '#6b7280'} />
          ))}
        </div>

        {/* By Category */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: '#111827' }}>Requests by Category</div>
          {Object.entries(REQUEST_TYPES).map(([key, cat]) => (
            <Bar key={key} label={cat.label} count={requests.filter(r => r.category === key).length} total={requests.length} color={cat.color} />
          ))}
        </div>

        {/* By Employer */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: '#111827' }}>Requests by Employer</div>
          {EMPLOYERS.map(emp => {
            const count = requests.filter(r => r.employerId === emp.id).length
            return (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#1d4ed8', flexShrink: 0 }}>
                  {emp.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#374151', marginBottom: 3 }}>{emp.name}</div>
                  <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${requests.length ? (count / requests.length) * 100 : 0}%`, background: '#2d6bc4', borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', minWidth: 20, textAlign: 'right' }}>{count}</div>
              </div>
            )
          })}
        </div>

        {/* Priority grid + SLA */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, marginBottom: 16, color: '#111827' }}>Priority Distribution</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {PRIORITIES.map(p => {
              const count = requests.filter(r => r.priority === p).length
              const cfg = PRIORITY_COLORS[p]
              return (
                <div key={p} style={{ background: cfg.bg, borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: cfg.color }}>{count}</div>
                  <div style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>{p}</div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 16, padding: 12, background: '#f0fdf4', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#15803d', fontWeight: 700 }}>
              SLA Compliance: {requests.length ? Math.round(((requests.length - overdue) / requests.length) * 100) : 100}%
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{overdue} breach{overdue !== 1 ? 'es' : ''} active</div>
          </div>
        </div>

      </div>
    </div>
  )
}
