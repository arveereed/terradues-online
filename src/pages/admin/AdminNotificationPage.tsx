import { useMemo, useState } from "react";
import { Search, Bell, CheckCheck, X } from "lucide-react";
import AppInput from "../../components/AppInput";

/**
 * ✅ AdminNotificationPage (TerraDues theme) — FIXED (no duplicates)
 * Copy-paste ready ✅
 * - TerraDues green accent
 * - Search
 * - Read/Unread filter
 * - Responsive cards
 *
 * Replace demo data with your Firestore query.
 */

type Notice = {
  id: string;
  title: string; // e.g. "Mr. Brylle U. Milliomeda"
  message: string; // e.g. "pay ₱200 for this monthly dues..."
  createdAtLabel: string; // e.g. "5 hours ago"
  read?: boolean;
};

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter(Boolean).join(" ");

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "T";
  const last = parts[parts.length - 1]?.[0] ?? "D";
  return (first + last).toUpperCase();
}

export default function AdminNotificationPage() {
  // ✅ demo data (replace with your query)
  const notices = useMemo<Notice[]>(
    () => [
      {
        id: "n1",
        title: "Mr. Brylle U. Milliomeda",
        message: "pay ₱200 for this monthly dues in this month of October.",
        createdAtLabel: "5 hours ago",
        read: false,
      },
      {
        id: "n2",
        title: "Mr. John Mark S. Gunday",
        message: "pay ₱200 for this monthly dues in this month of October.",
        createdAtLabel: "5 hours ago",
        read: true,
      },
      {
        id: "n3",
        title: "Mr. Richard C. Cartagena",
        message: "pay ₱200 for this monthly dues in this month of October.",
        createdAtLabel: "5 hours ago",
        read: true,
      },
      {
        id: "n4",
        title: "Mr. Arvee D. Odon",
        message: "pay ₱200 for this monthly dues in this month of October.",
        createdAtLabel: "5 hours ago",
        read: true,
      },
    ],
    [],
  );

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"All" | "Unread" | "Read">("All");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return notices
      .filter((n) => {
        if (filter === "Unread") return !n.read;
        if (filter === "Read") return !!n.read;
        return true;
      })
      .filter((n) => {
        if (!query) return true;
        const hay = [n.title, n.message, n.createdAtLabel]
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      });
  }, [notices, q, filter]);

  const unreadCount = useMemo(
    () => notices.reduce((c, n) => c + (n.read ? 0 : 1), 0),
    [notices],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Updates
          </p>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">
            Notification
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Badge label="Unread" value={String(unreadCount)} />
          <Badge label="Total" value={String(notices.length)} />
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xl">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <AppInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or message..."
                className="h-12 w-full pl-11 pr-23"
              />

              {q.trim() ? (
                <button
                  type="button"
                  className="cursor-pointer absolute right-[46px] top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 active:bg-zinc-100"
                  aria-label="Clear search"
                  onClick={() => setQ("")}
                >
                  <X size={18} />
                </button>
              ) : null}

              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <span className="grid size-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm">
                  <Bell size={18} />
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FilterChip
                active={filter === "All"}
                onClick={() => setFilter("All")}
              >
                All
              </FilterChip>
              <FilterChip
                active={filter === "Unread"}
                onClick={() => setFilter("Unread")}
              >
                Unread
              </FilterChip>
              <FilterChip
                active={filter === "Read"}
                onClick={() => setFilter("Read")}
              >
                Read
              </FilterChip>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-500 lg:justify-end">
            <span>
              Showing <span className="text-zinc-900">{filtered.length}</span>{" "}
              notification{filtered.length === 1 ? "" : "s"}
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              Unread: <span className="text-zinc-900">{unreadCount}</span>
            </span>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-zinc-200">
            {filtered.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 p-4 hover:bg-zinc-50 sm:p-5"
              >
                <AvatarCircle name={n.title} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-zinc-900">
                        {n.title}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-zinc-700">
                        {n.message}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">
                        {n.createdAtLabel}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!n.read ? (
                        <span className="grid size-2 rounded-full bg-emerald-600" />
                      ) : (
                        <span className="grid size-2 rounded-full bg-zinc-300" />
                      )}

                      <span
                        className={cx(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1",
                          n.read
                            ? "bg-zinc-50 text-zinc-800 ring-zinc-200"
                            : "bg-emerald-50 text-emerald-900 ring-emerald-100",
                        )}
                      >
                        <CheckCheck size={14} />
                        {n.read ? "Read" : "Unread"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>Total</span>
            <span className="text-sm font-black text-zinc-900">
              {notices.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI components (TerraDues) ---------------- */

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="text-sm font-extrabold text-zinc-900">{value}</p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "cursor-pointer h-10 rounded-2xl px-3 text-xs font-extrabold transition",
        "ring-1 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white",
        active
          ? "bg-linear-to-r from-emerald-600 to-emerald-700 text-white ring-emerald-600/30 focus:ring-emerald-300"
          : "bg-white text-emerald-900 ring-emerald-200 hover:bg-emerald-50 focus:ring-emerald-200",
      )}
    >
      {children}
    </button>
  );
}

function AvatarCircle({ name }: { name: string }) {
  return (
    <div className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-50 ring-1 ring-emerald-100">
      <span className="text-sm font-black text-emerald-800">
        {initials(name)}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-6">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-sm font-semibold text-zinc-700">
          No notifications found.
        </p>
        <p className="mt-1 text-xs font-medium text-zinc-500">
          Try changing filter or search keyword.
        </p>
      </div>
    </div>
  );
}
