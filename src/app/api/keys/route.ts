import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createApiKey, listApiKeys } from "@/lib/api-key";

/**
 * API key management.
 *
 * Deliberately session-only: an agent must never be able to mint itself a new
 * credential. A human signs in, issues a key, and hands it to the agent. This
 * keeps the blast radius of a leaked key to "one agent, revocable" rather than
 * "self-replicating credentials".
 */
async function requireSessionUser(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await requireSessionUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ keys: await listApiKeys(userId) });
}

export async function POST(req: NextRequest) {
  const userId = await requireSessionUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let name = "agent";
  try {
    const body = await req.json();
    if (typeof body?.name === "string") name = body.name;
  } catch {
    // Name is optional; a malformed body just yields the default label.
  }

  const created = await createApiKey(userId, name);
  return NextResponse.json(
    {
      key: created.key,
      id: created.id,
      name: created.name,
      prefix: created.prefix,
      createdAt: created.createdAt,
      warning:
        "This key is shown once and cannot be recovered. Store it now. " +
        "Send it as: Authorization: Bearer <key>",
    },
    { status: 201 }
  );
}
