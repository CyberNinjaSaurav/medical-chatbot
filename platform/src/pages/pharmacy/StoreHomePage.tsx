import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { pharmacyService } from "@/services/commerce.service";
import { useCartStore } from "@/store/cart-store";
import { EmptyState, PageHeader, Skeleton, Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PharmacyLicenceChrome } from "@/components/healthcare/PharmacyLicenceChrome";
import type { Product } from "@/types/api";

const CATEGORIES = ["General", "Chronic", "Wellness", "Devices"];

export function StoreHomePage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [search, setSearch] = useState(q);
  const addItem = useCartStore((s) => s.addItem);
  const prescriptionId = useCartStore((s) => s.prescriptionId);

  const products = useQuery({
    queryKey: ["products", q],
    queryFn: async () => (await pharmacyService.products({ q: q || undefined })).data,
  });

  const runSearch = () => {
    const next = new URLSearchParams(params);
    if (search.trim()) next.set("q", search.trim());
    else next.delete("q");
    setParams(next);
  };

  return (
    <div className="mx-auto max-w-container px-4 py-10">
      <Helmet>
        <title>Pharmacy · GWAK</title>
      </Helmet>
      <PageHeader
        title="Pharmacy"
        description="Order OTC and prescription medicines. Rx items need a linked prescription and pharmacist verification."
      />
      {prescriptionId ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-heading">
          Prescription attached for checkout.{" "}
          <Link to="/pharmacy/checkout" className="font-semibold text-primary">
            Go to checkout
          </Link>
        </p>
      ) : null}
      <div className="mb-6 flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search medicines"
          className="max-w-md"
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
        />
        <Button onClick={runSearch}>Search</Button>
        <Link
          to="/pharmacy/cart"
          className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-heading"
        >
          View cart
        </Link>
      </div>
      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            to={`/pharmacy/c/${encodeURIComponent(c)}`}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-heading hover:border-primary"
          >
            {c}
          </Link>
        ))}
      </div>
      <ProductGrid
        loading={products.isLoading}
        items={products.data?.items}
        onAdd={(p) => {
          addItem({
            productId: p.id,
            name: p.name,
            price: p.price,
            qty: 1,
            rxRequired: p.rx_required,
          });
          toast.success("Added to cart");
        }}
      />
      <PharmacyLicenceChrome />
    </div>
  );
}

export function StoreCategoryPage({ category }: { category: string }) {
  const addItem = useCartStore((s) => s.addItem);
  const products = useQuery({
    queryKey: ["products", "cat", category],
    queryFn: async () => (await pharmacyService.products({ category })).data,
  });

  return (
    <div className="mx-auto max-w-container px-4 py-10">
      <Helmet>
        <title>{category} · Pharmacy · GWAK</title>
      </Helmet>
      <PageHeader title={category} description="Browse this category. No prescription-drug promotional banners." />
      <Link to="/pharmacy" className="mb-6 inline-block text-sm font-semibold text-primary">
        ← All products
      </Link>
      <ProductGrid
        loading={products.isLoading}
        items={products.data?.items}
        onAdd={(p) => {
          addItem({
            productId: p.id,
            name: p.name,
            price: p.price,
            qty: 1,
            rxRequired: p.rx_required,
          });
          toast.success("Added to cart");
        }}
      />
      <PharmacyLicenceChrome />
    </div>
  );
}

function ProductGrid({
  loading,
  items,
  onAdd,
}: {
  loading: boolean;
  items?: Product[];
  onAdd: (p: Product) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    );
  }
  if (!items?.length) {
    return <EmptyState title="No products published" description="Catalog items appear when approved in Neon." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <Card key={p.id}>
          <div className="flex items-start justify-between gap-2">
            <Link to={`/pharmacy/p/${p.id}`} className="font-semibold text-heading hover:text-primary">
              {p.name}
            </Link>
            {p.rx_required ? <Badge tone="warning">Rx required</Badge> : <Badge tone="success">OTC</Badge>}
          </div>
          <p className="mt-2 text-sm text-body">{p.composition}</p>
          <p className="mt-3 font-semibold text-heading">₹{p.price}</p>
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" variant="outline" onClick={() => onAdd(p)}>
              Add to cart
            </Button>
            <Link
              to={`/pharmacy/p/${p.id}`}
              className="inline-flex h-11 items-center rounded-xl border border-border px-3 text-sm font-semibold text-heading"
            >
              Details
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
