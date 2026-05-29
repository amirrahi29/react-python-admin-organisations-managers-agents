import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("app-skeleton", className)} aria-hidden />;
}

/** Instant feedback while a dashboard route loads (used by loading.tsx). */
export function DashboardRouteLoading() {
  return (
    <div
      className="app-page-wide animate-fade-in space-y-5"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="space-y-2">
        <Bar className="h-3 w-24" />
        <Bar className="h-7 w-64 max-w-full" />
        <Bar className="h-3 w-80 max-w-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="app-surface app-surface--elevated p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <Bar className="h-3 w-20" />
              <Bar className="h-8 w-8 rounded-xl" />
            </div>
            <Bar className="mt-4 h-8 w-20" />
            <Bar className="mt-3 h-3 w-28 max-w-full" />
          </div>
        ))}
      </div>

      <div className="app-surface app-surface--elevated p-5">
        <div className="flex items-center justify-between gap-3">
          <Bar className="h-4 w-40" />
          <Bar className="h-8 w-24 rounded-full" />
        </div>
        <Bar className="mt-5 h-52 w-full rounded-xl" />
      </div>
    </div>
  );
}
