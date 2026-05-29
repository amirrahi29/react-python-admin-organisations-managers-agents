import { TeamMemberEditPage } from "@/components/team/team-member-edit-page";

export default async function OrganizationEditAgentPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return (
    <TeamMemberEditPage
      scope="organization"
      kind="agent"
      accountId={decodeURIComponent(accountId)}
    />
  );
}
