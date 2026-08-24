import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EstimateActions } from "./estimate-actions";

interface EstimateDetailPageProps {
  params: { id: string };
}

// Auth-gated dynamic title. Metadata resolves outside the page's own
// session guard, so query defensively: generic label on missing session,
// unowned record, or any transient failure.
export async function generateMetadata({
  params,
}: EstimateDetailPageProps): Promise<Metadata> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { title: "Estimate" };
    const record = await prisma.estimate.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { estimateNumber: true },
    });
    return { title: record?.estimateNumber ?? "Estimate" };
  } catch {
    return { title: "Estimate" };
  }
}

export default async function EstimateDetailPage({
  params,
}: EstimateDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const estimate = await prisma.estimate.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      client: true,
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!estimate) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-gray-500 dark:text-gray-400">Estimate not found</p>
        <Link href="/estimates" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to estimates
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/estimates">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {estimate.estimateNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={estimate.status === "ACCEPTED" ? "success" : estimate.status === "DECLINED" ? "danger" : estimate.status === "SENT" ? "info" : estimate.status === "DRAFT" ? "warning" : "default"}>
                {estimate.status}
              </Badge>
            </div>
          </div>
        </div>
        <EstimateActions estimateId={estimate.id} status={estimate.status} />
      </div>

      {/* Meta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Client
          </h3>
          <p className="text-sm text-gray-900 dark:text-white mt-1">
            {estimate.client.name}
          </p>
          {estimate.client.company && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {estimate.client.company}
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Issued
          </h3>
          <p className="text-sm text-gray-900 dark:text-white mt-1">
            {formatDate(estimate.issueDate ?? estimate.createdAt)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Expires
          </h3>
          <p className="text-sm text-gray-900 dark:text-white mt-1">
            {estimate.expiryDate ? formatDate(estimate.expiryDate) : "—"}
          </p>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Qty
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Unit price
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {estimate.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-sm text-gray-900 dark:text-white">
                    {item.description}
                  </td>
                  <td className="px-5 py-3 text-sm text-center text-gray-600 dark:text-gray-300">
                    {item.quantity}
                  </td>
                  <td className="px-5 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                    {formatCurrency(item.unitPrice, estimate.currency)}
                  </td>
                  <td className="px-5 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(item.total, estimate.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-white">
              {formatCurrency(estimate.subtotal, estimate.currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Tax ({estimate.tax}%)
            </span>
            <span className="text-gray-900 dark:text-white">
              {formatCurrency(
                estimate.total - estimate.subtotal,
                estimate.currency
              )}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            <span className="font-semibold text-gray-900 dark:text-white">
              Total
            </span>
            <span className="font-bold text-lg text-primary-600 dark:text-primary-400">
              {formatCurrency(estimate.total, estimate.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {estimate.notes && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Notes
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {estimate.notes}
          </p>
        </div>
      )}
    </div>
  );
}
