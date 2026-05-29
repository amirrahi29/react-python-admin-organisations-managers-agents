import { TeamMemberEditPage } from "@/components/team/team-member-edit-page";

export default async function ManagerEditAgentPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return (
    <TeamMemberEditPage
      scope="manager"
      kind="agent"
      accountId={decodeURIComponent(accountId)}
    />
  );
}
