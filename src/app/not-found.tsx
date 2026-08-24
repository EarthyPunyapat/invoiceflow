// ─── 404 — Page Not Found ───────────────────────────────────────────
//
// Static fallback for unmatched routes. Rendered inside the root
// layout, so it inherits the app font and background tokens.

import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/20">
          <FileQuestion
            className="h-7 w-7 text-primary-600 dark:text-primary-400"
            aria-hidden="true"
          />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
          404
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It may
          have been moved or deleted.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4" />
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
