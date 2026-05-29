import { NextResponse } from "next/server";
import { getSessionAgent } from "@/lib/auth/server";

export async function GET() {
  const agent = await getSessionAgent();
  if (!agent) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ agent });
}
