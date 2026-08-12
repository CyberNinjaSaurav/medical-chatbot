import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/primitives";
import type { Doctor } from "@/types/api";

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glass">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-heading">
            {doctor.full_name || "Verified Doctor"}
          </h3>
          <p className="mt-1 text-sm text-body">{doctor.specialties.join(", ")}</p>
        </div>
        <Badge tone="success">Verified</Badge>
      </div>
      <p className="mt-3 text-sm text-body">
        Reg. No. <span className="font-medium text-heading">{doctor.registration_no}</span>
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-body">
        <span>{doctor.experience_years}+ yrs</span>
        <span>·</span>
        <span>₹{doctor.fee}</span>
        <span>·</span>
        <span>
          {doctor.rating_avg.toFixed(1)} ({doctor.rating_count})
        </span>
      </div>
      <div className="mt-auto pt-5">
        <Link
          to={`/doctors/${doctor.id}`}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white"
        >
          View profile
        </Link>
      </div>
    </article>
  );
}
