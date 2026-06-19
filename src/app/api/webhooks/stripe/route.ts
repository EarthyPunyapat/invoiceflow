import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { sendInvoiceEmail, sendPaymentConfirmation } from "@/lib/email";

// Stripe webhook secret from env
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature")!;

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("[STRIPE_WEBHOOK] Invalid signature", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "invoice.finalized": {
        const stripeInvoice = event.data.object as Stripe.Invoice;

        // Check if an invoice with the given Stripe Invoice ID already exists
        const existingInvoice = await prisma.invoice.findFirst({
          where: { notes: stripeInvoice.id },
        });
        if (existingInvoice) {
          console.log(`[STRIPE_WEBHOOK] Invoice with Stripe ID ${stripeInvoice.id} already exists. Skipping creation.`);
          return NextResponse.json({ received: true });
        }

        // Resolve user ID using event.account lookup in StripeAccount table first
        let userId: string | null = null;
        if (event.account) {
          const stripeAccount = await prisma.stripeAccount.findUnique({
            where: { stripeAccountId: event.account },
          });
          if (stripeAccount) {
            userId = stripeAccount.userId;
          }
        }

        // Fall back to event metadata (e.g. invoiceFlowUserId or userId in event.data.object)
        if (!userId) {
          userId = stripeInvoice.metadata?.invoiceFlowUserId || stripeInvoice.metadata?.userId || null;
        }

        if (!userId) {
          console.warn(`[STRIPE_WEBHOOK] No user ID resolved for invoice.finalized: ${stripeInvoice.id}`);
          return NextResponse.json({ received: true, ignored: "User not found" });
        }

        // Verify the user exists in User table
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          console.warn(`[STRIPE_WEBHOOK] User ${userId} not found in database for invoice.finalized: ${stripeInvoice.id}`);
          return NextResponse.json({ received: true, ignored: "User not found" });
        }

        // Retrieve client by customerEmail and userId
        const customerEmail = stripeInvoice.customer_email;
        if (!customerEmail) {
          console.warn(`[STRIPE_WEBHOOK] No customer email found for invoice.finalized: ${stripeInvoice.id}`);
          return NextResponse.json({ received: true, ignored: "Customer email not found" }, { status: 200 });
        }

        let client = await prisma.client.findFirst({
          where: {
            email: customerEmail,
            userId: userId,
          },
        });

        // Create client if not exists
        if (!client) {
          const customerName = stripeInvoice.customer_name || "Unnamed Client";
          const customerPhone = stripeInvoice.customer_phone || null;

          client = await prisma.client.create({
            data: {
              name: customerName,
              email: customerEmail,
              phone: customerPhone,
              userId: userId,
            },
          });
        }

        // Create Invoice and nested InvoiceItem records
        const subtotal = (stripeInvoice.subtotal || 0) / 100;
        const tax = (stripeInvoice.tax || 0) / 100;
        const total = (stripeInvoice.total || 0) / 100;
        const currency = (stripeInvoice.currency || "USD").toUpperCase();

        const dueDate = stripeInvoice.due_date
          ? new Date(stripeInvoice.due_date * 1000)
          : new Date();

        const invoiceNumber = stripeInvoice.number || stripeInvoice.id;

        const invoiceItems = stripeInvoice.lines?.data?.map((line) => {
          const qty = line.quantity || 1;
          const lineTotal = (line.amount || 0) / 100;
          const unitPrice = line.price?.unit_amount
            ? line.price.unit_amount / 100
            : lineTotal / qty;

          return {
            description: line.description || "Line Item",
            quantity: qty,
            unitPrice: unitPrice,
            total: lineTotal,
          };
        }) || [];

        // Determine status and paidAt
        let status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED" = "SENT";
        let paidAt: Date | null = null;
        if (stripeInvoice.status === "paid") {
          status = "PAID";
          paidAt = stripeInvoice.status_transitions?.paid_at
            ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
            : new Date();
        } else if (stripeInvoice.status === "uncollectible" || stripeInvoice.status === "void") {
          status = "CANCELLED";
        } else if (stripeInvoice.status === "draft") {
          status = "DRAFT";
        }

        const createdInvoice = await prisma.invoice.create({
          data: {
            userId: userId,
            clientId: client.id,
            invoiceNumber: invoiceNumber,
            status: status,
            subtotal: subtotal,
            tax: tax,
            total: total,
            currency: currency,
            dueDate: dueDate,
            notes: stripeInvoice.id, // Store Stripe Invoice ID in notes
            paidAt: paidAt,
            items: {
              create: invoiceItems,
            },
          },
        });

        if (status === "PAID") {
          try {
            await sendPaymentConfirmation(createdInvoice.id);
          } catch (emailError) {
            console.error(`[STRIPE_WEBHOOK] Failed to send payment confirmation email for invoice ${createdInvoice.id}:`, emailError);
          }
        } else if (status === "SENT") {
          try {
            await sendInvoiceEmail(createdInvoice.id);
          } catch (emailError) {
            console.error(`[STRIPE_WEBHOOK] Failed to send invoice email for invoice ${createdInvoice.id}:`, emailError);
          }
        }

        break;
      }

      case "invoice.paid": {
        const stripeInvoice = event.data.object as Stripe.Invoice;
        const invoiceFlowId = stripeInvoice.metadata?.invoiceFlowId;
        const stripeInvoiceId = stripeInvoice.id;

        const paidAt = stripeInvoice.status_transitions?.paid_at
          ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
          : new Date();

        if (invoiceFlowId) {
          const updateResult = await prisma.invoice.updateMany({
            where: {
              id: invoiceFlowId,
              status: { in: ["SENT", "OVERDUE"] },
            },
            data: {
              status: "PAID",
              paidAt: paidAt,
            },
          });
          console.log(`[STRIPE_WEBHOOK] Invoice ${invoiceFlowId} marked as PAID by metadata`);

          if (updateResult.count > 0) {
            try {
              await sendPaymentConfirmation(invoiceFlowId);
            } catch (emailError) {
              console.error(`[STRIPE_WEBHOOK] Failed to send payment confirmation email for invoice ${invoiceFlowId}:`, emailError);
            }
          }
        } else if (stripeInvoiceId) {
          const updateResult = await prisma.invoice.updateMany({
            where: {
              notes: stripeInvoiceId,
              status: { in: ["SENT", "OVERDUE"] },
            },
            data: {
              status: "PAID",
              paidAt: paidAt,
            },
          });
          console.log(`[STRIPE_WEBHOOK] Invoice marked as PAID by Stripe invoice ID in notes: ${stripeInvoiceId}`);

          if (updateResult.count > 0) {
            const invoice = await prisma.invoice.findFirst({
              where: { notes: stripeInvoiceId },
            });
            if (invoice) {
              try {
                await sendPaymentConfirmation(invoice.id);
              } catch (emailError) {
                console.error(`[STRIPE_WEBHOOK] Failed to send payment confirmation email for invoice ${invoice.id}:`, emailError);
              }
            }
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        let stripeInvoiceId: string | null = null;
        if (typeof paymentIntent.invoice === "string") {
          stripeInvoiceId = paymentIntent.invoice;
        } else if (paymentIntent.invoice && typeof paymentIntent.invoice === "object") {
          stripeInvoiceId = (paymentIntent.invoice as { id?: string }).id || null;
        }

        if (stripeInvoiceId) {
          const invoiceFlowId = paymentIntent.metadata?.invoiceFlowId;
          const paidAt = new Date();

          if (invoiceFlowId) {
            const updateResult = await prisma.invoice.updateMany({
              where: {
                id: invoiceFlowId,
                status: { in: ["SENT", "OVERDUE"] },
              },
              data: {
                status: "PAID",
                paidAt: paidAt,
              },
            });
            console.log(`[STRIPE_WEBHOOK] Invoice ${invoiceFlowId} marked as PAID via payment_intent.succeeded by metadata`);

            if (updateResult.count > 0) {
              try {
                await sendPaymentConfirmation(invoiceFlowId);
              } catch (emailError) {
                console.error(`[STRIPE_WEBHOOK] Failed to send payment confirmation email for invoice ${invoiceFlowId}:`, emailError);
              }
            }
          } else {
            const updateResult = await prisma.invoice.updateMany({
              where: {
                notes: stripeInvoiceId,
                status: { in: ["SENT", "OVERDUE"] },
              },
              data: {
                status: "PAID",
                paidAt: paidAt,
              },
            });
            console.log(`[STRIPE_WEBHOOK] Invoice marked as PAID via payment_intent.succeeded by Stripe invoice ID in notes: ${stripeInvoiceId}`);

            if (updateResult.count > 0) {
              const invoice = await prisma.invoice.findFirst({
                where: { notes: stripeInvoiceId },
              });
              if (invoice) {
                try {
                  await sendPaymentConfirmation(invoice.id);
                } catch (emailError) {
                  console.error(`[STRIPE_WEBHOOK] Failed to send payment confirmation email for invoice ${invoice.id}:`, emailError);
                }
              }
            }
          }
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        if (account.metadata?.invoiceFlowUserId) {
          await prisma.stripeAccount.updateMany({
            where: { userId: account.metadata.invoiceFlowUserId },
            data: { stripeConnectOnboardingComplete: account.charges_enabled },
          });
          console.log(
            `[STRIPE_WEBHOOK] Stripe account ${account.id} onboarding status updated to ${account.charges_enabled} for user ${account.metadata.invoiceFlowUserId}`
          );
        }
        break;
      }

      default:
        console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[STRIPE_WEBHOOK]", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
