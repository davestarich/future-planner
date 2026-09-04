# Future Planner

**The 5-minute retirement reality check.** Tell it how much you want to spend per month, and it shows the size of the nest egg you're aiming for, plus how much you'd need invested today to get there.

> Live demo: _coming soon_

## Why this exists

Most retirement calculators either demand a dozen financial inputs before showing anything, or are built for the FIRE (Financial Independence, Retire Early) crowd who already speak the jargon. Future Planner starts from the one question a normal person can actually answer: *"How much do I want to spend each month?"* and does the translation for them.

## What it does

- **Step 1 (instant):** enter your desired monthly spend and your age, and get two clear numbers: your retirement target (in today's dollars) and how much you'd need invested today to reach it.
- **Step 2 (coming next):** enter your current savings and contributions to see whether you're on track.
- Every assumption (inflation, investment return, withdrawal rate) is visible and adjustable, never a hidden "magic number."

## Product thinking

This project started as a product exercise, not just a coding one. The full problem definition, competitive teardown, scope decisions, and success metrics live in [PRD.md](PRD.md).

## Tech

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) (front end)
- Deployed on [Vercel](https://vercel.com/)
- Calculation logic is kept separate from the UI (`src/lib/calc.js`) so it stays easy to read and test.

## Run it locally

```bash
npm install
npm run dev
```

Then open the local URL it prints (usually http://localhost:5173).

## Roadmap

- Step 2: "am I on track?" projection
- AI explanation of your results (Claude API)
- Real historical inflation and market data (FRED API)
- Social Security offset

## Author

Dave Starich
