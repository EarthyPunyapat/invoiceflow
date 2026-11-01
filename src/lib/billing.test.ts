import { describe, expect, it } from "vitest";
import { checkoutAmount } from "./billing";
import { canTransition } from "./invoice-status";
import { appUrl } from "./app-url";
import { authConfig } from "./auth.config";
import { invoiceCreateSchema } from "./validators/invoices";

describe("billing boundaries", () => {
  it("rounds the stored total to cents and rejects unsafe payment amounts", () => {
    expect(checkoutAmount(11.25, "USD")).toBe(1125);
    expect(checkoutAmount(33.335, "EUR")).toBe(3334);
    for (const total of [0, -1, Infinity, 1_000_000]) expect(() => checkoutAmount(total, "USD")).toThrow();
    expect(() => checkoutAmount(100, "JPY")).toThrow("two decimal");
  });
  it("does not reopen paid/cancelled or turn sent invoices back into editable drafts", () => {
    expect(canTransition("SENT", "PAID")).toBe(true);
    expect(canTransition("PAID", "DRAFT")).toBe(false);
    expect(canTransition("CANCELLED", "SENT")).toBe(false);
    expect(canTransition("SENT", "DRAFT")).toBe(false);
  });
  it("rejects fractional quantities that PostgreSQL cannot store", () => {
    expect(invoiceCreateSchema.safeParse({ clientId: "client", dueDate: new Date(), items: [{ description: "Design", quantity: 0.5, unitPrice: 10 }] }).success).toBe(false);
  });
  it("uses a configured origin and removes paths from customer URLs", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    try {
      process.env.NEXT_PUBLIC_APP_URL = "https://invoices.example/path/";
      expect(appUrl()).toBe("https://invoices.example");
      process.env.NEXT_PUBLIC_APP_URL = "javascript:alert(1)";
      expect(() => appUrl()).toThrow();
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previous;
    }
  });
  it("populates the owner ID from a JWT session without loading Prisma in middleware", async () => {
    const session = { user: { id: "", email: "owner@example.test" }, expires: "2027-01-01" };
    const result = await authConfig.callbacks.session({ session, token: { sub: "owner_123" } } as never);
    expect(result.user.id).toBe("owner_123");
    expect(authConfig.callbacks.authorized({ auth: null } as never)).toBe(false);
  });
});
