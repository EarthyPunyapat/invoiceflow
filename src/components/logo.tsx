import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Full InvoiceFlow logo — receipt icon + lightning bolt + wordmark.
 *
 * Icon: a clean receipt/document with a folded corner and a teal lightning
 * bolt that symbolizes automated workflow. The wordmark uses currentColor
 * for "Invoice" (adapts to dark mode) and brand indigo for "Flow".
 *
 * Usage:
 *   <Logo size={36} />           // default light mode
 *   <Logo size={36} className="text-gray-900 dark:text-white" />
 */
export function Logo({ className = "", size = 32 }: LogoProps) {
  const scale = size / 40;
  const width = 200 * scale;
  const height = size;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 200 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="InvoiceFlow"
      role="img"
    >
      {/* ── Receipt body ── */}
      <rect
        x="3.5"
        y="2.5"
        width="29"
        height="33"
        rx="5"
        fill="#4F46E5"
      />

      {/* Folded corner (top-right) */}
      <path
        d="M24.5 2.5L32.5 2.5V10.5L24.5 2.5Z"
        fill="#4338CA"
      />

      {/* Receipt lines — white with varying opacity for depth */}
      <rect
        x="9"
        y="13"
        width="12"
        height="2.5"
        rx="1.25"
        fill="white"
        opacity="0.65"
      />
      <rect
        x="9"
        y="18.5"
        width="17"
        height="2.5"
        rx="1.25"
        fill="white"
        opacity="0.45"
      />
      <rect
        x="9"
        y="24"
        width="10"
        height="2.5"
        rx="1.25"
        fill="white"
        opacity="0.45"
      />

      {/* ── Lightning bolt (teal accent — the "Flow") ── */}
      <path
        d="M0.5 31L7.5 19L4.5 19L11.5 8L7.5 8L12.5 23L9.5 23L3.5 31Z"
        fill="#0D9488"
      />

      {/* Bolt inner highlight for depth */}
      <path
        d="M2 29L7.5 19.5L5.5 19.5L10.5 10L8 10L11.5 22L9.5 22L5 29Z"
        fill="#14B8A6"
        opacity="0.55"
      />

      {/* ── Wordmark ── */}
      <text
        x="44"
        y="29"
        fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontWeight="700"
        fontSize="21"
        letterSpacing="-0.02em"
      >
        <tspan fill="currentColor">Invoice</tspan>
        <tspan fill="#4F46E5">Flow</tspan>
      </text>
    </svg>
  );
}

/**
 * Icon-only variant — just the receipt + bolt mark.
 * Used in favicons, login page icon container, and other places
 * where only the icon mark is needed without the wordmark.
 *
 * Usage:
 *   <LogoIcon size={28} />
 */
export function LogoIcon({ className = "", size = 32 }: LogoProps) {
  const dim = size;

  return (
    <svg
      className={className}
      width={dim}
      height={dim}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="InvoiceFlow icon"
      role="img"
    >
      {/* Receipt body */}
      <rect
        x="3"
        y="2"
        width="30"
        height="32"
        rx="5"
        fill="#4F46E5"
      />

      {/* Folded corner */}
      <path
        d="M25 2L33 2V10L25 2Z"
        fill="#4338CA"
      />

      {/* Receipt lines */}
      <rect
        x="9"
        y="12"
        width="13"
        height="2.5"
        rx="1.25"
        fill="white"
        opacity="0.7"
      />
      <rect
        x="9"
        y="17.5"
        width="18"
        height="2.5"
        rx="1.25"
        fill="white"
        opacity="0.5"
      />
      <rect
        x="9"
        y="23"
        width="10"
        height="2.5"
        rx="1.25"
        fill="white"
        opacity="0.5"
      />

      {/* Lightning bolt */}
      <path
        d="M-1 31L7 18L4 18L12 6L8 6L14 22L10 22L3 31Z"
        fill="#0D9488"
      />

      {/* Bolt highlight */}
      <path
        d="M1 28.5L6.5 19L4.5 19L10 8.5L7.5 8.5L11.5 21L9.5 21L4.5 28.5Z"
        fill="#14B8A6"
        opacity="0.55"
      />
    </svg>
  );
}

export default Logo;
