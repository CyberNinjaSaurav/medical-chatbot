import { Link } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import type { Doctor } from "@/types/api";

function initials(name?: string | null) {
  const parts = (name || "Verified Doctor").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "DR";
}

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  const name = doctor.full_name || "Verified Doctor";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/70 bg-card shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-lift">
      <div className="relative h-36 bg-gradient-to-br from-mint via-lavender to-peach">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_20%_20%,white,transparent_42%),radial-gradient(circle_at_80%_80%,#fff7,transparent_40%)]" />
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-soft">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
          Verified
        </span>
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          {doctor.photo_url ? (
            <img
              src={doctor.photo_url}
              alt=""
              className="h-[5.25rem] w-[5.25rem] rounded-full border-4 border-white object-cover shadow-soft"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-full border-4 border-white bg-white text-xl font-extrabold text-heading shadow-soft"
            >
              {initials(name)}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-14 text-center">
        <h3 className="text-lg font-extrabold tracking-tight text-heading">{name}</h3>
        <p className="mt-1 text-sm font-medium text-secondary">{doctor.specialties.join(", ") || "General care"}</p>
        <p className="mt-3 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-heading">
          Reg. No. {doctor.registration_no}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-medium text-body">
          <span>{doctor.experience_years}+ yrs</span>
          <span className="text-border">·</span>
          <span>₹{doctor.fee}</span>
          <span className="text-border">·</span>
          <span>
            {doctor.rating_avg.toFixed(1)} ({doctor.rating_count})
          </span>
        </div>
        <div className="mt-auto pt-5">
          <Link
            to={`/doctors/${doctor.id}`}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-bold text-white transition hover:bg-[#0b8264] hover:shadow-glass"
          >
            View profile
          </Link>
        </div>
      </div>
    </article>
  );
}
