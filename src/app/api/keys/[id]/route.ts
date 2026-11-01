import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { revokeApiKey } from "@/lib/api-key";

/** Revocation is session-only for the same reason creation is. */
export async function DELETE(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await paramsPromise;
  const ok = await revokeApiKey(session.user.id, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ revoked: true });
}
