import { useState, useEffect, useRef } from 'react'
import {
  computeProjection,
  computeOnTrack,
  withdrawalRateForYears,
  estimateSocialSecurity,
  formatMoney,
} from './lib/calc.js'
import { Analytics } from '@vercel/analytics/react'
import { track } from '@vercel/analytics'

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
  const [planToAge, setPlanToAge] = useState(95)
  const [showAssumptions, setShowAssumptions] = useState(false)

  // Social Security (optional): reduces the spend investments must cover.
  const [showSS, setShowSS] = useState(false)
  const [ssMode, setSsMode] = useState('estimate') // 'estimate' | 'known'
  const [ssKnown, setSsKnown] = useState('')
  const [ssJobs, setSsJobs] = useState([{ years: '', salary: '' }])
  const [ssClaimAge, setSsClaimAge] = useState(67)
  const [ssCouple, setSsCouple] = useState(false)

  // Analytics: fire each named event at most once per session, so the numbers
  // reflect "how many visitors engaged with X," not raw click spam.
  const firedEvents = useRef(new Set())
  const trackOnce = (name) => {
    if (firedEvents.current.has(name)) return
    firedEvents.current.add(name)
    track(name)
  }

  // AI explanation feature.
  const [explanation, setExplanation] = useState('')
  const [loadingExplain, setLoadingExplain] = useState(false)
  const [explainError, setExplainError] = useState('')

  // Sticky bar: watch the main inputs, and show the compact bar once they
  // scroll out of view so the user can keep tweaking without scrolling up.
  const inputsRef = useRef(null)
  const [showSticky, setShowSticky] = useState(false)
  useEffect(() => {
    const el = inputsRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Fetch real historical inflation from FRED once on load, and ground the
  // default assumption in it. If the call fails, we quietly keep the default.
  const [histInflation, setHistInflation] = useState(null)
  const [histYears, setHistYears] = useState(null)
  useEffect(() => {
    fetch(`${API_BASE}/api/inflation`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad response'))))
      .then((d) => {
        if (typeof d.rate === 'number') {
          setHistInflation(d.rate)
          setHistYears(d.years)
          setInflation(d.rate)
        }
      })
      .catch(() => {
        /* silent fallback: keep the 3% default */
      })
  }, [])

  // Fire once when the user first edits a core input (playground engagement).
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    trackOnce('scenario_changed')
  }, [monthlySpend, currentAge, retirementAge])

  const years = Math.max(0, retirementAge - currentAge)
  const retirementYear = new Date().getFullYear() + years

  // The withdrawal rate is now derived from how long the money must last
  // (plan-to age minus retirement age), so the user never sees the jargon.
  const moneyMustLastYears = Math.max(1, planToAge - retirementAge)
  const withdrawal = withdrawalRateForYears(moneyMustLastYears)

  // Social Security: weighted-average career income from the entered jobs, then
  // an estimated monthly benefit, then subtract it from the spend investments
  // must cover. When the user hasn't added anything, the benefit is 0 (no effect).
  const ssTotalYears = ssJobs.reduce((sum, j) => sum + (Number(j.years) || 0), 0)
  const ssCareerAvg =
    ssTotalYears > 0
      ? ssJobs.reduce((sum, j) => sum + (Number(j.years) || 0) * (Number(j.salary) || 0), 0) /
        ssTotalYears
      : 0
  const ssEstimated = estimateSocialSecurity({
    careerAvgIncome: ssCareerAvg,
    claimAge: ssClaimAge,
    isCouple: ssCouple,
  })
  const ssMonthly = ssMode === 'known' ? Number(ssKnown) || 0 : ssEstimated
  const coveredByInvestments = Math.max(0, monthlySpend - ssMonthly)

  // What the desired spend (not the invested portion) grows to with inflation,
  // used only for the illustrative note in the assumptions panel.
  const desiredFutureMonthly = monthlySpend * Math.pow(1 + inflation / 100, years)

  // Number inputs normally change value when you scroll the mouse wheel over them,
  // which is annoying while scrolling the page. Blurring on wheel disables that.
  const preventWheelChange = (e) => e.currentTarget.blur()

  const { targetNominal, targetToday, neededToday } = computeProjection({
    monthlySpendToday: coveredByInvestments,
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
    track('explain_clicked')
    setLoadingExplain(true)
    setExplainError('')
    setExplanation('')
    try {
      const summary =
        `A person wants to spend $${monthlySpend} per month in retirement, in today's dollars. ` +
        `They are ${currentAge} now and plan to retire at ${retirementAge}, which is ${years} years away (the year ${retirementYear}). ` +
        `Assuming ${inflation}% inflation, ${returnRate}% investment return, and planning for the money to last until age ${planToAge} (about a ${withdrawal.toFixed(1)}% withdrawal rate): ` +
        (ssMonthly > 0
          ? `Social Security is expected to cover about ${formatMoney(ssMonthly)}/month, so their investments only need to cover ${formatMoney(coveredByInvestments)}/month. `
          : '') +
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

  // Social Security job-list handlers.
  const addJob = () => setSsJobs((jobs) => [...jobs, { years: '', salary: '' }])
  const updateJob = (index, field, value) =>
    setSsJobs((jobs) => jobs.map((j, i) => (i === index ? { ...j, [field]: value } : j)))
  const removeJob = (index) => setSsJobs((jobs) => jobs.filter((_, i) => i !== index))

  return (
    <>
      {showSticky && (
        <div className="sticky-bar">
          <div className="sticky-inner">
            <label className="sticky-field">
              <span>Spend</span>
              <span className="sticky-money">
                <span className="sticky-prefix">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={monthlySpend}
                  onChange={(e) => setMonthlySpend(Number(e.target.value))}
                  onWheel={preventWheelChange}
                />
              </span>
              <span className="sticky-unit">/mo</span>
            </label>
            <label className="sticky-field">
              <span>Retire at</span>
              <input
                type="number"
                min="30"
                max="90"
                value={retirementAge}
                onChange={(e) => setRetirementAge(Number(e.target.value))}
                onWheel={preventWheelChange}
              />
            </label>
            <div className="sticky-result">
              <span className="sticky-result-label">Target</span>
              <strong>{formatMoney(targetToday)}</strong>
            </div>
          </div>
        </div>
      )}
      <div className="page">
      <header className="hero">
        <h1>Future Planner</h1>
        <p className="tagline">The 5-minute retirement reality check</p>
      </header>

      <section className="card inputs" ref={inputsRef}>
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
        <button
          className="accordion-toggle"
          onClick={() => {
            if (!showOnTrack) trackOnce('ontrack_opened')
            setShowOnTrack((v) => !v)
          }}
        >
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

      <section className="ss">
        <button
          className="accordion-toggle"
          onClick={() => {
            if (!showSS) trackOnce('social_security_opened')
            setShowSS((v) => !v)
          }}
        >
          {showSS ? 'Hide Social Security' : 'Include Social Security (optional)'}
          {!showSS && ssMonthly > 0 && (
            <span className="ss-badge">covers {formatMoney(ssMonthly)}/mo</span>
          )}
          <span className="chev">{showSS ? '▲' : '▼'}</span>
        </button>
        {showSS && (
          <div className="card ss-body">
            <p className="ss-intro">
              Social Security can cover a big slice of your retirement income, which shrinks the
              nest egg you need.
              <InfoTip>
                This is a ballpark. For your exact benefit, sign in at SSA.gov, get their estimate,
                and enter it with "I know my number."
              </InfoTip>
            </p>

            <div className="ss-modes">
              <button
                type="button"
                className={`ss-mode ${ssMode === 'known' ? 'active' : ''}`}
                onClick={() => setSsMode('known')}
              >
                I know my number
              </button>
              <button
                type="button"
                className={`ss-mode ${ssMode === 'estimate' ? 'active' : ''}`}
                onClick={() => setSsMode('estimate')}
              >
                Help me estimate it
              </button>
            </div>

            {ssMode === 'known' ? (
              <label className="field">
                <span className="q">Your expected monthly benefit</span>
                <small>The monthly amount from your SSA.gov statement (today's dollars).</small>
                <div className="money-input">
                  <span className="prefix">$</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={ssKnown}
                    onChange={(e) => setSsKnown(e.target.value)}
                    onWheel={preventWheelChange}
                  />
                  <span className="suffix">/ month</span>
                </div>
              </label>
            ) : (
              <div className="ss-estimate">
                <p className="ss-sublabel">Your past jobs</p>
                {ssJobs.map((job, i) => (
                  <div className="ss-job" key={i}>
                    <span className="ss-job-text">Worked</span>
                    <input
                      type="number"
                      className="ss-years"
                      min="0"
                      max="50"
                      placeholder="0"
                      value={job.years}
                      onChange={(e) => updateJob(i, 'years', e.target.value)}
                      onWheel={preventWheelChange}
                    />
                    <span className="ss-job-text">yrs at $</span>
                    <input
                      type="number"
                      className="ss-salary"
                      min="0"
                      step="1000"
                      placeholder="0"
                      value={job.salary}
                      onChange={(e) => updateJob(i, 'salary', e.target.value)}
                      onWheel={preventWheelChange}
                    />
                    <span className="ss-job-text">/yr</span>
                    {ssJobs.length > 1 && (
                      <button
                        type="button"
                        className="ss-remove"
                        aria-label="Remove job"
                        onClick={() => removeJob(i)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="ss-add" onClick={addJob}>
                  ＋ Add another job
                </button>

                <div className="ss-row-2">
                  <label className="field ss-inline">
                    <span className="q">When will you claim?</span>
                    <select value={ssClaimAge} onChange={(e) => setSsClaimAge(Number(e.target.value))}>
                      <option value={62}>As early as I can (62)</option>
                      <option value={67}>Full retirement age (67)</option>
                      <option value={70}>As late as possible (70)</option>
                    </select>
                  </label>
                  <label className="ss-couple">
                    <input
                      type="checkbox"
                      checked={ssCouple}
                      onChange={(e) => setSsCouple(e.target.checked)}
                    />
                    Planning as a couple
                  </label>
                </div>
              </div>
            )}

            <div className="ss-result">
              <span>{ssMode === 'known' ? 'Your Social Security' : 'Estimated Social Security'}</span>
              <strong>{formatMoney(ssMonthly)}/mo</strong>
            </div>
            {ssMonthly > 0 && (
              <p className="ss-note">
                That covers {formatMoney(ssMonthly)} of your {formatMoney(monthlySpend)}/month, so
                your investments only need to cover {formatMoney(coveredByInvestments)}/month.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="assumptions">
        <button
          className="accordion-toggle"
          onClick={() => {
            if (!showAssumptions) trackOnce('assumptions_opened')
            setShowAssumptions((v) => !v)
          }}
        >
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
              hint={
                histInflation
                  ? `Over the last ${histYears} years, inflation has averaged ${histInflation}% a year (live FRED data).`
                  : 'How fast prices rise. History runs about 2 to 3% a year.'
              }
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
            <label className="field">
              <span className="q">
                Plan for your money to last until age
                <InfoTip>
                  Life expectancy at birth (about 76 for men) is the wrong number to plan with.
                  Someone who has already reached 65 is expected to live to about 84 (men) or 86 to
                  87 (women), and that's an average, so half live longer. Plan to about 90 to 95 so
                  you don't risk outliving your money.
                </InfoTip>
              </span>
              <input
                type="number"
                min="70"
                max="110"
                value={planToAge}
                onChange={(e) => setPlanToAge(Number(e.target.value))}
                onWheel={preventWheelChange}
              />
              <small>
                That works out to roughly a {withdrawal.toFixed(1)}% withdrawal rate over{' '}
                {moneyMustLastYears} years of retirement. Planning to 90 to 95 is common, since
                it's wise to plan past the average.
              </small>
            </label>
            <p className="future-monthly-note">
              At {inflation}% inflation, your {formatMoney(monthlySpend)}/month becomes about{' '}
              <strong>{formatMoney(desiredFutureMonthly)}/month</strong> by {retirementYear}.
            </p>
          </div>
        )}
      </section>

      <footer className="disclaimer">
        A ballpark to help you think, not financial advice. Every number here rests on the
        assumptions above, which you can change.
      </footer>
    </div>
      <Analytics />
    </>
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

// A small "i" button that toggles an explanatory tooltip. Click/tap to open,
// so it works on touch devices too (not just hover).
function InfoTip({ children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  // Close the tooltip when the user clicks anywhere outside it.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])
  return (
    <span className="infotip" ref={ref}>
      <button
        type="button"
        className="infotip-btn"
        aria-label="More information"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        i
      </button>
      {open && (
        <span className="infotip-bubble" role="tooltip">
          {children}
        </span>
      )}
    </span>
  )
}
