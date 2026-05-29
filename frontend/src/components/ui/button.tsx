import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type ButtonVariant = "primary" | "secondary" | "destructive";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingText?: string;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "app-btn-primary",
  secondary: "app-btn-secondary",
  destructive: "app-btn-destructive",
};

export function Button({
  variant = "primary",
  loading = false,
  loadingText,
  children,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const spinnerClass =
    variant === "primary"
      ? "border-primary-foreground/30 border-t-primary-foreground"
      : "border-primary/20 border-t-primary";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(variantClass[variant], className)}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" className={spinnerClass} />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
