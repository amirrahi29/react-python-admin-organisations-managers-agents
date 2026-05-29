import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type PageLoaderProps = {
  message?: string;
  submessage?: string;
  className?: string;
  fullScreen?: boolean;
};

export function PageLoader({
  message = "Loading…",
  submessage,
  className,
  fullScreen = true,
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-4 bg-background px-6 text-center",
        fullScreen ? "min-h-[100dvh]" : "py-16",
        className
      )}
    >
      <div className="relative flex size-14 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary/8 blur-xl"
        />
        <span
          aria-hidden
          className="absolute inset-1 rounded-full bg-primary/5"
        />
        <Spinner size="lg" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold tracking-tight text-foreground">{message}</p>
        {submessage ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{submessage}</p>
        ) : null}
      </div>
    </div>
  );
}
