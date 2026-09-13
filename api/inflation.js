// Serverless function: fetches historical Consumer Price Index data from FRED
// (the Federal Reserve's free data API) and computes the average annual
// inflation over a lookback window. The FRED key stays server-side.
const FRED_URL = 'https://api.stlouisfed.org/fred/series/observations'
const LOOKBACK_YEARS = 30

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://future-planner-nine.vercel.app',
]

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const key = process.env.FRED_API_KEY
    if (!key) return res.status(500).json({ error: 'Missing FRED key' })

    // Start the window a bit before our lookback so we have a clean anchor point.
    const start = new Date()
    start.setFullYear(start.getFullYear() - LOOKBACK_YEARS - 1)
    const observationStart = start.toISOString().slice(0, 10)

    // CPIAUCSL = Consumer Price Index for All Urban Consumers, monthly.
    const url = `${FRED_URL}?series_id=CPIAUCSL&api_key=${key}&file_type=json&observation_start=${observationStart}`
    const r = await fetch(url)
    if (!r.ok) throw new Error('FRED request failed')
    const data = await r.json()

    const obs = (data.observations || []).filter((o) => o.value !== '.')
    if (obs.length < 24) throw new Error('Not enough data')

    const first = obs[0]
    const last = obs[obs.length - 1]
    const firstVal = parseFloat(first.value)
    const lastVal = parseFloat(last.value)
    const yearsSpan = (new Date(last.date) - new Date(first.date)) / (365.25 * 24 * 3600 * 1000)

    // The compound annual growth rate of the price index is the average
    // annual inflation over the window.
    const rate = (Math.pow(lastVal / firstVal, 1 / yearsSpan) - 1) * 100

    return res.status(200).json({
      rate: Math.round(rate * 10) / 10,
      years: Math.round(yearsSpan),
      latestDate: last.date,
    })
  } catch (err) {
    console.error('inflation error:', err)
    return res.status(500).json({ error: 'Could not fetch inflation data.' })
  }
}
