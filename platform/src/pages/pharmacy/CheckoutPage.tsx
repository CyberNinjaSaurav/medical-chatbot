import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { pharmacyService } from "@/services/commerce.service";
import { useCartStore } from "@/store/cart-store";
import { EmptyState, PageHeader, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PharmacyLicenceChrome } from "@/components/healthcare/PharmacyLicenceChrome";
import { ApiError } from "@/services/api/api-error";

export function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total);
  const clear = useCartStore((s) => s.clear);
  const prescriptionId = useCartStore((s) => s.prescriptionId);
  const setPrescription = useCartStore((s) => s.setPrescription);
  const needsRx = items.some((i) => i.rxRequired);
  const [line1, setLine1] = useState("Pune");
  const [city, setCity] = useState("Pune");
  const [pincode, setPincode] = useState("411001");
  const [slot, setSlot] = useState("morning");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const rx = params.get("rx");
    if (rx) setPrescription(rx);
  }, [params, setPrescription]);

  const placeOrder = async () => {
    if (needsRx && !prescriptionId) {
      toast.error("Attach a prescription for Rx medicines before checkout");
      return;
    }
    if (!items.length && !prescriptionId) {
      toast.error("Cart is empty");
      return;
    }
    setSubmitting(true);
    try {
      const address = { line1, city, pincode };
      let orderId: string;
      if (!items.length && prescriptionId) {
        const order = await pharmacyService.fromPrescription(prescriptionId, address);
        orderId = order.data.id;
        await pharmacyService.payOrder(orderId);
      } else {
        const order = await pharmacyService.createOrder({
          items: items.map((i) => ({ product_id: i.productId, qty: i.qty })),
          address,
          prescription_id: prescriptionId,
          delivery_slot: slot,
        });
        orderId = order.data.id;
        await pharmacyService.payOrder(orderId);
      }
      clear();
      toast.success("Order paid");
      navigate(`/app/orders/${orderId}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!items.length && !prescriptionId) {
    return (
      <div className="mx-auto max-w-container px-4 py-10">
        <EmptyState title="Nothing to check out" action={<Link to="/pharmacy">Browse pharmacy</Link>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-container px-4 py-10">
      <Helmet>
        <title>Checkout · Pharmacy · GWAK</title>
      </Helmet>
      <PageHeader
        title="Checkout"
        description="Pay to place the order. Rx carts go to pharmacist verification after payment."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="space-y-4">
          <h3 className="font-semibold text-heading">Delivery address</h3>
          <Input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Address line" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="PIN code" />
          </div>
          <label className="block text-sm font-medium text-heading">
            Delivery slot
            <select
              className="mt-2 h-11 w-full rounded-xl border border-border px-3"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </label>
          {needsRx || prescriptionId ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
              {prescriptionId ? (
                <p>
                  Prescription <span className="font-mono">{prescriptionId.slice(0, 8)}…</span> will be sent for
                  pharmacist verification.
                </p>
              ) : (
                <p>
                  Rx medicines in cart —{" "}
                  <Link to="/app/prescriptions" className="font-semibold text-primary">
                    choose a prescription
                  </Link>{" "}
                  first.
                </p>
              )}
            </div>
          ) : null}
          {!items.length && prescriptionId ? (
            <p className="text-sm text-body">
              Cart is empty. Checkout will order catalog-linked items from this prescription when available.
            </p>
          ) : null}
        </Card>
        <Card className="h-fit">
          <h3 className="font-semibold text-heading">Order summary</h3>
          {items.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {items.map((i) => (
                <li key={i.productId} className="flex justify-between gap-2">
                  <span>
                    {i.name} × {i.qty}
                  </span>
                  <span>₹{(i.price * i.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-body">Prescription one-tap order</p>
          )}
          <p className="mt-4 text-xl font-bold text-heading">
            {items.length ? `₹${total().toFixed(2)}` : "Total at payment"}
          </p>
          <Button
            className="mt-4 w-full"
            loading={submitting}
            disabled={needsRx && !prescriptionId}
            onClick={() => void placeOrder()}
          >
            Pay & place order
          </Button>
          <Link to="/pharmacy/cart" className="mt-3 block text-center text-sm font-semibold text-primary">
            Back to cart
          </Link>
        </Card>
      </div>
      <PharmacyLicenceChrome />
    </div>
  );
}
