import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { appointmentService, doctorService, prescriptionService } from "@/services/clinical.service";
import { pharmacyService, notificationService, recordsService, labService, adminService } from "@/services/commerce.service";
import { authService } from "@/services/auth.service";
import { EmptyState, PageHeader, Skeleton, Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store/cart-store";
import { ApiError } from "@/services/api/api-error";

export function PatientDashboard() {
  const appts = useQuery({ queryKey: ["appointments"], queryFn: async () => (await appointmentService.list()).data });
  const rx = useQuery({ queryKey: ["prescriptions"], queryFn: async () => (await prescriptionService.list()).data });
  const orders = useQuery({ queryKey: ["orders"], queryFn: async () => (await pharmacyService.listOrders()).data });
  const notifs = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await notificationService.list({ unread_only: true })).data,
  });

  const upcoming = appts.data?.items.find((a) => a.status === "confirmed" || a.status === "booked");

  return (
    <div>
      <PageHeader title="Health dashboard" description="Your care episode at a glance." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-body">Upcoming appointment</p>
          {appts.isLoading ? (
            <Skeleton className="mt-3 h-16" />
          ) : upcoming ? (
            <div className="mt-3">
              <p className="font-semibold text-heading">{upcoming.status}</p>
              <p className="text-sm text-body">Fee ₹{upcoming.fee}</p>
              <Link to="/app/appointments" className="mt-3 inline-block text-sm font-semibold text-primary">
                Manage
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-body">No upcoming consults</p>
          )}
        </Card>
        <Card>
          <p className="text-sm text-body">Active prescriptions</p>
          <p className="mt-3 text-3xl font-bold text-heading">{rx.data?.items.length ?? 0}</p>
          <Link to="/app/prescriptions" className="text-sm font-semibold text-primary">
            Refill / order
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-body">Open orders</p>
          <p className="mt-3 text-3xl font-bold text-heading">{orders.data?.items.length ?? 0}</p>
          <Link to="/app/orders" className="text-sm font-semibold text-primary">
            Track delivery
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-body">Unread alerts</p>
          <p className="mt-3 text-3xl font-bold text-heading">{notifs.data?.items.length ?? 0}</p>
          <Link to="/app/notifications" className="text-sm font-semibold text-primary">
            Open inbox
          </Link>
        </Card>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/doctors" className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">
          Book consult
        </Link>
        <Link to="/pharmacy" className="rounded-xl border border-border bg-card px-4 py-3 font-semibold text-heading">
          Pharmacy
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
  const navigate = useNavigate();
  const qc = useQueryClient();

  const slots = useQuery({
    queryKey: ["slots", doctorId],
    enabled: !!doctorId,
    queryFn: async () => (await doctorService.slots(doctorId, mode)).data,
  });

  const mutation = useMutation({
    mutationFn: async (chosenSlot: string) => {
      const booked = await appointmentService.book({
        doctor_id: doctorId,
        slot_id: chosenSlot,
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

  return (
    <div>
      <PageHeader title="Book consultation" description="Consent and payment are required before the waiting room." />
      <Card className="max-w-xl space-y-4">
        <label className="block text-sm font-medium text-heading">
          Symptoms / reason
          <textarea
            className="mt-2 h-28 w-full rounded-xl border border-border p-3"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium text-heading">Available slots</p>
          {slots.isLoading ? (
            <Skeleton className="h-24" />
          ) : slots.data?.length ? (
            slots.data.map((s) => (
              <Button
                key={s.id}
                variant={s.id === slotId ? "primary" : "outline"}
                className="w-full justify-start"
                loading={mutation.isPending}
                onClick={() => mutation.mutate(s.id)}
              >
                {new Date(s.starts_at).toLocaleString()} · {s.mode}
              </Button>
            ))
          ) : (
            <EmptyState title="No slots available" />
          )}
        </div>
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
                  <Link to={`/app/consult/${a.id}`} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
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
          <h3 className="font-semibold text-heading">Patient context</h3>
          <p className="mt-2 text-sm text-body">Intake, allergies, uploads, and Rx pad appear here for doctors.</p>
        </Card>
      </div>
    </div>
  );
}

export function PrescriptionsPage() {
  const query = useQuery({ queryKey: ["prescriptions"], queryFn: async () => (await prescriptionService.list()).data });
  return (
    <div>
      <PageHeader title="Prescriptions" description="Registration number is printed on every e-prescription." />
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
                <Link to="/pharmacy" className="text-sm font-semibold text-primary">
                  Order these medicines
                </Link>
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
        <EmptyState title="No prescriptions yet" />
      )}
    </div>
  );
}

export function PharmacyPage() {
  const [q, setQ] = useState("");
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total);
  const clear = useCartStore((s) => s.clear);
  const prescriptionId = useCartStore((s) => s.prescriptionId);
  const navigate = useNavigate();

  const products = useQuery({
    queryKey: ["products", q],
    queryFn: async () => (await pharmacyService.products({ q: q || undefined })).data,
  });

  const checkout = async () => {
    try {
      const order = await pharmacyService.createOrder({
        items: items.map((i) => ({ product_id: i.productId, qty: i.qty })),
        address: { line1: "Pune", city: "Pune", pincode: "411001" },
        prescription_id: prescriptionId,
      });
      await pharmacyService.payOrder(order.data.id);
      clear();
      toast.success("Order placed");
      navigate("/app/orders");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Checkout failed");
    }
  };

  return (
    <div className="mx-auto max-w-container px-4 py-10">
      <PageHeader
        title="Pharmacy"
        description="Prescription medicines require a valid Rx and pharmacist verification. No promotional drug advertising."
      />
      <div className="mb-6 flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search medicines" />
        <Button onClick={() => void products.refetch()}>Search</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {products.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)
          ) : products.data?.items.length ? (
            products.data.items.map((p) => (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-heading">{p.name}</h3>
                  {p.rx_required ? <Badge tone="warning">Rx required</Badge> : <Badge tone="success">OTC</Badge>}
                </div>
                <p className="mt-2 text-sm text-body">{p.composition}</p>
                <p className="mt-3 font-semibold text-heading">₹{p.price}</p>
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  onClick={() =>
                    addItem({
                      productId: p.id,
                      name: p.name,
                      price: p.price,
                      qty: 1,
                      rxRequired: p.rx_required,
                    })
                  }
                >
                  Add to cart
                </Button>
              </Card>
            ))
          ) : (
            <div className="sm:col-span-2">
              <EmptyState title="No products published" description="Admin must approve catalog items before they appear." />
            </div>
          )}
        </div>
        <Card className="h-fit lg:sticky lg:top-24">
          <h3 className="font-semibold text-heading">Cart</h3>
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-body">Cart is empty</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {items.map((i) => (
                <li key={i.productId} className="flex justify-between gap-2">
                  <span>
                    {i.name} × {i.qty}
                  </span>
                  <span>₹{i.price * i.qty}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 font-bold text-heading">Total ₹{total().toFixed(2)}</p>
          <Button className="mt-4 w-full" disabled={!items.length} onClick={() => void checkout()}>
            Pay & place order
          </Button>
        </Card>
      </div>
    </div>
  );
}

export function OrdersPage() {
  const query = useQuery({ queryKey: ["orders"], queryFn: async () => (await pharmacyService.listOrders()).data });
  return (
    <div>
      <PageHeader title="Orders" description="Rx items never skip pharmacist verification." />
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : query.data?.items.length ? (
        <div className="space-y-3">
          {query.data.items.map((o) => (
            <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{o.tracking_code}</p>
                <p className="text-sm text-body">
                  {o.status} · ₹{o.total}
                </p>
              </div>
              <Badge tone={o.status === "delivered" ? "success" : "primary"}>{o.status}</Badge>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No orders yet" action={<Link to="/pharmacy">Go to pharmacy</Link>} />
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
  const subs = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => (await pharmacyService.subscriptions()).data,
  });

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
          {subs.data?.items.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {subs.data.items.map((s) => (
                <li key={String(s.id)}>
                  Product {String(s.product_id)} · every {String(s.cadence_days)} days · {String(s.status)}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No active refill subscriptions" description="Chronic meds can be subscribed after first fulfilled order." />
          )}
        </Card>
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Language, privacy, and notification preferences." />
      <Card>
        <p className="text-sm text-body">Theme preferences and DPDP rights requests: grievance@gwak.health.</p>
      </Card>
    </div>
  );
}

export function DoctorDashboard() {
  const appts = useQuery({ queryKey: ["appointments"], queryFn: async () => (await appointmentService.list()).data });
  return (
    <div>
      <PageHeader title="Doctor dashboard" description="Today's queue and consult workspace." />
      {appts.isLoading ? (
        <Skeleton className="h-40" />
      ) : appts.data?.items.length ? (
        <div className="space-y-3">
          {appts.data.items.map((a) => (
            <Card key={a.id} className="flex justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{a.status}</p>
                <p className="text-sm text-body">{a.mode}</p>
              </div>
              <Link to={`/doctor/consult/${a.id}`} className="text-sm font-semibold text-primary">
                Open workspace
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No patients in queue" />
      )}
    </div>
  );
}

export function DoctorWorkspacePage() {
  const [drug, setDrug] = useState("");
  const [tier, setTier] = useState("O");
  return (
    <div>
      <PageHeader title="Consultation workspace" description="SOAP notes + prescription pad with drug-tier enforcement." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-heading">SOAP</h3>
          <textarea className="mt-3 h-40 w-full rounded-xl border border-border p-3" placeholder="Subjective / Objective / Assessment / Plan" />
          <Button className="mt-3">Save notes</Button>
        </Card>
        <Card>
          <h3 className="font-semibold text-heading">Prescription pad</h3>
          <div className="mt-3 space-y-3">
            <Input value={drug} onChange={(e) => setDrug(e.target.value)} placeholder="Drug name" />
            <select className="h-11 w-full rounded-xl border border-border px-3" value={tier} onChange={(e) => setTier(e.target.value)}>
              <option value="O">List O</option>
              <option value="A">List A (video only)</option>
              <option value="B">List B (follow-up)</option>
              <option value="H1">Schedule H1</option>
              <option value="PROHIBITED">Prohibited</option>
            </select>
            <p className="text-xs text-body">API rejects PROHIBITED/NDPS and List A without video mode.</p>
            <Button
              onClick={async () => {
                toast("Use an active consultation_id from the queue to submit via API.");
              }}
            >
              Sign & issue (registration auto-included)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function PharmacistConsole() {
  const query = useQuery({ queryKey: ["orders"], queryFn: async () => (await pharmacyService.listOrders()).data });
  const pending = query.data?.items.filter((o) => o.status === "rx_verification_pending") ?? [];
  return (
    <div>
      <PageHeader title="Pharmacist console" description="Verification is mandatory and audited. Cannot be skipped." />
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : pending.length ? (
        <div className="space-y-3">
          {pending.map((o) => (
            <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-heading">{o.tracking_code}</p>
                <p className="text-sm text-body">₹{o.total}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    await pharmacyService.verify(o.id, "Verified against Rx");
                    toast.success("Verified");
                    void query.refetch();
                  }}
                >
                  Verify
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    await pharmacyService.reject(o.id, "Rx incomplete");
                    toast.success("Rejected + refund saga");
                    void query.refetch();
                  }}
                >
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No orders awaiting verification" />
      )}
    </div>
  );
}

export function AdminDashboard() {
  const dash = useQuery({ queryKey: ["admin-dash"], queryFn: async () => (await adminService.dashboard()).data });
  const audit = useQuery({ queryKey: ["audit"], queryFn: async () => (await adminService.audit()).data });
  return (
    <div>
      <PageHeader title="Admin dashboard" description="GMV proxies, fulfilment, and compliance queues." />
      {dash.isLoading ? (
        <Skeleton className="h-32" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(dash.data || {}).map(([k, v]) => (
            <Card key={k}>
              <p className="text-sm text-body">{k}</p>
              <p className="mt-2 text-3xl font-bold text-heading">{v}</p>
            </Card>
          ))}
        </div>
      )}
      <h3 className="mt-10 text-lg font-semibold text-heading">Audit log</h3>
      <div className="mt-3 space-y-2">
        {audit.data?.items.slice(0, 20).map((a) => (
          <div key={String(a.id)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
            {String(a.action)} · {String(a.resource_type)} · {String(a.created_at)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeliveryPage() {
  const query = useQuery({ queryKey: ["orders"], queryFn: async () => (await pharmacyService.listOrders()).data });
  return (
    <div>
      <PageHeader title="Delivery agent" description="OTP proof of delivery in Phase 1 tracking." />
      {query.data?.items.length ? (
        <div className="space-y-3">
          {query.data.items.map((o) => (
            <Card key={o.id} className="flex justify-between">
              <span>
                {o.tracking_code} · {o.status}
              </span>
              <Button
                size="sm"
                onClick={async () => {
                  await pharmacyService.advance(o.id);
                  void query.refetch();
                }}
              >
                Advance
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No assigned deliveries" />
      )}
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
            <Link key={s.name} to={`/doctors?specialty=${encodeURIComponent(s.name)}`} className="rounded-xl border border-border bg-card p-5 shadow-soft">
              <h3 className="font-semibold text-heading">{s.name}</h3>
              <p className="mt-2 text-sm text-body">
                {s.doctor_count} doctors · from ₹{s.starting_fee}
              </p>
            </Link>
          ))
        ) : (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState title="No specialties yet" />
          </div>
        )}
      </div>
    </div>
  );
}
