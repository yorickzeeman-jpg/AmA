import { useState } from 'react'
import { INITIAL_USERS, INITIAL_EMPLOYERS, INITIAL_CASE_TYPES, INITIAL_CASES, INITIAL_CATEGORIES, T } from './data.js'
import { Icon } from './ui.jsx'
import Sidebar from './Sidebar.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CasesPage from './pages/CasesPage.jsx'
import CaseDetail from './pages/CaseDetail.jsx'
import EmployersPage from './pages/EmployersPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import UserManagement from './pages/admin/UserManagement.jsx'
import RolesPage from './pages/admin/RolesPage.jsx'
import CaseTypeConfig from './pages/admin/CaseTypeConfig.jsx'
import CategoryConfig from './pages/admin/CategoryConfig.jsx'
import EmployerManagement from './pages/admin/EmployerManagement.jsx'

export default function App() {
  const [user, setUser]               = useState(null)
  const [page, setPage]               = useState('dashboard')
  const [pageFilter, setPageFilter]   = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [cases, setCases]             = useState(INITIAL_CASES)
  const [caseTypes, setCaseTypes]     = useState(INITIAL_CASE_TYPES)
  const [categories, setCategories]   = useState(INITIAL_CATEGORIES)
  const [employers, setEmployers]     = useState(INITIAL_EMPLOYERS)
  const [users, setUsers]             = useState(INITIAL_USERS)
  const [openCase, setOpenCase]       = useState(null)

  if (!user) return <LoginPage onLogin={u => { setUser(u); setPage('dashboard') }} />

  const overdueCt   = cases.filter(c => { const d = Math.ceil((new Date(c.slaDate)-new Date())/86400000); return d<0 && !['Completed','Closed'].includes(c.status) }).length
  const escalatedCt = cases.filter(c => c.escalated).length

  function navigate(p, filter) { setPage(p); setPageFilter(filter || {}) }
  function updateCase(updated)  { setCases(prev => prev.map(c => c.id===updated.id ? updated : c)); setOpenCase(updated) }
  function addCase(newCase)     { setCases(prev => [newCase, ...prev]) }

  // Shared props passed to all pages that need them
  const sharedProps = { cases, caseTypes, categories, employers, users, currentUser: user }

  return (
    <div style={{ display:'flex', height:'100vh', background:'#f4f5f7' }}>
      <Sidebar user={user} page={page} open={sidebarOpen} onNav={navigate} onLogout={() => setUser(null)} />

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Topbar */}
        <div style={{ background:'#fff', borderBottom:`1px solid ${T.border}`, height:52, padding:'0 20px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280', display:'flex', padding:4 }}>
            <Icon name="menu" size={19} />
          </button>
          <div style={{ flex:1 }} />
          {overdueCt > 0 && (
            <span style={{ padding:'4px 10px', background:'#fff1f2', color:'#be123c', borderRadius:20, fontSize:11, fontWeight:700 }}>
              ⚠ {overdueCt} SLA breach{overdueCt>1?'es':''}
            </span>
          )}
          <button
            onClick={() => { setOpenCase(null); setPage('cases') }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:T.green, color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:600, fontSize:12 }}
          >
            <Icon name="plus" size={14} color="#fff"/> New Case
          </button>
          <div style={{ position:'relative', display:'flex', cursor:'pointer' }}>
            <Icon name="bell" size={19} color="#6b7280" />
            {escalatedCt > 0 && (
              <span style={{ position:'absolute', top:-3, right:-3, width:14, height:14, borderRadius:'50%', background:'#dc2626', fontSize:9, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                {escalatedCt}
              </span>
            )}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex:1, overflowY:'auto', padding:22 }}>
          {page==='dashboard'        && <DashboardPage  {...sharedProps} onOpenCase={setOpenCase} onNav={navigate} />}
          {page==='cases'            && <CasesPage      {...sharedProps} onOpenCase={setOpenCase} onAddCase={addCase} initialFilter={pageFilter} />}
          {page==='employers'        && <EmployersPage  {...sharedProps} onNav={navigate} />}
          {page==='reports'          && <ReportsPage    {...sharedProps} />}
          {/* Admin pages — all receive live categories + caseTypes */}
          {page==='admin_users'      && <UserManagement     users={users} onUpdateUsers={setUsers} />}
          {page==='admin_roles'      && <RolesPage />}
          {page==='admin_categories' && <CategoryConfig     categories={categories} onUpdateCategories={setCategories} />}
          {page==='admin_casetypes'  && <CaseTypeConfig     caseTypes={caseTypes} categories={categories} onUpdateCaseTypes={setCaseTypes} />}
          {page==='admin_employers'  && <EmployerManagement employers={employers} users={users} onUpdateEmployers={setEmployers} />}
        </div>
      </div>

      {openCase && (
        <CaseDetail
          c={openCase}
          caseType={caseTypes.find(ct => ct.id===openCase.caseTypeId)}
          category={categories.find(cat => cat.id===caseTypes.find(ct=>ct.id===openCase.caseTypeId)?.categoryId)}
          employer={employers.find(e => e.id===openCase.employerId)}
          users={users}
          currentUser={user}
          onClose={() => setOpenCase(null)}
          onUpdate={updateCase}
        />
      )}
    </div>
  )
}
