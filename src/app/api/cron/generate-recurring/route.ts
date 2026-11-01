import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRecurringInvoice } from "@/lib/recurring-billing";

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const start = Date.now();
  try {
    const now = new Date();
    const templates = await prisma.recurringInvoice.findMany({ where: { paused: false, nextRunAt: { lte: now } }, select: { id: true } });
    const details = [];
    for (const template of templates) {
      try {
        const invoice = await generateRecurringInvoice(template.id, now);
        if (invoice) details.push({ recurringId: template.id, invoiceId: invoice.id });
      } catch (error) {
        console.error("[generate-recurring]", error);
        details.push({ recurringId: template.id, error: "Unable to generate invoice" });
      }
    }
    return NextResponse.json({ ok: true, processed: templates.length, generated: details.filter(r => !r.error).length, skipped: details.filter(r => r.error).length, details, durationMs: Date.now() - start });
  } catch (error) {
    console.error("[generate-recurring]", error);
    return NextResponse.json({ error: "Failed to generate recurring invoices" }, { status: 500 });
  }
}
