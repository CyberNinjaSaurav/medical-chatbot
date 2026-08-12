import { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { MarketingLayout } from "@/components/layouts/MarketingLayout";
import { PatientShell, RoleShell } from "@/components/layouts/AppShells";
import { ProtectedRoute, PublicOnly } from "@/routes/guards";
import { LandingPage } from "@/pages/Landing/LandingPage";
import {
  ForgotPasswordPage,
  LoginPage,
  SessionExpiredPage,
  SignupPage,
} from "@/pages/Auth/AuthPages";
import { DoctorProfilePage, DoctorsPage } from "@/pages/Doctors/DoctorsPages";
import {
  AdminDashboard,
  AppointmentsPage,
  BookConsultPage,
  ConsultRoomPage,
  DeliveryPage,
  DoctorDashboard,
  DoctorWorkspacePage,
  HowItWorksPage,
  LabsPage,
  NotificationsPage,
  OrdersPage,
  PatientDashboard,
  PharmacistConsole,
  PharmacyPage,
  PrescriptionsPage,
  ProfilePage,
  RecordsPage,
  SettingsPage,
  SpecialtiesPage,
  StaticPolicyPage,
} from "@/pages/AppPages";
import { Skeleton } from "@/components/ui/primitives";

const DoctorProfileRoute = () => {
  const { id } = useParams();
  return <DoctorProfilePage id={id || ""} />;
};

const ConsultRoute = () => {
  const { id } = useParams();
  return <ConsultRoomPage key={id} />;
};

const DoctorConsultRoute = () => {
  const { id } = useParams();
  return <DoctorWorkspacePage key={id} />;
};

function Fallback() {
  return (
    <div className="mx-auto max-w-container px-4 py-10">
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="doctors/:id" element={<DoctorProfileRoute />} />
            <Route path="specialties" element={<SpecialtiesPage />} />
            <Route path="pharmacy" element={<PharmacyPage />} />
            <Route path="how-it-works" element={<HowItWorksPage />} />
            <Route
              path="policies/privacy"
              element={
                <StaticPolicyPage
                  title="Privacy policy"
                  body="GWAK processes health data under DPDP Act, 2023 principles: notice, purpose limitation, access/correction/erasure, and grievance redressal. Contact grievance@gwak.health."
                />
              }
            />
            <Route
              path="policies/terms"
              element={
                <StaticPolicyPage
                  title="Terms of use"
                  body="Teleconsultation follows NMC Telemedicine Practice Guidelines (2020). Emergency care requires in-person evaluation."
                />
              }
            />
            <Route
              path="policies/refund"
              element={
                <StaticPolicyPage
                  title="Refund policy"
                  body="Failed payments, doctor no-shows, and pharmacist Rx rejections trigger refunds via the order saga."
                />
              }
            />
            <Route
              path="policies/grievance"
              element={
                <StaticPolicyPage
                  title="Grievance redressal"
                  body="Grievance Officer: grievance@gwak.health · Helpline +91-20-0000-0000"
                />
              }
            />
            <Route path="about" element={<StaticPolicyPage title="About GWAK" body="Chronic-care continuity for families in Pune and Maharashtra." />} />
            <Route path="contact" element={<StaticPolicyPage title="Contact" body="Helpline +91-20-0000-0000" />} />
          </Route>

          <Route element={<PublicOnly />}>
            <Route path="auth/login" element={<LoginPage />} />
            <Route path="auth/signup" element={<SignupPage />} />
            <Route path="auth/forgot" element={<ForgotPasswordPage />} />
            <Route path="auth/reset" element={<ForgotPasswordPage />} />
            <Route path="auth/session-expired" element={<SessionExpiredPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["patient"]} />}>
            <Route path="app" element={<PatientShell />}>
              <Route index element={<PatientDashboard />} />
              <Route path="consult/book" element={<BookConsultPage />} />
              <Route path="consult/:id" element={<ConsultRoute />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="prescriptions" element={<PrescriptionsPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="labs" element={<LabsPage />} />
              <Route path="records" element={<RecordsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["doctor"]} />}>
            <Route
              path="doctor"
              element={
                <RoleShell
                  title="Doctor portal"
                  links={[
                    { to: "/doctor", label: "Dashboard", end: true },
                    { to: "/doctor/availability", label: "Availability" },
                    { to: "/doctor/patients", label: "Patients" },
                    { to: "/doctor/earnings", label: "Earnings" },
                  ]}
                />
              }
            >
              <Route index element={<DoctorDashboard />} />
              <Route path="consult/:id" element={<DoctorConsultRoute />} />
              <Route path="availability" element={<EmptyShell title="Availability manager" />} />
              <Route path="patients" element={<EmptyShell title="Patients" />} />
              <Route path="earnings" element={<EmptyShell title="Earnings" />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["pharmacist", "admin", "admin_pharmacy"]} />}>
            <Route
              path="pharmacist"
              element={<RoleShell title="Pharmacist" links={[{ to: "/pharmacist", label: "Verification queue", end: true }]} />}
            >
              <Route index element={<PharmacistConsole />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route
              path="admin"
              element={
                <RoleShell
                  title="Admin"
                  links={[
                    { to: "/admin", label: "Dashboard", end: true },
                    { to: "/admin/catalog", label: "Catalog" },
                    { to: "/admin/orders", label: "Orders" },
                    { to: "/admin/compliance", label: "Compliance" },
                  ]}
                />
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="catalog" element={<EmptyShell title="Catalog management" />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="compliance" element={<EmptyShell title="Compliance registers" />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["delivery"]} />}>
            <Route path="delivery" element={<RoleShell title="Delivery" links={[{ to: "/delivery", label: "Assigned orders", end: true }]} />}>
              <Route index element={<DeliveryPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function EmptyShell({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-heading">{title}</h1>
      <p className="mt-2 text-body">Wired to live APIs; content appears when data exists.</p>
    </div>
  );
}
