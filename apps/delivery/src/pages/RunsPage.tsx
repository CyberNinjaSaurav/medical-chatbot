import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deliveryService } from "@/services/delivery.service";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { ApiError } from "@/services/api/api-error";

export function RunsPage() {
  const q = useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await deliveryService.listOrders()).data,
    refetchInterval: 15_000,
  });
  const runs = q.data?.items.filter((o) =>
    ["packed", "dispatched", "out_for_delivery"].includes(o.status),
  ) ?? [];

  return (
    <div>
      <PageHeader title="Assigned runs" description="Advance status at each handoff. OTP PoD comes in a later phase." />
      {q.isLoading ? <Skeleton className="h-40" /> : runs.length ? (
        <div className="space-y-3">
          {runs.map((o) => (
            <Card key={o.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-heading">{o.tracking_code}</p>
                  <p className="text-sm text-body">₹{o.total}</p>
                </div>
                <Badge tone="warning">{o.status.replaceAll("_", " ")}</Badge>
              </div>
              <Button className="w-full" onClick={async () => {
                try {
                  const { data } = await deliveryService.advance(o.id);
                  toast.success(`Now ${(data as { status: string }).status}`);
                  void q.refetch();
                } catch (e) { toast.error(e instanceof ApiError ? e.message : "Cannot advance"); }
              }}>
                Mark next status
              </Button>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No active deliveries" description="Packed / dispatched orders show up here." />}
    </div>
  );
}
