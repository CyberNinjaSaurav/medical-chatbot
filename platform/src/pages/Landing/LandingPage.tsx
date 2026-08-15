import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { BadgeCheck, FlaskConical, MapPin, Phone, Pill, ShieldCheck, Stethoscope, Video } from "lucide-react";
import { doctorService } from "@/services/clinical.service";
import { DoctorCard } from "@/components/healthcare/DoctorCard";
import { EmptyState, Skeleton } from "@/components/ui/primitives";

const HEADLINE = "24/7 Healthcare, Wherever You Are.";
const SUBHEADLINE =
  "Private video consultations, instant audio calls, and urgent care with the nearest verified doctors. Your complete digital hospital.";

const PILLARS = [
  {
    to: "/doctors",
    title: "Find Doctors",
    body: "Locate specialists near you for urgent care.",
    icon: Stethoscope,
    hover: "hover:bg-mint/70",
    iconBg: "bg-mint text-primary",
  },
  {
    to: "/doctors",
    title: "Instant Consult",
    body: "24/7 private video or audio calls.",
    icon: Video,
    hover: "hover:bg-lavender/70",
    iconBg: "bg-lavender text-secondary",
  },
  {
    to: "/pharmacy",
    title: "Pharmacy",
    body: "Home delivery for all your medical needs.",
    icon: Pill,
    hover: "hover:bg-peach/70",
    iconBg: "bg-peach text-accent",
  },
  {
    to: "/app/labs",
    title: "Diagnostics",
    body: "Book lab tests from the comfort of home.",
    icon: FlaskConical,
    hover: "hover:bg-mint/50",
    iconBg: "bg-muted text-heading",
  },
];

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
        <title>GWAK — 24/7 Digital Hospital</title>
        <meta name="description" content={SUBHEADLINE} />
      </Helmet>

      <section className="relative overflow-x-clip pt-12 md:pt-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-10 h-72 w-72 animate-float-slow rounded-full bg-mint/80 blur-2xl" />
          <div className="absolute right-[-4rem] top-4 h-80 w-80 animate-float rounded-[40%] bg-lavender/90 blur-2xl" />
          <div className="absolute bottom-4 left-1/3 h-64 w-64 animate-float-slow rounded-full bg-peach/80 blur-2xl" />
          <HeroShapes />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex flex-wrap items-center justify-center gap-3 lg:mb-0"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-heading shadow-soft backdrop-blur-md lg:absolute lg:left-0 lg:top-8 lg:animate-float">
              <Video className="h-3.5 w-3.5 text-primary" aria-hidden />
              24/7 Video Consult
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-heading shadow-soft backdrop-blur-md lg:absolute lg:right-0 lg:top-28 lg:animate-float-slow">
              <ShieldCheck className="h-3.5 w-3.5 text-secondary" aria-hidden />
              Private & Secure
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-[2.35rem] font-extrabold leading-[1.05] tracking-tight text-heading sm:text-6xl md:text-7xl lg:text-[5.25rem] text-balance"
          >
            {HEADLINE}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-base text-body sm:text-lg md:text-xl"
          >
            {SUBHEADLINE}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
          >
            <Link
              to="/doctors"
              className="inline-flex h-14 w-full items-center justify-center rounded-full bg-primary px-8 text-base font-bold text-white shadow-glass transition hover:-translate-y-0.5 hover:bg-[#0b8264] hover:shadow-lift sm:w-auto"
            >
              Consult a Doctor Now
            </Link>
            <Link
              to="/pharmacy"
              className="inline-flex h-14 w-full items-center justify-center rounded-full border-2 border-heading/10 bg-white/80 px-8 text-base font-bold text-heading shadow-soft backdrop-blur-md transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white sm:w-auto"
            >
              Order Medicines
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-container px-4 pb-8 pt-16 md:pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Are you looking for…</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-heading md:text-4xl">
            What do you need help with today?
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <Link
              key={pillar.title}
              to={pillar.to}
              className={`group rounded-3xl border border-white bg-card p-6 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-lift ${pillar.hover}`}
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${pillar.iconBg}`}>
                <pillar.icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-heading">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{pillar.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-container px-4 py-6">
        {landing.isLoading ? (
          <div className="grid grid-cols-2 gap-3 rounded-3xl border border-white/70 bg-white/70 p-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : trust ? (
          <div className="glass grid grid-cols-2 gap-1 rounded-3xl p-3 md:grid-cols-4 md:gap-0 md:divide-x md:divide-border/70">
            <TrustStat icon={BadgeCheck} label="Verified doctors" value={String(trust.verified_doctors)} />
            <TrustStat icon={MapPin} label="Coverage" value={trust.delivery_cities.join(", ")} />
            <TrustStat icon={ShieldCheck} label="Pharmacy licence" value={trust.licence_form_20} />
            <TrustStat icon={Phone} label="Helpline" value={trust.helpline} />
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-container px-4 pb-8 pt-12 md:pt-16">
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
