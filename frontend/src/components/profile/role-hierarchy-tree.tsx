import { Bot, GitBranch, Headphones, Shield, Users } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import type { RoleHierarchyMember } from "@/lib/auth/constants";

const CORE_ROLE_META = {
  Admin: { icon: Shield, tone: "admin" as const },
  Manager: { icon: Users, tone: "manager" as const },
} as const;

function getRoleMeta(role: string) {
  if (role in CORE_ROLE_META) {
    const meta = CORE_ROLE_META[role as keyof typeof CORE_ROLE_META];
    return { ...meta, label: role };
  }

  const isAgentRole = role.endsWith(" Agent");
  return {
    icon: isAgentRole && role.includes(" AI ") ? Bot : Headphones,
    tone: "agent" as const,
    label: role,
  };
}

type RoleHierarchyTreeProps = {
  nodes: RoleHierarchyMember[];
  embedded?: boolean;
};

export function RoleHierarchyTree({ nodes, embedded = false }: RoleHierarchyTreeProps) {
  const currentEmail = nodes[nodes.length - 1]?.email;

  return (
    <div className={cn("app-org-chart", embedded && "app-org-chart--embedded")}>
      <div className="app-org-chart__header">
        <div className="app-org-chart__header-icon" aria-hidden>
          <GitBranch className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="app-org-chart__title">Reporting chain</p>
          <p className="app-org-chart__subtitle">Organization hierarchy</p>
        </div>
      </div>

      <div className="app-org-chart__tree">
        <div className="app-org-chart__spine" aria-hidden />

        <ol className="app-org-chart__list">
          {nodes.map((node) => {
            const meta = getRoleMeta(node.role);
            const Icon = meta.icon;
            const isCurrent = node.email === currentEmail;

            return (
              <li
                key={`${node.role}-${node.email}`}
                className={cn(
                  "app-org-chart__row",
                  `app-org-chart__row--${meta.tone}`,
                  isCurrent && "app-org-chart__row--current"
                )}
              >
                <div className="app-org-chart__marker" aria-hidden>
                  <span className="app-org-chart__initials">{getInitials(node.name)}</span>
                  <span className="app-org-chart__marker-icon">
                    <Icon className="size-2.5" />
                  </span>
                </div>

                <div className="app-org-chart__branch" aria-hidden />

                <div className={cn("app-org-chart__node", isCurrent && "app-org-chart__node--current")}>
                  <div className="app-org-chart__meta">
                    <div className="app-org-chart__identity">
                      <span className="app-org-chart__name">{node.name}</span>
                      <span className="app-org-chart__role">{meta.label}</span>
                      {isCurrent ? <span className="app-org-chart__you">You</span> : null}
                    </div>
                    <p className="app-org-chart__email">{node.email}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
