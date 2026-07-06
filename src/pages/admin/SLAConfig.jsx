import { useState, useMemo } from 'react'
import { T } from '../../data.js'
import { inputSt } from '../../ui.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// SLA CONFIGURATION PAGE
// Administrators can change SLA targets for every case type and workflow step
// No code changes required — stored in localStorage, applied to all new cases
// ═════════════════════════════════════════════════════════════════════════════

const CATEGORY_COLORS = {
  'New Business':       '#1e5fd9',
  'Claims':             '#dc2626',
  'Exits':              '#d97706',
  'Fund Administration':'#059669',
  'Medical & Queries':  '#7c3aed',
}

export default function SLAConfig({ workflowConfig, currentUser, onUpdateConfig }) {
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [editing, setEditing]     = useState({})   // { caseName: { caseSlaDays, steps: {stepId: slaDays} } }
  const [saved, setSaved]         = useState(false)

  const isAdmin = ['general_manager','administrator'].includes(currentUser.role)
  const config  = workflowConfig || {}
  const caseTypes = Object.values(config)

  const categories = ['All', ...new Set(caseTypes.map(ct => ct.category).filter(Boolean))]

  const visible = caseTypes.filter(ct => {
    if (filterCat !== 'All' && ct.category !== filterCat) return false
    if (search && !ct.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Get current SLA for a case (editing override or config value)
  function getCaseSla(ct) {
    return editing[ct.name]?.caseSlaDays ?? ct.slaDays ?? 5
  }

  function getStepSla(ct, step) {
    return editing[ct.name]?.steps?.[step.id] ?? step.slaDays ?? 2
  }

  function updateCaseSla(ct, days) {
    setEditing(prev => ({
      ...prev,
      [ct.name]: { ...prev[ct.name], caseSlaDays: days }
    }))
  }

  function updateStepSla(ct, stepId, days) {
    setEditing(prev => ({
      ...prev,
      [ct.name]: {
        ...prev[ct.name],
        steps: { ...(prev[ct.name]?.steps||{}), [stepId]: days }
      }
    }))
  }

  function saveAll() {
    // Apply all editing changes to the config
    const updated = { ...config }
    Object.entries(editing).forEach(([caseName, changes]) => {
      if (!updated[caseName]) return
      const ct = { ...updated[caseName] }
      if (changes.caseSlaDays !== undefined) ct.slaDays = changes.caseSlaDays
      if (changes.steps) {
        ct.steps = ct.steps.map(s => ({
          ...s,
          slaDays: changes.steps[s.id] ?? s.slaDays
        }))
      }
      updated[caseName] = ct
    })
    onUpdateConfig(updated)
    setEditing({})
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const hasChanges = Object.keys(editing).length > 0
  const totalCases = visible.length
  const avgSla     = visible.length ? Math.round(visible.reduce((s,ct) => s + (getCaseSla(ct)||5), 0) / visible.length) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, animation:'fadeIn .3s ease' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:T.text, margin:'0 0 3px' }}>SLA Configuration</h1>
          <p style={{ margin:0, fontSize:12, color:T.gray }}>
            {totalCases} case types · Average SLA {avgSla} days · Changes apply to all new cases
          </p>
        </div>
        {isAdmin && hasChanges && (
          <button onClick={saveAll}
            style={{ padding:'9px 20px', background:T.green, border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
            Save All Changes
          </button>
        )}
        {saved && (
          <div style={{ padding:'9px 16px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, fontSize:12, fontWeight:700, color:T.green }}>
            SLA configuration saved
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ background:'#fff', borderRadius:10, padding:'10px 14px', border:`1px solid ${T.border}`, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search case types…"
          style={{ padding:'6px 10px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, width:220 }}/>
        {categories.map(cat => (
          <button key={cat} onClick={()=>setFilterCat(cat)}
            style={{ padding:'4px 10px', borderRadius:12, border:`1px solid ${filterCat===cat?(CATEGORY_COLORS[cat]||T.orange):T.border}`, background:filterCat===cat?(CATEGORY_COLORS[cat]||T.orange)+'12':'#fff', color:filterCat===cat?(CATEGORY_COLORS[cat]||T.orange):T.gray, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            {cat}
          </button>
        ))}
        {hasChanges && (
          <span style={{ marginLeft:'auto', fontSize:11, color:T.orange, fontWeight:600 }}>
            {Object.keys(editing).length} case type{Object.keys(editing).length!==1?'s':''} modified — unsaved
          </span>
        )}
      </div>

      {/* Notice */}
      <div style={{ background:'#f0f7ff', border:'1px solid #bfdbfe', borderRadius:9, padding:'9px 14px', marginBottom:14, fontSize:12, color:'#374151' }}>
        SLA days set the maximum time allowed for a case or workflow step. Changes apply to all cases created after saving. Existing cases retain their original SLA targets.
      </div>

      {/* SLA Table */}
      <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f9fafb', borderBottom:`1px solid ${T.border}` }}>
              <th style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.4px' }}>Case Type</th>
              <th style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.4px' }}>Category</th>
              <th style={{ padding:'10px 14px', textAlign:'center', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.4px', width:120 }}>Case SLA (days)</th>
              <th style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:T.gray, textTransform:'uppercase', letterSpacing:'0.4px' }}>Step SLA Breakdown</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((ct, idx) => {
              const clr         = CATEGORY_COLORS[ct.category] || T.orange
              const caseSla     = getCaseSla(ct)
              const isModified  = !!editing[ct.name]
              const stepTotal   = (ct.steps||[]).reduce((s,step) => s + getStepSla(ct, step), 0)

              return (
                <tr key={ct.name} style={{ borderBottom:'1px solid #f3f4f6', background: isModified ? '#fffbeb' : idx%2===0 ? '#fff' : '#fafafa' }}>

                  {/* Name */}
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {isModified && <div style={{ width:6, height:6, borderRadius:'50%', background:T.orange, flexShrink:0 }}/>}
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{ct.name}</div>
                        <div style={{ fontSize:10, color:T.gray }}>{ct.steps?.length||0} workflow steps</div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:clr+'15', color:clr }}>
                      {ct.category}
                    </span>
                  </td>

                  {/* Case SLA */}
                  <td style={{ padding:'12px 14px', textAlign:'center' }}>
                    {isAdmin ? (
                      <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'center' }}>
                        <input
                          type="number"
                          min="1" max="90"
                          value={caseSla}
                          onChange={e=>updateCaseSla(ct, +e.target.value)}
                          style={{ width:60, padding:'5px 8px', border:`1.5px solid ${isModified?T.orange:T.border}`, borderRadius:6, fontSize:13, fontWeight:700, textAlign:'center', color:isModified?T.orange:T.text, background:isModified?T.orangeL:'#fff', fontFamily:'inherit' }}
                        />
                        <span style={{ fontSize:11, color:T.gray }}>d</span>
                      </div>
                    ) : (
                      <span style={{ fontSize:14, fontWeight:700, color:T.text }}>{caseSla}d</span>
                    )}
                    {stepTotal !== caseSla && ct.steps?.length > 0 && (
                      <div style={{ fontSize:9, color:T.gray, marginTop:2 }}>Step total: {stepTotal}d</div>
                    )}
                  </td>

                  {/* Step SLA breakdown */}
                  <td style={{ padding:'12px 16px' }}>
                    {(ct.steps||[]).length === 0 ? (
                      <span style={{ fontSize:11, color:'#d1d5db' }}>No steps</span>
                    ) : (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                        {(ct.steps||[]).map((step, i) => {
                          const stepSla     = getStepSla(ct, step)
                          const stepModified = !!editing[ct.name]?.steps?.[step.id]
                          return (
                            <div key={step.id} style={{ display:'flex', alignItems:'center', gap:3, background: stepModified?T.orangeL:'#f9fafb', border:`1px solid ${stepModified?T.orange:T.border}`, borderRadius:6, padding:'3px 8px' }}>
                              <span style={{ fontSize:9, color:T.gray, fontWeight:700 }}>{i+1}.</span>
                              <span style={{ fontSize:10, color:T.text, maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{step.name}</span>
                              {isAdmin ? (
                                <input
                                  type="number"
                                  min="1" max="30"
                                  value={stepSla}
                                  onChange={e=>updateStepSla(ct, step.id, +e.target.value)}
                                  style={{ width:36, padding:'1px 4px', border:`1px solid ${stepModified?T.orange:'#e5e7eb'}`, borderRadius:4, fontSize:11, fontWeight:700, textAlign:'center', color:stepModified?T.orange:'#374151', background:'transparent', fontFamily:'inherit' }}
                                />
                              ) : (
                                <span style={{ fontSize:11, fontWeight:700, color:'#374151' }}>{stepSla}</span>
                              )}
                              <span style={{ fontSize:9, color:T.gray }}>d</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Save bar */}
      {isAdmin && hasChanges && (
        <div style={{ position:'sticky', bottom:0, background:'#fff', borderTop:`1px solid ${T.border}`, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8, borderRadius:'0 0 12px 12px' }}>
          <div style={{ fontSize:12, color:T.orange }}>
            {Object.keys(editing).length} case type{Object.keys(editing).length!==1?'s':''} modified — click Save to apply
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setEditing({})}
              style={{ padding:'8px 16px', background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              Discard Changes
            </button>
            <button onClick={saveAll}
              style={{ padding:'8px 20px', background:T.green, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Save All Changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
