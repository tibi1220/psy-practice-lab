import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("build emits the Vite application shell", async () => {
  const html = await readProjectFile("dist/index.html");

  assert.match(html, /<title>PSY Practice Lab<\/title>/i);
  assert.match(html, /<div id="root"><\/div>/i);
  assert.match(html, /src="\/assets\/[^"]+[.]js"/i);
});

test("React Router exposes every cognitive test", async () => {
  const app = await readProjectFile("src/App.tsx");

  for (const route of [
    "/reaction-time/\\*",
    "/short-term-memory/\\*",
    "/divided-attention/\\*",
    "/monotony/\\*",
    "/capacity-to-act/\\*",
    "/tower-of-hanoi/\\*",
    "/distributive-attention/\\*",
    "/perception/\\*",
    "/deductive-reasoning/\\*",
    "/switch-reasoning/\\*",
  ]) {
    assert.match(app, new RegExp(`path="${route}"`));
  }
});

test("GitHub Pages deployment uses the repository base path and SPA fallback", async () => {
  const vite = await readProjectFile("vite.config.ts");
  const main = await readProjectFile("src/main.tsx");
  const html = await readProjectFile("index.html");
  const workflow = await readProjectFile(
    ".github/workflows/deploy-pages.yml",
  );

  assert.match(vite, /process\.env\.VITE_BASE_PATH \?\? "\/"/);
  assert.match(main, /import\.meta\.env\.BASE_URL/);
  assert.match(main, /<BrowserRouter basename=\{routerBase\}>/);
  assert.match(html, /%BASE_URL%favicon\.svg/);
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /VITE_BASE_PATH: \/psy-practice-lab\//);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /cp dist\/index\.html dist\/404\.html/);
});

test("the test pages retain their core controls and explanations", async () => {
  const pages = await Promise.all(
    [
      "HomePage.tsx",
      "ReactionTimePage.tsx",
      "ShortTermMemoryPage.tsx",
      "DividedAttentionPage.tsx",
      "MonotonyPage.tsx",
      "CapacityToActPage.tsx",
      "TowerOfHanoiPage.tsx",
      "DistributiveAttentionPage.tsx",
      "PerceptionPage.tsx",
      "DeductiveReasoningPage.tsx",
      "SwitchReasoningPage.tsx",
    ].map((page) => readProjectFile(`src/pages/${page}`)),
  );
  const source = pages.join("\n");

  assert.match(source, /Focus, react, remember, adapt\./);
  assert.match(source, /How fast can you respond\?/);
  assert.match(source, /Number of rounds/);
  assert.match(source, /Exclude extremes/);
  assert.match(source, /Remember the pattern/);
  assert.match(source, /Number of rounds/);
  assert.match(source, /Drive and monitor/);
  assert.match(source, /Test length/);
  assert.match(source, /Number of signals/);
  assert.match(source, /Passing-car difficulty/);
  assert.match(source, /Stay accurate through repetition/);
  assert.match(source, /See, hear, decide, act\./);
  assert.match(source, /Plan ahead\. Move with purpose\./);
  assert.match(source, /Track both axes at once\./);
  assert.match(source, /See two signals\. Respond as one\./);
});

test("every test has a guided Radix dialog walkthrough", async () => {
  const demos = await readProjectFile("src/components/TestDemos.tsx");
  const modal = await readProjectFile("src/components/GuidedDemoModal.tsx");

  assert.match(modal, /@radix-ui\/react-dialog/);
  assert.match(modal, /fixed inset-0 z-50 grid place-items-center/);
  assert.doesNotMatch(modal, /fixed left-1\/2 top-1\/2/);
  assert.match(demos, /Reaction time walkthrough/);
  assert.match(demos, /Memory test walkthrough/);
  assert.match(demos, /Divided-attention walkthrough/);
  assert.match(demos, /Monotony test walkthrough/);
  assert.match(demos, /Capacity-to-act walkthrough/);
  assert.match(demos, /Tower of Hanoi walkthrough/);
  assert.match(demos, /Distributive-attention walkthrough/);
  assert.match(demos, /Perception walkthrough/);
});

test("tests and demos share the extracted visual primitives", async () => {
  const demos = await readProjectFile("src/components/TestDemos.tsx");
  const memory = await readProjectFile("src/pages/ShortTermMemoryPage.tsx");
  const monotony = await readProjectFile("src/pages/MonotonyPage.tsx");
  const divided = await readProjectFile("src/pages/DividedAttentionPage.tsx");
  const hanoi = await readProjectFile("src/pages/TowerOfHanoiPage.tsx");
  const distributive = await readProjectFile(
    "src/pages/DistributiveAttentionPage.tsx",
  );
  const perception = await readProjectFile("src/pages/PerceptionPage.tsx");

  assert.match(demos, /from "\.\/MemoryCell"/);
  assert.match(memory, /from "\.\.\/components\/MemoryCell"/);
  assert.match(monotony, /from "\.\.\/components\/MonotonyStimulus"/);
  assert.match(divided, /from "\.\.\/components\/TrafficLightDisplay"/);
  assert.match(demos, /from "\.\/HanoiBoard"/);
  assert.match(hanoi, /from "\.\.\/components\/HanoiBoard"/);
  assert.match(demos, /from "\.\/DistributiveAttentionBoard"/);
  assert.match(
    distributive,
    /from "\.\.\/components\/DistributiveAttentionBoard"/,
  );
  assert.match(demos, /from "\.\/PerceptionControls"/);
  assert.match(perception, /from "\.\.\/components\/PerceptionControls"/);
});

test("every setup separates settings from instructions", async () => {
  const pages = await Promise.all(
    [
      "ReactionTimePage.tsx",
      "ShortTermMemoryPage.tsx",
      "DividedAttentionPage.tsx",
      "MonotonyPage.tsx",
      "CapacityToActPage.tsx",
      "TowerOfHanoiPage.tsx",
      "DistributiveAttentionPage.tsx",
      "PerceptionPage.tsx",
      "DeductiveReasoningPage.tsx",
      "SwitchReasoningPage.tsx",
    ].map((page) => readProjectFile(`src/pages/${page}`)),
  );

  for (const page of pages) {
    assert.match(page, /title="Test settings"/);
    assert.match(page, /title="Instructions"/);
    assert.match(page, /<InstructionList/);
  }
});

test("number settings validate only after editing is complete", async () => {
  const input = await readProjectFile(
    "src/components/ValidatedNumberInput.tsx",
  );
  const pages = await Promise.all(
    [
      "ReactionTimePage.tsx",
      "ShortTermMemoryPage.tsx",
      "DividedAttentionPage.tsx",
      "MonotonyPage.tsx",
      "CapacityToActPage.tsx",
      "TowerOfHanoiPage.tsx",
      "DistributiveAttentionPage.tsx",
      "PerceptionPage.tsx",
      "DeductiveReasoningPage.tsx",
      "SwitchReasoningPage.tsx",
    ].map((page) => readProjectFile(`src/pages/${page}`)),
  );

  assert.match(input, /value=\{draft\}/);
  assert.match(input, /onChange=\{\(event\) =>[\s\S]*?setEditor/);
  assert.match(input, /onBlur=\{commit\}/);
  assert.match(input, /event\.key === "Enter"/);
  assert.match(input, /onValueChange\(normalizedValue\)/);
  for (const page of pages) {
    assert.match(page, /ValidatedNumberInput/);
    assert.doesNotMatch(page, /type="number"/);
  }
});

test("every test navigates between setup, test, and result routes", async () => {
  const pages = await Promise.all(
    [
      "ReactionTimePage.tsx",
      "ShortTermMemoryPage.tsx",
      "DividedAttentionPage.tsx",
      "MonotonyPage.tsx",
      "CapacityToActPage.tsx",
      "TowerOfHanoiPage.tsx",
      "DistributiveAttentionPage.tsx",
      "PerceptionPage.tsx",
      "DeductiveReasoningPage.tsx",
      "SwitchReasoningPage.tsx",
    ].map((page) => readProjectFile(`src/pages/${page}`)),
  );

  for (const page of pages) {
    assert.match(page, /useTestRoute\(\{/);
    assert.match(page, /beginTestRoute\(/);
    assert.match(page, /completeTestRoute\(\)/);
    assert.match(page, /returnToSetupRoute/);
  }

  const routeHook = await readProjectFile("src/hooks/useTestRoute.ts");
  assert.match(routeHook, /`\$\{basePath\}\/test`/);
  assert.match(routeHook, /`\$\{basePath\}\/result`/);
  assert.match(routeHook, /navigate\(resultPath, \{ replace: true \}\)/);
  assert.match(routeHook, /pendingViewRef\.current = "test"/);
  assert.match(routeHook, /pendingViewRef\.current = "result"/);
  assert.match(routeHook, /routeView === pendingViewRef\.current/);
});

test("tower of hanoi supports both input modes and graphs move speed", async () => {
  const page = await readProjectFile("src/pages/TowerOfHanoiPage.tsx");
  const board = await readProjectFile("src/components/HanoiBoard.tsx");
  const graph = await readProjectFile("src/components/HanoiSpeedGraph.tsx");

  assert.match(page, /DEFAULT_HEIGHT = 7/);
  assert.match(page, /2 \*\* height - 1/);
  assert.match(page, /moves: nextMoves/);
  assert.match(page, /psy-tower-of-hanoi-sessions/);
  assert.match(board, /draggable=\{isTop && !!onMove\}/);
  assert.match(board, /onDrop=/);
  assert.match(board, /onClick=\{\(event\) => selectDisk/);
  assert.match(page, /destinationTop < disk/);
  assert.match(graph, /Cumulative move speed over elapsed time/);
  assert.match(graph, /onPointerMove=/);
  assert.match(graph, /Moves\/min/);
});

test("distributive attention supports fixed and mixed response directions", async () => {
  const page = await readProjectFile(
    "src/pages/DistributiveAttentionPage.tsx",
  );
  const board = await readProjectFile(
    "src/components/DistributiveAttentionBoard.tsx",
  );
  const demos = await readProjectFile("src/components/TestDemos.tsx");

  assert.match(page, /"one-handed"/);
  assert.match(page, /"two-handed"/);
  assert.match(page, /DistributiveMode \| "mixed"/);
  assert.match(page, /mode === "mixed"/);
  assert.match(page, /trialModes/);
  assert.match(page, /activeMode/);
  assert.match(page, /summarizeModeTrials/);
  assert.match(page, /DEFAULT_TRIAL_COUNT = 32/);
  assert.match(page, /basePath: "\/distributive-attention"/);
  assert.match(page, /tryTwoHandedResponse/);
  assert.match(page, /window\.addEventListener\("keydown"/);
  assert.match(page, /window\.addEventListener\("keyup"/);
  assert.match(page, /psy-distributive-attention-sessions/);
  assert.match(board, /grid-cols-9/);
  assert.match(board, /grid-rows-9/);
  assert.match(board, /Array\.from\(\{ length: 64 \}/);
  assert.match(board, /rounded-full/);
  for (const code of ["KeyQ", "KeyF", "KeyU", "Semicolon"]) {
    assert.match(board, new RegExp(`"${code}"`));
  }
  assert.match(demos, /Switch directions in mixed mode/);
});

test("capacity-to-act uses the requested defaults and mixed response mappings", async () => {
  const page = await readProjectFile("src/pages/CapacityToActPage.tsx");
  const controls = await readProjectFile("src/components/CapacityControls.tsx");

  assert.match(page, /DEFAULT_TRIAL_COUNT = 40/);
  assert.match(page, /DEFAULT_INTERVAL_MS = 1_500/);
  for (const key of ["e", "f", "z", "j", "o"]) {
    assert.match(controls, new RegExp(`key: "${key}"`));
  }
  assert.match(controls, /grid-cols-5 grid-rows-2/);
  assert.match(controls, /CapacityTopLights/);
  assert.match(controls, /CapacityWarningDisplay/);
  assert.match(controls, /CapacityStimulusPanel/);
  assert.match(controls, /CapacityActionControls/);
  assert.match(controls, /`\$\{side\}-lever`/);
  assert.match(controls, /`\$\{side\}-pedal`/);
  assert.match(page, /kind: "warning"/);
  assert.match(page, /kind: "tone"/);
  assert.match(page, /tone === "deep" \? "left-lever" : "right-lever"/);
  assert.match(page, /tone === "deep" \? 180 : 880/);
  assert.match(page, /START_DELAY_MS = 2_000/);
  assert.match(page, /TONE_DURATION_SECONDS = 0\.8/);
  assert.match(page, /scheduleDistraction/);
  assert.match(page, /setActiveTopLight/);
  assert.doesNotMatch(page, /kind: "top-light"/);
  assert.match(controls, /aspect-\[2\/3\]/);
  assert.match(controls, /group-active:translate-y-2/);
  assert.match(controls, /w-3\/5 max-w-xs grid-cols-2/);
  assert.match(page, /setTimeout\(\(\) => \{/);
  assert.doesNotMatch(page, /setInterval\(/);
});

test("perception uses mirrored layouts and simultaneous two-side input", async () => {
  const page = await readProjectFile("src/pages/PerceptionPage.tsx");
  const controls = await readProjectFile(
    "src/components/PerceptionControls.tsx",
  );

  assert.match(page, /DEFAULT_ROUND_COUNT = 32/);
  assert.match(page, /basePath: "\/perception"/);
  assert.match(page, /psy-perception-sessions/);
  assert.match(page, /leftInputMethod, setLeftInputMethod/);
  assert.match(page, /rightInputMethod, setRightInputMethod/);
  assert.match(page, /settings: \{ leftInputMethod, rightInputMethod, roundCount \}/);
  assert.match(page, /leftMethod=\{leftInputMethod\}/);
  assert.match(page, /rightMethod=\{rightInputMethod\}/);
  assert.match(page, /left !== null && right !== null/);
  assert.match(page, /leftCorrect && rightCorrect/);
  assert.match(page, /window\.addEventListener\("keydown"/);
  assert.match(page, /window\.addEventListener\("keyup"/);
  assert.match(page, /leftAccuracy/);
  assert.match(page, /rightAccuracy/);
  assert.match(controls, /"vertical" \| "horizontal" \| "matrix"/);
  assert.match(controls, /\[4, 3, 2, 1\] : \[1, 2, 3, 4\]/);
  assert.match(controls, /\[3, 2, 4, 1\] : \[2, 3, 1, 4\]/);
  assert.match(controls, /w-\[min\(46vw,26rem\)\]/);
  assert.match(controls, /w-36 grid-cols-2 sm:w-44/);
  assert.match(controls, /leftMethod\?: PerceptionInputMethod/);
  assert.match(controls, /rightMethod\?: PerceptionInputMethod/);
  assert.match(controls, /onPointerDown/);
  for (const code of ["KeyQ", "KeyR", "KeyU", "KeyP"]) {
    assert.match(controls, new RegExp(`"${code}"`));
  }
});

test("monotony can generate an unmarked randomized paper test", async () => {
  const page = await readProjectFile("src/pages/MonotonyPage.tsx");
  const printDialog = await readProjectFile(
    "src/components/MonotonyPrintDialog.tsx",
  );
  const stimulus = await readProjectFile(
    "src/components/MonotonyStimulus.tsx",
  );
  const pdf = await readProjectFile("src/lib/create-monotony-pdf.ts");
  const packageJson = await readProjectFile("package.json");

  assert.match(page, /<MonotonyPrintDialog/);
  assert.match(page, /itemCount=\{itemCount\}/);
  assert.match(page, /goodTypeIds=\{goodTypeIds\}/);
  assert.match(stimulus, /createMonotonySequence/);
  assert.match(stimulus, /printable[\s\S]*?\? "bg-black shadow-none"/);
  for (const paper of ["A3", "A4", "A5", "US Letter"]) {
    assert.match(printDialog, new RegExp(`label: "${paper}"`));
  }
  assert.match(printDialog, /DEFAULT_RECTANGLE_WIDTH_MM = 14/);
  assert.match(printDialog, /MIN_RECTANGLE_WIDTH_MM = 5/);
  assert.match(printDialog, /MAX_RECTANGLE_WIDTH_MM = 30/);
  assert.match(printDialog, /DEFAULT_BORDER_WIDTH_MM = 0\.5/);
  assert.match(printDialog, /MIN_BORDER_WIDTH_MM = 0\.1/);
  assert.match(printDialog, /MAX_BORDER_WIDTH_MM = 2/);
  assert.match(printDialog, /DEFAULT_CORNER_RADIUS_MM = 2/);
  assert.match(printDialog, /MAX_CORNER_RADIUS_MM = 15/);
  assert.match(printDialog, /Rectangle width/);
  assert.match(printDialog, /Border width/);
  assert.match(printDialog, /Corner radius/);
  assert.match(printDialog, /borderWidth=\{`\$\{borderWidthMm\}mm`\}/);
  assert.match(printDialog, /cornerRadius=\{`\$\{cornerRadiusMm\}mm`\}/);
  assert.match(stimulus, /borderWidth\?: CSSProperties\["borderWidth"\]/);
  assert.match(stimulus, /cornerRadius\?: CSSProperties\["borderRadius"\]/);
  assert.match(printDialog, /MIN_ITEM_COUNT = 20/);
  assert.match(printDialog, /MAX_ITEM_COUNT = 5_000/);
  assert.match(printDialog, /MAX_PAGE_COUNT = 10/);
  assert.match(printDialog, /"items" \| "pages"/);
  assert.match(printDialog, /Rectangle count/);
  assert.match(printDialog, /Page count/);
  assert.match(printDialog, /pageCount \* itemsPerPage/);
  assert.match(printDialog, /itemsPerPage: columns \* rows/);
  assert.match(printDialog, /Good symbols to circle/);
  assert.match(printDialog, /toggleGoodType/);
  assert.match(printDialog, /stimulusTypes\.map/);
  assert.match(printDialog, /gridTemplateColumns/);
  assert.match(printDialog, /createMonotonySequence\(itemCount\)/);
  assert.match(printDialog, /Circle every square matching/);
  assert.match(printDialog, /downloadMonotonyPdf/);
  assert.match(printDialog, /Download PDF/);
  assert.doesNotMatch(printDialog, /window\.print/);
  assert.match(packageJson, /"jspdf": "4\.2\.1"/);
  assert.match(pdf, /await import\("jspdf"\)/);
  assert.match(pdf, /renderStimulusImage/);
  assert.match(pdf, /format: \[paper\.widthMm, paper\.heightMm\]/);
  assert.match(pdf, /if \(pageIndex > 0\)/);
  assert.match(pdf, /document\.addPage/);
  assert.match(pdf, /document\.save\(`monotony-pattern-/);
});

test("divided-attention signal timeouts follow difficulty", async () => {
  const divided = await readProjectFile("src/pages/DividedAttentionPage.tsx");

  assert.match(divided, /easy:[\s\S]*?signalTimeoutMs: 2_500/);
  assert.match(divided, /medium:[\s\S]*?signalTimeoutMs: 1_800/);
  assert.match(divided, /hard:[\s\S]*?signalTimeoutMs: 1_200/);
  assert.match(divided, /traffic\.signalTimeoutMs/);
});
