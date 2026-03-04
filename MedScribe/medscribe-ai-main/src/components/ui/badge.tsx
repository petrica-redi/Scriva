"use client";

import { cn, getStatusColor } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();

  const key = `status.${status}` as Parameters<typeof t>[0];
  const label = t(key);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        getStatusColor(status),
        className
      )}
    >
      {label !== key ? label : status}
    </span>
  );
}

const variantStyles: Record<string, string> = {
  default: "bg-brand-100 text-brand-800",
  secondary: "bg-gray-100 text-gray-800",
  outline: "border border-medical-border text-medical-muted bg-transparent",
  destructive: "bg-red-100 text-red-800",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantStyles;
}

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantStyles[variant] ?? variantStyles.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
