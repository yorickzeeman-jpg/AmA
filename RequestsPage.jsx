import { useState, useEffect } from 'react'
import { STATUSES, PRIORITIES, REQUEST_TYPES, EMPLOYERS } from './data.js'
import { Icon, Badge, CategoryBadge, SLAIndicator } from './components.jsx'

export default function RequestsPage({ requests, currentUser, onOpenRequest, onNewRequest, initialFilters }) {
  const isExternal = ['employer_hr', 'employer_payroll'].includes(currentUser.role)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status: '', priority: '', category: '', employer: '', ...initialFilters })

  useEffect(() => {
    if (initialFilters) setFilters(f => ({ ...f, ...initialFilters }))
  }, [initialFilters])

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))
  const clearFilters = () => setFilters({ status: '', priority: '', category: '', employer: '' })
  const hasFilters = Object.values(filters).some(Boolean)

  const visible = requests.filter(r => {
    if (isExternal && r.employer !== currentUser.employer) return false
    if (search && !r.ref.includes(search.toUpperCase()) && !r.type.toLowerCase().includes(search.toLowerCase()) && !r.employer.toLowerCase().includes(search.toLowerCase())) return false
    if (filters.status   && r.status   !== filters.status)   return false
    if (filters.priority && r.priority !== filters.priority) return false
    if (filters.category && r.category !== filters.category) return false
    if (filters.employer && r.employer !== filters.employer) return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn .3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Service Requests</h1>
        <button onClick={onNewRequest} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', background: '#1e3a5f', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
        }}>
          <Icon name="plus" size={16} color="#fff" /> New Request
        </button>
      </div>

      {/* Filters bar */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', border: '1px solid #e5e7eb', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Icon name="filter" size={16} color="#6b7280" />
        <div style={{ position: 'relative', flex: '0 0 200px' }}>
          <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <Icon name="search" size={14} color="#9ca3af" />
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ width: '100%', padding: '6px 8px 6px 28px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
          />
        </div>
        {[
          ['status',   'Status',    STATUSES],
          ['priority', 'Priority',  PRIORITIES],
          ['category', 'Category',  Object.entries(REQUEST_TYPES).map(([k, v]) => [k, v.label])],
          ...(!isExternal ? [['employer', 'Employer', EMPLOYERS.map(e => e.name)]] : []),
        ].map(([field, label, opts]) => (
          <select
            key={field}
            value={filters[field]}
            onChange={e => setF(field, e.target.value)}
            style={{
              padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6,
              fontSize: 12, background: filters[field] ? '#eff6ff' : '#fff',
              color: filters[field] ? '#1d4ed8' : '#374151',
            }}
          >
            <option value="">All {label}s</option>
            {opts.map(o =>
              Array.isArray(o)
                ? <option key={o[0]} value={o[0]}>{o[1]}</option>
                : <option key={o}>{o}</option>
            )}
          </select>
        ))}
        {hasFilters && (
          <button onClick={clearFilters} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Clear filters
          </button>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
          {visible.length} request{visible.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Reference', 'Type & Category', 'Employer', 'Status', 'Priority', 'Assigned', 'SLA', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr
                  key={r.id}
                  onClick={() => onOpenRequest(r)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #f3f4f6', transition: 'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#6b7280', fontWeight: 700 }}>{r.ref}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 3 }}>{r.type}</div>
                    <CategoryBadge category={r.category} />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{r.employer}</td>
                  <td style={{ padding: '12px 16px' }}><Badge status={r.status} /></td>
                  <td style={{ padding: '12px 16px' }}><Badge status={r.priority} type="priority" /></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>
                    {r.assigned || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>Unassigned</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}><SLAIndicator sla={r.sla} /></td>
                  <td style={{ padding: '12px 16px' }}><Icon name="chevron_right" size={16} color="#d1d5db" /></td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                    No requests match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
