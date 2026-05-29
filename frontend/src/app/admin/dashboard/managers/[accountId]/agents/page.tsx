import { ManagerScopedAgentsPage } from "@/components/team/manager-scoped-agents-page";

export default async function AdminManagerAgentsRoute({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <ManagerScopedAgentsPage accountId={decodeURIComponent(accountId)} />;
}
