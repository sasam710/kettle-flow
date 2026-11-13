# Kettle Flow

A kettlebell session timer I built for my own training and now use as a web app.

**[Open the live app](https://agile-mistral-urqhxyj-sasam710s-projects.vercel.app)**

You pick a plan, choose a difficulty for each exercise just before you start, and follow a guided clock with looping demos and a how-to link for every move.

## Plans

- **5 × 20** — five shorter sessions in a week, the original plan.
- **3 × 30** — three half-hour sessions, tracked across an eight-week programme. Odd weeks use the Week A sessions (legs and power, upper push and pull, get-ups); even weeks use Week B (single-leg and hinge, overhead and grip, full body and carries). Each exercise has three progressions — Start here, Next, and After that — each one clearly harder than the last.

A 30-minute session is a 4-minute warm-up, two 10-minute work blocks, a 2-minute finisher, and 4 minutes of hip mobility.

## What’s in the app

- A switcher between the two plans, with progress saved separately for each
- Per-exercise progressions and an optional weighted vest
- In-app looping demos, plus a “How to do this” link for each exercise
- Friday AMRAPs with a round counter
- Progress stored in the browser, so you can track an 8-week stretch of the 3 × 30 plan (24 sessions in all)

## Built with

TypeScript and [Vite](https://vite.dev), with no front-end framework. Tests run with Node’s built-in test runner. I built and iterated on this in [Cursor](https://cursor.com), and it is hosted on [Vercel](https://vercel.com).

## Run it locally

```bash
git clone https://github.com/sasam710/kettle-flow.git
cd kettle-flow
npm install
npm test
npm run dev -- --host
```

Vite serves the app at [http://127.0.0.1:43123](http://127.0.0.1:43123). `npm run build` typechecks and builds for production. Add `?gallery=1` to the address to see every exercise demo on one page.

The looping video clips on the live site are not in this repository — they would make it unnecessarily large. Locally you still get the in-app animated demos and the how-to links.
