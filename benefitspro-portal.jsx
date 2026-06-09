import { useState, useEffect, useRef } from "react";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const USERS = {
  super_admin: { id: "u1", name: "Naledi Dlamini", role: "super_admin", avatar: "ND", email: "naledi@benefitspro.co.za" },
  ops_manager: { id: "u2", name: "Marcus van Wyk", role: "ops_manager", avatar: "MV", email: "marcus@benefitspro.co.za" },
  consultant: { id: "u3", name: "Priya Naidoo", role: "consultant", avatar: "PN", email: "priya@benefitspro.co.za" },
  admin: { id: "u4", name: "Thabo Molefe", role: "admin", avatar: "TM", email: "thabo@benefitspro.co.za" },
  employer_hr: { id: "u5", name: "Sandra Botha", role: "employer_hr", avatar: "SB", email: "sandra@steelworks.co.za", employer: "Steelworks SA" },
  employer_payroll: { id: "u6", name: "Kevin Mokoena", role: "employer_payroll", avatar: "KM", email: "kevin@minetrust.co.za", employer: "MineTrust Group" },
};

const EMPLOYERS = [
  { id: "e1", name: "Steelworks SA", members: 4200, status: "active", consultant: "Priya Naidoo", industry: "Mining & Steel" },
  { id: "e2", name: "MineTrust Group", members: 12500, status: "active", consultant: "Priya Naidoo", industry: "Mining" },
  { id: "e3", name: "PetroLogix", members: 3100, status: "active", consultant: "Thabo Molefe", industry: "Petroleum" },
  { id: "e4", name: "BuildRight Holdings", members: 8700, status: "active", consultant: "Priya Naidoo", industry: "Construction" },
  { id: "e5", name: "TransAfrica Logistics", members: 5600, status: "review", consultant: "Thabo Molefe", industry: "Transport" },
];

const REQUEST_TYPES = {
  membership: {
    label: "Membership Administration",
    color: "#6366f1",
    bg: "#eef2ff",
    types: ["New Member Entry", "Member Exit", "Beneficiary Update", "Member Detail Update", "Reinstatement", "Category Change"]
  },
  claims: {
    label: "Claims Administration",
    color: "#dc2626",
    bg: "#fef2f2",
    types: ["Funeral Claim", "Death Claim", "Disability Claim", "Withdrawal Claim", "Retirement Claim"]
  },
  payroll: {
    label: "Payroll Administration",
    color: "#d97706",
    bg: "#fffbeb",
    types: ["Contribution Query", "Payroll Reconciliation", "Billing Query", "Membership Reconciliation"]
  },
  employer_support: {
    label: "Employer Support",
    color: "#0891b2",
    bg: "#ecfeff",
    types: ["Benefit Query", "General Administration Query", "Employer Visit Request", "Training Request"]
  },
  compliance: {
    label: "Compliance Administration",
    color: "#7c3aed",
    bg: "#f5f3ff",
    types: ["Outstanding Documents", "Audit Requests", "Regulatory Requests"]
  },
};

const STATUSES = ["Submitted", "Received", "Assigned", "In Progress", "Awaiting Information", "Processing", "Completed", "Closed", "Escalated"];
const STATUS_COLORS = {
  "Submitted": { bg: "#f0f9ff", color: "#0369a1", dot: "#0ea5e9" },
  "Received": { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  "Assigned": { bg: "#faf5ff", color: "#7e22ce", dot: "#a855f7" },
  "In Progress": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  "Awaiting Information": { bg: "#fffbeb", color: "#b45309", dot: "#f59e0b" },
  "Processing": { bg: "#f0fdf4", color: "#166534", dot: "#16a34a" },
  "Completed": { bg: "#f0fdf4", color: "#065f46", dot: "#059669" },
  "Closed": { bg: "#f9fafb", color: "#374151", dot: "#9ca3af" },
  "Escalated": { bg: "#fff1f2", color: "#be123c", dot: "#f43f5e" },
};

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const PRIORITY_COLORS = {
  Low: { bg: "#f0fdf4", color: "#15803d" },
  Medium: { bg: "#fffbeb", color: "#b45309" },
  High: { bg: "#fff7ed", color: "#c2410c" },
  Critical: { bg: "#fff1f2", color: "#be123c" },
};

function genRef() {
  return "BPR-" + Date.now().toString(36).toUpperCase().slice(-6);
}

function daysFromNow(d) {
  const n = new Date(); n.setDate(n.getDate() + d);
  return n.toISOString().split("T")[0];
}

const MOCK_REQUESTS = [
  { id: "r1", ref: "BPR-A1B2C3", employer: "Steelworks SA", employerId: "e1", category: "membership", type: "New Member Entry", status: "In Progress", priority: "High", assigned: "Priya Naidoo", contact: "Sandra Botha", created: "2026-06-01", sla: daysFromNow(2), description: "Onboarding 45 new members from the Vereeniging plant expansion. ID docs and nomination forms attached.", notes: [], documents: [{ name: "ID_Documents_Batch.zip", size: "4.2MB", date: "2026-06-01" }, { name: "Nomination_Forms.pdf", size: "1.1MB", date: "2026-06-01" }], timeline: [{ time: "08:15", date: "2026-06-01", user: "Sandra Botha", action: "Request Submitted", type: "submitted" }, { time: "08:42", date: "2026-06-01", user: "System", action: "Auto-assigned to Priya Naidoo", type: "assign" }, { time: "09:10", date: "2026-06-02", user: "Priya Naidoo", action: "Reviewed documents — 3 ID copies missing. Information requested from employer.", type: "info" }, { time: "11:30", date: "2026-06-02", user: "Sandra Botha", action: "Missing ID copies uploaded.", type: "upload" }, { time: "09:00", date: "2026-06-03", user: "Priya Naidoo", action: "Processing started", type: "progress" }] },
  { id: "r2", ref: "BPR-D4E5F6", employer: "MineTrust Group", employerId: "e2", category: "claims", type: "Funeral Claim", status: "Awaiting Information", priority: "Critical", assigned: "Priya Naidoo", contact: "Kevin Mokoena", created: "2026-06-05", sla: daysFromNow(1), description: "Funeral claim for deceased member Sipho Zulu (ID: 7809125432088). Death certificate and burial order required.", notes: [{ user: "Priya Naidoo", date: "2026-06-06", text: "Family contacted. Documents expected by end of day." }], documents: [{ name: "Claim_Form_Zulu.pdf", size: "0.8MB", date: "2026-06-05" }], timeline: [{ time: "14:30", date: "2026-06-05", user: "Kevin Mokoena", action: "Claim submitted", type: "submitted" }, { time: "14:35", date: "2026-06-05", user: "System", action: "Priority set to Critical — death claim SLA triggered", type: "escalate" }, { time: "15:00", date: "2026-06-05", user: "Priya Naidoo", action: "Assigned and reviewed. Death certificate outstanding.", type: "assign" }, { time: "15:20", date: "2026-06-05", user: "Priya Naidoo", action: "Information requested from employer", type: "info" }] },
  { id: "r3", ref: "BPR-G7H8I9", employer: "BuildRight Holdings", employerId: "e4", category: "payroll", type: "Payroll Reconciliation", status: "Submitted", priority: "Medium", assigned: "", contact: "HR Manager", created: "2026-06-07", sla: daysFromNow(5), description: "May 2026 payroll reconciliation — discrepancy of R14,200 noted on the June schedule.", notes: [], documents: [{ name: "May_Payroll_Schedule.xlsx", size: "2.3MB", date: "2026-06-07" }], timeline: [{ time: "09:00", date: "2026-06-07", user: "HR Manager", action: "Request submitted", type: "submitted" }] },
  { id: "r4", ref: "BPR-J1K2L3", employer: "PetroLogix", employerId: "e3", category: "employer_support", type: "Training Request", status: "Completed", priority: "Low", assigned: "Thabo Molefe", contact: "Nompumelelo Sithole", created: "2026-05-20", sla: "2026-05-27", description: "Requesting product training session for 12 HR team members on the new member portal.", notes: [], documents: [{ name: "Training_Materials_v2.pdf", size: "5.1MB", date: "2026-05-24" }], timeline: [{ time: "10:00", date: "2026-05-20", user: "Nompumelelo Sithole", action: "Training request submitted", type: "submitted" }, { time: "10:30", date: "2026-05-20", user: "Thabo Molefe", action: "Assigned and confirmed date: 23 May", type: "assign" }, { time: "09:00", date: "2026-05-23", user: "Thabo Molefe", action: "Training session conducted — 12 attendees", type: "progress" }, { time: "16:00", date: "2026-05-23", user: "Thabo Molefe", action: "Request completed and closed", type: "complete" }] },
  { id: "r5", ref: "BPR-M4N5O6", employer: "Steelworks SA", employerId: "e1", category: "compliance", type: "Outstanding Documents", status: "Escalated", priority: "High", assigned: "Priya Naidoo", contact: "Sandra Botha", created: "2026-06-02", sla: daysFromNow(-1), description: "Overdue signed board resolution and FSP compliance documents for annual audit.", notes: [{ user: "Marcus van Wyk", date: "2026-06-08", text: "Escalated — SLA breached. Employer flagged for management review." }], documents: [], timeline: [{ time: "08:00", date: "2026-06-02", user: "Priya Naidoo", action: "Compliance request opened", type: "submitted" }, { time: "12:00", date: "2026-06-05", user: "Priya Naidoo", action: "Reminder sent to employer", type: "info" }, { time: "09:00", date: "2026-06-09", user: "Marcus van Wyk", action: "Escalated — SLA breached", type: "escalate" }] },
  { id: "r6", ref: "BPR-P7Q8R9", employer: "TransAfrica Logistics", employerId: "e5", category: "membership", type: "Member Exit", status: "Processing", priority: "Medium", assigned: "Thabo Molefe", contact: "HR Director", created: "2026-06-04", sla: daysFromNow(3), description: "32 member exits due to retrenchment. Section 189 process documentation attached.", notes: [], documents: [{ name: "Section189_Notices.pdf", size: "3.7MB", date: "2026-06-04" }, { name: "Exit_Member_List.xlsx", size: "0.9MB", date: "2026-06-04" }], timeline: [{ time: "11:00", date: "2026-06-04", user: "HR Director", action: "Exit request submitted", type: "submitted" }, { time: "11:15", date: "2026-06-04", user: "System", action: "Assigned to Thabo Molefe", type: "assign" }, { time: "14:00", date: "2026-06-05", user: "Thabo Molefe", action: "Documents verified. Processing commenced.", type: "progress" }] },
];

// ─── ICONS (inline SVG) ────────────────────────────────────────────────────────
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    dashboard: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />,
    requests: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />,
    employers: <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />,
    members: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />,
    analytics: <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />,
    settings: <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />,
    plus: <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />,
    search: <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />,
    filter: <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />,
    bell: <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />,
    close: <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />,
    chevron_right: <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />,
    chevron_down: <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />,
    attach: <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />,
    timeline: <path d="M23 8c0 1.1-.9 2-2 2-.18 0-.35-.02-.51-.07l-3.56 3.55c.05.16.07.34.07.52 0 1.1-.9 2-2 2s-2-.9-2-2c0-.18.02-.36.07-.52l-2.55-2.55c-.16.05-.34.07-.52.07s-.36-.02-.52-.07l-4.55 4.56c.05.16.07.33.07.51 0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.18 0 .35.02.51.07l4.56-4.55C8.02 9.36 8 9.18 8 9c0-1.1.9-2 2-2s2 .9 2 2c0 .18-.02.36-.07.52l2.55 2.55c.16-.05.34-.07.52-.07s.36.02.52.07l3.55-3.56C19.02 8.35 19 8.18 19 8c0-1.1.9-2 2-2s2 .9 2 2z" />,
    note: <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />,
    escalate: <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />,
    check: <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />,
    warning: <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />,
    info: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />,
    send: <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />,
    logout: <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />,
    download: <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />,
    edit: <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />,
    arrow_back: <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />,
    menu: <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />,
    user: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />,
    sla: <path d="M22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a9 9 0 0 0 0-18zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm.5-13H11v6l4.75 2.85.75-1.23-4-2.37V7z" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      {icons[name] || <circle cx="12" cy="12" r="6" />}
    </svg>
  );
};

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
const Badge = ({ status, type = "status" }) => {
  const config = type === "status" ? STATUS_COLORS[status] : PRIORITY_COLORS[status];
  if (!config) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: config.bg, color: config.color, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {type === "status" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: config.dot, display: "inline-block" }} />}
      {status}
    </span>
  );
};

const CategoryBadge = ({ category }) => {
  const cat = REQUEST_TYPES[category];
  if (!cat) return null;
  return (
    <span style={{ padding: "2px 8px", borderRadius: 4, background: cat.bg, color: cat.color, fontSize: 11, fontWeight: 700, letterSpacing: "0.3px" }}>
      {cat.label}
    </span>
  );
};

const Avatar = ({ initials, size = 36, color = "#1e3a5f" }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
    {initials}
  </div>
);

const KPICard = ({ label, value, icon, color, sub, trend }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", right: 16, top: 16, width: 44, height: 44, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={22} color={color} />
    </div>
    <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{label}</div>
    <div style={{ fontSize: 32, fontWeight: 800, color: "#111827", letterSpacing: "-1px" }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: "#9ca3af" }}>{sub}</div>}
    {trend && <div style={{ fontSize: 12, color: trend > 0 ? "#059669" : "#dc2626", fontWeight: 600 }}>
      {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% this week
    </div>}
  </div>
);

const SLAIndicator = ({ sla }) => {
  const today = new Date();
  const due = new Date(sla);
  const diff = Math.ceil((due - today) / 86400000);
  if (diff < 0) return <span style={{ color: "#dc2626", fontSize: 12, fontWeight: 700 }}>⚠ Overdue {Math.abs(diff)}d</span>;
  if (diff === 0) return <span style={{ color: "#d97706", fontSize: 12, fontWeight: 700 }}>⚡ Due today</span>;
  if (diff <= 2) return <span style={{ color: "#d97706", fontSize: 12, fontWeight: 600 }}>{diff}d remaining</span>;
  return <span style={{ color: "#059669", fontSize: 12 }}>{diff}d remaining</span>;
};

// ─── TIMELINE COMPONENT ──────────────────────────────────────────────────────
const TimelineView = ({ events }) => {
  const typeIcon = { submitted: "requests", assign: "user", info: "bell", upload: "attach", progress: "sla", escalate: "escalate", complete: "check" };
  const typeColor = { submitted: "#3b82f6", assign: "#8b5cf6", info: "#f59e0b", upload: "#06b6d4", progress: "#10b981", escalate: "#ef4444", complete: "#059669" };
  return (
    <div style={{ padding: "8px 0" }}>
      {events.map((ev, i) => (
        <div key={i} style={{ display: "flex", gap: 16, marginBottom: 20, position: "relative" }}>
          {i < events.length - 1 && <div style={{ position: "absolute", left: 18, top: 36, width: 2, height: "calc(100% + 4px)", background: "#e5e7eb" }} />}
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: (typeColor[ev.type] || "#6b7280") + "18", border: `2px solid ${typeColor[ev.type] || "#6b7280"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name={typeIcon[ev.type] || "info"} size={16} color={typeColor[ev.type] || "#6b7280"} />
          </div>
          <div style={{ flex: 1, paddingTop: 6 }}>
            <div style={{ fontSize: 14, color: "#111827", fontWeight: 500 }}>{ev.action}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{ev.user} · {ev.time}, {ev.date}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── REQUEST DETAIL MODAL ────────────────────────────────────────────────────
const RequestDetail = ({ request, onClose, onUpdate, currentUser }) => {
  const [tab, setTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [newStatus, setNewStatus] = useState(request.status);
  const tabs = ["overview", "timeline", "documents", "notes", "audit"];

  const isInternal = ["super_admin", "ops_manager", "consultant", "admin"].includes(currentUser.role);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
      <div style={{ width: "min(720px, 100vw)", height: "100vh", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)", animation: "slideIn .2s ease" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "#fafafa" }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: "monospace", fontSize: 13, color: "#6b7280", fontWeight: 700, letterSpacing: "0.5px" }}>{request.ref}</span>
              <Badge status={request.status} />
              <Badge status={request.priority} type="priority" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{request.type}</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>🏢 {request.employer}</span>
              <span style={{ fontSize: 13, color: "#6b7280" }}>👤 {request.contact}</span>
              <span style={{ fontSize: 13, color: "#6b7280" }}>📅 Created {request.created}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "#6b7280" }}>
            <Icon name="close" size={22} />
          </button>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb", padding: "0 24px" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "12px 16px", background: "none", border: "none", borderBottom: tab === t ? "2px solid #1e3a5f" : "2px solid transparent", color: tab === t ? "#1e3a5f" : "#6b7280", fontWeight: tab === t ? 700 : 500, fontSize: 13, cursor: "pointer", textTransform: "capitalize", marginBottom: -1 }}>
              {t}
            </button>
          ))}
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#f9fafb", borderRadius: 10, padding: 16, border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>Request Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[["Category", <CategoryBadge category={request.category} />], ["Assigned To", request.assigned || "Unassigned"], ["SLA Due", <><SLAIndicator sla={request.sla} /> <span style={{ color: "#9ca3af", fontSize: 11 }}>({request.sla})</span></>], ["Created", request.created]].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{k}</div>
                      <div style={{ fontSize: 14, color: "#111827" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Description</div>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: 0 }}>{request.description}</p>
              </div>
              {isInternal && (
                <div style={{ background: "#f0f9ff", borderRadius: 10, padding: 16, border: "1px solid #bae6fd" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0369a1", marginBottom: 12 }}>Update Status</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => { setNewStatus(s); onUpdate({ ...request, status: s }); }} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${newStatus === s ? "#1e3a5f" : "#d1d5db"}`, background: newStatus === s ? "#1e3a5f" : "#fff", color: newStatus === s ? "#fff" : "#374151", fontSize: 12, fontWeight: newStatus === s ? 700 : 500, cursor: "pointer" }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === "timeline" && <TimelineView events={request.timeline} />}
          {tab === "documents" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 16 }}>Supporting Documents ({request.documents.length})</div>
              {request.documents.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 14, padding: 32 }}>No documents attached yet.</div>}
              {request.documents.map((doc, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f9fafb", borderRadius: 8, marginBottom: 8, border: "1px solid #e5e7eb" }}>
                  <Icon name="attach" size={20} color="#6b7280" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{doc.name}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{doc.size} · Uploaded {doc.date}</div>
                  </div>
                  <button style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "#374151", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="download" size={14} /> Download
                  </button>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: "16px", border: "2px dashed #d1d5db", borderRadius: 8, textAlign: "center", color: "#9ca3af", cursor: "pointer", fontSize: 13 }}>
                <Icon name="attach" size={20} color="#d1d5db" />
                <div style={{ marginTop: 4 }}>Click to upload documents</div>
              </div>
            </div>
          )}
          {tab === "notes" && (
            <div>
              {request.notes.map((n, i) => (
                <div key={i} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>{n.user}</div>
                  <div style={{ fontSize: 12, color: "#a16207", marginBottom: 6 }}>{n.date}</div>
                  <div style={{ fontSize: 14, color: "#374151" }}>{n.text}</div>
                </div>
              ))}
              {request.notes.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>No notes yet.</div>}
              <div style={{ marginTop: 8 }}>
                <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..." style={{ width: "100%", minHeight: 80, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
                <button onClick={() => { if (newNote.trim()) { onUpdate({ ...request, notes: [...request.notes, { user: currentUser.name, date: new Date().toISOString().split("T")[0], text: newNote }] }); setNewNote(""); } }} style={{ marginTop: 8, padding: "8px 16px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="send" size={14} color="#fff" /> Add Note
                </button>
              </div>
            </div>
          )}
          {tab === "audit" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 12 }}>Audit Log</div>
              {[...request.timeline].reverse().map((ev, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace", minWidth: 140 }}>{ev.date} {ev.time}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, color: "#374151" }}>{ev.action}</span>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}> — {ev.user}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
};

// ─── NEW REQUEST MODAL ────────────────────────────────────────────────────────
const NewRequestModal = ({ onClose, onSubmit, currentUser, preEmployer }) => {
  const [form, setForm] = useState({ employer: preEmployer || "", category: "", type: "", priority: "Medium", description: "", contact: currentUser.name });
  const cats = Object.entries(REQUEST_TYPES);
  const types = form.category ? REQUEST_TYPES[form.category]?.types || [] : [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>New Service Request</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><Icon name="close" size={22} /></button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {[["Employer", "employer", "text", EMPLOYERS.map(e => e.name)], ["Contact Person", "contact", "text"], ["Priority", "priority", "select", PRIORITIES]].map(([label, field, type, opts]) => (
            <div key={field}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
              {opts ? (
                <select value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, background: "#fff", boxSizing: "border-box" }}>
                  <option value="">Select {label}</option>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
              )}
            </div>
          ))}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Service Category</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {cats.map(([key, cat]) => (
                <button key={key} onClick={() => setForm({ ...form, category: key, type: "" })} style={{ padding: "10px 12px", borderRadius: 8, border: `2px solid ${form.category === key ? cat.color : "#e5e7eb"}`, background: form.category === key ? cat.bg : "#fff", color: form.category === key ? cat.color : "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          {form.category && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Service Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, background: "#fff", boxSizing: "border-box" }}>
                <option value="">Select type</option>
                {types.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: "100%", minHeight: 80, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} placeholder="Describe the request in detail..." />
          </div>
          <button onClick={() => { if (!form.employer || !form.category || !form.type) return alert("Please fill in all required fields."); onSubmit(form); onClose(); }} style={{ padding: "12px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function BenefitsProPortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ status: "", priority: "", category: "", employer: "" });

  const isInternal = currentUser && ["super_admin", "ops_manager", "consultant", "admin"].includes(currentUser.role);
  const isExternal = currentUser && ["employer_hr", "employer_payroll"].includes(currentUser.role);

  const updateRequest = (updated) => {
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelectedRequest(updated);
  };

  const submitRequest = (form) => {
    const newReq = {
      id: "r" + Date.now(),
      ref: genRef(),
      employer: form.employer,
      employerId: EMPLOYERS.find(e => e.name === form.employer)?.id || "",
      category: form.category,
      type: form.type,
      status: "Submitted",
      priority: form.priority,
      assigned: "",
      contact: form.contact,
      created: new Date().toISOString().split("T")[0],
      sla: daysFromNow(5),
      description: form.description,
      notes: [],
      documents: [],
      timeline: [{ time: new Date().toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }), date: new Date().toISOString().split("T")[0], user: form.contact, action: "Request submitted", type: "submitted" }]
    };
    setRequests(prev => [newReq, ...prev]);
  };

  const filteredRequests = requests.filter(r => {
    const matchSearch = !searchQuery || r.ref.includes(searchQuery.toUpperCase()) || r.type.toLowerCase().includes(searchQuery.toLowerCase()) || r.employer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !filters.status || r.status === filters.status;
    const matchPriority = !filters.priority || r.priority === filters.priority;
    const matchCat = !filters.category || r.category === filters.category;
    const matchEmp = !filters.employer || r.employer === filters.employer;
    const matchUser = !isExternal || r.employer === currentUser.employer;
    return matchSearch && matchStatus && matchPriority && matchCat && matchEmp && matchUser;
  });

  const stats = {
    open: requests.filter(r => !["Completed", "Closed"].includes(r.status)).length,
    inProgress: requests.filter(r => r.status === "In Progress").length,
    awaiting: requests.filter(r => r.status === "Awaiting Information").length,
    escalated: requests.filter(r => r.status === "Escalated").length,
    completed: requests.filter(r => r.status === "Completed").length,
    overdue: requests.filter(r => { const d = Math.ceil((new Date(r.sla) - new Date()) / 86400000); return d < 0 && !["Completed", "Closed"].includes(r.status); }).length,
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f2444 0%, #1e3a5f 60%, #2d5f8a 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', -apple-system, sans-serif", padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 48, width: "min(440px, 100%)", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ width: 60, height: 60, borderRadius: 14, background: "linear-gradient(135deg, #1e3a5f, #2d6bc4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.5px" }}>BenefitsPro</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Employer Services Portal</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Sign in as</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(USERS).map(([key, u]) => (
                <button key={key} onClick={() => setCurrentUser(u)} style={{ padding: "12px 16px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"}
                  onMouseLeave={e => e.currentTarget.style.background = "#f9fafb"}>
                  <Avatar initials={u.avatar} size={36} color={["super_admin", "ops_manager"].includes(key) ? "#1e3a5f" : ["consultant", "admin"].includes(key) ? "#2d6bc4" : "#059669"} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{u.role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}{u.employer ? ` · ${u.employer}` : ""}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center", fontSize: 12, color: "#d1d5db", marginTop: 24 }}>Demo portal · All data is illustrative</div>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  const navItems = isInternal ? [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "requests", label: "Service Requests", icon: "requests" },
    { id: "employers", label: "Employers", icon: "employers" },
    { id: "analytics", label: "Analytics", icon: "analytics" },
    ...(["super_admin", "ops_manager"].includes(currentUser.role) ? [{ id: "settings", label: "Settings", icon: "settings" }] : []),
  ] : [
    { id: "dashboard", label: "My Requests", icon: "dashboard" },
    { id: "requests", label: "Service Requests", icon: "requests" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", background: "#f3f4f6", fontSize: 14 }}>
      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 240 : 60, background: "#0f2444", transition: "width 0.2s ease", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #2d6bc4, #4f9cf9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          {sidebarOpen && <div><div style={{ color: "#fff", fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px" }}>BenefitsPro</div><div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 500 }}>SERVICES PORTAL</div></div>}
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", borderRadius: 8, background: page === item.id ? "rgba(255,255,255,0.1)" : "none", border: "none", color: page === item.id ? "#fff" : "rgba(255,255,255,0.55)", cursor: "pointer", marginBottom: 2, textAlign: "left", transition: "all 0.15s", whiteSpace: "nowrap" }}>
              <Icon name={item.icon} size={18} color={page === item.id ? "#4f9cf9" : "rgba(255,255,255,0.55)"} />
              {sidebarOpen && <span style={{ fontSize: 13, fontWeight: page === item.id ? 600 : 400 }}>{item.label}</span>}
            </button>
          ))}
        </nav>
        {/* User */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8 }}>
            <Avatar initials={currentUser.avatar} size={30} color="#2d6bc4" />
            {sidebarOpen && <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>{currentUser.role.replace(/_/g, " ")}</div>
            </div>}
          </div>
          <button onClick={() => setCurrentUser(null)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", borderRadius: 8, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
            <Icon name="logout" size={16} color="rgba(255,255,255,0.4)" />
            {sidebarOpen && <span style={{ fontSize: 12 }}>Sign out</span>}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4 }}>
            <Icon name="menu" size={20} />
          </button>
          <div style={{ flex: 1, position: "relative", maxWidth: 420 }}>
            <Icon name="search" size={16} color="#9ca3af" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search requests, employers, references..." style={{ width: "100%", padding: "7px 12px 7px 32px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, background: "#f9fafb", boxSizing: "border-box", position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)" }} />
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><Icon name="search" size={15} color="#9ca3af" /></div>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
            {stats.overdue > 0 && <span style={{ padding: "4px 10px", background: "#fff1f2", color: "#be123c", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>⚠ {stats.overdue} SLA breach{stats.overdue > 1 ? "es" : ""}</span>}
            <button onClick={() => setShowNewRequest(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              <Icon name="plus" size={16} color="#fff" /> New Request
            </button>
            <div style={{ position: "relative" }}>
              <Icon name="bell" size={20} color="#6b7280" />
              {stats.escalated > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "#ef4444", fontSize: 9, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{stats.escalated}</span>}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {/* ── DASHBOARD ── */}
          {page === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
                  {isExternal ? `${currentUser.employer} — Request Overview` : "Operations Dashboard"}
                </h1>
                <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>{new Date().toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                <KPICard label="Open Requests" value={stats.open} icon="requests" color="#3b82f6" trend={5} />
                <KPICard label="In Progress" value={stats.inProgress} icon="sla" color="#8b5cf6" />
                <KPICard label="Awaiting Info" value={stats.awaiting} icon="bell" color="#f59e0b" />
                <KPICard label="Escalated" value={stats.escalated} icon="escalate" color="#ef4444" />
                <KPICard label="Completed" value={stats.completed} icon="check" color="#059669" sub="This month" />
                <KPICard label="SLA Breaches" value={stats.overdue} icon="warning" color="#dc2626" />
              </div>
              {/* Recent requests */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, color: "#111827" }}>Recent Requests</div>
                  <button onClick={() => setPage("requests")} style={{ background: "none", border: "none", color: "#2d6bc4", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>View all →</button>
                </div>
                {filteredRequests.slice(0, 5).map(r => (
                  <div key={r.id} onClick={() => setSelectedRequest(r)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid #f9fafb", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#9ca3af", fontWeight: 700 }}>{r.ref}</span>
                        <Badge status={r.status} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{r.type}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{r.employer} · {r.created}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <Badge status={r.priority} type="priority" />
                      <SLAIndicator sla={r.sla} />
                    </div>
                    <Icon name="chevron_right" size={18} color="#d1d5db" />
                  </div>
                ))}
              </div>
              {/* Category breakdown */}
              {isInternal && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  {Object.entries(REQUEST_TYPES).map(([key, cat]) => {
                    const count = requests.filter(r => r.category === key).length;
                    return (
                      <div key={key} onClick={() => { setFilters({ ...filters, category: key }); setPage("requests"); }} style={{ background: "#fff", borderRadius: 10, padding: "16px", border: `1px solid ${cat.color}30`, cursor: "pointer", borderLeft: `4px solid ${cat.color}`, transition: "transform 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: cat.color }}>{count}</div>
                        <div style={{ fontSize: 12, color: "#374151", fontWeight: 600, marginTop: 4 }}>{cat.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── REQUESTS ── */}
          {page === "requests" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Service Requests</h1>
                <button onClick={() => setShowNewRequest(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                  <Icon name="plus" size={16} color="#fff" /> New Request
                </button>
              </div>
              {/* Filters */}
              <div style={{ background: "#fff", borderRadius: 10, padding: 16, border: "1px solid #e5e7eb", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Icon name="filter" size={16} color="#6b7280" />
                {[["status", "Status", STATUSES], ["priority", "Priority", PRIORITIES], ["category", "Category", Object.entries(REQUEST_TYPES).map(([k, v]) => [k, v.label])], ...(isInternal ? [["employer", "Employer", EMPLOYERS.map(e => e.name)]] : [])].map(([field, label, opts]) => (
                  <select key={field} value={filters[field]} onChange={e => setFilters({ ...filters, [field]: e.target.value })} style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, background: filters[field] ? "#eff6ff" : "#fff", color: filters[field] ? "#1d4ed8" : "#374151" }}>
                    <option value="">All {label}s</option>
                    {opts.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>)}
                  </select>
                ))}
                {(Object.values(filters).some(Boolean)) && <button onClick={() => setFilters({ status: "", priority: "", category: "", employer: "" })} style={{ fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear filters</button>}
                <div style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af" }}>{filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}</div>
              </div>
              {/* Table */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                      {["Reference", "Type & Category", "Employer", "Status", "Priority", "Assigned", "SLA", ""].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map(r => (
                      <tr key={r.id} onClick={() => setSelectedRequest(r)} style={{ cursor: "pointer", borderBottom: "1px solid #f3f4f6", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                        <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{r.ref}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 3 }}>{r.type}</div>
                          <CategoryBadge category={r.category} />
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151" }}>{r.employer}</td>
                        <td style={{ padding: "12px 16px" }}><Badge status={r.status} /></td>
                        <td style={{ padding: "12px 16px" }}><Badge status={r.priority} type="priority" /></td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151" }}>{r.assigned || <span style={{ color: "#d1d5db", fontStyle: "italic" }}>Unassigned</span>}</td>
                        <td style={{ padding: "12px 16px" }}><SLAIndicator sla={r.sla} /></td>
                        <td style={{ padding: "12px 16px" }}><Icon name="chevron_right" size={16} color="#d1d5db" /></td>
                      </tr>
                    ))}
                    {filteredRequests.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: 48, color: "#9ca3af", fontSize: 14 }}>No requests match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── EMPLOYERS ── */}
          {page === "employers" && isInternal && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Employer Groups</h1>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {EMPLOYERS.map(emp => {
                  const empReqs = requests.filter(r => r.employerId === emp.id);
                  const open = empReqs.filter(r => !["Completed", "Closed"].includes(r.status)).length;
                  const escalated = empReqs.filter(r => r.status === "Escalated").length;
                  return (
                    <div key={emp.id} style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb", cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#2d6bc4"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(29,78,216,0.08)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
                      onClick={() => { setFilters({ ...filters, employer: emp.name }); setPage("requests"); }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#1d4ed8" }}>
                          {emp.name[0]}
                        </div>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: emp.status === "active" ? "#f0fdf4" : "#fffbeb", color: emp.status === "active" ? "#15803d" : "#b45309", fontWeight: 700 }}>
                          {emp.status}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 2 }}>{emp.name}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>{emp.industry}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        {[["Members", emp.members.toLocaleString()], ["Open", open], ["Escalated", escalated]].map(([l, v]) => (
                          <div key={l} style={{ textAlign: "center", padding: "8px 0", background: "#f9fafb", borderRadius: 6 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: l === "Escalated" && escalated > 0 ? "#dc2626" : "#111827" }}>{v}</div>
                            <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>Consultant: {emp.consultant}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {page === "analytics" && isInternal && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Analytics & Reporting</h1>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                {/* By Status */}
                <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 700, marginBottom: 16, color: "#111827" }}>Requests by Status</div>
                  {STATUSES.map(s => {
                    const count = requests.filter(r => r.status === s).length;
                    const pct = requests.length ? (count / requests.length) * 100 : 0;
                    return (
                      <div key={s} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#374151" }}>{s}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{count}</span>
                        </div>
                        <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: STATUS_COLORS[s]?.dot || "#6b7280", borderRadius: 3, transition: "width 0.5s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* By Category */}
                <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 700, marginBottom: 16, color: "#111827" }}>Requests by Category</div>
                  {Object.entries(REQUEST_TYPES).map(([key, cat]) => {
                    const count = requests.filter(r => r.category === key).length;
                    const pct = requests.length ? (count / requests.length) * 100 : 0;
                    return (
                      <div key={key} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#374151" }}>{cat.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{count}</span>
                        </div>
                        <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* By Employer */}
                <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 700, marginBottom: 16, color: "#111827" }}>Requests by Employer</div>
                  {EMPLOYERS.map(emp => {
                    const count = requests.filter(r => r.employerId === emp.id).length;
                    return (
                      <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#1d4ed8", flexShrink: 0 }}>{emp.name[0]}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: "#374151", marginBottom: 2 }}>{emp.name}</div>
                          <div style={{ height: 4, background: "#f3f4f6", borderRadius: 2 }}>
                            <div style={{ height: "100%", width: `${(count / requests.length) * 100}%`, background: "#2d6bc4", borderRadius: 2 }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", minWidth: 20, textAlign: "right" }}>{count}</div>
                      </div>
                    );
                  })}
                </div>
                {/* Priority distribution */}
                <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 700, marginBottom: 16, color: "#111827" }}>Priority Distribution</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {PRIORITIES.map(p => {
                      const count = requests.filter(r => r.priority === p).length;
                      const config = PRIORITY_COLORS[p];
                      return (
                        <div key={p} style={{ background: config.bg, borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ fontSize: 28, fontWeight: 800, color: config.color }}>{count}</div>
                          <div style={{ fontSize: 12, color: config.color, fontWeight: 600 }}>{p}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 16, padding: 12, background: "#f0fdf4", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "#15803d", fontWeight: 700 }}>
                      SLA Compliance: {requests.length ? Math.round(((requests.length - stats.overdue) / requests.length) * 100) : 100}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {page === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Settings</h1>
              {[["Users & Access", "Manage internal users, roles and permissions", "user"], ["SLA Configuration", "Define SLA rules per service type and priority level", "sla"], ["Notification Rules", "Configure email and in-app notification triggers", "bell"], ["Audit Configuration", "Audit log retention and export settings", "timeline"]].map(([title, desc, icon]) => (
                <div key={title} style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={icon} size={22} color="#1d4ed8" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#111827", marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>{desc}</div>
                  </div>
                  <Icon name="chevron_right" size={18} color="#d1d5db" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedRequest && (
        <RequestDetail request={selectedRequest} onClose={() => setSelectedRequest(null)} onUpdate={updateRequest} currentUser={currentUser} />
      )}
      {showNewRequest && (
        <NewRequestModal onClose={() => setShowNewRequest(false)} onSubmit={submitRequest} currentUser={currentUser} preEmployer={isExternal ? currentUser.employer : ""} />
      )}
    </div>
  );
}
