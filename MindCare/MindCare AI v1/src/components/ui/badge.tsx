import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/i18n-context";

interface BadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: BadgeProps) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        getStatusColor(status),
        className
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}
