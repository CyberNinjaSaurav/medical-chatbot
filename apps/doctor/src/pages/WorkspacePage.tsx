import { useParams } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, PageHeader } from "@/components/ui/primitives";
import { consultService, prescriptionService } from "@/services/clinical.service";
import { ApiError } from "@/services/api/api-error";

export function WorkspacePage() {
  const { id = "" } = useParams();
  const [soap, setSoap] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [drug, setDrug] = useState("");
  const [tier, setTier] = useState("O");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");

  return (
    <div>
      <PageHeader title="Consultation workspace" description={id ? `Episode ${id.slice(0, 8)}…` : "Select a visit from the queue."} />
      {!id ? <p className="text-sm text-body">Open a consult from the queue to chart and prescribe.</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3">
            <h3 className="font-display font-semibold text-heading">SOAP notes</h3>
            <textarea className="h-40 w-full rounded-[var(--radius)] border border-border p-3 text-sm" value={soap} onChange={(e) => setSoap(e.target.value)} placeholder="S / O / A / P" />
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Diagnosis" />
            <Button onClick={async () => {
              try {
                await consultService.notes(id, { subjective: soap, objective: "", assessment: diagnosis, plan: "", diagnosis });
                toast.success("Notes saved");
              } catch (e) { toast.error(e instanceof ApiError ? e.message : "Save failed"); }
            }}>Save notes</Button>
          </Card>
          <Card className="space-y-3">
            <h3 className="font-display font-semibold text-heading">Prescription pad</h3>
            <Input value={drug} onChange={(e) => setDrug(e.target.value)} placeholder="Drug name" />
            <select className="h-11 w-full rounded-[var(--radius)] border border-border px-3" value={tier} onChange={(e) => setTier(e.target.value)}>
              <option value="O">List O</option>
              <option value="A">List A (video)</option>
              <option value="B">List B</option>
              <option value="H1">Schedule H1</option>
            </select>
            <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dose" />
            <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="Frequency" />
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration" />
            <Button onClick={async () => {
              try {
                await prescriptionService.create({
                  consultation_id: id,
                  items: [{ drug_name: drug, dose, frequency, duration, schedule_tier: tier }],
                });
                toast.success("Rx issued (registration auto-included)");
              } catch (e) { toast.error(e instanceof ApiError ? e.message : "Rx failed"); }
            }}>Sign & issue</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
