"use client";

import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "up" | "in" | "scale";
};

const variantClass = {
  up: "animate-fade-in-up",
  in: "animate-fade-in",
  scale: "animate-scale-in",
} as const;

export function FadeIn({ children, className, delay = 0, variant = "up" }: FadeInProps) {
  const style: CSSProperties | undefined =
    delay > 0 ? { animationDelay: `${delay}ms` } : undefined;

  return (
    <div className={cn(variantClass[variant], className)} style={style}>
      {children}
    </div>
  );
}

type PageEnterProps = {
  children: ReactNode;
  className?: string;
  subtle?: boolean;
};

/** Fast page content wrapper — subtle=true skips enter animation for snappy in-app nav. */
export function PageEnter({ children, className, subtle = true }: PageEnterProps) {
  return (
    <div className={cn(!subtle && "animate-fade-in-up", className)}>
      {children}
    </div>
  );
}
