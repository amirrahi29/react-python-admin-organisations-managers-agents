"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthError } from "@/lib/auth/constants";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  getEmailError,
  getLoginPasswordError,
} from "@/lib/validation";

type RoleLoginFormProps = {
  title?: string;
  description?: string;
  emailPlaceholder?: string;
  submitLabel?: string;
  footer?: React.ReactNode;
  beforeFields?: React.ReactNode;
  onSubmit: (payload: { email: string; password: string }) => Promise<void>;
};

export function RoleLoginForm({
  title = "Sign in",
  description = "Use your email and password to continue",
  emailPlaceholder = "you@company.com",
  submitLabel = "Sign in",
  footer,
  beforeFields,
  onSubmit,
}: RoleLoginFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    if (submitting) return;

    const trimmedEmail = email.trim().toLowerCase();

    const emailError = getEmailError(trimmedEmail);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = getLoginPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await onSubmit({ email: trimmedEmail, password });
    } catch (err) {
      let message = err instanceof AuthError ? err.message : "Unable to sign in right now";
      if (err instanceof AuthError && err.status === 401) {
        message = "Invalid email or password.";
      }
      if (err instanceof AuthError && err.status === 403) {
        message = "Your account is blocked. Contact your administrator.";
      }
      setError(message);
      setSubmitting(false);
    }
  }

  function onEnterKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleLogin();
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      {error ? <Alert variant="error" className="mt-4">{error}</Alert> : null}

      <div className="mt-6 space-y-4">
        {beforeFields}

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
              if (error) setError("");
            }}
            onKeyDown={onEnterKey}
            placeholder={emailPlaceholder}
          />
        </FormField>

        <FormField label="Password" htmlFor="password" required>
          <div className="app-field-group relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <PasswordInput
              id="password"
              autoComplete="current-password"
              disabled={submitting}
              maxLength={PASSWORD_MAX_LENGTH}
              value={password}
              onChange={(value) => {
                setPassword(value);
                if (error) setError("");
              }}
              onKeyDown={onEnterKey}
              placeholder="Enter your password"
              className="pl-10"
            />
          </div>
        </FormField>

        <Button
          className="h-11 w-full"
          loading={submitting}
          loadingText="Signing in..."
          onClick={() => void handleLogin()}
        >
          {submitLabel}
          <ArrowRight className="size-4" />
        </Button>

        {footer ? <div className="pt-1">{footer}</div> : null}
      </div>
    </>
  );
}

type PortalLinksProps = {
  current: "admin" | "organization" | "manager" | "agent";
};

export function AuthPortalLinks({ current }: PortalLinksProps) {
  const links = [
    { id: "admin" as const, label: "Admin portal", href: "/admin/login" },
    { id: "organization" as const, label: "Organization portal", href: "/organization/login" },
    { id: "manager" as const, label: "Manager portal", href: "/manager/login" },
    { id: "agent" as const, label: "Agent portal", href: "/agent/login" },
  ].filter((link) => {
    if (link.id === current) return false;
    if (current !== "admin" && current !== "organization" && link.id === "admin") return false;
    if (current !== "admin" && current !== "organization" && link.id === "organization") return false;
    return true;
  });

  if (links.length === 0) return null;

  return (
    <p className="text-center text-sm text-muted-foreground">
      {links.map((link, index) => (
        <span key={link.id}>
          {index > 0 ? " · " : ""}
          <Link href={link.href} className="app-link">
            {link.label}
          </Link>
        </span>
      ))}
    </p>
  );
}
