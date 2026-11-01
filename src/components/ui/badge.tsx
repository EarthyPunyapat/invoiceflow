import { cn } from "@/lib/utils";
type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";
const variants: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-600",
  success: "bg-[#e8f1e8] text-[#245b45]",
  warning: "bg-[#f6eedf] text-[#805820]",
  danger: "bg-[#f9eae5] text-[#9b4438]",
  info: "bg-[#edf0ec] text-[#455d4e]",
};
export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded px-2 py-1 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
export function statusVariant(status: string): BadgeVariant {
  return status === "PAID"
    ? "success"
    : status === "SENT"
      ? "info"
      : status === "OVERDUE"
        ? "danger"
        : "default";
}
