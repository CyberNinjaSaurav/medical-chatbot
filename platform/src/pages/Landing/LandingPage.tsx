import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { doctorService } from "@/services/clinical.service";
import { DoctorCard } from "@/components/healthcare/DoctorCard";
import { EmptyState, Skeleton } from "@/components/ui/primitives";

const TAGLINE = "Consult, get medicines, view reports — without visiting the hospital";

export function LandingPage() {
  const landing = useQuery({ queryKey: ["landing"], queryFn: async () => (await doctorService.landing()).data });
  const specialties = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => (await doctorService.specialties()).data,
  });
  const doctors = useQuery({
    queryKey: ["doctors", "featured"],
    queryFn: async () => (await doctorService.list({ limit: 6 })).data,
  });

  return (
    <>
      <Helmet>
        <title>GWAK — Digital Hospital for Pune</title>
        <meta name="description" content={TAGLINE} />
      </Helmet>

      <div className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-center text-sm text-primary">
        Serving Pune · Pharmacist-verified medicines · ABHA-ready records
      </div>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#dbeafe,transparent_55%),radial-gradient(circle_at_bottom_left,#d1fae5,transparent_45%)]" />
        <div className="relative mx-auto grid max-w-container gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">GWAK</p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-heading md:text-5xl text-balance">
              {TAGLINE}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-body">
              Chronic-care continuity for families — verified doctors, e-prescriptions, and refill subscriptions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/doctors"
                className="inline-flex h-12 items-center rounded-xl bg-primary px-6 font-semibold text-white"
              >
                Book a consult
              </Link>
              <Link
                to="/pharmacy"
                className="inline-flex h-12 items-center rounded-xl border border-border bg-card px-6 font-semibold text-heading"
              >
                Order medicines
              </Link>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-glass backdrop-blur"
          >
            {landing.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : landing.data ? (
              <div className="grid grid-cols-2 gap-4">
                <TrustStat label="Verified doctors" value={String(landing.data.trust.verified_doctors)} />
                <TrustStat label="Cities" value={landing.data.trust.delivery_cities.join(", ")} />
                <TrustStat label="Pharmacy licence" value={landing.data.trust.licence_form_20} />
                <TrustStat label="Helpline" value={landing.data.trust.helpline} />
              </div>
            ) : (
              <EmptyState title="Trust data unavailable" description="Connect the GWAK API to load live metrics." />
            )}
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-container px-4 py-16">
        <h2 className="text-2xl font-bold text-heading">Specialties</h2>
        <p className="mt-2 text-body">Browse care areas with verified doctor coverage.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {specialties.isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)
            : specialties.data?.items.length
              ? specialties.data.items.map((s) => (
                  <Link
                    key={s.name}
                    to={`/doctors?specialty=${encodeURIComponent(s.name)}`}
                    className="rounded-xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5"
                  >
                    <h3 className="font-semibold text-heading">{s.name}</h3>
                    <p className="mt-2 text-sm text-body">
                      {s.doctor_count} doctors · from ₹{s.starting_fee}
                    </p>
                  </Link>
                ))
              : (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <EmptyState
                      title="No specialties published yet"
                      description="Verified doctors will appear here once onboarded in admin."
                      action={
                        <Link to="/auth/signup" className="font-semibold text-primary">
                          Create patient account
                        </Link>
                      }
                    />
                  </div>
                )}
        </div>
      </section>

      <section className="mx-auto max-w-container px-4 py-16">
        <h2 className="text-2xl font-bold text-heading">Trusted doctors</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56" />)
            : doctors.data?.items.length
              ? doctors.data.items.map((d) => <DoctorCard key={d.id} doctor={d} />)
              : (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <EmptyState title="No verified doctors yet" description="Doctor profiles load from the clinical API." />
                  </div>
                )}
        </div>
      </section>

      <section className="mx-auto max-w-container px-4 py-16">
        <h2 className="text-2xl font-bold text-heading">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Consult", "Choose a verified doctor, capture consent, and join video with audio/chat fallback."],
            ["E-prescription", "Registration number on every Rx. Drug-list tiers enforced by consultation mode."],
            ["Refill & adhere", "Pharmacist-verified delivery and chronic refill subscriptions."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5 shadow-soft">
              <h3 className="font-semibold text-heading">{title}</h3>
              <p className="mt-2 text-sm text-body">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function TrustStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/70 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-body">{label}</p>
      <p className="mt-2 text-lg font-bold text-heading">{value}</p>
    </div>
  );
}
