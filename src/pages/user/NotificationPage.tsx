import AppShell from "../../components/AppShell";
import { Clock, Dot } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string; // e.g. "Mr. Brylle U. Milliomeda"
  message: string; // e.g. "You have upcoming payment on..."
  time: string; // e.g. "5 hours ago"
  unread?: boolean;
};

type Props = {
  userName?: string;
  isLoggingOut?: boolean;
  onLogout?: () => void;

  notifications?: NotificationItem[];
};

export default function NotificationPage({
  userName = "Brylle",
  isLoggingOut,
  onLogout,
  notifications = [
    {
      id: "1",
      title: "Mr. Brylle U. Milliomeda",
      message:
        "You have upcoming payment on April 20, 2025. Be sure to make payment on time!",
      time: "5 hours ago",
      unread: true,
    },
    {
      id: "2",
      title: "Mr. Brylle U. Milliomeda",
      message:
        "You have upcoming payment on April 20, 2025. Be sure to make payment on time!",
      time: "5 hours ago",
      unread: true,
    },
    {
      id: "3",
      title: "Mr. Brylle U. Milliomeda",
      message:
        "You have upcoming payment on April 20, 2025. Be sure to make payment on time!",
      time: "5 hours ago",
      unread: false,
    },
    {
      id: "4",
      title: "Mr. Brylle U. Milliomeda",
      message:
        "You have upcoming payment on April 20, 2025. Be sure to make payment on time!",
      time: "5 hours ago",
      unread: false,
    },
    {
      id: "5",
      title: "Mr. Brylle U. Milliomeda",
      message:
        "You have upcoming payment on April 20, 2025. Be sure to make payment on time!",
      time: "5 hours ago",
      unread: false,
    },
  ],
}: Props) {
  return (
    <AppShell
      userName={userName}
      onLogout={onLogout}
      isLoggingOut={isLoggingOut}
    >
      {/* Page header */}
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-zinc-500">TERRADUES</p>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Stay updated with payment reminders and announcements.
            </p>
          </div>

          {/* Unread count pill */}
          <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
            {notifications.filter((n) => n.unread).length} Unread
          </div>
        </div>
      </section>

      {/* Notifications list */}
      <section className="mt-6 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 sm:p-5">
        <div className="space-y-2">
          {notifications.map((n) => {
            const initial = (n.title?.trim()?.[0] || "T").toUpperCase();

            return (
              <div
                key={n.id}
                className={`flex gap-3 rounded-2xl border px-4 py-4 transition hover:bg-zinc-50 ${
                  n.unread
                    ? "border-emerald-100 bg-emerald-50/60"
                    : "border-zinc-100 bg-white"
                }`}
              >
                {/* Avatar */}
                <div className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-full bg-emerald-700 text-white shadow-sm">
                  <span className="text-sm font-extrabold">{initial}</span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-extrabold text-zinc-900">
                      {n.title}
                    </p>

                    {/* Unread dot */}
                    {n.unread ? (
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

                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                    {n.message}
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                    <Clock size={14} />
                    <span>{n.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {notifications.length === 0 && (
          <div className="grid place-items-center py-14 text-center">
            <div className="max-w-sm">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Dot size={32} />
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
    </AppShell>
  );
}
