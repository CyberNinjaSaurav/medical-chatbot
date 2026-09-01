import { useState } from "react";
import toast from "react-hot-toast";
import { adminService } from "@/services/admin.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, PageHeader } from "@/components/ui/primitives";
import { ApiError } from "@/services/api/api-error";

export function CatalogPage() {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("99");
  const [mrp, setMrp] = useState("120");
  const [rx, setRx] = useState(false);
  const [draftId, setDraftId] = useState("");

  return (
    <div>
      <PageHeader title="Catalog" description="Create draft SKUs then approve for the patient store." />
      <Card className="max-w-lg space-y-3">
        <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
        <div className="grid grid-cols-2 gap-2">
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" />
          <Input value={mrp} onChange={(e) => setMrp(e.target.value)} placeholder="MRP" />
        </div>
        <label className="flex items-center gap-2 text-sm text-heading">
          <input type="checkbox" checked={rx} onChange={(e) => setRx(e.target.checked)} /> Rx required
        </label>
        <Button onClick={async () => {
          try {
            const { data } = await adminService.createProduct({
              sku, name, price: Number(price), mrp: Number(mrp), rx_required: rx, schedule_tier: rx ? "H" : "O",
            });
            setDraftId(String((data as { id: string }).id));
            toast.success("Draft created");
          } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
        }}>Create draft</Button>
        {draftId ? (
          <Button variant="outline" onClick={async () => {
            try {
              await adminService.approveProduct(draftId);
              toast.success("Approved & publishable");
            } catch (e) { toast.error(e instanceof ApiError ? e.message : "Approve failed"); }
          }}>Approve {draftId.slice(0, 8)}…</Button>
        ) : null}
      </Card>
    </div>
  );
}
