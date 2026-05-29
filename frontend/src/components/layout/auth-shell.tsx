import type { LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { APP_NAME } from "@/lib/app-config";

type AuthFeature = {
  icon: LucideIcon;
  text: string;
};

type AuthShellProps = {
  title: string;
  description: string;
  features: AuthFeature[];
  children: React.ReactNode;
};

export function AuthShell({ title, description, features, children }: AuthShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background lg:flex-row">
      <div className="app-auth-aside">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, var(--color-primary) 0, transparent 45%), radial-gradient(circle at 80% 80%, oklch(0.55 0.17 155 / 0.4) 0, transparent 40%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <Avatar name={APP_NAME} size="sm" />
            <span className="text-lg font-semibold">{APP_NAME}</span>
          </div>
          <h1 className="mt-10 max-w-md text-2xl font-semibold leading-tight tracking-tight sm:mt-12 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-sidebar-foreground/70">{description}</p>
          <ul className="mt-8 space-y-2 sm:mt-10">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="app-auth-feature text-sm">
                <Icon className="size-5 shrink-0 text-primary" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-foreground/45">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-10">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <Avatar name={APP_NAME} size="sm" />
            <span className="font-semibold">{APP_NAME}</span>
          </div>
          <div className="app-auth-card p-5 sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
