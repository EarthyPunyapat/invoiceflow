import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimateStatusUpdateSchema } from "@/lib/validators";

// ─── GET /api/estimates/[id] ────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const estimate = await prisma.estimate.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      client: true,
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  return NextResponse.json({ estimate });
}

// ─── PATCH /api/estimates/[id] — status transitions ─────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = estimateStatusUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid status" },
        { status: 400 }
      );
    }
    const { status } = parsed.data;

    const estimate = await prisma.estimate.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const updateData: any = { status };
    // First send stamps the issue date.
    if (status === "SENT" && !estimate.issueDate) {
      updateData.issueDate = new Date();
    }

    const updated = await prisma.estimate.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: true,
        items: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({ estimate: updated });
  } catch (error: any) {
    console.error("Update estimate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update estimate" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/estimates/[id] — drafts only ───────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const estimate = await prisma.estimate.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  // Only allow deleting DRAFT estimates
  if (estimate.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft estimates can be deleted" },
      { status: 400 }
    );
  }

  await prisma.estimate.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
