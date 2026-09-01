import { useQuery } from "@tanstack/react-query";
import { prescriptionService } from "@/services/clinical.service";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";

export function PrescriptionsPage() {
  const q = useQuery({ queryKey: ["rx"], queryFn: async () => (await prescriptionService.list()).data });
  return (
    <div>
      <PageHeader title="Issued prescriptions" description="Registration number is printed on every e-Rx." />
      {q.isLoading ? <Skeleton className="h-40" /> : q.data?.items?.length ? (
        <div className="space-y-3">
          {q.data.items.map((rx) => (
            <Card key={String(rx.id)}>
              <p className="font-semibold text-heading">Rx {String(rx.id).slice(0, 8)}</p>
              <p className="text-sm text-body">Reg. {String(rx.registration_no || "—")}</p>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No prescriptions issued yet" />}
    </div>
  );
}
