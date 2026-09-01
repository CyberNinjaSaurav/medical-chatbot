import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnly } from "@/routes/guards";
import { Shell } from "@/components/Shell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { OpsPage } from "@/pages/OpsPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { CompliancePage } from "@/pages/CompliancePage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnly />}><Route path="/login" element={<LoginPage />} /></Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="ops" element={<OpsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="compliance" element={<CompliancePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
