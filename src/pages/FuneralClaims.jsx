import { useState, useRef, useMemo } from 'react'
import { T, genRef } from '../data.js'
import { inputSt, selectSt } from '../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// FUNERAL CLAIMS — Register Claim
//
// Standalone module. Does not modify any existing functionality.
//
// Flow:
//   1. Select employer + claim type
//   2. Upload supporting email / documents
//   3. Leandre AI extracts member info from documents
//   4. Search AEB database for member
//   5. Load member profile + benefit structure
//   6. Display claim summary (cover, premium, waiting period, docs)
//   7. Round-robin allocate to claims administrator
//   8. Create case → Leandre AI monitors turnaround
// ═════════════════════════════════════════════════════════════════════════════

const CLAIM_TYPES = [
  {
    id: 'main_member',
    label: 'Main Member Funeral',
    sub: 'R57 main policy cover',
    color: T.navy,
    docs: ['Death Certificate', 'Burial Order / Undertaker Invoice', 'Certified ID Copy (Deceased)', 'Certified ID Copy (Claimant)', 'Proof of Relationship', 'Banking Details (Claimant)'],
  },
  {
    id: 'extended_family',
    label: 'Extended Family Funeral',
    sub: 'Extended family funeral cover',
    color: T.purple,
    docs: ['Death Certificate', 'Burial Order / Undertaker Invoice', 'Certified ID Copy (Deceased)', 'Proof of Relationship to Main Member', 'Certified ID Copy (Main Member)', 'Banking Details (Main Member)'],
  },
]

const RELATIONSHIP_OPTIONS = ['Spouse','Child','Parent','Parent-in-Law','Sibling','Other']

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function Card({ title, color = T.blue, children, badge }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden', marginBottom:14 }}>
      <div style={{ padding:'10px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:`linear-gradient(90deg,${color}08,transparent)` }}>
        <div style={{ fontSize:11, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.5px' }}>{title}</div>
        {badge}
      </div>
      <div style={{ padding:'14px 16px' }}>{children}</div>
    </div>
  )
}

function Row({ label, value, bold, color, sub, mono }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'7px 0', borderBottom:'1px solid #f3f4f6' }}>
      <div>
        <span style={{ fontSize:13, color:T.gray }}>{label}</span>
        {sub && <div style={{ fontSize:10, color:'#9ca3af' }}>{sub}</div>}
      </div>
      <span style={{ fontSize:bold?15:13, fontWeight:bold?800:600, color:color||T.text, fontFamily:mono?'monospace':'inherit' }}>{value||'—'}</span>
    </div>
  )
}

function StatusPill({ label, color, bg }) {
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:bg||color+'15', color }}>
      {label}
    </span>
  )
}

function Field({ label, children, required }) {
  return (
    <div>
      <label style={{ fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>
        {label}{required && <span style={{ color:T.red }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// ─── DOCUMENT CHECKLIST ───────────────────────────────────────────────────────
function DocChecklist({ required, uploaded }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {required.map(doc => {
        const done = uploaded.includes(doc)
        return (
          <div key={doc} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:done?'#f0fdf4':'#fff', border:`1px solid ${done?'#bbf7d0':T.border}`, borderRadius:7 }}>
            <div style={{ width:18, height:18, borderRadius:'50%', background:done?'#059669':'#f3f4f6', border:`2px solid ${done?'#059669':'#d1d5db'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {done && <span style={{ color:'#fff', fontSize:10, fontWeight:800 }}>✓</span>}
            </div>
            <span style={{ fontSize:12, fontWeight:done?600:400, color:done?'#059669':T.text }}>{doc}</span>
            {!done && <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:T.red }}>OUTSTANDING</span>}
          </div>
        )
      })}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function FuneralClaims({ employers, members, benefitProfiles, users, currentUser, cases, onAddCase, onAddBillingTask }) {
  const [step, setStep]               = useState('select')  // select | upload | search | summary | complete
  const [employerId, setEmployerId]   = useState('')
  const [claimType, setClaimType]     = useState(null)
  const [uploadedFiles, setFiles]     = useState([])
  const [extracting, setExtracting]   = useState(false)
  const [extracted, setExtracted]     = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [foundMember, setFoundMember] = useState(null)
  const [claimData, setClaimData]     = useState({
    deceasedName:'', deceasedId:'', dateOfDeath:'', causeOfDeath:'',
    relationship:'', claimantName:'', claimantId:'', claimantPhone:'',
    claimantEmail:'', claimantBank:'', claimantAccNo:'', claimantAccType:'Cheque',
    funeralParlour:'', funeralDate:'', funeralCost:'',
    notes:'',
  })
  const [uploadedDocs, setUploadedDocs] = useState([])
  const [allocatedTo, setAllocatedTo]   = useState(null)
  const [claimRef, setClaimRef]         = useState('')
  const fileRef = useRef()
  const docRef  = useRef()

  const employer      = employers.find(e => e.id === employerId)
  const benefitProfile = benefitProfiles?.[employerId]
  const selectedType  = CLAIM_TYPES.find(t => t.id === claimType)
  const isBilling     = ['billing_admin','general_manager','administrator'].includes(currentUser.role)

  // Round-robin allocation to claims administrators
  const claimsAdmins = users.filter(u => ['administrator','general_manager'].includes(u.role) && u.status === 'active')
  function allocateClaim() {
    if (claimsAdmins.length === 0) return null
    const activeCases  = (cases||[]).filter(c => !['Completed','Closed'].includes(c.status))
    const loads        = claimsAdmins.map(u => ({ u, count: activeCases.filter(c=>c.assignedTo===u.id).length }))
    loads.sort((a,b) => a.count - b.count)
    return loads[0].u
  }

  // Search members
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 3) return []
    const q = searchQuery.toLowerCase()
    const empMembers = (members||[]).filter(m => !employerId || m.employerId === employerId)
    return empMembers.filter(m =>
      m.memberName?.toLowerCase().includes(q) ||
      m.surname?.toLowerCase().includes(q) ||
      m.idNumber?.includes(q) ||
      m.payrollNumber?.toLowerCase().includes(q) ||
      m.membershipNo?.includes(q)
    ).slice(0, 8)
  }, [searchQuery, members, employerId])

  // Extract info from uploaded files using Claude API
  async function extractFromDocuments(files) {
    setExtracting(true)
    try {
      // Read first file as base64
      const file   = files[0]
      const base64 = await new Promise((res,rej) => {
        const r = new FileReader()
        r.onload  = e => res(e.target.result.split(',')[1])
        r.onerror = () => rej(new Error('Read failed'))
        r.readAsDataURL(file)
      })

      const response = await fetch('/api/extract-funeral-claim', {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({ base64, mediaType: file.type || 'application/pdf', claimType }),
      })

      if (response.ok) {
        const { data } = await response.json()
        setExtracted(data)
        setClaimData(prev => ({
          ...prev,
          deceasedName:   data.deceasedName   || prev.deceasedName,
          deceasedId:     data.deceasedId     || prev.deceasedId,
          dateOfDeath:    data.dateOfDeath    || prev.dateOfDeath,
          causeOfDeath:   data.causeOfDeath   || prev.causeOfDeath,
          relationship:   data.relationship   || prev.relationship,
          claimantName:   data.claimantName   || prev.claimantName,
          claimantId:     data.claimantId     || prev.claimantId,
          claimantPhone:  data.claimantPhone  || prev.claimantPhone,
          funeralParlour: data.funeralParlour || prev.funeralParlour,
          funeralDate:    data.funeralDate    || prev.funeralDate,
        }))
        if (data.memberName || data.memberIdNumber) {
          setSearchQuery(data.memberName || data.memberIdNumber)
        }
      }
    } catch(e) {
      console.warn('[FuneralClaims] Extraction failed:', e.message)
    }
    setExtracting(false)
  }

  function handleFileDrop(files) {
    const arr = Array.from(files).filter(f =>
      f.type.includes('pdf') || f.type.includes('image') || f.type.includes('text') || f.name.endsWith('.eml')
    )
    setFiles(arr)
    if (arr.length > 0) extractFromDocuments(arr)
  }

  function selectMember(m) {
    setFoundMember(m)
    setStep('summary')
  }

  function registerClaim() {
    const adviser = allocateClaim()
    const ref     = genRef('CLM')
    setAllocatedTo(adviser)
    setClaimRef(ref)

    const newCase = {
      id:             crypto.randomUUID(),
      ref,
      employerId,
      caseTypeName:   claimType === 'main_member' ? 'Death - Funeral' : 'Death - Extended Funeral',
      workspace:      'employer',
      status:         'Open',
      priority:       'High',
      memberName:     foundMember ? `${foundMember.memberName} ${foundMember.surname||''}`.trim() : claimData.claimantName,
      memberId:       foundMember?.idNumber || claimData.deceasedId,
      description:    `Funeral claim — ${selectedType?.label}. Deceased: ${claimData.deceasedName}. Date of Death: ${claimData.dateOfDeath}.`,
      assignedTo:     adviser?.id || '',
      slaDate:        new Date(Date.now() + 5*86400000).toISOString().split('T')[0],
      slaDays:        5,
      billingTrigger: false,
      extraFields: {
        natural_unnatural: claimData.causeOfDeath || '',
        date_of_death:     claimData.dateOfDeath,
        relationship:      claimData.relationship,
        deceased_name:     claimData.deceasedName,
        deceased_id:       claimData.deceasedId,
        claimant_name:     claimData.claimantName,
        claimant_id:       claimData.claimantId,
        funeral_parlour:   claimData.funeralParlour,
        funeral_date:      claimData.funeralDate,
        funeral_cost:      claimData.funeralCost,
        claim_type:        claimType,
        uploaded_docs:     uploadedDocs,
      },
      notes:     [],
      audit:     [{ time:new Date().toISOString(), user:currentUser.id, action:`Claim registered by ${currentUser.name}`, type:'system' }],
      documents: uploadedFiles.map(f => ({ name:f.name, size:`${(f.size/1024).toFixed(1)} KB`, uploadedBy:currentUser.id, date:new Date().toISOString().split('T')[0] })),
      escalated: false,
      created:   new Date().toISOString().split('T')[0],
    }

    if (onAddCase) onAddCase(newCase)
    setStep('complete')
  }

  // Waiting period check (3 months from member start date)
  function waitingPeriodStatus(member) {
    if (!member?.effectiveDate) return { ok:true, label:'Unknown', color:T.gray }
    const start  = new Date(member.effectiveDate)
    const months = (new Date() - start) / (1000*60*60*24*30.44)
    if (months >= 3) return { ok:true,  label:'Satisfied (3+ months)', color:'#059669' }
    return { ok:false, label:`Not satisfied (${Math.floor(months)} months of 3 required)`, color:T.red }
  }

  const wpStatus = foundMember ? waitingPeriodStatus(foundMember) : null

  // Cover details
  const mainCover     = benefitProfile?.funeralCover?.memberCover     || 0
  const extCover      = benefitProfile?.extendedFuneral?.available
  const spouseCover   = benefitProfile?.extendedFuneral?.spousePremium
  const childCover    = benefitProfile?.extendedFuneral?.childPremium

  const S = (k,v) => setClaimData(prev=>({...prev,[k]:v}))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, animation:'fadeIn .3s ease' }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:'0 0 3px' }}>Register Claim</h1>
        <p style={{ margin:0, fontSize:12, color:T.gray }}>Funeral claim intake · AEB Portal · {new Date().toLocaleDateString('en-ZA')}</p>
      </div>

      {/* Step tracker */}
      <div style={{ display:'flex', gap:0, background:'#fff', borderRadius:10, border:`1px solid ${T.border}`, marginBottom:20, overflow:'hidden' }}>
        {[
          ['select', '1', 'Claim Type'],
          ['upload', '2', 'Documents'],
          ['search', '3', 'Find Member'],
          ['summary','4', 'Claim Summary'],
          ['complete','5','Registered'],
        ].map(([id, num, label], i, arr) => {
          const steps  = ['select','upload','search','summary','complete']
          const idx    = steps.indexOf(step)
          const thisIdx= steps.indexOf(id)
          const done   = thisIdx < idx
          const active = id === step
          const clr    = done?'#059669':active?T.orange:T.gray
          return (
            <div key={id} style={{ flex:1, padding:'12px 10px', textAlign:'center', background:active?T.orangeL:done?'#f0fdf4':'#fff', borderRight:i<arr.length-1?`1px solid ${T.border}`:'none', cursor:done?'pointer':'default' }}
              onClick={()=>done&&setStep(id)}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:done?'#059669':active?T.orange:'#f3f4f6', color:done||active?'#fff':'#9ca3af', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 4px' }}>
                {done?'✓':num}
              </div>
              <div style={{ fontSize:10, fontWeight:active?700:400, color:clr, whiteSpace:'nowrap' }}>{label}</div>
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: SELECT ── */}
      {step==='select' && (
        <div style={{ maxWidth:640, margin:'0 auto', width:'100%' }}>
          <Card title="Select Employer" color={T.blue}>
            <Field label="Employer" required>
              <select value={employerId} onChange={e=>setEmployerId(e.target.value)} style={selectSt}>
                <option value="">Select employer...</option>
                {employers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Field>
          </Card>

          <Card title="Claim Type" color={T.navy}>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {CLAIM_TYPES.map(type=>(
                <button key={type.id} onClick={()=>setClaimType(type.id)}
                  style={{ padding:'16px', borderRadius:10, border:`2px solid ${claimType===type.id?type.color:T.border}`, background:claimType===type.id?type.color+'10':'#fff', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .15s' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:claimType===type.id?type.color:T.text, marginBottom:3 }}>{type.label}</div>
                  <div style={{ fontSize:12, color:T.gray }}>{type.sub}</div>
                </button>
              ))}
            </div>
          </Card>

          <button onClick={()=>{ if(!employerId||!claimType){alert('Please select employer and claim type');return} setStep('upload') }}
            style={{ width:'100%', padding:'13px', background:T.orange, border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Next → Upload Documents
          </button>
        </div>
      )}

      {/* ── STEP 2: UPLOAD ── */}
      {step==='upload' && (
        <div style={{ maxWidth:720, margin:'0 auto', width:'100%' }}>
          <Card title="Upload Supporting Documents" color={T.navy}>
            <div style={{ fontSize:12, color:T.gray, marginBottom:14, lineHeight:1.6 }}>
              Upload the claimant's email, death certificate, burial order and any other supporting documents.
              Leandre AI will extract available information automatically.
            </div>

            {/* Drop zone */}
            <label style={{ display:'block', border:`2px dashed ${uploadedFiles.length>0?T.green:T.border}`, borderRadius:10, padding:'28px 20px', textAlign:'center', cursor:'pointer', background:'#fafafa', marginBottom:14 }}
              onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=T.orange}}
              onDragLeave={e=>{e.currentTarget.style.borderColor=uploadedFiles.length>0?T.green:T.border}}
              onDrop={e=>{e.preventDefault();handleFileDrop(e.dataTransfer.files)}}>
              <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.eml,.txt,.doc,.docx" onChange={e=>handleFileDrop(e.target.files)} style={{display:'none'}}/>
              {uploadedFiles.length===0 ? (
                <>
                  <div style={{ fontSize:32, marginBottom:8 }}>📁</div>
                  <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:4 }}>Drop documents here</div>
                  <div style={{ fontSize:12, color:T.gray }}>PDF, images, email files (.eml) · or click to browse</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:28, marginBottom:8, color:T.green }}>✓</div>
                  <div style={{ fontSize:14, fontWeight:700, color:T.green, marginBottom:8 }}>{uploadedFiles.length} file{uploadedFiles.length!==1?'s':''} uploaded</div>
                  {uploadedFiles.map((f,i)=>(
                    <div key={i} style={{ fontSize:12, color:T.gray }}>{f.name}</div>
                  ))}
                </>
              )}
            </label>

            {extracting && (
              <div style={{ background:'#f0f7ff', border:'1px solid #bfdbfe', borderRadius:9, padding:'12px 14px', marginBottom:14, display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${T.blue}`, borderTopColor:'transparent', animation:'spin 1s linear infinite' }}/>
                <span style={{ fontSize:13, color:T.blue, fontWeight:600 }}>Leandre AI is extracting information from documents...</span>
              </div>
            )}

            {extracted && !extracting && (
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:9, padding:'12px 14px', marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.green, marginBottom:8 }}>Leandre AI extracted the following information:</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {Object.entries(extracted).filter(([,v])=>v).map(([k,v])=>(
                    <div key={k}>
                      <div style={{ fontSize:9, fontWeight:700, color:T.gray, textTransform:'uppercase' }}>{k.replace(/([A-Z])/g,' $1').trim()}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Claim details form */}
          <Card title="Claim Details" color={T.blue}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Deceased Name" required><input value={claimData.deceasedName} onChange={e=>S('deceasedName',e.target.value)} style={inputSt}/></Field>
              <Field label="Deceased ID Number"><input value={claimData.deceasedId} onChange={e=>S('deceasedId',e.target.value)} style={inputSt} placeholder="13-digit"/></Field>
              <Field label="Date of Death" required><input type="date" value={claimData.dateOfDeath} onChange={e=>S('dateOfDeath',e.target.value)} style={inputSt}/></Field>
              <Field label="Natural / Unnatural">
                <select value={claimData.causeOfDeath} onChange={e=>S('causeOfDeath',e.target.value)} style={selectSt}>
                  <option value="">Select...</option>
                  <option>Natural</option>
                  <option>Unnatural</option>
                </select>
              </Field>
              {claimType==='extended_family' && (
                <Field label="Relationship to Member">
                  <select value={claimData.relationship} onChange={e=>S('relationship',e.target.value)} style={selectSt}>
                    <option value="">Select...</option>
                    {RELATIONSHIP_OPTIONS.map(r=><option key={r}>{r}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Funeral Parlour"><input value={claimData.funeralParlour} onChange={e=>S('funeralParlour',e.target.value)} style={inputSt}/></Field>
              <Field label="Funeral Date"><input type="date" value={claimData.funeralDate} onChange={e=>S('funeralDate',e.target.value)} style={inputSt}/></Field>
              <Field label="Funeral Cost (R)">
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:12, fontWeight:700, color:T.gray }}>R</span>
                  <input type="number" value={claimData.funeralCost} onChange={e=>S('funeralCost',e.target.value)} style={{ ...inputSt, paddingLeft:24 }}/>
                </div>
              </Field>
            </div>
          </Card>

          <Card title="Claimant Details" color={T.purple}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Claimant Name" required><input value={claimData.claimantName} onChange={e=>S('claimantName',e.target.value)} style={inputSt}/></Field>
              <Field label="Claimant ID Number"><input value={claimData.claimantId} onChange={e=>S('claimantId',e.target.value)} style={inputSt}/></Field>
              <Field label="Contact Number"><input value={claimData.claimantPhone} onChange={e=>S('claimantPhone',e.target.value)} style={inputSt}/></Field>
              <Field label="Email"><input value={claimData.claimantEmail} onChange={e=>S('claimantEmail',e.target.value)} style={inputSt}/></Field>
              <Field label="Bank"><input value={claimData.claimantBank} onChange={e=>S('claimantBank',e.target.value)} style={inputSt}/></Field>
              <Field label="Account Number"><input value={claimData.claimantAccNo} onChange={e=>S('claimantAccNo',e.target.value)} style={inputSt}/></Field>
              <Field label="Account Type">
                <select value={claimData.claimantAccType} onChange={e=>S('claimantAccType',e.target.value)} style={selectSt}>
                  <option>Cheque</option><option>Savings</option><option>Transmission</option>
                </select>
              </Field>
            </div>
          </Card>

          <div style={{ display:'flex', gap:10, marginBottom:20 }}>
            <button onClick={()=>setStep('select')} style={{ flex:1, padding:'12px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
            <button onClick={()=>setStep('search')} style={{ flex:2, padding:'12px', background:T.orange, border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Next → Find Member</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: SEARCH ── */}
      {step==='search' && (
        <div style={{ maxWidth:640, margin:'0 auto', width:'100%' }}>
          <Card title="Find Member in AEB Database" color={T.blue}>
            <div style={{ fontSize:12, color:T.gray, marginBottom:14 }}>
              Search for the main member by name, ID number, membership number or payroll number.
            </div>
            <div style={{ position:'relative', marginBottom:14 }}>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                placeholder="Search by name, ID number, payroll number..."
                style={{ ...inputSt, paddingLeft:36, fontSize:14 }}/>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:16, color:T.gray }}>🔍</span>
            </div>

            {searchResults.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {searchResults.map(m=>(
                  <button key={m.id} onClick={()=>selectMember(m)}
                    style={{ padding:'12px 14px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:9, textAlign:'left', cursor:'pointer', fontFamily:'inherit', transition:'all .12s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.orange;e.currentTarget.style.background=T.orangeL}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background='#fff'}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{m.memberName} {m.surname||''}</div>
                        <div style={{ fontSize:11, color:T.gray, marginTop:2 }}>
                          {m.payrollNumber&&`Payroll: ${m.payrollNumber}`}
                          {m.idNumber&&` · ID: ${m.idNumber}`}
                        </div>
                      </div>
                      <StatusPill label={m.status||'Active'} color={m.status==='Active'?'#059669':T.amber}/>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length>=3 && searchResults.length===0 && (
              <div style={{ textAlign:'center', padding:24, color:T.gray }}>
                <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:6 }}>No members found</div>
                <div style={{ fontSize:12, marginBottom:14 }}>The member may not be in the database yet. You can proceed without a member match.</div>
                <button onClick={()=>setStep('summary')}
                  style={{ padding:'9px 18px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  Proceed without member match →
                </button>
              </div>
            )}
          </Card>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>setStep('upload')} style={{ flex:1, padding:'12px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: SUMMARY ── */}
      {step==='summary' && (
        <div style={{ maxWidth:720, margin:'0 auto', width:'100%' }}>

          {/* Claim Summary Header */}
          <div style={{ background:`linear-gradient(135deg,${T.navy},#1a3a6b)`, borderRadius:12, padding:'18px 22px', color:'#fff', marginBottom:16 }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:4 }}>Funeral Claim Summary</div>
            <div style={{ fontSize:18, fontWeight:900, marginBottom:4 }}>{claimData.deceasedName || 'Deceased'}</div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:12, color:'rgba(255,255,255,0.6)' }}>
              <span>{selectedType?.label}</span>
              <span>·</span>
              <span>{employer?.name}</span>
              {claimData.dateOfDeath && <><span>·</span><span>Date of Death: {claimData.dateOfDeath}</span></>}
            </div>
          </div>

          {/* Member Verification */}
          <Card title="Member Verification" color={foundMember?'#059669':T.amber}>
            {foundMember ? (
              <>
                <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:12 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'#f0fdf4', border:'2px solid #059669', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#059669' }}>✓</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#059669' }}>Member Verified in AEB Database</div>
                    <div style={{ fontSize:11, color:T.gray }}>Match confirmed — member record found</div>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    ['Member Name',       `${foundMember.memberName} ${foundMember.surname||''}`],
                    ['Payroll Number',    foundMember.payrollNumber],
                    ['ID Number',         foundMember.idNumber],
                    ['Benefit Category',  foundMember.benefitCategory],
                    ['Status',            foundMember.status],
                    ['Effective Date',    foundMember.effectiveDate],
                  ].map(([l,v])=>(
                    <div key={l} style={{ background:'#f9fafb', borderRadius:7, padding:'8px 10px' }}>
                      <div style={{ fontSize:9, fontWeight:700, color:T.gray, textTransform:'uppercase', marginBottom:2 }}>{l}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{v||'—'}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'#fffbeb', border:`2px solid ${T.amber}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:T.amber }}>!</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:T.amber }}>No Member Match Found</div>
                  <div style={{ fontSize:11, color:T.gray }}>Claim can proceed — member verification may be done manually</div>
                </div>
              </div>
            )}
          </Card>

          {/* Cover Details */}
          <Card title="Cover Details" color={T.blue}>
            {claimType==='main_member' ? (
              <>
                <Row label="Claim Type"      value="Main Member Funeral"/>
                <Row label="Cover Amount"    value={mainCover?`R${mainCover.toLocaleString()}`:'R57/member (check schedule)'} bold color={T.blue}/>
                <Row label="Funeral Scheme"  value={benefitProfile?.funeralCover?.scheme||'—'}/>
                <Row label="Administrator"   value={benefitProfile?.funeralCover?.administrator||'—'}/>
              </>
            ) : (
              <>
                <Row label="Claim Type"      value="Extended Family Funeral"/>
                <Row label="Available"       value={extCover?'Yes':'Not configured'} color={extCover?'#059669':T.red}/>
                <Row label="Relationship"    value={claimData.relationship}/>
                <Row label="Scheme"          value={benefitProfile?.extendedFuneral?.scheme||'—'}/>
                <Row label="Administrator"   value={benefitProfile?.extendedFuneral?.administrator||'—'}/>
              </>
            )}
          </Card>

          {/* Waiting Period */}
          {foundMember && wpStatus && (
            <Card title="Waiting Period" color={wpStatus.ok?'#059669':T.red}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:wpStatus.ok?'#f0fdf4':'#fff1f2', border:`2px solid ${wpStatus.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:wpStatus.color, flexShrink:0 }}>
                  {wpStatus.ok?'✓':'!'}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:wpStatus.color }}>{wpStatus.label}</div>
                  <div style={{ fontSize:11, color:T.gray, marginTop:2 }}>3-month waiting period from effective date: {foundMember.effectiveDate||'Unknown'}</div>
                </div>
              </div>
            </Card>
          )}

          {/* Documents */}
          <Card title="Required Documents" color={T.navy}
            badge={<span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10, background:uploadedDocs.length>=(selectedType?.docs.length||0)?'#f0fdf4':'#fff1f2', color:uploadedDocs.length>=(selectedType?.docs.length||0)?'#059669':T.red }}>{uploadedDocs.length}/{selectedType?.docs.length||0} uploaded</span>}>
            <div style={{ marginBottom:12 }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                {(selectedType?.docs||[]).map(doc=>(
                  <button key={doc} onClick={()=>setUploadedDocs(prev=>prev.includes(doc)?prev.filter(d=>d!==doc):[...prev,doc])}
                    style={{ padding:'5px 10px', borderRadius:20, border:`1.5px solid ${uploadedDocs.includes(doc)?'#059669':T.border}`, background:uploadedDocs.includes(doc)?'#f0fdf4':'#fff', color:uploadedDocs.includes(doc)?'#059669':T.gray, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                    {uploadedDocs.includes(doc)?'✓ ':''}{doc}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:11, color:T.gray }}>Click to mark documents as received</div>
            </div>
            <DocChecklist required={selectedType?.docs||[]} uploaded={uploadedDocs}/>
          </Card>

          {/* Claim details */}
          <Card title="Claim Details" color={T.purple}>
            <Row label="Deceased"          value={claimData.deceasedName}/>
            <Row label="Date of Death"     value={claimData.dateOfDeath} mono/>
            <Row label="Natural/Unnatural" value={claimData.causeOfDeath}/>
            <Row label="Funeral Parlour"   value={claimData.funeralParlour}/>
            <Row label="Funeral Date"      value={claimData.funeralDate} mono/>
            <Row label="Funeral Cost"      value={claimData.funeralCost?`R${Number(claimData.funeralCost).toLocaleString()}`:'Not provided'}/>
            <Row label="Claimant"          value={claimData.claimantName} bold/>
            <Row label="Claimant Contact"  value={claimData.claimantPhone}/>
            <Row label="Bank"              value={`${claimData.claimantBank} · ${claimData.claimantAccType}`}/>
          </Card>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>setStep('search')} style={{ flex:1, padding:'12px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
            <button onClick={registerClaim}
              style={{ flex:2, padding:'12px', background:T.green, border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
              ✓ Register Claim
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: COMPLETE ── */}
      {step==='complete' && (
        <div style={{ maxWidth:560, margin:'0 auto', width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
          <div style={{ fontSize:22, fontWeight:800, color:T.text, marginBottom:8 }}>Claim Registered</div>
          <div style={{ fontSize:13, color:T.gray, marginBottom:24, lineHeight:1.7 }}>
            The funeral claim has been registered and allocated to a Claims Administrator.
          </div>

          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'18px 22px', marginBottom:20, textAlign:'left' }}>
            {[
              ['Claim Reference',   claimRef],
              ['Claim Type',        selectedType?.label],
              ['Employer',          employer?.name],
              ['Deceased',          claimData.deceasedName],
              ['Allocated To',      allocatedTo?.name || 'Claims Queue'],
              ['SLA',               '5 business days'],
              ['Documents Received',`${uploadedDocs.length} of ${selectedType?.docs.length}`],
            ].map(([l,v])=>(
              <div key={l} style={{ display:'flex', gap:16, padding:'6px 0', borderBottom:'1px solid #f3f4f6' }}>
                <span style={{ fontSize:11, fontWeight:700, color:T.gray, textTransform:'uppercase', width:140, flexShrink:0 }}>{l}</span>
                <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{v||'—'}</span>
              </div>
            ))}
          </div>

          {uploadedDocs.length < (selectedType?.docs.length||0) && (
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:9, padding:'12px 16px', marginBottom:16, fontSize:12, color:'#92400e', textAlign:'left' }}>
              <strong>Outstanding Documents:</strong> {(selectedType?.docs||[]).filter(d=>!uploadedDocs.includes(d)).join(', ')}. Leandre AI will monitor and follow up.
            </div>
          )}

          <button onClick={()=>{ setStep('select'); setEmployerId(''); setClaimType(null); setFiles([]); setExtracted(null); setFoundMember(null); setClaimData({deceasedName:'',deceasedId:'',dateOfDeath:'',causeOfDeath:'',relationship:'',claimantName:'',claimantId:'',claimantPhone:'',claimantEmail:'',claimantBank:'',claimantAccNo:'',claimantAccType:'Cheque',funeralParlour:'',funeralDate:'',funeralCost:'',notes:''}); setUploadedDocs([]); setSearchQuery(''); }}
            style={{ padding:'11px 28px', background:T.navy, border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Register Another Claim
          </button>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
