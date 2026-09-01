import { useQuery } from "@tanstack/react-query";
import { pharmacyService } from "@/services/pharmacy.service";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";

export function H1Page() {
  const q = useQuery({ queryKey: ["h1"], queryFn: async () => (await pharmacyService.h1Register()).data });
  return (
    <div>
      <PageHeader title="Schedule H1 register" />
      {q.isLoading ? <Skeleton className="h-40" /> : q.data?.items?.length ? (
        <div className="space-y-2">
          {q.data.items.map((r, i) => (
            <Card key={i} className="text-sm">{String(r.product)} × {String(r.qty)} · {String(r.verified_at)}</Card>
          ))}
        </div>
      ) : <EmptyState title="No H1 dispenses logged" />}
    </div>
  );
}
