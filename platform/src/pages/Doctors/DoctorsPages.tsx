import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { doctorService } from "@/services/clinical.service";
import { DoctorCard } from "@/components/healthcare/DoctorCard";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

export function DoctorsPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const specialty = params.get("specialty") || undefined;

  const query = useQuery({
    queryKey: ["doctors", specialty, params.get("q")],
    queryFn: async () =>
      (
        await doctorService.list({
          specialty,
          q: params.get("q") || undefined,
          limit: 20,
        })
      ).data,
  });

  return (
    <div className="mx-auto max-w-container px-4 py-10">
      <PageHeader
        title="Trusted doctors"
        description="Browse verified profiles freely. Sign in only when you are ready to book."
      />
      <form
        className="mb-8 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const next = new URLSearchParams(params);
          if (q) next.set("q", q);
          else next.delete("q");
          setParams(next);
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search specialty, hospital, registration…"
          aria-label="Search doctors"
        />
        <Button type="submit">Search</Button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {query.isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)
          : query.data?.items.length
            ? query.data.items.map((d) => <DoctorCard key={d.id} doctor={d} />)
            : (
                <div className="sm:col-span-2 lg:col-span-3">
                  <EmptyState title="No doctors match your filters" description="Try another specialty or clear search." />
                </div>
              )}
      </div>
    </div>
  );
}

function bookPath(doctorId: string, slotId?: string, mode?: string) {
  const qs = new URLSearchParams({ doctorId });
  if (slotId) qs.set("slotId", slotId);
  if (mode) qs.set("mode", mode);
  return `/app/consult/book?${qs.toString()}`;
}

export function DoctorProfilePage({ id }: { id: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const doctor = useQuery({
    queryKey: ["doctor", id],
    queryFn: async () => (await doctorService.get(id)).data,
  });
  const slots = useQuery({
    queryKey: ["slots", id],
    queryFn: async () => (await doctorService.slots(id)).data,
  });

  if (doctor.isLoading) {
    return (
      <div className="mx-auto max-w-container px-4 py-10">
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (doctor.isError || !doctor.data) {
    return (
      <div className="mx-auto max-w-container px-4 py-10">
        <EmptyState title="Doctor not found" />
      </div>
    );
  }

  const d = doctor.data;
  const bookHref = bookPath(d.id);
  const loginHref = `/auth/login`;

  return (
    <div className="mx-auto grid max-w-container gap-8 px-4 py-10 lg:grid-cols-[1fr_320px]">
      <div>
        <Link to="/doctors" className="text-sm font-semibold text-primary">
          ← All doctors
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-heading">{d.full_name || "Verified Doctor"}</h1>
        <p className="mt-2 text-body">{d.specialties.join(" · ")}</p>
        <p className="mt-4 text-sm text-body">
          Registration No. <strong className="text-heading">{d.registration_no}</strong>
          {d.hpr_id ? ` · HPR ${d.hpr_id}` : null}
        </p>
        <p className="mt-6 text-body">{d.bio || d.qualifications}</p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm text-body">
          <span>{d.experience_years} years experience</span>
          <span>·</span>
          <span>{d.languages.join(", ")}</span>
          <span>·</span>
          <span>{d.hospital_name}</span>
        </div>
      </div>
      <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-24">
        <p className="text-sm text-body">Consultation fee</p>
        <p className="text-3xl font-bold text-heading">₹{d.fee}</p>
        <p className="mt-2 text-xs text-body">
          Profile is public. Payment happens only after you sign in and confirm a slot.
        </p>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-heading">Available slots</p>
          {slots.isLoading ? (
            <Skeleton className="h-20" />
          ) : slots.data?.length ? (
            slots.data.slice(0, 5).map((s) => {
              const target = bookPath(d.id, s.id, s.mode);
              return isAuthenticated ? (
                <Link
                  key={s.id}
                  to={target}
                  className="block rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  {new Date(s.starts_at).toLocaleString()} · {s.mode}
                </Link>
              ) : (
                <Link
                  key={s.id}
                  to={loginHref}
                  state={{ from: target }}
                  className="block rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  {new Date(s.starts_at).toLocaleString()} · {s.mode}
                  <span className="mt-0.5 block text-xs text-body">Sign in to book</span>
                </Link>
              );
            })
          ) : (
            <p className="text-sm text-body">No open slots yet. You can still request a booking after sign-in.</p>
          )}
        </div>
        {isAuthenticated ? (
          <Link
            to={bookHref}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary font-semibold text-white"
          >
            Book appointment
          </Link>
        ) : (
          <Link
            to={loginHref}
            state={{ from: bookHref }}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary font-semibold text-white"
          >
            Sign in to book
          </Link>
        )}
      </aside>
    </div>
  );
}
