// supabase/functions/send-billing-email/index.ts
//
// AMCU FUNERAL PORTAL — Email Notification Edge Function
// Domain:  funeral-portal.co.za  (verified in Resend)
// From:    noreply@funeral-portal.co.za
// Admin:   yorickzeeman@gmail.com
//
// Handles three email types:
//   1. REGISTRATION  — admin notification when any member is submitted
//   2. BENEFICIARY   — confirmation when beneficiaries are added/updated
//   3. TEST          — single test email to verify the pipeline
//
// Required Supabase secrets (set once, never change unless rotating):
//   supabase secrets set RESEND_API_KEY=re_YOUR_KEY
//   supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
//
// EMAIL_FROM comes from Vercel env vars — also set as a secret here:
//   supabase secrets set EMAIL_FROM=noreply@funeral-portal.co.za
//
// Deploy:
//   supabase functions deploy send-billing-email

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Config ────────────────────────────────────────────────────────
const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')           || ''
const EMAIL_FROM      = Deno.env.get('EMAIL_FROM')               || 'noreply@funeral-portal.co.za'
const ADMIN_EMAIL     = Deno.env.get('ADMIN_EMAIL')              || 'yorickzeeman@gmail.com'
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')             || ''
const SUPABASE_SVC    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')|| ''

const FROM_ADDRESS    = `AMCU Funeral Portal <${EMAIL_FROM}>`

// ── Supabase admin client (service role — edge function only) ─────
const db = (SUPABASE_URL && SUPABASE_SVC)
  ? createClient(SUPABASE_URL, SUPABASE_SVC)
  : null

// ── CORS headers ──────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

// ================================================================
// AUDIT HELPERS
// ================================================================

async function logSuccess(refNo: string, emailType: string, recipient: string, resendId: string) {
  if (!db) return
  try {
    await db.from('audit_logs').insert([{
      user_id:     null,
      action:      'EMAIL_SENT',
      entity_type: 'submission',
      entity_id:   refNo,
      metadata: {
        ref_no:     refNo,
        email_type: emailType,
        recipient,
        resend_id:  resendId,
        timestamp:  new Date().toISOString(),
      },
    }])
  } catch (e) {
    console.error('[AMCU] audit log (success) failed:', e)
  }
}

async function logFailure(refNo: string, emailType: string, recipient: string, errMsg: string) {
  if (!db) return
  try {
    await db.from('audit_logs').insert([{
      user_id:     null,
      action:      'EMAIL_FAILED',
      entity_type: 'submission',
      entity_id:   refNo,
      metadata: {
        ref_no:     refNo,
        email_type: emailType,
        recipient,
        error:      errMsg,
        timestamp:  new Date().toISOString(),
      },
    }])
  } catch (e) {
    console.error('[AMCU] audit log (failure) failed:', e)
  }
}

// ================================================================
// RESEND HELPER — single send, full logging
// Returns { success, resendId?, error? }
// ================================================================

async function sendEmail(params: {
  to:          string
  subject:     string
  html:        string
  refNo:       string
  emailType:   string
  attachments?: Array<{filename:string,content:string,type:string,disposition:string}>
}) {
  const { to, subject, html, refNo, emailType, attachments } = params

  if (!RESEND_API_KEY) {
    const err = 'RESEND_API_KEY is not configured'
    await logFailure(refNo, emailType, to, err)
    return { success: false, error: err }
  }

  try {
    const res  = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        from: FROM_ADDRESS, to: [to], subject, html,
        ...(attachments && attachments.length ? { attachments } : {}),
      }),
    })

    const body = await res.json()

    if (!res.ok) {
      const err = body?.message || body?.error || JSON.stringify(body)
      console.error(`[AMCU][${emailType}] Resend error → ${to}: ${err}`)
      await logFailure(refNo, emailType, to, err)
      return { success: false, error: err }
    }

    const resendId = body?.id || ''
    console.log(`[AMCU][${emailType}] Sent → ${to} (${resendId})`)
    await logSuccess(refNo, emailType, to, resendId)
    return { success: true, resendId }

  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    console.error(`[AMCU][${emailType}] Fetch threw: ${err}`)
    await logFailure(refNo, emailType, to, err)
    return { success: false, error: err }
  }
}

// ================================================================
// EMAIL TEMPLATES
// ================================================================

// ── Shared styles ─────────────────────────────────────────────────
const CSS = `
  body{margin:0;padding:20px;background:#F4FAE8;font-family:Arial,Helvetica,sans-serif;color:#1A2B0F}
  .wrap{max-width:600px;margin:0 auto}
  .hdr{background:linear-gradient(135deg,#1A2B0F,#3D6B0F);border-radius:14px 14px 0 0;padding:24px 28px}
  .hdr-eyebrow{font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:3px;font-weight:700;margin-bottom:6px}
  .hdr-title{font-size:20px;font-weight:900;color:#fff;margin-bottom:8px}
  .hdr-ref{font-size:26px;font-weight:900;letter-spacing:3px;color:#A3E635}
  .hdr-date{font-size:12px;color:rgba(255,255,255,0.55);margin-top:6px}
  .body{background:#fff;border-radius:0 0 14px 14px;padding:28px;box-shadow:0 4px 12px rgba(0,0,0,.08)}
  .label{font-size:10px;font-weight:700;color:#6B7280;letter-spacing:2px;text-transform:uppercase;margin:16px 0 6px}
  .value{font-size:15px;font-weight:800;color:#1A2B0F}
  .sub{font-size:13px;color:#6B7280;margin-top:2px}
  .sep{border:none;border-top:1px solid #E8F5D3;margin:16px 0}
  .badge-green{display:inline-block;background:#E8F5D3;color:#3D6B0F;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:800;margin-right:6px}
  .badge-amber{display:inline-block;background:#FFF8E1;color:#D97706;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:800}
  .footer-action{margin-top:24px;background:#E8F5D3;border-radius:10px;padding:14px 16px;text-align:center}
  .footer-action-title{font-size:13px;font-weight:800;color:#3D6B0F;margin-bottom:4px}
  .footer-action-ref{font-size:14px;font-weight:900;color:#1A2B0F;letter-spacing:2px;margin-top:8px}
  table{border-collapse:collapse;width:100%}
  th{text-align:left;padding:7px 8px;font-size:10px;color:#6B7280;font-weight:700;letter-spacing:1px;background:#F9FAFB}
  td{padding:7px 8px;border-bottom:1px solid #E8F5D3;font-size:13px}
`

function wrap(content: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>${CSS}</style></head>
    <body><div class="wrap">${content}</div></body></html>`
}

// ── 1. ADMIN REGISTRATION NOTIFICATION ───────────────────────────
function buildAdminEmail(p: {
  refNo:           string
  memberName:      string
  memberIdNumber:  string
  payrollNumber:   string
  employer:        string
  consultantName:  string
  submittedAt:     string
  isNewMember:     boolean
  mainPremium:     number
  extendedPremium: number
  deductionStart:  string
  beneficiaries:   any[]
  extendedFamily:  any[]
}): string {
  const benRows = p.beneficiaries.length
    ? p.beneficiaries.map(b => `<tr>
        <td>${b.name || '—'}</td>
        <td>${b.relationship || '—'}</td>
        <td>${b.contact || '—'}</td>
        <td style="text-align:right">${b.pct ? b.pct + '%' : '—'}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" style="color:#9CA3AF">No beneficiary captured</td></tr>`

  const extRows = p.extendedFamily.length
    ? p.extendedFamily.map(e => {
        const cv = (e.cover && e.cover !== '#N/A' && e.cover !== '')
          ? 'R' + Number(e.cover).toLocaleString('en-ZA')
          : (e.option || '—')
        return `<tr>
          <td>${e.name || '—'}</td>
          <td>${e.relationship || '—'}</td>
          <td>${e.age || '—'}</td>
          <td>${cv}</td>
          <td style="text-align:right;font-weight:700;color:#1565C0">R${e.premium || 0}/mo</td>
        </tr>`
      }).join('')
    : `<tr><td colspan="5" style="color:#9CA3AF">No extended family added</td></tr>`

  return wrap(`
    <div class="hdr">
      <div class="hdr-eyebrow">⛏️ AMCU FUNERAL PORTAL</div>
      <div class="hdr-title">NEW ${p.isNewMember ? 'POLICY ACTIVATION' : 'EXTENDED FAMILY SUBMISSION'}</div>
      <div class="hdr-ref">${p.refNo}</div>
      <div class="hdr-date">${p.submittedAt}</div>
    </div>
    <div class="body">
      <div style="margin-bottom:16px">
        <span class="badge-green">✓ MAIN POLICY ACTIVE</span>
        ${p.extendedPremium > 0 ? '<span class="badge-amber">⏳ EXTENDED PENDING</span>' : ''}
      </div>

      <div class="label">Member</div>
      <div class="value">${p.memberName || '—'}</div>
      <div class="sub">ID: ${p.memberIdNumber || '—'} · Payroll: ${p.payrollNumber || '—'}</div>
      <div class="sub">Employer: ${p.employer || '—'}</div>

      <hr class="sep">
      <div class="label">Consultant</div>
      <div class="value" style="color:#3D6B0F">${p.consultantName || '—'}</div>

      <hr class="sep">
      <div class="label">Nominated Beneficiary</div>
      <table><thead><tr>
        <th>Name</th><th>Relationship</th><th>Contact</th><th style="text-align:right">%</th>
      </tr></thead><tbody>${benRows}</tbody></table>

      <hr class="sep">
      <div class="label">Premium Breakdown</div>
      <table>
        <tr><td>Main Policy (fixed)</td><td style="text-align:right;font-weight:900;color:#5E9E1A">R${p.mainPremium}/mo</td></tr>
        <tr><td>Extended Family Premium</td><td style="text-align:right;font-weight:900;color:#1565C0">R${p.extendedPremium}/mo</td></tr>
        <tr><td style="font-weight:700">Total Extended Deduction</td><td style="text-align:right;font-size:18px;font-weight:900">R${p.extendedPremium}/mo</td></tr>
      </table>

      <hr class="sep">
      <div class="label">Extended Family Added</div>
      <table><thead><tr>
        <th>Name</th><th>Relationship</th><th>Age</th><th>Cover</th><th style="text-align:right">Premium</th>
      </tr></thead><tbody>${extRows}</tbody></table>

      <hr class="sep">
      <div class="label">Deduction Start Date</div>
      <div class="value">${p.deductionStart || '—'}</div>

      <div class="footer-action">
        <div class="footer-action-title">ACTION REQUIRED</div>
        <div style="font-size:12px;color:#3D6B0F">Process this submission in the billing system.</div>
        <div class="footer-action-ref">${p.refNo}</div>
      </div>
    </div>`)
}

// ── 2. MEMBER REGISTRATION CONFIRMATION ──────────────────────────
// Sent to the member's email if captured (or skipped if not available)
function buildMemberConfirmEmail(p: {
  refNo:          string
  memberName:     string
  employer:       string
  deductionStart: string
  mainPremium:    number
  submittedAt:    string
}): string {
  return wrap(`
    <div class="hdr">
      <div class="hdr-eyebrow">⛏️ AMCU FUNERAL PORTAL</div>
      <div class="hdr-title">REGISTRATION CONFIRMED</div>
      <div class="hdr-ref">${p.refNo}</div>
      <div class="hdr-date">${p.submittedAt}</div>
    </div>
    <div class="body">
      <p style="font-size:15px;color:#1A2B0F;margin-bottom:20px">
        Dear <strong>${p.memberName}</strong>,
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:20px">
        Your AMCU Main Funeral Policy has been successfully submitted and is being processed.
        Your spouse and children are included in this policy at no additional cost.
      </p>

      <div class="label">Your Reference Number</div>
      <div style="font-size:22px;font-weight:900;letter-spacing:2px;color:#3D6B0F">${p.refNo}</div>
      <div style="font-size:12px;color:#6B7280;margin-top:4px">Keep this number for all queries</div>

      <hr class="sep">
      <table>
        <tr><td style="color:#6B7280;width:140px">Employer</td><td style="font-weight:700">${p.employer || '—'}</td></tr>
        <tr><td style="color:#6B7280">Monthly Deduction</td><td style="font-weight:700;color:#5E9E1A">R${p.mainPremium} per month</td></tr>
        <tr><td style="color:#6B7280">First Deduction</td><td style="font-weight:700">${p.deductionStart || '—'}</td></tr>
        <tr><td style="color:#6B7280">Submitted</td><td style="font-weight:700">${p.submittedAt}</td></tr>
      </table>

      <hr class="sep">
      <div style="background:#E8F5D3;border-radius:10px;padding:14px 16px">
        <div style="font-size:13px;font-weight:700;color:#3D6B0F;margin-bottom:4px">Included in your policy:</div>
        <div style="font-size:13px;color:#374151">✓ Main Member &nbsp; ✓ Spouse &nbsp; ✓ Children</div>
      </div>

      <p style="font-size:12px;color:#9CA3AF;margin-top:20px;line-height:1.5">
        For queries contact AMCU on 012 485 5345.
        Quote your reference number: <strong>${p.refNo}</strong>
      </p>
    </div>`)
}

// ── 3. BENEFICIARY UPDATE CONFIRMATION ───────────────────────────
function buildBeneficiaryEmail(p: {
  refNo:        string
  memberName:   string
  beneficiaries: any[]
  submittedAt:  string
}): string {
  const benList = p.beneficiaries.length
    ? p.beneficiaries.map(b =>
        `<tr>
          <td>${b.name || '—'}</td>
          <td>${b.relationship || '—'}</td>
          <td>${b.contact || '—'}</td>
          <td style="text-align:right">${b.pct ? b.pct + '%' : '—'}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="color:#9CA3AF">No beneficiaries on record</td></tr>`

  return wrap(`
    <div class="hdr">
      <div class="hdr-eyebrow">⛏️ AMCU FUNERAL PORTAL</div>
      <div class="hdr-title">BENEFICIARY UPDATED</div>
      <div class="hdr-ref">${p.refNo}</div>
      <div class="hdr-date">${p.submittedAt}</div>
    </div>
    <div class="body">
      <p style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:20px">
        Dear <strong>${p.memberName}</strong>,<br><br>
        Your nominated beneficiary details have been updated successfully.
        The person(s) listed below will receive the funeral claim payout if you pass away.
      </p>

      <div class="label">Nominated Beneficiaries</div>
      <table><thead><tr>
        <th>Name</th><th>Relationship</th><th>Contact</th><th style="text-align:right">%</th>
      </tr></thead><tbody>${benList}</tbody></table>

      <hr class="sep">
      <div style="background:#FFF8E1;border-radius:10px;padding:12px 14px">
        <div style="font-size:12px;color:#92400E;font-weight:700">
          ℹ️ These are payout recipients only — not dependants or policy members.
        </div>
      </div>

      <p style="font-size:12px;color:#9CA3AF;margin-top:20px;line-height:1.5">
        If you did not authorise this change, contact AMCU immediately on 012 485 5345.
        Reference: <strong>${p.refNo}</strong>
      </p>
    </div>`)
}

// ── 4. TEST EMAIL ─────────────────────────────────────────────────
function buildTestEmail(sentAt: string): string {
  return wrap(`
    <div class="hdr">
      <div class="hdr-eyebrow">⛏️ AMCU FUNERAL PORTAL</div>
      <div class="hdr-title">EMAIL PIPELINE TEST</div>
      <div class="hdr-ref">TEST-OK</div>
      <div class="hdr-date">${sentAt}</div>
    </div>
    <div class="body">
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:12px">✅</div>
        <div style="font-size:18px;font-weight:900;color:#3D6B0F;margin-bottom:8px">
          Email pipeline is working correctly
        </div>
        <div style="font-size:14px;color:#6B7280">
          From: ${EMAIL_FROM}<br>
          To: ${ADMIN_EMAIL}<br>
          Sent: ${sentAt}
        </div>
      </div>
      <hr class="sep">
      <div style="font-size:12px;color:#9CA3AF;text-align:center">
        RESEND_API_KEY ✓ &nbsp; Domain ✓ &nbsp; Edge Function ✓
      </div>
    </div>`)
}

// ================================================================
// MAIN HANDLER
// ================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  let refNo = 'UNKNOWN'

  try {
    const body      = await req.json()
    const emailType = body.type || 'registration'   // 'registration' | 'beneficiary' | 'test'

    // ── TEST EMAIL ────────────────────────────────────────────────
    if (emailType === 'test') {
      const sentAt = new Date().toLocaleString('en-ZA', {
        dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Johannesburg',
      })
      const result = await sendEmail({
        to:        ADMIN_EMAIL,
        subject:   '[AMCU] Email Pipeline Test — funeral-portal.co.za',
        html:      buildTestEmail(sentAt),
        refNo:     'TEST',
        emailType: 'test',
      })
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    // ── REGISTRATION / EXTENDED FAMILY ────────────────────────────
    if (emailType === 'registration' || emailType === 'submission') {
      const submission = body.submission || {}
      refNo = body.refNo || submission.ref_no || 'UNKNOWN'

      // Parse jsonb fields
      let beneficiaries: any[] = []
      let extendedFamily: any[] = []
      try {
        beneficiaries  = typeof submission.beneficiaries  === 'string' ? JSON.parse(submission.beneficiaries)  : (submission.beneficiaries  || [])
        extendedFamily = typeof submission.extended_family === 'string' ? JSON.parse(submission.extended_family) : (submission.extended_family || [])
      } catch (_) { /* leave as empty arrays */ }

      const submittedAt = new Date(submission.submitted_at || new Date()).toLocaleString('en-ZA', {
        dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Johannesburg',
      })

      const memberName     = submission.member_name        || '—'
      const memberIdNumber = submission.member_id_number   || submission.member_id || '—'
      const payrollNumber  = submission.payroll_number     || submission.payroll_no || '—'
      const employer       = submission.employer           || '—'
      const consultantName = submission.consultant_name    || '—'
      const deductionStart = submission.deduction_start    || '—'
      const isNewMember    = !!submission.is_new_member
      const mainPremium    = Number(submission.main_premium)     || 57
      const extPremium     = Number(submission.extended_premium) || 0

      // Email 1 — Admin notification (always sent)
      // Stop Order PDF attachment for new R57 activations
      const stopOrderBase64: string = body.stopOrderBase64 || ''
      // Resend attachment format: content must be base64 of file bytes
      // stopOrderBase64 is already base64-encoded UTF-8 HTML
      const attachments = stopOrderBase64 ? [{
        filename:    `${refNo}.pdf`,
        content:     stopOrderBase64,
        type:        'text/html',
        disposition: 'attachment',
      }] : []
      if (stopOrderBase64) console.log(`[AMCU] Stop Order attached: ${refNo}.html`)

      const adminResult = await sendEmail({
        to:          ADMIN_EMAIL,
        subject:     `[${refNo}] ${isNewMember ? 'New Policy' : 'Extended Family'} — ${memberName}`,
        html:        buildAdminEmail({
          refNo, memberName, memberIdNumber, payrollNumber, employer,
          consultantName, submittedAt, isNewMember, mainPremium,
          extendedPremium: extPremium, deductionStart,
          beneficiaries, extendedFamily,
        }),
        refNo,
        emailType:   'admin_notification',
        attachments,
      })

      // Email 2 — Member confirmation
      // Only sent if we have a member email address.
      // The R57 master sheet doesn't hold email addresses, so this fires
      // only when submission.member_email is provided.
      let memberResult = { success: true, skipped: true, reason: 'no_member_email' }
      const memberEmail = submission.member_email || ''
      if (memberEmail && memberEmail.includes('@')) {
        const r = await sendEmail({
          to:        memberEmail,
          subject:   `[${refNo}] Your AMCU Funeral Policy Registration`,
          html:      buildMemberConfirmEmail({
            refNo, memberName, employer, deductionStart,
            mainPremium, submittedAt,
          }),
          refNo,
          emailType: 'member_confirmation',
        })
        memberResult = { ...r, skipped: false }
      }

      return new Response(JSON.stringify({
        success:      adminResult.success,
        ref_no:       refNo,
        admin_email:  adminResult,
        member_email: memberResult,
      }), {
        status: adminResult.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    // ── BENEFICIARY UPDATE ────────────────────────────────────────
    if (emailType === 'beneficiary') {
      refNo = body.refNo || 'BEN-' + Date.now()

      const memberName  = body.memberName  || '—'
      const memberEmail = body.memberEmail || ''
      const beneficiaries: any[] = body.beneficiaries || []

      const submittedAt = new Date().toLocaleString('en-ZA', {
        dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Johannesburg',
      })

      // Admin notification about beneficiary update
      const adminResult = await sendEmail({
        to:        ADMIN_EMAIL,
        subject:   `[${refNo}] Beneficiary Updated — ${memberName}`,
        html:      buildBeneficiaryEmail({ refNo, memberName, beneficiaries, submittedAt }),
        refNo,
        emailType: 'beneficiary_admin',
      })

      // Member confirmation (only if email available)
      let memberResult = { success: true, skipped: true, reason: 'no_member_email' }
      if (memberEmail && memberEmail.includes('@')) {
        const r = await sendEmail({
          to:        memberEmail,
          subject:   `[${refNo}] Your AMCU Beneficiary Has Been Updated`,
          html:      buildBeneficiaryEmail({ refNo, memberName, beneficiaries, submittedAt }),
          refNo,
          emailType: 'beneficiary_member',
        })
        memberResult = { ...r, skipped: false }
      }

      return new Response(JSON.stringify({
        success:      adminResult.success,
        ref_no:       refNo,
        admin_email:  adminResult,
        member_email: memberResult,
      }), {
        status: adminResult.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    // Unknown type
    return new Response(JSON.stringify({ success: false, error: `Unknown email type: ${emailType}` }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    })

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`[AMCU] Unhandled error for ${refNo}:`, errMsg)
    await logFailure(refNo, 'unhandled', ADMIN_EMAIL, errMsg)
    return new Response(JSON.stringify({ success: false, error: errMsg, ref_no: refNo }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
