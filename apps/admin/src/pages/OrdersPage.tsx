import { useQuery } from "@tanstack/react-query";
import { ordersService } from "@/services/admin.service";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";

export function OrdersPage() {
  const q = useQuery({ queryKey: ["orders"], queryFn: async () => (await ordersService.list()).data });
  return (
    <div>
      <PageHeader title="Orders" description="All pharmacy orders visible to ops." />
      {q.isLoading ? <Skeleton className="h-40" /> : q.data?.items?.length ? (
        <div className="space-y-2">
          {q.data.items.map((o) => (
            <Card key={String(o.id)} className="flex justify-between !p-4 text-sm">
              <span className="font-mono">{String(o.tracking_code)}</span>
              <span>₹{String(o.total)}</span>
              <Badge>{String(o.status)}</Badge>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No orders" />}
    </div>
  );
}
