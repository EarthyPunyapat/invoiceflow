import { Badge } from "@/components/ui/badge";

// ─── Estimate status → badge mapping (local to /estimates scope) ────
// Kept local so the shared ui/badge module stays untouched.

const estimateVariants: Record<
  string,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  DRAFT: "warning",
  SENT: "info",
  ACCEPTED: "success",
  DECLINED: "danger",
  CONVERTED: "default",
};

export function EstimateStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={estimateVariants[status] ?? "default"}>{status}</Badge>
  );
}
