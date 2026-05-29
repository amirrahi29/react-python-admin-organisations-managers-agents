import { TeamMemberEditPage } from "@/components/team/team-member-edit-page";

export default async function EditManagerPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <TeamMemberEditPage kind="manager" accountId={decodeURIComponent(accountId)} />;
}
