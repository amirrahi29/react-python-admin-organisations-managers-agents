"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Mail, Phone, Plus, RefreshCw, Shield, User, Users } from "lucide-react";
import { generateSecurePassword } from "@/lib/password";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormActions } from "@/components/ui/form-actions";
import { FormField } from "@/components/ui/form-field";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { FadeIn } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { PasswordInput } from "@/components/ui/password-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableSkeleton, CardListSkeleton } from "@/components/ui/table-skeleton";
import { DataTableToolbar, type DataTableFilterOption } from "@/components/ui/data-table-toolbar";
import { AuthError } from "@/lib/auth/constants";
import type { PaginationMeta, TeamMember, TeamStatusFilter } from "@/lib/team/constants";
import {
  ADMIN_AGENTS_PATH,
  ADMIN_MANAGERS_PATH,
  DEFAULT_PAGE_SIZE,
  MANAGER_AGENTS_PATH,
  getAdminManagerAgentsPath,
} from "@/lib/team/constants";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_HINT,
  PASSWORD_MAX_LENGTH,
  getEmailError,
  getFirstNameError,
  getLastNameError,
  getPasswordError,
  getConfirmPasswordError,
  getConfirmPasswordMismatchError,
  isValidPhone,
  NAME_PART_MAX_LENGTH,
} from "@/lib/validation";
import {
  createAgent,
  createManager,
  deleteAgent,
  deleteManager,
  listAgents,
  listManagers,
  updateAgentStatus,
  updateManagerStatus,
} from "@/lib/team/client";
import {
  createManagerAgent,
  deleteManagerAgent,
  listManagerAgents,
  updateManagerAgentStatus,
} from "@/lib/team/manager-client";
import {
  ORGANIZATION_AGENTS_PATH,
  ORGANIZATION_MANAGERS_PATH,
} from "@/lib/organizations/constants";
import {
  createOrganizationAgent,
  createOrganizationManager,
  deleteOrganizationAgent,
  deleteOrganizationManager,
  listOrganizationAgents,
  listOrganizationManagers,
  updateOrganizationAgentStatus,
  updateOrganizationManagerStatus,
} from "@/lib/organizations/team-client";
import { listOrganizations } from "@/lib/organizations/client";
import type { OrganizationRecord } from "@/lib/organizations/constants";
import { TeamRowActions } from "@/components/team/team-row-actions";

type TeamKind = "manager" | "agent";
type TeamScope = "admin" | "manager" | "organization";

function emailFeedback(sent?: boolean) {
  return sent ? " Notification email sent." : " Saved, but the email could not be sent.";
}

const COPY: Record<
  TeamKind,
  {
    singular: string;
    plural: string;
    empty: string;
    addTitle: string;
    emailNote: string;
  }
> = {
  manager: {
    singular: "Manager",
    plural: "Managers",
    empty: "No managers added yet.",
    addTitle: "Add manager",
    emailNote: "An email will be sent saying they were added to the website as a manager.",
  },
  agent: {
    singular: "Agent",
    plural: "Agents",
    empty: "No agents added yet.",
    addTitle: "Add agent",
    emailNote: "An email will be sent saying they were added to the website as an agent.",
  },
};

export function TeamManagementPage({
  kind,
  scope = "admin",
  onAgentsChanged,
  title,
  description,
  fixedManagerAccountId,
  fixedOrganizationId,
}: {
  kind: TeamKind;
  scope?: TeamScope;
  onAgentsChanged?: () => void;
  title: string;
  description: string;
  fixedManagerAccountId?: string;
  fixedOrganizationId?: number;
}) {
  const copy = COPY[kind];
  const isManagerScope = scope === "manager";
  const isOrganizationScope = scope === "organization";
  const isAgentKind = kind === "agent";
  const showAdminColumn = isAgentKind && isManagerScope;
  const showManagerColumn = isAgentKind && scope === "admin" && !fixedManagerAccountId;
  const showOrganizationColumn = isAgentKind && scope === "admin";
  const showManagerForm =
    isAgentKind && (scope === "admin" || scope === "organization") && !fixedManagerAccountId;
  const showManagerTeamColumns = kind === "manager" && scope === "admin" && !fixedOrganizationId;
  const showOrganizationForm = kind === "manager" && scope === "admin" && !fixedOrganizationId;
  const showAgentOrganizationForm =
    isAgentKind && scope === "admin" && !fixedOrganizationId;
  const showOrganizationPicker = showOrganizationForm || showAgentOrganizationForm;
  const needsOrganizationList = showOrganizationPicker;
  const [items, setItems] = useState<TeamMember[]>([]);
  const [managers, setManagers] = useState<TeamMember[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [managerId, setManagerId] = useState<string>("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<TeamStatusFilter>("all");
  const [managerFilter, setManagerFilter] = useState(fixedManagerAccountId ?? "all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const resolvedStatusFilter = statusFilter === "all" ? undefined : statusFilter;
  const resolvedManagerFilter =
    fixedManagerAccountId ?? (managerFilter === "all" ? undefined : managerFilter);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadItems = useCallback(async (override?: { page?: number; pageSize?: number }) => {
    const targetPage = override?.page ?? page;
    const targetPageSize = override?.pageSize ?? pageSize;
    setLoading(true);
    setError("");
    try {
      if (isManagerScope && kind === "agent") {
        const data = await listManagerAgents({
          page: targetPage,
          pageSize: targetPageSize,
          status: resolvedStatusFilter,
          search: debouncedSearch || undefined,
        });
        if (data.pagination.total_pages > 0 && targetPage > data.pagination.total_pages) {
          const correctedPage = data.pagination.total_pages;
          setPage(correctedPage);
          return loadItems({ page: correctedPage, pageSize: targetPageSize });
        }
        setItems(data.items);
        setPagination(data.pagination);
        if (override?.page !== undefined) setPage(override.page);
        if (override?.pageSize !== undefined) setPageSize(override.pageSize);
      } else if (isOrganizationScope) {
        if (kind === "manager") {
          const data = await listOrganizationManagers({
            page: targetPage,
            pageSize: targetPageSize,
            status: resolvedStatusFilter,
            search: debouncedSearch || undefined,
          });
          if (data.pagination.total_pages > 0 && targetPage > data.pagination.total_pages) {
            const correctedPage = data.pagination.total_pages;
            setPage(correctedPage);
            return loadItems({ page: correctedPage, pageSize: targetPageSize });
          }
          setItems(data.items);
          setPagination(data.pagination);
        } else {
          const [agentsData, managersData] = await Promise.all([
            listOrganizationAgents({
              page: targetPage,
              pageSize: targetPageSize,
              status: resolvedStatusFilter,
              managerAccountId: resolvedManagerFilter,
              search: debouncedSearch || undefined,
            }),
            listOrganizationManagers({ page: 1, pageSize: 100, status: "active" }),
          ]);
          if (
            agentsData.pagination.total_pages > 0 &&
            targetPage > agentsData.pagination.total_pages
          ) {
            const correctedPage = agentsData.pagination.total_pages;
            setPage(correctedPage);
            return loadItems({ page: correctedPage, pageSize: targetPageSize });
          }
          setItems(agentsData.items);
          setPagination(agentsData.pagination);
          setManagers(managersData.items);
        }
        if (override?.page !== undefined) setPage(override.page);
        if (override?.pageSize !== undefined) setPageSize(override.pageSize);
      } else if (kind === "manager") {
        const data = await listManagers({
          page: targetPage,
          pageSize: targetPageSize,
          status: resolvedStatusFilter,
          search: debouncedSearch || undefined,
          organizationId: fixedOrganizationId,
        });
        if (data.pagination.total_pages > 0 && targetPage > data.pagination.total_pages) {
          const correctedPage = data.pagination.total_pages;
          setPage(correctedPage);
          return loadItems({ page: correctedPage, pageSize: targetPageSize });
        }
        setItems(data.items);
        setPagination(data.pagination);
        if (override?.page !== undefined) setPage(override.page);
        if (override?.pageSize !== undefined) setPageSize(override.pageSize);
      } else {
        const [agentsData, managersData] = await Promise.all([
          listAgents({
            page: targetPage,
            pageSize: targetPageSize,
            status: resolvedStatusFilter,
            managerAccountId: resolvedManagerFilter,
            search: debouncedSearch || undefined,
          }),
          listManagers({ page: 1, pageSize: 100, activeOnly: true }),
        ]);
        if (agentsData.pagination.total_pages > 0 && targetPage > agentsData.pagination.total_pages) {
          const correctedPage = agentsData.pagination.total_pages;
          setPage(correctedPage);
          return loadItems({ page: correctedPage, pageSize: targetPageSize });
        }
        setItems(agentsData.items);
        setPagination(agentsData.pagination);
        setManagers(managersData.items);
        if (override?.page !== undefined) setPage(override.page);
        if (override?.pageSize !== undefined) setPageSize(override.pageSize);
      }
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, [
    kind,
    page,
    pageSize,
    isManagerScope,
    isOrganizationScope,
    resolvedStatusFilter,
    resolvedManagerFilter,
    debouncedSearch,
    fixedOrganizationId,
  ]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (fixedManagerAccountId) {
      setManagerFilter(fixedManagerAccountId);
      setManagerId(fixedManagerAccountId);
    }
  }, [fixedManagerAccountId]);

  useEffect(() => {
    if (fixedOrganizationId) {
      setOrganizationId(String(fixedOrganizationId));
    }
  }, [fixedOrganizationId]);

  useEffect(() => {
    if (!needsOrganizationList) return;
    void listOrganizations({ page: 1, pageSize: 100, status: "active" })
      .then((data) => {
        setOrganizations(data.items);
        if (data.items.length === 1) {
          setOrganizationId(String(data.items[0].id));
        }
      })
      .catch(() => {
        setOrganizations([]);
      });
  }, [needsOrganizationList]);

  useEffect(() => {
    if (!showAgentOrganizationForm) return;
    setManagerId("");
  }, [organizationId, showAgentOrganizationForm]);

  const activeManagers = managers;

  const formManagers = useMemo(() => {
    if (showAgentOrganizationForm) {
      if (!organizationId) return [];
      return managers.filter(
        (manager) => manager.organization_id === Number(organizationId),
      );
    }
    return managers;
  }, [managers, showAgentOrganizationForm, organizationId]);

  const toolbarFilters = useMemo(() => {
    const filters: DataTableFilterOption[] = [
      {
        id: "status",
        label: "Status",
        value: statusFilter,
        options: [
          { value: "all", label: "All status" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Blocked" },
        ],
      },
    ];

    if (isAgentKind && showManagerColumn && activeManagers.length > 0) {
      filters.push({
        id: "manager",
        label: "Manager",
        value: managerFilter,
        options: [
          { value: "all", label: "All managers" },
          ...activeManagers.map((manager) => ({
            value: manager.account_id,
            label: manager.name,
          })),
        ],
      });
    }

    return filters;
  }, [activeManagers, isAgentKind, managerFilter, showManagerColumn, statusFilter]);

  function resetTableFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setManagerFilter(fixedManagerAccountId ?? "all");
    setPage(1);
  }

  function handleToolbarFilterChange(id: string, value: string) {
    setPage(1);
    if (id === "status") {
      setStatusFilter(value as TeamStatusFilter);
      return;
    }
    if (id === "manager") {
      setManagerFilter(value);
    }
  }

  const confirmPasswordMismatchError = useMemo(
    () => getConfirmPasswordMismatchError(password, confirmPassword),
    [password, confirmPassword],
  );

  const canSubmitAdd = useMemo(() => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedJobTitle = jobTitle.trim();
    if (getFirstNameError(firstName)) return false;
    if (getLastNameError(lastName)) return false;
    if (getEmailError(trimmedEmail)) return false;
    if (getPasswordError(password)) return false;
    if (getConfirmPasswordError(password, confirmPassword)) return false;
    if (!isValidPhone(trimmedPhone)) return false;
    if (!trimmedJobTitle) return false;
    if (showOrganizationPicker && (organizations.length === 0 || !organizationId)) return false;
    if (showManagerForm && (formManagers.length === 0 || !managerId)) return false;
    return true;
  }, [
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
    phone,
    jobTitle,
    showOrganizationPicker,
    organizationId,
    organizations.length,
    showManagerForm,
    managerId,
    formManagers.length,
  ]);

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setPhone("");
    setJobTitle("");
    setManagerId("");
    setOrganizationId(
      fixedOrganizationId
        ? String(fixedOrganizationId)
        : organizations.length === 1
          ? String(organizations[0].id)
          : "",
    );
  }

  function handleGeneratePassword() {
    const next = generateSecurePassword();
    setPassword(next);
    setConfirmPassword(next);
  }

  async function handleAdd() {
    if (submitting) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedJobTitle = jobTitle.trim();

    if (!trimmedEmail || !password || !trimmedPhone || !trimmedJobTitle) {
      setError("All fields are required.");
      setSuccess("");
      return;
    }

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

    const emailError = getEmailError(trimmedEmail);
    if (emailError) {
      setError(emailError);
      setSuccess("");
      return;
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      setSuccess("");
      return;
    }
    const confirmPasswordError = getConfirmPasswordError(password, confirmPassword);
    if (confirmPasswordError) {
      setError(confirmPasswordError);
      setSuccess("");
      return;
    }
    if (trimmedPhone.length < 7) {
      setError("Please enter a valid phone number.");
      setSuccess("");
      return;
    }
    if (trimmedJobTitle.length < 1) {
      setError("Job title is required.");
      setSuccess("");
      return;
    }
    if (showOrganizationPicker) {
      if (organizations.length === 0) {
        setError(
          showOrganizationForm
            ? "Add at least one organization before creating a manager."
            : "Add at least one organization before creating an agent.",
        );
        setSuccess("");
        return;
      }
      if (!organizationId) {
        setError(
          showOrganizationForm
            ? "Please select an organization. Every manager must belong to an organization."
            : "Please select an organization before choosing a manager.",
        );
        setSuccess("");
        return;
      }
    }
    if (showManagerForm) {
      if (formManagers.length === 0) {
        setError(
          showAgentOrganizationForm
            ? "Add at least one active manager in the selected organization before creating an agent."
            : "Add at least one active manager before creating an agent.",
        );
        setSuccess("");
        return;
      }
      if (!managerId) {
        setError("Please select a manager. Every agent must belong to a manager.");
        setSuccess("");
        return;
      }
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const result =
        kind === "manager"
          ? isOrganizationScope
            ? await createOrganizationManager({
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                email: trimmedEmail,
                password,
                phone: trimmedPhone,
                jobTitle: trimmedJobTitle,
              })
            : await createManager({
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                email: trimmedEmail,
                password,
                phone: trimmedPhone,
                jobTitle: trimmedJobTitle,
                organizationId: fixedOrganizationId ?? Number(organizationId),
              })
          : isManagerScope
            ? await createManagerAgent({
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                email: trimmedEmail,
                password,
                phone: trimmedPhone,
                jobTitle: trimmedJobTitle,
              })
            : isOrganizationScope
              ? await createOrganizationAgent({
                  firstName: trimmedFirstName,
                  lastName: trimmedLastName,
                  email: trimmedEmail,
                  password,
                  phone: trimmedPhone,
                  jobTitle: trimmedJobTitle,
                  managerAccountId: managerId,
                })
              : await createAgent({
                  firstName: trimmedFirstName,
                  lastName: trimmedLastName,
                  email: trimmedEmail,
                  password,
                  phone: trimmedPhone,
                  jobTitle: trimmedJobTitle,
                  managerAccountId: managerId,
                });
      setSuccess(result.message + emailFeedback(result.email_sent));
      resetForm();
      setShowAdd(false);
      await loadItems({ page: 1, pageSize });
      onAgentsChanged?.();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to create record.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(item: TeamMember) {
    if (actionId) return;
    setActionId(item.account_id);
    setError("");
    setSuccess("");
    try {
      const isActive = item.is_active !== 1;
      const result =
        kind === "manager"
          ? isOrganizationScope
            ? await updateOrganizationManagerStatus(item.account_id, isActive)
            : await updateManagerStatus(item.account_id, isActive)
          : isManagerScope
            ? await updateManagerAgentStatus(item.account_id, isActive)
            : isOrganizationScope
              ? await updateOrganizationAgentStatus(item.account_id, isActive)
              : await updateAgentStatus(item.account_id, isActive);
      setSuccess(result.message + emailFeedback(result.email_sent));
      await loadItems();
      onAgentsChanged?.();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to update status.");
    } finally {
      setActionId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setActionId(deleteTarget.account_id);
    setError("");
    setSuccess("");

    try {
      const result =
        kind === "manager"
          ? isOrganizationScope
            ? await deleteOrganizationManager(deleteTarget.account_id)
            : await deleteManager(deleteTarget.account_id)
          : isManagerScope
            ? await deleteManagerAgent(deleteTarget.account_id)
            : isOrganizationScope
              ? await deleteOrganizationAgent(deleteTarget.account_id)
              : await deleteAgent(deleteTarget.account_id);
      setSuccess(result.message + emailFeedback(result.email_sent));
      setDeleteTarget(null);
      await loadItems();
      onAgentsChanged?.();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to delete record.");
    } finally {
      setDeleting(false);
      setActionId(null);
    }
  }

  function requestDelete(item: TeamMember) {
    if (actionId) return;
    setDeleteTarget(item);
  }

  const editBasePath = isManagerScope
    ? MANAGER_AGENTS_PATH
    : isOrganizationScope
      ? kind === "manager"
        ? ORGANIZATION_MANAGERS_PATH
        : ORGANIZATION_AGENTS_PATH
      : kind === "manager"
        ? ADMIN_MANAGERS_PATH
        : ADMIN_AGENTS_PATH;
  const tableColumnCount =
    6 +
    (showManagerTeamColumns ? 2 : 0) +
    (showAdminColumn ? 1 : 0) +
    (showOrganizationColumn ? 1 : 0) +
    (showManagerColumn ? 1 : 0);
  const hasTableFilters =
    Boolean(debouncedSearch) ||
    statusFilter !== "all" ||
    managerFilter !== "all";
  const emptyMessage = hasTableFilters
    ? isAgentKind
      ? "No agents match the selected filters."
      : "No managers match the selected filters."
    : isManagerScope
      ? "No agents in your team yet."
      : isOrganizationScope
        ? copy.empty
        : copy.empty;

  return (
    <div className="app-page-wide">
      <FadeIn>
        <PageHeader
          label={copy.plural}
          title={title}
          description={description}
          actions={
            <Button
              className="h-11 shrink-0"
              onClick={() => {
                setShowAdd((value) => {
                  const next = !value;
                  if (next && !password) {
                    const generated = generateSecurePassword();
                    setPassword(generated);
                    setConfirmPassword(generated);
                  }
                  return next;
                });
                setError("");
                setSuccess("");
              }}
              disabled={
                !loading &&
                ((showOrganizationPicker && organizations.length === 0) ||
                  (showManagerForm && activeManagers.length === 0))
              }
            >
              <Plus className="size-4" />
              {showAdd ? "Close form" : copy.addTitle}
            </Button>
          }
        />
      </FadeIn>

      {showOrganizationPicker && !loading && organizations.length === 0 ? (
        <Alert variant="error">
          {showOrganizationForm
            ? "Add at least one organization before you can create managers."
            : "Add at least one organization before you can create agents."}
        </Alert>
      ) : null}

      {showManagerForm && !loading && activeManagers.length === 0 ? (
        <Alert variant="error">Add at least one active manager before you can create agents.</Alert>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      {showAdd ? (
        <FadeIn delay={40}>
          <section className="app-profile-panel">
            <div className="app-profile-panel__header">
              <div>
                <p className="app-profile-panel__title">{copy.addTitle}</p>
                <p className="app-profile-panel__subtitle">{copy.emailNote}</p>
              </div>
            </div>
            <div className="app-profile-panel__body">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="First name" htmlFor={`${kind}-first-name`} required>
                  <InputWithIcon
                    id={`${kind}-first-name`}
                    icon={User}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    maxLength={NAME_PART_MAX_LENGTH}
                    disabled={submitting}
                  />
                </FormField>
                <FormField label="Last name" htmlFor={`${kind}-last-name`} required>
                  <InputWithIcon
                    id={`${kind}-last-name`}
                    icon={User}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    maxLength={NAME_PART_MAX_LENGTH}
                    disabled={submitting}
                  />
                </FormField>
                <FormField label="Email" htmlFor={`${kind}-email`} required>
                  <InputWithIcon
                    id={`${kind}-email`}
                    icon={Mail}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@company.com"
                    maxLength={EMAIL_MAX_LENGTH}
                    disabled={submitting}
                  />
                </FormField>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={`${kind}-password`} className="text-sm font-medium">
                      Password <span className="text-destructive">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-[color,opacity] hover:text-primary/80 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <RefreshCw className="size-3.5" />
                      Generate password
                    </button>
                  </div>
                  <PasswordInput
                    id={`${kind}-password`}
                    value={password}
                    onChange={setPassword}
                    placeholder="Create a strong password"
                    maxLength={PASSWORD_MAX_LENGTH}
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
                </div>
                <FormField
                  label="Confirm password"
                  htmlFor={`${kind}-confirm-password`}
                  required
                  error={confirmPasswordMismatchError ?? undefined}
                >
                  <PasswordInput
                    id={`${kind}-confirm-password`}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Re-enter the password"
                    maxLength={PASSWORD_MAX_LENGTH}
                    disabled={submitting}
                  />
                </FormField>
                <FormField label="Phone number" htmlFor={`${kind}-phone`} required>
                  <InputWithIcon
                    id={`${kind}-phone`}
                    icon={Phone}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    disabled={submitting}
                  />
                </FormField>
                <FormField label="Job title" htmlFor={`${kind}-job`} required>
                  <InputWithIcon
                    id={`${kind}-job`}
                    icon={Briefcase}
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Operations Manager"
                    disabled={submitting}
                  />
                </FormField>
                {showOrganizationPicker ? (
                  <div className="sm:col-span-2">
                    <FormField label="Organization" htmlFor={`${kind}-organization`} required>
                      <select
                        id={`${kind}-organization`}
                        value={organizationId}
                        onChange={(e) => setOrganizationId(e.target.value)}
                        className="app-input"
                        disabled={submitting || organizations.length === 0}
                        required
                      >
                        <option value="" disabled>
                          Select an organization
                        </option>
                        {organizations.map((organization) => (
                          <option key={organization.id} value={organization.id}>
                            {organization.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    {organizations.length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Create an organization first from the Organizations page.
                      </p>
                    ) : showAgentOrganizationForm ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Select the organization this agent belongs to before choosing a manager.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {showManagerForm ? (
                  <div className="sm:col-span-2">
                    <FormField label="Manager" htmlFor={`${kind}-manager`} required>
                      <select
                        id={`${kind}-manager`}
                        value={managerId}
                        onChange={(e) => setManagerId(e.target.value)}
                        className="app-input"
                        disabled={
                          submitting ||
                          formManagers.length === 0 ||
                          (showAgentOrganizationForm && !organizationId)
                        }
                        required
                      >
                        <option value="" disabled>
                          {showAgentOrganizationForm && !organizationId
                            ? "Select an organization first"
                            : "Select a manager"}
                        </option>
                        {formManagers.map((manager) => (
                          <option key={manager.account_id} value={manager.account_id}>
                            {scope === "admin" && manager.organization_name && !showAgentOrganizationForm
                              ? `${manager.name} — ${manager.organization_name}`
                              : manager.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    {showAgentOrganizationForm && organizationId && formManagers.length === 0 ? (
                      <p className="mt-2 text-xs text-destructive">
                        No active managers in this organization. Add a manager first.
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Agents are always linked to a manager to keep the team hierarchy intact.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              <FormActions className="mt-6 border-t border-border/60 pt-6">
                <Button
                  variant="secondary"
                  className="h-11"
                  disabled={submitting}
                  onClick={() => {
                    resetForm();
                    setShowAdd(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="h-11 min-w-[160px]"
                  disabled={!canSubmitAdd}
                  loading={submitting}
                  loadingText="Saving..."
                  onClick={() => void handleAdd()}
                >
                  <Mail className="size-4" />
                  Save and notify
                </Button>
              </FormActions>
            </div>
          </section>
        </FadeIn>
      ) : null}

      <FadeIn delay={80} className="app-surface app-surface--elevated overflow-hidden">
        <div className="border-b border-border/70 p-3 sm:p-4">
          <DataTableToolbar
            search={searchInput}
            onSearchChange={(value) => {
              setSearchInput(value);
              setPage(1);
            }}
            searchPlaceholder={
              isAgentKind ? "Search name, email, phone, or job title…" : "Search managers…"
            }
            filters={toolbarFilters}
            onFilterChange={handleToolbarFilterChange}
            onReset={resetTableFilters}
            showReset={hasTableFilters}
            resultLabel={`${pagination.total} ${isAgentKind ? "agents" : "managers"} found`}
          />
        </div>
        {loading ? (
          <>
            <div className="hidden lg:block">
              <TableSkeleton rows={6} columns={tableColumnCount} />
            </div>
            <CardListSkeleton rows={4} className="lg:hidden" />
          </>
        ) : pagination.total === 0 ? (
          <EmptyState icon={Users} title={emptyMessage} />
        ) : (
          <>
            <div className="app-table-wrap hidden overflow-x-auto lg:block">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Job title</th>
                    {showManagerTeamColumns ? <th>Organization</th> : null}
                    {showManagerTeamColumns ? <th>Agents</th> : null}
                    {showOrganizationColumn && !showManagerTeamColumns ? <th>Organization</th> : null}
                    {showAdminColumn ? <th>Admin</th> : null}
                    {showManagerColumn ? <th>Manager</th> : null}
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const busy = actionId === item.account_id;
                    const active = item.is_active === 1;
                    const serialNo = (page - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.account_id}>
                        <td className="font-medium">{serialNo}</td>
                        <td className="font-medium">{item.name}</td>
                        <td>{item.email}</td>
                        <td>{item.phone || "—"}</td>
                        <td>{item.job_title || "—"}</td>
                        {showManagerTeamColumns ? (
                          <td>{item.organization_name || "—"}</td>
                        ) : null}
                        {showManagerTeamColumns ? (
                          <td>
                            <Link
                              href={getAdminManagerAgentsPath(item.account_id)}
                              className="app-link text-sm font-medium"
                              title="View agents under this manager"
                            >
                              View
                            </Link>
                          </td>
                        ) : null}
                        {showOrganizationColumn && !showManagerTeamColumns ? (
                          <td>{item.organization_name || "—"}</td>
                        ) : null}
                        {showAdminColumn ? (
                          <td>
                            <div className="flex items-center gap-1.5">
                              <Shield className="size-3.5 shrink-0 text-primary" />
                              <span className="truncate">{item.created_by || "—"}</span>
                            </div>
                          </td>
                        ) : null}
                        {showManagerColumn ? (
                          <td>
                            <div className="flex items-center gap-1.5">
                              <Users className="size-3.5 shrink-0 text-primary" />
                              <div className="min-w-0">
                                <p className="truncate">{item.manager?.name || "—"}</p>
                                {item.manager?.email ? (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {item.manager.email}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        ) : null}
                        <td>
                          <StatusBadge active={active} />
                        </td>
                        <td>
                          <TeamRowActions
                            editHref={`${editBasePath}/${encodeURIComponent(item.account_id)}`}
                            active={active}
                            busy={busy}
                            onToggleStatus={() => void handleToggleStatus(item)}
                            onDelete={() => requestDelete(item)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 lg:hidden">
              {items.map((item, index) => {
                const busy = actionId === item.account_id;
                const active = item.is_active === 1;
                const serialNo = (page - 1) * pageSize + index + 1;
                return (
                  <div
                    key={item.account_id}
                    className="app-surface--inset rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {item.name}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            #{serialNo}
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.email}</p>
                      </div>
                      <StatusBadge active={active} />
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <p>Phone: {item.phone || "—"}</p>
                      <p>Job title: {item.job_title || "—"}</p>
                      {showManagerTeamColumns ? (
                        <p>Organization: {item.organization_name || "—"}</p>
                      ) : null}
                      {showOrganizationColumn && !showManagerTeamColumns ? (
                        <p>Organization: {item.organization_name || "—"}</p>
                      ) : null}
                      {showManagerTeamColumns ? (
                        <p>
                          Agents:{" "}
                          <Link
                            href={getAdminManagerAgentsPath(item.account_id)}
                            className="app-link font-medium"
                          >
                            View
                          </Link>
                        </p>
                      ) : null}
                      {showAdminColumn ? (
                        <p className="flex items-center gap-1.5">
                          Admin:{" "}
                          <span className="inline-flex items-center gap-1">
                            <Shield className="size-3.5 text-primary" />
                            {item.created_by || "—"}
                          </span>
                        </p>
                      ) : null}
                      {showManagerColumn ? (
                        <p>
                          Manager: {item.manager?.name || "—"}
                          {item.manager?.email ? (
                            <span className="block text-xs">{item.manager.email}</span>
                          ) : null}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-4">
                      <TeamRowActions
                        layout="card"
                        editHref={`${editBasePath}/${encodeURIComponent(item.account_id)}`}
                        active={active}
                        busy={busy}
                        onToggleStatus={() => void handleToggleStatus(item)}
                        onDelete={() => requestDelete(item)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              pagination={pagination}
              disabled={loading || submitting || actionId !== null}
              label={copy.plural.toLowerCase()}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
            />
          </>
        )}
      </FadeIn>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${copy.singular.toLowerCase()}?`}
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed and a notification email will be sent. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </div>
  );
}
