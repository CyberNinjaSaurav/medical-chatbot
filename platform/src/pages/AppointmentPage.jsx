import { useEffect, useState } from "react";

const fallbackDoctor = "Dr. Sharma";

const createInitialForm = (doctor = fallbackDoctor) => ({
  patient_name: "",
  doctor,
  appointment_date: "",
  appointment_time: "",
  reason: "",
});

function AppointmentPage() {
  const [doctorOptions, setDoctorOptions] = useState([fallbackDoctor]);
  const [form, setForm] = useState(createInitialForm());
  const [appointments, setAppointments] = useState([]);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAppointments = async () => {
    const response = await fetch("/api/appointments");
    const data = await response.json();
    setAppointments(data.items || []);
  };

  useEffect(() => {
    const loadUiConfig = async () => {
      const response = await fetch("/api/ui-config");
      const data = await response.json();
      const doctors = data?.appointment?.doctor_options || [];
      const defaultDoctor = data?.appointment?.default_doctor || doctors[0] || fallbackDoctor;

      if (Array.isArray(doctors) && doctors.length > 0) {
        setDoctorOptions(doctors);
      } else {
        setDoctorOptions([defaultDoctor]);
      }

      setForm((prev) => ({ ...prev, doctor: prev.doctor || defaultDoctor }));
    };

    loadUiConfig().catch(() => {
      setDoctorOptions([fallbackDoctor]);
    });

    loadAppointments().catch(() => {
      setStatus("Unable to load appointments right now.");
    });
  }, []);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create appointment");
      }

      setStatus(`Appointment booked for ${data.patient_name} on ${data.appointment_date} at ${data.appointment_time}.`);
      setForm(createInitialForm(form.doctor || doctorOptions[0] || fallbackDoctor));
      await loadAppointments();
    } catch (error) {
      setStatus(error.message || "Unable to book appointment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-panel-border bg-panel-bg/70 p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Book Appointment</h2>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <input
            className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
            name="patient_name"
            value={form.patient_name}
            onChange={onChange}
            placeholder="Patient name"
            required
          />
          <select
            className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
            name="doctor"
            value={form.doctor}
            onChange={onChange}
            required
          >
            {doctorOptions.map((doctor) => (
              <option key={doctor} value={doctor}>
                {doctor}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
              type="date"
              name="appointment_date"
              value={form.appointment_date}
              onChange={onChange}
              required
            />
            <input
              className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
              type="time"
              name="appointment_time"
              value={form.appointment_time}
              onChange={onChange}
              required
            />
          </div>
          <textarea
            className="w-full rounded-lg border border-panel-border bg-slate-900 px-3 py-2 text-sm"
            name="reason"
            value={form.reason}
            onChange={onChange}
            rows={3}
            placeholder="Reason for consultation"
          />
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Booking..." : "Book Appointment"}
          </button>
        </form>
        {status && <p className="mt-3 text-sm text-slate-300">{status}</p>}
      </section>

      <section className="rounded-2xl border border-panel-border bg-panel-bg/70 p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Recent Appointments</h2>
        <div className="mt-4 space-y-3">
          {appointments.length === 0 && <p className="text-sm text-slate-400">No appointments yet.</p>}
          {appointments
            .slice()
            .reverse()
            .map((item) => (
              <div key={item.id} className="rounded-lg border border-panel-border bg-slate-900/60 p-3">
                <p className="text-sm font-medium">{item.patient_name}</p>
                <p className="text-xs text-slate-300">
                  {item.doctor} | {item.appointment_date} {item.appointment_time}
                </p>
                {item.reason && <p className="mt-2 text-xs text-slate-400">{item.reason}</p>}
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

export default AppointmentPage;
