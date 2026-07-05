import { useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Clock, Dot, Inbox, RefreshCw } from "lucide-react";
import { useFirestoreUser } from "../../features/auth/hooks/useFirestoreUser";
import { getNotificationsByResidentId } from "../../features/auth/services/auth.service";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type?: string;
  monthKey?: string;
  monthLabel?: string;
  amount?: number;
  unread?: boolean;
  createdAt?: unknown;
};

type Props = {
  userName?: string;
  isLoggingOut?: boolean;
  onLogout?: () => void;
};

const peso = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);

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

const formatNotificationTime = (value: unknown) => {
  const millis = toMillis(value);

  if (!millis) return "Just now";

  const diff = Date.now() - millis;
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < minute) return "Just now";
  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }

  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }

  if (diff < day * 7) {
    const days = Math.floor(diff / day);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(millis));
};

export default function NotificationPage({}: Props) {
  const { user: clerkUser, isLoaded } = useUser();
  const {
    data: firestoreUser,
    isLoading: isUserLoading,
    error: userError,
  } = useFirestoreUser(clerkUser?.id);

  const residentId = firestoreUser?.id;

  const {
    data: notifications = [],
    isLoading: isNotificationsLoading,
    error: notificationsError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["resident-notifications", residentId],
    queryFn: () => getNotificationsByResidentId(residentId),
    enabled: !!residentId,
    staleTime: 1000 * 60,
  });

  const loading = !isLoaded || isUserLoading || isNotificationsLoading;
  const error = userError || notificationsError;

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.unread).length,
    [notifications],
  );

  return (
    <div>
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500">TERRADUES</p>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Stay updated with payment reminders and announcements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
              {loading ? "..." : unreadCount} Unread
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={loading || isRefetching}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-xs font-extrabold text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={isRefetching ? "animate-spin" : ""}
              />
              {isRefetching ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
        {error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
            <div className="flex gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-700">
                <AlertCircle size={22} />
              </div>

              <div>
                <p className="text-sm font-extrabold text-rose-900">
                  Failed to load notifications
                </p>
                <p className="mt-1 text-sm text-rose-700">
                  Please refresh the page or try again later.
                </p>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4"
              >
                <div className="size-11 animate-pulse rounded-full bg-zinc-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded-full bg-zinc-200" />
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-zinc-200" />
                  <div className="h-3 w-1/4 animate-pulse rounded-full bg-zinc-200" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification: NotificationItem) => {
              const initial = (
                notification.title?.trim()?.[0] || "T"
              ).toUpperCase();

              const amountText =
                typeof notification.amount === "number"
                  ? peso(notification.amount)
                  : null;

              return (
                <article
                  key={notification.id}
                  className={`flex gap-3 rounded-2xl border px-4 py-4 transition hover:bg-zinc-50 ${
                    notification.unread
                      ? "border-emerald-100 bg-emerald-50/60"
                      : "border-zinc-100 bg-white"
                  }`}
                >
                  <div className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-full bg-emerald-700 text-white shadow-sm">
                    <span className="text-sm font-extrabold">{initial}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-zinc-900">
                          {notification.title}
                        </p>

                        {notification.monthLabel || amountText ? (
                          <div className="mt-1 flex flex-wrap gap-2">
                            {notification.monthLabel ? (
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-600 ring-1 ring-zinc-200">
                                {notification.monthLabel}
                              </span>
                            ) : null}

                            {amountText ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                                {amountText}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {notification.unread ? (
                        <span
                          className="mt-1 inline-flex items-center text-emerald-700"
                          title="Unread"
                          aria-label="Unread"
                        >
                          <Dot size={26} />
                        </span>
                      ) : (
                        <span className="mt-1 inline-flex items-center text-zinc-300">
                          <Dot size={26} />
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                      {notification.message}
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-zinc-500">
                      <Clock size={14} />
                      <span>
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid place-items-center py-14 text-center">
            <div className="max-w-sm">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Inbox size={28} />
              </div>
              <h3 className="mt-4 text-base font-extrabold text-zinc-900">
                No notifications yet
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                When there’s a reminder or announcement, it will appear here.
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="h-10" />
    </div>
  );
}
