import { useState } from "react";
import toast from "react-hot-toast";
import { adminService } from "@/services/admin.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, PageHeader } from "@/components/ui/primitives";
import { ApiError } from "@/services/api/api-error";

export function OpsPage() {
  const [docPhone, setDocPhone] = useState("");
  const [docName, setDocName] = useState("");
  const [reg, setReg] = useState("");
  const [pharmPhone, setPharmPhone] = useState("");
  const [delPhone, setDelPhone] = useState("");

  return (
    <div>
      <PageHeader title="Onboarding" description="Create doctor, pharmacist, and delivery accounts." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3">
          <h3 className="font-semibold text-heading">Doctor</h3>
          <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Full name" />
          <Input value={docPhone} onChange={(e) => setDocPhone(e.target.value)} placeholder="Phone" />
          <Input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="Registration no." />
          <Button onClick={async () => {
            try {
              await adminService.onboardDoctor({ phone: docPhone, full_name: docName, registration_no: reg });
              toast.success("Doctor verified + slots seeded");
            } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
          }}>Onboard</Button>
        </Card>
        <Card className="space-y-3">
          <h3 className="font-semibold text-heading">Pharmacist</h3>
          <Input value={pharmPhone} onChange={(e) => setPharmPhone(e.target.value)} placeholder="Phone" />
          <Button onClick={async () => {
            try {
              await adminService.createPharmacist({ phone: pharmPhone, full_name: "Pharmacist" });
              toast.success("Pharmacist created");
            } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
          }}>Create</Button>
        </Card>
        <Card className="space-y-3">
          <h3 className="font-semibold text-heading">Delivery</h3>
          <Input value={delPhone} onChange={(e) => setDelPhone(e.target.value)} placeholder="Phone" />
          <Button onClick={async () => {
            try {
              await adminService.createDelivery({ phone: delPhone, full_name: "Delivery Agent" });
              toast.success("Delivery agent created");
            } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
          }}>Create</Button>
        </Card>
      </div>
    </div>
  );
}
