# Future Planner, Product Requirements Document

**Version:** v1 (MVP) · **Author:** Dave Starich · **Status:** Draft · **Last updated:** 2026-09-03

---

## 1. One-liner

**The 5-minute retirement reality check.** Tell it how much you want to spend per month, and it tells you the size of the nest egg you're aiming for, plus how much you'd need invested today to get there.

## 2. The problem

Most people have no intuitive sense of whether they're on track for retirement. The tools that exist fall into two traps:

- **Traditional retirement calculators** demand a dozen financial inputs (current balance, savings rate, asset allocation, real vs. nominal return) before showing anything. They're powerful but intimidating, and most people bounce.
- **FIRE calculators** (FIRE stands for Financial Independence, Retire Early, a movement built around saving aggressively to retire decades early) are simpler, but they assume you already speak the lingo, like "safe withdrawal rate" and the "4% rule."

Nobody starts from the one question a normal person can actually answer: *"How much do I want to spend each month?"*

## 3. Target user

A financially engaged but non-expert adult (30s to 50s) who wants a quick, honest gut-check on retirement without learning jargon or filling out a 15-field form. Not a financial professional, and not part of the FIRE crowd.

## 4. Positioning vs. what exists

| Tool | What it does | The gap |
|------|--------------|---------|
| EverydayCalc | Spending in today's dollars to target in today's and future dollars | Still form-heavy; buries the "aha" |
| FinanceTools | Has a "desired monthly spending (today's money)" input | Utilitarian; no progressive disclosure |
| CalculatorCircle | Projects monthly spending forward with inflation | Single-purpose, not framed around the user's real question |
| FIRECalc | Sophisticated historical/Monte-Carlo analysis | Powerful but complex and intimidating |

**Our wedge is not a new formula. It's a dramatically simpler, more intuitive *experience* around one question:** *"I want to live on $X/month in today's money. What does that mean for me, and am I on track?"*

## 5. Product principles

1. **Value before effort.** Show a meaningful number after 2 or 3 inputs. Earn the right to ask for more.
2. **Plain language over jargon.** The user never needs to know what "withdrawal rate" means to get an answer.
3. **Honest assumptions, shown openly.** Every assumption is visible and adjustable, never a hidden "magic number."

## 6. The experience

### Step 1: The number (instant, 2 to 3 inputs)
**Inputs:** desired monthly spend (today's dollars) · years to retirement (from age, or entered directly)
**Outputs (two clearly-labeled numbers):**

| | Example ($4,000/mo, 17 yrs) | Label shown to user |
|---|---|---|
| **Your retirement target** | **$1.98M** *(about $1.2M in today's money)* | "The size of the nest egg you're aiming for." |
| **What that means today** | **~$628K** invested now | "Have this much invested today and it grows into your target on its own, even if you never save another dollar." *(assumes invested, ~7%/yr)* |

### Step 2: Am I on track? (accordion / expandable)
**Inputs:** current investable assets · monthly contribution
**Output:** projected savings at retirement vs. target, shown as 🟢 On track / 🟡 Close / 🔴 Shortfall, plus the dollar gap.

## 7. The calculation model

**Inputs:** desired monthly spend today (`S`), years to retirement (`Y`), [Step 2] current assets (`A`), monthly contribution (`C`)

**Assumptions (defaults, all adjustable via sliders):** inflation `i` = 3% · investment return `r` = 7% · withdrawal rate `w` = 4%

**Formulas:**
- Future monthly spend = `S × (1 + i)^Y`
- Target nest egg (at retirement, nominal) = `future monthly × 12 ÷ w`
- Target in today's dollars = `target ÷ (1 + i)^Y`
- **What you'd need invested today** = `target ÷ (1 + r)^Y`
- [Step 2] Projected at retirement = `A × (1 + r)^Y + future value of monthly contributions C`
- [Step 2] Status = compare projected vs. target

**Scoping decisions (deliberate and defensible):**
- Counts **investable assets only** (401k, IRA, brokerage, cash), and **excludes home equity and possessions** ("you have to live somewhere").
- The "needed today" number **assumes the money is invested**. That assumption is *why* it's smaller than the target, and it's stated on screen.
- It's a **ballpark**, not financial advice. All assumptions are user-adjustable.

## 8. Scope

**In (v1 / MVP):** Step 1 two-number output · Step 2 on-track check · adjustable assumption sliders · fully client-side, deployed live.

**Deferred (roadmap):**
- **Social Security offset:** the biggest single complication, cut from v1 on purpose.
- **Home equity and property:** outside the investable-assets scope for now.
- **API #1, AI explanation:** Claude API turns the numbers into a plain-English, personalized readout.
- **API #2, real economic data:** FRED API grounds inflation and return assumptions in actual historical data.
- **Reframe the withdrawal-rate input in plain language:** "withdrawal rate" is jargon (it caused real confusion in testing). The rate is mostly a proxy for how long the money must last, so replace the slider with a human question like "Plan for your money to last until age ___" (default ~90) and derive the withdrawal rate behind the scenes (years-to-last maps to a safe rate via a small lookup: ~20yr to 5%, ~30yr to 4%, ~40yr+ to 3.25-3.5%). We already collect retirement age, so `plan-to age minus retirement age` gives the horizon. Directly serves the "plain language over jargon" principle.
- **Life-expectancy guidance:** help users pick a sensible "plan-to" age. Note the key nuance: life expectancy *at birth* (~76 for men) is the wrong number; someone who has already reached 65 is expected to live to ~84 (women ~86-87), and because that is an average, plan past it (to ~90-95) to avoid outliving the money.

## 9. Success metrics

**North Star:** weekly completed reality checks (a user finishes Step 1 and expands into Step 2 to see whether they're on track).

**Acquisition:** unique visitors and where they come from (search, social, referral).

**Activation:** percent of visitors who complete Step 1 and see their target number. This is the core "aha," so it's the metric that matters most early.

**Engagement:** percent who expand to Step 2; percent who adjust at least one assumption slider; number of scenarios run per session.

**Retention:** percent of visitors who return within 30 days; percent who re-run with updated numbers as their situation changes.

**Referral:** percent who share their result, and the referral traffic those shares drive (once sharing ships).

**Monetization path (future):** email sign-ups to save results, and conversion to a premium tier (saved profiles, account linking, advanced modeling).

## 10. Tech and delivery

Built with AI-assisted coding (Claude) using **Vite + React**, deployed on **Vercel**, which auto-deploys the live site every time code is pushed to GitHub and leaves room to add a server-side API key later without re-platforming. Entire stack is free (Vite, React, GitHub, and Vercel's free tier); the only future cost is pay-per-use Claude API calls in Phase 2, which run a fraction of a cent per explanation.

## 11. Open questions

- Product name: "Future Planner" is the working title. Something punchier?
- In Step 2, do we let users split "invested vs. cash" for their current assets, or keep one blended return for simplicity? (Leaning blended for the MVP.)
