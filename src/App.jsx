import { useState } from 'react'
import { computeProjection, formatMoney } from './lib/calc.js'

export default function App() {
  // Step 1 inputs (the only things the user has to give us up front).
  const [monthlySpend, setMonthlySpend] = useState(4000)
  const [currentAge, setCurrentAge] = useState(48)
  const [retirementAge, setRetirementAge] = useState(65)

  // Assumptions (sensible defaults, adjustable by the user).
  const [inflation, setInflation] = useState(3)
  const [returnRate, setReturnRate] = useState(7)
  const [withdrawal, setWithdrawal] = useState(4)
  const [showAssumptions, setShowAssumptions] = useState(false)

  const years = Math.max(0, retirementAge - currentAge)
  const retirementYear = new Date().getFullYear() + years

  const { futureMonthly, targetNominal, targetToday, neededToday } = computeProjection({
    monthlySpendToday: monthlySpend,
    yearsToRetirement: years,
    inflationPct: inflation,
    returnPct: returnRate,
    withdrawalPct: withdrawal,
  })

  return (
    <div className="page">
      <header className="hero">
        <h1>Future Planner</h1>
        <p className="tagline">The 5-minute retirement reality check</p>
      </header>

      <section className="card inputs">
        <label className="field">
          <span className="q">How much do you want to spend each month in retirement?</span>
          <small>In today's dollars: what you'd want to live on if it were now.</small>
          <div className="money-input">
            <span className="prefix">$</span>
            <input
              type="number"
              min="0"
              step="100"
              value={monthlySpend}
              onChange={(e) => setMonthlySpend(Number(e.target.value))}
            />
            <span className="suffix">/ month</span>
          </div>
        </label>

        <div className="age-row">
          <label className="field">
            <span className="q">Your age now</span>
            <input
              type="number"
              min="18"
              max="90"
              value={currentAge}
              onChange={(e) => setCurrentAge(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span className="q">Retirement age</span>
            <input
              type="number"
              min="30"
              max="90"
              value={retirementAge}
              onChange={(e) => setRetirementAge(Number(e.target.value))}
            />
          </label>
        </div>
        <p className="years-note">
          {years} years until retirement (the year {retirementYear})
        </p>
      </section>

      <section className="results">
        <div className="result-card primary">
          <p className="result-label">Your retirement target</p>
          <p className="result-number">{formatMoney(targetToday)}</p>
          <p className="result-sub">in today's dollars</p>
          <p className="result-detail">
            That's about <strong>{formatMoney(targetNominal)}</strong> by the time you retire in{' '}
            {retirementYear}. It's the size of the nest egg you're aiming for.
          </p>
        </div>

        <div className="result-card">
          <p className="result-label">What that means today</p>
          <p className="result-number">{formatMoney(neededToday)}</p>
          <p className="result-sub">invested right now</p>
          <p className="result-detail">
            Have this much invested today and it grows into your target on its own, even if you
            never save another dollar. Assumes it stays invested and grows about {returnRate}% a
            year.
          </p>
        </div>
      </section>

      <section className="assumptions">
        <button className="assumptions-toggle" onClick={() => setShowAssumptions((v) => !v)}>
          {showAssumptions ? 'Hide' : 'Adjust'} the assumptions
          <span className="chev">{showAssumptions ? '▲' : '▼'}</span>
        </button>
        {showAssumptions && (
          <div className="card sliders">
            <Slider
              label="Inflation"
              value={inflation}
              setValue={setInflation}
              min={0}
              max={6}
              step={0.1}
              hint="How fast prices rise. History runs about 2 to 3% a year."
            />
            <Slider
              label="Investment return"
              value={returnRate}
              setValue={setReturnRate}
              min={2}
              max={12}
              step={0.5}
              hint="Average yearly growth of your investments before inflation."
            />
            <Slider
              label="Withdrawal rate"
              value={withdrawal}
              setValue={setWithdrawal}
              min={2.5}
              max={6}
              step={0.5}
              hint="Share of your nest egg you spend each year. 4% is the common rule of thumb."
            />
            <p className="future-monthly-note">
              At {inflation}% inflation, your {formatMoney(monthlySpend)}/month becomes about{' '}
              <strong>{formatMoney(futureMonthly)}/month</strong> by {retirementYear}.
            </p>
          </div>
        )}
      </section>

      <footer className="disclaimer">
        A ballpark to help you think, not financial advice. Every number here rests on the
        assumptions above, which you can change.
      </footer>
    </div>
  )
}

// A small reusable labeled slider.
function Slider({ label, value, setValue, min, max, step, hint }) {
  return (
    <label className="slider">
      <div className="slider-top">
        <span>{label}</span>
        <span className="slider-value">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <small>{hint}</small>
    </label>
  )
}
