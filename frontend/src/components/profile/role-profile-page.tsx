"use client";

import { useEffect, useState } from "react";
import { ChangePasswordCard } from "@/components/profile/change-password-card";
import { ProfileWorkspace } from "@/components/profile/profile-workspace";
import { useFormMessages } from "@/hooks/use-form-messages";
import { updateAgentProfile, updateManagerProfile } from "@/lib/auth/client";
import {
  AuthError,
  type AgentInfo,
  type AuthRole,
  type ManagerInfo,
} from "@/lib/auth/constants";
import { getAgentHierarchyChain, getManagerHierarchyChain } from "@/lib/auth/hierarchy";
import { isValidName, isValidPhone } from "@/lib/validation";

type RoleProfilePageProps = {
  authRole: Exclude<AuthRole, "admin">;
  user: ManagerInfo | AgentInfo;
  onUpdated: (user: ManagerInfo | AgentInfo) => void;
};

export function RoleProfilePage({ authRole, user, onUpdated }: RoleProfilePageProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [jobTitle, setJobTitle] = useState(user.job_title ?? "");
  const [submitting, setSubmitting] = useState(false);
  const { error, success, setError, setSuccess, clearMessages } = useFormMessages();
  const hierarchy =
    authRole === "agent"
      ? getAgentHierarchyChain(user as AgentInfo)
      : getManagerHierarchyChain(user as ManagerInfo);

  useEffect(() => {
    setName(user.name);
    setPhone(user.phone ?? "");
    setJobTitle(user.job_title ?? "");
  }, [user]);

  async function handleSave() {
    if (submitting) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedJobTitle = jobTitle.trim();

    if (!isValidName(trimmedName)) {
      setError("Name must be at least 2 characters.");
      setSuccess("");
      return;
    }
    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      setError("Please enter a valid phone number.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const payload = {
        name: trimmedName,
        phone: trimmedPhone,
        jobTitle: trimmedJobTitle,
      };

      if (authRole === "agent") {
        const data = await updateAgentProfile(payload);
        onUpdated(data.agent);
        setSuccess(data.message || "Profile updated successfully.");
      } else {
        const data = await updateManagerProfile(payload);
        onUpdated(data.manager);
        setSuccess(data.message || "Profile updated successfully.");
      }
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Unable to update profile right now.");
    } finally {
      setSubmitting(false);
    }
  }

  function onEnterKey(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSave();
    }
  }

  return (
    <div className="space-y-6">
      <ProfileWorkspace
        authRole={authRole}
        user={user}
        hierarchy={hierarchy}
        submitting={submitting}
        error={error}
        success={success}
        name={name}
        phone={phone}
        jobTitle={jobTitle}
        onNameChange={(value) => {
          setName(value);
          clearMessages();
        }}
        onPhoneChange={(value) => {
          setPhone(value);
          clearMessages();
        }}
        onJobTitleChange={(value) => {
          setJobTitle(value);
          clearMessages();
        }}
        onSave={() => void handleSave()}
        onEnterKey={onEnterKey}
      />
      <div className="app-page-wide">
        <ChangePasswordCard role={authRole} />
      </div>
    </div>
  );
}
