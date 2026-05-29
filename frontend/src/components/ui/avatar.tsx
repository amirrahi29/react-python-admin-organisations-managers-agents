import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg";

type AvatarProps = {
  name: string;
  size?: AvatarSize;
  className?: string;
};

const sizeClass: Record<AvatarSize, string> = {
  sm: "size-9 text-xs rounded-lg",
  md: "size-12 text-base rounded-2xl sm:size-14 sm:text-lg",
  lg: "size-14 text-xl rounded-2xl sm:size-16",
};

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const initial = (name.trim().charAt(0) || "A").toUpperCase();

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-primary to-emerald-600 font-bold text-primary-foreground shadow-md",
        sizeClass[size],
        className
      )}
    >
      {initial}
    </span>
  );
}
