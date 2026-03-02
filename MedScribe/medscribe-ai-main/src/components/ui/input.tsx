import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-medical-text">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "block w-full rounded-lg border px-4 py-3 text-medical-text transition focus:outline-none focus:ring-2",
            error
              ? "border-medical-danger focus:border-medical-danger focus:ring-red-500/20"
              : "border-medical-border focus:border-brand-500 focus:ring-brand-500/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-medical-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
