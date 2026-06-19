export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/invoices/:path*", "/clients/:path*", "/settings/:path*"],
};
