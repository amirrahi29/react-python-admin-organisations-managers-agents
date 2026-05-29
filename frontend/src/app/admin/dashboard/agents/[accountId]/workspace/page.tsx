import { redirect } from "next/navigation";
import { ADMIN_AGENTS_PATH } from "@/lib/team/constants";

export default async function AdminAgentWorkspaceRoute({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  redirect(`${ADMIN_AGENTS_PATH}/${encodeURIComponent(decodeURIComponent(accountId))}`);
}
