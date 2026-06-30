import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  UserRound,
  Wallet,
  BadgeCheck,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { getAllUsers } from "../../features/auth/services/auth.service";
import type { User } from "../../types";

type PaymentStatus = "Paid" | "Not Paid";

type StatCard = {
  label: string;
  value: string;
  icon: React.ElementType;
  hint?: string;
};

type ResidentUser = User & {
  userType: "Owner" | "Renter";
};

type PaymentHistoryRow = {
  monthKey?: string;
  monthLabel?: string;
  collection?: number;
  status?: PaymentStatus;
  datePaid?: string;
  updatedAt?: unknown;
  createdAt?: unknown;
};

const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const isResidentUser = (user: User): user is ResidentUser =>
  user.userType === "Owner" || user.userType === "Renter";

const getManilaDate = () =>
  new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date());

const getCurrentYear = () => {
  const parts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
  }).formatToParts(new Date());

  return parts.find((part) => part.type === "year")?.value ?? "";
};

const getCurrentMonthKey = () => {
  const parts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";

  return `${year}-${month}`;
};

const getPaymentHistory = (user: ResidentUser): PaymentHistoryRow[] => {
  const rawHistory =
    (user as { paymentHistory?: unknown }).paymentHistory ??
    (user as { payments?: unknown }).payments;

  if (!Array.isArray(rawHistory)) return [];

  return rawHistory.map((item) => {
    const row = item as Record<string, unknown>;

    const collection = toNumber(row.collection ?? row.paid ?? row.payment, 0);
    const status =
      row.status === "Paid" || row.status === "Not Paid"
        ? row.status
        : collection > 0
          ? "Paid"
          : "Not Paid";

    return {
      monthKey: clean(row.monthKey),
      monthLabel: clean(row.monthLabel) || clean(row.month),
      collection: status === "Paid" ? collection : 0,
      status,
      datePaid: clean(row.datePaid) || clean(row.paymentDate),
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    };
  });
};

const getStoredPaymentStatus = (user: ResidentUser): PaymentStatus => {
  const paymentStatus = (user as { paymentStatus?: unknown }).paymentStatus;

  return paymentStatus === "Paid" || paymentStatus === "Not Paid"
    ? paymentStatus
    : "Not Paid";
};

const getResidentName = (user: ResidentUser) =>
  [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");

const getResidentLocation = (user: ResidentUser) =>
  user.address ||
  [user.phase, user.block, user.lot].filter(Boolean).join(" / ") ||
  "-";

const toMillis = (value: unknown) => {
  if (!value || typeof value !== "object") return 0;

  if ("toMillis" in value && typeof (value as any).toMillis === "function") {
    return (value as any).toMillis();
  }

  return 0;
};

export default function AdminHomePage() {
  const { user: clerkUser } = useUser();

  const userName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    clerkUser?.emailAddresses[0]?.emailAddress?.split("@")[0] ||
    "AdminUser";

  const {
    data: users = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["admin-dashboard-users"],
    queryFn: getAllUsers,
    staleTime: 1000 * 60 * 5,
  });

  const residents = useMemo(() => users.filter(isResidentUser), [users]);

  const currentMonthKey = getCurrentMonthKey();
  const currentYear = getCurrentYear();

  const data = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(Number(currentYear), index, 1);

      return {
        month: new Intl.DateTimeFormat("en-PH", { month: "short" }).format(
          date,
        ),
        monthKey: `${currentYear}-${String(index + 1).padStart(2, "0")}`,
        amount: 0,
      };
    });

    for (const resident of residents) {
      for (const history of getPaymentHistory(resident)) {
        const item = months.find(
          (month) => month.monthKey === history.monthKey,
        );

        if (item) {
          item.amount += toNumber(history.collection, 0);
        }
      }
    }

    return months.map(({ month, amount }) => ({ month, amount }));
  }, [currentYear, residents]);

  const duesCollectedThisMonth = useMemo(
    () =>
      residents.reduce((sum, resident) => {
        const history = getPaymentHistory(resident);
        const currentMonthRecord = history.find(
          (row) => row.monthKey === currentMonthKey,
        );

        return sum + toNumber(currentMonthRecord?.collection, 0);
      }, 0),
    [currentMonthKey, residents],
  );

  const unpaidDuesCount = useMemo(
    () =>
      residents.filter((resident) => {
        const history = getPaymentHistory(resident);
        const currentMonthRecord = history.find(
          (row) => row.monthKey === currentMonthKey,
        );

        if (currentMonthRecord) {
          return currentMonthRecord.status !== "Paid";
        }

        return getStoredPaymentStatus(resident) !== "Paid";
      }).length,
    [currentMonthKey, residents],
  );

  const recentActivities = useMemo(() => {
    return residents
      .flatMap((resident) =>
        getPaymentHistory(resident)
          .filter((history) => history.status === "Paid")
          .map((history) => ({
            id: `${resident.id}-${history.monthKey || history.monthLabel}`,
            title: "Payment received",
            description: `${getResidentName(resident) || "Resident"} paid ${history.monthLabel || "monthly dues"} • ${getResidentLocation(resident)}`,
            sortTime: Math.max(
              toMillis(history.updatedAt),
              toMillis(history.createdAt),
            ),
          })),
      )
      .sort((a, b) => b.sortTime - a.sortTime)
      .slice(0, 2);
  }, [residents]);

  const stats: StatCard[] = [
    {
      label: "Total Users",
      value: isLoading ? "..." : String(residents.length),
      icon: UserRound,
      hint: "All residents",
    },
    {
      label: "Dues Collected",
      value: isLoading ? "..." : peso(duesCollectedThisMonth),
      icon: Wallet,
      hint: "This month",
    },
    {
      label: "Unpaid Dues",
      value: isLoading ? "..." : String(unpaidDuesCount),
      icon: BadgeCheck,
      hint: "Needs follow-up",
    },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">Firestore error</p>
          <p className="mt-1 text-xs font-medium text-rose-800">
            {error instanceof Error
              ? error.message
              : "Failed to load dashboard data."}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-full bg-emerald-600 text-white font-extrabold shadow-sm">
            {userName.slice(0, 1).toUpperCase()}
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-500">Welcome back,</p>

            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">
              Admin!
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={isRefetching ? "animate-spin" : ""}
            />

            {isRefetching ? "Refreshing..." : "Refresh"}
          </button>

          <p className="text-sm font-semibold text-zinc-500">
            {getManilaDate()}
          </p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Icon size={20} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-500">
                    {s.label}
                  </p>
                  <p className="mt-1 truncate text-2xl font-extrabold tracking-tight text-zinc-900">
                    {s.value}
                  </p>
                  {s.hint ? (
                    <p className="mt-1 text-xs font-semibold text-zinc-400">
                      {s.hint}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-zinc-900">
                  Monthly Dues Collection
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Overview of collected dues per month.
                </p>
              </div>

              <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                <BarChart3 size={16} />
                {currentYear}
              </span>
            </div>

            <div className="mt-5 h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(v: any) => peso(Number(v))}
                    labelStyle={{ fontWeight: 700 }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#059669"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-6">
            <p className="text-sm font-extrabold text-zinc-900">
              Quick Actions
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <Link
                to="/admin/users"
                className="group inline-flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 active:bg-zinc-100"
              >
                Manage Residents
                <span className="grid size-9 place-items-center rounded-full bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100">
                  <ArrowRight size={16} />
                </span>
              </Link>

              <Link
                to="/admin/payments"
                className="group inline-flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 active:bg-zinc-100"
              >
                Review Payments
                <span className="grid size-9 place-items-center rounded-full bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100">
                  <ArrowRight size={16} />
                </span>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-6">
            <p className="text-sm font-extrabold text-zinc-900">
              Recent Activity
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Add latest payments, reminders, or notifications here.
            </p>

            <div className="mt-4 space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-2xl border border-zinc-200 p-4"
                  >
                    <p className="text-sm font-semibold text-zinc-900">
                      {activity.title}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">
                      {activity.description}
                    </p>
                  </div>
                ))
              ) : (
                <>
                  <div className="rounded-2xl border border-zinc-200 p-4">
                    <p className="text-sm font-semibold text-zinc-900">
                      Payment received
                    </p>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">
                      No recent payment activity yet
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 p-4">
                    <p className="text-sm font-semibold text-zinc-900">
                      Reminder sent
                    </p>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">
                      No recent reminders yet
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
