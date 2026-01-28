import { useMemo, useState } from "react";
import AppShell from "../../components/AppShell";

type PaymentStatus = "Paid" | "Unpaid";

type PaymentItem = {
  dateLabel: string;
  status: PaymentStatus;
  amount: number;
};

type Props = {
  userName?: string;
  blkLot?: string;

  totalMonthlyDuePaid?: number;
  unpaidBalance?: number;

  upcomingPaymentDate?: string;
  lastPaymentDate?: string;

  history?: PaymentItem[];

  isLoggingOut?: boolean;
  onLogout?: () => void;

  onOpenItem?: (item: PaymentItem) => void;
};

const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  })
    .format(n)
    .replace(".00", "");

/** ✅ Modern pagination helper: returns [1, 2, "...", 8, 9] style array */
function getPaginationRange(opts: {
  currentPage: number;
  totalPages: number;
  siblingCount?: number;
}) {
  const { currentPage, totalPages, siblingCount = 1 } = opts;

  const totalNumbers = siblingCount * 2 + 5; // first + last + current + siblings + 2 dots
  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftDots = leftSiblingIndex > 2;
  const showRightDots = rightSiblingIndex < totalPages - 1;

  const firstPageIndex = 1;
  const lastPageIndex = totalPages;

  if (!showLeftDots && showRightDots) {
    // 1 2 3 4 5 ... last
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "...", lastPageIndex];
  }

  if (showLeftDots && !showRightDots) {
    // 1 ... 6 7 8 9 10
    const rightItemCount = 3 + 2 * siblingCount;
    const start = totalPages - rightItemCount + 1;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => start + i,
    );
    return [firstPageIndex, "...", ...rightRange];
  }

  // 1 ... 4 5 6 ... last
  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i,
  );
  return [firstPageIndex, "...", ...middleRange, "...", lastPageIndex];
}

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
};

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const range = useMemo(
    () =>
      getPaginationRange({ currentPage: page, totalPages, siblingCount: 1 }),
    [page, totalPages],
  );

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      {/* Mobile pagination */}
      <div className="flex w-full items-center justify-between gap-3 lg:hidden">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>

        <div className="text-xs font-semibold text-zinc-600">
          Page <span className="text-zinc-900">{page}</span> of{" "}
          <span className="text-zinc-900">{totalPages}</span>
        </div>

        <button
          type="button"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Desktop pagination */}
      <div className="hidden w-full items-center justify-between lg:flex">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>

        <div className="flex items-center gap-2">
          {range.map((item, idx) => {
            if (item === "...") {
              return (
                <span
                  key={`dots-${idx}`}
                  className="px-2 text-sm text-zinc-500"
                >
                  ...
                </span>
              );
            }

            const p = item as number;
            const active = p === page;

            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`cursor-pointer min-w-10 rounded-xl px-3 py-2 text-sm font-semibold shadow-sm transition ${
                  active
                    ? "bg-emerald-600 text-white"
                    : "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function PaymentHistory({
  userName = "Brylle U. Milliomeda",
  blkLot = "Blk 4 Lot 54 Phase 2",
  totalMonthlyDuePaid = 5356,
  unpaidBalance = 1257,
  upcomingPaymentDate = "April 20, 2025, Sun",
  lastPaymentDate = "March 20, 2025, Thu",
  history = [
    { dateLabel: "Apr 20, 2025, Sun", status: "Unpaid", amount: 300 },
    { dateLabel: "Mar 20, 2025, Thu", status: "Paid", amount: 300 },
    { dateLabel: "Feb 20, 2025, Sun", status: "Paid", amount: 300 },
    { dateLabel: "Jan 20, 2025, Mon", status: "Paid", amount: 300 },
    { dateLabel: "Dec 20, 2024, Fri", status: "Paid", amount: 300 },
    { dateLabel: "Nov 20, 2024, Wed", status: "Unpaid", amount: 300 },
    { dateLabel: "Oct 20, 2024, Sun", status: "Unpaid", amount: 300 },
    { dateLabel: "Sep 20, 2024, Fri", status: "Unpaid", amount: 300 },
  ],
  isLoggingOut,
  onLogout,
}: Props) {
  // ✅ pagination state
  const [page, setPage] = useState(1);
  const pageSize = 6; // adjust
  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));

  const pagedHistory = useMemo(() => {
    const start = (page - 1) * pageSize;
    return history.slice(start, start + pageSize);
  }, [history, page]);

  // If history length changes, keep page in range
  if (page > totalPages) setPage(totalPages);

  return (
    <AppShell
      userName={userName}
      onLogout={onLogout}
      isLoggingOut={isLoggingOut}
    >
      {/* Greeting / Profile strip */}
      <section className="rounded-3xl bg-emerald-700 p-5 text-white shadow-sm ring-1 ring-emerald-600/30 sm:p-7">
        <p className="text-xs text-emerald-50/90">Good Day!</p>
        <p className="mt-1 text-lg font-extrabold tracking-tight sm:text-xl">
          {userName}
        </p>
        <p className="mt-1 text-xs text-emerald-50/80">{blkLot}</p>
      </section>

      {/* Summary cards */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-6">
          <p className="text-xs font-semibold text-zinc-500">
            Total Monthly Due Paid:
          </p>
          <p className="mt-2 text-2xl font-extrabold text-zinc-900">
            {peso(totalMonthlyDuePaid)}
          </p>

          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-900">
              Upcoming Payment
            </p>
            <p className="mt-1 text-sm text-emerald-900/80">
              {upcomingPaymentDate}
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-6">
          <p className="text-xs font-semibold text-zinc-500">Unpaid Balance:</p>
          <p className="mt-2 text-2xl font-extrabold text-zinc-900">
            {peso(unpaidBalance)}
          </p>

          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-900">
              Last Payment
            </p>
            <p className="mt-1 text-sm text-emerald-900/80">
              {lastPaymentDate}
            </p>
          </div>
        </div>
      </section>

      {/* History */}
      <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-7">
        <div>
          <h2 className="text-lg font-extrabold text-zinc-900">
            Payment History
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Track your dues and verification status.
          </p>
        </div>

        {/* Mobile list */}
        <div className="mt-5 space-y-3 lg:hidden">
          {pagedHistory.map((item, idx) => {
            const statusClass =
              item.status === "Paid" ? "text-emerald-700" : "text-red-600";

            return (
              <div
                key={`${item.dateLabel}-${idx}`}
                className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3"
              >
                <div className="min-w-[140px]">
                  <p className="text-xs font-bold text-zinc-900">
                    {item.dateLabel}
                  </p>
                </div>

                <div className={`text-xs font-extrabold ${statusClass}`}>
                  {item.status}
                </div>

                <div className="ml-auto">
                  <p className="text-sm font-extrabold text-zinc-900">
                    {peso(item.amount)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="mt-6 hidden lg:block">
          <div className="overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full border-collapse bg-white">
              <thead className="bg-zinc-50">
                <tr className="text-left text-xs font-semibold text-zinc-600">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pagedHistory.map((item, idx) => {
                  const statusPill =
                    item.status === "Paid"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                      : "bg-red-50 text-red-700 border-red-100";

                  return (
                    <tr
                      key={`${item.dateLabel}-${idx}`}
                      className="border-t border-zinc-100"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-zinc-900">
                        {item.dateLabel}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold ${statusPill}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-extrabold text-zinc-900">
                        {peso(item.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ✅ Pagination (responsive mobile + desktop) */}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>

      <div className="h-10" />
    </AppShell>
  );
}
