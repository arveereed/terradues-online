import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  UserRound,
  Wallet,
  BadgeCheck,
  ArrowRight,
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

type StatCard = {
  label: string;
  value: string;
  icon: React.ElementType;
  hint?: string;
};

const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);

export default function AdminHomePage() {
  const userName = "AdminUser";

  const data = useMemo(
    () => [
      { month: "Jan", amount: 500 },
      { month: "Feb", amount: 600 },
      { month: "Mar", amount: 550 },
      { month: "Apr", amount: 800 },
      { month: "May", amount: 1200 },
      { month: "Jun", amount: 1800 },
    ],
    [],
  );

  const stats: StatCard[] = [
    {
      label: "Total Users",
      value: "150",
      icon: UserRound,
      hint: "All residents",
    },
    {
      label: "Dues Collected",
      value: peso(2456),
      icon: Wallet,
      hint: "This month",
    },
    {
      label: "Unpaid Dues",
      value: "12",
      icon: BadgeCheck,
      hint: "Needs follow-up",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-full bg-emerald-600 text-white font-extrabold shadow-sm">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-500">Welcome back,</p>
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">
              {userName}!
            </h1>
          </div>
        </div>

        {/* Replace with real date later */}
        <p className="text-sm font-semibold text-zinc-500">Sep 14, 2025</p>
      </div>

      {/* Stats */}
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

      {/* Content grid */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Chart */}
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
                2025
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

        {/* Right column */}
        <div className="lg:col-span-4 space-y-5">
          {/* Quick actions */}
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

          {/* Optional: Recent activity placeholder */}
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-6">
            <p className="text-sm font-extrabold text-zinc-900">
              Recent Activity
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Add latest payments, reminders, or notifications here.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-sm font-semibold text-zinc-900">
                  Payment received
                </p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">
                  Example: Lot 12 paid monthly dues
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 p-4">
                <p className="text-sm font-semibold text-zinc-900">
                  Reminder sent
                </p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">
                  Example: 5 residents notified
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
