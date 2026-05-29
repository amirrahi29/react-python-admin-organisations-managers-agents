import { redirect } from "next/navigation";
import { MANAGER_AGENTS_PATH } from "@/lib/team/constants";

export default async function ManagerAgentWorkspaceRoute({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  redirect(`${MANAGER_AGENTS_PATH}/${encodeURIComponent(decodeURIComponent(accountId))}`);
}
