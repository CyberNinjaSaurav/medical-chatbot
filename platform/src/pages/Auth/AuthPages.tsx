import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/forms/OtpInput";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { ApiError } from "@/services/api/api-error";

const phoneSchema = z.object({
  phone: z.string().min(10, "Enter a valid Indian mobile number"),
  full_name: z.string().optional(),
});

const adminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totp_code: z.string().optional(),
});

export function LoginPage() {
  const [mode, setMode] = useState<"otp" | "admin">("otp");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "", full_name: "" },
  });
  const adminForm = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
  });

  const requestOtp = phoneForm.handleSubmit(async (values) => {
    try {
      const { data } = await authService.requestOtp(values.phone);
      setPhone(values.phone);
      setDevCode(data.dev_code);
      setStep("otp");
      toast.success("OTP sent");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to send OTP");
    }
  });

  const verify = async () => {
    try {
      const { data } = await authService.verifyOtp({
        phone,
        code: otp,
        full_name: phoneForm.getValues("full_name") || undefined,
      });
      setSession(data);
      const me = await authService.me();
      setUser(me.data);
      toast.success("Welcome to GWAK");
      navigate(data.role === "doctor" ? "/doctor" : data.role.startsWith("admin") ? "/admin" : "/app");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Invalid OTP");
    }
  };

  const adminLogin = adminForm.handleSubmit(async (values) => {
    try {
      const { data } = await authService.login(values.email, values.password, values.totp_code);
      setSession(data);
      const me = await authService.me();
      setUser(me.data);
      navigate("/admin");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Login failed");
    }
  });

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <Helmet>
        <title>Log in · GWAK</title>
      </Helmet>
      <h1 className="text-3xl font-bold text-heading">Log in</h1>
      <p className="mt-2 text-body">OTP for patients and doctors. Email + 2FA for admin.</p>
      <div className="mt-6 flex gap-2">
        <Button variant={mode === "otp" ? "primary" : "outline"} onClick={() => setMode("otp")}>
          Phone OTP
        </Button>
        <Button variant={mode === "admin" ? "primary" : "outline"} onClick={() => setMode("admin")}>
          Admin
        </Button>
      </div>

      {mode === "otp" ? (
        <div className="mt-8 space-y-4">
          {step === "phone" ? (
            <form className="space-y-4" onSubmit={(e) => void requestOtp(e)}>
              <Input placeholder="Full name (new users)" {...phoneForm.register("full_name")} />
              <Input placeholder="Mobile number" {...phoneForm.register("phone")} />
              <Button type="submit" className="w-full" loading={phoneForm.formState.isSubmitting}>
                Send OTP
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <OtpInput value={otp} onChange={setOtp} />
              {devCode ? <p className="text-xs text-body">Dev OTP: {devCode}</p> : null}
              <Button className="w-full" onClick={() => void verify()} disabled={otp.length < 6}>
                Verify & continue
              </Button>
            </div>
          )}
        </div>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={(e) => void adminLogin(e)}>
          <Input type="email" placeholder="Email" {...adminForm.register("email")} />
          <Input type="password" placeholder="Password" {...adminForm.register("password")} />
          <Input placeholder="TOTP (if enabled)" {...adminForm.register("totp_code")} />
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      )}

      <p className="mt-6 text-sm text-body">
        New here? <Link to="/auth/signup" className="font-semibold text-primary">Create account</Link>
      </p>
      <p className="mt-2 text-sm">
        <Link to="/auth/forgot" className="text-primary">
          Forgot password
        </Link>
      </p>
    </div>
  );
}

export function SignupPage() {
  return <LoginPage />;
}

export function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-heading">Reset access</h1>
      <p className="mt-2 text-body">Patients use OTP login. Admins: contact grievance@gwak.health.</p>
      <Link to="/auth/login" className="mt-6 inline-block text-primary">
        Back to login
      </Link>
    </div>
  );
}

export function SessionExpiredPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-heading">Session expired</h1>
      <p className="mt-2 text-body">Please sign in again to continue.</p>
      <Link to="/auth/login" className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-4 font-semibold text-white">
        Log in
      </Link>
    </div>
  );
}
