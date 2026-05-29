"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { FadeIn, PageEnter } from "@/components/ui/motion";
import { TeamManagementPage } from "@/components/team/team-management-page";
import { AuthError } from "@/lib/auth/constants";
import { getOrganization } from "@/lib/organizations/client";
import {
  ADMIN_ORGANIZATIONS_PATH,
  type OrganizationRecord,
} from "@/lib/organizations/constants";

export function OrganizationScopedManagersPage({ organizationId }: { organizationId: number }) {
  const [organization, setOrganization] = useState<OrganizationRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void getOrganization(organizationId)
      .then((response) => setOrganization(response.item))
      .catch((err) =>
        setError(err instanceof AuthError ? err.message : "Unable to load organization."),
      );
  }, [organizationId]);

  return (
    <PageEnter className="app-page-wide space-y-4">
      <FadeIn>
        <Link
          href={ADMIN_ORGANIZATIONS_PATH}
          className="app-link inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-3.5 shrink-0" />
          Back to organizations
        </Link>
      </FadeIn>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <TeamManagementPage
        kind="manager"
        fixedOrganizationId={organizationId}
        title={organization ? `${organization.name} — managers` : "Organization managers"}
        description={
          organization
            ? `Managers assigned to ${organization.name}. Add new managers or manage access from here.`
            : "Loading managers for this organization…"
        }
      />
    </PageEnter>
  );
}
