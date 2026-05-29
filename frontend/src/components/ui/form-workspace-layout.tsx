"use client";

import { BadgeCheck } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

type FormWorkspaceLayoutProps = {
  tone: "admin" | "manager" | "agent";
  label: string;
  title: string;
  description: string;
  statusHint?: string;
  backLink?: React.ReactNode;
  sidebar: React.ReactNode;
  formTitle: string;
  formSubtitle?: string;
  children: React.ReactNode;
  formActions?: React.ReactNode;
  sidebarExtra?: React.ReactNode;
};

export function FormWorkspaceLayout({
  tone,
  label,
  title,
  description,
  statusHint = "Signed in",
  backLink,
  sidebar,
  formTitle,
  formSubtitle,
  children,
  formActions,
  sidebarExtra,
}: FormWorkspaceLayoutProps) {
  return (
    <div className="app-page-wide">
      {backLink ? <div className="mb-4">{backLink}</div> : null}

      <FadeIn>
        <div className={cn("app-profile-hero", `app-profile-hero--${tone}`)}>
          <div className="app-profile-hero__glow" aria-hidden />
          <div className="relative flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="app-section-label text-primary">{label}</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
            <div className="app-profile-hero__status shrink-0 self-stretch sm:self-auto lg:self-end">
              <BadgeCheck className="size-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Active session</p>
                <p className="text-xs text-muted-foreground">{statusHint}</p>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="app-profile-layout mt-6 lg:mt-8">
        <aside className="flex min-w-0 flex-col gap-5">
          <FadeIn delay={60}>
            <section className="app-profile-panel app-profile-panel--overview">{sidebar}</section>
          </FadeIn>
          {sidebarExtra ? <FadeIn delay={80}>{sidebarExtra}</FadeIn> : null}
        </aside>

        <FadeIn delay={80}>
          <section className="app-profile-panel app-profile-panel--form min-w-0">
            <div className="app-profile-panel__header">
              <div>
                <p className="app-profile-panel__title">{formTitle}</p>
                {formSubtitle ? (
                  <p className="app-profile-panel__subtitle">{formSubtitle}</p>
                ) : null}
              </div>
            </div>
            <div className="app-profile-panel__body">
              {children}
              {formActions ? (
                <div className="app-profile-form-actions">{formActions}</div>
              ) : null}
            </div>
          </section>
        </FadeIn>
      </div>
    </div>
  );
}
