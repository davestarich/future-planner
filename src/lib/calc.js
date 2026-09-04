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

// Short, friendly currency: $1.98M, $628K, $4,000.
export function formatMoney(value) {
  if (!isFinite(value) || value <= 0) return '$0'
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(2) + 'M'
  if (value >= 10_000) return '$' + Math.round(value / 1000) + 'K'
  return '$' + Math.round(value).toLocaleString('en-US')
}
