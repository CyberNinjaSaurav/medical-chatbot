import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnly } from "@/routes/guards";
import { Shell } from "@/components/Shell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { WorkspacePage } from "@/pages/WorkspacePage";
import { PrescriptionsPage } from "@/pages/PrescriptionsPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="consult" element={<WorkspacePage />} />
            <Route path="consult/:id" element={<WorkspacePage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
