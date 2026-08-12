import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/utils/cn";

export function OtpInput({
  length = 6,
  value,
  onChange,
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  const setAt = (index: number, digit: string) => {
    const next = chars.map((c, i) => (i === index ? digit : c));
    onChange(next.join("").slice(0, length));
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !chars[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2" role="group" aria-label="One-time password">
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={char}
          aria-label={`Digit ${index + 1}`}
          className={cn(
            "h-12 w-10 rounded-xl border border-border bg-card text-center text-lg font-semibold text-heading",
          )}
          onChange={(e) => {
            const digit = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(index, digit);
            if (digit && index < length - 1) refs.current[index + 1]?.focus();
          }}
          onKeyDown={(e) => onKeyDown(index, e)}
        />
      ))}
    </div>
  );
}

export function useLocalOtp() {
  const [otp, setOtp] = useState("");
  return { otp, setOtp };
}
