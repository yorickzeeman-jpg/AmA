// Vercel serverless function — sends welcome email via Resend

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { profile, employer, caseRef } = req.body
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' })

  if (!profile?.email) return res.status(400).json({ error: 'No member email address' })

  const benefits = [
    profile.retirementFund && 'Igula Umbrella Provident Fund',
    profile.gla            && 'Group Life Assurance (Discovery)',
    profile.phi            && 'Income Disability Benefit',
    profile.medicalAid     && `Discovery Health Medical Aid${profile.medicalPlan ? ` — ${profile.medicalPlan}` : ''}`,
  ].filter(Boolean)

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <div style="background:#1e3a5f;borderRadius:12px;padding:28px 32px;margin-bottom:16px;text-align:center;">
    <div style="color:#e8680a;font-size:24px;font-weight:900;margin-bottom:4px;">AEB Portal</div>
    <div style="color:rgba(255,255,255,0.7);font-size:13px;">Amadwala Employee Benefits</div>
  </div>

  <div style="background:#fff;border-radius:12px;padding:28px 32px;margin-bottom:16px;">
    <h2 style="margin:0 0 8px;color:#1e3a5f;font-size:22px;">Welcome, ${profile.firstName}!</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6;">
      Your employee benefit enrolment with <strong>${employer}</strong> has been completed successfully.
      Your reference number is <strong>${caseRef}</strong>.
    </p>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:12px;">Your Details</div>
      ${[
        ['Full Name',    `${profile.firstName} ${profile.surname}`],
        ['ID Number',    profile.idNumber],
        ['Employer',     employer],
        ['Payroll No.',  profile.payrollNumber],
        ['Start Date',   profile.startDate],
        ['Category',     profile.benefitCategory],
      ].map(([k,v]) => v ? `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e7eb;font-size:13px;"><span style="color:#6b7280;">${k}</span><span style="font-weight:600;color:#111827;">${v}</span></div>` : '').join('')}
    </div>

    <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:10px;">Benefits Enrolled</div>
    ${benefits.map(b => `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f0fdf4;border-radius:6px;margin-bottom:6px;font-size:13px;color:#065f46;"><span>✓</span><span>${b}</span></div>`).join('')}
  </div>

  <div style="background:#fff;border-radius:12px;padding:20px 32px;margin-bottom:16px;">
    <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:10px;">Next Steps</div>
    <p style="font-size:13px;color:#374151;line-height:1.6;margin:0;">
      Your benefit administrator will process your enrolment documents. 
      You will receive your medical aid membership card from Discovery Health within 5–7 business days.
      For queries contact: <strong>admin@amadwala.co.za</strong>
    </p>
  </div>

  <div style="text-align:center;font-size:11px;color:#9ca3af;padding:8px;">
    AEB Portal · Amadwala Employee Benefits · Ref: ${caseRef}
  </div>
</div>
</body>
</html>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from:    'AEB Portal <onboarding@resend.dev>',
        to:      [profile.email],
        subject: `Welcome to ${employer} Benefits — Ref ${caseRef}`,
        html,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('[send-welcome-email] Resend error:', data)
      return res.status(502).json({ error: data.message || 'Email send failed' })
    }

    return res.status(200).json({ ok: true, emailId: data.id })
  } catch(e) {
    console.error('[send-welcome-email] Error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
