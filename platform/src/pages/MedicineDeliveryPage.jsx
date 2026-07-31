import { useEffect, useMemo, useState } from "react";

const initialCustomer = {
  customer_name: "",
  phone: "",
  address: "",
  notes: "",
};

function MedicineDeliveryPage() {
  const [catalog, setCatalog] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [customer, setCustomer] = useState(initialCustomer);
  const [currencySymbol, setCurrencySymbol] = useState("Rs.");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadCatalog = async () => {
      const response = await fetch("/api/catalog");
      const data = await response.json();
      setCatalog(data.items || []);
    };

    const loadUiConfig = async () => {
      const response = await fetch("/api/ui-config");
      const data = await response.json();
      const symbol = data?.catalog?.currency_symbol;
      if (typeof symbol === "string" && symbol.trim()) {
        setCurrencySymbol(symbol.trim());
      }
    };

    loadUiConfig().catch(() => undefined);
    loadCatalog().catch(() => setStatus("Unable to load catalogue."));
  }, []);

  const selectedItems = useMemo(
    () =>
      catalog
        .map((item) => ({ ...item, quantity: Number(quantities[item.id] || 0) }))
        .filter((item) => item.quantity > 0),
    [catalog, quantities]
  );

  const total = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.quantity * Number(item.price || 0), 0),
    [selectedItems]
  );

  const setQty = (itemId, value) => {
    const next = Math.max(0, Number(value || 0));
    setQuantities((prev) => ({ ...prev, [itemId]: next }));
  };

  const onCustomerChange = (event) => {
    const { name, value } = event.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    setStatus("");

    if (selectedItems.length === 0) {
      setStatus("Please select at least one medicine quantity.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/medicine-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...customer,
          items: selectedItems.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to place order");
      }

      setStatus(`Order placed successfully. Order ID: ${data.id}`);
      setCustomer(initialCustomer);
      setQuantities({});
    } catch (error) {
      setStatus(error.message || "Unable to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1.7fr_1fr]">
      <section className="rounded-2xl border border-panel-border bg-panel-bg/70 p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Medicine Catalogue</h2>
        <div className="mt-4 space-y-3">
          {catalog.length === 0 && <p className="text-sm text-slate-400">No catalogue items available. Add from Admin page.</p>}
          {catalog.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-xl border border-panel-border bg-slate-900/60 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-slate-400">{item.category} | Stock: {item.stock}</p>
                {item.description && <p className="mt-1 text-xs text-slate-300">{item.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-cyan-300">{currencySymbol} {Number(item.price || 0).toFixed(2)}</span>
                <input
                  type="number"
                  min="0"
                  value={quantities[item.id] || 0}
                  onChange={(event) => setQty(item.id, event.target.value)}
                  className="w-20 rounded-lg border border-panel-border bg-slate-900 px-2 py-1 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-panel-border bg-panel-bg/70 p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Delivery Details</h2>
        <form className="mt-4 space-y-3" onSubmit={placeOrder}>
          <input
            className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
            name="customer_name"
            value={customer.customer_name}
            onChange={onCustomerChange}
            placeholder="Customer name"
            required
          />
          <input
            className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
            name="phone"
            value={customer.phone}
            onChange={onCustomerChange}
            placeholder="Phone"
            required
          />
          <textarea
            className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
            rows={3}
            name="address"
            value={customer.address}
            onChange={onCustomerChange}
            placeholder="Delivery address"
            required
          />
          <textarea
            className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
            rows={2}
            name="notes"
            value={customer.notes}
            onChange={onCustomerChange}
            placeholder="Notes (optional)"
          />

          <div className="rounded-lg border border-panel-border bg-slate-900/60 p-3 text-sm">
            <p className="font-medium">Cart Summary</p>
            <p className="mt-1 text-xs text-slate-300">Items: {selectedItems.length}</p>
            <p className="text-xs text-slate-300">Total: {currencySymbol} {total.toFixed(2)}</p>
          </div>

          <button
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Placing Order..." : "Place Delivery Order"}
          </button>
        </form>
        {status && <p className="mt-3 text-sm text-slate-300">{status}</p>}
      </section>
    </div>
  );
}

export default MedicineDeliveryPage;
