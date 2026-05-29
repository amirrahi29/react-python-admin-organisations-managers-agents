"use client";

import { useState } from "react";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { useFormMessages } from "@/hooks/use-form-messages";
import { AuthError, type AuthRole } from "@/lib/auth/constants";
import { changePassword } from "@/lib/auth/client";

const PASSWORD_RULES = [
  "At least 8 characters",
  "At least one uppercase letter",
  "At least one lowercase letter",
  "At least one number",
  "At least one special character",
];

type ChangePasswordCardProps = {
  role: AuthRole;
};

export function ChangePasswordCard({ role }: ChangePasswordCardProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { error, success, setError, setSuccess, clearMessages } = useFormMessages();

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit() {
    if (submitting) return;

    if (!currentPassword) {
      setError("Enter your current password.");
      setSuccess("");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      setSuccess("");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      setSuccess("");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from your current password.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const data = await changePassword(role, {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setSuccess(data.message || "Password changed successfully. Check your email for confirmation.");
      resetForm();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to change password right now.");
    } finally {
      setSubmitting(false);
    }
  }

  function onEnterKey(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <section className="app-surface app-surface--elevated p-5 sm:p-6">
      <header className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold tracking-tight text-foreground">Change password</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Rotate your sign-in password. You will receive a security confirmation email once the
            change succeeds.
          </p>
        </div>
      </header>

      {error ? <Alert variant="error" className="mt-5">{error}</Alert> : null}
      {success ? <Alert variant="success" className="mt-5">{success}</Alert> : null}

      <div className="mt-5 space-y-4">
        <FormField label="Current password" htmlFor="current-password" required>
          <InputWithIcon
            id="current-password"
            icon={Lock}
            type="password"
            autoComplete="current-password"
            disabled={submitting}
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              clearMessages();
            }}
            onKeyDown={onEnterKey}
            placeholder="••••••••"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="New password" htmlFor="new-password" required>
            <InputWithIcon
              id="new-password"
              icon={KeyRound}
              type="password"
              autoComplete="new-password"
              disabled={submitting}
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                clearMessages();
              }}
              onKeyDown={onEnterKey}
              placeholder="••••••••"
            />
          </FormField>

          <FormField label="Confirm new password" htmlFor="confirm-password" required>
            <InputWithIcon
              id="confirm-password"
              icon={KeyRound}
              type="password"
              autoComplete="new-password"
              disabled={submitting}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                clearMessages();
              }}
              onKeyDown={onEnterKey}
              placeholder="••••••••"
            />
          </FormField>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Password requirements
          </p>
          <ul className="mt-2 grid gap-1 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
            {PASSWORD_RULES.map((rule) => (
              <li key={rule} className="flex items-center gap-2">
                <span className="inline-block size-1.5 rounded-full bg-primary/60" aria-hidden />
                {rule}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end">
          <Button
            className="h-11 w-full sm:min-w-[200px] sm:w-auto"
            loading={submitting}
            loadingText="Changing..."
            onClick={() => void handleSubmit()}
          >
            <KeyRound className="size-4" />
            Change password
          </Button>
        </div>
      </div>
    </section>
  );
}
