import { Route, Routes } from "react-router-dom";

import { MainLayout } from "./layouts/MainLayout";
import { Dashboard } from "./pages/Dashboard";
import { Projects } from "./pages/Projects";
import { RepositoryAnalysis } from "./pages/RepositoryAnalysis";
import { RiskAnalysis } from "./pages/RiskAnalysis";
import { Settings } from "./pages/Settings";

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/repository-analysis" element={<RepositoryAnalysis />} />
        <Route path="/risk-analysis" element={<RiskAnalysis />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
