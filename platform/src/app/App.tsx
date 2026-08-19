import { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { MarketingLayout } from "@/components/layouts/MarketingLayout";
import { PatientShell } from "@/components/layouts/AppShells";
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
  AppointmentsPage,
  BookConsultPage,
  ConsultRoomPage,
  HowItWorksPage,
  LabsPage,
  NotificationsPage,
  PatientDashboard,
  PrescriptionsPage,
  ProfilePage,
  RecordsPage,
  SettingsPage,
  SpecialtiesPage,
  StaticPolicyPage,
} from "@/pages/AppPages";
import { StoreCategoryPage, StoreHomePage } from "@/pages/pharmacy/StoreHomePage";
import { ProductDetailPage } from "@/pages/pharmacy/ProductDetailPage";
import { CartPage } from "@/pages/pharmacy/CartPage";
import { CheckoutPage } from "@/pages/pharmacy/CheckoutPage";
import { OrderDetailPage, OrdersListPage } from "@/pages/orders/OrdersPages";
import { SubscriptionsPage } from "@/pages/orders/SubscriptionsPage";
import { Skeleton } from "@/components/ui/primitives";

const DoctorProfileRoute = () => {
  const { id } = useParams();
  return <DoctorProfilePage id={id || ""} />;
};

const ConsultRoute = () => {
  const { id } = useParams();
  return <ConsultRoomPage key={id} />;
};

const PharmacyCategoryRoute = () => {
  const { category = "" } = useParams();
  return <StoreCategoryPage category={decodeURIComponent(category)} />;
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
            <Route path="pharmacy" element={<StoreHomePage />} />
            <Route path="pharmacy/search" element={<StoreHomePage />} />
            <Route path="pharmacy/c/:category" element={<PharmacyCategoryRoute />} />
            <Route path="pharmacy/p/:id" element={<ProductDetailPage />} />
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
            <Route
              path="about"
              element={
                <StaticPolicyPage
                  title="About GWAK"
                  body="Chronic-care continuity for families in Pune and Maharashtra."
                />
              }
            />
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
            <Route element={<MarketingLayout />}>
              <Route path="pharmacy/cart" element={<CartPage />} />
              <Route path="pharmacy/checkout" element={<CheckoutPage />} />
            </Route>
            <Route path="app" element={<PatientShell />}>
              <Route index element={<PatientDashboard />} />
              <Route path="consult/book" element={<BookConsultPage />} />
              <Route path="consult/:id" element={<ConsultRoute />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="prescriptions" element={<PrescriptionsPage />} />
              <Route path="orders" element={<OrdersListPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="subscriptions" element={<SubscriptionsPage />} />
              <Route path="labs" element={<LabsPage />} />
              <Route path="records" element={<RecordsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
