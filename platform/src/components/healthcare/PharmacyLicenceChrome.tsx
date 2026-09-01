import { useQuery } from "@tanstack/react-query";
import { doctorService } from "@/services/clinical.service";

function isPlaceholder(value?: string | null) {
  if (!value) return true;
  const v = value.toUpperCase();
  return v.includes("PENDING") || v.includes("0000-0000") || v === "—";
}

/** Form 20/21 + helpline on pharmacy surfaces only — skips unfinished placeholders. */
export function PharmacyLicenceChrome({ className }: { className?: string }) {
  const landing = useQuery({
    queryKey: ["landing"],
    queryFn: async () => (await doctorService.landing()).data,
  });
  const trust = landing.data?.trust;
  const form20 = trust?.licence_form_20;
  const form21 = trust?.licence_form_21;
  const helpline = trust?.helpline;
  const showForms = !isPlaceholder(form20) || !isPlaceholder(form21);
  const showHelpline = !isPlaceholder(helpline);

  return (
    <div
      className={
        className ??
        "mt-10 rounded-xl border border-border bg-muted/60 px-4 py-4 text-sm text-body"
      }
    >
      <p className="font-semibold text-heading">Licensed pharmacy</p>
      {showForms ? (
        <p className="mt-1">
          {!isPlaceholder(form20) ? `Form 20: ${form20}` : null}
          {!isPlaceholder(form20) && !isPlaceholder(form21) ? " · " : null}
          {!isPlaceholder(form21) ? `Form 21: ${form21}` : null}
        </p>
      ) : (
        <p className="mt-1">Form 20/21 licence details are shown once issued.</p>
      )}
      {showHelpline ? <p className="mt-1">Helpline: {helpline}</p> : null}
      <p className="mt-2 text-xs">
        Prescription medicines require a valid e-Rx and pharmacist verification. GWAK does not
        promote prescription drugs.
      </p>
    </div>
  );
}
