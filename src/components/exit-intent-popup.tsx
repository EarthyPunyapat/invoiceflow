"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "invoiceflow_exit_popup_shown";
const DEBOUNCE_MS = 30_000;

export function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastFiredRef = useRef(0);
  const shownRef = useRef(false);

  // Only mount on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger when mouse moves toward the top of the viewport
    if (e.clientY > 60) return;

    const now = Date.now();
    if (now - lastFiredRef.current < DEBOUNCE_MS) return;

    // Check localStorage
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // Ignore storage errors
    }

    lastFiredRef.current = now;

    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore storage errors
    }

    shownRef.current = true;
    setVisible(true);
  }, []);

  useEffect(() => {
    // Only activate on desktop devices with fine pointers
    const mql = window.matchMedia("(pointer: fine)");
    if (!mql.matches) return;

    // Check if already shown this session
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // Ignore
    }

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [handleMouseLeave]);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) close();
    },
    [close],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") close();
    },
    [close],
  );

  // Lock body scroll when open
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!mounted || !visible) return null;

  const popup = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={handleBackdropClick}
      />

      {/* Glass panel card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Exit offer"
        className="relative z-10 mx-4 w-full max-w-md animate-popup-enter"
      >
        <div className="relative rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-[#1A1A1E]/90 backdrop-blur-xl p-8 shadow-2xl">
          {/* Close button */}
          <button
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Teal accent bar */}
          <div className="mb-6 h-1 w-16 rounded-full bg-accent-500 dark:bg-accent-400" />

          {/* Headline */}
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Wait! Before you go...
          </h2>

          {/* Subhead */}
          <p className="mt-3 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Download our free guide:{" "}
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              5 Ways to Get Paid Faster
            </span>
          </p>

          {/* CTA buttons */}
          <div className="mt-6 flex flex-col gap-3">
            <a
              href="#"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Free Guide
            </a>
            <a
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1A1E] px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Start Free Trial
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>

          {/* Subtle no-pressure note */}
          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
            No spam. Just a free guide to help you get paid faster.
          </p>
        </div>
      </div>

      {/* Inline keyframe styles */}
      <style>{`
        @keyframes popup-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes popup-enter {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fade-in {
          animation: popup-fade-in 250ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }

        .animate-popup-enter {
          animation: popup-enter 350ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in,
          .animate-popup-enter {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(popup, document.body);
}
