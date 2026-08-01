import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { ValidatedNumberInput } from "./ValidatedNumberInput";
import {
  createMonotonySequence,
  getStimulus,
  StimulusSquare,
  stimulusTypes,
} from "./MonotonyStimulus";
import { downloadMonotonyPdf } from "../lib/create-monotony-pdf";

const PAPER_SIZES = [
  { id: "a4", label: "A4", widthMm: 210, heightMm: 297 },
  { id: "a3", label: "A3", widthMm: 297, heightMm: 420 },
  { id: "a5", label: "A5", widthMm: 148, heightMm: 210 },
  {
    id: "letter",
    label: "US Letter",
    widthMm: 215.9,
    heightMm: 279.4,
  },
] as const;

type PaperSizeId = (typeof PAPER_SIZES)[number]["id"];
type PaperSize = (typeof PAPER_SIZES)[number];

const DEFAULT_RECTANGLE_WIDTH_MM = 14;
const MIN_RECTANGLE_WIDTH_MM = 5;
const MAX_RECTANGLE_WIDTH_MM = 30;
const DEFAULT_BORDER_WIDTH_MM = 0.5;
const MIN_BORDER_WIDTH_MM = 0.1;
const MAX_BORDER_WIDTH_MM = 2;
const DEFAULT_CORNER_RADIUS_MM = 2;
const MIN_CORNER_RADIUS_MM = 0;
const MAX_CORNER_RADIUS_MM = 15;
const MIN_ITEM_COUNT = 20;
const MAX_ITEM_COUNT = 5_000;
const MIN_PAGE_COUNT = 1;
const MAX_PAGE_COUNT = 10;
const PAGE_PADDING_MM = 10;
const GRID_GAP_MM = 2;
const RESERVED_PAGE_HEIGHT_MM = 58;

function paginate<T>(items: T[], pageSize: number) {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += pageSize) {
    pages.push(items.slice(index, index + pageSize));
  }
  return pages;
}

function getPrintGrid(paperSize: PaperSize, rectangleWidthMm: number) {
  const printableWidthMm = paperSize.widthMm - PAGE_PADDING_MM * 2;
  const printableGridHeightMm =
    paperSize.heightMm - PAGE_PADDING_MM * 2 - RESERVED_PAGE_HEIGHT_MM;
  const columns = Math.max(
    3,
    Math.floor(
      (printableWidthMm + GRID_GAP_MM) /
        (rectangleWidthMm + GRID_GAP_MM),
    ),
  );
  const rows = Math.max(
    3,
    Math.floor(
      (printableGridHeightMm + GRID_GAP_MM) /
        (rectangleWidthMm + GRID_GAP_MM),
    ),
  );
  return { columns, rows, itemsPerPage: columns * rows };
}

export function MonotonyPrintDialog({
  itemCount,
  goodTypeIds,
}: {
  itemCount: number;
  goodTypeIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pattern, setPattern] = useState<string[]>([]);
  const [printGoodTypeIds, setPrintGoodTypeIds] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [quantityMode, setQuantityMode] = useState<"items" | "pages">(
    "items",
  );
  const [printItemCount, setPrintItemCount] = useState(itemCount);
  const [pageCount, setPageCount] = useState(3);
  const [paperSizeId, setPaperSizeId] = useState<PaperSizeId>("a4");
  const [rectangleWidthMm, setRectangleWidthMm] = useState(
    DEFAULT_RECTANGLE_WIDTH_MM,
  );
  const [borderWidthMm, setBorderWidthMm] = useState(DEFAULT_BORDER_WIDTH_MM);
  const [cornerRadiusMm, setCornerRadiusMm] = useState(
    DEFAULT_CORNER_RADIUS_MM,
  );

  const prepareDialog = () => {
    setQuantityMode("items");
    setPrintItemCount(itemCount);
    setPattern(createMonotonySequence(itemCount));
    setPrintGoodTypeIds([...goodTypeIds]);
    setGeneratedAt(new Date());
    setPdfError(null);
  };

  const paperSize =
    PAPER_SIZES.find((option) => option.id === paperSizeId) ?? PAPER_SIZES[0];
  const { columns, rows, itemsPerPage } = getPrintGrid(
    paperSize,
    rectangleWidthMm,
  );
  const desiredItemCount =
    quantityMode === "pages" ? pageCount * itemsPerPage : printItemCount;
  const pages = paginate(pattern, itemsPerPage);

  const replacePattern = (count: number) => {
    setPattern(createMonotonySequence(count));
    setGeneratedAt(new Date());
  };

  const generatePattern = () => replacePattern(desiredItemCount);

  const updatePaperSize = (nextPaperSizeId: PaperSizeId) => {
    setPaperSizeId(nextPaperSizeId);
    if (quantityMode !== "pages") return;
    const nextPaperSize =
      PAPER_SIZES.find((option) => option.id === nextPaperSizeId) ??
      PAPER_SIZES[0];
    const nextGrid = getPrintGrid(nextPaperSize, rectangleWidthMm);
    replacePattern(pageCount * nextGrid.itemsPerPage);
  };

  const updateRectangleWidth = (nextWidth: number) => {
    setRectangleWidthMm(nextWidth);
    if (quantityMode !== "pages") return;
    const nextGrid = getPrintGrid(paperSize, nextWidth);
    replacePattern(pageCount * nextGrid.itemsPerPage);
  };

  const updateQuantityMode = (nextMode: "items" | "pages") => {
    setQuantityMode(nextMode);
    replacePattern(
      nextMode === "pages" ? pageCount * itemsPerPage : printItemCount,
    );
  };

  const updatePrintItemCount = (nextCount: number) => {
    setPrintItemCount(nextCount);
    if (quantityMode === "items") replacePattern(nextCount);
  };

  const updatePageCount = (nextCount: number) => {
    setPageCount(nextCount);
    if (quantityMode === "pages") {
      replacePattern(nextCount * itemsPerPage);
    }
  };

  const toggleGoodType = (typeId: string) => {
    setPrintGoodTypeIds((current) =>
      current.includes(typeId)
        ? current.filter((id) => id !== typeId)
        : [...current, typeId],
    );
  };

  const downloadPdf = async () => {
    setPdfError(null);
    setGeneratingPdf(true);
    try {
      await downloadMonotonyPdf({
        sequence: pattern,
        goodTypeIds: printGoodTypeIds,
        paper: paperSize,
        rectangleWidthMm,
        borderWidthMm,
        cornerRadiusMm,
        columns,
        rows,
        gapMm: GRID_GAP_MM,
      });
    } catch {
      setPdfError("The PDF could not be generated. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          onClick={prepareDialog}
          className="min-h-14 rounded-full border border-amber-300/30 bg-amber-300/5 px-7 font-bold text-amber-200 transition hover:bg-amber-300/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
        >
          Generate paper PDF
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="monotony-print-overlay fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm" />
        <div className="monotony-print-positioner pointer-events-none fixed inset-0 z-50 grid place-items-center p-3 sm:p-6">
          <Dialog.Content className="monotony-print-content pointer-events-auto flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-slate-900 text-white shadow-2xl shadow-black/70 focus:outline-none">
            <header className="monotony-print-controls flex shrink-0 items-start justify-between gap-5 border-b border-white/10 px-5 py-4 sm:px-7">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
                  Print preview
                </p>
                <Dialog.Title className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  Paper monotony PDF
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-slate-400">
                  {pattern.length} randomized squares across {pages.length}{" "}
                  {pages.length === 1 ? "page" : "pages"}. Only the test sheet
                  will be included in the downloaded PDF.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close print preview"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300"
                >
                  ×
                </button>
              </Dialog.Close>
            </header>

            <section className="monotony-print-controls max-h-[46dvh] shrink-0 overflow-y-auto border-b border-white/10 px-5 py-4 sm:px-7">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-end xl:grid-cols-6">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Paper size
                  </span>
                  <select
                    value={paperSizeId}
                    onChange={(event) =>
                      updatePaperSize(event.target.value as PaperSizeId)
                    }
                    className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 font-semibold text-white outline-none focus:border-amber-300"
                  >
                    {PAPER_SIZES.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label} · {option.widthMm} × {option.heightMm} mm
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Border width
                    <span className="font-mono text-amber-300">
                      {borderWidthMm} mm
                    </span>
                  </span>
                  <ValidatedNumberInput
                    min={MIN_BORDER_WIDTH_MM}
                    max={MAX_BORDER_WIDTH_MM}
                    step="0.1"
                    value={borderWidthMm}
                    normalize={(value) => Math.round(value * 10) / 10}
                    onValueChange={setBorderWidthMm}
                    className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 font-mono text-white outline-none focus:border-amber-300"
                  />
                </label>

                <label className="block">
                  <span className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Corner radius
                    <span className="font-mono text-amber-300">
                      {cornerRadiusMm} mm
                    </span>
                  </span>
                  <ValidatedNumberInput
                    min={MIN_CORNER_RADIUS_MM}
                    max={MAX_CORNER_RADIUS_MM}
                    step="0.5"
                    value={cornerRadiusMm}
                    normalize={(value) => Math.round(value * 2) / 2}
                    onValueChange={setCornerRadiusMm}
                    className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 font-mono text-white outline-none focus:border-amber-300"
                  />
                </label>

                <label className="block">
                  <span className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Rectangle width
                    <span className="font-mono text-amber-300">
                      {rectangleWidthMm} mm
                    </span>
                  </span>
                  <ValidatedNumberInput
                    min={MIN_RECTANGLE_WIDTH_MM}
                    max={MAX_RECTANGLE_WIDTH_MM}
                    value={rectangleWidthMm}
                    normalize={Math.round}
                    onValueChange={updateRectangleWidth}
                    className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 font-mono text-white outline-none focus:border-amber-300"
                  />
                </label>

                <fieldset>
                  <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Fill by
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1">
                    {(["items", "pages"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={quantityMode === mode}
                        onClick={() => updateQuantityMode(mode)}
                        className={`min-h-9 rounded-lg px-2 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-amber-300 ${
                          quantityMode === mode
                            ? "bg-amber-300 text-slate-950"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {mode === "items" ? "Rectangles" : "Pages"}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="block">
                  <span className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {quantityMode === "items" ? "Rectangle count" : "Page count"}
                    <span className="font-mono text-amber-300">
                      {quantityMode === "items" ? printItemCount : pageCount}
                    </span>
                  </span>
                  {quantityMode === "items" ? (
                    <ValidatedNumberInput
                      min={MIN_ITEM_COUNT}
                      max={MAX_ITEM_COUNT}
                      value={printItemCount}
                      normalize={Math.round}
                      onValueChange={updatePrintItemCount}
                      className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 font-mono text-white outline-none focus:border-amber-300"
                    />
                  ) : (
                    <ValidatedNumberInput
                      min={MIN_PAGE_COUNT}
                      max={MAX_PAGE_COUNT}
                      value={pageCount}
                      normalize={Math.round}
                      onValueChange={updatePageCount}
                      className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 font-mono text-white outline-none focus:border-amber-300"
                    />
                  )}
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/15 bg-amber-300/5 px-4 py-3 text-xs text-slate-400">
                <p>
                  <span className="font-mono font-bold text-amber-300">
                    {columns} × {rows}
                  </span>{" "}
                  · {itemsPerPage} rectangles per page
                </p>
                <p className="font-mono text-slate-300">
                  {desiredItemCount} rectangles · {pages.length}{" "}
                  {pages.length === 1 ? "page" : "pages"}
                </p>
              </div>

              <fieldset className="mt-4 border-t border-white/10 pt-4">
                <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Good symbols to circle
                </legend>
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {stimulusTypes.map((type) => {
                    const selected = printGoodTypeIds.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        type="button"
                        aria-label={`${type.label}, ${selected ? "good" : "bad"}`}
                        aria-pressed={selected}
                        onClick={() => toggleGoodType(type.id)}
                        className={`relative flex min-h-16 items-center justify-center rounded-xl border p-2 transition focus-visible:outline-2 focus-visible:outline-amber-300 ${
                          selected
                            ? "border-amber-300/60 bg-amber-300/10"
                            : "border-white/10 bg-slate-950/60 opacity-55 hover:opacity-100"
                        }`}
                      >
                        <StimulusSquare type={type} mini />
                        <span
                          aria-hidden="true"
                          className={`absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black ${
                            selected
                              ? "bg-amber-300 text-slate-950"
                              : "bg-slate-700 text-slate-400"
                          }`}
                        >
                          {selected ? "✓" : "×"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <div className="min-h-0 flex-1 overflow-auto bg-slate-800 p-3 sm:p-6">
              <div
                className="monotony-print-sheet mx-auto text-black"
                style={{ width: `${paperSize.widthMm}mm` }}
              >
                {pages.map((page, pageIndex) => (
                  <article
                    key={pageIndex}
                    className="monotony-print-page mb-5 bg-white p-[10mm] shadow-xl last:mb-0"
                    style={{
                      width: `${paperSize.widthMm}mm`,
                      minHeight: `${paperSize.heightMm}mm`,
                    }}
                  >
                    <div className="flex items-end justify-between gap-6 border-b border-black pb-3">
                      <div>
                        <h1 className="text-xl font-bold">Monotony pattern</h1>
                        <p className="mt-1 text-xs">
                          Circle every square matching one of the target types.
                        </p>
                      </div>
                      <div className="min-w-48 text-xs leading-6">
                        <p>Name: ____________________</p>
                        <p>Date: _____________________</p>
                      </div>
                    </div>

                    <div className="mt-3 flex min-h-12 items-center gap-3 border-b border-black/25 pb-3">
                      <p className="shrink-0 text-xs font-bold uppercase tracking-wider">
                        Circle these
                      </p>
                      {printGoodTypeIds.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {printGoodTypeIds.map((typeId) => (
                            <div key={typeId} className="w-9">
                              <StimulusSquare
                                type={getStimulus(typeId)}
                                printable
                                borderWidth={`${borderWidthMm}mm`}
                                cornerRadius={`${cornerRadiusMm}mm`}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs">
                          No target types selected; leave every square
                          uncircled.
                        </p>
                      )}
                    </div>

                    <div
                      className="monotony-paper-grid mt-4 grid justify-center"
                      style={{
                        gridTemplateColumns: `repeat(${columns}, ${rectangleWidthMm}mm)`,
                        gap: `${GRID_GAP_MM}mm`,
                      }}
                    >
                      {page.map((typeId, itemIndex) => (
                        <StimulusSquare
                          key={`${pageIndex}-${itemIndex}`}
                          type={getStimulus(typeId)}
                          printable
                          borderWidth={`${borderWidthMm}mm`}
                          cornerRadius={`${cornerRadiusMm}mm`}
                        />
                      ))}
                    </div>

                    <footer className="mt-4 flex justify-between border-t border-black/25 pt-2 text-[10px]">
                      <span>
                        Items {pageIndex * itemsPerPage + 1}–
                        {pageIndex * itemsPerPage + page.length}
                      </span>
                      <span>
                        Page {pageIndex + 1} of {pages.length}
                      </span>
                    </footer>
                  </article>
                ))}
              </div>
            </div>

            <footer className="monotony-print-controls flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-7">
              <p className="text-xs text-slate-500">
                {pdfError ??
                  `Generated ${generatedAt?.toLocaleTimeString() ?? "now"}`}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={generatePattern}
                  className="min-h-11 rounded-full border border-white/15 px-5 font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300"
                >
                  New pattern
                </button>
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={generatingPdf}
                  className="min-h-11 rounded-full bg-amber-300 px-6 font-bold text-slate-950 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-wait disabled:opacity-60"
                >
                  {generatingPdf ? "Generating…" : "Download PDF"}
                </button>
              </div>
            </footer>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
