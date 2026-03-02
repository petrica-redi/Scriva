import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-gray-200 border-t-brand-600",
        {
          "h-4 w-4": size === "sm",
          "h-6 w-6": size === "md",
          "h-10 w-10": size === "lg",
        },
        className
      )}
    />
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-medical-text">{title}</h3>
      <p className="mt-1 text-sm text-medical-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
