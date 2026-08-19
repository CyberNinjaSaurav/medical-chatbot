import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { pharmacyService } from "@/services/commerce.service";
import { EmptyState, PageHeader, Skeleton, Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/services/api/api-error";

export function SubscriptionsPage() {
  const qc = useQueryClient();
  const [productId, setProductId] = useState("");
  const [cadence, setCadence] = useState("30");

  const subs = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => (await pharmacyService.subscriptions()).data,
  });

  const create = useMutation({
    mutationFn: async () =>
      pharmacyService.createSubscription({
        product_id: productId.trim(),
        cadence_days: Number(cadence) || 30,
      }),
    onSuccess: () => {
      toast.success("Refill subscription created");
      setProductId("");
      void qc.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not create subscription"),
  });

  const dueSoon = (subs.data?.items || []).filter((s) => {
    if (!s.next_refill_at || s.status !== "active") return false;
    const due = new Date(String(s.next_refill_at)).getTime();
    return due - Date.now() < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <div>
      <PageHeader
        title="Refill subscriptions"
        description="Chronic medicines on a cadence. Create after you know the catalog product id."
      />
      {dueSoon.length ? (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <p className="font-semibold text-heading">{dueSoon.length} refill(s) due soon</p>
          <Link to="/pharmacy" className="mt-2 inline-block text-sm font-semibold text-primary">
            Order now
          </Link>
        </Card>
      ) : null}
      {subs.isLoading ? (
        <Skeleton className="h-40" />
      ) : subs.data?.items.length ? (
        <div className="space-y-3">
          {subs.data.items.map((s) => (
            <Card key={String(s.id)} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">Product {String(s.product_id).slice(0, 8)}…</p>
                <p className="text-sm text-body">
                  Every {String(s.cadence_days)} days
                  {s.next_refill_at ? ` · next ${new Date(String(s.next_refill_at)).toLocaleDateString()}` : ""}
                </p>
              </div>
              <Badge tone={s.status === "active" ? "success" : "neutral"}>{String(s.status)}</Badge>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No active refill subscriptions"
          description="Subscribe after a fulfilled order, or browse pharmacy for chronic care meds."
          action={<Link to="/pharmacy">Browse pharmacy</Link>}
        />
      )}
      <Card className="mt-8 max-w-lg space-y-3">
        <h3 className="font-semibold text-heading">Start a refill</h3>
        <Input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="Product ID from catalog" />
        <Input
          value={cadence}
          onChange={(e) => setCadence(e.target.value)}
          placeholder="Cadence days (e.g. 30)"
          type="number"
        />
        <Button
          disabled={!productId.trim()}
          loading={create.isPending}
          onClick={() => create.mutate()}
        >
          Create subscription
        </Button>
      </Card>
    </div>
  );
}
