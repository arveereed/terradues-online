import { useEffect, useMemo, useState } from "react";
import {
  ArchiveRestore,
  ClipboardList,
  ArrowLeft,
  Clock3,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppInput from "../../components/AppInput";
import {
  getArchivedResidents,
  restoreArchivedResident,
} from "../../features/auth/services/auth.service";
import type { User } from "../../types";

type ArchivedResident = User & { id: string };

const timestampToDate = (value: unknown): Date | null => {
  if (!value || typeof value !== "object") return null;

  const candidate = value as {
    toDate?: () => Date;
    seconds?: number;
  };

  if (typeof candidate.toDate === "function") {
    return candidate.toDate();
  }

  if (typeof candidate.seconds === "number") {
    return new Date(candidate.seconds * 1000);
  }

  return null;
};

const fullName = (resident: ArchivedResident) =>
  [resident.firstName, resident.middleName, resident.lastName]
    .filter(Boolean)
    .join(" ");

const getDeletionDate = (resident: ArchivedResident): Date | null => {
  const scheduled = timestampToDate(resident.scheduledDeletionAt);
  const archived = timestampToDate(resident.archivedAt);
  if (!archived) return scheduled;
  const fiveYearDate = new Date(archived);
  fiveYearDate.setUTCFullYear(fiveYearDate.getUTCFullYear() + 5);
  return scheduled && scheduled > fiveYearDate ? scheduled : fiveYearDate;
};

const formatTimeRemaining = (deletionDate: Date | null): string => {
  if (!deletionDate || Number.isNaN(deletionDate.getTime()))
    return "Date unavailable";

  const today = new Date();
  const start = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const end = new Date(
    Date.UTC(
      deletionDate.getFullYear(),
      deletionDate.getMonth(),
      deletionDate.getDate(),
    ),
  );
  if (end <= start) return "Scheduled for permanent deletion";

  // Count complete calendar years and months, then the remaining days.
  let cursor = start;
  let years = 0;
  let months = 0;
  const addMonths = (date: Date, count: number) => {
    const target = new Date(date);
    const day = target.getUTCDate();
    target.setUTCDate(1);
    target.setUTCMonth(target.getUTCMonth() + count);
    const lastDay = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
    ).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target;
  };
  while (addMonths(cursor, 12) <= end) {
    cursor = addMonths(cursor, 12);
    years++;
  }
  while (addMonths(cursor, 1) <= end) {
    cursor = addMonths(cursor, 1);
    months++;
  }
  const days = Math.round((end.getTime() - cursor.getTime()) / 86_400_000);
  const parts = [
    years ? `${years} year${years === 1 ? "" : "s"}` : "",
    months ? `${months} month${months === 1 ? "" : "s"}` : "",
    days ? `${days} day${days === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return `${parts.join(", ")} left`;
};

export default function AdminResidentArchivePage() {
  const navigate = useNavigate();

  const [residents, setResidents] = useState<ArchivedResident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [residentToRestore, setResidentToRestore] =
    useState<ArchivedResident | null>(null);

  const loadArchive = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getArchivedResidents();

      setResidents(
        data.filter(
          (user) => user.userType === "Owner" || user.userType === "Renter",
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load archive.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadArchive();
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return residents;

    return residents.filter((resident) =>
      `${fullName(resident)} ${resident.email ?? ""} ${
        resident.block ?? ""
      } ${resident.lot ?? ""} ${resident.phase ?? ""}`
        .toLowerCase()
        .includes(search),
    );
  }, [query, residents]);

  const restore = async (resident: ArchivedResident) => {
    setRestoringId(resident.id);
    setError(null);

    try {
      await restoreArchivedResident(resident.id);

      setResidents((current) =>
        current.filter((item) => item.id !== resident.id),
      );
      setResidentToRestore(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to restore resident.",
      );
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
          >
            <ArrowLeft size={16} />
            Back to residents
          </button>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Residents Directory
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            Resident Archive
          </h1>

          <p className="mt-1 text-sm font-medium text-zinc-500">
            Deleted residents stay here for 5 years before automatic permanent
            deletion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/account-closure-requests")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            <ClipboardList size={17} />
            View Account Closure Requests
          </button>
          <button
            type="button"
            onClick={() => void loadArchive()}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
          />

          <AppInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search archived resident..."
            className="h-12 w-full rounded-xl pl-11"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm font-semibold text-zinc-500">
            Loading archived residents...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="mx-auto text-zinc-300" size={34} />

            <p className="mt-3 font-semibold text-zinc-900">Archive is empty</p>

            <p className="mt-1 text-sm text-zinc-500">
              Residents you delete will appear here for 5 years.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Resident
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Type
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Permanent deletion
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {filtered.map((resident) => {
                  const deletionDate = getDeletionDate(resident);

                  return (
                    <tr key={resident.id}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-zinc-900">
                          {fullName(resident) || "Unnamed resident"}
                        </p>

                        <p className="text-xs text-zinc-500">
                          {resident.email}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-zinc-600">
                        {resident.userType}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                          <Clock3 size={16} />
                          {formatTimeRemaining(deletionDate)}
                        </div>

                        {deletionDate && (
                          <p className="mt-1 text-xs text-zinc-500">
                            {deletionDate.toLocaleDateString()}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setResidentToRestore(resident)}
                          disabled={restoringId === resident.id}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <ArchiveRestore size={16} />

                          {restoringId === resident.id
                            ? "Restoring..."
                            : "Restore"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {residentToRestore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!restoringId) setResidentToRestore(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-resident-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <ArchiveRestore size={23} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
                    Restore Resident
                  </p>
                  <h2
                    id="restore-resident-title"
                    className="mt-1 text-xl font-bold tracking-tight text-zinc-950"
                  >
                    Restore this resident?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    <span className="font-semibold text-zinc-800">
                      {fullName(residentToRestore) || "This resident"}
                    </span>{" "}
                    will be moved back to the active residents list and will no
                    longer be scheduled for permanent deletion.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex gap-3">
                  <Clock3
                    className="mt-0.5 shrink-0 text-emerald-600"
                    size={18}
                  />
                  <p className="text-sm font-medium leading-5 text-emerald-900">
                    The resident's account and existing information will become
                    active again after restoration.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/80 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setResidentToRestore(null)}
                disabled={Boolean(restoringId)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void restore(residentToRestore)}
                disabled={Boolean(restoringId)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArchiveRestore
                  size={17}
                  className={restoringId ? "animate-pulse" : ""}
                />
                {restoringId ? "Restoring..." : "Restore Resident"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
