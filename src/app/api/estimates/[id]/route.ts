import type { EstimateStatus } from "@prisma/client";
import { lockOwner } from "@/lib/billing";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimateStatusUpdateSchema } from "@/lib/validators";
import { requireUser } from "@/lib/require-user";

// ─── GET /api/estimates/[id] ────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const userId = await requireUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const estimate = await prisma.estimate.findFirst({
    where: { id: params.id, userId: userId },
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

const transitions: Record<EstimateStatus, EstimateStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "DECLINED"],
  ACCEPTED: [],
  DECLINED: [],
  CONVERTED: [],
};

// Conversion is performed exclusively by the atomic convert endpoint.
export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = userId;
  try {
    const parsed = estimateStatusUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid status" }, { status: 400 });
    }
    const { status } = parsed.data;
    return await prisma.$transaction(async tx => {
      await lockOwner(tx, ownerId);
      const estimate = await tx.estimate.findFirst({ where: { id: params.id, userId: ownerId } });
      if (!estimate) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
      if (estimate.status === "CONVERTED" || status === "CONVERTED" ||
          (estimate.status !== status && !transitions[estimate.status].includes(status))) {
        return NextResponse.json({ error: "Invalid estimate status transition" }, { status: 409 });
      }
      const updated = await tx.estimate.update({
        where: { id: estimate.id },
        data: { status, ...(status === "SENT" && !estimate.issueDate ? { issueDate: new Date() } : {}) },
        include: { client: true, items: { orderBy: { createdAt: "asc" } } },
      });
      return NextResponse.json({ estimate: updated });
    }, { timeout: 30_000, maxWait: 10_000 });
  } catch (error) {
    console.error("Update estimate error:", error);
    return NextResponse.json({ error: "Failed to update estimate" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const userId = await requireUser(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = userId;
  try {
    return await prisma.$transaction(async tx => {
      await lockOwner(tx, ownerId);
      const estimate = await tx.estimate.findFirst({ where: { id: params.id, userId: ownerId } });
      if (!estimate) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
      if (estimate.status !== "DRAFT") {
        return NextResponse.json({ error: "Only draft estimates can be deleted" }, { status: 409 });
      }
      await tx.estimate.delete({ where: { id: estimate.id } });
      return NextResponse.json({ success: true });
    }, { timeout: 30_000, maxWait: 10_000 });
  } catch (error) {
    console.error("Delete estimate error:", error);
    return NextResponse.json({ error: "Failed to delete estimate" }, { status: 500 });
  }
}
