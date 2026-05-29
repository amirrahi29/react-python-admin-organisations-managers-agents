import { TeamMemberEditPage } from "@/components/team/team-member-edit-page";

export default async function OrganizationEditManagerPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return (
    <TeamMemberEditPage
      scope="organization"
      kind="manager"
      accountId={decodeURIComponent(accountId)}
    />
  );
}
