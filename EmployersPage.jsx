import { EMPLOYERS } from '../data.js'

export default function EmployersPage({ requests, onNavigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn .3s ease' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Employer Groups</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {EMPLOYERS.map(emp => {
          const empReqs  = requests.filter(r => r.employerId === emp.id)
          const open     = empReqs.filter(r => !['Completed', 'Closed'].includes(r.status)).length
          const escalated= empReqs.filter(r => r.status === 'Escalated').length
          return (
            <div
              key={emp.id}
              onClick={() => onNavigate('requests', { employer: emp.name })}
              style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d6bc4'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(29,78,216,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#1d4ed8' }}>
                  {emp.name[0]}
                </div>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: emp.status === 'active' ? '#f0fdf4' : '#fffbeb', color: emp.status === 'active' ? '#15803d' : '#b45309', fontWeight: 700 }}>
                  {emp.status}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 2 }}>{emp.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>{emp.industry}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[['Members', emp.members.toLocaleString()], ['Open', open], ['Escalated', escalated]].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'center', padding: '8px 0', background: '#f9fafb', borderRadius: 6 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: l === 'Escalated' && escalated > 0 ? '#dc2626' : '#111827' }}>{v}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>Consultant: {emp.consultant}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
