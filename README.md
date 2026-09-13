# Future Planner

**The 5-minute retirement reality check.** Tell it how much you want to spend per month, and it shows the size of the nest egg you're aiming for, how much you'd need invested today to get there, and whether you're on track, in plain English.

> **Live demo:** https://future-planner-nine.vercel.app

## Why this exists

Most retirement calculators either demand a dozen financial inputs before showing anything, or are built for the FIRE (Financial Independence, Retire Early) crowd who already speak the jargon. Future Planner starts from the one question a normal person can actually answer: *"How much do I want to spend each month?"* and does the translation for them.

## What it does

- **Step 1 (instant):** enter your desired monthly spend and your age, and get two clear numbers: your retirement target (in today's dollars) and how much you'd need invested today to reach it.
- **Step 2 (am I on track?):** enter your current savings and monthly contributions to see whether you're on pace, shown as on track / close / shortfall with the exact dollar gap.
- **AI explanation:** one click asks Claude to turn your numbers into a warm, personalized, plain-English readout of what they mean for you.
- Every assumption (inflation, investment return, withdrawal rate) is visible and adjustable, never a hidden "magic number."

## Product thinking

This project started as a product exercise, not just a coding one. The full problem definition, competitive teardown, scope decisions, success metrics, and roadmap live in [PRD.md](PRD.md).

## Tech

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) for the front end
- A [Vercel](https://vercel.com/) serverless function (`api/explain.js`) for the AI feature
- The [Anthropic API](https://www.anthropic.com/) (Claude) for the plain-English explanations, called through the official SDK
- Deployed on Vercel, auto-deploying on every push to `main`

**How the AI feature is wired:** the browser never sees the API key. It calls a small serverless function, which holds the key as a server-side environment variable and talks to Claude on the app's behalf.

```
browser  ->  /api/explain (Vercel function, holds the secret key)  ->  Claude  ->  back to the browser
```

The retirement math is kept in `src/lib/calc.js`, separate from the UI, so the logic stays easy to read and test.

## Run it locally

```bash
npm install
npm run dev
```

Then open the local URL it prints (usually http://localhost:5173). The AI button in local dev calls the deployed function, so it works without a local API key.

## Roadmap

- Reframe the "withdrawal rate" control in plain language ("plan for your money to last until age ___")
- Sticky, live-updating inputs while scrolling
- Real historical inflation and market data (FRED API)
- Social Security offset
- Rate limiting on the AI endpoint before any public launch

## Author

Dave Starich
