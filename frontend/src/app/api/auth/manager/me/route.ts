import { NextResponse } from "next/server";
import { getSessionManager } from "@/lib/auth/server";

export async function GET() {
  const manager = await getSessionManager();
  if (!manager) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ manager });
}
