// Vercel serverless function — proxies PDF to Anthropic API server-side

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { base64, mediaType } = req.body
  if (!base64) return res.status(400).json({ error: 'No base64 data provided' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const prompt = `You are extracting structured data from an employer benefit summary document (inhouse pack).

Read the ENTIRE document carefully and extract every value you can find.

Return ONLY a valid JSON object — absolutely no markdown fences, no explanation text, just the raw JSON.

Important rules:
- Extract ALL contribution categories found (there may be 1, 2, 3 or 4)
- For each category extract the exact employer % and employee % from the table
- contributionCategories is an array: [{"category":"Category 1","employer":5.5,"employee":5.5,"description":"All"}]
- The "description" field in contribution categories is optional — include if present
- glaFreeCoverLimit: extract as a number only, no R symbol (e.g. 140000 not "R140,000")
- administrationCost: number only, no R symbol
- If a section is not present in the document (e.g. no medical aid section), use null/empty string — do NOT guess
- normalRetirementAge: number only (e.g. 65)
- Extract capital disability benefit if present: rate, free cover limit, waiting period
- Extract funeral benefit if present: rate per member per month
- billingDueDate: extract as string like "14th" or "1st"

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
  "consultingFee": null,
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
  "capitalDisabilityRate": null,
  "capitalDisabilityFreeCover": null,
  "capitalDisabilityWaitingMonths": null,
  "funeralRatePerMember": null,
  "funeralPrincipalCover": null,
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
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 2000,
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

    const data   = await response.json()
    const text   = data.content?.[0]?.text || ''
    const clean  = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return res.status(200).json({ ok: true, data: parsed })

  } catch(e) {
    console.error('[extract-employer] Error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
