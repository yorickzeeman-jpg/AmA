import { useState } from 'react'
import { INITIAL_USERS, INITIAL_EMPLOYERS, INITIAL_CASE_TYPES, INITIAL_CASES, INITIAL_CATEGORIES, INITIAL_BILLING_TASKS, T } from './data.js'
import { Icon } from './ui.jsx'
import Sidebar from './Sidebar.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CasesPage from './pages/CasesPage.jsx'
import CaseDetail from './pages/CaseDetail.jsx'
import BillingWorkbench from './pages/BillingWorkbench.jsx'
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
  const [billingTasks, setBillingTasks] = useState(INITIAL_BILLING_TASKS)
  const [caseTypes, setCaseTypes]     = useState(INITIAL_CASE_TYPES)
  const [categories, setCategories]   = useState(INITIAL_CATEGORIES)
  const [employers, setEmployers]     = useState(INITIAL_EMPLOYERS)
  const [users, setUsers]             = useState(INITIAL_USERS)
  const [openCase, setOpenCase]       = useState(null)

  if (!user) return <LoginPage onLogin={u => { setUser(u); setPage('dashboard') }} />

  const role = user.role
  const isGM       = role === 'general_manager'
  const isBilling  = role === 'billing_admin'
  const isEmployer = ['employer_admin','employer_user'].includes(role)

  const overdueCt   = cases.filter(c => { const d=Math.ceil((new Date(c.slaDate)-new Date())/86400000); return d<0 && !['Completed','Closed','Billing Complete'].includes(c.status) }).length
  const escalatedCt = cases.filter(c => c.escalated).length
  const pendingBilling = billingTasks.filter(bt => bt.status !== 'Billing Complete').length

  function navigate(p, filter) { setPage(p); setPageFilter(filter||{}) }
  function updateCase(updated)  { setCases(prev=>prev.map(c=>c.id===updated.id?updated:c)); setOpenCase(updated) }
  function addCase(newCase)     { setCases(prev=>[newCase,...prev]) }
  function addBillingTask(bt)   { setBillingTasks(prev=>[bt,...prev]) }

  const sharedProps = { cases, billingTasks, caseTypes, categories, employers, users, currentUser:user }

  return (
    <div style={{ display:'flex', height:'100vh', background:'#f4f5f7', fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <Sidebar user={user} page={page} open={sidebarOpen} onNav={navigate} onLogout={()=>setUser(null)}/>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Topbar */}
        <div style={{ background:'#fff', borderBottom:`1px solid ${T.border}`, height:52, padding:'0 20px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{ background:'none', border:'none', cursor:'pointer', color:T.gray, display:'flex', padding:4 }}>
            <Icon name="menu" size={19}/>
          </button>
          <div style={{ flex:1 }}/>
          {overdueCt>0 && (
            <span style={{ padding:'4px 10px', background:'#fff1f2', color:'#be123c', borderRadius:20, fontSize:11, fontWeight:700 }}>
              ⚠ {overdueCt} SLA breach{overdueCt>1?'es':''}
            </span>
          )}
          {(isGM||isBilling) && pendingBilling>0 && (
            <span onClick={()=>navigate('billing')} style={{ padding:'4px 10px', background:'#f5f3ff', color:T.purple, borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer' }}>
              ₿ {pendingBilling} billing pending
            </span>
          )}
          <button onClick={()=>{ setOpenCase(null); navigate('cases') }} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:T.orange, color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:600, fontSize:12, fontFamily:'inherit' }}>
            <Icon name="plus" size={14} color="#fff"/> New Case
          </button>
          <div style={{ position:'relative', display:'flex', cursor:'pointer' }}>
            <Icon name="bell" size={19} color={T.gray}/>
            {escalatedCt>0 && (
              <span style={{ position:'absolute', top:-3, right:-3, width:14, height:14, borderRadius:'50%', background:T.red, fontSize:9, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                {escalatedCt}
              </span>
            )}
          </div>
        </div>

        {/* Pages */}
        <div style={{ flex:1, overflowY:'auto', padding:22 }}>
          {page==='dashboard' && (
            <DashboardPage {...sharedProps} onOpenCase={setOpenCase} onOpenBilling={bt=>{ /* open billing detail */ }} onNav={navigate}/>
          )}
          {page==='cases' && (
            <CasesPage {...sharedProps} onOpenCase={setOpenCase} onAddCase={addCase} onAddBillingTask={addBillingTask} initialFilter={pageFilter} workspace="employer"/>
          )}
          {page==='internal_cases' && (
            <CasesPage {...sharedProps} onOpenCase={setOpenCase} onAddCase={addCase} onAddBillingTask={addBillingTask} initialFilter={pageFilter} workspace="internal"/>
          )}
          {page==='billing' && (
            <BillingWorkbench {...sharedProps} onUpdateBilling={setBillingTasks}/>
          )}
          {page==='employers'  && <EmployersPage {...sharedProps} onNav={navigate}/>}
          {page==='reports'    && <ReportsPage   {...sharedProps}/>}
          {/* Admin */}
          {page==='admin_users'      && <UserManagement     users={users} onUpdateUsers={setUsers}/>}
          {page==='admin_roles'      && <RolesPage/>}
          {page==='admin_categories' && <CategoryConfig     categories={categories} onUpdateCategories={setCategories}/>}
          {page==='admin_casetypes'  && <CaseTypeConfig     caseTypes={caseTypes} categories={categories} onUpdateCaseTypes={setCaseTypes}/>}
          {page==='admin_employers'  && <EmployerManagement employers={employers} users={users} onUpdateEmployers={setEmployers}/>}
          {page==='admin_allocation' && <AllocationAdmin    users={users}/>}
        </div>
      </div>

      {openCase && (
        <CaseDetail
          c={openCase}
          caseType={caseTypes.find(ct=>ct.id===openCase.caseTypeId)}
          category={categories.find(cat=>cat.id===caseTypes.find(ct=>ct.id===openCase.caseTypeId)?.categoryId)}
          employer={employers.find(e=>e.id===openCase.employerId)}
          users={users}
          currentUser={user}
          onClose={()=>setOpenCase(null)}
          onUpdate={updateCase}
          onAddBillingTask={addBillingTask}
        />
      )}
    </div>
  )
}

// Simple Allocation Admin stub (full config page)
function AllocationAdmin({ users }) {
  const pools = {
    'General Administration Pool': users.filter(u=>u.allocation?.pool==='general'),
    'Billing Pool': users.filter(u=>u.allocation?.pool==='billing'),
    'Direct Assignments': users.filter(u=>u.allocation?.directTypes?.length>0),
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, animation:'fadeIn .3s ease' }}>
      <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>Allocation Rules</h1>
      <div style={{ background:'#f0f7ff', borderRadius:10, padding:'12px 16px', border:'1px solid #bfdbfe', fontSize:12, color:T.blue }}>
        <strong>Allocation Engine:</strong> Cases are automatically assigned using direct assignment (named users) or round-robin pool distribution. Configure below.
      </div>
      {Object.entries(pools).map(([poolName, members])=>(
        <div key={poolName} style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden' }}>
          <div style={{ padding:'13px 18px', borderBottom:`1px solid ${T.border}`, fontWeight:700, fontSize:14, color:T.text }}>{poolName}</div>
          {members.length===0 && <div style={{ padding:20, textAlign:'center', color:T.gray, fontSize:13 }}>No members in this pool.</div>}
          {members.map(u=>(
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderBottom:'1px solid #f3f4f6' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:T.blue, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>{u.avatar}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{u.name}</div>
                <div style={{ fontSize:11, color:T.gray }}>{u.email}</div>
              </div>
              {u.allocation?.directTypes?.length>0 && <span style={{ fontSize:11, color:T.orange, fontWeight:600, background:T.orangeL, padding:'2px 8px', borderRadius:20 }}>Direct: {u.allocation.directTypes.length} type{u.allocation.directTypes.length!==1?'s':''}</span>}
              {u.allocation?.pool && <span style={{ fontSize:11, color:T.blue, fontWeight:600, background:T.blueL, padding:'2px 8px', borderRadius:20 }}>Round Robin</span>}
              {u.allocation?.excludeTypes?.length>0 && <span style={{ fontSize:11, color:T.gray, fontWeight:600, background:'#f3f4f6', padding:'2px 8px', borderRadius:20 }}>Excludes: {u.allocation.excludeTypes.length}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
