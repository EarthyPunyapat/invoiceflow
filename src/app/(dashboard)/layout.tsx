import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { MobileHeader } from "./mobile-header";
import { SidebarNav } from "./sidebar-nav";
import { LogOut, Plus } from "lucide-react";
import { Logo } from "@/components/logo";
import { PlanBanner } from "@/components/plan-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user;
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <Link
          href="/dashboard"
          aria-label="InvoiceFlow overview"
          className="px-2"
        >
          <Logo size={31} />
        </Link>
        <div className="mt-9 px-2">
          <p className="text-xs text-gray-500">Your workspace</p>
          <p className="mt-1 truncate text-sm font-medium">
            {user.name || "Personal account"}
          </p>
        </div>
        <SidebarNav />
        <Link
          href="/invoices/new"
          className="app-button mt-7 h-10 border border-gray-300 bg-white px-3 text-sm"
        >
          <Plus size={16} />
          New invoice
        </Link>
        <div className="workspace-user">
          <span className="account-avatar">
            {user.name?.charAt(0) || user.email?.charAt(0) || "I"}
          </span>
          <div>
            <p className="text-sm font-medium">{user.name || "Your account"}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="app-button h-9 w-full justify-start px-3 text-sm text-gray-600"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </form>
      </aside>
      <div className="workspace-content">
        <MobileHeader user={user} />
        <main className="workspace-main">
          {user.id && <PlanBanner userId={user.id} />}
          {children}
        </main>
      </div>
    </div>
  );
}
