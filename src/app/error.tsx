"use client";

// ─── Root Error Boundary ────────────────────────────────────────────
//
// Catches unhandled errors in any nested route segment and renders a
// friendly recovery screen instead of the default Next.js crash page.
// `reset()` re-renders the segment; a hard refresh link covers cases
// where client state is beyond repair.

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    // Surface the real error for diagnostics — the UI stays friendly.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
          <AlertTriangle
            className="h-7 w-7 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          An unexpected error occurred while loading this page. Your data is
          safe — try again, or head back to your dashboard.
        </p>

        {error.digest ? (
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Link href="/dashboard">
            <Button variant="outline">
              <Home className="h-4 w-4" />
              Go to dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
