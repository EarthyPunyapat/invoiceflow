export { auth as middleware } from "@/lib/auth";

export const config = {
  // Safety net in front of ALL dashboard-area routes. Pages and API routes
  // still call auth() individually — this only stops unauthenticated
  // requests earlier.
  matcher: [
    "/dashboard/:path*",
    "/invoices/:path*",
    "/clients/:path*",
    "/settings/:path*",
    "/estimates/:path*",
    "/reports/:path*",
  ],
};
