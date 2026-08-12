import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-card px-3 text-heading placeholder:text-body/70",
        "focus-visible:border-primary",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
