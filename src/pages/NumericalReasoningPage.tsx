import { useCallback, useEffect, useId, useRef, useState } from "react";
import { GuidedDemoModal } from "../components/GuidedDemoModal";
import { practicePrimary, practiceSecondary } from "../components/ReasoningPractice";
import { InstructionList, TestPageShell, TestPanel, TestSetupLayout } from "../components/TestPage";
import { ValidatedNumberInput } from "../components/ValidatedNumberInput";
import { useTestRoute } from "../hooks/useTestRoute";
import { createLocalId } from "../lib/create-local-id";
import { createNumericalData, createNumericalQuestion, isNumericalAnswer, isNumericalData, isNumericalQuestion, numericalAnswer, numericalExplanation, NUMERICAL_COMPANIES } from "../lib/numerical-reasoning";
import type { NumericalAnswer, NumericalData, NumericalLevel, NumericalQuestion, NumericalCompanyId } from "../lib/numerical-reasoning";

type Session = { id: string; completedAt: string; durationSeconds: number; timed: boolean; level: NumericalLevel; data: NumericalData; questions: NumericalQuestion[]; answers: (NumericalAnswer | null)[] };
const STORAGE = "psy-numerical-reasoning-sessions";
const field = "mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-white";
const label = (answer: NumericalAnswer | null) => answer === "cannot-say" ? "Cannot say" : answer === null ? "Unanswered" : answer === "true" ? "True" : "False";
function readHistory(): Session[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((s): s is Session => s && typeof s.id === "string" && Number.isFinite(Date.parse(s.completedAt)) && Number.isFinite(s.durationSeconds) && s.durationSeconds >= 0 && typeof s.timed === "boolean" && ["adaptive", "easy", "hard"].includes(s.level) && isNumericalData(s.data) && Array.isArray(s.questions) && s.questions.length > 0 && s.questions.length <= 100 && s.questions.every((q: unknown) => isNumericalQuestion(s.data, q)) && Array.isArray(s.answers) && s.answers.length === s.questions.length && s.answers.every((a: unknown) => a === null || isNumericalAnswer(a))).slice(0, 100);
  } catch { return []; }
}
function DataExplorer({ data, initialTab = 0 }: { data: NumericalData; initialTab?: number }) {
  const instance = useId();
  const [tab, setTab] = useState(initialTab);
  const [chart, setChart] = useState([3, 4].includes(initialTab));
  const [search, setSearch] = useState("");
  const [hidden, setHidden] = useState<string[]>([]);
  const current = data.tabs[tab];
  const rows = current.rows.filter(row => row.label.toLowerCase().includes(search.trim().toLowerCase()));
  const visible = rows.filter(row => !hidden.includes(row.label));
  const colors = ["#6ee7b7", "#67e8f9", "#fbbf24", "#fda4af", "#c4b5fd", "#fdba74", "#a3e635", "#38bdf8", "#e879f9", "#f87171", "#2dd4bf", "#e2e8f0"];
  const maximum = Math.ceil(Math.max(1, ...visible.flatMap(row => row.values)) / 5) * 5;
  const x = (index: number) => 65 + index * 125;
  const y = (value: number) => 235 - value / maximum * 195;
  const changeTab = (next: number) => { setTab(next); setChart([3, 4].includes(next)); setSearch(""); setHidden([]); };
  return <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6" aria-label="Company data">
    {data.company && <header className="mb-5 border-b border-white/10 pb-4"><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-bold text-emerald-200">{data.company.name}</h2><span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-400">Fictional company · {data.company.sector}</span></div><p className="mt-2 text-sm leading-6 text-slate-400">{data.company.description}</p></header>}
    <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Data categories">{data.tabs.map((item, index) => <button key={item.label} type="button" role="tab" id={`${instance}-tab-${index}`} aria-controls={instance + "-panel"} aria-selected={tab === index} tabIndex={tab === index ? 0 : -1} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${tab === index ? "bg-emerald-300 text-slate-950" : "border border-white/15 hover:bg-white/10"}`} onClick={() => changeTab(index)} onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? 5 : (tab + (event.key === "ArrowRight" ? 1 : 5)) % 6; changeTab(next); document.getElementById(`${instance}-tab-${next}`)?.focus(); } }}>{item.label}</button>)}</div>
    <div id={instance + "-panel"} role="tabpanel" aria-labelledby={`${instance}-tab-${tab}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">{current.label} <span className="font-normal text-slate-400">· {current.unit}</span></h3>{current.rows.length > 0 && <button type="button" className="min-h-11 rounded-xl border border-white/15 px-4 text-sm" onClick={() => setChart(value => !value)}>{chart ? "Show data table" : "Show chart"}</button>}</div>
      {current.rows.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-3"><label className="flex items-center gap-3 text-sm text-slate-300" htmlFor={instance + "-search"}>Find a row<input id={instance + "-search"} type="search" className="min-h-11 w-48 rounded-xl border border-white/15 bg-slate-950 px-3 text-white" value={search} onChange={event => setSearch(event.target.value)} placeholder="Row name…" /></label><span className="text-xs text-slate-500">{rows.length} of {current.rows.length} rows · {data.years[0]}–{data.years[4]}</span>{search && <button type="button" className="min-h-11 px-3 text-sm underline" onClick={() => setSearch("")}>Show all rows</button>}</div>}
      {rows.length === 0 && current.rows.length > 0 ? <p role="status" className="py-8 text-slate-400">No matching rows. Clear the search to see the full dataset.</p> : chart && current.rows.length > 0 ? <div>
        <svg viewBox="0 0 620 280" className="max-h-80 w-full" role="img" aria-label={`${current.label} trend chart, ${current.unit}. Exact values are available with Show data table.`}>
          {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1={55} x2={580} y1={y(maximum * i / 4)} y2={y(maximum * i / 4)} stroke="#334155" /><text x={45} y={y(maximum * i / 4) + 4} textAnchor="end" fill="#cbd5e1" fontSize={12}>{(maximum * i / 4).toLocaleString("en-GB", { notation: "compact", maximumFractionDigits: 1 })}{current.unit === "%" ? "%" : ""}</text></g>)}
          {data.years.map((year, index) => <text key={year} x={x(index)} y={262} textAnchor="middle" fill="#cbd5e1" fontSize={14}>{year}</text>)}
          {visible.map(row => { const i = current.rows.indexOf(row); return <g key={row.label}><polyline points={row.values.map((value, j) => `${x(j)},${y(value)}`).join(" ")} fill="none" stroke={colors[i]} strokeDasharray={i % 3 === 0 ? undefined : i % 3 === 1 ? "9 4" : "3 3"} strokeWidth={2.5} />{row.values.map((value, j) => <g key={j}><circle cx={x(j)} cy={y(value)} r={4} fill={colors[i]} /><title>{row.label}, {data.years[j]}: {value} {current.unit}</title></g>)}</g>; })}
        </svg><p className="mb-2 text-center text-xs text-slate-400">Toggle series to compare trends. Use the table for exact figures.</p><div className="flex flex-wrap justify-center gap-2">{rows.map(row => <button type="button" key={row.label} aria-pressed={!hidden.includes(row.label)} className={`min-h-11 rounded-xl border border-white/15 px-3 text-sm ${hidden.includes(row.label) ? "opacity-40 line-through" : "bg-white/5"}`} style={{ color: colors[current.rows.indexOf(row)] }} onClick={() => setHidden(values => values.includes(row.label) ? values.filter(value => value !== row.label) : [...values, row.label])}>{row.label}</button>)}</div>{visible.length === 0 && <p role="status" className="mt-3 text-center text-sm text-slate-400">All series are hidden. Select a series to display it.</p>}
      </div> : current.rows.length > 0 ? <div className="max-h-80 overflow-auto rounded-xl border border-white/10"><table className="w-full min-w-[34rem] border-collapse text-right font-mono text-sm"><caption className="sr-only">{current.label}, {current.unit}, annual figures</caption><thead className="sticky top-0 z-10 bg-slate-900"><tr className="border-b border-white/20"><th scope="col" className="p-3 text-left">Financial year</th>{data.years.map(year => <th key={year} scope="col" className="p-3">{year}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.label} className="border-b border-white/10 hover:bg-white/5"><th scope="row" className="p-3 text-left font-sans font-medium">{row.label}</th>{row.values.map((value, index) => <td key={index} className="p-3">{value.toLocaleString("en-GB", { maximumFractionDigits: 1 })}</td>)}</tr>)}</tbody></table></div> : <p className="my-8 leading-7">Management intends to expand next year. No numerical forecast is available.</p>}
      <p className="mt-4 text-sm leading-6 text-slate-400">{current.note}</p>
    </div>
  </section>;
}
function Choices({ value, choose }: { value: NumericalAnswer | null; choose: (answer: NumericalAnswer) => void }) {
  return <div className="mt-5 grid gap-3 sm:grid-cols-3">{(["true", "false", "cannot-say"] as const).map(answer => <button key={answer} type="button" aria-pressed={answer === value} className={answer === value ? practicePrimary : practiceSecondary} onClick={() => choose(answer)}>{label(answer)}</button>)}</div>;
}
const demoData = createNumericalData((() => { let seed = 19472; return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; }; })());
const demoQuestion = createNumericalQuestion(demoData, 0, "easy", () => 0.42);
function DemoPractice() {
  const [answer, setAnswer] = useState<NumericalAnswer | null>(null);
  return <div className="w-full"><DataExplorer data={demoData} /><p className="mt-5 text-lg font-semibold">{demoQuestion.statement}</p><Choices value={answer} choose={setAnswer} />{answer && <p role="status" className={`mt-4 leading-6 ${answer === numericalAnswer(demoData, demoQuestion) ? "text-emerald-300" : "text-rose-300"}`}>{answer === numericalAnswer(demoData, demoQuestion) ? "Correct. " : "Try again. "}{numericalExplanation(demoData, demoQuestion)}</p>}</div>;
}
function NumericalDemo() {
  return <GuidedDemoModal title="Numerical reasoning walkthrough" theme="emerald" introduction="Use only the information supplied. You can move between questions and revise every answer before finishing." steps={[
    { title: "Find the relevant data", description: "Switch between Income, Costs, Employees, Market share, Return on equity, and Outlook. Check the company, year, and unit. Search for rows, switch any table to a chart, and toggle series to compare trends.", visual: <div className="w-full"><DataExplorer data={demoData} /></div> },
    { title: "Separate false from unknown", description: "True means the data establish the statement. False means the data contradict it. Cannot say means necessary information is missing; do not assume a trend continues or mistake an intention for a forecast.", visual: <div className="w-full rounded-2xl border border-white/15 p-6"><p className="text-lg">Revenue will rise next year.</p><p className="mt-4 text-emerald-300">Cannot say: the Outlook provides no numerical forecast.</p></div> },
    { title: "Try a statement", description: "Choose an answer to see the calculation. In the real test, correctness is revealed only in results. Answers stay marked so you can revisit them using Previous, Next, or the question overview.", visual: <DemoPractice /> },
  ]} />;
}
function Summary({ session }: { session: Session }) {
  const answered = session.answers.filter(answer => answer !== null).length;
  const correct = session.questions.filter((q, index) => session.answers[index] === numericalAnswer(session.data, q)).length;
  return <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5"><p className="font-mono text-xl font-bold text-emerald-300">{correct} / {session.questions.length} correct</p><p className="mt-2 text-sm text-slate-300">{answered} answered · {session.questions.length - answered} unanswered · {answered ? Math.round(correct / answered * 100) : 0}% accuracy on answered questions · {session.durationSeconds.toFixed(1)} s · {session.timed ? "timed" : "untimed"} · {session.level}</p></div>;
}
function Review({ session }: { session: Session }) {
  return <div className="mt-6 space-y-4">{session.questions.map((question, index) => <details key={index} className="rounded-2xl border border-white/10 bg-white/5 p-5"><summary className="cursor-pointer font-semibold">Question {index + 1} · {session.answers[index] === null ? "Unanswered" : session.answers[index] === numericalAnswer(session.data, question) ? "Correct" : "Incorrect"}</summary><p className="mt-4 text-lg">{question.statement}</p><p className="mt-3 text-sm text-slate-300">Your answer: {label(session.answers[index])}. Expected: {label(numericalAnswer(session.data, question))}.</p><p className="mt-3 leading-7 text-emerald-200">{numericalExplanation(session.data, question)}</p></details>)}</div>;
}
export default function NumericalReasoningPage() {
  const [view, setView] = useState<"setup" | "test" | "result">("setup");
  const [timed, setTimed] = useState(true);
  const [level, setLevel] = useState<NumericalLevel>("adaptive");
  const [minutes, setMinutes] = useState(12);
  const [count, setCount] = useState(47);
  const [companySelection, setCompanySelection] = useState<NumericalCompanyId | "random">("random");
  const [data, setData] = useState<NumericalData | null>(null);
  const [questions, setQuestions] = useState<NumericalQuestion[]>([]);
  const [answers, setAnswers] = useState<(NumericalAnswer | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [overview, setOverview] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState(readHistory);
  const [storageError, setStorageError] = useState(false);
  const active = useRef(false), started = useRef(0), deadline = useRef(Infinity);
  const answersRef = useRef<(NumericalAnswer | null)[]>([]);
  const cancel = useCallback(() => { active.current = false; setView("setup"); }, []);
  const { beginTestRoute, completeTestRoute, returnToSetupRoute } = useTestRoute({ basePath: "/numerical-reasoning", view, onReturnToSetup: cancel });
  const finish = useCallback(() => {
    if (!active.current || !data) return;
    active.current = false;
    const saved: Session = { id: createLocalId(), completedAt: new Date().toISOString(), durationSeconds: (Math.min(performance.now(), deadline.current) - started.current) / 1000, timed, level, data, questions, answers: [...answersRef.current] };
    const updated = [saved, ...history].slice(0, 100);
    try { localStorage.setItem(STORAGE, JSON.stringify(updated)); setStorageError(false); } catch { setStorageError(true); }
    setHistory(updated); setSession(saved); setView("result"); completeTestRoute();
  }, [data, timed, level, questions, history, completeTestRoute]);
  useEffect(() => {
    if (view !== "test" || !timed) return;
    const timer = window.setInterval(() => { const left = Math.max(0, deadline.current - performance.now()); setRemaining(Math.ceil(left / 1000)); if (!left) finish(); }, 200);
    return () => window.clearInterval(timer);
  }, [view, timed, finish]);
  const start = () => {
    const generated = createNumericalData(Math.random, companySelection === "random" ? undefined : companySelection);
    const tasks = Array.from({ length: count }, (_, i) => createNumericalQuestion(generated, i, level));
    const now = performance.now(); started.current = now; deadline.current = timed ? now + minutes * 60_000 : Infinity; active.current = true;
    answersRef.current = tasks.map(() => null); setAnswers([...answersRef.current]); setData(generated); setQuestions(tasks); setIndex(0); setOverview(false); setSession(null); setRemaining(minutes * 60); setView("test"); beginTestRoute();
  };
  const choose = (answer: NumericalAnswer | null) => {
    if (!active.current) return;
    if (performance.now() >= deadline.current) { finish(); return; }
    const updated = [...answersRef.current]; updated[index] = answer; answersRef.current = updated; setAnswers(updated);
  };
  if (view === "test" && data) return <main className="min-h-dvh bg-slate-950 px-4 py-6 text-white"><div className="mx-auto max-w-5xl">
    <header className="mb-6 flex justify-between gap-4"><div><p className="font-mono text-sm text-emerald-300">Question {index + 1} of {questions.length} · {["Direct comparisons", "Percentages and trends", "Cross-tab calculations"][questions[index].difficulty]}</p><h1 className="mt-2 text-2xl font-bold">Numerical reasoning</h1></div>{timed && <p role="timer" aria-label="Time remaining" className="font-mono text-2xl">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>}</header>
    <DataExplorer data={data} />
    <section className="mt-5 rounded-2xl border border-white/15 p-5"><h2 className="text-lg font-semibold leading-7">{questions[index].statement}</h2><Choices value={answers[index]} choose={choose} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm text-slate-400">{answers[index] === null ? "Not answered yet." : `Saved: ${label(answers[index])}. You can revise this answer.`}</p><button type="button" className="min-h-11 px-3 text-sm text-slate-300 underline" disabled={answers[index] === null} onClick={() => choose(null)}>Clear answer</button></div></section>
    <nav aria-label="Question navigation" className="mt-5 flex flex-wrap justify-between gap-3"><button type="button" className={practiceSecondary} disabled={index === 0} onClick={() => setIndex(i => i - 1)}>Previous</button><button type="button" className={practiceSecondary} aria-expanded={overview} onClick={() => setOverview(value => !value)}>Question overview · {answers.filter(a => a !== null).length}/{questions.length}</button><button type="button" className={practiceSecondary} disabled={index === questions.length - 1} onClick={() => setIndex(i => i + 1)}>Next</button></nav>
    {overview && <section aria-label="Question overview" className="mt-5 rounded-2xl border border-white/15 p-5"><p className="mb-4 text-sm text-slate-400">Filled buttons are answered. An outline marks your current question.</p><div className="grid grid-cols-5 gap-2 sm:grid-cols-10">{questions.map((_, i) => <button key={i} type="button" aria-label={`Question ${i + 1}, ${answers[i] === null ? "unanswered" : "answered"}`} aria-current={i === index ? "step" : undefined} className={`min-h-11 rounded-lg border ${answers[i] === null ? "border-white/15" : "border-emerald-300/20 bg-emerald-300/20 text-emerald-200"} ${index === i ? "outline-2 outline-offset-2 outline-white" : ""}`} onClick={() => { setIndex(i); setOverview(false); }}>{i + 1}</button>)}</div></section>}
    <footer className="mt-8 flex justify-between gap-3"><button type="button" className={practiceSecondary} onClick={returnToSetupRoute}>Cancel session</button><button type="button" className={practicePrimary} onClick={finish}>Finish session</button></footer>
  </div></main>;
  return <TestPageShell accent="emerald">{view === "setup" ? <TestSetupLayout accent="emerald" eyebrow="Numerical reasoning" title="Find the facts behind the figures." description="Explore a manufacturing, software, retail, or energy business through detailed tables and interactive charts. Fresh figures and statements in every session, with 47 revisitable questions and a 12-minute default." actions={<><button type="button" className={practicePrimary} onClick={start}>Start test</button><NumericalDemo /></>}><div className="space-y-4"><TestPanel title="Test settings">
    <label className="block text-sm font-semibold">Company scenario<select className={field} value={companySelection} onChange={event => setCompanySelection(event.target.value as NumericalCompanyId | "random")}><option value="random">Random company · any of four sectors</option>{NUMERICAL_COMPANIES.map(company => <option key={company.id} value={company.id}>{company.name} · {company.sector}</option>)}</select></label><p className="mt-2 text-xs leading-5 text-slate-500">Each business has its own product lines, departments, costs, investment plans, and sector peers. Every start generates fresh five-year data.</p>
    <label className="mt-5 block text-sm font-semibold">Practice mode<select className={field} value={timed ? "timed" : "untimed"} onChange={event => setTimed(event.target.value === "timed")}><option value="timed">Timed</option><option value="untimed">Untimed</option></select></label>
    <label className="mt-5 block text-sm font-semibold">Difficulty<select className={field} value={level} onChange={event => setLevel(event.target.value as NumericalLevel)}><option value="adaptive">Adaptive</option><option value="easy">Easy · direct comparisons</option><option value="hard">Hard · percentages and cross-tab calculations</option></select></label><p className="mt-2 text-xs leading-5 text-slate-500">Adaptive starts with direct comparisons, adds percentages and averages after question 12, and combined ratios and growth comparisons after question 24. Unknown statements appear at every level. Hard mode starts with percentages.</p>
    <label className="mt-5 block text-sm font-semibold">Number of questions<ValidatedNumberInput value={count} min={1} max={100} normalize={Math.round} onValueChange={setCount} className={field} /></label>{timed && <label className="mt-5 block text-sm font-semibold">Test length (minutes)<ValidatedNumberInput value={minutes} min={1} max={30} normalize={Math.round} onValueChange={setMinutes} className={field} /></label>}
  </TestPanel><TestPanel title="Instructions"><InstructionList accent="emerald" items={[
    { title: "Use the correct tab and unit", description: "Inspect six detailed data categories. Search by row name, switch between tables and charts, and toggle chart series. Monetary figures are in thousands of euros; Outlook figures are approved historical investment budgets. A calculator and scratch paper are allowed." },
    { title: "True, False, or Cannot say", description: "True is supported by the supplied data; False is contradicted. Choose Cannot say when information is missing. Do not add assumptions about causes, future years, or market sizes." },
    { title: "Move freely and revise", description: "Choose an answer, then use Previous, Next, or the numbered overview. Answers remain editable until you finish or the timer expires. Clear answer removes a selection." },
    { title: "Review the calculations", description: "Results include every statement, your final answer, the expected answer, relevant data references, and the calculation. Unanswered questions are shown separately." },
  ]} /></TestPanel></div></TestSetupLayout> : session && <section className="py-10"><p className="font-mono text-sm uppercase tracking-widest text-emerald-300">Session complete</p><h1 className="mt-4 text-4xl font-black">Numerical reasoning results</h1><Summary session={session} /><button type="button" className={`${practicePrimary} mt-6`} onClick={returnToSetupRoute}>Change settings</button><div className="mt-6"><DataExplorer data={session.data} /></div><Review session={session} /></section>}
    <section className="border-t border-white/10 py-10"><h2 className="text-2xl font-bold">Numerical reasoning history</h2><p className="mt-2 text-sm text-slate-500">Saved on this device · up to 100 sessions</p>{storageError && <p role="status" className="mt-3 text-amber-300">Browser storage is unavailable. This result is available until you leave the page.</p>}{history.length === 0 ? <p className="mt-6 text-slate-400">Complete a session to see your results here.</p> : history.map(saved => <details key={saved.id} className="mt-4 rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer">{new Date(saved.completedAt).toLocaleString()} · {saved.data.company?.name ?? "Company data"} · {saved.questions.length} questions</summary><Summary session={saved} /><div className="mt-6"><DataExplorer data={saved.data} /></div><Review session={saved} /></details>)}</section>
  </TestPageShell>;
}
