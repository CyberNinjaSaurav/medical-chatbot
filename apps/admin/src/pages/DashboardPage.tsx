import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { Card, PageHeader, Skeleton } from "@/components/ui/primitives";

export function DashboardPage() {
  const dash = useQuery({ queryKey: ["admin-dash"], queryFn: async () => (await adminService.dashboard()).data });
  const audit = useQuery({ queryKey: ["audit"], queryFn: async () => (await adminService.audit()).data });
  return (
    <div>
      <PageHeader title="Ops dashboard" description="Live counts from Neon — no mock KPIs." />
      {dash.isLoading ? <Skeleton className="h-28" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(dash.data || {}).map(([k, v]) => (
            <Card key={k} className="!p-4">
              <p className="text-xs uppercase tracking-wide text-body">{k.replaceAll("_", " ")}</p>
              <p className="mt-1 text-2xl font-bold text-heading">{v}</p>
            </Card>
          ))}
        </div>
      )}
      <h2 className="mt-10 text-lg font-semibold text-heading">Audit log</h2>
      <div className="mt-3 space-y-2">
        {(audit.data?.items || []).slice(0, 25).map((a) => (
          <div key={String(a.id)} className="rounded-md border border-border bg-card px-3 py-2 text-xs font-mono text-body">
            {String(a.action)} · {String(a.resource_type)} · {String(a.created_at)}
          </div>
        ))}
      </div>
    </div>
  );
}
