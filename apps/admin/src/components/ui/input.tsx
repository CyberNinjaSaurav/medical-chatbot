import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(
      "h-11 w-full rounded-[var(--radius)] border border-border bg-card px-3 text-sm text-heading placeholder:text-body/70",
      className,
    )} {...props} />
  ),
);
Input.displayName = "Input";
