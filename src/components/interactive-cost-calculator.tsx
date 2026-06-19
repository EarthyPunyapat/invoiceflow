"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const INVOICEFLOW_COST = 228;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

/* ------------------------------------------------------------------ */
/*  AnimatedCounter – counts up/down with an easeOutExpo curve         */
/* ------------------------------------------------------------------ */
function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const diff = value - startValue;

    if (diff === 0) {
      setDisplayValue(value);
      return;
    }

    const duration = 500;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo – fast start, smooth land
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.round(startValue + diff * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    prevValueRef.current = value;

    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{formatCurrency(displayValue)}</>;
}

/* ------------------------------------------------------------------ */
/*  AnimatedRangeSlider – fully custom slider with animated fill       */
/* ------------------------------------------------------------------ */
function AnimatedRangeSlider({
  min,
  max,
  step,
  value,
  onChange,
  label,
  formatValue,
  minLabel,
  maxLabel,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  label: string;
  formatValue: (v: number) => string;
  minLabel: string;
  maxLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = ((value - min) / (max - min)) * 100;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const rawValue = (x / rect.width) * (max - min) + min;
      const steppedValue = Math.round(rawValue / step) * step;
      const clamped = Math.max(min, Math.min(max, steppedValue));
      onChange(clamped);
    },
    [min, max, step, onChange],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updateFromClientX(e.clientX);
    },
    [isDragging, updateFromClientX],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div>
      {/* Label + live value */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <motion.span
          key={value}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white"
        >
          {formatValue(value)}
        </motion.span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative w-full h-8 flex items-center cursor-pointer select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Background rail */}
        <div className="absolute w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700" />

        {/* Animated fill */}
        <motion.div
          className="absolute h-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
          initial={false}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.12, ease: "easeOut" }}
        />

        {/* Thumb */}
        <motion.div
          className={`absolute w-5 h-5 rounded-full bg-white dark:bg-gray-100 shadow-lg border-2 border-indigo-500 ${
            isDragging ? "scale-125 cursor-grabbing" : "cursor-grab"
          }`}
          initial={false}
          animate={{
            left: `calc(${percentage}% - 10px)`,
            scale: isDragging ? 1.25 : 1,
          }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          whileHover={{ scale: 1.2 }}
        />
      </div>

      {/* Min / Max labels */}
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {minLabel}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {maxLabel}
        </span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  InteractiveCostCalculator                                         */
/* ================================================================== */
export function InteractiveCostCalculator() {
  const [hourlyRate, setHourlyRate] = useState<number>(75);
  const [hoursPerMonth, setHoursPerMonth] = useState<number>(5);

  const manualAnnual: number = hourlyRate * hoursPerMonth * 12;
  const saving: number = Math.max(0, manualAnnual - INVOICEFLOW_COST);
  const showSavings: boolean = manualAnnual > INVOICEFLOW_COST;

  /* Bar-chart widths — normalize so the larger value fills 100 % */
  const maxBarValue = Math.max(manualAnnual, INVOICEFLOW_COST, 500);
  const manualBarPct = (manualAnnual / maxBarValue) * 100;
  const invoiceFlowBarPct = (INVOICEFLOW_COST / maxBarValue) * 100;

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-[#1A1A1E]/90 backdrop-blur-xl p-5 sm:p-6 text-left shadow-lg overflow-hidden">
      {/* Heading */}
      <motion.p
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-5"
      >
        See what manual invoicing costs you
      </motion.p>

      {/* Sliders */}
      <div className="space-y-5">
        <AnimatedRangeSlider
          min={10}
          max={500}
          step={5}
          value={hourlyRate}
          onChange={setHourlyRate}
          label="Your hourly rate"
          formatValue={(v) => `$${v}/hr`}
          minLabel="$10"
          maxLabel="$500"
        />

        <AnimatedRangeSlider
          min={1}
          max={40}
          step={1}
          value={hoursPerMonth}
          onChange={setHoursPerMonth}
          label="Hours/month on invoicing"
          formatValue={(v) => `${v}h`}
          minLabel="1h"
          maxLabel="40h"
        />
      </div>

      {/* Results */}
      <div className="mt-6 space-y-2">
        {/* Manual cost line */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Manual invoicing costs
          </span>
          <span className="text-lg font-bold tabular-nums text-red-600 dark:text-red-500">
            <AnimatedCounter value={manualAnnual} />
            <span className="text-sm font-medium text-red-500/70 dark:text-red-400/70">
              /yr
            </span>
          </span>
        </div>

        {/* InvoiceFlow cost line */}
        <div className="flex items-baseline justify-between border-t border-gray-100 dark:border-gray-800 pt-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            InvoiceFlow Pro
          </span>
          <span className="text-lg font-bold text-teal-600 dark:text-teal-400 tabular-nums">
            $228<span className="text-sm font-medium">/yr</span>
          </span>
        </div>

        {/* ---- Animated comparison bar chart ---- */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
            Cost Comparison
          </p>

          <div className="space-y-3">
            {/* Manual bar */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-red-600 dark:text-red-400 w-16 flex-shrink-0 text-right">
                Manual
              </span>
              <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 flex items-center justify-end pr-2.5"
                  initial={false}
                  animate={{ width: `${manualBarPct}%` }}
                  transition={{
                    duration: 0.55,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                >
                  <span className="text-[10px] font-bold text-white drop-shadow-sm whitespace-nowrap">
                    {formatCurrency(manualAnnual)}
                  </span>
                </motion.div>
              </div>
            </div>

            {/* InvoiceFlow bar */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 w-16 flex-shrink-0 text-right">
                InvoiceFlow
              </span>
              <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 flex items-center justify-end pr-2.5 min-w-[72px]"
                  initial={false}
                  animate={{ width: `${invoiceFlowBarPct}%` }}
                  transition={{
                    duration: 0.55,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                >
                  <span className="text-[10px] font-bold text-white drop-shadow-sm">
                    $228
                  </span>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Savings / no-savings ---- */}
        <AnimatePresence mode="wait">
          {showSavings ? (
            <motion.div
              key="savings-block"
              initial={{ opacity: 0, y: 12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              {/* Savings line */}
              <div className="flex items-baseline justify-between border-t border-gray-100 dark:border-gray-800 pt-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  You&apos;re saving
                </span>
                <span className="text-lg font-bold tabular-nums text-green-600 dark:text-green-400">
                  <AnimatedCounter value={saving} />
                  <span className="text-sm font-medium text-green-500/70 dark:text-green-400/70">
                    /yr
                  </span>
                </span>
              </div>

              {/* Pulsing savings badge */}
              <motion.div
                key={`badge-${saving}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 14,
                  mass: 1,
                }}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
              >
                <motion.span
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{
                    duration: 0.6,
                    delay: 0.1,
                    ease: "easeInOut",
                  }}
                  className="text-base"
                >
                  💰
                </motion.span>
                <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                  You save {formatCurrency(saving)}/yr with InvoiceFlow
                </span>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="no-savings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-800/40 px-4 py-3 text-center"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Try increasing your rate or hours to see savings.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default InteractiveCostCalculator;
