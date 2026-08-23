import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/resend";
import { generateShareToken } from "@/lib/token";

// POST /api/invoices/[id]/send — send invoice email and mark as SENT
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId },
      include: {
        client: true,
        items: true,
        user: { select: { email: true, name: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Cannot send an invoice with status: ${invoice.status}` },
        { status: 400 }
      );
    }

    // Build items list for email
    const itemsList = invoice.items
      .map(
        (item) =>
          `<tr><td>${item.description}</td><td>${item.quantity}</td><td>$${item.unitPrice.toFixed(2)}</td><td>$${item.total.toFixed(2)}</td></tr>`
      )
      .join("");

    const emailHtml = `
      <h1>Invoice ${invoice.invoiceNumber}</h1>
      <p>Hi ${invoice.client.name},</p>
      <p>Here is your invoice from ${invoice.user.name || "InvoiceFlow"}:</p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
        <thead>
          <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
        </thead>
        <tbody>${itemsList}</tbody>
      </table>
      <p><strong>Subtotal:</strong> $${invoice.subtotal.toFixed(2)}</p>
      <p><strong>Tax:</strong> $${invoice.tax.toFixed(2)}</p>
      <p><strong>Total Due:</strong> $${invoice.total.toFixed(2)}</p>
      <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
      <p>Thank you for your business!</p>
    `;

    // Send email via Resend
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: `InvoiceFlow <${process.env.RESEND_FROM_EMAIL || "invoices@invoiceflow.app"}>`,
      to: [invoice.client.email],
      subject: `Invoice ${invoice.invoiceNumber} from ${invoice.user.name || "InvoiceFlow"}`,
      html: emailHtml,
    });

    if (error) {
      console.error("[SEND_INVOICE_EMAIL_ERROR]", error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    // Mark as SENT and issue a share token (for the public /i/[token] page)
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        shareToken: invoice.shareToken ?? generateShareToken(),
      },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        items: true,
      },
    });

    return NextResponse.json({
      data: updated,
      emailId: data?.id,
      shareUrl: updated.shareToken
        ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/i/${updated.shareToken}`
        : null,
      message: "Invoice sent successfully",
    });
  } catch (error) {
    console.error("[SEND_INVOICE]", error);
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    );
  }
}
