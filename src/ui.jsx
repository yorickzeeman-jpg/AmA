import { T, STATUS_CFG, PRIORITY_CFG, ROLES, slaStatus, slaDiff } from './data.js'

// ── Icon ─────────────────────────────────────────────────────────────────────
const P = {
  dashboard:  'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  cases:      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z',
  employers:  'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z',
  users:      'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  workflow:   'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
  reports:    'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z',
  settings:   'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  plus:       'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  close:      'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  search:     'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  filter:     'M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z',
  chevron_r:  'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  chevron_d:  'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z',
  bell:       'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  check:      'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  warning:    'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  attach:     'M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z',
  send:       'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z',
  logout:     'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
  download:   'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  edit:       'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  delete:     'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  menu:       'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  drag:       'M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  arrow_up:   'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z',
  arrow_down: 'M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z',
  transfer:   'M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z',
  audit:      'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
  sla:        'M22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a9 9 0 0 0 0-18zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm.5-13H11v6l4.75 2.85.75-1.23-4-2.37V7z',
  note:       'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
}
export function Icon({ name, size=18, color='currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink:0, display:'block' }}>
      {P[name] ? <path d={P[name]} /> : <circle cx="12" cy="12" r="6"/>}
    </svg>
  )
}

// ── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ initials, size=34, bg=T.green }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.36, fontWeight:700, flexShrink:0, letterSpacing:'-0.5px' }}>
      {initials}
    </div>
  )
}

// ── StatusBadge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || { bg:'#f9fafb', color:'#374151', dot:'#9ca3af' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:c.bg, color:c.color, fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c.dot }} />
      {status}
    </span>
  )
}

// ── PriorityBadge ────────────────────────────────────────────────────────────
export function PriorityBadge({ priority }) {
  const c = PRIORITY_CFG[priority] || PRIORITY_CFG.Medium
  return (
    <span style={{ padding:'3px 9px', borderRadius:20, background:c.bg, color:c.color, fontSize:11, fontWeight:700 }}>
      {priority}
    </span>
  )
}

// ── RoleBadge ────────────────────────────────────────────────────────────────
export function RoleBadge({ roleId }) {
  const r = ROLES.find(x => x.id === roleId)
  if (!r) return null
  return (
    <span style={{ padding:'2px 8px', borderRadius:4, background:r.color+'18', color:r.color, fontSize:11, fontWeight:700 }}>
      {r.label}
    </span>
  )
}

// ── SLAChip ──────────────────────────────────────────────────────────────────
export function SLAChip({ slaDate, status }) {
  const s = slaStatus(slaDate, status)
  if (s === 'done') return <span style={{ fontSize:12, color:T.gray }}>Completed</span>
  const diff = slaDiff(slaDate)
  const cfg = {
    overdue: { color:T.red,   label:`⚠ Overdue ${Math.abs(diff)}d` },
    today:   { color:T.amber, label:'⚡ Due today'                  },
    warning: { color:T.amber, label:`${diff}d remaining`            },
    ok:      { color:'#059669',label:`${diff}d remaining`           },
  }[s]
  return <span style={{ fontSize:12, fontWeight:600, color:cfg.color }}>{cfg.label}</span>
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
export function KPI({ label, value, icon, color, sub, trend }) {
  return (
    <div style={{ background:T.white, borderRadius:12, padding:'18px 20px', border:`1px solid ${T.border}`, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', right:14, top:14, width:40, height:40, borderRadius:9, background:color+'1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon name={icon} size={20} color={color} />
      </div>
      <div style={{ fontSize:12, color:T.textSub, fontWeight:500, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color:T.text, letterSpacing:'-1px', marginBottom:4 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.gray }}>{sub}</div>}
      {trend !== undefined && <div style={{ fontSize:11, color:trend>=0?'#059669':T.red, fontWeight:600, marginTop:2 }}>{trend>=0?'↑':'↓'} {Math.abs(trend)}% vs last week</div>}
    </div>
  )
}

// ── Bar chart row ────────────────────────────────────────────────────────────
export function BarRow({ label, value, max, color }) {
  const pct = max ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:12, color:T.text }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{value}</span>
      </div>
      <div style={{ height:6, background:'#f3f4f6', borderRadius:3 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color||T.green, borderRadius:3, transition:'width .5s ease' }} />
      </div>
    </div>
  )
}

// ── Modal shell ──────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ background:T.white, borderRadius:16, width:`min(${wide?720:520}px,100%)`, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.22)', animation:'scaleIn .2s ease' }}>
        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:T.white, zIndex:1 }}>
          <div style={{ fontSize:17, fontWeight:700, color:T.text }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:T.gray, padding:4 }}><Icon name="close" size={20}/></button>
        </div>
        <div style={{ padding:22 }}>{children}</div>
      </div>
    </div>
  )
}

// ── Form helpers ─────────────────────────────────────────────────────────────
export const inputSt = { width:'100%', padding:'9px 12px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:14, boxSizing:'border-box', background:T.white }
export const selectSt = { ...inputSt }
export const labelSt  = { fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }
export function Field({ label, children }) {
  return <div style={{ marginBottom:16 }}><label style={labelSt}>{label}</label>{children}</div>
}
export function Btn({ children, onClick, variant='primary', small, style:sx, disabled }) {
  const variants = {
    primary: { background:T.green, color:'#fff', border:'none' },
    secondary:{ background:T.white, color:T.text, border:`1px solid ${T.border}` },
    danger:  { background:T.red,   color:'#fff', border:'none' },
    ghost:   { background:'none',  color:T.green, border:'none', padding:0 },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:small?'6px 12px':'9px 18px', borderRadius:8, fontSize:small?12:13, fontWeight:600, cursor:disabled?'not-allowed':'pointer', opacity:disabled?.5:1, ...variants[variant], ...sx }}>
      {children}
    </button>
  )
}

// ── Section card ─────────────────────────────────────────────────────────────
export function Card({ children, style:sx }) {
  return <div style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden', ...sx }}>{children}</div>
}
export function CardHead({ title, action }) {
  return (
    <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div style={{ fontWeight:700, fontSize:15, color:T.text }}>{title}</div>
      {action}
    </div>
  )
}

// ── Tab row ──────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', borderBottom:`1px solid ${T.border}`, overflowX:'auto' }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{ padding:'11px 16px', background:'none', border:'none', borderBottom:active===t?`2px solid ${T.green}`:'2px solid transparent', color:active===t?T.green:T.gray, fontWeight:active===t?700:500, fontSize:13, cursor:'pointer', whiteSpace:'nowrap', marginBottom:-1 }}>
          {t}
        </button>
      ))}
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ icon, message }) {
  return (
    <div style={{ padding:'48px 20px', textAlign:'center', color:T.gray }}>
      <Icon name={icon||'cases'} size={32} color={T.border} />
      <div style={{ marginTop:12, fontSize:14 }}>{message||'Nothing here yet.'}</div>
    </div>
  )
}
