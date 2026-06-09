import { useState } from 'react'
import { INITIAL_REQUESTS, genRef, EMPLOYERS } from './data.js'
import { Icon } from './components.jsx'
import Sidebar from './Sidebar.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import RequestsPage from './pages/RequestsPage.jsx'
import EmployersPage from './pages/EmployersPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import RequestDetail from './pages/RequestDetail.jsx'
import NewRequestModal from './pages/NewRequestModal.jsx'

export default function App() {
  const [currentUser, setCurrentUser]     = useState(null)
  const [page, setPage]                   = useState('dashboard')
  const [pageFilter, setPageFilter]       = useState({})
  const [requests, setRequests]           = useState(INITIAL_REQUESTS)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showNewRequest, setShowNewRequest]   = useState(false)
  const [sidebarOpen, setSidebarOpen]     = useState(true)

  const isExternal = currentUser && ['employer_hr', 'employer_payroll'].includes(currentUser.role)

  const stats = {
    overdue:  requests.filter(r => { const d = Math.ceil((new Date(r.sla) - new Date()) / 86400000); return d < 0 && !['Completed','Closed'].includes(r.status) }).length,
    escalated:requests.filter(r => r.status === 'Escalated').length,
  }

  function navigate(p, filter) {
    setPage(p)
    setPageFilter(filter || {})
  }

  function updateRequest(updated) {
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
    setSelectedRequest(updated)
  }

  function submitRequest(form) {
    const now = new Date()
    const newReq = {
      id: 'r' + Date.now(),
      ref: genRef(),
      employer: form.employer,
      employerId: EMPLOYERS.find(e => e.name === form.employer)?.id || '',
      category: form.category,
      type: form.type,
      status: 'Submitted',
      priority: form.priority,
      assigned: '',
      contact: form.contact,
      created: now.toISOString().split('T')[0],
      sla: (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().split('T')[0] })(),
      description: form.description,
      notes: [],
      documents: [],
      timeline: [{
        time: now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
        date: now.toISOString().split('T')[0],
        user: form.contact,
        action: 'Request submitted',
        type: 'submitted',
      }],
    }
    setRequests(prev => [newReq, ...prev])
  }

  if (!currentUser) return <LoginPage onLogin={setCurrentUser} />

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f3f4f6' }}>
      <Sidebar
        currentUser={currentUser}
        page={page}
        open={sidebarOpen}
        onNavigate={p => navigate(p)}
        onLogout={() => setCurrentUser(null)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, display: 'flex' }}>
            <Icon name="menu" size={20} />
          </button>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {stats.overdue > 0 && (
              <span style={{ padding: '4px 10px', background: '#fff1f2', color: '#be123c', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                ⚠ {stats.overdue} SLA breach{stats.overdue > 1 ? 'es' : ''}
              </span>
            )}
            <button
              onClick={() => setShowNewRequest(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              <Icon name="plus" size={16} color="#fff" /> New Request
            </button>
            <div style={{ position: 'relative', display: 'flex', cursor: 'pointer' }}>
              <Icon name="bell" size={20} color="#6b7280" />
              {stats.escalated > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#ef4444', fontSize: 9, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {stats.escalated}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Page */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {page === 'dashboard' && (
            <DashboardPage
              requests={requests}
              currentUser={currentUser}
              onOpenRequest={setSelectedRequest}
              onNavigate={navigate}
              onNewRequest={() => setShowNewRequest(true)}
            />
          )}
          {page === 'requests' && (
            <RequestsPage
              requests={requests}
              currentUser={currentUser}
              onOpenRequest={setSelectedRequest}
              onNewRequest={() => setShowNewRequest(true)}
              initialFilters={pageFilter}
            />
          )}
          {page === 'employers' && !isExternal && (
            <EmployersPage requests={requests} onNavigate={navigate} />
          )}
          {page === 'analytics' && !isExternal && (
            <AnalyticsPage requests={requests} />
          )}
          {page === 'settings' && !isExternal && (
            <SettingsPage />
          )}
        </div>
      </div>

      {selectedRequest && (
        <RequestDetail
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={updateRequest}
          currentUser={currentUser}
        />
      )}

      {showNewRequest && (
        <NewRequestModal
          onClose={() => setShowNewRequest(false)}
          onSubmit={submitRequest}
          currentUser={currentUser}
          preEmployer={isExternal ? currentUser.employer : ''}
        />
      )}
    </div>
  )
}
