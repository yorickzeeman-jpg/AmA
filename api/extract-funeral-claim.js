export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { base64, mediaType, claimType } = req.body
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const prompt = `You are processing a funeral claim document for an employee benefits administrator.

Extract the following information from this document and return ONLY valid JSON with these exact keys:
{
  "memberName": "full name of the main member (policyholder)",
  "idNumber": "South African ID number (13 digits)",
  "payrollNo": "payroll or employee number",
  "membershipNo": "scheme membership number if visible",
  "deceasedName": "full name of the deceased",
  "relationship": "relationship of deceased to member (e.g. Member, Spouse, Child, Parent)",
  "dateOfDeath": "date of death in YYYY-MM-DD format",
  "cause": "Natural or Unnatural",
  "contactNumber": "contact phone number",
  "bankName": "bank name if visible",
  "accountNumber": "bank account number if visible",
  "employerName": "employer company name if visible"
}

Claim type: ${claimType === 'main_member' ? 'Main Member Funeral' : 'Extended Family Funeral'}

Return only valid JSON. Use null for any field not found. No explanation, no markdown.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            { type:'document', source:{ type:'base64', media_type: mediaType, data: base64 } },
            { type:'text', text: prompt }
          ]
        }]
      })
    })

    const result = await response.json()
    const text   = result.content?.[0]?.text || '{}'
    let data = {}
    try {
      const clean = text.replace(/```json|```/g,'').trim()
      data = JSON.parse(clean)
    } catch(e) {
      data = {}
    }
    // Remove null values
    Object.keys(data).forEach(k => { if (data[k] === null) delete data[k] })
    return res.status(200).json({ data })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
