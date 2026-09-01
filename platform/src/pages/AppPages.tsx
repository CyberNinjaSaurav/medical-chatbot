import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { appointmentService, doctorService, prescriptionService } from "@/services/clinical.service";
import { pharmacyService, notificationService, recordsService, labService } from "@/services/commerce.service";
import { authService } from "@/services/auth.service";
import { EmptyState, PageHeader, Skeleton, Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store/cart-store";
import { ApiError } from "@/services/api/api-error";

export function PatientDashboard() {
  const navigate = useNavigate();
  const appts = useQuery({ queryKey: ["appointments"], queryFn: async () => (await appointmentService.list()).data });
  const rx = useQuery({ queryKey: ["prescriptions"], queryFn: async () => (await prescriptionService.list()).data });
  const orders = useQuery({ queryKey: ["orders"], queryFn: async () => (await pharmacyService.listOrders()).data });
  const subs = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => (await pharmacyService.subscriptions()).data,
  });
  const notifs = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await notificationService.list({ unread_only: true })).data,
  });
  const setPrescription = useCartStore((s) => s.setPrescription);

  const upcoming = appts.data?.items.find((a) => a.status === "confirmed" || a.status === "booked");
  const openOrders =
    orders.data?.items.filter((o) => !["delivered", "refunded", "cancelled"].includes(o.status)) ?? [];
  const latestRx = rx.data?.items[0];
  const dueSubs =
    subs.data?.items.filter((s) => {
      if (s.status !== "active" || !s.next_refill_at) return false;
      return new Date(String(s.next_refill_at)).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
    }) ?? [];

  return (
    <div>
      <PageHeader title="Your care" description="Consults, refills, and pharmacy orders in one place." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-body">Upcoming consult</p>
          {appts.isLoading ? (
            <Skeleton className="mt-3 h-16" />
          ) : upcoming ? (
            <div className="mt-3">
              <p className="font-semibold text-heading">{upcoming.status}</p>
              <p className="text-sm text-body">
                {upcoming.mode} · ₹{upcoming.fee}
              </p>
              <Link to={`/app/consult/${upcoming.id}`} className="mt-3 inline-block text-sm font-semibold text-primary">
                Join waiting room
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-body">No upcoming consults</p>
              <Link to="/doctors" className="mt-2 inline-block text-sm font-semibold text-primary">
                Book a doctor
              </Link>
            </div>
          )}
        </Card>
        <Card>
          <p className="text-sm text-body">Refill from Rx</p>
          {latestRx ? (
            <div className="mt-3">
              <p className="font-semibold text-heading">{rx.data?.items.length} active</p>
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-primary"
                onClick={() => {
                  setPrescription(latestRx.id);
                  toast.success("Prescription attached");
                  navigate(`/pharmacy/checkout?rx=${latestRx.id}`);
                }}
              >
                Order these medicines
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-body">No prescriptions yet</p>
          )}
        </Card>
        <Card>
          <p className="text-sm text-body">Open orders</p>
          <p className="mt-3 text-3xl font-bold text-heading">{openOrders.length}</p>
          <Link to="/app/orders" className="text-sm font-semibold text-primary">
            Track delivery
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-body">Refills due</p>
          <p className="mt-3 text-3xl font-bold text-heading">{dueSubs.length}</p>
          <Link to="/app/subscriptions" className="text-sm font-semibold text-primary">
            Manage subscriptions
          </Link>
        </Card>
      </div>
      {notifs.data?.items.length ? (
        <Card className="mt-6">
          <p className="font-semibold text-heading">{notifs.data.items.length} unread alerts</p>
          <Link to="/app/notifications" className="mt-2 inline-block text-sm font-semibold text-primary">
            Open inbox
          </Link>
        </Card>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/doctors" className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">
          Book consult
        </Link>
        <Link to="/pharmacy" className="rounded-xl border border-border bg-card px-4 py-3 font-semibold text-heading">
          Order medicines
        </Link>
        <Link to="/app/labs" className="rounded-xl border border-border bg-card px-4 py-3 font-semibold text-heading">
          Book lab test
        </Link>
      </div>
    </div>
  );
}

export function BookConsultPage() {
  const [params] = useSearchParams();
  const doctorId = params.get("doctorId") || "";
  const slotId = params.get("slotId") || "";
  const mode = params.get("mode") || "video";
  const [symptoms, setSymptoms] = useState("");
  const [chosenSlot, setChosenSlot] = useState(slotId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const doctor = useQuery({
    queryKey: ["doctor", doctorId],
    enabled: !!doctorId,
    queryFn: async () => (await doctorService.get(doctorId)).data,
  });

  const slots = useQuery({
    queryKey: ["slots", doctorId],
    enabled: !!doctorId,
    queryFn: async () => (await doctorService.slots(doctorId, mode)).data,
  });

  const mutation = useMutation({
    mutationFn: async (slot: string) => {
      const booked = await appointmentService.book({
        doctor_id: doctorId,
        slot_id: slot,
        mode,
        intake: { symptoms, duration: "", allergies: "", medications: "" },
      });
      await appointmentService.consent(booked.data.id);
      await appointmentService.pay(booked.data.id);
      return booked.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment confirmed");
      navigate("/app/appointments");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Booking failed"),
  });

  if (!doctorId) {
    return <EmptyState title="Select a doctor first" action={<Link to="/doctors">Browse doctors</Link>} />;
  }

  const fee = doctor.data?.fee;

  return (
    <div>
      <PageHeader
        title="Confirm & pay"
        description="Review the consult, pick a slot, then pay. Profile browsing does not charge you."
      />
      <Card className="max-w-xl space-y-4">
        {doctor.data ? (
          <div className="rounded-xl bg-muted px-4 py-3">
            <p className="font-semibold text-heading">{doctor.data.full_name}</p>
            <p className="text-sm text-body">
              {doctor.data.specialties.join(" · ")} · fee ₹{doctor.data.fee}
            </p>
            <Link to={`/doctors/${doctorId}`} className="mt-2 inline-block text-sm font-semibold text-primary">
              Back to profile
            </Link>
          </div>
        ) : (
          <Skeleton className="h-16" />
        )}
        <label className="block text-sm font-medium text-heading">
          Symptoms / reason
          <textarea
            className="mt-2 h-28 w-full rounded-xl border border-border p-3"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium text-heading">Choose a slot</p>
          {slots.isLoading ? (
            <Skeleton className="h-24" />
          ) : slots.data?.length ? (
            slots.data.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  chosenSlot === s.id ? "border-primary bg-blue-50 font-semibold text-primary" : "border-border hover:bg-muted"
                }`}
                onClick={() => setChosenSlot(s.id)}
              >
                {new Date(s.starts_at).toLocaleString()} · {s.mode}
              </button>
            ))
          ) : (
            <EmptyState title="No slots available" />
          )}
        </div>
        <Button
          className="w-full"
          disabled={!chosenSlot}
          loading={mutation.isPending}
          onClick={() => chosenSlot && mutation.mutate(chosenSlot)}
        >
          {fee != null ? `Pay ₹${fee} & confirm` : "Pay & confirm"}
        </Button>
      </Card>
    </div>
  );
}

export function AppointmentsPage() {
  const query = useQuery({ queryKey: ["appointments"], queryFn: async () => (await appointmentService.list()).data });
  return (
    <div>
      <PageHeader title="Appointments" />
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : query.data?.items.length ? (
        <div className="space-y-3">
          {query.data.items.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{a.status}</p>
                <p className="text-sm text-body">
                  {a.mode} · ₹{a.fee} · payment {a.payment_status}
                </p>
              </div>
              <div className="flex gap-2">
                {a.status === "confirmed" ? (
                  <Link
                    to={`/app/consult/${a.id}`}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                  >
                    Join
                  </Link>
                ) : null}
                <Button
                  variant="outline"
                  onClick={async () => {
                    await appointmentService.cancel(a.id);
                    void query.refetch();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No appointments" action={<Link to="/doctors">Find a doctor</Link>} />
      )}
    </div>
  );
}

export function ConsultRoomPage() {
  return (
    <div>
      <PageHeader title="Consultation room" description="Video degrades to audio, then chat when bandwidth drops." />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="flex min-h-[360px] items-center justify-center bg-slate-900 text-white">
          <div className="text-center">
            <p className="text-lg font-semibold">Waiting room / WebRTC panel</p>
            <p className="mt-2 text-sm text-slate-300">Provider token fetched from /consultations/:id/token</p>
            <div className="mt-6 flex justify-center gap-2">
              <Badge tone="success">Network OK</Badge>
              <Badge tone="warning">Audio fallback ready</Badge>
            </div>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-heading">Your visit</h3>
          <p className="mt-2 text-sm text-body">Intake, allergies, and visit context for this episode.</p>
        </Card>
      </div>
    </div>
  );
}

export function PrescriptionsPage() {
  const navigate = useNavigate();
  const setPrescription = useCartStore((s) => s.setPrescription);
  const query = useQuery({ queryKey: ["prescriptions"], queryFn: async () => (await prescriptionService.list()).data });

  return (
    <div>
      <PageHeader title="Prescriptions" description="Order medicines in one tap — Rx is attached for pharmacist verification." />
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : query.data?.items.length ? (
        <div className="space-y-3">
          {query.data.items.map((rx) => (
            <Card key={rx.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-heading">Rx {rx.id.slice(0, 8)}</p>
                  <p className="text-sm text-body">Dr reg. {rx.registration_no}</p>
                </div>
                <Button
                  onClick={() => {
                    setPrescription(rx.id);
                    toast.success("Prescription attached");
                    navigate(`/pharmacy/checkout?rx=${rx.id}`);
                  }}
                >
                  Order these medicines
                </Button>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-body">
                {rx.items.map((i) => (
                  <li key={i.id}>
                    {i.drug_name} · {i.dose} · {i.frequency} · {i.duration}{" "}
                    <Badge tone="neutral">{i.schedule_tier}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No prescriptions yet" action={<Link to="/doctors">Book a consult</Link>} />
      )}
    </div>
  );
}

export function NotificationsPage() {
  const query = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: async () => (await notificationService.list()).data,
  });
  return (
    <div>
      <PageHeader title="Notifications" />
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : query.data?.items.length ? (
        <div className="space-y-3">
          {query.data.items.map((n) => (
            <Card key={n.id} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{n.title}</p>
                <p className="text-sm text-body">{n.body}</p>
              </div>
              {!n.read ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await notificationService.markRead(n.id);
                    void query.refetch();
                  }}
                >
                  Mark read
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Inbox empty" />
      )}
    </div>
  );
}

export function RecordsPage() {
  const timeline = useQuery({ queryKey: ["records"], queryFn: async () => (await recordsService.timeline()).data });
  const consents = useQuery({ queryKey: ["consents"], queryFn: async () => (await recordsService.consents()).data });
  return (
    <div>
      <PageHeader title="Health records" description="ABDM-ready timeline. Every access is audited." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-heading">Timeline</h3>
          {timeline.isLoading ? (
            <Skeleton className="mt-4 h-32" />
          ) : timeline.data?.items.length ? (
            <ul className="mt-4 space-y-3">
              {timeline.data.items.map((r) => (
                <li key={String(r.id)} className="border-l-2 border-primary pl-3">
                  <p className="font-medium text-heading">{String(r.title)}</p>
                  <p className="text-sm text-body">{String(r.record_type)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-body">No records yet.</p>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold text-heading">Consents</h3>
          {consents.data?.items.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {consents.data.items.map((c) => (
                <li key={String(c.id)} className="flex justify-between gap-2">
                  <span>
                    {String(c.purpose)} · {String(c.status)}
                  </span>
                  {c.status === "granted" ? (
                    <button
                      className="text-primary"
                      onClick={async () => {
                        await recordsService.revokeConsent(String(c.id));
                        void consents.refetch();
                      }}
                    >
                      Revoke
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-body">No consent artifacts.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export function LabsPage() {
  const tests = useQuery({ queryKey: ["labs"], queryFn: async () => (await labService.tests()).data });
  const bookings = useQuery({ queryKey: ["lab-bookings"], queryFn: async () => (await labService.bookings()).data });
  return (
    <div>
      <PageHeader title="Lab tests" description="Home collection available where published." />
      <div className="grid gap-4 md:grid-cols-2">
        {tests.isLoading ? (
          <Skeleton className="h-32" />
        ) : tests.data?.items.length ? (
          tests.data.items.map((t) => (
            <Card key={String(t.id)}>
              <h3 className="font-semibold text-heading">{String(t.name)}</h3>
              <p className="mt-2 text-sm text-body">{String(t.description || "")}</p>
              <p className="mt-3 font-semibold">₹{String(t.price)}</p>
              <Button
                className="mt-4"
                onClick={async () => {
                  await labService.book({
                    test_id: String(t.id),
                    address: { city: "Pune" },
                  });
                  toast.success("Test booked");
                  void bookings.refetch();
                }}
              >
                Book home collection
              </Button>
            </Card>
          ))
        ) : (
          <div className="md:col-span-2">
            <EmptyState title="No lab packages published yet" />
          </div>
        )}
      </div>
      <h3 className="mt-10 text-lg font-semibold text-heading">Your bookings</h3>
      {bookings.data?.items.length ? (
        <ul className="mt-3 space-y-2">
          {bookings.data.items.map((b) => (
            <li key={String(b.id)} className="rounded-xl border border-border bg-card p-3 text-sm">
              {String(b.status)} · {String(b.test_id)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-body">No bookings.</p>
      )}
    </div>
  );
}

export function ProfilePage() {
  const [abha, setAbha] = useState("");
  const me = useQuery({ queryKey: ["me"], queryFn: async () => (await authService.me()).data });
  const family = useQuery({ queryKey: ["family"], queryFn: async () => (await authService.listFamily()).data });

  return (
    <div>
      <PageHeader title="Profile" description="ABHA linkage is first-class for ABDM M1." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-heading">Personal</h3>
          {me.isLoading ? (
            <Skeleton className="mt-4 h-24" />
          ) : (
            <div className="mt-4 space-y-1 text-sm text-body">
              <p>{me.data?.full_name}</p>
              <p>{me.data?.phone}</p>
              <p>{me.data?.email}</p>
              <p>ABHA: {me.data?.abha_id || "Not linked"}</p>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Input value={abha} onChange={(e) => setAbha(e.target.value)} placeholder="14-digit ABHA ID" />
            <Button
              onClick={async () => {
                try {
                  await authService.linkAbha(abha);
                  toast.success("ABHA linked (M1)");
                  void me.refetch();
                } catch (e) {
                  toast.error(e instanceof ApiError ? e.message : "Link failed");
                }
              }}
            >
              Link
            </Button>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold text-heading">Family members</h3>
          {family.data?.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {family.data.map((f) => (
                <li key={f.id}>
                  {f.full_name} · {f.relation}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-body">No dependents added yet.</p>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-heading">Refill subscriptions</h3>
          <p className="mt-2 text-sm text-body">Manage chronic refills on the dedicated subscriptions page.</p>
          <Link to="/app/subscriptions" className="mt-3 inline-block text-sm font-semibold text-primary">
            Open refills
          </Link>
        </Card>
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Privacy and notification preferences." />
      <Card>
        <p className="text-sm text-body">Theme preferences and DPDP rights requests: grievance@gwak.health.</p>
      </Card>
    </div>
  );
}

export function StaticPolicyPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-heading">{title}</h1>
      <p className="mt-4 whitespace-pre-wrap text-body">{body}</p>
    </div>
  );
}

export function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-container px-4 py-12">
      <PageHeader title="How GWAK works" description="Separate tracks for consult, medicines, and labs." />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Consult a doctor", "Specialty → doctor → slot → consent → pay → video"],
          ["Order medicines", "Rx attach → pay → pharmacist verify → deliver"],
          ["Book a test", "Package → home collection → report viewer"],
        ].map(([t, b]) => (
          <Card key={t}>
            <h3 className="font-semibold text-heading">{t}</h3>
            <p className="mt-2 text-sm text-body">{b}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SpecialtiesPage() {
  const specialties = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => (await doctorService.specialties()).data,
  });
  return (
    <div className="mx-auto max-w-container px-4 py-12">
      <PageHeader title="Specialties" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specialties.data?.items.length ? (
          specialties.data.items.map((s) => (
            <Link
              key={s.name}
              to={`/doctors?specialty=${encodeURIComponent(s.name)}`}
              className="rounded-xl border border-border bg-card p-5 shadow-soft"
            >
              <h3 className="font-semibold text-heading">{s.name}</h3>
              <p className="mt-2 text-sm text-body">
                {s.doctor_count} doctors · from ₹{s.starting_fee}
              </p>
            </Link>
          ))
        ) : (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState title="No specialties published yet" />
          </div>
        )}
      </div>
    </div>
  );
}
