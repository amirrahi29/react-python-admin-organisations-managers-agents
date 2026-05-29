"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { AuthShell } from "@/components/layout/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/components/providers/auth-provider";
import { register } from "@/lib/auth/client";
import { AuthError, ADMIN_DASHBOARD_PATH, ADMIN_LOGIN_PATH } from "@/lib/auth/constants";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_HINT,
  PASSWORD_MAX_LENGTH,
  getEmailError,
  getPasswordError,
  getConfirmPasswordError,
  getConfirmPasswordMismatchError,
  isValidName,
} from "@/lib/validation";

export function AdminRegisterPage() {
  const router = useRouter();
  const { setAdmin } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const confirmPasswordMismatchError = getConfirmPasswordMismatchError(password, confirmPassword);

  function clearError() {
    if (error) setError("");
  }

  async function handleRegister() {
    if (submitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (!isValidName(trimmedName)) {
      setError("Name must be at least 2 characters.");
      return;
    }

    const emailError = getEmailError(trimmedEmail);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    const confirmPasswordError = getConfirmPasswordError(password, confirmPassword);
    if (confirmPasswordError) {
      setError(confirmPasswordError);
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const data = await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        confirmPassword,
      });
      setAdmin(data.admin);
      router.refresh();
      window.location.href = ADMIN_DASHBOARD_PATH;
    } catch (err) {
      let message = err instanceof AuthError ? err.message : "Unable to register right now";
      if (err instanceof AuthError && err.status === 409) {
        message = "An admin with this email is already registered.";
      }
      setError(message);
      setSubmitting(false);
    }
  }

  function onEnterKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleRegister();
    }
  }

  return (
    <AuthShell
      title="Create your admin account"
      description="Set up your account in a few steps. Once registered, you will be taken straight to your dashboard."
      features={[
        { icon: ShieldCheck, text: "Your password is stored securely" },
        { icon: KeyRound, text: "You will be signed in right away" },
      ]}
    >
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Register</h2>
      <p className="mt-1 text-sm text-muted-foreground">Create a new admin account</p>

      {error ? <Alert variant="error" className="mt-4">{error}</Alert> : null}

      <div className="mt-6 space-y-4">
        <FormField label="Full name" htmlFor="name" required>
          <InputWithIcon
            id="name"
            icon={User}
            type="text"
            autoComplete="name"
            disabled={submitting}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError();
            }}
            onKeyDown={onEnterKey}
            placeholder="Your full name"
          />
        </FormField>

        <FormField label="Email" htmlFor="email" required>
          <InputWithIcon
            id="email"
            icon={Mail}
            type="email"
            autoComplete="email"
            disabled={submitting}
            maxLength={EMAIL_MAX_LENGTH}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError();
            }}
            onKeyDown={onEnterKey}
            placeholder="admin@company.com"
          />
        </FormField>

        <FormField label="Password" htmlFor="password" required hint={PASSWORD_HINT}>
          <div className="app-field-group relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <PasswordInput
              id="password"
              autoComplete="new-password"
              disabled={submitting}
              maxLength={PASSWORD_MAX_LENGTH}
              value={password}
              onChange={(value) => {
                setPassword(value);
                clearError();
              }}
              onKeyDown={onEnterKey}
              placeholder="Create a strong password"
              className="pl-10"
            />
          </div>
        </FormField>

        <FormField
          label="Confirm password"
          htmlFor="confirmPassword"
          required
          error={confirmPasswordMismatchError ?? undefined}
        >
          <div className="app-field-group relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              disabled={submitting}
              maxLength={PASSWORD_MAX_LENGTH}
              value={confirmPassword}
              onChange={(value) => {
                setConfirmPassword(value);
                clearError();
              }}
              onKeyDown={onEnterKey}
              placeholder="Re-enter your password"
              className="pl-10"
            />
          </div>
        </FormField>

        <Button
          className="h-11 w-full"
          loading={submitting}
          loadingText="Creating account..."
          onClick={() => void handleRegister()}
        >
          Create account
          <ArrowRight className="size-4" />
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={ADMIN_LOGIN_PATH} className="app-link">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
