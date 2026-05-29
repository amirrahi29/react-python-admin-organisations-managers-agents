"use client";

import { useEffect, useState } from "react";
import { ChangePasswordCard } from "@/components/profile/change-password-card";
import { ProfileWorkspace } from "@/components/profile/profile-workspace";
import { useFormMessages } from "@/hooks/use-form-messages";
import { updateOrganizationProfile } from "@/lib/auth/client";
import { AuthError, type OrganizationInfo } from "@/lib/auth/constants";
import { getOrganizationHierarchyChain } from "@/lib/auth/hierarchy";
import { isValidName } from "@/lib/validation";

export function OrganizationProfilePageClient({
  organization: initialOrganization,
}: {
  organization: OrganizationInfo;
}) {
  const [organization, setOrganization] = useState(initialOrganization);
  const [name, setName] = useState(initialOrganization.name);
  const [submitting, setSubmitting] = useState(false);
  const { error, success, setError, setSuccess, clearMessages } = useFormMessages();
  const hierarchy = getOrganizationHierarchyChain(organization);

  useEffect(() => {
    setOrganization(initialOrganization);
    setName(initialOrganization.name);
  }, [initialOrganization]);

  async function handleSave() {
    if (submitting) return;

    const trimmedName = name.trim();
    if (!isValidName(trimmedName)) {
      setError("Organization name must be at least 2 characters.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const data = await updateOrganizationProfile({ name: trimmedName });
      setOrganization(data.organization);
      setName(data.organization.name);
      setSuccess(data.message || "Profile updated successfully.");
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
        authRole="organization"
        user={organization}
        hierarchy={hierarchy}
        showContactFields={false}
        submitting={submitting}
        error={error}
        success={success}
        name={name}
        phone=""
        jobTitle=""
        onNameChange={(value) => {
          setName(value);
          clearMessages();
        }}
        onPhoneChange={() => undefined}
        onJobTitleChange={() => undefined}
        onSave={() => void handleSave()}
        onEnterKey={onEnterKey}
      />
      <div className="app-page-wide">
        <ChangePasswordCard role="organization" />
      </div>
    </div>
  );
}
