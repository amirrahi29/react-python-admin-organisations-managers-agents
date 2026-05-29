"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Mail, Pencil, Plus, RefreshCw } from "lucide-react";
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
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { AuthError } from "@/lib/auth/constants";
import {
  createOrganization,
  deleteOrganization,
  listOrganizations,
  updateOrganization,
  updateOrganizationStatus,
} from "@/lib/organizations/client";
import {
  getAdminOrganizationManagersPath,
  type OrganizationRecord,
} from "@/lib/organizations/constants";
import { DEFAULT_PAGE_SIZE, type PaginationMeta } from "@/lib/team/constants";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_HINT,
  PASSWORD_MAX_LENGTH,
  getEmailError,
  getPasswordError,
  getConfirmPasswordError,
  getConfirmPasswordMismatchError,
} from "@/lib/validation";

export function OrganizationsManagementPage() {
  const [items, setItems] = useState<OrganizationRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<OrganizationRecord | null>(null);
  const [editTarget, setEditTarget] = useState<OrganizationRecord | null>(null);
  const [editName, setEditName] = useState("");

  const loadItems = useCallback(async (override?: { page?: number; pageSize?: number }) => {
    const targetPage = override?.page ?? page;
    const targetPageSize = override?.pageSize ?? pageSize;
    setLoading(true);
    setError("");
    try {
      const data = await listOrganizations({ page: targetPage, pageSize: targetPageSize });
      setItems(data.items);
      setPagination(data.pagination);
      if (override?.page !== undefined) setPage(override.page);
      if (override?.pageSize !== undefined) setPageSize(override.pageSize);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to load organizations.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const confirmPasswordMismatchError = useMemo(
    () => getConfirmPasswordMismatchError(password, confirmPassword),
    [password, confirmPassword],
  );

  const canSubmitAdd = useMemo(() => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedName.length < 2) return false;
    if (getEmailError(trimmedEmail)) return false;
    if (getPasswordError(password)) return false;
    if (getConfirmPasswordError(password, confirmPassword)) return false;
    return true;
  }, [name, email, password, confirmPassword]);

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedName.length < 2) {
      setError("Company name must be at least 2 characters.");
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

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await createOrganization({
        name: trimmedName,
        email: trimmedEmail,
        password,
      });
      setSuccess("Organization created. Twilio, email, and AI settings use the platform .env file.");
      resetForm();
      setShowAdd(false);
      await loadItems({ page: 1, pageSize });
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to create organization.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!editTarget) return;

    const trimmedName = editName.trim();
    if (trimmedName.length < 2) {
      setError("Organization name must be at least 2 characters.");
      setSuccess("");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await updateOrganization(editTarget.id, { name: trimmedName });
      setSuccess("Organization updated.");
      setEditTarget(null);
      setEditName("");
      await loadItems();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to update organization.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(item: OrganizationRecord) {
    setActionId(item.id);
    setError("");
    setSuccess("");
    try {
      await updateOrganizationStatus(item.id, item.is_active !== 1);
      setSuccess(`Organization ${item.is_active === 1 ? "blocked" : "activated"}.`);
      await loadItems();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to update organization status.");
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionId(deleteTarget.id);
    setError("");
    setSuccess("");
    try {
      await deleteOrganization(deleteTarget.id);
      setSuccess("Organization deleted.");
      setDeleteTarget(null);
      await loadItems();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to delete organization.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="app-page-wide space-y-6">
      <FadeIn>
        <PageHeader
          label="Organizations"
          title="Organizations"
          description="Create company accounts for your platform. Calls, email, AI, and storage use your shared backend .env configuration."
          actions={
            <>
              <Button type="button" variant="secondary" onClick={() => void loadItems()} disabled={loading}>
                <RefreshCw className="size-4" />
                Refresh
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowAdd((value) => {
                    const next = !value;
                    if (next) {
                      setEditTarget(null);
                      setEditName("");
                      if (!password) {
                        const generated = generateSecurePassword();
                        setPassword(generated);
                        setConfirmPassword(generated);
                      }
                    }
                    return next;
                  });
                  setError("");
                  setSuccess("");
                }}
              >
                <Plus className="size-4" />
                {showAdd ? "Close form" : "Add organization"}
              </Button>
            </>
          }
        />
      </FadeIn>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      {showAdd ? (
        <FadeIn delay={40}>
          <form onSubmit={handleCreate} className="app-profile-panel">
            <div className="app-profile-panel__header">
              <div>
                <p className="app-profile-panel__title">Add organization</p>
                <p className="app-profile-panel__subtitle">
                  Company portal login only. Platform integrations stay in your backend .env file.
                </p>
              </div>
            </div>
            <div className="app-profile-panel__body">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Company name" htmlFor="org-name" required>
                  <input
                    id="org-name"
                    className="app-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Acme Sales North"
                    maxLength={120}
                    disabled={submitting}
                    required
                  />
                </FormField>
                <FormField label="Company email" htmlFor="org-email" required>
                  <InputWithIcon
                    id="org-email"
                    icon={Mail}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="org@company.com"
                    maxLength={EMAIL_MAX_LENGTH}
                    disabled={submitting}
                    autoComplete="off"
                    required
                  />
                </FormField>
                <div className="sm:col-span-2 grid gap-5 sm:grid-cols-2">
                  <FormField label="Company password" htmlFor="org-password" required hint={PASSWORD_HINT}>
                    <PasswordInput
                      id="org-password"
                      value={password}
                      onChange={setPassword}
                      disabled={submitting}
                      maxLength={PASSWORD_MAX_LENGTH}
                      autoComplete="new-password"
                    />
                  </FormField>
                  <FormField
                    label="Confirm password"
                    htmlFor="org-confirm-password"
                    required
                    error={confirmPasswordMismatchError ?? undefined}
                  >
                    <PasswordInput
                      id="org-confirm-password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      disabled={submitting}
                      maxLength={PASSWORD_MAX_LENGTH}
                      autoComplete="new-password"
                      placeholder="Re-enter the password"
                    />
                  </FormField>
                </div>
              </div>
              <FormActions className="mt-6 border-t border-border/60 pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => {
                    setShowAdd(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                  loadingText="Creating..."
                  disabled={!canSubmitAdd}
                >
                  Create organization
                </Button>
              </FormActions>
            </div>
          </form>
        </FadeIn>
      ) : null}

      {editTarget ? (
        <FadeIn delay={40}>
          <form onSubmit={handleUpdate} className="app-profile-panel">
            <div className="app-profile-panel__header">
              <div>
                <p className="app-profile-panel__title">Edit organization</p>
                <p className="app-profile-panel__subtitle">
                  Update the organization name for {editTarget.email}.
                </p>
              </div>
            </div>
            <div className="app-profile-panel__body">
              <FormField label="Organization name" htmlFor="edit-org-name" required>
                <input
                  id="edit-org-name"
                  className="app-input"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="Acme Sales North"
                  maxLength={120}
                  disabled={submitting}
                  required
                />
              </FormField>
              <FormActions className="mt-6 border-t border-border/60 pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => {
                    setEditTarget(null);
                    setEditName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                  loadingText="Saving..."
                  disabled={editName.trim().length < 2}
                >
                  Save changes
                </Button>
              </FormActions>
            </div>
          </form>
        </FadeIn>
      ) : null}

      <FadeIn delay={80} className="app-surface app-surface--elevated overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : pagination.total === 0 ? (
          <EmptyState
            icon={Building2}
            title="No organizations yet"
            description="Create your first company account, then add managers under it."
          />
        ) : (
          <>
            <div className="app-table-wrap overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Login email</th>
                    <th>Managers</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground">ID {item.id}</div>
                      </td>
                      <td>{item.email}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <span>{item.manager_count ?? 0}</span>
                          <Link
                            href={getAdminOrganizationManagersPath(item.id)}
                            className="app-link text-sm font-medium"
                            title={`View managers in ${item.name}`}
                          >
                            View
                          </Link>
                        </div>
                      </td>
                      <td>
                        <StatusBadge active={item.is_active === 1} />
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={actionId === item.id || submitting}
                            onClick={() => {
                              setShowAdd(false);
                              resetForm();
                              setEditTarget(item);
                              setEditName(item.name);
                              setError("");
                              setSuccess("");
                            }}
                          >
                            <Pencil className="size-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={actionId === item.id}
                            onClick={() => void handleToggleStatus(item)}
                          >
                            {item.is_active === 1 ? "Block" : "Activate"}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={actionId === item.id || (item.manager_count ?? 0) > 0}
                            onClick={() => setDeleteTarget(item)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              pagination={pagination}
              label="organizations"
              disabled={loading}
              onPageChange={(nextPage) => void loadItems({ page: nextPage, pageSize })}
              onPageSizeChange={(nextPageSize) => void loadItems({ page: 1, pageSize: nextPageSize })}
            />
          </>
        )}
      </FadeIn>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete organization?"
        description={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.name}". Organizations with managers cannot be deleted.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={actionId !== null}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
