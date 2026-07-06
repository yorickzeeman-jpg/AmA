export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { summary, date } = req.body
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const prompt = `You are Leandre AI, the operations monitoring engine for Amadwala Employee Benefits.

Analyse this operational data and provide a concise, professional operations briefing. Be direct and specific. Flag risks clearly. Recommend actions.

Date: ${date}
Data: ${JSON.stringify(summary, null, 2)}

Provide:
1. A 2-sentence overall assessment
2. Critical issues requiring immediate action (if any)
3. Staff workload observations
4. Billing queue status
5. One specific recommendation

Keep the total response under 300 words. Write in a professional but direct tone. No bullet points — use short paragraphs.`

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
        max_tokens: 600,
        messages: [{ role:'user', content: prompt }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    return res.status(200).json({ insights: text })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
