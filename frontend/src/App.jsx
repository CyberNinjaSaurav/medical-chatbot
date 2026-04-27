import { useEffect, useState } from "react";
import Chat from "./components/Chat";
import AdminPage from "./pages/AdminPage";
import AppointmentPage from "./pages/AppointmentPage";
import HomePage from "./pages/HomePage";
import MedicineDeliveryPage from "./pages/MedicineDeliveryPage";

const pages = [
  { id: "home", label: "Home" },
  { id: "chat", label: "Chat" },
  { id: "appointment", label: "Appointment" },
  { id: "delivery", label: "Medicine Delivery" },
  { id: "admin", label: "Admin" },
];

const getPageFromHash = () => {
  const cleaned = window.location.hash.replace(/^#\/?/, "");
  if (!cleaned) return "home";
  return pages.some((page) => page.id === cleaned) ? cleaned : "home";
};

function App() {
  const [activePage, setActivePage] = useState(getPageFromHash());

  useEffect(() => {
    const syncRoute = () => setActivePage(getPageFromHash());
    window.addEventListener("hashchange", syncRoute);
    syncRoute();

    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  const navigateTo = (pageId) => {
    window.location.hash = pageId === "home" ? "/" : pageId;
  };

  return (
    <div className="min-h-screen bg-app-bg text-slate-100">
      {activePage !== "home" && (
        <header className="border-b border-panel-border bg-panel-bg/80 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <h1 className="text-base font-semibold sm:text-lg">Medical Assistant Platform</h1>
            <nav className="flex flex-wrap gap-2">
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => navigateTo(page.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                    activePage === page.id
                      ? "bg-blue-600 text-white"
                      : "border border-panel-border bg-slate-900/60 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {page.label}
                </button>
              ))}
            </nav>
          </div>
        </header>
      )}

      <main>
        {activePage === "home" && <HomePage onNavigate={navigateTo} />}
        {activePage === "chat" && (
          <div className="h-[calc(100vh-73px)]">
            <Chat />
          </div>
        )}
        {activePage === "appointment" && <AppointmentPage />}
        {activePage === "delivery" && <MedicineDeliveryPage />}
        {activePage === "admin" && <AdminPage />}
      </main>
    </div>
  );
}

export default App;
