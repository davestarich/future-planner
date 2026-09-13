import { useState } from 'react'
import { computeProjection, computeOnTrack, formatMoney } from './lib/calc.js'

// In production the AI function is served from the same site (a relative URL).
// In local dev (Vite on :5173) there's no function, so call the deployed one
// instead, which means the button works even while developing locally.
const API_BASE = import.meta.env.PROD ? '' : 'https://future-planner-nine.vercel.app'

// How each on-track outcome is shown. `message` takes the gap (already formatted).
const STATUS_DISPLAY = {
  'on-track': {
    emoji: '🟢',
    word: 'On track',
    message: (gap) => `You're on pace to reach your target with about ${gap} to spare. Nicely done.`,
  },
  close: {
    emoji: '🟡',
    word: 'Close',
    message: (gap) =>
      `You're close: about ${gap} short of your target. A small bump in monthly savings likely closes the gap.`,
  },
  shortfall: {
    emoji: '🔴',
    word: 'Shortfall',
    message: (gap) =>
      `You're on pace for a shortfall of about ${gap}. Try raising your monthly contribution or retiring a little later, and watch the gap shrink.`,
  },
}

export default function App() {
  // Step 1 inputs (the only things the user has to give us up front).
  const [monthlySpend, setMonthlySpend] = useState(4000)
  const [currentAge, setCurrentAge] = useState(48)
  const [retirementAge, setRetirementAge] = useState(65)

  // Step 2 inputs (the "am I on track?" check).
  const [currentAssets, setCurrentAssets] = useState(350000)
  const [monthlyContribution, setMonthlyContribution] = useState(2500)
  const [showOnTrack, setShowOnTrack] = useState(false)

  // Assumptions (sensible defaults, adjustable by the user).
  const [inflation, setInflation] = useState(3)
  const [returnRate, setReturnRate] = useState(7)
  const [withdrawal, setWithdrawal] = useState(4)
  const [showAssumptions, setShowAssumptions] = useState(false)

  // AI explanation feature.
  const [explanation, setExplanation] = useState('')
  const [loadingExplain, setLoadingExplain] = useState(false)
  const [explainError, setExplainError] = useState('')

  const years = Math.max(0, retirementAge - currentAge)
  const retirementYear = new Date().getFullYear() + years

  // Number inputs normally change value when you scroll the mouse wheel over them,
  // which is annoying while scrolling the page. Blurring on wheel disables that.
  const preventWheelChange = (e) => e.currentTarget.blur()

  const { futureMonthly, targetNominal, targetToday, neededToday } = computeProjection({
    monthlySpendToday: monthlySpend,
    yearsToRetirement: years,
    inflationPct: inflation,
    returnPct: returnRate,
    withdrawalPct: withdrawal,
  })

  const onTrack = computeOnTrack({
    currentAssets,
    monthlyContribution,
    yearsToRetirement: years,
    returnPct: returnRate,
    targetNominal,
  })
  const status = STATUS_DISPLAY[onTrack.status]

  // Send the current numbers to our serverless function, which asks Claude to
  // explain them in plain English, then show the result.
  async function explainResults() {
    setLoadingExplain(true)
    setExplainError('')
    setExplanation('')
    try {
      const summary =
        `A person wants to spend $${monthlySpend} per month in retirement, in today's dollars. ` +
        `They are ${currentAge} now and plan to retire at ${retirementAge}, which is ${years} years away (the year ${retirementYear}). ` +
        `Assuming ${inflation}% inflation, ${returnRate}% investment return, and a ${withdrawal}% withdrawal rate: ` +
        `their retirement target is about ${formatMoney(targetToday)} in today's dollars (${formatMoney(targetNominal)} by ${retirementYear}), ` +
        `and to reach it without saving another dollar they'd need about ${formatMoney(neededToday)} invested today. ` +
        `They currently have ${formatMoney(currentAssets)} invested and add ${formatMoney(monthlyContribution)} per month, ` +
        `which is projected to grow to ${formatMoney(onTrack.projected)} by ${retirementYear} versus their ${formatMoney(targetNominal)} target, ` +
        `so they are currently "${onTrack.status}".`

      const res = await fetch(`${API_BASE}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      })
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      setExplanation(data.explanation || '')
    } catch (e) {
      setExplainError("Sorry, couldn't generate an explanation right now. Please try again in a moment.")
    } finally {
      setLoadingExplain(false)
    }
  }

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
              onWheel={preventWheelChange}
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
              onWheel={preventWheelChange}
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
              onWheel={preventWheelChange}
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

      <section className="explain">
        <button className="explain-btn" onClick={explainResults} disabled={loadingExplain}>
          {loadingExplain ? 'Thinking…' : '✨ Explain what this means for me'}
        </button>
        {explainError && <p className="explain-error">{explainError}</p>}
        {explanation && (
          <div className="card explain-output">
            {explanation
              .split('\n')
              .map((p) => p.trim())
              .filter(Boolean)
              .map((para, i) => (
                <p key={i}>{para}</p>
              ))}
          </div>
        )}
      </section>

      <section className="ontrack">
        <button className="accordion-toggle" onClick={() => setShowOnTrack((v) => !v)}>
          {showOnTrack ? 'Hide the on-track check' : 'Am I on track?'}
          <span className="chev">{showOnTrack ? '▲' : '▼'}</span>
        </button>
        {showOnTrack && (
          <div className="card ontrack-body">
            <p className="ontrack-intro">
              Add what you have and what you're saving, and we'll project whether you'll hit your
              target by {retirementYear}.
            </p>

            <label className="field">
              <span className="q">What do you have invested today?</span>
              <small>401k, IRA, brokerage, and cash savings. Not your home.</small>
              <div className="money-input">
                <span className="prefix">$</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={currentAssets}
                  onChange={(e) => setCurrentAssets(Number(e.target.value))}
                  onWheel={preventWheelChange}
                />
              </div>
            </label>

            <label className="field">
              <span className="q">How much do you add each month?</span>
              <small>Your contributions plus any employer match.</small>
              <div className="money-input">
                <span className="prefix">$</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                  onWheel={preventWheelChange}
                />
                <span className="suffix">/ month</span>
              </div>
            </label>

            <div className={`status-card status-${onTrack.status}`}>
              <div className="status-badge">
                <span className="status-emoji">{status.emoji}</span>
                <span className="status-word">{status.word}</span>
              </div>
              <div className="status-compare">
                <div className="status-row">
                  <span className="k">Projected by {retirementYear}</span>
                  <span className="v">{formatMoney(onTrack.projected)}</span>
                </div>
                <div className="status-row">
                  <span className="k">Your target</span>
                  <span className="v">{formatMoney(targetNominal)}</span>
                </div>
              </div>
              <p className="status-message">{status.message(formatMoney(Math.abs(onTrack.gap)))}</p>
            </div>
          </div>
        )}
      </section>

      <section className="assumptions">
        <button className="accordion-toggle" onClick={() => setShowAssumptions((v) => !v)}>
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
