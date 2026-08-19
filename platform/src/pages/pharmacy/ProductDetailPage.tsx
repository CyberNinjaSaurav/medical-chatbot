import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { pharmacyService } from "@/services/commerce.service";
import { useCartStore } from "@/store/cart-store";
import { EmptyState, PageHeader, Skeleton, Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PharmacyLicenceChrome } from "@/components/healthcare/PharmacyLicenceChrome";

export function ProductDetailPage() {
  const { id = "" } = useParams();
  const addItem = useCartStore((s) => s.addItem);
  const product = useQuery({
    queryKey: ["product", id],
    enabled: !!id,
    queryFn: async () => (await pharmacyService.product(id)).data,
  });

  if (product.isLoading) {
    return (
      <div className="mx-auto max-w-container px-4 py-10">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!product.data) {
    return (
      <div className="mx-auto max-w-container px-4 py-10">
        <EmptyState title="Product not found" action={<Link to="/pharmacy">Back to store</Link>} />
      </div>
    );
  }

  const p = product.data;

  return (
    <div className="mx-auto max-w-container px-4 py-10">
      <Helmet>
        <title>{p.name} · Pharmacy · GWAK</title>
      </Helmet>
      <Link to="/pharmacy" className="text-sm font-semibold text-primary">
        ← Pharmacy
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <PageHeader title={p.name} description={p.composition || undefined} />
          <div className="mt-4 flex flex-wrap gap-2">
            {p.rx_required ? <Badge tone="warning">Prescription required</Badge> : <Badge tone="success">OTC</Badge>}
            <Badge tone="neutral">{p.schedule_tier}</Badge>
            <Badge tone="neutral">{p.category}</Badge>
          </div>
          <dl className="mt-6 space-y-2 text-sm text-body">
            <div>
              <dt className="font-medium text-heading">Manufacturer</dt>
              <dd>{p.manufacturer || "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-heading">SKU</dt>
              <dd>{p.sku}</dd>
            </div>
            <div>
              <dt className="font-medium text-heading">MRP</dt>
              <dd>₹{p.mrp}</dd>
            </div>
          </dl>
        </div>
        <Card className="h-fit">
          <p className="text-3xl font-bold text-heading">₹{p.price}</p>
          {p.rx_required ? (
            <p className="mt-3 text-sm text-body">
              Attach a prescription at checkout. Pharmacist verification is mandatory before packing.
            </p>
          ) : (
            <p className="mt-3 text-sm text-body">OTC — add freely and check out without a prescription.</p>
          )}
          <Button
            className="mt-6 w-full"
            onClick={() => {
              addItem({
                productId: p.id,
                name: p.name,
                price: p.price,
                qty: 1,
                rxRequired: p.rx_required,
              });
              toast.success("Added to cart");
            }}
          >
            Add to cart
          </Button>
          <Link
            to="/pharmacy/cart"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border py-3 text-sm font-semibold text-heading"
          >
            View cart
          </Link>
        </Card>
      </div>
      <PharmacyLicenceChrome />
    </div>
  );
}
