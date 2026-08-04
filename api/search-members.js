// Server-side member search — keeps the 56k-member table (names + ID numbers)
// off the anon key entirely. Uses the service-role key, which exists ONLY as a
// Vercel env var and never reaches the browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const url = process.env.SUPABASE_URL || 'https://tjaofkrfqnkrtmjipltf.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return res.status(500).json({ error: 'Service role key not configured' })

  const { query, employer } = req.body || {}
  const q = (query || '').trim()
  if (q.length < 3) return res.status(200).json({ members: [] })

  // POPIA: minimum necessary — search only, capped results, no bulk export path
  const like = encodeURIComponent(`%${q}%`)
  const empFilter = employer ? `&employer=eq.${encodeURIComponent(employer)}` : ''
  const or = `or=(name.ilike.${like},id_number.ilike.${like},member_number.ilike.${like},payroll_number.ilike.${like})`
  const resp = await fetch(
    `${url}/rest/v1/funeral_members?select=id,name,id_number,member_number,payroll_number,employer,branch&status=eq.active&${or}${empFilter}&limit=10`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!resp.ok) return res.status(502).json({ error: 'Member search failed' })
  const members = await resp.json()
  return res.status(200).json({ members })
}
