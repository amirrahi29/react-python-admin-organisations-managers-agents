"use client";

import {
  Briefcase,
  CalendarDays,
  Clock3,
  IdCard,
  Mail,
  Phone,
  Save,
  Shield,
  User,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormActions } from "@/components/ui/form-actions";
import { FormField } from "@/components/ui/form-field";
import { FormWorkspaceLayout } from "@/components/ui/form-workspace-layout";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import {
  formatMemberDate,
  ProfileDetail,
  ProfileOrgBlock,
  ProfileOverviewHeader,
} from "@/components/ui/profile-overview";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { RoleHierarchyTree } from "@/components/profile/role-hierarchy-tree";
import type {
  AdminInfo,
  AgentInfo,
  AuthRole,
  ManagerInfo,
  OrganizationInfo,
} from "@/lib/auth/constants";
import type { RoleHierarchyChain } from "@/lib/auth/hierarchy";
import { getAgentRoleLabel } from "@/lib/team/constants";

type ProfileWorkspaceProps = {
  authRole: AuthRole;
  user: AdminInfo | ManagerInfo | AgentInfo | OrganizationInfo;
  hierarchy?: RoleHierarchyChain;
  showContactFields?: boolean;
  submitting: boolean;
  error: string;
  success: string;
  name: string;
  phone: string;
  jobTitle: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onJobTitleChange: (value: string) => void;
  onSave: () => void;
  onEnterKey: (event: React.KeyboardEvent) => void;
};

const ROLE_COPY: Record<
  AuthRole,
  { label: string; title: string; description: string; badge: string; tone: "admin" | "manager" | "agent" }
> = {
  admin: {
    label: "Administrator profile",
    title: "Account & workspace settings",
    description:
      "Manage your personal details, contact information, and administrator profile for your organization.",
    badge: "Administrator",
    tone: "admin",
  },
  organization: {
    label: "Organization profile",
    title: "Organization account settings",
    description: "Manage your organization workspace details and sign-in information.",
    badge: "Organization",
    tone: "admin",
  },
  manager: {
    label: "Manager profile",
    title: "Team lead account settings",
    description: "Keep your manager profile and contact details up to date for your workspace.",
    badge: "Manager",
    tone: "manager",
  },
  agent: {
    label: "Agent profile",
    title: "Operations account settings",
    description: "Update your personal details and assignment information for your agent workspace.",
    badge: "Agent",
    tone: "agent",
  },
};

export function ProfileWorkspace({
  authRole,
  user,
  hierarchy,
  showContactFields = true,
  submitting,
  error,
  success,
  name,
  phone,
  jobTitle,
  onNameChange,
  onPhoneChange,
  onJobTitleChange,
  onSave,
  onEnterKey,
}: ProfileWorkspaceProps) {
  const copy = ROLE_COPY[authRole];
  const firstName = user.name.split(" ")[0] ?? copy.badge;
  const accountId = "account_id" in user ? user.account_id : null;
  const agentUser = authRole === "agent" ? (user as AgentInfo) : null;
  const nameLabel = authRole === "organization" ? "Organization name" : "Full name";
  const namePlaceholder = authRole === "organization" ? "Acme Sales North" : "Your full name";

  return (
    <FormWorkspaceLayout
      tone={copy.tone}
      label={copy.label}
      title={copy.title}
      description={copy.description}
      statusHint={`Signed in as ${firstName}`}
      sidebar={
        <>
          <div className="app-profile-panel__header">
            <p className="app-profile-panel__title">Profile overview</p>
            <p className="app-profile-panel__subtitle">Account summary and organization details</p>
          </div>
          <ProfileOverviewHeader
            avatar={
              <ProfileAvatar name={user.name} size="lg" hierarchy={hierarchy} placement="bottom-start" />
            }
            name={user.name}
            email={user.email}
            roleBadge={copy.badge}
            roleTone={copy.tone}
            meta={
              agentUser ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {getAgentRoleLabel()}
                </p>
              ) : null
            }
          />
          <div className="app-profile-panel__section">
            <div className="app-profile-detail-grid">
              {accountId ? (
                <ProfileDetail icon={IdCard} label="Account ID" value={accountId} mono />
              ) : null}
              <ProfileDetail
                icon={CalendarDays}
                label="Member since"
                value={formatMemberDate(user.created_at)}
              />
              <ProfileDetail
                icon={Clock3}
                label="Last updated"
                value={formatMemberDate(user.updated_at)}
              />
              {"job_title" in user && user.job_title?.trim() ? (
                <ProfileDetail icon={Briefcase} label="Job title" value={user.job_title.trim()} />
              ) : null}
              {"phone" in user && user.phone?.trim() ? (
                <ProfileDetail icon={Phone} label="Phone" value={user.phone.trim()} />
              ) : null}
            </div>

            {agentUser ? (
              <div className="app-profile-org-grid">
                <ProfileOrgBlock
                  title="Manager"
                  name={agentUser.manager.name}
                  meta={agentUser.manager.email}
                  icon={Users}
                />
                <ProfileOrgBlock
                  title="Admin"
                  name={agentUser.admin.name}
                  meta={agentUser.admin.email}
                  icon={Shield}
                />
              </div>
            ) : null}
          </div>
        </>
      }
      sidebarExtra={
        hierarchy?.nodes.length ? (
          <section className="app-profile-panel app-profile-panel--flush overflow-hidden">
            <RoleHierarchyTree nodes={hierarchy.nodes} embedded />
          </section>
        ) : null
      }
      formTitle={authRole === "organization" ? "Organization details" : "Personal information"}
      formSubtitle={
        authRole === "organization"
          ? "Update the name shown across your organization workspace."
          : "Update the details shown across your workspace."
      }
      formActions={
        <FormActions>
          <Button
            className="h-11 w-full sm:min-w-[180px] sm:w-auto"
            loading={submitting}
            loadingText="Saving..."
            onClick={onSave}
          >
            <Save className="size-4" />
            Save changes
          </Button>
        </FormActions>
      }
    >
      {error ? <Alert variant="error" className="mb-5">{error}</Alert> : null}
      {success ? <Alert variant="success" className="mb-5">{success}</Alert> : null}

      <div className="space-y-5">
        <FormField label={nameLabel} htmlFor="profile-name" required>
          <InputWithIcon
            id="profile-name"
            icon={User}
            type="text"
            autoComplete="name"
            disabled={submitting}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            onKeyDown={onEnterKey}
            placeholder={namePlaceholder}
          />
        </FormField>

        {showContactFields ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Phone number" htmlFor="profile-phone">
              <InputWithIcon
                id="profile-phone"
                icon={Phone}
                type="tel"
                autoComplete="tel"
                disabled={submitting}
                value={phone}
                onChange={(event) => onPhoneChange(event.target.value)}
                onKeyDown={onEnterKey}
                placeholder="+91 98765 43210"
              />
            </FormField>

            <FormField label="Job title" htmlFor="profile-job-title">
              <InputWithIcon
                id="profile-job-title"
                icon={Briefcase}
                type="text"
                autoComplete="organization-title"
                disabled={submitting}
                value={jobTitle}
                onChange={(event) => onJobTitleChange(event.target.value)}
                onKeyDown={onEnterKey}
                placeholder="Operations Manager"
              />
            </FormField>
          </div>
        ) : null}
      </div>

      <div className="app-profile-form-divider" />

      <div>
        <p className="app-profile-form-section__title">Sign-in credentials</p>
        <p className="app-profile-form-section__hint">
          This email is locked for security. Contact your administrator if it needs to be updated.
        </p>
        <div className="mt-4">
          <FormField label="Email address" htmlFor="profile-email">
            <InputWithIcon
              id="profile-email"
              icon={Mail}
              type="email"
              value={user.email}
              disabled
              readOnly
            />
          </FormField>
        </div>
      </div>
    </FormWorkspaceLayout>
  );
}
