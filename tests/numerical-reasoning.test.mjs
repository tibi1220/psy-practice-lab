import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(
  new URL('../src/lib/numerical-reasoning.ts', import.meta.url),
  'utf8',
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const m = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
const data = m.createNumericalData(seeded(82492));
const cell = (tab, row, year = 0) => ({ tab, row, year });
const q = (formula, threshold, comparison = 'gt') => ({
  statement: 'Test statement',
  formula,
  threshold,
  comparison,
  missing: '',
  difficulty: 1,
});

test('financial tabs reconcile their costs, profits and departmental headcounts', () => {
  const random = seeded(8273);
  for (let i = 0; i < 100; i++) {
    const d = m.createNumericalData(random);
    assert.ok(m.isNumericalData(d));
    for (let year = 0; year < 5; year++) {
      assert.equal(
        d.tabs[0].rows[0].values[year] - d.tabs[0].rows[1].values[year],
        d.tabs[0].rows[2].values[year],
      );
      assert.equal(
        d.tabs[1].rows.reduce((sum, row) => sum + row.values[year], 0),
        d.tabs[0].rows[1].values[year],
      );
      assert.equal(
        d.tabs[2].rows.slice(1).reduce((sum, row) => sum + row.values[year], 0),
        d.tabs[2].rows[0].values[year],
      );
    }
  }
});
test('calculations use the base year for growth and convert thousands of euros per employee', () => {
  const d = structuredClone(data);
  d.tabs[0].rows[0].values = [10000, 12500, 9000, 16000, 12000];
  d.tabs[0].rows[2].values[0] = 2000;
  d.tabs[2].rows[0].values[0] = 5000;
  assert.equal(
    m.numericalValue(d, { kind: 'growth', cells: [cell(0, 0), cell(0, 0, 1)] }),
    25,
  );
  assert.equal(
    m.numericalValue(d, { kind: 'growth', cells: [cell(0, 0, 1), cell(0, 0)] }),
    -20,
  );
  assert.equal(
    m.numericalValue(d, {
      kind: 'percentage',
      cells: [cell(0, 2), cell(0, 0)],
    }),
    20,
  );
  assert.equal(
    m.numericalValue(d, {
      kind: 'perEmployee',
      cells: [cell(0, 0), cell(2, 0)],
    }),
    2000,
  );
  assert.equal(
    m.numericalValue(d, {
      kind: 'peak',
      cells: d.years.map((_, year) => cell(0, 0, year)),
    }),
    d.years[3],
  );
  const formula = { kind: 'value', cells: [cell(0, 0)] };
  assert.equal(
    m.numericalAnswer(d, q(formula, 10000)),
    'false',
    'strict greater-than excludes equality',
  );
  assert.equal(m.numericalAnswer(d, q(formula, 10000, 'eq')), 'true');
});
test('four sample businesses supply distinct sector fields and fresh, reconciled five-year tables', () => {
  const random = seeded(845783);
  for (const company of m.NUMERICAL_COMPANIES) {
    const first = m.createNumericalData(random, company.id),
      second = m.createNumericalData(random, company.id);
    assert.equal(first.company.id, company.id);
    assert.deepEqual(
      first.tabs.map(tab => tab.rows.length),
      [12, 8, 7, 6, 6, 6],
    );
    assert.notDeepEqual(
      first.tabs[0].rows[0].values,
      second.tabs[0].rows[0].values,
    );
    assert.equal(first.tabs[1].rows[1].label, company.costs[1]);
    assert.equal(first.tabs[2].rows[1].label, company.departments[0]);
    assert.deepEqual(
      first.tabs[3].rows.map(row => row.label),
      [...company.products],
    );
    assert.equal(first.tabs[4].rows[0].label, company.name);
    assert.deepEqual(
      first.tabs[5].rows.map(row => row.label),
      [...company.budgets],
    );
    assert.ok(m.isNumericalData(first) && m.isNumericalData(second));
    for (let year = 0; year < 5; year++) {
      const income = first.tabs[0].rows;
      assert.equal(
        income.slice(3, 9).reduce((sum, row) => sum + row.values[year], 0),
        income[0].values[year],
      );
      assert.equal(
        income[2].values[year] -
          income[9].values[year] -
          income[10].values[year],
        income[11].values[year],
      );
    }
    const referenced = new Set();
    for (const level of ['easy', 'hard'])
      for (let index = 0; index < 400; index++) {
        const question = m.createNumericalQuestion(first, index, level, random);
        assert.ok(m.isNumericalQuestion(first, question));
        if (question.formula)
          for (const cell of question.formula.cells)
            referenced.add(`${cell.tab}/${cell.row}`);
        assert.doesNotMatch(
          question.statement,
          /Health products|Home products|Meridian in/,
        );
      }
    assert.ok(
      [...referenced].some(ref => ref.startsWith('5/')),
      'investment budget questions are included',
    );
    assert.ok(referenced.has('0/11'), 'net profit is used');
    for (let tab = 1; tab < 6; tab++)
      assert.ok(
        [...referenced].filter(ref => ref.startsWith(`${tab}/`)).length >= 5,
        `uses additional rows in tab ${tab}`,
      );
  }
  const ids = new Set(
    Array.from({ length: 100 }, () => m.createNumericalData(random).company.id),
  );
  assert.equal(ids.size, 4);
});
test('advanced ratios combine actual totals rather than averaging annual percentages', () => {
  const d = structuredClone(data);
  d.tabs[1].rows[0].values[0] = 100;
  d.tabs[1].rows[0].values[1] = 900;
  d.tabs[0].rows[1].values[0] = 1000;
  d.tabs[0].rows[1].values[1] = 3000;
  const combined = {
    kind: 'combinedPercentage',
    cells: [cell(1, 0), cell(1, 0, 1), cell(0, 1), cell(0, 1, 1)],
  };
  assert.equal(m.numericalValue(d, combined), 25);
  assert.notEqual(m.numericalValue(d, combined), (10 + 30) / 2);
  d.tabs[0].rows[0].values[0] = 10000;
  d.tabs[0].rows[0].values[1] = 12000;
  d.tabs[2].rows[0].values[0] = 1000;
  d.tabs[2].rows[0].values[1] = 1100;
  const growth = {
    kind: 'growthDifference',
    cells: [cell(0, 0), cell(0, 0, 1), cell(2, 0), cell(2, 0, 1)],
  };
  assert.equal(m.numericalValue(d, growth), 10);
  assert.match(m.numericalExplanation(d, q(growth, 9)), /percentage points/);
  assert.ok(m.isNumericalQuestion(d, q(combined, 20)));
  assert.ok(
    m.isNumericalQuestion(d, q({ kind: 'value', cells: [cell(5, 5)] }, 20)),
  );
  const unknown = m.createNumericalQuestion(d, 0, 'easy', () => 0);
  assert.equal(m.numericalAnswer(d, unknown), 'cannot-say');
  assert.match(unknown.statement, new RegExp(String(d.years[4] + 1)));
});
test('legacy saved tables remain readable while malformed company data are rejected', () => {
  const legacy = structuredClone(data);
  delete legacy.company;
  const lengths = [3, 3, 4, 3, 3, 0];
  legacy.tabs.forEach((tab, i) => {
    tab.rows = tab.rows.slice(0, lengths[i]);
  });
  assert.ok(m.isNumericalData(legacy));
  assert.ok(
    m.isNumericalQuestion(
      legacy,
      q({ kind: 'value', cells: [cell(0, 0)] }, 1000),
    ),
  );
  for (const company of [
    null,
    { ...data.company, id: 'missing' },
    { ...data.company, name: 5 },
  ])
    assert.equal(m.isNumericalData({ ...data, company }), false);
  const damaged = structuredClone(data);
  damaged.tabs[5].rows.pop();
  assert.equal(m.isNumericalData(damaged), false);
});
test('generated statements cover all three answers and progressively harder calculations', () => {
  const random = seeded(728293);
  for (const [index, difficulty] of [
    [0, 0],
    [12, 1],
    [24, 2],
  ]) {
    const kinds = new Set(),
      counts = { true: 0, false: 0, 'cannot-say': 0 };
    for (let i = 0; i < 1000; i++) {
      const question = m.createNumericalQuestion(
        data,
        index,
        'adaptive',
        random,
      );
      assert.ok(m.isNumericalQuestion(data, question));
      assert.equal(question.difficulty, difficulty);
      const answer = m.numericalAnswer(data, question);
      counts[answer]++;
      assert.ok(m.numericalExplanation(data, question).length > 50);
      if (question.formula) {
        kinds.add(question.formula.kind);
        const values = question.formula.cells.map(
          c => data.tabs[c.tab].rows[c.row].values[c.year],
        );
        const calculators = {
          value: () => values[0],
          difference: () => values[0] - values[1],
          sum: () => values.reduce((a, b) => a + b, 0),
          average: () => (values[0] + values[1]) / 2,
          growth: () => (values[1] / values[0] - 1) * 100,
          percentage: () => (values[0] / values[1]) * 100,
          perEmployee: () => (values[0] * 1000) / values[1],
          peak: () => data.years[values.indexOf(Math.max(...values))],
          combinedPercentage: () =>
            (100 * (values[0] + values[1])) / (values[2] + values[3]),
          sumPercentage: () => (100 * (values[0] + values[1])) / values[2],
          growthDifference: () =>
            (values[1] / values[0] - 1 - (values[3] / values[2] - 1)) * 100,
        };
        const actual = calculators[question.formula.kind]();
        assert.equal(
          answer,
          (
            question.comparison === 'gt'
              ? actual > question.threshold
              : question.comparison === 'lt'
                ? actual < question.threshold
                : actual === question.threshold
          )
            ? 'true'
            : 'false',
        );
      } else assert.match(m.numericalExplanation(data, question), /Cannot say/);
    }
    assert.ok(Object.values(counts).every(count => count > 200));
    if (difficulty === 0)
      assert.deepEqual([...kinds].sort(), ['difference', 'sum', 'value']);
    if (difficulty > 0)
      assert.ok(
        kinds.has('growth') && kinds.has('percentage') && kinds.has('peak'),
      );
    if (difficulty === 2)
      for (const kind of [
        'perEmployee',
        'combinedPercentage',
        'sumPercentage',
        'growthDifference',
      ])
        assert.ok(kinds.has(kind));
  }
});
test('difficulty boundaries and saved data validation reject corrupt references and unsupported formulas', () => {
  assert.deepEqual(
    [0, 11, 12, 23, 24, 46].map(i => m.numericalDifficulty(i, 'adaptive')),
    [0, 0, 1, 1, 2, 2],
  );
  assert.equal(m.numericalDifficulty(0, 'hard'), 1);
  assert.equal(m.numericalDifficulty(50, 'easy'), 0);
  for (const formula of [
    { kind: 'value', cells: [cell(6, 0)] },
    { kind: 'value', cells: [cell(0, 0, 5)] },
    { kind: 'growth', cells: [cell(0, 0)] },
    { kind: 'nope', cells: [] },
    { kind: 'value', cells: [null] },
  ])
    assert.equal(m.isNumericalQuestion(data, q(formula, 10)), false);
  assert.equal(
    m.isNumericalQuestion(data, { ...q(null, 0), missing: '' }),
    false,
  );
  assert.equal(
    m.isNumericalQuestion(data, { ...q(null, 0), missing: 'No forecast' }),
    true,
  );
  const damaged = structuredClone(data);
  damaged.tabs[0].rows[0].values[0] = 0;
  assert.equal(m.isNumericalData(damaged), false);
  assert.equal(m.isNumericalAnswer('cannot-say'), true);
  assert.equal(m.isNumericalAnswer('maybe'), false);
});
