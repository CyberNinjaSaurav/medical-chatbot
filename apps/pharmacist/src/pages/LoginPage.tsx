import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/forms/OtpInput";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { ApiError } from "@/services/api/api-error";

const OK = new Set(["pharmacist", "admin_pharmacy"]);

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
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Licensed dispense</p>
      <h1 className="font-display mt-2 text-3xl font-bold text-heading">GWAK Dispense</h1>
      <p className="mt-2 text-body">Mandatory Rx verification — audited, never skipped</p>
      <div className="mt-8 space-y-4">
        {step === "phone" ? (
          <>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Pharmacist mobile" />
            <Button className="w-full" loading={loading} onClick={async () => {
              setLoading(true);
              try {
                const { data } = await authService.requestOtp(phone);
                setDevCode(data.dev_code); setStep("otp"); toast.success("OTP sent");
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
                if (!OK.has(me.data.role)) { logout(); toast.error("Pharmacist access only"); return; }
                setUser(me.data); navigate("/");
              } catch (e) { toast.error(e instanceof ApiError ? e.message : "Invalid OTP"); }
              finally { setLoading(false); }
            }}>Open console</Button>
          </>
        )}
      </div>
    </div>
  );
}
