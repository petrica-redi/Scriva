"use client";

import { cn, getStatusColor } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

interface BadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: BadgeProps) {
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
