import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { pharmacyService } from "@/services/commerce.service";
import { EmptyState, PageHeader, Skeleton, Card, Badge } from "@/components/ui/primitives";

export function OrdersListPage() {
  const query = useQuery({ queryKey: ["orders"], queryFn: async () => (await pharmacyService.listOrders()).data });
  return (
    <div>
      <PageHeader title="Orders" description="Track pharmacy fulfilment. Rx items never skip pharmacist verification." />
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : query.data?.items.length ? (
        <div className="space-y-3">
          {query.data.items.map((o) => (
            <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{o.tracking_code}</p>
                <p className="text-sm text-body">
                  {o.status} · ₹{o.total}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={o.status === "delivered" ? "success" : "primary"}>{o.status}</Badge>
                <Link to={`/app/orders/${o.id}`} className="text-sm font-semibold text-primary">
                  Track
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No orders yet" action={<Link to="/pharmacy">Go to pharmacy</Link>} />
      )}
    </div>
  );
}

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const order = useQuery({
    queryKey: ["order", id],
    enabled: !!id,
    queryFn: async () => (await pharmacyService.getOrder(id)).data as {
      id: string;
      status: string;
      total: number;
      tracking_code: string;
      address: Record<string, unknown>;
      prescription_id: string | null;
      items: Array<{ id: string; name: string; qty: number; unit_price: number; rx_required: boolean }>;
    },
  });
  const tracking = useQuery({
    queryKey: ["tracking", id],
    enabled: !!id,
    queryFn: async () =>
      (await pharmacyService.track(id)).data as {
        status: string;
        current: string;
        timeline: string[];
      },
  });

  if (order.isLoading) return <Skeleton className="h-48" />;
  if (!order.data) {
    return <EmptyState title="Order not found" action={<Link to="/app/orders">Back</Link>} />;
  }

  const o = order.data;
  const steps = tracking.data?.timeline ?? [];
  const current = tracking.data?.current || o.status;

  return (
    <div>
      <Link to="/app/orders" className="text-sm font-semibold text-primary">
        ← Orders
      </Link>
      <PageHeader title={o.tracking_code} description={`Status: ${o.status}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-heading">Items</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {o.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span>
                  {i.name} × {i.qty}
                  {i.rx_required ? " · Rx" : ""}
                </span>
                <span>₹{(i.unit_price * i.qty).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-bold text-heading">Total ₹{o.total}</p>
          {o.prescription_id ? (
            <p className="mt-2 text-sm text-body">Prescription linked for verification.</p>
          ) : null}
        </Card>
        <Card>
          <h3 className="font-semibold text-heading">Tracking</h3>
          <ol className="mt-4 space-y-2">
            {steps.map((step) => {
              const reached = steps.indexOf(step) <= steps.indexOf(current) || step === current;
              const active = step === current;
              return (
                <li
                  key={step}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    active ? "bg-blue-50 font-semibold text-primary" : reached ? "text-heading" : "text-body"
                  }`}
                >
                  {step.replaceAll("_", " ")}
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </div>
  );
}
