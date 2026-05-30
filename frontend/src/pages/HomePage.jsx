import { useEffect, useState } from "react";

const fallbackContent = {
  badge: "Medical Assistant Platform",
  title: "Healthcare support in one place",
  description: "Use chat for quick guidance, manage appointments, place medicine orders, and handle operations from admin tools.",
  primary_button: { label: "Start with Chat", target: "chat" },
  destinations: [
    {
      id: "chat",
      title: "Medical Chat",
      description: "Start a symptom or medicine-related conversation with the assistant.",
      buttonLabel: "Open Chat",
    },
    {
      id: "appointment",
      title: "Book Appointment",
      description: "Schedule a doctor visit and track your recent appointments.",
      buttonLabel: "Go to Appointments",
    },
    {
      id: "delivery",
      title: "Medicine Delivery",
      description: "Browse the medicine catalogue and place a delivery order.",
      buttonLabel: "Order Medicines",
    },
    {
      id: "admin",
      title: "Admin Panel",
      description: "Manage catalogue items and upload medicine inventory in bulk.",
      buttonLabel: "Open Admin",
    },
  ],
};

function HomePage({ onNavigate }) {
  const [content, setContent] = useState(fallbackContent);

  useEffect(() => {
    const loadHomeContent = async () => {
      const response = await fetch("/api/home-content");
      const data = await response.json();
      setContent({ ...fallbackContent, ...data });
    };

    loadHomeContent().catch(() => undefined);
  }, []);

  const primaryTarget = content?.primary_button?.target || "chat";
  const primaryLabel = content?.primary_button?.label || "Start with Chat";

  return (
    <div className="min-h-screen bg-app-bg px-4 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-6xl">
        <section className="rounded-3xl border border-panel-border bg-panel-bg/70 p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">{content.badge}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h1>
          <p className="mt-4 max-w-3xl text-sm text-slate-300 sm:text-base">{content.description}</p>
          <button
            type="button"
            onClick={() => onNavigate(primaryTarget)}
            className="mt-7 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            {primaryLabel}
          </button>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {(content.destinations || []).map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-panel-border bg-panel-bg/60 p-5 shadow-soft transition hover:border-slate-500/60"
            >
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{item.description}</p>
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                className="mt-4 rounded-lg border border-panel-border bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              >
                {item.buttonLabel}
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

export default HomePage;
