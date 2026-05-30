const metrics = [
  { label: "Active Patients", value: "1,248", detail: "42 awaiting triage" },
  { label: "Today Appointments", value: "86", detail: "14 teleconsultations" },
  { label: "Open Pharmacy Orders", value: "32", detail: "8 ready to dispatch" },
  { label: "Care Team Online", value: "19", detail: "Doctors and coordinators" },
];

const activity = [
  "Cardiology follow-up scheduled for 11:30 AM",
  "Three prescription refill requests need review",
  "Inventory sync completed for pharmacy catalogue",
];

function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-panel-border bg-panel-bg/75 p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Hospital Management System</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Operational command center</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Monitor patients, consultations, pharmacy fulfilment, and administrative workflows from one role-aware workspace.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <article key={item.label} className="rounded-xl border border-panel-border bg-slate-900/70 p-4 shadow-soft">
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold">{item.value}</p>
            <p className="mt-2 text-xs text-slate-400">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-panel-border bg-panel-bg/70 p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <div className="mt-4 space-y-3">
          {activity.map((item) => (
            <div key={item} className="rounded-lg border border-panel-border bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
