import { useState } from 'react'
import { STATUSES, REQUEST_TYPES } from './data.js'
import { Icon, Badge, CategoryBadge, SLAIndicator } from './components.jsx'

const TYPE_ICON  = { submitted: 'requests', assign: 'user', info: 'bell', upload: 'attach', progress: 'sla', escalate: 'escalate', complete: 'check' }
const TYPE_COLOR = { submitted: '#3b82f6', assign: '#8b5cf6', info: '#f59e0b', upload: '#06b6d4', progress: '#10b981', escalate: '#ef4444', complete: '#059669' }

function Timeline({ events }) {
  return (
    <div style={{ padding: '8px 0' }}>
      {events.map((ev, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 20, position: 'relative' }}>
          {i < events.length - 1 && (
            <div style={{ position: 'absolute', left: 17, top: 36, width: 2, height: 'calc(100% + 4px)', background: '#e5e7eb' }} />
          )}
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: (TYPE_COLOR[ev.type] || '#6b7280') + '18',
            border: `2px solid ${TYPE_COLOR[ev.type] || '#6b7280'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={TYPE_ICON[ev.type] || 'info'} size={15} color={TYPE_COLOR[ev.type] || '#6b7280'} />
          </div>
          <div style={{ flex: 1, paddingTop: 6 }}>
            <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{ev.action}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{ev.user} · {ev.time}, {ev.date}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RequestDetail({ request, onClose, onUpdate, currentUser }) {
  const [tab, setTab] = useState('overview')
  const [newNote, setNewNote] = useState('')
  const [status, setStatus] = useState(request.status)

  const isInternal = ['super_admin', 'ops_manager', 'consultant', 'admin'].includes(currentUser.role)
  const tabs = ['overview', 'timeline', 'documents', 'notes', 'audit']

  function handleStatusChange(s) {
    setStatus(s)
    onUpdate({ ...request, status: s })
  }

  function handleAddNote() {
    if (!newNote.trim()) return
    const updated = {
      ...request,
      notes: [...request.notes, {
        user: currentUser.name,
        date: new Date().toISOString().split('T')[0],
        text: newNote.trim(),
      }],
    }
    onUpdate(updated)
    setNewNote('')
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 'min(720px, 100vw)', height: '100vh',
        background: '#fff', display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        animation: 'slideIn .2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#6b7280', fontWeight: 700 }}>{request.ref}</span>
                <Badge status={request.status} />
                <Badge status={request.priority} type="priority" />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{request.type}</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>🏢 {request.employer}</span>
                <span style={{ fontSize: 13, color: '#6b7280' }}>👤 {request.contact}</span>
                <span style={{ fontSize: 13, color: '#6b7280' }}>📅 Created {request.created}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}>
              <Icon name="close" size={22} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 24px', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '12px 16px', background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid #1e3a5f' : '2px solid transparent',
              color: tab === t ? '#1e3a5f' : '#6b7280',
              fontWeight: tab === t ? 700 : 500, fontSize: 13,
              cursor: 'pointer', textTransform: 'capitalize',
              marginBottom: -1, whiteSpace: 'nowrap',
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* Overview */}
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Request Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {[
                    ['Category',    <CategoryBadge category={request.category} />],
                    ['Assigned To', request.assigned || 'Unassigned'],
                    ['SLA Due',     <><SLAIndicator sla={request.sla} /> <span style={{ color: '#9ca3af', fontSize: 11 }}>({request.sla})</span></>],
                    ['Created',     request.created],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{k}</div>
                      <div style={{ fontSize: 14, color: '#111827' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Description</div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>{request.description}</p>
              </div>

              {isInternal && (
                <div style={{ background: '#f0f9ff', borderRadius: 10, padding: 16, border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', marginBottom: 12 }}>Update Status</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => handleStatusChange(s)} style={{
                        padding: '6px 14px', borderRadius: 20,
                        border: `1px solid ${status === s ? '#1e3a5f' : '#d1d5db'}`,
                        background: status === s ? '#1e3a5f' : '#fff',
                        color: status === s ? '#fff' : '#374151',
                        fontSize: 12, fontWeight: status === s ? 700 : 500,
                        cursor: 'pointer',
                      }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          {tab === 'timeline' && <Timeline events={request.timeline} />}

          {/* Documents */}
          {tab === 'documents' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 16 }}>
                Supporting Documents ({request.documents.length})
              </div>
              {request.documents.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: 32 }}>No documents attached yet.</div>
              )}
              {request.documents.map((doc, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', background: '#f9fafb',
                  borderRadius: 8, marginBottom: 8, border: '1px solid #e5e7eb',
                }}>
                  <Icon name="attach" size={20} color="#6b7280" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{doc.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{doc.size} · Uploaded {doc.date}</div>
                  </div>
                  <button style={{
                    background: 'none', border: '1px solid #e5e7eb',
                    borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                    color: '#374151', fontSize: 12,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Icon name="download" size={14} /> Download
                  </button>
                </div>
              ))}
              <div style={{
                marginTop: 16, padding: 20, border: '2px dashed #d1d5db',
                borderRadius: 8, textAlign: 'center', color: '#9ca3af', cursor: 'pointer', fontSize: 13,
              }}>
                <Icon name="attach" size={20} color="#d1d5db" />
                <div style={{ marginTop: 6 }}>Click to upload documents</div>
              </div>
            </div>
          )}

          {/* Notes */}
          {tab === 'notes' && (
            <div>
              {request.notes.map((n, i) => (
                <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{n.user}</div>
                  <div style={{ fontSize: 12, color: '#a16207', marginBottom: 6 }}>{n.date}</div>
                  <div style={{ fontSize: 14, color: '#374151' }}>{n.text}</div>
                </div>
              ))}
              {request.notes.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, marginBottom: 20 }}>No notes yet.</div>
              )}
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note..."
                style={{ width: '100%', minHeight: 80, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
              />
              <button onClick={handleAddNote} style={{
                marginTop: 8, padding: '8px 16px',
                background: '#1e3a5f', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Icon name="send" size={14} color="#fff" /> Add Note
              </button>
            </div>
          )}

          {/* Audit */}
          {tab === 'audit' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Audit Log</div>
              {[...request.timeline].reverse().map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace', minWidth: 140 }}>{ev.date} {ev.time}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, color: '#374151' }}>{ev.action}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}> — {ev.user}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
