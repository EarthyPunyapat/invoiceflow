interface LogoProps {
  className?: string;
  size?: number;
}
export function LogoIcon({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="InvoiceFlow icon"
    >
      <path
        d="M9 4h12l6 6v17H9V4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M21 4v7h6M5 9v19M14 16h8M14 21h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Logo({ className = "", size = 32 }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-gray-900 ${className}`}
    >
      <span className="text-primary-600">
        <LogoIcon size={size} />
      </span>
      <span
        style={{ fontSize: size * 0.63 }}
        className="font-semibold tracking-[-.04em] leading-none"
      >
        InvoiceFlow
      </span>
    </span>
  );
}
export default Logo;
