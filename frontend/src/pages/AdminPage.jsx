import { useEffect, useState } from "react";

const fallbackCategory = "General";

const createInitialItem = (category = fallbackCategory) => ({
  name: "",
  category,
  description: "",
  price: "",
  stock: "",
});

function AdminPage() {
  const [categoryOptions, setCategoryOptions] = useState([fallbackCategory]);
  const [currencySymbol, setCurrencySymbol] = useState("Rs.");
  const [form, setForm] = useState(createInitialItem());
  const [catalog, setCatalog] = useState([]);
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadCatalog = async () => {
    const response = await fetch("/api/catalog");
    const data = await response.json();
    setCatalog(data.items || []);
  };

  useEffect(() => {
    const loadUiConfig = async () => {
      const response = await fetch("/api/ui-config");
      const data = await response.json();

      const categories = data?.catalog?.category_options || [];
      const defaultCategory = data?.catalog?.default_category || categories[0] || fallbackCategory;
      const symbol = data?.catalog?.currency_symbol;

      if (Array.isArray(categories) && categories.length > 0) {
        setCategoryOptions(categories);
      } else {
        setCategoryOptions([defaultCategory]);
      }

      if (typeof symbol === "string" && symbol.trim()) {
        setCurrencySymbol(symbol.trim());
      }

      setForm((prev) => ({ ...prev, category: prev.category || defaultCategory }));
    };

    loadUiConfig().catch(() => {
      setCategoryOptions([fallbackCategory]);
    });

    loadCatalog().catch(() => setStatus("Unable to load catalogue."));
  }, []);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addItem = async (event) => {
    event.preventDefault();
    setStatus("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/catalog/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          price: Number(form.price || 0),
          stock: Number(form.stock || 0),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to add catalogue item");
      }

      setForm(createInitialItem(form.category || categoryOptions[0] || fallbackCategory));
      setStatus("Catalogue item added.");
      await loadCatalog();
    } catch (error) {
      setStatus(error.message || "Unable to add catalogue item.");
    } finally {
      setIsLoading(false);
    }
  };

  const uploadBulk = async () => {
    setStatus("");
    if (files.length === 0) {
      setStatus("Select one or more JSON files first.");
      return;
    }

    const body = new FormData();
    files.forEach((file) => body.append("files", file));

    setIsLoading(true);
    try {
      const response = await fetch("/api/catalog/upload", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Bulk upload failed");
      }

      const errorText = (data.errors || []).length > 0 ? ` Errors: ${(data.errors || []).join(" | ")}` : "";
      setStatus(`Uploaded ${data.uploaded_count} catalogue items.${errorText}`);
      setFiles([]);
      await loadCatalog();
    } catch (error) {
      setStatus(error.message || "Bulk upload failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (id) => {
    setIsLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/catalog/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to delete item");
      }
      setStatus("Catalogue item deleted.");
      await loadCatalog();
    } catch (error) {
      setStatus(error.message || "Unable to delete item.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-panel-border bg-panel-bg/70 p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Add Catalogue Item</h2>
        <form className="mt-4 space-y-3" onSubmit={addItem}>
          <input
            className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Medicine name"
            required
          />
          <select
            className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
            name="category"
            value={form.category}
            onChange={onChange}
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <textarea
            className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
            name="description"
            value={form.description}
            onChange={onChange}
            rows={3}
            placeholder="Description"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
              type="number"
              step="0.01"
              min="0"
              name="price"
              value={form.price}
              onChange={onChange}
              placeholder="Price"
              required
            />
            <input
              className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
              type="number"
              min="0"
              name="stock"
              value={form.stock}
              onChange={onChange}
              placeholder="Stock"
              required
            />
          </div>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            Add Item
          </button>
        </form>

        <div className="mt-6 border-t border-panel-border pt-4">
          <h3 className="text-sm font-semibold">Bulk Upload (JSON)</h3>
          <p className="mt-1 text-xs text-slate-400">Upload one or more `.json` files containing an object or array of objects.</p>
          <input
            type="file"
            accept=".json,application/json"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
            className="mt-3 block w-full text-sm text-slate-300"
          />
          <button
            type="button"
            onClick={uploadBulk}
            disabled={isLoading}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            Upload Files
          </button>
        </div>

        {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}
      </section>

      <section className="rounded-2xl border border-panel-border bg-panel-bg/70 p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Current Catalogue</h2>
        <div className="mt-4 space-y-3">
          {catalog.length === 0 && <p className="text-sm text-slate-400">No catalogue items.</p>}
          {catalog
            .slice()
            .reverse()
            .map((item) => (
              <div key={item.id} className="rounded-lg border border-panel-border bg-slate-900/60 p-3">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-slate-300">
                  {item.category} | {currencySymbol} {Number(item.price || 0).toFixed(2)} | Stock {item.stock}
                </p>
                {item.description && <p className="mt-1 text-xs text-slate-400">{item.description}</p>}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="mt-2 rounded bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500"
                >
                  Delete
                </button>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

export default AdminPage;
