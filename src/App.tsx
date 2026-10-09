import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import CapacityToActPage from "./pages/CapacityToActPage";
import DividedAttentionPage from "./pages/DividedAttentionPage";
import DistributiveAttentionPage from "./pages/DistributiveAttentionPage";
import HomePage from "./pages/HomePage";
import MonotonyPage from "./pages/MonotonyPage";
import PerceptionPage from "./pages/PerceptionPage";
import ReactionTimePage from "./pages/ReactionTimePage";
import ShortTermMemoryPage from "./pages/ShortTermMemoryPage";
import TowerOfHanoiPage from "./pages/TowerOfHanoiPage";
import SwitchReasoningPage from "./pages/SwitchReasoningPage";
const DigitChallengePage = lazy(() => import("./pages/DigitChallengePage"));
const DeductiveReasoningPage = lazy(() => import("./pages/DeductiveReasoningPage"));
const OddOneOutPage = lazy(() => import("./pages/OddOneOutPage"));
const GridClassificationPage = lazy(() => import("./pages/GridClassificationPage"));
const GreenGreyClassificationPage = lazy(() => import("./pages/GreenGreyClassificationPage"));

const pageTitles: Record<string, string> = {
  "/": "PSY Practice Lab",
  "/reaction-time": "Reaction Time · PSY Practice Lab",
  "/short-term-memory": "Short-Term Memory · PSY Practice Lab",
  "/divided-attention": "Divided Attention · PSY Practice Lab",
  "/monotony": "Performance Under Monotony · PSY Practice Lab",
  "/capacity-to-act": "Capacity to Act · PSY Practice Lab",
  "/tower-of-hanoi": "Tower of Hanoi · PSY Practice Lab",
  "/distributive-attention": "Distributive Attention · PSY Practice Lab",
  "/perception": "Perception · PSY Practice Lab",
  "/deductive-reasoning": "Deductive Reasoning · PSY Practice Lab",
  "/switch-reasoning": "Switch Reasoning · PSY Practice Lab",
  "/digit-challenge": "Digit Challenge · PSY Practice Lab",
  "/odd-one-out": "Odd One Out · PSY Practice Lab",
  "/grid-classification": "Grid Classification · PSY Practice Lab",
  "/green-grey-classification": "Green/Grey Classification · PSY Practice Lab",
};

export default function App() {
  const location = useLocation();

  useEffect(() => {
    const basePath = location.pathname.replace(/\/(test|result)\/?$/, "");
    document.title = pageTitles[basePath] ?? "PSY Practice Lab";
  }, [location.pathname]);

  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950 p-8 text-white"><p role="status">Loading test…</p></main>}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/reaction-time/*" element={<ReactionTimePage />} />
      <Route path="/short-term-memory/*" element={<ShortTermMemoryPage />} />
      <Route path="/divided-attention/*" element={<DividedAttentionPage />} />
      <Route path="/monotony/*" element={<MonotonyPage />} />
      <Route path="/capacity-to-act/*" element={<CapacityToActPage />} />
      <Route path="/tower-of-hanoi/*" element={<TowerOfHanoiPage />} />
      <Route
        path="/distributive-attention/*"
        element={<DistributiveAttentionPage />}
      />
      <Route path="/perception/*" element={<PerceptionPage />} />
      <Route path="/deductive-reasoning/*" element={<DeductiveReasoningPage />} />
      <Route path="/switch-reasoning/*" element={<SwitchReasoningPage />} />
      <Route path="/digit-challenge/*" element={<DigitChallengePage />} />
      <Route path="/odd-one-out/*" element={<OddOneOutPage />} />
      <Route path="/grid-classification/*" element={<GridClassificationPage />} />
      <Route path="/green-grey-classification/*" element={<GreenGreyClassificationPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
