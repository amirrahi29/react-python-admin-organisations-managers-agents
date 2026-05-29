"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { FadeIn, PageEnter } from "@/components/ui/motion";
import { TeamManagementPage } from "@/lib/lazy/dashboard-pages";
import { AuthError } from "@/lib/auth/constants";
import { getManager } from "@/lib/team/client";
import { ADMIN_MANAGERS_PATH, type TeamMember } from "@/lib/team/constants";

export function ManagerScopedAgentsPage({ accountId }: { accountId: string }) {
  const [manager, setManager] = useState<TeamMember | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void getManager(accountId)
      .then((response) => setManager(response.item))
      .catch((err) => setError(err instanceof AuthError ? err.message : "Unable to load manager."));
  }, [accountId]);

  return (
    <PageEnter className="app-page-wide space-y-4">
      <FadeIn>
        <Link href={ADMIN_MANAGERS_PATH} className="app-link inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="size-3.5 shrink-0" />
          Back to managers
        </Link>
      </FadeIn>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <TeamManagementPage
        kind="agent"
        scope="admin"
        fixedManagerAccountId={accountId}
        title={manager ? `${manager.name}'s agents` : "Manager agents"}
        description={
          manager
            ? `All agents assigned to ${manager.name}. Update profiles or manage access from here.`
            : "Loading agents for this manager…"
        }
      />
    </PageEnter>
  );
}
