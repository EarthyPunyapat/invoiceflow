import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  Plus,
  Users,
  Mail,
  Building2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ClientsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const search = (searchParams.search as string) || "";

  const where: any = { userId: session.user.id };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }

  const clients = await prisma.client.findMany({
    where,
    include: {
      invoices: {
        select: {
          id: true,
          status: true,
          total: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const clientsWithStats = clients.map((client) => ({
    ...client,
    invoiceCount: client.invoices.length,
    totalBilled: client.invoices.reduce(
      (sum, inv) => sum + (inv.status !== "CANCELLED" ? inv.total : 0),
      0
    ),
    outstanding: client.invoices.reduce(
      (sum, inv) =>
        sum + (inv.status === "SENT" || inv.status === "OVERDUE" ? inv.total : 0),
      0
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Clients
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {clientsWithStats.length} client{clientsWithStats.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/clients/new">
          <Button>
            <Plus className="w-4 h-4 mr-1.5" />
            New Client
          </Button>
        </Link>
      </div>

      {/* Search */}
      <form action="/clients" method="GET" className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          name="search"
          placeholder="Search clients..."
          defaultValue={search}
          className="pl-9"
        />
      </form>

      {/* Client grid */}
      {clientsWithStats.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            {search ? "No matching clients" : "No clients yet"}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {search
              ? "Try a different search term"
              : "Add your first client to start creating invoices"}
          </p>
          {!search && (
            <Link
              href="/clients/new"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              <Plus className="w-4 h-4" />
              Add your first client
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientsWithStats.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-base font-semibold text-primary-600 dark:text-primary-400">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {client.name}
                  </h3>
                  {client.company && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                      <Building2 className="w-3 h-3" />
                      {client.company}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                    <Mail className="w-3 h-3" />
                    {client.email}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Invoices
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {client.invoiceCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Billed
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(client.totalBilled)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Outstanding
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      client.outstanding > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {formatCurrency(client.outstanding)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
