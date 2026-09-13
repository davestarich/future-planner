// Pure retirement math. No UI in here, so it's easy to read, reason about, and test later.

export function computeProjection({
  monthlySpendToday,
  yearsToRetirement,
  inflationPct,
  returnPct,
  withdrawalPct,
}) {
  const i = inflationPct / 100
  const r = returnPct / 100
  const w = withdrawalPct / 100
  const Y = Math.max(0, yearsToRetirement)

  // What your desired monthly spend will cost by the time you retire (inflation grows it).
  const futureMonthly = monthlySpendToday * Math.pow(1 + i, Y)

  // The nest egg that spend requires, using the withdrawal-rate rule of thumb.
  const targetNominal = (futureMonthly * 12) / w

  // That same target expressed in today's buying power (what it "feels like" now).
  const targetToday = targetNominal / Math.pow(1 + i, Y)

  // How much you'd need invested TODAY to coast to the target with no more saving.
  const neededToday = targetNominal / Math.pow(1 + r, Y)

  return { futureMonthly, targetNominal, targetToday, neededToday }
}

// Step 2: are you on track? Projects what you'll actually have at retirement
// (current savings grown, plus the future value of your ongoing contributions)
// and compares it to the target from Step 1. Everything here is in future
// (retirement-year) dollars, so it compares like-for-like with targetNominal.
export function computeOnTrack({
  currentAssets,
  monthlyContribution,
  yearsToRetirement,
  returnPct,
  targetNominal,
}) {
  const r = returnPct / 100
  const Y = Math.max(0, yearsToRetirement)

  // Your current pile, grown at the return rate.
  const grownAssets = currentAssets * Math.pow(1 + r, Y)

  // The future value of contributing every year until retirement.
  const annualContribution = monthlyContribution * 12
  const fvContributions =
    r === 0 ? annualContribution * Y : annualContribution * ((Math.pow(1 + r, Y) - 1) / r)

  const projected = grownAssets + fvContributions
  const gap = projected - targetNominal // positive = surplus, negative = shortfall
  const ratio = targetNominal > 0 ? projected / targetNominal : 0

  let status = 'shortfall'
  if (ratio >= 1) status = 'on-track'
  else if (ratio >= 0.85) status = 'close'

  return { projected, gap, ratio, status }
}

// Short, friendly currency: $1.98M, $628K, $4,000.
export function formatMoney(value) {
  if (!isFinite(value) || value <= 0) return '$0'
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(2) + 'M'
  if (value >= 10_000) return '$' + Math.round(value / 1000) + 'K'
  return '$' + Math.round(value).toLocaleString('en-US')
}
