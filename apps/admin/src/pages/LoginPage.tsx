import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth-store";
import { ApiError } from "@/services/api/api-error";

const ADMIN_ROLES = new Set(["admin", "admin_pharmacy", "admin_content", "admin_support"]);

export function LoginPage() {
  const [email, setEmail] = useState("admin@gwak.health");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await authService.login(email, password, totp || undefined);
      setSession(data);
      const me = await authService.me();
      if (!ADMIN_ROLES.has(me.data.role)) {
        logout();
        toast.error("Admin credentials required");
        return;
      }
      setUser(me.data);
      navigate("/");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Operations</p>
      <h1 className="mt-2 text-2xl font-bold text-heading">GWAK Ops</h1>
      <p className="mt-1 text-sm text-body">Operations, catalog, compliance</p>
      <div className="mt-8 space-y-3">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <Input value={totp} onChange={(e) => setTotp(e.target.value)} placeholder="2FA code (if enabled)" />
        <Button className="w-full" loading={loading} onClick={() => void submit()}>Sign in</Button>
      </div>
    </div>
  );
}
