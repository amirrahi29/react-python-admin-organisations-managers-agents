import { TeamMemberEditPage } from "@/components/team/team-member-edit-page";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <TeamMemberEditPage kind="agent" accountId={decodeURIComponent(accountId)} />;
}
