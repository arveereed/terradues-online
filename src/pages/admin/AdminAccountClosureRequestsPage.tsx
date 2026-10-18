import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Archive, ClipboardList, ShieldAlert, X, XCircle } from "lucide-react";
import { db } from "../../lib/firebase/firebase";
import { archiveResident } from "../../features/auth/services/auth.service";

type ClosureRequest = {
  id: string;
  residentId: string;
  clerkUserId?: string;
  reason?: string;
  status?: string;
  createdAt?: { toDate: () => Date };
  adminReason?: string;
};

export default function AdminAccountClosureRequestsPage() {
  const [requests, setRequests] = useState<ClosureRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    item: ClosureRequest;
    action: "approve" | "deny";
  } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(
      query(
        collection(db, "accountDeletionRequests"),
        orderBy("createdAt", "desc"),
      ),
      (snapshot) => {
        setRequests(
          snapshot.docs.map(
            (entry) => ({ id: entry.id, ...entry.data() }) as ClosureRequest,
          ),
        );
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
  }, []);

  function openDecision(item: ClosureRequest, action: "approve" | "deny") {
    if (busy || item.status !== "pending") return;
    setNote("");
    setError("");
    setSelected({ item, action });
  }

  async function confirmDecision() {
    if (!selected || busy || (selected.action === "deny" && !note.trim()))
      return;
    const { item, action } = selected;
    setBusy(item.id);
    setError("");
    try {
      if (action === "approve") await archiveResident(item.residentId);
      await updateDoc(doc(db, "accountDeletionRequests", item.id), {
        status: action === "approve" ? "approved" : "denied",
        adminReason: action === "deny" ? note.trim() : "",
        reviewedAt: serverTimestamp(),
      });
      setSelected(null);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update request.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ClipboardList size={14} /> Resident management
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Account Closure Requests
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review resident requests before archiving their records for five
            years.
          </p>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-bold text-zinc-900">Resident requests</h2>
          <p className="text-xs text-zinc-500">
            Review each request carefully before taking action.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                {[
                  "Resident ID",
                  "Reason",
                  "Requested",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {requests.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/70">
                  <td className="max-w-[170px] break-all px-5 py-4 font-medium text-zinc-800">
                    {item.residentId}
                  </td>
                  <td className="max-w-[280px] break-words px-5 py-4 text-zinc-600">
                    {item.reason || (
                      <span className="italic text-zinc-400">
                        No reason provided
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                    {item.createdAt?.toDate?.().toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }) || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${item.status === "pending" ? "bg-amber-50 text-amber-700" : item.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                    >
                      {item.status || "pending"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {item.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => openDecision(item, "approve")}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          <Archive size={14} /> Approve & archive
                        </button>
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => openDecision(item, "deny")}
                          className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Deny
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && requests.length === 0 && (
            <div className="px-6 py-16 text-center">
              <ClipboardList className="mx-auto mb-3 text-zinc-300" size={36} />
              <p className="font-semibold text-zinc-700">
                No account closure requests
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Resident requests will appear here.
              </p>
            </div>
          )}
          {loading && (
            <p className="p-8 text-center text-sm text-zinc-500">
              Loading requests…
            </p>
          )}
        </div>
      </div>
      <p className="flex items-start gap-2 text-xs text-amber-800">
        <ShieldAlert size={16} className="shrink-0" /> Approving archives the
        Firestore resident record. Disabling Clerk sign-in and revoking sessions
        still require a protected backend; restrict approval writes to admins.
      </p>
      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setSelected(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="closure-decision-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-2xl"
          >
            <div
              className={`flex items-start justify-between border-b px-6 py-5 ${selected.action === "approve" ? "border-emerald-100 bg-emerald-50/70" : "border-rose-100 bg-rose-50/70"}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-2xl p-3 ${selected.action === "approve" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                >
                  {selected.action === "approve" ? (
                    <Archive size={22} />
                  ) : (
                    <XCircle size={22} />
                  )}
                </span>
                <div>
                  <h2
                    id="closure-decision-title"
                    className="text-lg font-bold text-zinc-900"
                  >
                    {selected.action === "approve"
                      ? "Approve account closure?"
                      : "Deny account closure?"}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Resident: {selected.item.residentId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={!!busy}
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-white"
              >
                <X size={19} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm leading-relaxed text-zinc-600">
                {selected.action === "approve"
                  ? "This will archive the resident record under the five-year retention policy. Check that you selected the correct resident before proceeding."
                  : "The resident's account will remain active. Provide a reason for your decision."}
              </p>
              {selected.action === "deny" && (
                <div>
                  <label
                    htmlFor="closure-denial-reason"
                    className="mb-2 block text-sm font-semibold text-zinc-800"
                  >
                    Reason for denial <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    id="closure-denial-reason"
                    rows={4}
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Explain why this request was denied…"
                    className="w-full resize-none rounded-xl border border-zinc-300 p-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
                >
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    !!busy || (selected.action === "deny" && !note.trim())
                  }
                  onClick={() => void confirmDecision()}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${selected.action === "approve" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-rose-700 hover:bg-rose-800"}`}
                >
                  {busy
                    ? "Processing…"
                    : selected.action === "approve"
                      ? "Confirm & archive"
                      : "Deny request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
