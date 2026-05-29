import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type InputWithIconProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon: LucideIcon;
};

export function InputWithIcon({ icon: Icon, className, ...props }: InputWithIconProps) {
  return (
    <div className="app-field-group relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <input className={cn("app-input pl-10", className)} {...props} />
    </div>
  );
}
