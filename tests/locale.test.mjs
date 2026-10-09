import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { createInstance } from 'i18next';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const catalogs = { en: {}, hu: {} };
const flat = { en: {}, hu: {} };
function merge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') target[key] = value;
    else merge((target[key] ??= {}), value);
  }
}
function flatten(section, target, prefix = '') {
  for (const [name, value] of Object.entries(section)) {
    const key = prefix ? `${prefix}.${name}` : name;
    if (typeof value === 'string') target[key] = value;
    else flatten(value, target, key);
  }
}
for (const locale of ['en', 'hu']) {
  const files = await readdir(
    new URL(`../src/locales/${locale}/`, import.meta.url),
  );
  assert.ok(files.length > 18);
  for (const file of files)
    merge(
      catalogs[locale],
      JSON.parse(await read(`src/locales/${locale}/${file}`)),
    );
  flatten(catalogs[locale], flat[locale]);
}
const i18n = createInstance();
await i18n.init({
  resources: {
    en: { translation: catalogs.en },
    hu: { translation: catalogs.hu },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
const sourceKeys = Object.fromEntries(
  Object.entries(flat.en).map(([key, text]) => [text, key]),
);
function translate(source, values = {}) {
  const options = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      value && typeof value === 'object' && 'key' in value
        ? translate(value.key, value.values)
        : typeof value === 'string'
          ? translate(value)
          : value,
    ]),
  );
  const text = source.trim();
  return (
    source.slice(0, source.length - source.trimStart().length) +
    i18n.t(sourceKeys[text] ?? text, { ...options, defaultValue: text }) +
    source.slice(source.trimEnd().length)
  );
}
async function logic(path) {
  const { outputText } = ts.transpileModule(await read(path), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
  );
}
const { readLocaleCookie, localeCookie } = await logic('src/lib/locale.ts');

test('English is the default; only a supported locale cookie selects Hungarian', () => {
  for (const cookie of [
    '',
    'psy_locale=en',
    'psy_locale=de',
    'psy_locale=HU',
    'another_psy_locale=hu',
    'psy_locale=hu-extra',
  ])
    assert.equal(readLocaleCookie(cookie), 'en');
  assert.equal(
    readLocaleCookie('other=value; psy_locale=hu; next=value'),
    'hu',
  );
});

test('locale cookie persists for a year and respects the deployed base path', () => {
  assert.equal(
    localeCookie('hu'),
    'psy_locale=hu; Path=/; Max-Age=31536000; SameSite=Lax',
  );
  assert.equal(
    localeCookie('en', '/PSY/', true),
    'psy_locale=en; Path=/PSY/; Max-Age=31536000; SameSite=Lax; Secure',
  );
  assert.match(localeCookie('hu', '/; Domain=elsewhere'), /Path=\/; Max-Age=/);
});

test('nested semantic catalogs match with intact interpolation placeholders', () => {
  assert.deepEqual(Object.keys(flat.hu).sort(), Object.keys(flat.en).sort());
  assert.equal(catalogs.en.home.title, 'Focus, react, remember, adapt.');
  assert.ok(catalogs.en.home.description);
  for (const [key, text] of Object.entries(flat.en)) {
    assert.ok(flat.hu[key].trim(), key);
    assert.doesNotMatch(key, /\b[mp]\d{3,4}\b/);
    assert.deepEqual(
      [...text.matchAll(/\{\{(.*?)\}\}/g)].map(m => m[1]).sort(),
      [...flat.hu[key].matchAll(/\{\{(.*?)\}\}/g)].map(m => m[1]).sort(),
      key,
    );
  }
});

test('uses American English and informal Hungarian', async () => {
  const english = Object.values(flat.en).join(' ');
  assert.doesNotMatch(
    english,
    /\b(coloured|labelled|practising|centres|licences|grey)\b/i,
  );
  await i18n.changeLanguage('hu');
  assert.equal(translate('common.actions.startTest'), 'Teszt indítása');
  assert.equal(translate('home.tests.title'), 'Válassz tesztet');
  for (const [key, text] of Object.entries(flat.hu)) {
    const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
    assert.ok(
      !words.some(word =>
        [
          'ön',
          'válasszon',
          'válassza',
          'keresse',
          'nyomja',
          'használja',
          'kövesse',
          'válaszoljon',
        ].includes(word),
      ),
      key,
    );
  }
  assert.equal(translate('  True '), '  Igaz ');
  assert.equal(
    translate('Unknown labels stay readable'),
    'Unknown labels stay readable',
  );
});

test('generated numerical messages change language without changing scoring or stored data', async () => {
  const numerical = await logic('src/lib/numerical-reasoning.ts');
  let seed = 41;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const data = numerical.createNumericalData(random, 'software');
  for (let index = 0; index < 80; index++) {
    const question = numerical.createNumericalQuestion(
      data,
      index,
      'adaptive',
      random,
    );
    const original = JSON.stringify(question);
    const answer = numerical.numericalAnswer(data, question);
    await i18n.changeLanguage('en');
    assert.equal(
      translate(
        question.statementMessage.key,
        question.statementMessage.values,
      ),
      question.statement,
    );
    await i18n.changeLanguage('hu');
    const translated = translate(
      question.statementMessage.key,
      question.statementMessage.values,
    );
    assert.notEqual(translated, question.statement);
    assert.doesNotMatch(translated, /\{\{|numericalReasoning\./);
    assert.equal(numerical.numericalAnswer(data, question), answer);
    assert.equal(JSON.stringify(question), original);
  }
});

test('footer language selector follows the app and uses react-i18next', async () => {
  const main = await read('src/main.tsx');
  assert.match(main, /<App\s*\/>\s*<LanguageSwitcher\s*\/>/);
  const component = await read('src/components/Localization.tsx');
  assert.match(component, /<footer/);
  assert.match(component, /from 'react-i18next'/);
  assert.match(component, /i18n.changeLanguage\(next\)/);
  assert.match(component, /'en-US'/);
});
