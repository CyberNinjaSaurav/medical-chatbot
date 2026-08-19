import { useQuery } from "@tanstack/react-query";
import { doctorService } from "@/services/clinical.service";

/** Form 20/21 + helpline chrome for pharmacy surfaces (no drug promo banners). */
export function PharmacyLicenceChrome({ className }: { className?: string }) {
  const landing = useQuery({
    queryKey: ["landing"],
    queryFn: async () => (await doctorService.landing()).data,
  });
  const trust = landing.data?.trust;

  return (
    <div
      className={
        className ??
        "mt-10 rounded-xl border border-border bg-muted/60 px-4 py-4 text-sm text-body"
      }
    >
      <p className="font-semibold text-heading">Licensed pharmacy</p>
      <p className="mt-1">
        Form 20: {trust?.licence_form_20 || "—"} · Form 21: {trust?.licence_form_21 || "—"}
      </p>
      <p className="mt-1">Helpline: {trust?.helpline || "+91-20-0000-0000"}</p>
      <p className="mt-2 text-xs">
        Prescription medicines require a valid e-Rx and pharmacist verification. GWAK does not
        promote prescription drugs.
      </p>
    </div>
  );
}
