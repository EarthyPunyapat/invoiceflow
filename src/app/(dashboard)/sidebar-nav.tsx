"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/estimates", label: "Estimates", icon: FileCheck },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex-1 px-3 py-6 space-y-1">
      {/* ─── Transition & hover gate styles ─── */}
      <style>{`
        :root {
          --ease-out-custom: cubic-bezier(0.23, 1, 0.32, 1);
          --duration-fast: 150ms;
        }

        /* All interactive states transition smoothly */
        .nav-item {
          transition:
            background-color var(--duration-fast) var(--ease-out-custom),
            color var(--duration-fast) var(--ease-out-custom),
            box-shadow var(--duration-fast) var(--ease-out-custom);
          position: relative;
        }

        /* Active indicator — left accent bar */
        .nav-item-active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          border-radius: 0 3px 3px 0;
          background: #4F46E5;
        }

        /* Hover gated behind pointer:fine */
        @media (hover: hover) and (pointer: fine) {
          .nav-item-inactive:hover {
            background-color: rgba(79,70,229,0.06);
            color: #4F46E5;
          }

          .dark .nav-item-inactive:hover {
            background-color: rgba(99,102,241,0.10);
            color: #A5B4FC;
          }
        }

        /* Focus-visible for keyboard navigation */
        .nav-item:focus-visible {
          outline: 2px solid #4F46E5;
          outline-offset: -2px;
          border-radius: 10px;
        }

        /* Reduced motion: instant transitions */
        @media (prefers-reduced-motion: reduce) {
          .nav-item {
            transition: none !important;
          }
        }
      `}</style>

      <div className="px-3 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Menu
        </p>
      </div>

      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg ${
              active
                ? "nav-item-active bg-primary-50/80 text-primary-700 shadow-sm dark:bg-primary-900/25 dark:text-primary-300"
                : "nav-item-inactive text-gray-600 dark:text-gray-400"
            }`}
          >
            <item.icon
              className={`h-5 w-5 flex-shrink-0 ${
                active
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
