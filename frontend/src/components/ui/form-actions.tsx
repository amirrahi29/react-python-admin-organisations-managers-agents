import { cn } from "@/lib/utils";

type FormActionsProps = {
  children: React.ReactNode;
  className?: string;
};

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div className={cn("flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end", className)}>
      {children}
    </div>
  );
}
