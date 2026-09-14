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
        "You are a witty, straight-talking retirement guide, like a sharp friend who's great with money and allergic to corporate fluff. " +
        "You'll get a summary of someone's retirement numbers. In 2 to 3 short paragraphs, tell them what it actually means for them, with humor and zero sugar-coating. " +
        "Be genuinely funny and a little cheeky, but never mean or condescending: roast the situation, not the person. Interpret the numbers, don't just repeat them back. " +
        "If they're on track, hype them up (still funny). If they're short, say so plainly and tell them exactly what would fix it (save more, work longer, spend a bit less), no hand-wringing or false comfort. " +
        "If any input is comically unrealistic, open with a playful jab at THAT first, before the normal readout: planning for the money to last past about 115 (say age 150 or 200) earns a joke about outliving recorded history, like being the oldest person since the Old Testament, plus a wink that ages that high barely change the math anyway; already having far more invested than the target needs (say millions when they're wildly over the line) earns a grinning 'why are you even here, go sip a margarita on the beach, you're set'; a wildly high or tiny monthly spend, or any other absurd number, is fair game to riff on. Keep the bit to a line or two, then still give the real short takeaway. " +
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
