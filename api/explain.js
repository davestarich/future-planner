import Anthropic from '@anthropic-ai/sdk'

// This runs on Vercel's servers, NOT in the browser. It reads the secret
// ANTHROPIC_API_KEY from Vercel's environment variables, so the key is never
// exposed to users. The browser calls this; this calls Claude.
const client = new Anthropic()

// Only these sites are allowed to call this endpoint from a browser.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://future-planner-nine.vercel.app',
]

export default async function handler(req, res) {
  // CORS: let our own app (local + live) call this, and reject others.
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { summary } = req.body || {}
    if (!summary) return res.status(400).json({ error: 'Missing summary' })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system:
        "You are a warm, plain-spoken retirement guide talking to an everyday person, not a finance expert. " +
        "You will be given a summary of someone's retirement numbers. In 2 to 3 short paragraphs, explain what those numbers mean FOR THEM in encouraging, everyday language. " +
        "Interpret the situation, don't just repeat the numbers back. If they're on track, reassure them; if there's a shortfall, be honest but constructive and mention a lever or two (save a bit more, work a little longer). " +
        "No jargon, no markdown, no bullet points, no disclaimers (the app already shows one). Keep it under about 150 words.",
      messages: [{ role: 'user', content: summary }],
    })

    const text = response.content.find((b) => b.type === 'text')?.text ?? ''
    return res.status(200).json({ explanation: text })
  } catch (err) {
    console.error('explain error:', err)
    return res.status(500).json({ error: 'Could not generate an explanation right now.' })
  }
}
