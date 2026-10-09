# PSY Practice Lab

A local-first collection of cognitive practice tests built with Vite, React,
TypeScript, React Router, and Tailwind CSS. Results are stored only in the
browser's local storage; there is no database or server component.

Every test includes an accessible, step-by-step guided demo built with Radix
Dialog before the real session begins.

## Requirements

- Node.js `>=22.13.0`
- pnpm `10.10.0`

## Run locally

```bash
pnpm install
pnpm dev
```

Vite prints both a local URL and a network URL. To open the app from an iPad on
the same Wi-Fi network, use the network URL (for example,
`http://192.168.1.20:5173`). Keep the development server running and allow
incoming connections if macOS asks.

## Commands

- `pnpm dev` — start the development server on the local network
- `pnpm build` — type-check and create a production build
- `pnpm preview` — preview the production build on the local network
- `pnpm lint` — run ESLint
- `pnpm test` — build and run the project checks

The production target is Safari 16, matching older iPadOS/WebKit versions.

## Routes

- `/` — test hub
- `/reaction-time` — configurable reaction-time test with optional extreme-value exclusion
- `/short-term-memory` — configurable grid-memory test with adjustable rounds
- `/divided-attention` — configurable driving and traffic-signal test
- `/monotony` — sustained classification test
- `/capacity-to-act` — mixed color, pedal, audio, and distraction response test
- `/tower-of-hanoi` — configurable planning puzzle with move-speed graph
- `/distributive-attention` — one-handed, two-handed, and mixed row/column coordination test
- `/perception` — simultaneous two-signal test with independent fixed left and right layouts
- `/deductive-reasoning` — shape-grid reasoning with randomized questions, timed adaptive practice by default, optional notes, and answer review
- `/switch-reasoning` — shape-sequence code reasoning with one- and two-stage randomized questions, timed adaptive practice by default, and answer review
- `/digit-challenge` — complete arithmetic equations with distinct digits from 1 to 9; accepts all valid solutions
- `/odd-one-out` — identify the rule-breaking object among nine shapes (scales ix)
- `/grid-classification` — infer a rule from two 3×3 examples and select two matching grids (scales clx)
- `/green-grey-classification` — infer a rule from six labelled diamond grids and classify four candidates as green or grey

These four reasoning exercises default to timed adaptive practice and also
support untimed question counts, guided demos, and saved solution reviews.

Green/Grey Classification varies 16 rules, including strict sum comparisons,
number ranges, top/bottom relationships, matching corners, odd/even letter
counts, and minimum occurrences of 7, Z, or any repeated letter.

Deductive reasoning adds extra-hard 5×5 rounds with all-grey and all-black
shapes alternating between rounds. Adaptive practice reaches this stage after
four correct 5×5 answers in the last five. Clues, notes, answer choices, and
saved solution reviews share the round's palette.
Every deductive result also offers a tutorial-style solving popup that walks
through a focused chain of row/column deductions to the target cell.

Each test uses `/test` while a session is active and `/result` after it
finishes. For example: `/reaction-time/test` and `/reaction-time/result`.

## GitHub Pages

Pushes to `main` automatically build and deploy the site to
`https://tibi1220.github.io/psy-practice-lab/`. In the repository's
**Settings → Pages**,
set **Source** to **GitHub Actions** before the first deployment.

The deployment build uses `/psy-practice-lab/` as its Vite and React Router
base. Local development continues to use `/`, and the workflow includes a
`404.html` SPA fallback so direct links to test pages work on GitHub Pages.
