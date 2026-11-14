import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { LandingPage } from "./routes/LandingPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { PathsPage } from "./routes/PathsPage";
import { PlanPage } from "./routes/PlanPage";
import { PracticePage } from "./routes/PracticePage";
import { ProofPage } from "./routes/ProofPage";
import { StartPage } from "./routes/StartPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="start" element={<StartPage />} />
        <Route path="paths" element={<PathsPage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="practice/:taskId" element={<PracticePage />} />
        <Route path="p/:proofId" element={<ProofPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
