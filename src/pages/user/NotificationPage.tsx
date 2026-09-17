import { useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Inbox,
  ReceiptText,
  RefreshCw,
  WalletCards,
  X,
} from "lucide-react";
import { useFirestoreUser } from "../../features/auth/hooks/useFirestoreUser";
import {
  getNotificationsByResidentId,
  markNotificationAsRead,
} from "../../features/auth/services/auth.service";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type?: "payment_reminder" | "unpaid_balance" | string;
  monthKey?: string;
  monthLabel?: string;
  amount?: number;
  beginningBalance?: number;
  currentCharges?: number;
  totalDue?: number;
  collection?: number;
  remainingBalance?: number;
  unread?: boolean;
  createdAt?: unknown;
};

type Props = {
  userName?: string;
  isLoggingOut?: boolean;
  onLogout?: () => void;
};

const peso = (amount = 0) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);

const toMillis = (value: unknown) => {
  if (!value) return 0;
  if (typeof value === "object" && "toMillis" in value) {
    const timestamp = value as { toMillis?: () => number };
    return typeof timestamp.toMillis === "function" ? timestamp.toMillis() : 0;
  }
  if (typeof value === "object" && "seconds" in value) {
    const timestamp = value as { seconds?: number };
    return typeof timestamp.seconds === "number" ? timestamp.seconds * 1000 : 0;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatNotificationTime = (value: unknown) => {
  const millis = toMillis(value);
  if (!millis) return "Just now";
  const diff = Date.now() - millis;
  const minute = 60_000;
  const hour = minute * 60;
  const day = hour * 24;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hr ago`;
  if (diff < day * 7)
    return `${Math.floor(diff / day)} day${Math.floor(diff / day) > 1 ? "s" : ""} ago`;
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(millis));
};

const getBilling = (notification: NotificationItem) => {
  const totalDue = notification.totalDue ?? notification.amount ?? 0;
  const beginningBalance = notification.beginningBalance ?? 0;
  const currentCharges =
    notification.currentCharges ?? Math.max(totalDue - beginningBalance, 0);
  const collection = notification.collection ?? 0;
  const remainingBalance =
    notification.remainingBalance ?? Math.max(totalDue - collection, 0);
  return {
    totalDue,
    beginningBalance,
    currentCharges,
    collection,
    remainingBalance,
  };
};

export default function NotificationPage({}: Props) {
  const { user: clerkUser, isLoaded } = useUser();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<NotificationItem | null>(null);

  const {
    data: firestoreUser,
    isLoading: isUserLoading,
    error: userError,
  } = useFirestoreUser(clerkUser?.id);

  const residentId = firestoreUser?.id;
  const queryKey = ["resident-notifications", residentId];

  const {
    data: notifications = [],
    isLoading: isNotificationsLoading,
    error: notificationsError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey,
    queryFn: () => getNotificationsByResidentId(residentId),
    enabled: !!residentId,
    staleTime: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const loading = !isLoaded || isUserLoading || isNotificationsLoading;
  const error = userError || notificationsError;
  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications],
  );

  const openNotification = (notification: NotificationItem) => {
    setSelected(notification);
    if (notification.unread && !markReadMutation.isPending) {
      markReadMutation.mutate(notification.id);
    }
  };

  return (
    <div className="pb-10">
      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white shadow-sm">
                <BellRing size={23} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                  TERRADUES
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">
                  Notifications
                </h1>
                <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500">
                  Payment reminders, unpaid balances, and a clear breakdown of
                  your monthly dues.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-800">
                {loading ? "..." : unreadCount} New
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={loading || isRefetching}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-xs font-extrabold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={15}
                  className={isRefetching ? "animate-spin" : ""}
                />
                {isRefetching ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-5">
        {error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
            <div className="flex gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-700">
                <AlertCircle size={22} />
              </div>
              <div>
                <p className="font-extrabold text-rose-900">
                  Failed to load notifications
                </p>
                <p className="mt-1 text-sm text-rose-700">
                  Please refresh the page and try again.
                </p>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex gap-4 rounded-2xl border border-zinc-100 p-4"
              >
                <div className="size-12 animate-pulse rounded-2xl bg-zinc-200" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-zinc-200" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length ? (
          <div className="space-y-3">
            {notifications.map((notification: NotificationItem) => {
              const billing = getBilling(notification);
              const overdue =
                notification.type === "unpaid_balance" ||
                billing.beginningBalance > 0;
              return (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => openNotification(notification)}
                  className={`group w-full rounded-2xl border p-4 text-left transition sm:p-5 ${notification.unread ? "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
                >
                  <div className="flex gap-3 sm:gap-4">
                    <div
                      className={`grid size-12 shrink-0 place-items-center rounded-2xl ${overdue ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      {overdue ? (
                        <WalletCards size={22} />
                      ) : (
                        <ReceiptText size={22} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-extrabold text-zinc-900">
                              {notification.title}
                            </h2>
                            {notification.unread && (
                              <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600">
                            {notification.message}
                          </p>
                        </div>
                        <ChevronRight
                          size={19}
                          className="mt-1 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5"
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {notification.monthLabel && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-600 ring-1 ring-zinc-200">
                            <CalendarDays size={12} />
                            {notification.monthLabel}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${overdue ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
                        >
                          Due: {peso(billing.totalDue)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500">
                          <Clock size={12} />
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid place-items-center py-16 text-center">
            <div className="max-w-sm">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Inbox size={28} />
              </div>
              <h3 className="mt-4 font-extrabold text-zinc-900">
                You're all caught up
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                New payment reminders and billing updates will appear here.
              </p>
            </div>
          </div>
        )}
      </section>

      {selected &&
        (() => {
          const billing = getBilling(selected);
          const hasCarryOver = billing.beginningBalance > 0;
          return (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5"
              onMouseDown={(event) =>
                event.target === event.currentTarget && setSelected(null)
              }
            >
              <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Payment notification
                    </p>
                    <h2 className="mt-0.5 text-lg font-black text-zinc-900">
                      Full Details
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="grid size-10 place-items-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
                    aria-label="Close"
                  >
                    <X size={19} />
                  </button>
                </div>

                <div className="p-5 sm:p-6">
                  <div
                    className={`rounded-3xl p-5 ${hasCarryOver ? "bg-amber-50 ring-1 ring-amber-100" : "bg-emerald-50 ring-1 ring-emerald-100"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`grid size-11 shrink-0 place-items-center rounded-2xl ${hasCarryOver ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                      >
                        {hasCarryOver ? (
                          <AlertCircle size={21} />
                        ) : (
                          <CheckCircle2 size={21} />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-zinc-900">
                          {selected.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-zinc-600">
                          {selected.message}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-zinc-200 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                          Total amount due
                        </p>
                        <p className="mt-1 text-3xl font-black tracking-tight text-zinc-900">
                          {peso(billing.totalDue)}
                        </p>
                      </div>
                      <ReceiptText size={30} className="text-emerald-700" />
                    </div>
                    {selected.monthLabel && (
                      <p className="mt-2 text-sm font-semibold text-zinc-500">
                        Billing month: {selected.monthLabel}
                      </p>
                    )}
                  </div>

                  <div className="mt-5">
                    <h3 className="text-sm font-black text-zinc-900">
                      Payment breakdown
                    </h3>
                    <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200">
                      <div className="flex justify-between gap-4 border-b border-zinc-100 px-4 py-3 text-sm">
                        <span className="text-zinc-600">
                          Previous unpaid balance
                        </span>
                        <strong
                          className={
                            hasCarryOver ? "text-amber-700" : "text-zinc-900"
                          }
                        >
                          {peso(billing.beginningBalance)}
                        </strong>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-zinc-100 px-4 py-3 text-sm">
                        <span className="text-zinc-600">
                          Current monthly charge
                        </span>
                        <strong className="text-zinc-900">
                          {peso(billing.currentCharges)}
                        </strong>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-sm">
                        <span className="font-bold text-zinc-700">
                          Total due
                        </span>
                        <strong className="text-zinc-900">
                          {peso(billing.totalDue)}
                        </strong>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-zinc-100 px-4 py-3 text-sm">
                        <span className="text-zinc-600">Paid / Collection</span>
                        <strong className="text-emerald-700">
                          {peso(billing.collection)}
                        </strong>
                      </div>
                      <div className="flex justify-between gap-4 px-4 py-3 text-sm">
                        <span className="font-bold text-zinc-700">
                          Remaining balance
                        </span>
                        <strong className="text-rose-700">
                          {peso(billing.remainingBalance)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
                    <h3 className="flex items-center gap-2 text-sm font-black text-zinc-900">
                      <WalletCards size={17} />
                      Why do I have to pay this amount?
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {hasCarryOver
                        ? `You have ${peso(billing.beginningBalance)} remaining from a previous month. That unpaid amount was carried forward and added to your current ${peso(billing.currentCharges)} monthly charge, making your total due ${peso(billing.totalDue)}.`
                        : `There is no unpaid balance carried over from a previous month. Your ${peso(billing.totalDue)} total due is your current monthly charge for ${selected.monthLabel ?? "this billing period"}.`}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-zinc-500">
                    <Clock size={14} />
                    Received {formatNotificationTime(selected.createdAt)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="mt-6 h-12 w-full rounded-2xl bg-emerald-700 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
