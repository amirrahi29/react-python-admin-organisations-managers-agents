import { Ban, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        active
          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
          : "bg-destructive/10 text-destructive ring-1 ring-destructive/20"
      )}
    >
      {active ? <CheckCircle2 className="size-3.5" /> : <Ban className="size-3.5" />}
      {active ? "Active" : "Blocked"}
    </span>
  );
}
