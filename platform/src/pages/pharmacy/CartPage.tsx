import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useCartStore } from "@/store/cart-store";
import { EmptyState, PageHeader, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PharmacyLicenceChrome } from "@/components/healthcare/PharmacyLicenceChrome";

export function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const setQty = useCartStore((s) => s.setQty);
  const total = useCartStore((s) => s.total);
  const prescriptionId = useCartStore((s) => s.prescriptionId);
  const needsRx = items.some((i) => i.rxRequired);

  return (
    <div className="mx-auto max-w-container px-4 py-10">
      <Helmet>
        <title>Cart · Pharmacy · GWAK</title>
      </Helmet>
      <PageHeader title="Cart" description="Review quantities before checkout." />
      {!items.length ? (
        <EmptyState title="Cart is empty" action={<Link to="/pharmacy">Browse pharmacy</Link>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {items.map((i) => (
              <Card key={i.productId} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link to={`/pharmacy/p/${i.productId}`} className="font-semibold text-heading hover:text-primary">
                    {i.name}
                  </Link>
                  <p className="text-sm text-body">
                    ₹{i.price} {i.rxRequired ? "· Rx required" : "· OTC"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQty(i.productId, Math.max(1, i.qty - 1))}
                    aria-label="Decrease"
                  >
                    −
                  </Button>
                  <span className="w-8 text-center font-semibold">{i.qty}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQty(i.productId, i.qty + 1)}
                    aria-label="Increase"
                  >
                    +
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeItem(i.productId)}>
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Card className="h-fit">
            <p className="text-sm text-body">Subtotal</p>
            <p className="mt-1 text-2xl font-bold text-heading">₹{total().toFixed(2)}</p>
            {needsRx && !prescriptionId ? (
              <p className="mt-3 text-sm text-amber-800">
                Cart has Rx items. Attach a prescription from{" "}
                <Link to="/app/prescriptions" className="font-semibold text-primary">
                  Prescriptions
                </Link>{" "}
                before checkout.
              </p>
            ) : null}
            {prescriptionId ? (
              <p className="mt-3 text-sm text-body">Prescription linked for verification.</p>
            ) : null}
            <Link
              to="/pharmacy/checkout"
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary font-semibold text-white"
            >
              Checkout
            </Link>
          </Card>
        </div>
      )}
      <PharmacyLicenceChrome />
    </div>
  );
}
