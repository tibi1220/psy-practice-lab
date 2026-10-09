import { Link } from "react-router-dom";

const tests = [
  {
    number: "01",
    title: "Reaction time",
    description:
      "Measure how quickly you respond to a visual cue across a configurable series of trials.",
    href: "/reaction-time",
    accent: "text-cyan-300",
    glow: "bg-cyan-300/10",
    status: "Configurable",
  },
  {
    number: "02",
    title: "Short-term memory",
    description:
      "Remember which cells flashed in a configurable grid and round count.",
    href: "/short-term-memory",
    accent: "text-violet-300",
    glow: "bg-violet-300/10",
    status: "Configurable",
  },
  {
    number: "03",
    title: "Divided attention",
    description:
      "Steer through configurable traffic while responding to left and right signal changes.",
    href: "/divided-attention",
    accent: "text-emerald-300",
    glow: "bg-emerald-300/10",
    status: "Configurable",
  },
  {
    number: "04",
    title: "Performance under monotony",
    description:
      "Classify a long sequence of similar symbols while tracking speed and mistakes.",
    href: "/monotony",
    accent: "text-amber-300",
    glow: "bg-amber-300/10",
    status: "500 default",
  },
  {
    number: "05",
    title: "Capacity to act",
    description:
      "Coordinate color, pedal, and audio responses while ignoring visual distractions.",
    href: "/capacity-to-act",
    accent: "text-pink-300",
    glow: "bg-pink-300/10",
    status: "40 default",
  },
  {
    number: "06",
    title: "Tower of Hanoi",
    description:
      "Plan and execute a legal disk sequence while tracking moves and working speed.",
    href: "/tower-of-hanoi",
    accent: "text-cyan-300",
    glow: "bg-cyan-300/10",
    status: "Height 7",
  },
  {
    number: "07",
    title: "Distributive attention",
    description:
      "Coordinate rows and columns using intersection selection or simultaneous two-hand responses.",
    href: "/distributive-attention",
    accent: "text-rose-300",
    glow: "bg-rose-300/10",
    status: "Three modes",
  },
  {
    number: "08",
    title: "Perception",
    description:
      "Use independently chosen left and right layouts for one coordinated two-hand response.",
    href: "/perception",
    accent: "text-cyan-300",
    glow: "bg-cyan-300/10",
    status: "Three layouts",
  },
  {
    number: "09",
    title: "Deductive reasoning",
    description: "Find the missing shape in 4×4 and 5×5 grids using row and column rules.",
    href: "/deductive-reasoning",
    accent: "text-emerald-300",
    glow: "bg-emerald-300/10",
    status: "Three modes",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-10 text-white sm:px-8 sm:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl">
        <header className="max-w-3xl py-10 sm:py-16">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            PSY Practice Lab
          </p>
          <h1 className="mt-5 text-balance text-5xl font-black tracking-tight sm:text-7xl">
            Focus, react, remember, adapt.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-slate-300">
            A collection of focused exercises for practicing common cognitive
            tasks. Your results stay in this browser and remain available for
            later review.
          </p>
        </header>

        <section aria-labelledby="tests-heading" className="pb-14 sm:pb-20">
          <div className="mb-6 flex items-end justify-between gap-5">
            <h2 id="tests-heading" className="text-2xl font-bold">
              Choose a test
            </h2>
            <p className="font-mono text-sm text-slate-500">
              {tests.length} available
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {tests.map((test) => (
              <Link
                key={test.href}
                to={test.href}
                className="group relative min-h-72 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 sm:p-9"
              >
                <div
                  aria-hidden="true"
                  className={`absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl ${test.glow}`}
                />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <p
                      className={`font-mono text-sm font-bold tracking-[0.2em] ${test.accent}`}
                    >
                      TEST {test.number}
                    </p>
                    <p className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {test.status}
                    </p>
                  </div>
                  <h3 className="mt-12 text-3xl font-black tracking-tight sm:text-4xl">
                    {test.title}
                  </h3>
                  <p className="mt-4 max-w-md leading-7 text-slate-400">
                    {test.description}
                  </p>
                  <p
                    className={`mt-auto pt-8 text-sm font-bold ${test.accent}`}
                  >
                    Start test{" "}
                    <span
                      aria-hidden="true"
                      className="inline-block transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <footer className="border-t border-white/10 py-8 text-sm leading-6 text-slate-600">
          These exercises are for practice and self-observation, not clinical
          assessment.
        </footer>
      </div>
    </main>
  );
}
