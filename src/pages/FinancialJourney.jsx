import { useState } from 'react'
import { T } from '../data.js'

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL JOURNEY — adviser presentation screen (ADD-ON)
//
// Reads values already calculated by FinancialConsultation. It does NOT
// recalculate anything and does NOT contain Transfer Boost or Contribution
// Boost mathematics — those formulas are added once approved.
// ═══════════════════════════════════════════════════════════════════════════

const R = (v,d=0) => v!=null ? 'R'+Number(v).toLocaleString('en-ZA',{minimumFractionDigits:d,maximumFractionDigits:d}) : '—'

// Approved bands — maximum POTENTIAL boost by term to normal retirement age
const BOOST_BANDS = [
  { min:30, max:99, pct:15,   label:'30+ years'    },
  { min:25, max:30, pct:12.5, label:'25–30 years'  },
  { min:20, max:25, pct:10,   label:'20–25 years'  },
  { min:15, max:20, pct:7.5,  label:'15–20 years'  },
  { min:5,  max:15, pct:5,    label:'5–15 years'   },
]
const bandFor = yrs => BOOST_BANDS.find(b => yrs >= b.min && yrs < b.max) || BOOST_BANDS[BOOST_BANDS.length-1]

const BOOST_PARTS = [
  { name:'Health Checks',                  cap:'Up to 2%',   detail:'BMI · Cholesterol · Blood pressure' },
  { name:'Active Rewards',                 cap:'Up to 2%',   detail:'Physical activity goals' },
  { name:'Vitality Money / Discovery Pay', cap:'Up to 3.5%', detail:'Through Vitality Health Tracker, members can earn 3.5%' },
]

const MEASURE = [
  { name:'TRANSFER BOOST',     sub:'Immediate uplift on transfer',      clr:'#22d3ee' },
  { name:'CONTRIBUTION BOOST', sub:'Up to 15% extra at no extra cost',  clr:'#38bdf8' },
  { name:'COMPOUND GROWTH',    sub:'Biggest driver of long-term value', clr:'#818cf8' },
  { name:'DAY-TO-DAY REWARDS', sub:'Improving life every day',          clr:'#c084fc' },
  { name:'LONG-TERM VALUE',    sub:'Greatest total value across career',clr:'#e879f9' },
]

const ECOSYSTEM = [
  { name:'Vitality',                body:'Health, fitness and wellness engagement programme.' },
  { name:'Discovery Pay / Vitality Money', body:'Entry-level transaction account with the Vitality Money programme.' },
  { name:'Banking',                 body:'Discovery Bank transactional and savings options.' },
  { name:'Insurance',               body:'Life, health and short-term insurance options.' },
  { name:'Fuel',                    body:'Fuel benefits linked to Vitality engagement.' },
  { name:'Food',                    body:'HealthyFood benefits at partner retailers.' },
  { name:'Wellness',                body:'Health checks, screenings and wellness partners.' },
]

const DISCOVERY_PAY = [
  '10% discount on all bookings through the Vitality Travel platform',
  'Pay other Discovery clients using just their cellphone number',
  'Access to Vitality\u2019s network of health and fitness partners with Pay',
  'Instantly settle medical bills, without hassle of paperwork',
]

// ─── UI ───────────────────────────────────────────────────────────────────
const CARD = { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:14 }

function Panel({ title, accent='#22d3ee', children, sub }) {
  return (
    <div style={{ ...CARD, padding:'18px 20px', marginBottom:16 }}>
      <div style={{ fontSize:12, fontWeight:800, color:accent, textTransform:'uppercase', letterSpacing:'1px', marginBottom:sub?4:12 }}>{title}</div>
      {sub && <div style={{ fontSize:12, color:'rgba(255,255,255,0.55)', marginBottom:12, lineHeight:1.6 }}>{sub}</div>}
      {children}
    </div>
  )
}

function Stat({ label, value, clr='#fff', note }) {
  return (
    <div style={{ ...CARD, padding:'14px 15px' }}>
      <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:5, lineHeight:1.4 }}>{label}</div>
      <div style={{ fontSize:19, fontWeight:900, color:clr, lineHeight:1.15 }}>{value}</div>
      {note && <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:3 }}>{note}</div>}
    </div>
  )
}

function Btn({ children, onClick, primary }) {
  return (
    <button onClick={onClick} style={{
      padding:'10px 20px', borderRadius:9, cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:800,
      border: primary ? 'none' : '1px solid rgba(255,255,255,0.25)',
      background: primary ? 'linear-gradient(135deg,#22d3ee,#a855f7)' : 'transparent',
      color:'#fff',
    }}>{children}</button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
export default function FinancialJourney({ consultation, caseData, employer, currentUser, onSaveJourney, onClose }) {
  const [expanded, setExpanded]   = useState(null)
  const [modelled, setModelled]   = useState([])   // options modelled
  const [viewed, setViewed]       = useState([])   // options viewed
  const [notes, setNotes]         = useState('')
  const [requested, setRequested] = useState(false)

  // Values come from the existing Financial Wizard — nothing recalculated here
  const p        = consultation?.projection || {}
  const member   = consultation?.member || {}
  const salary   = parseFloat(String(member.salary).replace(/[^0-9.]/g,'')) || 0
  const years    = p.years ?? null
  const band     = years != null ? bandFor(years) : null
  const existing = (consultation?.journey?.prevFundValue || 0)
                 + (consultation?.journey?.preservationValue || 0)
                 + (consultation?.journey?.raValue || 0)

  const track = (list, setList, name) => { if (!list.includes(name)) setList([...list, name]) }

  function requestToProceed() {
    if (!window.confirm('Record a request to proceed with a revised exemption motivation?')) return
    setRequested(true)
    onSaveJourney?.({
      member: `${member.firstName||''} ${member.surname||''}`.trim(),
      adviser: currentUser?.name, adviserId: currentUser?.id,
      caseRef: caseData?.ref || null,
      at: new Date().toISOString(),
      fundingRatio: p.fundingRatio ?? null,
      monthlyShortfall: p.gap ?? null,
      optionsViewed: viewed, optionsModelled: modelled,
      notes, requestToProceed: true,
    })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(2,6,23,0.85)', zIndex:650, display:'flex', justifyContent:'flex-end' }}>
      <div style={{ width:'min(1080px,100vw)', height:'100vh', overflowY:'auto', background:'#0b1220', color:'#fff',
                    fontFamily:'inherit', boxShadow:'-12px 0 48px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div style={{ padding:'26px 28px 22px', background:'linear-gradient(135deg,#0b1220 0%,#131c33 55%,#1b1440 100%)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#22d3ee', textTransform:'uppercase', letterSpacing:'1.4px', marginBottom:10 }}>Financial Journey</div>
              <div style={{ fontSize:30, fontWeight:800, lineHeight:1.2, marginBottom:10 }}>
                Not a new fund.<br/><span style={{ color:'#38bdf8' }}>A better financial journey.</span>
              </div>
              <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.6)', lineHeight:1.7, maxWidth:640 }}>
                The decision is no longer which fund contributes the highest percentage today. It is which solution
                delivers the <strong style={{color:'#fff'}}>greatest total value</strong> across a full working career —
                and gives employees options to improve life every day.
              </div>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:9, border:'1px solid rgba(255,255,255,0.2)', background:'transparent', color:'#fff', fontSize:18, cursor:'pointer', flexShrink:0 }}>×</button>
          </div>
        </div>

        <div style={{ padding:'20px 28px 40px' }}>

          {/* 1 — MEMBER POSITION */}
          <Panel title="Member Financial Position" accent="#22d3ee">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10 }}>
              <Stat label="Member"  value={`${member.firstName||''} ${member.surname||''}`.trim()||'—'}/>
              <Stat label="Age"     value={member.age || (p.years!=null&&member.retAge?member.retAge-p.years:'—')}/>
              <Stat label="Current Salary" value={R(salary)+'/mo'}/>
              <Stat label="Years to Retirement" value={years!=null?`${years} years`:'—'}/>
              <Stat label="Current Retirement Value" value={R(existing)} clr="#818cf8"/>
              <Stat label="Monthly Contribution" value={R(consultation?.netContribution ?? p.monthlyContribution)} clr="#38bdf8"/>
            </div>
          </Panel>

          {/* 2 — EXECUTIVE SUMMARY */}
          <Panel title="Executive Summary" accent="#38bdf8" sub="Values carried through from the Financial Wizard — not recalculated here.">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
              <Stat label="Projected Retirement Value" value={R(p.total)}       clr="#38bdf8"/>
              <Stat label="Today's Purchasing Power"   value={R(p.todayVal)}    clr="#22d3ee" note="Inflation adjusted"/>
              <Stat label="Estimated Retirement Income" value={R(p.monthlyInc)+'/mo'} clr="#4ade80"/>
              <Stat label="Target Retirement Income"   value={R(p.targetInc)+'/mo'}  clr="#a5b4fc"/>
              <Stat label="Monthly Shortfall"          value={p.gap>0?R(p.gap)+'/mo':'None'} clr={p.gap>0?'#fb7185':'#4ade80'} note="Today's value"/>
              <Stat label="Funding Ratio"              value={p.fundingRatio!=null?`${Math.round(p.fundingRatio)}%`:'—'}
                    clr={p.fundingRatio>=90?'#4ade80':p.fundingRatio>=70?'#fbbf24':'#fb7185'}/>
            </div>
          </Panel>

          {/* 3 + 7 — THE COMPLETE MEASURE */}
          <Panel title="The Complete Measure" accent="#c084fc"
                 sub="The objective is not simply to look at today's contribution. It is to understand the total value created over the member's working career.">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:10 }}>
              {MEASURE.map((m,i) => (
                <div key={m.name} style={{ ...CARD, padding:'15px 14px', borderTop:`3px solid ${m.clr}`, position:'relative' }}>
                  <div style={{ fontSize:11.5, fontWeight:900, color:m.clr, marginBottom:5, letterSpacing:'0.3px' }}>{i>0?'+ ':''}{m.name}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', lineHeight:1.5 }}>{m.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:14, padding:'14px 18px', borderRadius:11, background:'linear-gradient(90deg,rgba(34,211,238,0.16),rgba(168,85,247,0.22))', fontSize:13, fontWeight:700 }}>
              A holistic approach that goes beyond contributions to deliver the greatest long-term value.
            </div>
          </Panel>

          {/* 4 — CONTRIBUTION BOOST */}
          <Panel title="Contribution Boost" accent="#38bdf8" sub="Maximum potential boost based on term to normal retirement age.">
            {band && (
              <div style={{ ...CARD, padding:'15px 18px', marginBottom:14, borderLeft:'3px solid #38bdf8' }}>
                <div style={{ display:'flex', gap:28, flexWrap:'wrap', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:3 }}>Years to retirement</div>
                    <div style={{ fontSize:22, fontWeight:900 }}>{years} years</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', marginBottom:3 }}>Maximum potential Contribution Boost</div>
                    <div style={{ fontSize:22, fontWeight:900, color:'#38bdf8' }}>{band.pct}%</div>
                  </div>
                  <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.45)', fontStyle:'italic', flex:1, minWidth:200 }}>
                    Maximum potential boost — not an amount the member automatically receives.
                    Actual eligibility is subject to engagement and the approved rules.
                  </div>
                </div>
              </div>
            )}
            {/* Bands */}
            <div style={{ display:'flex', gap:8, alignItems:'flex-end', marginBottom:16 }}>
              {BOOST_BANDS.map(b => {
                const active = band && b.label===band.label
                return (
                  <div key={b.label} style={{ flex:1, textAlign:'center' }}>
                    <div style={{ fontSize:12, fontWeight:800, color:active?'#fff':'rgba(255,255,255,0.5)', marginBottom:4 }}>{b.pct}%</div>
                    <div style={{ height:Math.max(b.pct*5,22), borderRadius:'6px 6px 0 0',
                                  background:active?'linear-gradient(180deg,#22d3ee,#a855f7)':'rgba(255,255,255,0.10)' }}/>
                    <div style={{ fontSize:9.5, color:active?'#fff':'rgba(255,255,255,0.45)', marginTop:5, fontWeight:active?800:400 }}>{b.label}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>Made up of the following parts</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:10 }}>
              {BOOST_PARTS.map(part => (
                <div key={part.name} style={{ ...CARD, padding:'13px 15px' }}>
                  <div style={{ fontSize:12.5, fontWeight:800, marginBottom:3 }}>{part.name}</div>
                  <div style={{ fontSize:14, fontWeight:900, color:'#c084fc', marginBottom:5 }}>{part.cap}</div>
                  <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.5)', lineHeight:1.5 }}>{part.detail}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* 5 + 6 — TRANSFER BOOST / LONG-TERM MODELLING */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16, marginBottom:16 }}>
            <div style={{ ...CARD, padding:'18px 20px' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#22d3ee', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>Transfer Boost</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.6, marginBottom:14 }}>An immediate uplift to the member's fund on transfer.</div>
              <Btn onClick={()=>{ track(modelled,setModelled,'Transfer Boost'); alert('Transfer Boost modelling\n\nThe approved Transfer Boost formula has not been supplied yet, so no figure is calculated here.\n\nThis option has been recorded as modelled in the consultation.') }}>Model Transfer Boost</Btn>
              {modelled.includes('Transfer Boost') && <div style={{ fontSize:10.5, color:'#4ade80', marginTop:8 }}>✓ Recorded as modelled</div>}
            </div>
            <div style={{ ...CARD, padding:'18px 20px' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#818cf8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>Long-Term Modelling</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.6, marginBottom:14 }}>Projections that run the full career, not just year one.</div>
              <Btn onClick={()=>{ track(modelled,setModelled,'Long-Term Value'); alert(`Long-term projection (from the existing Financial Wizard)\n\nProjected retirement value: ${R(p.total)}\nToday's purchasing power: ${R(p.todayVal)}\nEstimated monthly income: ${R(p.monthlyInc)}\nFunding ratio: ${p.fundingRatio!=null?Math.round(p.fundingRatio)+'%':'—'}\n\nRecorded as modelled.`) }}>Model Long-Term Value</Btn>
              {modelled.includes('Long-Term Value') && <div style={{ fontSize:10.5, color:'#4ade80', marginTop:8 }}>✓ Recorded as modelled</div>}
            </div>
          </div>

          {/* Current vs Better — framework awaiting approved formulas */}
          <Panel title="Current Position vs Better Financial Journey" accent="#e879f9"
                 sub="Comparison framework. Figures populate once the approved Transfer Boost and Contribution Boost formulas are supplied.">
            <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr', gap:8, fontSize:11.5 }}>
              <div style={{ fontWeight:800, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', fontSize:9.5, padding:'6px 0' }}>Measure</div>
              <div style={{ fontWeight:800, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', fontSize:9.5, padding:'6px 0' }}>Current</div>
              <div style={{ fontWeight:800, color:'#e879f9', textTransform:'uppercase', fontSize:9.5, padding:'6px 0' }}>Better Journey</div>
              {[
                ['Projected retirement value', R(p.total)],
                ['Estimated retirement income', R(p.monthlyInc)+'/mo'],
                ['Monthly shortfall', p.gap>0?R(p.gap)+'/mo':'None'],
                ['Funding ratio', p.fundingRatio!=null?`${Math.round(p.fundingRatio)}%`:'—'],
              ].map(([label,cur])=>(
                <div key={label} style={{ display:'contents' }}>
                  <div style={{ padding:'9px 0', borderTop:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.75)' }}>{label}</div>
                  <div style={{ padding:'9px 0', borderTop:'1px solid rgba(255,255,255,0.07)', fontWeight:800 }}>{cur}</div>
                  <div style={{ padding:'9px 0', borderTop:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.35)', fontStyle:'italic' }}>Awaiting approved formulas</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* 8 — DISCOVERY ECOSYSTEM */}
          <Panel title="Discovery Ecosystem" accent="#c084fc" sub="Banking, insurance, fuel, food and wellness — options to engage.">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:9 }}>
              {ECOSYSTEM.map(e => {
                const open = expanded===e.name
                return (
                  <div key={e.name} onClick={()=>{ setExpanded(open?null:e.name); track(viewed,setViewed,e.name) }}
                    style={{ ...CARD, padding:'13px 15px', cursor:'pointer', borderColor:open?'rgba(192,132,252,0.5)':'rgba(255,255,255,0.10)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:12.5, fontWeight:800 }}>{e.name}</span>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{open?'−':'+'}</span>
                    </div>
                    {open && <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', lineHeight:1.55, marginTop:8 }}>{e.body}</div>}
                  </div>
                )
              })}
            </div>
          </Panel>

          {/* DISCOVERY PAY */}
          <Panel title="Discovery Pay at Zero Cost" accent="#22d3ee"
                 sub="Discovery Pay is an entry-level Discovery Bank transaction account with the Vitality Money programme.">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:9, marginBottom:12 }}>
              {DISCOVERY_PAY.map(item => (
                <div key={item} style={{ ...CARD, padding:'12px 14px', fontSize:11.5, color:'rgba(255,255,255,0.75)', lineHeight:1.55 }}>{item}</div>
              ))}
            </div>
            <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(34,211,238,0.10)', border:'1px solid rgba(34,211,238,0.28)', fontSize:12, lineHeight:1.6 }}>
              All Umbrella Fund members will be given access to a free <strong style={{color:'#c084fc'}}>Discovery Pay account</strong> with <strong style={{color:'#c084fc'}}>Vitality Money</strong>.
            </div>
          </Panel>

          {/* 9 + 10 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16, marginBottom:16 }}>
            <div style={{ ...CARD, padding:'18px 20px' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#38bdf8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>Improved Discovery Pricing</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.6, marginBottom:14 }}>A more competitive structure than the original submission.</div>
              <Btn onClick={()=>{ track(viewed,setViewed,'Improved Discovery Pricing'); alert('Improved Discovery Pricing\n\nPricing detail has not been supplied to the portal, so no figures are shown here.\n\nRecorded as viewed in this consultation.') }}>View</Btn>
            </div>
            <div style={{ ...CARD, padding:'18px 20px', borderColor:requested?'rgba(74,222,128,0.4)':'rgba(255,255,255,0.10)' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#e879f9', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>Request to Proceed</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.6, marginBottom:14 }}>Authority to prepare a revised exemption motivation.</div>
              {requested
                ? <div style={{ fontSize:12, fontWeight:800, color:'#4ade80' }}>✓ Request recorded — {currentUser?.name}, {new Date().toISOString().split('T')[0]}</div>
                : <Btn primary onClick={requestToProceed}>Request to Proceed</Btn>}
            </div>
          </div>

          {/* Adviser notes */}
          <Panel title="Adviser Notes" accent="#a5b4fc">
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Discussion points, options explored, member questions…"
              style={{ width:'100%', minHeight:90, resize:'vertical', padding:'11px 13px', borderRadius:9,
                       background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.14)',
                       color:'#fff', fontSize:12.5, fontFamily:'inherit', boxSizing:'border-box' }}/>
            <div style={{ marginTop:12, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <Btn primary onClick={()=>{
                onSaveJourney?.({
                  member: `${member.firstName||''} ${member.surname||''}`.trim(),
                  adviser: currentUser?.name, adviserId: currentUser?.id,
                  caseRef: caseData?.ref || null, at: new Date().toISOString(),
                  fundingRatio: p.fundingRatio ?? null, monthlyShortfall: p.gap ?? null,
                  optionsViewed: viewed, optionsModelled: modelled, notes, requestToProceed: requested,
                })
                alert('Financial Journey saved to the consultation.')
              }}>Save Financial Journey</Btn>
              <span style={{ fontSize:10.5, color:'rgba(255,255,255,0.4)' }}>
                {viewed.length} viewed · {modelled.length} modelled
              </span>
            </div>
          </Panel>

          <div style={{ fontSize:10, color:'rgba(255,255,255,0.32)', lineHeight:1.7, marginTop:6 }}>
            This screen is an adviser-support tool presenting potential options for discussion. It does not constitute
            advice or a suitability recommendation. The licensed financial adviser remains responsible for advice and
            suitability. Transfer Boost and Contribution Boost figures shown are maximum potential values only.
          </div>
        </div>
      </div>
    </div>
  )
}
