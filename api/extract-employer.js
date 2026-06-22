// Vercel serverless function — proxies PDF to Anthropic API server-side
// Keeps ANTHROPIC_API_KEY out of the browser entirely

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { base64, mediaType } = req.body

  if (!base64) {
    return res.status(400).json({ error: 'No base64 data provided' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const prompt = `Extract data from this employer benefit summary / inhouse pack document.

Return ONLY a valid JSON object with these exact fields — no markdown, no explanation, no code fences:

{
  "employerName": "",
  "payrollContactName": "",
  "payrollContactSurname": "",
  "payrollPhone": "",
  "payrollEmail": "",
  "fundName": "",
  "fundCode": "",
  "fundAdministrator": "",
  "normalRetirementAge": null,
  "administrationCost": null,
  "startDate": "",
  "contributionCategories": [],
  "glaSchemeNumber": "",
  "glaAdministrator": "",
  "glaBenefit": "",
  "glaRate": null,
  "glaFreeCoverLimit": null,
  "glaBenefitExpiryAge": null,
  "glaGlobalEducationProtector": "",
  "glaMortgageProtector": false,
  "glaEducationBenefit": false,
  "phiRate": null,
  "phiWaitingPeriodMonths": null,
  "phiEscalationPercent": null,
  "phiBenefitExpiryAge": null,
  "phiContributionProtectorMonths": null,
  "medicalAidScheme": "",
  "medicalAidSchemeNumber": "",
  "billingMethod": "",
  "billingDueDate": "",
  "paymentMethod": "",
  "compulsory": false
}

contributionCategories must be an array of objects: { "category": "Category 1", "employer": 5, "employee": 0 }
Use null for numeric fields not found. Use empty string for text fields not found.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-api-key':      apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: mediaType || 'application/pdf', data: base64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[extract-employer] Anthropic error:', err)
      return res.status(502).json({ error: 'Extraction API failed', detail: err })
    }

    const data  = await response.json()
    const text  = data.content?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return res.status(200).json({ ok: true, data: parsed })

  } catch(e) {
    console.error('[extract-employer] Error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
