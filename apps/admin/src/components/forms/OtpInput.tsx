export function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="numeric"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      placeholder="6-digit OTP"
      className="h-12 w-full rounded-[var(--radius)] border border-border bg-card px-4 text-center text-lg tracking-[0.4em] text-heading"
      aria-label="OTP"
    />
  );
}
