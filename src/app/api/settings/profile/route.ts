import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validators";

// ─── PATCH /api/settings/profile ────────────────────────────────────
//
// Saves the signed-in user's business profile (branding fields shown
// on invoices, share pages and reminder emails). All fields are
// optional — Prisma ignores `undefined`, so omitted keys leave the
// stored value untouched, while "" is normalized to null (clears).
// Schema (incl. URL/hex/prefix guards) lives in src/lib/validators.

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      // undefined = leave unchanged · null = clear the column
      data: {
        businessName: parsed.data.businessName,
        addressLine1: parsed.data.addressLine1,
        addressLine2: parsed.data.addressLine2,
        city: parsed.data.city,
        state: parsed.data.state,
        postalCode: parsed.data.postalCode,
        country: parsed.data.country,
        logoUrl: parsed.data.logoUrl,
        accentColor: parsed.data.accentColor,
        invoicePrefix: parsed.data.invoicePrefix,
      },
    });

    // Safe projection — never echo credentials/relations back.
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        city: user.city,
        state: user.state,
        postalCode: user.postalCode,
        country: user.country,
        logoUrl: user.logoUrl,
        accentColor: user.accentColor,
        invoicePrefix: user.invoicePrefix,
      },
    });
  } catch (error) {
    console.error("[SETTINGS_PROFILE]", error);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
