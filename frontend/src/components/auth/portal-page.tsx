import Link from "next/link";
import { ArrowRight, Building2, Shield, Users, UserCog } from "lucide-react";
import { APP_NAME } from "@/lib/app-config";
import {
  ADMIN_LOGIN_PATH,
  AGENT_LOGIN_PATH,
  MANAGER_LOGIN_PATH,
  ORGANIZATION_LOGIN_PATH,
} from "@/lib/auth/constants";

const portals = [
  {
    title: "Admin",
    description: "Platform owner — register, create organizations, and manage the full workspace.",
    href: ADMIN_LOGIN_PATH,
    icon: Shield,
    badge: "Full control",
  },
  {
    title: "Organization",
    description: "Manage your organization — managers, agents, and team hierarchy.",
    href: ORGANIZATION_LOGIN_PATH,
    icon: Building2,
    badge: "Organization",
  },
  {
    title: "Manager",
    description: "Oversee your team — agents, attendance, and account settings.",
    href: MANAGER_LOGIN_PATH,
    icon: Users,
    badge: "Team lead",
  },
  {
    title: "Agent",
    description: "Your workspace — dashboard, attendance, and profile.",
    href: AGENT_LOGIN_PATH,
    icon: UserCog,
    badge: "Team member",
  },
];

export function PortalPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <div className="border-b border-border/80 bg-sidebar px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold tracking-tight">{APP_NAME}</p>
            <p className="text-sm text-muted-foreground">Choose your workspace portal</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-5xl">
          <div className="max-w-2xl">
            <p className="app-section-label text-primary">Secure access</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Sign in to the right portal
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Each role has a dedicated sign-in page. The hierarchy is Admin → Organization → Manager → Agent.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {portals.map((portal) => {
              const Icon = portal.icon;
              return (
                <Link
                  key={portal.title}
                  href={portal.href}
                  className="app-surface app-surface--elevated app-surface--interactive group flex h-full flex-col p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-[background-color,transform] duration-200 group-hover:scale-105 group-hover:bg-primary/15">
                      <Icon className="size-5" />
                    </div>
                    <span className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {portal.badge}
                    </span>
                  </div>
                  <h2 className="mt-5 text-lg font-semibold tracking-tight">{portal.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {portal.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Continue
                    <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
