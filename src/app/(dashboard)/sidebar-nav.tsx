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
export const workspaceLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/estimates", label: "Estimates", icon: FileCheck },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="workspace-nav" aria-label="Workspace">
      {workspaceLinks.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            (
              href === "/dashboard"
                ? pathname === href
                : pathname.startsWith(href)
            )
              ? "page"
              : undefined
          }
        >
          <Icon aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
