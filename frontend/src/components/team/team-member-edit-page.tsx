"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormActions } from "@/components/ui/form-actions";
import { FormField } from "@/components/ui/form-field";
import { FormWorkspaceLayout } from "@/components/ui/form-workspace-layout";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { PageLoader } from "@/components/ui/page-loader";
import {
  formatMemberDate,
  ProfileDetail,
  ProfileOrgBlock,
  ProfileOverviewHeader,
} from "@/components/ui/profile-overview";
import { AuthError } from "@/lib/auth/constants";
import { getAgentRoleLabel } from "@/lib/team/constants";
import {
  getAgentsListPath,
  ADMIN_MANAGERS_PATH,
  type TeamMember,
} from "@/lib/team/constants";
import {
  ORGANIZATION_AGENTS_PATH,
  ORGANIZATION_MANAGERS_PATH,
} from "@/lib/organizations/constants";
import {
  getAgent,
  getManager,
  listManagers,
  updateAgent,
  updateManager,
} from "@/lib/team/client";
import { getManagerAgent, updateManagerAgent } from "@/lib/team/manager-client";
import {
  getOrganizationAgent,
  getOrganizationManager,
  listOrganizationManagers,
  updateOrganizationAgent,
  updateOrganizationManager,
} from "@/lib/organizations/team-client";
import {
  getFirstNameError,
  getLastNameError,
  NAME_PART_MAX_LENGTH,
  splitPersonName,
} from "@/lib/validation";

type TeamKind = "manager" | "agent";
type TeamScope = "admin" | "manager" | "organization";

function listPathFor(kind: TeamKind, scope: TeamScope) {
  if (kind === "agent") {
    if (scope === "organization") return ORGANIZATION_AGENTS_PATH;
    return getAgentsListPath(scope === "manager" ? "manager" : "admin");
  }
  if (scope === "organization") return ORGANIZATION_MANAGERS_PATH;
  return ADMIN_MANAGERS_PATH;
}

const COPY: Record<
  TeamKind,
  {
    singular: string;
    loadError: string;
    saveError: string;
    tone: "manager" | "agent";
  }
> = {
  manager: {
    singular: "Manager",
    loadError: "Unable to load manager details.",
    saveError: "Unable to update manager right now.",
    tone: "manager",
  },
  agent: {
    singular: "Agent",
    loadError: "Unable to load agent details.",
    saveError: "Unable to update agent right now.",
    tone: "agent",
  },
};

export function TeamMemberEditPage({
  kind,
  accountId,
  scope = "admin",
}: {
  kind: TeamKind;
  accountId: string;
  scope?: TeamScope;
}) {
  const router = useRouter();
  const copy = COPY[kind];
  const isManagerScope = scope === "manager";
  const isOrganizationScope = scope === "organization";
  const showManagerForm = kind === "agent" && (scope === "admin" || scope === "organization");
  const showOrgDetails = scope === "admin";

  const [member, setMember] = useState<TeamMember | null>(null);
  const [managers, setManagers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [managerId, setManagerId] = useState("");

  const listPath = useMemo(() => listPathFor(kind, scope), [kind, scope]);

  const loadMember = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const memberData =
        isOrganizationScope && kind === "manager"
          ? await getOrganizationManager(accountId)
          : isOrganizationScope && kind === "agent"
            ? await getOrganizationAgent(accountId)
            : isManagerScope && kind === "agent"
              ? await getManagerAgent(accountId)
              : kind === "manager"
                ? await getManager(accountId)
                : await getAgent(accountId);
      const managersData = showManagerForm
        ? isOrganizationScope
          ? await listOrganizationManagers({ page: 1, pageSize: 100, status: "active" })
          : await listManagers({ page: 1, pageSize: 100 })
        : null;

      const item = memberData.item;
      setMember(item);
      const parts = splitPersonName(item.name);
      setFirstName(parts.firstName);
      setLastName(parts.lastName);
      setPhone(item.phone ?? "");
      setJobTitle(item.job_title ?? "");

      if (showManagerForm && managersData) {
        setManagers(managersData.items);
        if (item.manager) {
          const matched = managersData.items.find(
            (manager) => manager.email === item.manager?.email
          );
          setManagerId(matched?.account_id ?? "");
        }
      }
    } catch (err) {
      setError(err instanceof AuthError ? err.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [accountId, copy.loadError, kind, isManagerScope, isOrganizationScope, showManagerForm]);

  useEffect(() => {
    void loadMember();
  }, [loadMember]);

  const canSubmit = useMemo(() => {
    const trimmedPhone = phone.trim();
    const trimmedJobTitle = jobTitle.trim();
    if (getFirstNameError(firstName)) return false;
    if (getLastNameError(lastName)) return false;
    if (trimmedPhone.length < 7) return false;
    if (!trimmedJobTitle) return false;
    if (showManagerForm && !managerId) return false;
    return true;
  }, [firstName, lastName, phone, jobTitle, showManagerForm, managerId]);

  function clearMessages() {
    if (error) setError("");
    if (success) setSuccess("");
  }

  async function handleSave() {
    if (submitting || !member) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedPhone = phone.trim();
    const trimmedJobTitle = jobTitle.trim();

    const firstNameError = getFirstNameError(trimmedFirstName);
    if (firstNameError) {
      setError(firstNameError);
      setSuccess("");
      return;
    }
    const lastNameError = getLastNameError(trimmedLastName);
    if (lastNameError) {
      setError(lastNameError);
      setSuccess("");
      return;
    }
    if (trimmedPhone.length < 7) {
      setError("Please enter a valid phone number.");
      setSuccess("");
      return;
    }
    if (!trimmedJobTitle) {
      setError("Job title is required.");
      setSuccess("");
      return;
    }
    if (showManagerForm && !managerId) {
      setError("Please select a manager.");
      setSuccess("");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const result =
        kind === "manager"
          ? isOrganizationScope
            ? await updateOrganizationManager(accountId, {
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                phone: trimmedPhone,
                jobTitle: trimmedJobTitle,
              })
            : await updateManager(accountId, {
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                phone: trimmedPhone,
                jobTitle: trimmedJobTitle,
              })
          : isManagerScope
            ? await updateManagerAgent(accountId, {
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                phone: trimmedPhone,
                jobTitle: trimmedJobTitle,
              })
            : isOrganizationScope
              ? await updateOrganizationAgent(accountId, {
                  firstName: trimmedFirstName,
                  lastName: trimmedLastName,
                  phone: trimmedPhone,
                  jobTitle: trimmedJobTitle,
                  managerAccountId: managerId,
                })
              : await updateAgent(accountId, {
                  firstName: trimmedFirstName,
                  lastName: trimmedLastName,
                  phone: trimmedPhone,
                  jobTitle: trimmedJobTitle,
                  managerAccountId: managerId,
                });

      setMember(result.item);
      setSuccess(result.message || `${copy.singular} updated successfully.`);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : copy.saveError);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PageLoader
        fullScreen={false}
        message={`Loading ${copy.singular.toLowerCase()}...`}
        submessage="Fetching account details"
        className="app-page-wide"
      />
    );
  }

  if (!member) {
    return (
      <div className="app-page-wide">
        <Alert variant="error">{error || `${copy.singular} not found.`}</Alert>
        <Link href={listPath} className="app-btn-secondary mt-4 inline-flex h-10 items-center gap-2 px-4">
          <ArrowLeft className="size-4" />
          Back to {isManagerScope ? "agents" : kind === "manager" ? "managers" : "agents"}
        </Link>
      </div>
    );
  }

  const active = member.is_active === 1;
  const backLabel = isManagerScope ? "agents" : kind === "manager" ? "managers" : "agents";

  return (
    <FormWorkspaceLayout
      tone={copy.tone}
      label={`${copy.singular} settings`}
      title={`Edit ${copy.singular.toLowerCase()}`}
      description="Update profile details, role configuration, and assignment information."
      statusHint={`Editing ${member.name}`}
      backLink={
        <Link
          href={listPath}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to {backLabel}
        </Link>
      }
      sidebar={
        <>
          <div className="app-profile-panel__header">
            <p className="app-profile-panel__title">Member overview</p>
          </div>
          <ProfileOverviewHeader
            avatar={<Avatar name={member.name} size="lg" />}
            name={member.name}
            email={member.email}
            roleBadge={copy.singular}
            roleTone={copy.tone}
            statusActive={active}
            meta={
              kind === "agent" ? (
                <p className="text-xs text-muted-foreground">{getAgentRoleLabel()}</p>
              ) : null
            }
          />
          <div className="app-profile-panel__body border-t border-border/60 pt-0">
            <div className="app-profile-detail-grid">
              <ProfileDetail icon={IdCard} label="Account ID" value={member.account_id} mono />
              <ProfileDetail
                icon={CalendarDays}
                label="Member since"
                value={formatMemberDate(member.created_at)}
              />
              <ProfileDetail
                icon={Clock3}
                label="Last updated"
                value={formatMemberDate(member.updated_at)}
              />
              {member.job_title?.trim() ? (
                <ProfileDetail icon={Briefcase} label="Job title" value={member.job_title.trim()} />
              ) : null}
              {member.phone?.trim() ? (
                <ProfileDetail icon={Phone} label="Phone" value={member.phone.trim()} />
              ) : null}
            </div>

            {showOrgDetails ? (
              <div className="app-profile-org-grid mt-5">
                <ProfileOrgBlock
                  title="Created by admin"
                  name={member.created_by ?? "Unknown"}
                  icon={Shield}
                />
                {kind === "agent" && member.manager ? (
                  <ProfileOrgBlock
                    title="Assigned manager"
                    name={member.manager.name}
                    meta={member.manager.email}
                    icon={Users}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      }
      formTitle="Account details"
      formSubtitle="Email stays locked for security. Update the editable fields below."
      formActions={
        <FormActions>
          <Button
            variant="secondary"
            className="h-11 w-full sm:min-w-[120px] sm:w-auto"
            onClick={() => router.push(listPath)}
          >
            Cancel
          </Button>
          <Button
            className="h-11 w-full sm:min-w-[160px] sm:w-auto"
            disabled={!canSubmit}
            loading={submitting}
            loadingText="Saving..."
            onClick={() => void handleSave()}
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
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="First name" htmlFor="edit-first-name" required>
            <InputWithIcon
              id="edit-first-name"
              icon={User}
              type="text"
              autoComplete="given-name"
              disabled={submitting}
              value={firstName}
              maxLength={NAME_PART_MAX_LENGTH}
              onChange={(event) => {
                setFirstName(event.target.value);
                clearMessages();
              }}
              placeholder="First name"
            />
          </FormField>
          <FormField label="Last name" htmlFor="edit-last-name" required>
            <InputWithIcon
              id="edit-last-name"
              icon={User}
              type="text"
              autoComplete="family-name"
              disabled={submitting}
              value={lastName}
              maxLength={NAME_PART_MAX_LENGTH}
              onChange={(event) => {
                setLastName(event.target.value);
                clearMessages();
              }}
              placeholder="Last name"
            />
          </FormField>
        </div>

        <FormField label="Email address" htmlFor="edit-email">
          <InputWithIcon
            id="edit-email"
            icon={Mail}
            type="email"
            value={member.email}
            disabled
            readOnly
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Phone number" htmlFor="edit-phone" required>
            <InputWithIcon
              id="edit-phone"
              icon={Phone}
              type="tel"
              autoComplete="tel"
              disabled={submitting}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                clearMessages();
              }}
              placeholder="+91 98765 43210"
            />
          </FormField>
          <FormField label="Job title" htmlFor="edit-job-title" required>
            <InputWithIcon
              id="edit-job-title"
              icon={Briefcase}
              type="text"
              autoComplete="organization-title"
              disabled={submitting}
              value={jobTitle}
              onChange={(event) => {
                setJobTitle(event.target.value);
                clearMessages();
              }}
              placeholder="Operations Manager"
            />
          </FormField>
        </div>

        {showManagerForm ? (
          <>
            <div className="app-profile-form-divider !my-6" />
            <FormField label="Manager" htmlFor="edit-manager" required>
              <select
                id="edit-manager"
                value={managerId}
                onChange={(event) => {
                  setManagerId(event.target.value);
                  clearMessages();
                }}
                className="app-input"
                disabled={submitting || managers.length === 0}
                required
              >
                <option value="" disabled>
                  Select a manager
                </option>
                {managers.map((manager) => (
                  <option key={manager.account_id} value={manager.account_id}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </FormField>
          </>
        ) : null}
      </div>
    </FormWorkspaceLayout>
  );
}
