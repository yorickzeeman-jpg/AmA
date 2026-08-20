import { useState } from 'react'
import { T } from '../data.js'

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFER BOOST — adviser modelling page (ADD-ON)
//
// "Here is the money you have → here is where it is going → here is the
//  Transfer Boost → here is the total → here is what it does to retirement."
//
// Reuses the wizard's existing today's-value methodology (inflation factor
// derived from the wizard's own projection). No second calculation engine.
// The Transfer Boost FORMULA is not invented — it is configured or absent.
// ═══════════════════════════════════════════════════════════════════════════

const R = (v,d=0) => (v||v===0) ? 'R'+Number(v).toLocaleString('en-ZA',{minimumFractionDigits:d,maximumFractionDigits:d}) : '—'

// Approved Transfer Boost formula not supplied — no percentage is invented.
const TRANSFER_BOOST_CONFIGURED = false
const transferBoostAmount = () => null

export default function TransferBoost({ consultation, caseData, employer, currentUser, onSave, onClose }) {
  const p       = consultation?.projection || {}
  const member  = consultation?.member || {}
  const j       = consultation?.journey || {}

  // Pulled through — the adviser does NOT recapture this
  const prevFundValue = Number(j.prevFundValue || 0)
  const preservation  = Number(j.preservationValue || 0)
  const ra            = Number(j.raValue || 0)
  const availableTotal = prevFundValue + preservation + ra

  const [transferAmt, setTransferAmt] = useState(prevFundValue || 0)
  const [saved, setSaved] = useState(false)

  const boost = transferBoostAmount(transferAmt)
  const totalAdded = boost != null ? transferAmt + boost : transferAmt

  // Reuse the wizard's own methodology: derive its inflation + drawdown
  // factors from values it already produced, rather than recalculating.
  const years        = p.years ?? 0
  const growthFactor = p.existFV && availableTotal ? (p.existFV / availableTotal) : null
  const inflFactor   = p.total && p.todayVal ? (p.total / p.todayVal) : null
  const drawdownRate = p.todayVal && p.monthlyInc ? (p.monthlyInc * 12) / p.todayVal : null

  // Impact — only computable when the wizard supplied the factors
  let impact = null
  if (growthFactor && inflFactor && drawdownRate && transferAmt > 0) {
    const alreadyIncluded = prevFundValue  // wizard already projected captured funds
    const deltaNow  = totalAdded - alreadyIncluded
    const newTotal  = (p.total || 0) + deltaNow * growthFactor
    const newToday  = newTotal / inflFactor
    const newIncome = (newToday * drawdownRate) / 12
    const target    = p.targetInc || 0
    impact = {
      total: newTotal, todayVal: newToday, monthlyInc: newIncome, targetInc: target,
      gap: Math.max(target - newIncome, 0),
      fundingRatio: target > 0 ? (newIncome / target) * 100 : 0,
    }
  }

  const destination = employer?.name
    ? `${employer.name} — current employer retirement fund`
    : (consultation?.fundName || null)

  function save() {
    setSaved(true)
    onSave?.({
      previousFundValue: prevFundValue,
      availableForTransfer: availableTotal,
      proposedTransferAmount: transferAmt,
      transferDestination: destination,
      transferBoostAmount: boost,
      transferBoostConfigured: TRANSFER_BOOST_CONFIGURED,
      totalAddedToFund: totalAdded,
      projectedFundValue: impact?.total ?? null,
      projectedTodayValue: impact?.todayVal ?? null,
      projectedRetirementIncome: impact?.monthlyInc ?? null,
      projectedMonthlyShortfall: impact?.gap ?? null,
      projectedFundingRatio: impact?.fundingRatio ?? null,
      adviser: currentUser?.name, adviserId: currentUser?.id,
      caseRef: caseData?.ref || null, at: new Date().toISOString(),
    })
  }

  const Card = ({ title, accent=T.blue, children, sub }) => (
    <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:12, marginBottom:14, overflow:'hidden' }}>
      <div style={{ padding:'11px 16px', borderBottom:`1px solid ${T.border}`, background:`linear-gradient(90deg,${accent}0d,transparent)` }}>
        <div style={{ fontSize:11, fontWeight:800, color:accent, textTransform:'uppercase', letterSpacing:'0.7px' }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:T.gray, marginTop:3 }}>{sub}</div>}
      </div>
      <div style={{ padding:'15px 16px' }}>{children}</div>
    </div>
  )

  const Metric = ({ label, value, clr }) => (
    <div style={{ background:'#f9fafb', borderRadius:9, padding:'11px 13px' }}>
      <div style={{ fontSize:9.5, color:T.gray, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:15, fontWeight:900, color:clr||T.text, fontFamily:'monospace' }}>{value}</div>
    </div>
  )

  const cmpRows = [
    ['Retirement Fund Value',            R(p.total),                       impact?R(impact.total):null],
    ["Today's Value",                    R(p.todayVal),                    impact?R(impact.todayVal):null],
    ['Projected Retirement Income',      R(p.monthlyInc)+'/mo',            impact?R(impact.monthlyInc)+'/mo':null],
    ['Target Retirement Income',         R(p.targetInc)+'/mo',             impact?R(impact.targetInc)+'/mo':null],
    ["Monthly Shortfall — Today's Value",p.gap>0?R(p.gap)+'/mo':'None',    impact?(impact.gap>0?R(impact.gap)+'/mo':'None'):null],
    ['Funding Ratio',                    p.fundingRatio!=null?`${Math.round(p.fundingRatio)}%`:'—', impact?`${Math.round(impact.fundingRatio)}%`:null],
  ]

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:660, display:'flex', justifyContent:'flex-end' }}>
      <div style={{ width:'min(900px,100vw)', height:'100vh', overflowY:'auto', background:'#f8f9fb' }}>

        <div style={{ background:`linear-gradient(135deg,${T.navy},#1a3a6b)`, padding:'20px 24px', color:'#fff' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:10, opacity:0.5, textTransform:'uppercase', letterSpacing:'1px', marginBottom:4 }}>Financial Journey</div>
              <div style={{ fontSize:22, fontWeight:900, marginBottom:6 }}>Transfer Boost</div>
              <div style={{ fontSize:12.5, opacity:0.7, lineHeight:1.6, maxWidth:560 }}>
                Let's see what transferring {member.firstName ? `${member.firstName}'s` : 'your'} existing retirement
                savings could mean for the retirement journey.
              </div>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:9, border:'1px solid rgba(255,255,255,0.2)', background:'transparent', color:'#fff', fontSize:18, cursor:'pointer' }}>×</button>
          </div>
        </div>

        <div style={{ padding:20 }}>

          {/* 1 — EXISTING RETIREMENT MONEY */}
          <Card title="1 · Existing Retirement Money" accent={T.purple} sub="Captured during the Financial Consultation — not recaptured here.">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
              <Metric label="Previous Employer Fund" value={R(prevFundValue)} clr={T.purple}/>
              {preservation>0 && <Metric label="Preservation Fund" value={R(preservation)} clr={T.purple}/>}
              {ra>0 && <Metric label="Retirement Annuity" value={R(ra)} clr={T.purple}/>}
              <Metric label="Total Available for Transfer" value={R(availableTotal)} clr={T.navy}/>
            </div>
            {availableTotal===0 && (
              <div style={{ marginTop:10, fontSize:12, color:'#92400e', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'9px 12px' }}>
                No previous retirement fund value was captured in the consultation. Capture it on the Financial Journey step to model a transfer.
              </div>
            )}
          </Card>

          {/* 2 — DESTINATION */}
          <Card title="2 · Transfer Destination" accent={T.blue}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center' }}>
              <div style={{ background:'#f9fafb', borderRadius:10, padding:'13px 15px' }}>
                <div style={{ fontSize:9.5, color:T.gray, textTransform:'uppercase', marginBottom:4 }}>Transfer From</div>
                <div style={{ fontSize:13, fontWeight:700, color:T.text }}>Previous Employer Retirement Fund</div>
              </div>
              <div style={{ fontSize:22, color:T.blue, fontWeight:900 }}>→</div>
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'13px 15px' }}>
                <div style={{ fontSize:9.5, color:T.gray, textTransform:'uppercase', marginBottom:4 }}>Transfer To</div>
                <div style={{ fontSize:13, fontWeight:700, color:T.blue }}>
                  {destination || 'Destination not yet established'}
                </div>
              </div>
            </div>
            {!destination && (
              <div style={{ marginTop:10, fontSize:11.5, color:T.gray, fontStyle:'italic' }}>
                No destination is assumed — it is taken from the employer arrangement linked to this member.
              </div>
            )}
          </Card>

          {/* 3 — TRANSFER AMOUNT */}
          <Card title="3 · Transfer Amount" accent="#059669">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div style={{ fontSize:9.5, color:T.gray, textTransform:'uppercase', marginBottom:5 }}>Existing Fund Value</div>
                <div style={{ fontSize:20, fontWeight:900, color:T.navy, fontFamily:'monospace' }}>{R(availableTotal)}</div>
              </div>
              <div>
                <div style={{ fontSize:9.5, color:T.gray, textTransform:'uppercase', marginBottom:5 }}>Proposed Transfer Amount</div>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:14, fontWeight:700, color:T.gray }}>R</span>
                  <input type="number" value={transferAmt||''} onChange={e=>setTransferAmt(Number(e.target.value)||0)}
                    style={{ width:'100%', padding:'10px 12px 10px 26px', border:`1.5px solid ${T.blue}`, borderRadius:8,
                             fontSize:18, fontWeight:900, fontFamily:'monospace', color:T.blue, boxSizing:'border-box' }}/>
                </div>
              </div>
            </div>
          </Card>

          {/* 4 — TRANSFER BOOST */}
          <Card title="4 · Transfer Boost" accent="#7c3aed" sub="An immediate uplift to the member's fund on transfer.">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
              <Metric label="Transfer Amount" value={R(transferAmt)} clr={T.navy}/>
              <Metric label="Transfer Boost"  value={boost!=null?R(boost):'To be configured'} clr="#7c3aed"/>
              <Metric label="Total Added to Retirement Fund" value={boost!=null?R(totalAdded):R(transferAmt)} clr="#059669"/>
            </div>
            {!TRANSFER_BOOST_CONFIGURED && (
              <div style={{ marginTop:11, fontSize:12, color:'#c2410c', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, padding:'10px 13px', lineHeight:1.6 }}>
                <strong>Transfer Boost calculation to be configured.</strong> No percentage or amount is assumed. Once the
                approved formula is supplied it will apply here and flow into the comparison below.
              </div>
            )}
          </Card>

          {/* 5 — IMPACT */}
          <Card title="5 · Impact on the Retirement Journey" accent={T.orange}
                sub="Today's-value figures use the Financial Wizard's existing methodology.">
            <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:8, fontSize:12.5 }}>
              <div style={{ fontSize:9.5, fontWeight:800, color:T.gray, textTransform:'uppercase', padding:'6px 0' }}>Measure</div>
              <div style={{ fontSize:9.5, fontWeight:800, color:T.gray, textTransform:'uppercase', padding:'6px 0' }}>Current Position</div>
              <div style={{ fontSize:9.5, fontWeight:800, color:'#059669', textTransform:'uppercase', padding:'6px 0' }}>With Transfer</div>
              {cmpRows.map(([label,cur,nw])=>(
                <div key={label} style={{ display:'contents' }}>
                  <div style={{ padding:'9px 0', borderTop:`1px solid ${T.border}`, color:T.gray }}>{label}</div>
                  <div style={{ padding:'9px 0', borderTop:`1px solid ${T.border}`, fontWeight:700, fontFamily:'monospace' }}>{cur}</div>
                  <div style={{ padding:'9px 0', borderTop:`1px solid ${T.border}`, fontWeight:800, fontFamily:'monospace',
                                color: nw ? '#059669' : T.gray, fontStyle: nw?'normal':'italic' }}>
                    {nw || 'Awaiting values'}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 6 — VISUAL GAP IMPROVEMENT */}
          <Card title="6 · Gap Improvement" accent="#059669">
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center', textAlign:'center' }}>
              <div style={{ background:'#fff1f2', border:'1px solid #fecaca', borderRadius:11, padding:'15px 12px' }}>
                <div style={{ fontSize:9.5, color:T.gray, textTransform:'uppercase', marginBottom:6 }}>Current</div>
                <div style={{ fontSize:24, fontWeight:900, color:'#dc2626' }}>{p.fundingRatio!=null?`${Math.round(p.fundingRatio)}%`:'—'}</div>
                <div style={{ fontSize:10, color:T.gray, marginBottom:6 }}>Funding ratio</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#dc2626' }}>{p.gap>0?R(p.gap)+'/mo':'No shortfall'}</div>
                <div style={{ fontSize:10, color:T.gray }}>Shortfall</div>
              </div>
              <div style={{ fontSize:11, fontWeight:800, color:'#7c3aed', writingMode:'horizontal-tb' }}>
                <div style={{ fontSize:20 }}>↓</div>
                TRANSFER<br/>BOOST
                <div style={{ fontSize:20 }}>↓</div>
              </div>
              <div style={{ background:impact?'#f0fdf4':'#f9fafb', border:`1px solid ${impact?'#bbf7d0':T.border}`, borderRadius:11, padding:'15px 12px' }}>
                <div style={{ fontSize:9.5, color:T.gray, textTransform:'uppercase', marginBottom:6 }}>Improved</div>
                <div style={{ fontSize:24, fontWeight:900, color:impact?'#059669':T.gray }}>{impact?`${Math.round(impact.fundingRatio)}%`:'—'}</div>
                <div style={{ fontSize:10, color:T.gray, marginBottom:6 }}>Funding ratio</div>
                <div style={{ fontSize:13, fontWeight:700, color:impact?'#059669':T.gray }}>
                  {impact ? (impact.gap>0?R(impact.gap)+'/mo':'No shortfall') : 'Awaiting values'}
                </div>
                <div style={{ fontSize:10, color:T.gray }}>Shortfall</div>
              </div>
            </div>
            {impact && impact.fundingRatio > (p.fundingRatio||0) && (
              <div style={{ marginTop:12, textAlign:'center', fontSize:12.5, fontWeight:800, color:'#059669', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:9, padding:'10px 14px' }}>
                Funding ratio improves by {Math.round(impact.fundingRatio - (p.fundingRatio||0))} percentage points
                {impact.gap < (p.gap||0) && ` · monthly shortfall reduces by ${R((p.gap||0) - impact.gap)}`}
              </div>
            )}
          </Card>

          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={save}
              style={{ padding:'12px 26px', background:T.navy, border:'none', borderRadius:10, color:'#fff', fontSize:13.5, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
              Save Transfer Boost Modelling
            </button>
            {saved && <span style={{ fontSize:12, fontWeight:700, color:'#059669' }}>✓ Saved to the consultation</span>}
          </div>

          <div style={{ fontSize:10.5, color:T.gray, lineHeight:1.7, marginTop:14 }}>
            Transfer Boost models existing retirement money only. Contribution Boost is modelled separately and the two
            are not combined. Figures are for discussion purposes; the licensed adviser remains responsible for advice
            and suitability.
          </div>
        </div>
      </div>
    </div>
  )
}
