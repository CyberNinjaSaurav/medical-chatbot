import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { appointmentService } from "@/services/clinical.service";
import { Card, EmptyState, PageHeader, Skeleton, Badge } from "@/components/ui/primitives";

export function DashboardPage() {
  const appts = useQuery({ queryKey: ["appointments"], queryFn: async () => (await appointmentService.list()).data });
  return (
    <div>
      <PageHeader title="Today's queue" description="Confirmed and booked consults assigned to you." />
      {appts.isLoading ? <Skeleton className="h-40" /> : appts.data?.items.length ? (
        <div className="space-y-3">
          {appts.data.items.map((a) => (
            <Card key={String(a.id)} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{String(a.status)}</p>
                <p className="text-sm text-body">{String(a.mode)} · ₹{String(a.fee)} · {String(a.payment_status)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge>{String(a.status)}</Badge>
                <Link to={`/consult/${a.id}`} className="text-sm font-semibold text-primary">Open workspace</Link>
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No patients in queue" description="Appointments appear when patients book you." />}
    </div>
  );
}
