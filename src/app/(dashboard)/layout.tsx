import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { MobileHeader } from "./mobile-header";
import { SidebarNav } from "./sidebar-nav";
import {
  LogOut,
  Plus,
} from "lucide-react";
import { Logo } from "@/components/logo";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0B]">
      <MobileHeader user={session?.user ?? null} />

      <div className="flex">
        {/* ─── Desktop sidebar — Glass panel surface ─── */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 z-40">
          {/* Glass sidebar background */}
          <div className="flex flex-col h-full border-r border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl">
            {/* Logo area */}
            <div className="flex items-center h-16 px-6 border-b border-gray-200/60 dark:border-gray-800/60">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Logo size={30} />
              </Link>
            </div>

            <SidebarNav />

            {/* User footer */}
            <div className="mt-auto border-t border-gray-200/60 dark:border-gray-800/60">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-8 w-8 rounded-full ring-2 ring-gray-100 dark:ring-gray-800"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-100 dark:ring-primary-900/20">
                      <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                        {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "?"}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {session?.user?.name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                  className="mt-3"
                >
                  <button
                    type="submit"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white transition-all duration-150"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </aside>

        {/* ─── Main content area ─── */}
        <main className="flex-1 lg:pl-64">
          {/* Desktop top bar — Glass panel */}
          <div className="hidden lg:flex items-center justify-end h-16 px-6 border-b border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <Link
                href="/invoices/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 hover:shadow-md transition-all duration-150"
              >
                <Plus className="h-4 w-4" />
                New Invoice
              </Link>
              <div className="flex items-center gap-2.5 pl-4 border-l border-gray-200 dark:border-gray-800">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-7 w-7 rounded-full ring-2 ring-gray-100 dark:ring-gray-800"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                    <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                      {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "?"}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {session?.user?.name || "User"}
                </span>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
