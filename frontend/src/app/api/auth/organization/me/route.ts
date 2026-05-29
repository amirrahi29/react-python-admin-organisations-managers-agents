import { NextResponse } from "next/server";
import { getSessionOrganization } from "@/lib/auth/server";

export async function GET() {
  const organization = await getSessionOrganization();
  if (!organization) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ organization });
}
