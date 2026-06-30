import { useUser } from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
import { useFirestoreUser } from "../../features/auth/hooks/useFirestoreUser";

type PaymentStatus = "Paid" | "Unpaid";

type PaymentItem = {
  dateLabel: string;
  status: PaymentStatus;
  amount: number;
  sortDate: number;
};

type FirestorePaymentRow = {
  dateLabel?: string;
  datePaid?: string;
  paymentDate?: string;
  dueDate?: string;
  monthLabel?: string;
  month?: string;
  monthKey?: string;
  status?: string;
  amount?: number | string;
  collection?: number | string;
  paid?: number | string;
  payment?: number | string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type Props = {
  isLoggingOut?: boolean;
  onLogout?: () => void;
  onOpenItem?: (item: PaymentItem) => void;
};

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
};

const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  })
    .format(n)
    .replace(".00", "");

const toNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const toMillis = (value: unknown) => {
  if (!value) return 0;

  if (typeof value === "object" && "toMillis" in value) {
    const maybeTimestamp = value as { toMillis?: () => number };
    return typeof maybeTimestamp.toMillis === "function"
      ? maybeTimestamp.toMillis()
      : 0;
  }

  if (typeof value === "object" && "seconds" in value) {
    const maybeTimestamp = value as { seconds?: number };
    return typeof maybeTimestamp.seconds === "number"
      ? maybeTimestamp.seconds * 1000
      : 0;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

const formatDateLabel = (value: unknown) => {
  const millis = toMillis(value);

  if (!millis) return "";

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    weekday: "short",
  }).format(new Date(millis));
};

const normalizeStatus = (value: unknown, amount: number): PaymentStatus => {
  const status = clean(value).toLowerCase();

  if (status === "paid") return "Paid";
  if (status === "unpaid" || status === "not paid") return "Unpaid";

  return amount > 0 ? "Paid" : "Unpaid";
};

const getPaymentHistoryFromUser = (user: unknown): PaymentItem[] => {
  const data = user as {
    paymentHistory?: FirestorePaymentRow[];
    payments?: FirestorePaymentRow[];
  };

  const rawHistory = Array.isArray(data?.paymentHistory)
    ? data.paymentHistory
    : Array.isArray(data?.payments)
      ? data.payments
      : [];

  return rawHistory
    .map((item) => {
      const amount = toNumber(
        item.amount ?? item.collection ?? item.paid ?? item.payment,
        0,
      );

      const status = normalizeStatus(item.status, amount);

      const dateLabel =
        clean(item.dateLabel) ||
        clean(item.datePaid) ||
        clean(item.paymentDate) ||
        clean(item.dueDate) ||
        clean(item.monthLabel) ||
        clean(item.month) ||
        clean(item.monthKey) ||
        formatDateLabel(item.updatedAt) ||
        formatDateLabel(item.createdAt) ||
        "No date";

      const sortDate =
        toMillis(item.datePaid) ||
        toMillis(item.paymentDate) ||
        toMillis(item.dueDate) ||
        toMillis(item.updatedAt) ||
        toMillis(item.createdAt);

      return {
        dateLabel,
        status,
        amount,
        sortDate,
      };
    })
    .sort((a, b) => b.sortDate - a.sortDate);
};

function getPaginationRange(opts: {
  currentPage: number;
  totalPages: number;
  siblingCount?: number;
}) {
  const { currentPage, totalPages, siblingCount = 1 } = opts;

  const totalNumbers = siblingCount * 2 + 5;
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
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "...", lastPageIndex];
  }

  if (showLeftDots && !showRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const start = totalPages - rightItemCount + 1;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => start + i,
    );
    return [firstPageIndex, "...", ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i,
  );
  return [firstPageIndex, "...", ...middleRange, "...", lastPageIndex];
}

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

export default function PaymentHistory({}: Props) {
  const { user: clerkUser, isLoaded } = useUser();
  const { data: user, isLoading, error } = useFirestoreUser(clerkUser?.id);

  const history = useMemo(() => getPaymentHistoryFromUser(user), [user]);

  const totalMonthlyDuePaid = useMemo(
    () =>
      history
        .filter((item) => item.status === "Paid")
        .reduce((sum, item) => sum + item.amount, 0),
    [history],
  );

  const unpaidBalance = useMemo(
    () =>
      history
        .filter((item) => item.status === "Unpaid")
        .reduce((sum, item) => sum + item.amount, 0),
    [history],
  );

  const upcomingPaymentDate =
    history.find((item) => item.status === "Unpaid")?.dateLabel ||
    "No upcoming payment";

  const lastPaymentDate =
    history.find((item) => item.status === "Paid")?.dateLabel ||
    "No payment yet";

  const [page, setPage] = useState(1);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));

  const pagedHistory = useMemo(() => {
    const start = (page - 1) * pageSize;
    return history.slice(start, start + pageSize);
  }, [history, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const loading = !isLoaded || isLoading;

  return (
    <div>
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            Failed to load payment history.
          </p>
        </div>
      ) : null}

      <section className="rounded-3xl bg-emerald-700 p-5 text-white shadow-sm ring-1 ring-emerald-600/30 sm:p-7">
        <p className="text-xs text-emerald-50/90">Good Day!</p>
        <p className="mt-1 text-lg font-extrabold tracking-tight sm:text-xl">
          {loading ? "Loading..." : user?.fullName || "Resident"}
        </p>
        <p className="mt-1 text-xs text-emerald-50/80">
          {loading ? "Loading address..." : user?.address || "No address found"}
        </p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-6">
          <p className="text-xs font-semibold text-zinc-500">
            Total Monthly Due Paid:
          </p>
          <p className="mt-2 text-2xl font-extrabold text-zinc-900">
            {loading ? "..." : peso(totalMonthlyDuePaid)}
          </p>

          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-900">
              Upcoming Payment
            </p>
            <p className="mt-1 text-sm text-emerald-900/80">
              {loading ? "Loading..." : upcomingPaymentDate}
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-6">
          <p className="text-xs font-semibold text-zinc-500">Unpaid Balance:</p>
          <p className="mt-2 text-2xl font-extrabold text-zinc-900">
            {loading ? "..." : peso(unpaidBalance)}
          </p>

          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-900">
              Last Payment
            </p>
            <p className="mt-1 text-sm text-emerald-900/80">
              {loading ? "Loading..." : lastPaymentDate}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-7">
        <div>
          <h2 className="text-lg font-extrabold text-zinc-900">
            Payment History
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Track your dues and verification status.
          </p>
        </div>

        <div className="mt-5 space-y-3 lg:hidden">
          {loading ? (
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-500">
                Loading payment history...
              </p>
            </div>
          ) : pagedHistory.length > 0 ? (
            pagedHistory.map((item, idx) => {
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
            })
          ) : (
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-500">
                No payment history found.
              </p>
            </div>
          )}
        </div>

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
                {loading ? (
                  <tr className="border-t border-zinc-100">
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-sm font-semibold text-zinc-500"
                    >
                      Loading payment history...
                    </td>
                  </tr>
                ) : pagedHistory.length > 0 ? (
                  pagedHistory.map((item, idx) => {
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
                  })
                ) : (
                  <tr className="border-t border-zinc-100">
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-sm font-semibold text-zinc-500"
                    >
                      No payment history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>

      <div className="h-10" />
    </div>
  );
}
