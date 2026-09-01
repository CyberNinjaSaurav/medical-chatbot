import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnly } from "@/routes/guards";
import { Shell } from "@/components/Shell";
import { LoginPage } from "@/pages/LoginPage";
import { RunsPage } from "@/pages/RunsPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnly />}><Route path="/login" element={<LoginPage />} /></Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route index element={<RunsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
