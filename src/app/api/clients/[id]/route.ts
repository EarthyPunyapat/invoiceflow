import { lockOwner } from "@/lib/billing";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientUpdateSchema } from "@/lib/validators/clients";
import { requireUser } from "@/lib/require-user";

export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const userId = await requireUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await prisma.client.findFirst({
    where: { id: params.id, userId: userId },
    include: {
      invoices: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ client });
}

export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const userId = await requireUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = clientUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const existing = await prisma.client.findFirst({
      where: { id: params.id, userId: userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.phone !== undefined) updateData.phone = data.phone;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const client = await prisma.client.update({
      where: { id: params.id },
      data: updateData,
      include: {
        invoices: { select: { id: true, status: true, total: true } },
      },
    });

    return NextResponse.json({ client });
  } catch (error: any) {
    console.error("Update client error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A client with this email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
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
      const client = await tx.client.findFirst({ where: { id: params.id, userId: ownerId } });
      if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
      // Prevent concurrent document inserts from acquiring a foreign-key key
      // share lock between the checks below and the client deletion.
      await tx.$queryRaw`SELECT "id" FROM "Client" WHERE "id" = ${client.id} FOR UPDATE`;
      // Cascading a client deletion must never erase financial documents or
      // schedules. Keep the client until those records are handled explicitly.
      const [invoices, estimates, recurring] = await Promise.all([
        tx.invoice.count({ where: { clientId: client.id } }),
        tx.estimate.count({ where: { clientId: client.id } }),
        tx.recurringInvoice.count({ where: { clientId: client.id } }),
      ]);
      if (invoices || estimates || recurring) {
        return NextResponse.json({ error: "Clients with invoices, estimates, or recurring schedules cannot be deleted" }, { status: 409 });
      }
      await tx.client.delete({ where: { id: client.id } });
      return NextResponse.json({ success: true, deletedInvoices: 0 });
    }, { maxWait: 10_000 });
  } catch (error) {
    console.error("Delete client error:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
