import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Phone, ShieldCheck } from "lucide-react";
import { doctorService } from "@/services/clinical.service";
import { DoctorCard } from "@/components/healthcare/DoctorCard";
import { EmptyState, Skeleton } from "@/components/ui/primitives";

const TAGLINE = "Consult, get medicines, view reports — without visiting the hospital";

const SPECIALTY_VISUALS: Record<string, { emoji: string; tint: string }> = {
  "General Medicine": { emoji: "🩺", tint: "from-mint to-emerald-50" },
  Cardiology: { emoji: "💗", tint: "from-peach to-rose-50" },
  Pediatrics: { emoji: "🧸", tint: "from-lavender to-violet-50" },
  Dermatology: { emoji: "✨", tint: "from-peach to-amber-50" },
  Orthopedics: { emoji: "🦴", tint: "from-mint to-teal-50" },
  Gynecology: { emoji: "🌸", tint: "from-lavender to-pink-50" },
  Neurology: { emoji: "🧠", tint: "from-lavender to-indigo-50" },
  ENT: { emoji: "👂", tint: "from-mint to-cyan-50" },
};

function specialtyVisual(name: string) {
  return SPECIALTY_VISUALS[name] || { emoji: "💫", tint: "from-lavender to-mint" };
}

const STEPS = [
  {
    title: "Consult",
    body: "Choose a verified doctor, capture consent, and join video with audio/chat fallback.",
  },
  {
    title: "E-prescription",
    body: "Registration number on every Rx. Drug-list tiers enforced by consultation mode.",
  },
  {
    title: "Refill & adhere",
    body: "Pharmacist-verified delivery and chronic refill subscriptions.",
  },
];

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

  const trust = landing.data?.trust;

  return (
    <>
      <Helmet>
        <title>GWAK — Digital Hospital for Pune</title>
        <meta name="description" content={TAGLINE} />
      </Helmet>

      <div className="bg-gradient-to-r from-mint via-lavender to-peach px-4 py-2.5 text-center text-sm font-semibold text-heading">
        Serving Pune · Pharmacist-verified medicines · ABHA-ready records
      </div>

      <section className="relative pb-4 pt-10 md:pt-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-10 h-72 w-72 animate-float-slow rounded-full bg-mint/80 blur-2xl" />
          <div className="absolute right-[-4rem] top-4 h-80 w-80 animate-float rounded-[40%] bg-lavender/90 blur-2xl" />
          <div className="absolute bottom-10 left-1/3 h-64 w-64 animate-float-slow rounded-full bg-peach/80 blur-2xl" />
          <HeroShapes />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center rounded-full border border-white/70 bg-white/50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-primary backdrop-blur-md"
          >
            GWAK
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-heading sm:text-5xl md:text-7xl text-balance"
          >
            {TAGLINE}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-body md:text-xl"
          >
            Chronic-care continuity for families — verified doctors, e-prescriptions, and refill subscriptions.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              to="/doctors"
              className="inline-flex h-14 items-center rounded-full bg-primary px-8 text-base font-bold text-white shadow-glass transition hover:-translate-y-0.5 hover:bg-[#0b8264] hover:shadow-lift"
            >
              Book a consult
            </Link>
            <Link
              to="/pharmacy"
              className="inline-flex h-14 items-center rounded-full bg-accent px-8 text-base font-bold text-heading shadow-soft transition hover:-translate-y-0.5 hover:bg-[#ff7a50]"
            >
              Order medicines
            </Link>
          </motion.div>
        </div>

        <div className="relative z-10 mx-auto mt-16 max-w-container translate-y-10 px-4 md:mt-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-3xl"
          >
            {landing.isLoading ? (
              <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : trust ? (
              <div className="grid grid-cols-2 gap-1 p-3 md:grid-cols-4 md:gap-0 md:divide-x md:divide-border/70">
                <TrustStat
                  icon={BadgeCheck}
                  label="Verified doctors"
                  value={String(trust.verified_doctors)}
                />
                <TrustStat icon={MapPin} label="Cities" value={trust.delivery_cities.join(", ")} />
                <TrustStat icon={ShieldCheck} label="Pharmacy licence" value={trust.licence_form_20} />
                <TrustStat icon={Phone} label="Helpline" value={trust.helpline} />
              </div>
            ) : (
              <div className="p-6">
                <EmptyState title="Trust data unavailable" description="Connect the GWAK API to load live metrics." />
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-container px-4 pb-8 pt-20 md:pt-24">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Care areas</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-heading md:text-4xl">Specialties</h2>
          <p className="mt-3 text-body">Browse care areas with verified doctor coverage.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {specialties.isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)
            : specialties.data?.items.length
              ? specialties.data.items.map((s) => {
                  const visual = specialtyVisual(s.name);
                  return (
                    <Link
                      key={s.name}
                      to={`/doctors?specialty=${encodeURIComponent(s.name)}`}
                      className={`group rounded-3xl border border-white/80 bg-gradient-to-br ${visual.tint} p-6 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-lift`}
                    >
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-soft">
                        {visual.emoji}
                      </span>
                      <h3 className="mt-5 text-xl font-extrabold text-heading">{s.name}</h3>
                      <p className="mt-2 text-sm font-medium text-body">
                        {s.doctor_count} doctors · from ₹{s.starting_fee}
                      </p>
                    </Link>
                  );
                })
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
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Meet the team</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-heading md:text-4xl">Trusted doctors</h2>
          </div>
          <Link to="/doctors" className="text-sm font-bold text-primary hover:underline">
            See all doctors
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-3xl" />)
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
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Simple by design</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-heading md:text-4xl">How it works</h2>
        </div>
        <ol className="relative mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
          <div
            aria-hidden
            className="pointer-events-none absolute left-[1.65rem] top-[1.65rem] hidden h-0.5 w-[calc(100%-3.3rem)] bg-gradient-to-r from-mint via-lavender to-peach md:block"
          />
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
              <span className="relative z-10 flex h-[3.3rem] w-[3.3rem] shrink-0 items-center justify-center rounded-full bg-white text-lg font-extrabold text-heading shadow-[0_0_0_8px_rgba(216,245,234,0.9),0_0_28px_rgba(14,159,122,0.35)]">
                {i + 1}
              </span>
              <div className="rounded-3xl border border-white/80 bg-card/90 p-6 shadow-soft md:mt-4">
                <h3 className="text-xl font-extrabold text-heading">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-body">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function TrustStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BadgeCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-body">{label}</p>
        <p className="truncate text-sm font-extrabold text-heading md:text-base">{value}</p>
      </div>
    </div>
  );
}

function HeroShapes() {
  return (
    <div className="absolute inset-0 hidden overflow-hidden md:block">
      <div className="absolute left-[8%] top-[22%] h-24 w-24 animate-float rounded-3xl bg-gradient-to-br from-white to-mint shadow-lift rotate-12" />
      <div className="absolute right-[10%] top-[18%] h-28 w-28 animate-float-slow rounded-full bg-gradient-to-br from-peach to-accent/40 shadow-glass" />
      <div className="absolute bottom-[28%] left-[14%] h-16 w-16 animate-float rounded-full bg-gradient-to-br from-lavender to-secondary/50" />
      <div className="absolute bottom-[22%] right-[16%] h-20 w-32 animate-float-slow rounded-[2rem] bg-white/50 shadow-soft backdrop-blur-md" />
      <svg
        className="absolute right-[22%] top-[38%] h-24 w-24 animate-float text-secondary/40"
        viewBox="0 0 80 80"
        fill="currentColor"
        aria-hidden
      >
        <path d="M40 4c8 14 22 18 36 14-8 16-6 32 6 46-16-4-30 4-40 16-10-12-24-20-40-16 12-14 14-30 6-46 14 4 28 0 36-14Z" />
      </svg>
    </div>
  );
}
