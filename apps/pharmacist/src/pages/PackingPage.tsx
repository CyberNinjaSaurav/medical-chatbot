import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { pharmacyService } from "@/services/pharmacy.service";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { ApiError } from "@/services/api/api-error";

export function PackingPage() {
  const q = useQuery({ queryKey: ["orders"], queryFn: async () => (await pharmacyService.listOrders()).data });
  const packable = q.data?.items.filter((o) => ["verified", "packed", "dispatched"].includes(o.status)) ?? [];
  return (
    <div>
      <PageHeader title="Packing bench" description="Advance verified orders toward dispatch." />
      {q.isLoading ? <Skeleton className="h-40" /> : packable.length ? (
        <div className="space-y-3">
          {packable.map((o) => (
            <Card key={o.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{o.tracking_code}</p>
                <p className="text-sm text-body">{o.status}</p>
              </div>
              <Button variant="outline" onClick={async () => {
                try {
                  await pharmacyService.advance(o.id);
                  toast.success("Advanced"); void q.refetch();
                } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
              }}>Advance</Button>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="Nothing to pack" />}
    </div>
  );
}
