import { cn } from "@/lib/utils";
import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, placeholder, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-medical-text">
            {label}
          </label>
        )}
        <select
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
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-medical-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
