export type NumericalAnswer = "true" | "false" | "cannot-say";
export type NumericalLevel = "adaptive" | "easy" | "hard";
export type DataTab = { label: string; unit: string; note: string; rows: { label: string; values: number[] }[] };
export type NumericalData = { company?: { id: string; name: string; sector: string; description: string; strategy: string }; years: number[]; tabs: DataTab[] };
export type Cell = { tab: number; row: number; year: number };
export type Formula = { kind: "value" | "sum" | "difference" | "growth" | "percentage" | "perEmployee" | "peak" | "average" | "combinedPercentage" | "growthDifference" | "sumPercentage"; cells: Cell[] };
export type NumericalQuestion = { statement: string; formula: Formula | null; comparison: "gt" | "lt" | "eq"; threshold: number; missing: string; difficulty: number };
const pick = (max: number, random: () => number) => Math.floor(random() * max);
export const numericalDifficulty = (index: number, level: NumericalLevel) => level === "easy" ? 0 : Math.min(2, (level === "hard" ? 1 : 0) + Math.floor(index / 12));
export const NUMERICAL_COMPANIES = [
  { id: "manufacturing", name: "Northstar Engineering", sector: "Industrial manufacturing", description: "Builds industrial equipment and components for international customers.", products: ["Pumps", "Turbines", "Control systems", "Industrial motors", "Spare parts", "Service contracts"], departments: ["Manufacturing", "Sales", "Administration", "Engineering", "Logistics", "Quality assurance"], costs: ["Personnel", "Raw materials", "Factory operations", "Energy", "Distribution", "Research", "Marketing", "Other costs"], budgets: ["Factory upgrades", "Automation", "Product development", "Staff training", "Export expansion", "Energy efficiency"], peers: ["Meridian Industries", "Harbor Machinery", "Atlas Components", "Summit Systems", "Pioneer Works"], strategy: "Management intends to expand its export business.", revenue: 85000, employees: 1400 },
  { id: "software", name: "Cloudbridge Software", sector: "Software and digital services", description: "Sells subscription software, cloud hosting, and specialist digital services.", products: ["Business subscriptions", "Cloud hosting", "Cybersecurity", "Data analytics", "Consulting", "Support contracts"], departments: ["Development", "Sales", "Administration", "Customer support", "Infrastructure", "Security"], costs: ["Personnel", "Cloud infrastructure", "Software licences", "Customer support", "Sales commissions", "Research", "Marketing", "Other costs"], budgets: ["Platform development", "Data centres", "Security upgrades", "Staff training", "International expansion", "Customer onboarding"], peers: ["Aster Digital", "Vertex Cloud", "Lumen Analytics", "Oakline Systems", "Signal Software"], strategy: "Management intends to launch new subscription products.", revenue: 48000, employees: 650 },
  { id: "retail", name: "Willow Retail Group", sector: "Retail and e-commerce", description: "Operates shops and an online marketplace across six product categories.", products: ["Groceries", "Homeware", "Clothing", "Electronics", "Beauty products", "Outdoor products"], departments: ["Store operations", "Sales", "Administration", "Warehousing", "E-commerce", "Purchasing"], costs: ["Personnel", "Purchased stock", "Store rents", "Distribution", "Payment processing", "IT services", "Marketing", "Other costs"], budgets: ["New stores", "Store refurbishment", "Online platform", "Staff training", "Warehouse expansion", "Delivery systems"], peers: ["Juniper Stores", "Meadow Market", "Cedar Commerce", "Amber Retail", "Brookside Shops"], strategy: "Management intends to open additional stores.", revenue: 180000, employees: 3200 },
  { id: "energy", name: "Solstice Energy", sector: "Renewable energy", description: "Develops renewable generation projects and sells energy, storage, and maintenance services.", products: ["Solar power", "Wind power", "Battery storage", "Grid services", "Maintenance", "Project development"], departments: ["Plant operations", "Sales", "Administration", "Project engineering", "Maintenance", "Environmental compliance"], costs: ["Personnel", "Equipment", "Plant operations", "Grid connection", "Maintenance", "Project research", "Marketing", "Other costs"], budgets: ["Solar projects", "Wind projects", "Battery capacity", "Staff training", "Grid upgrades", "Environmental protection"], peers: ["Aurora Renewables", "Crest Power", "Helios Generation", "Terra Energy", "Bluepeak Storage"], strategy: "Management intends to develop additional generation sites.", revenue: 125000, employees: 900 },
] as const;
export type NumericalCompanyId = typeof NUMERICAL_COMPANIES[number]["id"];
export function createNumericalData(random = Math.random, companyId?: NumericalCompanyId): NumericalData {
  const profile = NUMERICAL_COMPANIES.find(company => company.id === companyId) ?? NUMERICAL_COMPANIES[pick(NUMERICAL_COMPANIES.length, random)];
  const row = (label: string, values: number[]) => ({ label, values });
  // Year-to-year trends vary, while all accounting subtotals reconcile exactly.
  const trend = (base: number, volatility = 0.18) => {
    let value = base * (0.85 + random() * 0.3);
    return Array.from({ length: 5 }, () => { value *= 1 + (random() - 0.4) * volatility; return Math.max(10, Math.round(value / 10) * 10); });
  };
  const split = (totals: number[], count: number) => {
    const weights = Array.from({ length: count }, () => 0.5 + random() * 2);
    const series = weights.map(() => [] as number[]);
    totals.forEach(total => {
      const annualWeights = weights.map(weight => weight * (0.85 + random() * 0.3));
      const annualTotal = annualWeights.reduce((a, b) => a + b, 0);
      let left = total;
      weights.forEach((_, i) => { const value = i === count - 1 ? left : Math.floor(total * annualWeights[i] / annualTotal); series[i].push(value); left -= value; });
    });
    return series;
  };
  const revenue = trend(profile.revenue);
  const costs = revenue.map(value => Math.round(value * (0.55 + random() * 0.25) / 10) * 10);
  const profit = revenue.map((value, i) => value - costs[i]);
  const interest = profit.map(value => Math.round(value * (0.02 + random() * 0.08)));
  const tax = profit.map((value, i) => Math.round((value - interest[i]) * 0.2));
  const employees = trend(profile.employees, 0.12);
  const costParts = split(costs, 8), departments = split(employees, 6), divisions = split(revenue, 6);
  const rateSeries = () => { let rate = 5 + random() * 20; return Array.from({ length: 5 }, () => { rate = Math.max(1, Math.min(42, rate + (random() - 0.5) * 8)); return Math.round(rate * 10) / 10; }); };
  const finalYear = 2023 + pick(3, random);
  return { company: { id: profile.id, name: profile.name, sector: profile.sector, description: profile.description, strategy: profile.strategy }, years: Array.from({ length: 5 }, (_, i) => finalYear - 4 + i), tabs: [
    { label: "Income", unit: "€ thousand", note: "Global product-line revenue totals reconcile to Revenue. Operating profit = Revenue − Total costs. Net profit = Operating profit − Interest − Tax.", rows: [row("Revenue", revenue), row("Total costs", costs), row("Operating profit", profit), ...profile.products.map((label, i) => row(label + " revenue", divisions[i])), row("Interest", interest), row("Tax", tax), row("Net profit", profit.map((value, i) => value - interest[i] - tax[i]))] },
    { label: "Costs", unit: "€ thousand", note: "These eight annual expense categories together make up Total costs in the Income tab.", rows: profile.costs.map((label, i) => row(label, costParts[i])) },
    { label: "Employees", unit: "people", note: "Annual average headcount. All six departments together make up Total employees.", rows: [row("Total employees", employees), ...profile.departments.map((label, i) => row(label, departments[i]))] },
    { label: "Market share", unit: "%", note: "Share of each domestic product market held by this company. Income shows global revenue; domestic product revenues and total domestic market sizes are not supplied. These separate market shares cannot be added to calculate overall share.", rows: profile.products.map(label => row(label, rateSeries())) },
    { label: "Return on equity", unit: "%", note: "Annual return on equity for the sample company and five sector peers. Equity amounts and peer profits are not supplied.", rows: [profile.name, ...profile.peers].map(label => row(label, rateSeries())) },
    { label: "Outlook", unit: "€ thousand", note: `${profile.strategy} The table reports historical approved investment budgets, not actual spending. No next-year revenue forecast, quarterly breakdown, exchange rate, or explanation of changes is provided.`, rows: profile.budgets.map(label => row(label, trend(profile.revenue * (0.006 + random() * 0.02), 0.35))) },
  ] };
}
export function numericalValue(data: NumericalData, formula: Formula): number {
  const values = formula.cells.map(cell => data.tabs[cell.tab].rows[cell.row].values[cell.year]);
  switch (formula.kind) {
    case "value": return values[0];
    case "sum": return values.reduce((sum, value) => sum + value, 0);
    case "average": return (values[0] + values[1]) / 2;
    case "combinedPercentage": return (values[0] + values[1]) / (values[2] + values[3]) * 100;
    case "sumPercentage": return (values[0] + values[1]) / values[2] * 100;
    case "growthDifference": return (values[1] - values[0]) / values[0] * 100 - (values[3] - values[2]) / values[2] * 100;
    case "difference": return values[0] - values[1];
    case "growth": return (values[1] - values[0]) / values[0] * 100;
    case "percentage": return values[0] / values[1] * 100;
    case "perEmployee": return values[0] * 1000 / values[1];
    case "peak": return data.years[formula.cells[values.indexOf(Math.max(...values))].year];
  }
}
export function numericalAnswer(data: NumericalData, question: NumericalQuestion): NumericalAnswer {
  if (!question.formula) return "cannot-say";
  const value = numericalValue(data, question.formula);
  return (question.comparison === "gt" ? value > question.threshold : question.comparison === "lt" ? value < question.threshold : Math.abs(value - question.threshold) < 1e-8) ? "true" : "false";
}
const number = (value: number) => Number(value.toFixed(2)).toLocaleString("en-GB");
export function numericalExplanation(data: NumericalData, question: NumericalQuestion): string {
  if (!question.formula) return `${question.missing} The statement is neither established nor contradicted by the supplied data: Cannot say.`;
  const f = question.formula;
  const values = f.cells.map(cell => data.tabs[cell.tab].rows[cell.row].values[cell.year]);
  const references = f.cells.map((cell, i) => `${data.tabs[cell.tab].label} → ${data.tabs[cell.tab].rows[cell.row].label}, ${data.years[cell.year]}: ${number(values[i])} ${data.tabs[cell.tab].unit}`);
  const result = numericalValue(data, f);
  const calculation = f.kind === "growth" ? `(${number(values[1])} − ${number(values[0])}) ÷ ${number(values[0])} × 100` :
    f.kind === "percentage" ? `${number(values[0])} ÷ ${number(values[1])} × 100` :
    f.kind === "perEmployee" ? `${number(values[0])} × 1,000 ÷ ${number(values[1])}` :
    f.kind === "difference" ? `${number(values[0])} − ${number(values[1])}` :
    f.kind === "average" ? `(${number(values[0])} + ${number(values[1])}) ÷ 2` :
    f.kind === "combinedPercentage" ? `(${number(values[0])} + ${number(values[1])}) ÷ (${number(values[2])} + ${number(values[3])}) × 100` :
    f.kind === "sumPercentage" ? `(${number(values[0])} + ${number(values[1])}) ÷ ${number(values[2])} × 100` :
    f.kind === "growthDifference" ? `[(${number(values[1])} − ${number(values[0])}) ÷ ${number(values[0])} × 100] − [(${number(values[3])} − ${number(values[2])}) ÷ ${number(values[2])} × 100]` :
    f.kind === "sum" ? values.map(number).join(" + ") : f.kind === "peak" ? "Year of the maximum" : "Reported value";
  return `${references.join("; ")}. ${calculation} = ${number(result)}${["growth", "percentage", "combinedPercentage", "sumPercentage"].includes(f.kind) ? "%" : f.kind === "growthDifference" ? " percentage points" : ""}. Compare the unrounded result with ${number(question.threshold)}: ${numericalAnswer(data, question) === "true" ? "the statement holds" : "the statement does not hold"}.`;
}
export function createNumericalQuestion(data: NumericalData, index: number, level: NumericalLevel = "adaptive", random = Math.random): NumericalQuestion {
  const difficulty = numericalDifficulty(index, level);
  const year = pick(5, random), other = (year + 1 + pick(4, random)) % 5;
  const first = Math.min(year, other), last = Math.max(year, other);
  const cell = (tab: number, row: number, y = year): Cell => ({ tab, row, year: y });
  const expanded = !!data.company;
  const product = pick(data.tabs[3].rows.length, random);
  const peer = pick(data.tabs[4].rows.length, random);
  const nextYear = data.years[4] + 1;
  if (random() < 0.3) {
    const unknown = [
      [`Revenue will be higher in ${nextYear} than in ${data.years[4]}.`, "Management's intentions and historical investment budgets do not establish next year's revenue."],
      [`More than half of ${data.years[year]} revenue was earned in the first six months.`, "Annual totals do not reveal revenue within the year."],
      [`The change in personnel costs between ${data.years[first]} and ${data.years[last]} was caused by pay rises.`, "Costs and headcount do not establish the cause of a change."],
      [`The total domestic market for ${data.tabs[3].rows[product].label} was larger than the domestic market for ${data.tabs[3].rows[(product + 1) % data.tabs[3].rows.length].label} in ${data.years[year]}.`, "Domestic market-share percentages cannot establish market sizes without domestic product revenue. Global product revenue does not supply that missing breakdown."],
      [`${data.tabs[4].rows[0].label} earned more net profit than ${data.tabs[4].rows[1].label} in ${data.years[year]}.`, "Peer profits and equity amounts are not supplied. Return on equity alone cannot establish which company earned more profit."],
      [`Revenue in ${data.years[year]} exceeded 25 million US dollars.`, "Euro figures cannot be converted to dollars without an exchange rate."],
      ...(expanded ? [[`Actual spending on ${data.tabs[5].rows[product].label} was within its approved budget in ${data.years[year]}.`, "Approved investment budgets are provided, but actual investment spending is not."]] : []),
    ];
    const chosen = unknown[pick(unknown.length, random)];
    return { statement: chosen[0], formula: null, comparison: "eq", threshold: 0, missing: chosen[1], difficulty };
  }
  let formula: Formula, description: string, unit = "";
  const pools = difficulty === 0 ? [0, 1, 2, 8, 9, 10, 11] : difficulty === 1 ? [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 15, 16, 18] : [3, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18];
  const kind = expanded ? pools[pick(pools.length, random)] : pick(difficulty === 0 ? 3 : difficulty === 1 ? 6 : 8, random);
  const cost = pick(data.tabs[1].rows.length, random);
  const department = 1 + pick(data.tabs[2].rows.length - 1, random);
  const anotherDepartment = 1 + (department % (data.tabs[2].rows.length - 1));
  const metricLabel = (tab: number, row: number) => data.tabs[tab].rows[row].label;
  if (kind === 0) {
    const income = expanded ? [0, 2, 9, 10, 11][pick(5, random)] : 0;
    formula = { kind: "value", cells: [cell(0, income)] }; description = `${metricLabel(0, income)} in ${data.years[year]} was`; unit = " thousand euros";
  } else if (kind === 1) {
    formula = { kind: "difference", cells: [cell(0, 2, last), cell(0, 2, first)] }; description = `Operating profit in ${data.years[last]} minus operating profit in ${data.years[first]} was`; unit = " thousand euros";
  } else if (kind === 2) {
    formula = { kind: "value", cells: [cell(3, product)] }; description = `${metricLabel(3, product)} market share in ${data.years[year]} was`; unit = "%";
  } else if (kind === 3) {
    const tab = expanded ? [0, 1, 2, 5][pick(4, random)] : 0;
    const row = tab === 0 || tab === 2 ? 0 : pick(data.tabs[tab].rows.length, random);
    formula = { kind: "growth", cells: [cell(tab, row, first), cell(tab, row, last)] }; description = `The percentage change in ${metricLabel(tab, row)}${tab === 5 ? " approved investment budget" : ""} from ${data.years[first]} to ${data.years[last]} was`; unit = "%";
  } else if (kind === 4) {
    const profit = expanded && random() < 0.5 ? 11 : 2;
    formula = { kind: "percentage", cells: [cell(0, profit), cell(0, 0)] }; description = `The ${profit === 11 ? "net" : "operating"} profit margin (profit ÷ revenue) in ${data.years[year]} was`; unit = "%";
  } else if (kind === 5) {
    formula = { kind: "peak", cells: data.years.map((_, y) => cell(4, peer, y)) }; description = `${metricLabel(4, peer)}'s return on equity reached its first highest value in`;
  } else if (kind === 6) {
    const income = random() < 0.5 ? 0 : 2;
    formula = { kind: "perEmployee", cells: [cell(0, income), cell(2, 0)] }; description = `${metricLabel(0, income)} per employee in ${data.years[year]} was`; unit = " euros";
  } else if (kind === 7) {
    formula = { kind: "percentage", cells: [cell(1, cost), cell(0, 1)] }; description = `${metricLabel(1, cost)} as a percentage of total costs in ${data.years[year]} was`; unit = "%";
  } else if (kind === 8) {
    formula = { kind: "value", cells: [cell(1, cost)] }; description = `${metricLabel(1, cost)} costs in ${data.years[year]} were`; unit = " thousand euros";
  } else if (kind === 9) {
    formula = { kind: "value", cells: [cell(2, department)] }; description = `${metricLabel(2, department)} headcount in ${data.years[year]} was`; unit = " people";
  } else if (kind === 10) {
    formula = { kind: "sum", cells: [cell(2, department), cell(2, anotherDepartment)] }; description = `Combined ${metricLabel(2, department)} and ${metricLabel(2, anotherDepartment)} headcount in ${data.years[year]} was`; unit = " people";
  } else if (kind === 11) {
    formula = { kind: "value", cells: [cell(5, product)] }; description = `The approved ${metricLabel(5, product)} investment budget in ${data.years[year]} was`; unit = " thousand euros";
  } else if (kind === 12) {
    formula = { kind: "average", cells: [cell(0, product + 3, first), cell(0, product + 3, last)] }; description = `Average ${metricLabel(0, product + 3)} across ${data.years[first]} and ${data.years[last]} was`; unit = " thousand euros";
  } else if (kind === 13) {
    formula = { kind: "combinedPercentage", cells: [cell(1, cost, first), cell(1, cost, last), cell(0, 1, first), cell(0, 1, last)] }; description = `${metricLabel(1, cost)} costs for ${data.years[first]} and ${data.years[last]} combined, as a share of those two years' combined total costs, were`; unit = "%";
  } else if (kind === 14) {
    formula = { kind: "growthDifference", cells: [cell(0, 0, first), cell(0, 0, last), cell(2, 0, first), cell(2, 0, last)] }; description = `Revenue percentage growth minus total headcount percentage growth from ${data.years[first]} to ${data.years[last]} was`; unit = " percentage points";
  } else if (kind === 15) {
    formula = { kind: "percentage", cells: [cell(0, product + 3), cell(0, 0)] }; description = `${metricLabel(0, product + 3)} as a share of total revenue in ${data.years[year]} was`; unit = "%";
  } else if (kind === 16) {
    formula = { kind: "difference", cells: [cell(3, product, last), cell(3, product, first)] }; description = `The change in ${metricLabel(3, product)} market share from ${data.years[first]} to ${data.years[last]} was`; unit = " percentage points";
  } else if (kind === 17) {
    const second = (product + 1) % 6;
    formula = { kind: "sumPercentage", cells: [cell(0, product + 3), cell(0, second + 3), cell(0, 0)] }; description = `Combined ${metricLabel(0, product + 3)} and ${metricLabel(0, second + 3)} as a share of total revenue in ${data.years[year]} were`; unit = "%";
  } else {
    const second = (product + 1) % 6;
    formula = { kind: "sum", cells: [cell(5, product), cell(5, second)] }; description = `Combined approved investment budgets for ${metricLabel(5, product)} and ${metricLabel(5, second)} in ${data.years[year]} were`; unit = " thousand euros";
  }
  const value = numericalValue(data, formula);
  const trueStatement = random() < 0.5;
  if (formula.kind === "peak") {
    const threshold = trueStatement ? value : data.years[(data.years.indexOf(value) + 1 + pick(4, random)) % 5];
    return { statement: `${description} ${threshold}.`, formula, comparison: "eq", threshold, missing: "", difficulty };
  }
  const comparison = random() < 0.5 ? "gt" : "lt";
  const gap = Math.max(0.5, Math.abs(value) * (difficulty === 2 ? 0.008 : difficulty === 1 ? 0.04 : 0.1));
  const threshold = Number((value + ((comparison === "gt") === trueStatement ? -gap : gap)).toFixed(unit === "%" || unit === " percentage points" ? 1 : 0));
  return { statement: `${description} ${comparison === "gt" ? "greater" : "less"} than ${number(threshold)}${unit}.`, formula, comparison, threshold, missing: "", difficulty };
}
export function isNumericalData(value: unknown): value is NumericalData {
  if (!value || typeof value !== "object") return false;
  const d = value as NumericalData;
  if (d.company !== undefined && (!d.company || !NUMERICAL_COMPANIES.some(company => company.id === d.company!.id) || ![d.company.name, d.company.sector, d.company.description, d.company.strategy].every(text => typeof text === "string" && text.length > 0))) return false;
  return Array.isArray(d.years) && d.years.length === 5 && d.years.every(y => Number.isInteger(y) && y > 2000 && y < 2100) && new Set(d.years).size === 5 &&
    Array.isArray(d.tabs) && d.tabs.length === 6 && d.tabs.every((tab, index) => tab && typeof tab.label === "string" && typeof tab.unit === "string" && typeof tab.note === "string" && Array.isArray(tab.rows) && tab.rows.length === (d.company ? [12, 8, 7, 6, 6, 6] : [3, 3, 4, 3, 3, 0])[index] && tab.rows.every(row => row && typeof row.label === "string" && Array.isArray(row.values) && row.values.length === 5 && row.values.every(v => Number.isFinite(v) && v > 0)));
}
export function isNumericalQuestion(data: NumericalData, value: unknown): value is NumericalQuestion {
  if (!value || typeof value !== "object") return false;
  const q = value as NumericalQuestion;
  if (typeof q.statement !== "string" || !q.statement || typeof q.missing !== "string" || ![0, 1, 2].includes(q.difficulty) || !["gt", "lt", "eq"].includes(q.comparison) || !Number.isFinite(q.threshold)) return false;
  if (q.formula === null) return q.missing.length > 0;
  const f = q.formula;
  const lengths = { value: 1, sum: 2, difference: 2, growth: 2, percentage: 2, perEmployee: 2, peak: 5, average: 2, combinedPercentage: 4, sumPercentage: 3, growthDifference: 4 };
  return !!f && f.kind in lengths && Array.isArray(f.cells) && f.cells.length === lengths[f.kind] && f.cells.every(c => c && Number.isInteger(c.tab) && c.tab >= 0 && c.tab < data.tabs.length && Number.isInteger(c.row) && c.row >= 0 && c.row < data.tabs[c.tab].rows.length && Number.isInteger(c.year) && c.year >= 0 && c.year < 5);
}
export const isNumericalAnswer = (value: unknown): value is NumericalAnswer => ["true", "false", "cannot-say"].includes(value as string);
