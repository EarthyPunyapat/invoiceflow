"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Screens ─────────────────────────────────────────────────────────────

const SCREENS = [
  {
    id: "connect",
    title: "Connect Stripe in one click",
    body: "Secure OAuth — no API keys, no setup. Your Stripe account links instantly.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600 dark:text-primary-400">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
      </svg>
    ),
  },
  {
    id: "generate",
    title: "Invoices auto-generate",
    body: "Every payment creates a branded, numbered invoice instantly. Zero data entry.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600 dark:text-primary-400">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: "remind",
    title: "Smart reminders fire",
    body: "Polite follow-ups for overdue payments — on autopilot. No awkward emails.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600 dark:text-primary-400">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    id: "dashboard",
    title: "Dashboard shows everything",
    body: "Paid, pending, overdue — know your cash position at a glance.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600 dark:text-primary-400">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
];

// ─── Animated step content ────────────────────────────────────────────────

function StepContent({ screen }: { screen: (typeof SCREENS)[number] }) {
  return (
    <motion.div
      key={screen.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="text-center"
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
        {screen.icon}
      </div>
      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
        {screen.title}
      </h4>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
        {screen.body}
      </p>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export function VideoLightbox({
  triggerClassName,
  triggerLabel,
}: {
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const openModal = () => {
    setStep(0);
    setClosing(false);
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    document.body.style.overflow = "hidden";
  };

  const startClose = () => {
    setClosing(true);
    document.body.style.overflow = "";
    if (timerRef.current) clearTimeout(timerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 200);
  };

  const closeModal = () => {
    if (closing) return;
    startClose();
  };

  // Auto-advance steps every 4.8s
  useEffect(() => {
    if (!open || closing || step >= SCREENS.length - 1) return;
    timerRef.current = setTimeout(() => setStep((s) => s + 1), 4800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, closing, step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={openModal}
        className={
          triggerClassName ??
          "group inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1A1E] px-8 py-4 text-base font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 sm:w-auto"
        }
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="relative z-10">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </span>
        {triggerLabel ?? "Watch 60-second demo"}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${
              closing ? "" : "animate-backdrop-fade"
            }`}
            onClick={closeModal}
          />

          {/* Modal card */}
          <div
            className={`relative z-10 mx-4 w-full max-w-sm sm:max-w-lg lg:max-w-xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1A1E] shadow-2xl overflow-hidden ${
              closing ? "animate-card-exit" : "animate-card-enter"
            }`}
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 dark:bg-[#1A1A1E]/80 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Step content */}
            <div className="px-6 pt-10 pb-2 text-center min-h-[160px] flex flex-col justify-center">
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Step {step + 1} of {SCREENS.length}
              </p>
              <AnimatePresence mode="wait">
                <StepContent key={SCREENS[step].id} screen={SCREENS[step]} />
              </AnimatePresence>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-2 py-4">
              {SCREENS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step
                      ? "w-8 bg-primary-600"
                      : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                  }`}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-6 py-3 bg-gray-50/50 dark:bg-[#151518]/50">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {step < SCREENS.length - 1 ? "Auto-advancing..." : "That's it!"}
              </p>
              {step < SCREENS.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Next <span className="text-base leading-none">→</span>
                </button>
              ) : (
                <button
                  onClick={closeModal}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 transition-colors"
                >
                  Try InvoiceFlow Free
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VideoLightbox;
