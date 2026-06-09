import { useState } from 'react'
import { EMPLOYERS, REQUEST_TYPES, PRIORITIES } from './data.js'
import { Icon } from './components.jsx'

export default function NewRequestModal({ onClose, onSubmit, currentUser, preEmployer }) {
  const [form, setForm] = useState({
    employer: preEmployer || '',
    contact: currentUser.name,
    priority: 'Medium',
    category: '',
    type: '',
    description: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const types = form.category ? REQUEST_TYPES[form.category]?.types || [] : []

  function handleSubmit() {
    if (!form.employer || !form.category || !form.type || !form.description.trim()) {
      alert('Please complete all required fields.')
      return
    }
    onSubmit(form)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: 'min(560px, 100%)',
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        animation: 'fadeIn .2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>New Service Request</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <Icon name="close" size={22} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Employer */}
          <div>
            <label style={labelStyle}>Employer *</label>
            {preEmployer ? (
              <div style={readonlyStyle}>{preEmployer}</div>
            ) : (
              <select value={form.employer} onChange={e => set('employer', e.target.value)} style={selectStyle}>
                <option value="">Select employer</option>
                {EMPLOYERS.map(e => <option key={e.id}>{e.name}</option>)}
              </select>
            )}
          </div>

          {/* Contact */}
          <div>
            <label style={labelStyle}>Contact Person *</label>
            <input value={form.contact} onChange={e => set('contact', e.target.value)} style={inputStyle} />
          </div>

          {/* Priority */}
          <div>
            <label style={labelStyle}>Priority</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => set('priority', p)} style={{
                  flex: 1, padding: '8px', borderRadius: 8,
                  border: `1.5px solid ${form.priority === p ? '#1e3a5f' : '#e5e7eb'}`,
                  background: form.priority === p ? '#1e3a5f' : '#fff',
                  color: form.priority === p ? '#fff' : '#374151',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Service Category *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(REQUEST_TYPES).map(([key, cat]) => (
                <button key={key} onClick={() => set('category', key)} style={{
                  padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                  border: `2px solid ${form.category === key ? cat.color : '#e5e7eb'}`,
                  background: form.category === key ? cat.bg : '#fff',
                  color: form.category === key ? cat.color : '#374151',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          {form.category && (
            <div>
              <label style={labelStyle}>Service Type *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} style={selectStyle}>
                <option value="">Select type</option>
                {types.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label style={labelStyle}>Description *</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the request in detail..."
              style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
            />
          </div>

          <button onClick={handleSubmit} style={{
            padding: 13, background: '#1e3a5f', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14,
            fontWeight: 700, cursor: 'pointer',
          }}>
            Submit Request
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle = { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }
const inputStyle  = { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#fff' }
const selectStyle = { ...inputStyle, appearance: 'auto' }
const readonlyStyle = { padding: '9px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#374151' }
