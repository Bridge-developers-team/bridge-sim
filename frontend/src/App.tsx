import { IntroPage } from "./routes/IntroPage";
import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { ReferenceGate } from "./components/ReferenceGate";
import { LandingPage } from "./routes/LandingPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { PathsPage } from "./routes/PathsPage";
import { PlanPage } from "./routes/PlanPage";
import { PracticePage } from "./routes/PracticePage";
import { ProofPage } from "./routes/ProofPage";
import { StartPage } from "./routes/StartPage";
import { TastePage } from "./routes/TastePage";

export function App() {
  return (
    <Routes>
      <Route
        element={
          <ReferenceGate>
            <Layout />
          </ReferenceGate>
        }
      >
        <Route index element={<LandingPage />} />
        <Route path="start" element={<StartPage />} />
        <Route path="paths" element={<PathsPage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="practice/:taskId" element={<PracticePage />} />
        <Route path="meet/:careerId" element={<IntroPage />} />
        <Route path="taste/:careerId" element={<TastePage />} />
        <Route path="p/:proofId" element={<ProofPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
