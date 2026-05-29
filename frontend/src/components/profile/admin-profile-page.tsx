"use client";

import { useEffect, useState } from "react";
import { ChangePasswordCard } from "@/components/profile/change-password-card";
import { ProfileWorkspace } from "@/components/profile/profile-workspace";
import { useAuth } from "@/components/providers/auth-provider";
import { useFormMessages } from "@/hooks/use-form-messages";
import { updateProfile } from "@/lib/auth/client";
import { AuthError, type AdminInfo } from "@/lib/auth/constants";
import { isValidName, isValidPhone } from "@/lib/validation";

export function AdminProfilePage({ admin }: { admin: AdminInfo }) {
  const { setAdmin } = useAuth();
  const [user, setUser] = useState(admin);
  const [name, setName] = useState(admin.name);
  const [phone, setPhone] = useState(admin.phone ?? "");
  const [jobTitle, setJobTitle] = useState(admin.job_title ?? "");
  const [submitting, setSubmitting] = useState(false);
  const { error, success, setError, setSuccess, clearMessages } = useFormMessages();

  useEffect(() => {
    setUser(admin);
    setName(admin.name);
    setPhone(admin.phone ?? "");
    setJobTitle(admin.job_title ?? "");
  }, [admin]);

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
      const data = await updateProfile({
        name: trimmedName,
        phone: trimmedPhone,
        jobTitle: trimmedJobTitle,
      });
      setAdmin(data.admin);
      setUser(data.admin);
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
        authRole="admin"
        user={user}
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
        <ChangePasswordCard role="admin" />
      </div>
    </div>
  );
}
