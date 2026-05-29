import { cn } from "@/lib/utils";

type AlertProps = {
  variant: "error" | "success";
  children: React.ReactNode;
  className?: string;
};

export function Alert({ variant, children, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "app-alert",
        variant === "error" ? "app-alert--error" : "app-alert--success",
        className
      )}
    >
      {children}
    </div>
  );
}
