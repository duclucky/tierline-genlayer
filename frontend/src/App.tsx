import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AssessmentsPage } from "./pages/AssessmentsPage";
import { AssessmentDetailPage } from "./pages/AssessmentDetailPage";
import { CreditsPage } from "./pages/CreditsPage";
import { HomePage } from "./pages/HomePage";
import { MethodologyPage } from "./pages/MethodologyPage";
import { NewAssessmentPage } from "./pages/NewAssessmentPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="assessments" element={<AssessmentsPage />} />
        <Route path="assessments/new" element={<NewAssessmentPage />} />
        <Route path="assessments/:assessmentId" element={<AssessmentDetailPage />} />
        <Route path="credits" element={<CreditsPage />} />
        <Route path="methodology" element={<MethodologyPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

