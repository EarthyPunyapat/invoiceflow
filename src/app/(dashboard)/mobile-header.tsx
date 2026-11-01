"use client";
import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X, Plus, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { workspaceLinks } from "./sidebar-nav";
export function MobileHeader({
  user,
}: {
  user: { name?: string | null; email?: string | null } | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  function close() {
    dialog.current?.close();
    trigger.current?.focus();
  }
  return (
    <>
      <header className="mobile-app-header">
        <button
          ref={trigger}
          type="button"
          aria-label="Open navigation"
          onClick={() => dialog.current?.showModal()}
          className="app-button h-10 w-10"
        >
          <Menu size={20} />
        </button>
        <Link href="/dashboard" aria-label="InvoiceFlow overview">
          <Logo size={29} />
        </Link>
        <Link
          href="/invoices/new"
          aria-label="New invoice"
          className="app-button h-10 w-10"
        >
          <Plus size={20} />
        </Link>
      </header>
      <dialog
        ref={dialog}
        className="mobile-nav-dialog"
        aria-label="Workspace navigation"
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
      >
        <div className="flex items-center justify-between">
          <Logo size={29} />
          <button
            type="button"
            aria-label="Close navigation"
            onClick={close}
            className="app-button h-10 w-10"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mt-9 text-sm font-medium">
          {user?.name || "Your workspace"}
        </p>
        <nav className="workspace-nav" aria-label="Mobile workspace">
          {workspaceLinks.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              key={href}
              onClick={close}
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
              <Icon />
              {label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="app-button mt-10 h-10 px-3 text-sm"
          onClick={() => void signOut({ callbackUrl: "/login" })}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </dialog>
    </>
  );
}
