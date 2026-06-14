// ================================================================
// AMCU FUNERAL PORTAL — Submission Detail Modal
// Null-safe — never crashes regardless of record structure
// ================================================================
import { useState } from "react"
import { getAuditTrail, logDocumentAction } from "./supabase.js"

const BK="#1A2B0F", GD="#3D6B0F", G="#5E9E1A", GL="#E8F5D3"
const GY="#6B7280", GYL="#F9FAFB", WH="#FFFFFF"

// ── Safe helpers ─────────────────────────────────────────────────
function safe(val, fallback) {
  if (val === null || val === undefined || val === '') return fallback || '—'
  return String(val)
}

function safeParse(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch(_) { return [] }
  }
  return []
}

// ── PDF builder — defined here so component is self-contained ────
function buildPDFHTML(rec) {
  if (!rec) return '<html><body>No record</body></html>'
  const bens = safeParse(rec.beneficiaries)
  const ext  = safeParse(rec.extended_family)
  const date = rec.submitted_at
    ? new Date(rec.submitted_at).toLocaleDateString('en-ZA')
    : '—'

  const benRows = bens.length
    ? bens.map(b=>`<tr><td>${safe(b.name,'—')}</td><td>${safe(b.relationship,'—')}</td><td>${safe(b.contact,'—')}</td></tr>`).join('')
    : '<tr><td colspan="3" style="color:#999">No beneficiary recorded</td></tr>'

  const extRows = ext.length
    ? ext.map(e=>{
    const cv = e.cover && e.cover !== '#N/A' && e.cover !== ''
      ? 'R' + Number(e.cover).toLocaleString('en-ZA')
      : safe(e.option, '—')
    return `<tr><td>${safe(e.name,'—')}</td><td>${safe(e.relationship,'—')}</td><td>${safe(e.age,'—')}</td><td>${cv}</td><td>R${safe(e.premium,'0')}/mo</td></tr>`
  }).join('')
    : '<tr><td colspan="4" style="color:#999">No extended family recorded</td></tr>'

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${safe(rec.ref_no,'AMCU')}.pdf</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:0;font-size:11px}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 16mm;box-sizing:border-box}
  .hdr{text-align:center;border-bottom:3px solid #1A2B0F;padding-bottom:10px;margin-bottom:14px}
  .org{font-size:18px;font-weight:900;color:#1A2B0F;letter-spacing:2px}
  .sec{font-size:9px;font-weight:800;color:#3D6B0F;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:2px;margin:12px 0 6px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}
  .lbl{font-size:8px;font-weight:700;color:#666;letter-spacing:1px;text-transform:uppercase}
  .val{font-size:11px;font-weight:600;border-bottom:1px solid #aaa;padding-bottom:1px;min-height:14px}
  .prem{background:#E8F5D3;border:2px solid #3D6B0F;border-radius:4px;padding:8px;margin:8px 0;display:flex;justify-content:space-between}
  table{border-collapse:collapse;width:100%;margin-bottom:8px}
  th{background:#E8F5D3;padding:5px 6px;text-align:left;font-size:9px;font-weight:800;color:#3D6B0F}
  td{padding:5px 6px;border-bottom:1px solid #E8F5D3;font-size:10px}
  .sig-box{border:1px solid #999;border-radius:3px;padding:6px;min-height:60px;display:inline-block;min-width:160px}
  .footer{margin-top:14px;border-top:1px solid #ccc;padding-top:6px;font-size:8px;color:#999;text-align:center}
  @media print{body{margin:0}}
</style></head><body>
<div class="page">
  <div class="hdr">
    <div class="org">A M C U</div>
    <div style="font-size:12px;font-weight:700;color:#3D6B0F;margin-top:3px">FAMILY FUNERAL PLAN — APPLICATION RECORD</div>
    <div style="font-size:10px;color:#666;margin-top:3px">Ref: ${safe(rec.ref_no)} &nbsp;|&nbsp; Date: ${date} &nbsp;|&nbsp; Consultant: ${safe(rec.consultant_name)}</div>
  </div>
  <div class="prem">
    <span style="font-weight:700">Monthly Deduction</span>
    <span style="font-weight:900;font-size:16px;color:#3D6B0F">R${safe(rec.total_premium,'57')}/mo</span>
  </div>
  <div class="sec">Member Details</div>
  <div class="grid">
    <div><div class="lbl">Full Name</div><div class="val">${safe(rec.member_name)}</div></div>
    <div><div class="lbl">ID Number</div><div class="val">${safe(rec.member_id)}</div></div>
    <div><div class="lbl">Payroll Number</div><div class="val">${safe(rec.payroll_no)}</div></div>
    <div><div class="lbl">Employer</div><div class="val">${safe(rec.employer)}</div></div>
    <div><div class="lbl">Deduction Start</div><div class="val">${safe(rec.deduction_start)}</div></div>
    <div><div class="lbl">Submission Date</div><div class="val">${date}</div></div>
  </div>
  <div class="sec">Beneficiary</div>
  <table><thead><tr><th>Name</th><th>Relationship</th><th>Contact</th></tr></thead><tbody>${benRows}</tbody></table>
  <div class="sec">Extended Family</div>
  <table><thead><tr><th>Name</th><th>Relationship</th><th>Age</th><th>Cover</th><th>Premium</th></tr></thead><tbody>${extRows}</tbody></table>
  <div class="sec">Premium</div>
  <table>
    <tr><td>Main Policy</td><td style="text-align:right;font-weight:700">R${safe(rec.main_premium,'57')}/mo</td></tr>
    <tr><td>Extended Family</td><td style="text-align:right;font-weight:700">R${safe(rec.extended_premium,'0')}/mo</td></tr>
    <tr><td style="font-weight:800">Total</td><td style="text-align:right;font-weight:900;font-size:14px">R${safe(rec.total_premium,'57')}/mo</td></tr>
  </table>
  <div class="sec">Declaration</div>
  <div style="background:#f9f9f9;border:1px solid #ddd;border-radius:3px;padding:8px;font-size:10px;font-style:italic;line-height:1.6">
    "I hereby apply for the AMCU Family Funeral Plan membership and, without reserve, authorise the Company to deduct from my monthly salary an amount of <strong>R57.00</strong> as the participation fee."
  </div>
  <div class="sec">Authorisation</div>
  <div style="display:flex;gap:12px;margin-top:6px">
    <div class="sig-box">
      <div class="lbl" style="margin-bottom:4px">Member Signature</div>
      ${rec.signature_data ? `<img src="${rec.signature_data}" style="max-width:140px;max-height:55px"/>` : '<div style="height:50px"></div>'}
      <div style="font-size:8px;border-top:1px solid #ccc;margin-top:3px;padding-top:2px">${safe(rec.member_name)}</div>
    </div>
    <div class="sig-box" style="display:flex;align-items:center;justify-content:center">
      <div>
        <div class="lbl" style="margin-bottom:4px">Date</div>
        <div style="font-size:12px;font-weight:700">${date}</div>
      </div>
    </div>
  </div>
  <div class="footer">AMCU Family Funeral Plan &nbsp;|&nbsp; ${safe(rec.ref_no)} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-ZA')}</div>
</div></body></html>`
}

function htmlToBase64(html) {
  try {
    const bytes = new TextEncoder().encode(html)
    let binary = ''
    bytes.forEach(b => binary += String.fromCharCode(b))
    return btoa(binary)
  } catch(_) { return '' }
}

// ── Sub-components ───────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{marginBottom:16}}>
      <div style={{fontSize:10,fontWeight:800,color:GY,letterSpacing:2,marginBottom:8,paddingBottom:4,borderBottom:`1px solid ${GL}`}}>
        {(title||'').toUpperCase()}
      </div>
      {children}
    </div>
  )
}

function Grid({ children }) {
  return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{children}</div>
}

function Field({ label, value }) {
  const display = (value === null || value === undefined || value === '') ? null : value
  if (display === null) return null
  return (
    <div>
      <div style={{fontSize:9,fontWeight:700,color:GY,letterSpacing:1,marginBottom:2}}>{(label||'').toUpperCase()}</div>
      <div style={{fontSize:13,fontWeight:600,color:BK}}>{display}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = safe(status, 'PENDING').toUpperCase()
  const col = s === 'PROCESSED' ? {bg:"#D1FAE5",c:"#065F46"} : {bg:"#FEF3C7",c:"#D97706"}
  return <span style={{background:col.bg,color:col.c,borderRadius:12,padding:"2px 10px",fontSize:10,fontWeight:800}}>{s}</span>
}

// ── Main component ────────────────────────────────────────────────
function SubmissionDetail({ record, onClose }) {
  const [trail, setTrail]           = useState([])
  const [trailLoaded, setTrailLoaded] = useState(false)
  const [showSig, setShowSig]       = useState(false)

  // Log record on every render for debugging
  console.log('[SubmissionDetail] record:', record)

  // Guard — never render with null record
  if (!record) {
    return (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:WH,borderRadius:16,padding:32,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:12}}>No record data</div>
          <button onClick={onClose} style={{padding:"8px 20px",borderRadius:8,border:"none",background:G,color:WH,fontWeight:700,cursor:"pointer"}}>Close</button>
        </div>
      </div>
    )
  }

  // Safe-parse all fields
  const bens = safeParse(record.beneficiaries)
  const ext  = safeParse(record.extended_family)
  const date = record.submitted_at
    ? (() => { try { return new Date(record.submitted_at).toLocaleString('en-ZA',{dateStyle:'long',timeStyle:'short'}) } catch(_) { return String(record.submitted_at) } })()
    : '—'

  const refNo    = safe(record.ref_no, 'UNKNOWN')
  const type     = record.is_new_member ? 'NEW MEMBER' : (ext.length > 0 ? 'EXTENDED FAMILY' : 'BENEFICIARY UPDATE')

  async function loadTrail() {
    if (trailLoaded) return
    try {
      const { events } = await getAuditTrail(refNo)
      setTrail(events || [])
    } catch(e) { console.warn('[SubmissionDetail] audit trail error:', e) }
    setTrailLoaded(true)
  }

  function handlePrint() {
    try {
      const html  = buildPDFHTML(record)
      const w     = window.open('', '_blank')
      if (!w) { alert('Allow popups to print'); return }
      w.document.write(html)
      w.document.close()
      setTimeout(() => { try { w.document.title = refNo + '.pdf' } catch(_) {} ; w.print() }, 600)
      logDocumentAction(refNo, 'PDF_GENERATED', 'admin')
    } catch(e) { console.error('[SubmissionDetail] print error:', e); alert('Print failed: ' + e.message) }
  }

  function handleDownload() {
    try {
      const html = buildPDFHTML(record)
      const b64  = htmlToBase64(html)
      const a    = document.createElement('a')
      a.href     = 'data:text/html;base64,' + b64
      a.download = refNo + '.pdf'
      a.click()
      logDocumentAction(refNo, 'PDF_DOWNLOADED', 'admin')
    } catch(e) { console.error('[SubmissionDetail] download error:', e) }
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:800,display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"20px 0"}}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={{background:WH,borderRadius:16,width:"100%",maxWidth:700,margin:"0 16px",boxShadow:"0 24px 80px rgba(0,0,0,0.3)"}}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${BK},${GD})`,borderRadius:"16px 16px 0 0",padding:"16px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",letterSpacing:2,fontWeight:700,marginBottom:4}}>{type}</div>
              <div style={{fontSize:20,fontWeight:900,color:WH}}>{refNo}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginTop:2}}>
                {safe(record.member_name,'Unknown member')} &nbsp;·&nbsp; {safe(record.consultant_name,'Unknown consultant')}
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={handlePrint}
                style={{padding:"8px 14px",borderRadius:8,border:"none",background:G,color:WH,fontWeight:700,fontSize:12,cursor:"pointer"}}>
                Print PDF
              </button>
              <button onClick={handleDownload}
                style={{padding:"8px 14px",borderRadius:8,border:"none",background:"#1D4ED8",color:WH,fontWeight:700,fontSize:12,cursor:"pointer"}}>
                Download
              </button>
              <button onClick={onClose}
                style={{padding:"8px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",background:"transparent",color:WH,fontWeight:700,fontSize:12,cursor:"pointer"}}>
                ✕ Close
              </button>
            </div>
          </div>
        </div>

        <div style={{padding:"18px 20px"}}>

          {/* Member info */}
          <Section title="Member Information">
            <Grid>
              <Field label="Full Name"      value={safe(record.member_name)}      />
              <Field label="ID Number"      value={safe(record.member_id)}        />
              <Field label="Payroll Number" value={safe(record.payroll_no)}       />
              <Field label="Employer"       value={safe(record.employer)}         />
              <Field label="Submitted"      value={date}                          />
              <Field label="Consultant"     value={safe(record.consultant_name)}  />
              <Field label="Deduction Start"value={safe(record.deduction_start)} />
              <Field label="Status"         value={<StatusBadge status={record.status}/>} />
            </Grid>
          </Section>

          {/* Premium */}
          <Section title="Premium">
            <div style={{background:`linear-gradient(135deg,${GD},${BK})`,borderRadius:10,padding:"12px 16px",display:"flex",gap:20,flexWrap:"wrap"}}>
              {[
                ["Main Policy",     "R"+(record.main_premium     || 57)    +"/mo"],
                ["Extended Family", "R"+(record.extended_premium || 0)     +"/mo"],
                ["Total Deduction", "R"+(record.total_premium    || 57)    +"/mo"],
              ].map(([lbl,val])=>(
                <div key={lbl}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:700,letterSpacing:1}}>{lbl.toUpperCase()}</div>
                  <div style={{fontSize:16,fontWeight:900,color:"#A3E635"}}>{val}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Beneficiaries */}
          <Section title={`Beneficiary (${bens.length})`}>
            {bens.length === 0
              ? <div style={{fontSize:13,color:GY,fontStyle:"italic"}}>No beneficiary on record</div>
              : bens.map((b,i)=>(
                  <div key={i} style={{background:GYL,borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                    <div style={{fontWeight:700,fontSize:14}}>{safe(b.name,'—')}</div>
                    <div style={{fontSize:12,color:GY}}>{safe(b.relationship,'—')} &nbsp;·&nbsp; {safe(b.contact,'—')}</div>
                  </div>
                ))
            }
          </Section>

          {/* Extended family */}
          <Section title={`Extended Family (${ext.length})`}>
            {ext.length === 0
              ? <div style={{fontSize:13,color:GY,fontStyle:"italic"}}>No extended family on record</div>
              : <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:GYL}}>
                      {["Name","Relationship","Age","Cover","Premium"].map(h=>(
                        <th key={h} style={{padding:"6px 8px",textAlign:"left",fontSize:10,fontWeight:800,color:GY}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ext.map((e,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${GL}`}}>
                        <td style={{padding:"6px 8px",fontWeight:600}}>{safe(e.name,'—')}</td>
                        <td style={{padding:"6px 8px"}}>{safe(e.relationship,'—')}</td>
                        <td style={{padding:"6px 8px"}}>{safe(e.age,'—')}</td>
                        <td style={{padding:"6px 8px"}}>
                          {e.cover&&e.cover!='#N/A'&&e.cover!==''
                            ?'R'+Number(e.cover).toLocaleString('en-ZA')
                            :safe(e.option,'—')}
                        </td>
                        <td style={{padding:"6px 8px",fontWeight:700,color:GD}}>R{safe(e.premium,'0')}/mo</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </Section>

          {/* Signature */}
          <Section title="Digital Signature">
            {record.signature_data
              ? <div>
                  <button onClick={()=>setShowSig(s=>!s)}
                    style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${G}`,background:showSig?GL:WH,color:GD,fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:showSig?10:0}}>
                    {showSig ? "Hide Signature" : "View Signature"}
                  </button>
                  {showSig&&(
                    <div style={{background:"#FAFAFA",border:`1px solid ${GL}`,borderRadius:10,padding:12,display:"inline-block",marginTop:8}}>
                      <img src={record.signature_data} alt="Member signature" style={{maxWidth:300,maxHeight:100,display:"block"}}/>
                      <div style={{fontSize:10,color:GY,marginTop:4}}>Original signature — {safe(record.member_name)}</div>
                    </div>
                  )}
                </div>
              : <div style={{fontSize:13,color:GY,fontStyle:"italic"}}>No signature on record</div>
            }
          </Section>

          {/* Audit trail */}
          <Section title="Submission History">
            <button onClick={loadTrail}
              style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${GL}`,background:WH,color:GD,fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:10}}>
              {trailLoaded ? "Refresh History" : "Load History"}
            </button>
            {trail.length > 0 && (
              <div style={{maxHeight:180,overflowY:"auto"}}>
                {trail.map((e,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 8px",background:i%2===0?GYL:WH,borderRadius:6,marginBottom:3}}>
                    <div>
                      <span style={{fontWeight:700,fontSize:12,color:BK}}>{safe(e.action,'—')}</span>
                      {e.metadata && e.metadata.consultant_name &&
                        <span style={{fontSize:11,color:GY,marginLeft:8}}>{e.metadata.consultant_name}</span>
                      }
                    </div>
                    <div style={{fontSize:11,color:GY}}>
                      {e.created_at ? (() => { try { return new Date(e.created_at).toLocaleString('en-ZA',{dateStyle:'short',timeStyle:'short'}) } catch(_) { return '' } })() : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {trailLoaded && trail.length === 0 && (
              <div style={{fontSize:12,color:GY,fontStyle:"italic"}}>No audit history found</div>
            )}
          </Section>

        </div>
      </div>
    </div>
  )
}

export default SubmissionDetail
