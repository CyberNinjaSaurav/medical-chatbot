import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnly } from "@/routes/guards";
import { Shell } from "@/components/Shell";
import { LoginPage } from "@/pages/LoginPage";
import { QueuePage } from "@/pages/QueuePage";
import { PackingPage } from "@/pages/PackingPage";
import { H1Page } from "@/pages/H1Page";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnly />}><Route path="/login" element={<LoginPage />} /></Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route index element={<QueuePage />} />
            <Route path="packing" element={<PackingPage />} />
            <Route path="h1" element={<H1Page />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
