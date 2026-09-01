import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";

export function CompliancePage() {
  const h1 = useQuery({ queryKey: ["h1"], queryFn: async () => (await adminService.h1Register()).data });
  return (
    <div>
      <PageHeader title="H1 register" description="Schedule H1 dispense log for compliance." />
      {h1.isLoading ? <Skeleton className="h-40" /> : h1.data?.items?.length ? (
        <div className="space-y-2">
          {h1.data.items.map((r, i) => (
            <Card key={i} className="!p-4 text-sm">
              {String(r.product)} × {String(r.qty)} · order {String(r.order_id).slice(0, 8)} · {String(r.verified_at)}
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No H1 rows yet" />}
    </div>
  );
}
