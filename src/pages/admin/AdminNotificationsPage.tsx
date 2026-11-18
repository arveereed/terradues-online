import { useMemo, useState } from "react";
import {
  BellRing,
  CheckCheck,
  CreditCard,
  Inbox,
  Search,
  X,
} from "lucide-react";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase/firebase";
import {
  useAdminNotifications,
  type AdminNotice,
} from "./useAdminNotifications";

const peso = (value = 0) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    value,
  );

const dateLabel = (value: unknown) => {
  const v = value as { toDate?: () => Date } | string | undefined;
  const date =
    typeof v === "object" && v?.toDate
      ? v.toDate()
      : new Date(typeof v === "string" ? v : "");
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
};

export default function AdminNotificationsPage() {
  const { items, error } = useAdminNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const unread = items.filter((n) => n.unread).length;
  const currentSelected = selected
    ? (items.find((item) => item.id === selected.id) ?? selected)
    : null;
  const visible = useMemo(
    () =>
      items.filter(
        (n) =>
          (filter === "all" || n.unread) &&
          [n.title, n.residentName, n.monthLabel, n.transactionId]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [items, filter, search],
  );

  const markRead = async (n: AdminNotice) => {
    if (!n.unread) return;
    await updateDoc(doc(db, "adminNotifications", n.id), { unread: false });
  };

  const markAll = async () => {
    setBusy(true);
    try {
      const unreadItems = items.filter((n) => n.unread);
      for (let i = 0; i < unreadItems.length; i += 450) {
        const batch = writeBatch(db);
        unreadItems.slice(i, i + 450).forEach((n) =>
          batch.update(doc(db, "adminNotifications", n.id), {
            unread: false,
          }),
        );
        await batch.commit();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not update notifications");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
            <BellRing size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900">
              Notifications
            </h1>
            <p className="text-sm text-zinc-500">
              Successful Pay Now transactions from residents
            </p>
          </div>
        </div>
        <button
          disabled={!unread || busy}
          onClick={markAll}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50"
        >
          <CheckCheck size={17} /> Mark all as read
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Total notifications</p>
          <p className="text-3xl font-bold text-zinc-900">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Unread</p>
          <p className="text-3xl font-bold text-emerald-700">{unread}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  filter === f
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {f === "all" ? "All" : "Unread"}
              </button>
            ))}
          </div>
          <div className="relative min-w-44 flex-1">
            <Search
              className="absolute left-3 top-2.5 text-zinc-400"
              size={18}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications"
              className="w-full rounded-xl border border-zinc-200 py-2 pl-10 pr-3 text-sm outline-emerald-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          Unable to load notifications: {error}. Check Firestore permissions for
          adminNotifications.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {visible.length ? (
          visible.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setSelected(n);
                void markRead(n).catch(console.error);
              }}
              className={`flex w-full items-start gap-4 border-b border-zinc-100 p-5 text-left transition hover:bg-emerald-50/50 ${
                n.unread ? "bg-emerald-50/40" : ""
              }`}
            >
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                <CreditCard size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-zinc-900">
                    {n.title || "Payment received"}
                  </p>
                  {n.unread && (
                    <span className="size-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  {n.residentName || "Resident"} paid{" "}
                  <strong>{peso(n.amount)}</strong> for{" "}
                  {n.monthLabel || n.monthKey} via{" "}
                  {n.paymentMethod || "PayMongo"}.
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  {dateLabel(n.createdAt)}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center gap-3 p-14 text-center text-zinc-500">
            <Inbox size={36} />
            <p>No notifications found.</p>
          </div>
        )}
      </div>

      {currentSelected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Payment notification details"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-zinc-900">
                Payment details
              </h2>
              <button onClick={() => setSelected(null)} aria-label="Close">
                <X />
              </button>
            </div>
            <div className="mt-5 rounded-2xl bg-emerald-50 p-5">
              <p className="text-sm text-emerald-800">Payment received</p>
              <p className="text-3xl font-extrabold text-emerald-700">
                {peso(currentSelected.amount)}
              </p>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              {(
                [
                  ["Resident", currentSelected.residentName || "Resident"],
                  [
                    "Billing month",
                    currentSelected.monthLabel || currentSelected.monthKey,
                  ],
                  ["Payment method", currentSelected.paymentMethod],
                  [
                    "Payment date",
                    currentSelected.paymentDate ||
                      dateLabel(currentSelected.createdAt),
                  ],
                  ["Transaction ID", currentSelected.transactionId],
                ] as [string, string | undefined][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b border-zinc-100 pb-3"
                >
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="break-all text-right font-semibold text-zinc-800">
                    {value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
            <button
              onClick={() => setSelected(null)}
              className="mt-6 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
