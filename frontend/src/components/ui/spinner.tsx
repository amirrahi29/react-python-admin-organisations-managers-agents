import { cn } from "@/lib/utils";

type SpinnerProps = {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
};

const sizes: Record<NonNullable<SpinnerProps["size"]>, string> = {
  xs: "size-3 border-[1.5px]",
  sm: "size-4 border-[2px]",
  md: "size-5 border-[2.25px]",
  lg: "size-9 border-[2.5px]",
  xl: "size-12 border-[3px]",
};

export function Spinner({ size = "md", className, label = "Loading" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block animate-spin rounded-full border-solid border-primary/20 border-t-primary",
        "[animation-duration:0.7s]",
        sizes[size],
        className
      )}
    />
  );
}
