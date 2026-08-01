import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type TestAccent =
  | "cyan"
  | "violet"
  | "emerald"
  | "amber"
  | "pink"
  | "rose";

const accentStyles: Record<
  TestAccent,
  { text: string; hover: string; glow: string; focus: string }
> = {
  cyan: {
    text: "text-cyan-300",
    hover: "hover:text-cyan-300",
    glow: "bg-cyan-300/10",
    focus: "focus-visible:outline-cyan-300",
  },
  violet: {
    text: "text-violet-300",
    hover: "hover:text-violet-300",
    glow: "bg-violet-300/10",
    focus: "focus-visible:outline-violet-300",
  },
  emerald: {
    text: "text-emerald-300",
    hover: "hover:text-emerald-300",
    glow: "bg-emerald-300/10",
    focus: "focus-visible:outline-emerald-300",
  },
  amber: {
    text: "text-amber-300",
    hover: "hover:text-amber-300",
    glow: "bg-amber-300/10",
    focus: "focus-visible:outline-amber-300",
  },
  pink: {
    text: "text-pink-300",
    hover: "hover:text-pink-300",
    glow: "bg-pink-300/10",
    focus: "focus-visible:outline-pink-300",
  },
  rose: {
    text: "text-rose-300",
    hover: "hover:text-rose-300",
    glow: "bg-rose-300/10",
    focus: "focus-visible:outline-rose-300",
  },
};

export function TestPageShell({
  accent,
  children,
}: {
  accent: TestAccent;
  children: ReactNode;
}) {
  const styles = accentStyles[accent];

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-8 text-white sm:px-8 sm:py-12">
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed left-1/2 top-0 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full blur-3xl ${styles.glow}`}
      />
      <div className="relative mx-auto max-w-6xl">
        <Link
          to="/"
          className={`inline-flex min-h-11 items-center text-sm font-semibold text-slate-400 transition focus-visible:outline-2 focus-visible:outline-offset-4 ${styles.hover} ${styles.focus}`}
        >
          ← All tests
        </Link>
        {children}
      </div>
    </main>
  );
}

export function TestSetupLayout({
  accent,
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  accent: TestAccent;
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid min-h-[68svh] items-center gap-10 py-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
      <header>
        <p
          className={`font-mono text-sm font-semibold uppercase tracking-[0.3em] ${accentStyles[accent].text}`}
        >
          {eyebrow}
        </p>
        <h1 className="mt-5 max-w-3xl text-balance text-5xl font-black tracking-tight sm:text-7xl">
          {title}
        </h1>
        <div className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-slate-300">
          {description}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">{actions}</div>
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function TestPanel({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/30 sm:p-8 ${className}`}
    >
      <h2 className="text-xl font-bold">{title}</h2>
      {description && (
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      )}
      <div className="mt-7">{children}</div>
    </div>
  );
}

export function InstructionList({
  accent,
  items,
}: {
  accent: TestAccent;
  items: Array<{ title: string; description: string }>;
}) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <li
          key={item.title}
          className="flex gap-3 rounded-2xl border border-white/5 bg-slate-950/60 p-4"
        >
          <span
            className={`font-mono text-sm font-bold ${accentStyles[accent].text}`}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="font-semibold text-slate-100">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {item.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
