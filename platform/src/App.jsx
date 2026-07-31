import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Chat from "./components/Chat";
import Layout from "./components/Layout";
import AdminPage from "./pages/AdminPage";
import AppointmentPage from "./pages/AppointmentPage";
import DashboardPage from "./pages/DashboardPage";
import MedicineDeliveryPage from "./pages/MedicineDeliveryPage";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            path="medical-chat"
            element={
              <div className="h-[calc(100vh-13rem)] min-h-[640px] overflow-hidden rounded-xl border border-panel-border bg-slate-950/50">
                <Chat />
              </div>
            }
          />
          <Route path="appointments" element={<AppointmentPage />} />
          <Route path="pharmacy" element={<MedicineDeliveryPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
