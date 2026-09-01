import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { pharmacyService } from "@/services/pharmacy.service";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { ApiError } from "@/services/api/api-error";

export function QueuePage() {
  const q = useQuery({ queryKey: ["orders"], queryFn: async () => (await pharmacyService.listOrders()).data });
  const pending = q.data?.items.filter((o) => o.status === "rx_verification_pending") ?? [];
  return (
    <div>
      <PageHeader title="Verification queue" description="Cannot be skipped. Every verify/reject is audited." />
      {q.isLoading ? <Skeleton className="h-40" /> : pending.length ? (
        <div className="space-y-3">
          {pending.map((o) => (
            <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{o.tracking_code}</p>
                <p className="text-sm text-body">₹{o.total}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={async () => {
                  try {
                    await pharmacyService.verify(o.id, "Verified against Rx");
                    toast.success("Verified"); void q.refetch();
                  } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
                }}>Verify</Button>
                <Button variant="danger" onClick={async () => {
                  try {
                    await pharmacyService.reject(o.id, "Rx incomplete");
                    toast.success("Rejected"); void q.refetch();
                  } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
                }}>Reject</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="Queue clear" description="No orders awaiting pharmacist verification." />}
      <h2 className="mt-10 text-lg font-semibold text-heading">Recent orders</h2>
      <div className="mt-3 space-y-2">
        {(q.data?.items || []).slice(0, 10).map((o) => (
          <Card key={o.id} className="flex justify-between !py-3 text-sm">
            <span>{o.tracking_code}</span>
            <Badge tone={o.status === "rx_verification_pending" ? "warning" : "neutral"}>{o.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
