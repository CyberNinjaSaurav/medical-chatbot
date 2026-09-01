import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/forms/OtpInput";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { ApiError } from "@/services/api/api-error";

export function LoginPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-3xl font-bold text-heading">GWAK Ride</h1>
      <p className="mt-2 text-body">Assigned orders · pack to delivered</p>
      <div className="mt-8 space-y-4">
        {step === "phone" ? (
          <>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Agent mobile" />
            <Button className="w-full" loading={loading} onClick={async () => {
              setLoading(true);
              try {
                const { data } = await authService.requestOtp(phone);
                setDevCode(data.dev_code); setStep("otp");
              } catch (e) { toast.error(e instanceof ApiError ? e.message : "Failed"); }
              finally { setLoading(false); }
            }}>Send OTP</Button>
          </>
        ) : (
          <>
            <OtpInput value={otp} onChange={setOtp} />
            {devCode ? <p className="text-xs">Dev OTP: {devCode}</p> : null}
            <Button className="w-full" loading={loading} disabled={otp.length < 6} onClick={async () => {
              setLoading(true);
              try {
                const { data } = await authService.verifyOtp({ phone, code: otp });
                setSession(data);
                const me = await authService.me();
                if (me.data.role !== "delivery") { logout(); toast.error("Delivery agent only"); return; }
                setUser(me.data); navigate("/");
              } catch (e) { toast.error(e instanceof ApiError ? e.message : "Invalid OTP"); }
              finally { setLoading(false); }
            }}>Start shift</Button>
          </>
        )}
      </div>
    </div>
  );
}
