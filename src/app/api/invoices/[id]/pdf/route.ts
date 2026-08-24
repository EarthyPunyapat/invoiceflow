import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildInvoicePdf } from "@/lib/pdf";

// pdfkit depends on Node streams/fs internals — never run on the edge.
export const runtime = "nodejs";

// GET /api/invoices/[id]/pdf — render the invoice as a PDF document.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId },
      include: {
        client: true,
        items: true,
        user: {
          select: {
            name: true,
            businessName: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            accentColor: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Compose the saved business profile into a printable address block so
    // the PDF header matches emails and the public share page.
    const u = invoice.user;
    const cityLine = [u.city, u.state, u.postalCode]
      .filter((part) => part && part.trim().length > 0)
      .join(" ");
    const address = [u.addressLine1, u.addressLine2, cityLine, u.country]
      .filter((part) => part && part.trim().length > 0)
      .join("\n");

    const buffer = await buildInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
      client: {
        name: invoice.client.name,
        email: invoice.client.email,
        company: invoice.client.company,
      },
      business: {
        name: u.name,
        businessName: u.businessName,
        address: address || null,
        accentColor: u.accentColor,
      },
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
    });

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[INVOICE_PDF]", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
