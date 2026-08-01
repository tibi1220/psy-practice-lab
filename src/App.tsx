import { useEffect } from "react";
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
};

export default function App() {
  const location = useLocation();

  useEffect(() => {
    const basePath = location.pathname.replace(/\/(test|result)\/?$/, "");
    document.title = pageTitles[basePath] ?? "PSY Practice Lab";
  }, [location.pathname]);

  return (
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
