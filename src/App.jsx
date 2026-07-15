import { useState, useEffect } from 'react'
import { INITIAL_USERS, INITIAL_EMPLOYERS, INITIAL_CASE_TYPES, INITIAL_CASES, INITIAL_CATEGORIES, INITIAL_BILLING_TASKS, INITIAL_BENEFIT_PROFILES, T, genRef, WORKFLOW_TEMPLATES } from './data.js'
import { fetchEmployers, saveEmployer, fetchBenefitProfiles, saveBenefitProfile, fetchCases, saveCase } from './supabase.js'
import { Icon } from './ui.jsx'
import Sidebar from './Sidebar.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CasesPage from './pages/CasesPage.jsx'
import CaseDetail from './pages/CaseDetail.jsx'
import BillingWorkbench from './pages/BillingWorkbench.jsx'
import BillingEngine from './pages/BillingEngine.jsx'
import EmployersPage from './pages/EmployersPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import UserManagement from './pages/admin/UserManagement.jsx'
import RolesPage from './pages/admin/RolesPage.jsx'
import CaseTypeConfig from './pages/admin/CaseTypeConfig.jsx'
import CategoryConfig from './pages/admin/CategoryConfig.jsx'
import EmployerManagement from './pages/admin/EmployerManagement.jsx'
import WorkflowConfig from './pages/admin/WorkflowConfig.jsx'
import SLAConfig from './pages/admin/SLAConfig.jsx'
import LeandreAI from './pages/LeandreAI.jsx'
import FinancialInsight from './pages/FinancialInsight.jsx'
import FinancialConsultation from './pages/FinancialConsultation.jsx'
import FuneralClaims from './pages/FuneralClaims.jsx'
import FuneralClaims from './pages/FuneralClaims.jsx'

// Convert Supabase snake_case row → app camelCase case object
function normCase(row) {
  return {
    id:             row.id,
    ref:            row.ref,
    employerId:     row.employer_id,
    caseTypeName:   row.case_type_name,
    caseTypeId:     row.case_type_id,
    workspace:      row.workspace || 'employer',
    status:         row.status,
    priority:       row.priority,
    memberName:     row.member_name,
    memberId:       row.member_id,
    description:    row.description,
    assignedTo:     row.assigned_to,
    slaDate:        row.sla_date,
    slaDays:        row.sla_days,
    billingTrigger: row.billing_trigger,
    billingTaskId:  row.billing_task_id,
    extraFields:    row.extra_fields || {},
    workflow:       row.workflow,
    notes:          row.notes || [],
    audit:          row.audit || [],
    documents:      row.documents || [],
    escalated:      row.escalated || false,
    created:        row.created || row.created_at?.split('T')[0],
  }
}
import EmailIntake from './pages/EmailIntake.jsx'
import EmployerBenefitProfiles from './pages/EmployerBenefitProfiles.jsx'
import EmployerProfile from './pages/EmployerProfile.jsx'
import MembershipRegister from './pages/MembershipRegister.jsx'
import InductionWizard from './pages/InductionWizard.jsx'
import PWAInstallPrompt from './PWAInstallPrompt.jsx'

export default function App() {
  const [user, setUser]               = useState(null)
  const [page, setPage]               = useState('dashboard')
  const [pageFilter, setPageFilter]   = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [cases, setCases]             = useState(INITIAL_CASES)
  const [billingTasks, setBillingTasks]       = useState(INITIAL_BILLING_TASKS)
  const [benefitProfiles, setBenefitProfiles] = useState(INITIAL_BENEFIT_PROFILES)
  const [caseTypes, setCaseTypes]     = useState(INITIAL_CASE_TYPES)
  const [categories, setCategories]   = useState(INITIAL_CATEGORIES)
  const [employers, setEmployers]     = useState(INITIAL_EMPLOYERS)
  const [users, setUsers]             = useState(INITIAL_USERS)
  const [openCase, setOpenCase]       = useState(null)
  const [members, setMembers]         = useState([])
  const [inductionCase, setInduction] = useState(null)
  const [selectedBenefitEmp, setSelectedBenefitEmp] = useState(null)
  const [openProfileEmp, setOpenProfileEmp]         = useState(null)
  const [financialInsightMember, setFIMember]        = useState(null)
  const [financialConsultCase, setFCCase]             = useState(null)
  const [showFuneralClaims, setFuneralClaims]         = useState(false)
  // Workflow config — loaded from WORKFLOW_TEMPLATES, editable via admin
  const [workflowConfig, setWorkflowConfig] = useState(() => {
    try {
      const stored = localStorage.getItem('aeb_workflow_config')
      if (stored) return JSON.parse(stored)
    } catch(e) {}
    return WORKFLOW_TEMPLATES
  })

  // Load persisted employers + benefit profiles on login
  useEffect(() => {
    if (!user) return
    console.log('[App] Loading data for user:', user.name)
    async function load() {
      const [emps, profiles, loadedCases] = await Promise.all([
        fetchEmployers(), fetchBenefitProfiles(), fetchCases()
      ])
      console.log('[App] Loaded:', emps?.length, 'employers,', Object.keys(profiles||{}).length, 'profiles,', loadedCases?.length, 'cases')
      if (emps        && emps.length > 0)                      setEmployers(emps)
      if (profiles    && Object.keys(profiles).length > 0)     setBenefitProfiles(profiles)
      if (loadedCases && loadedCases.length > 0)               setCases(loadedCases.map(normCase))
    }
    load()
  }, [user?.id])

  if (!user) return (
    <>
      <LoginPage onLogin={u => {
        setUser(u)
        // Handle PWA shortcut URLs
        const params = new URLSearchParams(window.location.search)
        const action = params.get('action')
        if (action === 'new-case')     setPage('cases')
        else if (action === 'email-intake') setPage('email_intake')
        else setPage('dashboard')
      }} />
      <PWAInstallPrompt />
    </>
  )

  const role = user.role
  const isGM       = role === 'general_manager'
  const isBilling  = role === 'billing_admin'
  const isEmployer = ['employer_admin','employer_user'].includes(role)

  const overdueCt   = cases.filter(c => { const d=Math.ceil((new Date(c.slaDate)-new Date())/86400000); return d<0 && !['Completed','Closed','Billing Complete'].includes(c.status) }).length
  const escalatedCt = cases.filter(c => c.escalated).length
  const pendingBilling = billingTasks.filter(bt => bt.billingStatus === 'Pending Review').length

  function navigate(p, filter) { setPage(p); setPageFilter(filter||{}) }
  function updateCase(updated)  {
    setCases(prev=>prev.map(c=>c.id===updated.id?updated:c))
    setOpenCase(updated)
    saveCase(updated)
  }
  function addCase(newCase) {
    setCases(prev=>[newCase,...prev])
    saveCase(newCase)
    // Auto-launch induction wizard for New Employee cases
    if (newCase.caseTypeName === 'New') {
      setInduction(newCase)
    }
  }
  function addEmployer(emp, profile) {
    // If an employer with this name already exists, UPDATE it instead of duplicating.
    // Re-uploading an inhouse pack must refresh the existing profile, keeping the
    // original employer id so members/cases stay linked.
    const existing = employers.find(e =>
      e.name.trim().toLowerCase() === emp.name.trim().toLowerCase()
    )
    if (existing) {
      const merged = { ...existing, ...emp, id: existing.id, number: existing.number || emp.number }
      const linkedProfile = profile ? { ...profile, employerId: existing.id } : null
      console.log('[App] addEmployer: updating existing employer', existing.id, existing.name)
      setEmployers(prev => prev.map(e => e.id === existing.id ? merged : e))
      if (linkedProfile) setBenefitProfiles(prev => ({...prev, [existing.id]: linkedProfile}))
      saveEmployer(merged)
      if (linkedProfile) saveBenefitProfile(existing.id, linkedProfile)
      return
    }
    setEmployers(prev => [...prev, emp])
    if (profile) setBenefitProfiles(prev => ({...prev, [emp.id]: profile}))
    // Persist to Supabase
    saveEmployer(emp)
    if (profile) saveBenefitProfile(emp.id, profile)
  }

  function addBillingTask(bt) {
    // Enrich with Phase 4 billing engine fields
    const enriched = {
      ...bt,
      billingStatus:   'Pending Review',
      actionType:      bt.actionType || bt.transactionType || 'Membership Amendment',
      currentPremium:  bt.currentPremium || null,
      newPremium:      bt.newPremium || null,
      approvedBy:      null,
      approvedAt:      null,
      declinedBy:      null,
      declinedAt:      null,
      notes:           bt.notes || [],
      audit:           bt.audit || [{ time:new Date().toISOString(), user:'system', userName:'System', action:'Billing action created from case workflow', type:'create' }],
    }
    setBillingTasks(prev => [enriched, ...prev])
  }

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
          {(isGM || role==='administrator') && (
            <button onClick={()=>navigate('email_intake')} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'#fff', color:T.navy, border:`1px solid ${T.border}`, borderRadius:7, cursor:'pointer', fontWeight:600, fontSize:12, fontFamily:'inherit' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={T.navy}><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              Case from Email
            </button>
          )}
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
            <BillingEngine billingTasks={billingTasks} employers={employers} users={users} currentUser={user}/>
          )}
          {page==='email_intake' && (isGM || role==='administrator') && (
            <EmailIntake
              caseTypes={caseTypes} categories={categories}
              employers={employers} users={users} currentUser={user}
              onCaseCreated={c => { addCase(c); navigate('cases') }}
            />
          )}
          {page==='employers' && (
            <EmployersPage {...sharedProps} onNav={navigate} onAddEmployer={addEmployer}
              onOpenBenefitProfile={emp => setOpenProfileEmp(emp)}
            />
          )}
          {page==='benefit_profiles' && (isGM || role==='administrator') && (
            <EmployerBenefitProfiles
              employers={employers}
              benefitProfiles={benefitProfiles}
              currentUser={user}
              initialEmployer={selectedBenefitEmp}
              onUpdateProfile={(empId, profile) => {
                setBenefitProfiles(prev => ({...prev, [empId]: profile}))
                saveBenefitProfile(empId, profile)
              }}
            />
          )}
          {page==='membership_register' && (
            <MembershipRegister
              employers={employers}
              members={members}
              currentUser={user}
              onLoadMembers={newMembers => setMembers(prev => [...prev.filter(m => !newMembers.find(n=>n.id===m.id)), ...newMembers])}
              onUpdateMember={updated => setMembers(prev => prev.map(m => m.id===updated.id ? updated : m))}
            />
          )}
          {page==='reports'    && <ReportsPage   {...sharedProps}/>}
          {page==='funeral_claims' && (
            <FuneralClaims
              employers={employers}
              members={members}
              benefitProfiles={benefitProfiles}
              users={users}
              currentUser={user}
              cases={cases}
              onAddCase={addCase}
              onAddBillingTask={addBillingTask}
            />
          )}
          {page==='funeral_claims' && (
            <div style={{ padding:'0 0 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div>
                  <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:'0 0 3px' }}>Funeral Claims</h1>
                  <p style={{ margin:0, fontSize:12, color:T.gray }}>Register and manage funeral benefit claims</p>
                </div>
                <button onClick={() => setFuneralClaims(true)}
                  style={{ padding:'10px 20px', background:T.orange, border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  + Register Claim
                </button>
              </div>
              {cases.filter(c=>c.type==='funeral_claim').length === 0 ? (
                <div style={{ textAlign:'center', padding:60, color:T.gray, background:'#fff', borderRadius:12, border:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:15, fontWeight:600, color:T.text, marginBottom:6 }}>No funeral claims registered</div>
                  <div style={{ fontSize:12, marginBottom:16 }}>Register a new funeral claim to get started.</div>
                  <button onClick={() => setFuneralClaims(true)} style={{ padding:'10px 24px', background:T.orange, border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Register Claim</button>
                </div>
              ) : (
                <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
                      {['Ref','Type','Member','Employer','Allocated To','Status','Created'].map(h=>(
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{cases.filter(c=>c.type==='funeral_claim').map(c=>(
                      <tr key={c.id} style={{ borderBottom:'1px solid #f9fafb' }}>
                        <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:T.blue, fontWeight:700 }}>{c.ref}</td>
                        <td style={{ padding:'10px 14px', fontSize:12 }}>{c.claimType==='main_member'?'Main Member':'Extended Family'}</td>
                        <td style={{ padding:'10px 14px', fontSize:12, fontWeight:600 }}>{c.memberName}</td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:T.gray }}>{c.employerName}</td>
                        <td style={{ padding:'10px 14px', fontSize:12 }}>{c.assignedName||'—'}</td>
                        <td style={{ padding:'10px 14px' }}><span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#eff6ff', color:T.blue }}>{c.status}</span></td>
                        <td style={{ padding:'10px 14px', fontSize:11, color:T.gray }}>{c.created}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {page==='leandre_ai' && (isGM || role==='administrator') && (
            <LeandreAI cases={cases} billingTasks={billingTasks} employers={employers} users={users} currentUser={user}/>
          )}
          {page==='financial_insight' && (
            <div style={{ padding:24 }}>
              <h1 style={{ fontSize:20, fontWeight:800, color:T.text, marginBottom:8 }}>Financial Insight</h1>
              <p style={{ color:T.gray, fontSize:13, marginBottom:20 }}>Open a member record or case to launch the Financial Insight Engine.</p>
            </div>
          )}
          {/* Admin */}
          {page==='admin_users'      && <UserManagement     users={users} onUpdateUsers={setUsers}/>}
          {page==='admin_roles'      && <RolesPage/>}
          {page==='admin_categories' && <CategoryConfig     categories={categories} onUpdateCategories={setCategories}/>}
          {page==='admin_casetypes'  && <WorkflowConfig workflowConfig={workflowConfig} currentUser={user} onUpdateConfig={cfg=>{ setWorkflowConfig(cfg); localStorage.setItem('aeb_workflow_config', JSON.stringify(cfg)) }}/>}
          {page==='admin_sla'        && <SLAConfig workflowConfig={workflowConfig} currentUser={user} onUpdateConfig={cfg=>{ setWorkflowConfig(cfg); localStorage.setItem('aeb_workflow_config', JSON.stringify(cfg)) }}/>}
          {page==='admin_employers'  && <EmployerManagement employers={employers} users={users} onUpdateEmployers={setEmployers}/>}
          {page==='admin_allocation' && <AllocationAdmin    users={users}/>}
        </div>
      </div>

      {openCase && (
        <CaseDetail
          c={openCase}
          employers={employers}
          users={users}
          currentUser={user}
          onClose={()=>setOpenCase(null)}
          onUpdate={updateCase}
          onAddBillingTask={addBillingTask}
          onLaunchInduction={(c) => setInduction(c)}
          onLaunchConsultation={(c) => setFCCase(c)}
        />
      )}

      {inductionCase && (
        <InductionWizard
          caseData={inductionCase}
          employer={employers.find(e => e.id === inductionCase.employerId)}
          benefitProfile={benefitProfiles[inductionCase.employerId]}
          users={users}
          currentUser={user}
          onClose={() => setInduction(null)}
          onComplete={(profile) => {
            // Add to membership register
            const newMember = {
              id: crypto.randomUUID(), employerId: inductionCase.employerId,
              memberName: profile.firstName, surname: profile.surname,
              idNumber: profile.idNumber, payrollNumber: profile.payrollNumber,
              benefitCategory: profile.benefitCategory,
              providentFund: profile.retirementFund, gla: profile.gla,
              phi: profile.phi, medical: profile.medicalAid,
              monthlyPremium: 0, status: 'Pending Addition',
              effectiveDate: profile.startDate, sourceFile: 'Induction Wizard',
              createdAt: new Date().toISOString(),
            }
            setMembers(prev => [...prev, newMember])
            // Create billing action
            addBillingTask({
              id: crypto.randomUUID(), ref: genRef('BT'),
              linkedCaseId: inductionCase.id, linkedCaseRef: inductionCase.ref,
              employerId: inductionCase.employerId,
              memberName: `${profile.firstName} ${profile.surname}`,
              actionType: 'Add Member', transactionType: 'New Employee',
              effectiveDate: profile.startDate,
              assignedTo: users.find(u=>u.role==='billing_admin'&&u.status==='active')?.id || '',
              priority: 'Medium', createdBy: user.id, created: new Date().toISOString(),
            })
            setInduction(null)
          }}
        />
      )}

      {showFuneralClaims && (
        <FuneralClaims
          employers={employers}
          benefitProfiles={benefitProfiles}
          members={members}
          cases={cases}
          users={users}
          currentUser={user}
          onClose={() => setFuneralClaims(false)}
          onRegisterClaim={(claim) => {
            addCase(claim)
            setFuneralClaims(false)
          }}
        />
      )}

      {financialConsultCase && (
        <FinancialConsultation
          caseData={financialConsultCase}
          employer={employers.find(e=>e.id===financialConsultCase.employerId)}
          benefitProfile={benefitProfiles[financialConsultCase.employerId]}
          currentUser={user}
          onClose={()=>setFCCase(null)}
          onComplete={(result)=>{
            console.log('[FinancialConsultation] Complete:', result)
            updateCase({...financialConsultCase, status:'Consultation Complete', consultationResult:result})
            setFCCase(null)
          }}
        />
      )}

      {financialInsightMember && (
        <FinancialInsight
          member={financialInsightMember}
          employer={employers.find(e => e.id === financialInsightMember.employerId)}
          benefitProfile={benefitProfiles[financialInsightMember.employerId]}
          currentUser={user}
          onClose={() => setFIMember(null)}
          onCreateAction={(action) => {
            // Wire into workflow engine as a task
            console.log('[FinancialInsight] Action created:', action)
          }}
        />
      )}

      {openProfileEmp && (
        <EmployerProfile
          employer={openProfileEmp}
          profile={benefitProfiles[openProfileEmp.id]}
          cases={cases}
          members={members}
          billingTasks={billingTasks}
          currentUser={user}
          onClose={() => setOpenProfileEmp(null)}
          onUpdateProfile={(empId, profile) => {
            setBenefitProfiles(prev => ({...prev, [empId]: profile}))
            saveBenefitProfile(empId, profile)
          }}
        />
      )}

      {/* PWA install prompt — shows "Add to Home Screen" banner */}
      <PWAInstallPrompt />
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
