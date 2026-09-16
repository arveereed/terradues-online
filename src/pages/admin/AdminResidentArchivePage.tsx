import { useEffect, useMemo, useState } from "react";
import {
  ArchiveRestore,
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

const daysRemaining = (resident: ArchivedResident) => {
  const deletionDate = timestampToDate(resident.scheduledDeletionAt);

  if (!deletionDate) return 30;

  return Math.max(
    0,
    Math.ceil((deletionDate.getTime() - Date.now()) / 86_400_000),
  );
};

export default function AdminResidentArchivePage() {
  const navigate = useNavigate();

  const [residents, setResidents] = useState<ArchivedResident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

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
    if (
      !window.confirm(
        `Restore ${
          fullName(resident) || "this resident"
        } to the active residents list?`,
      )
    ) {
      return;
    }

    setRestoringId(resident.id);
    setError(null);

    try {
      await restoreArchivedResident(resident.id);

      setResidents((current) =>
        current.filter((item) => item.id !== resident.id),
      );
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
            Deleted residents stay here for 30 days before automatic permanent
            deletion.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadArchive()}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
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
              Residents you delete will appear here for 30 days.
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
                  const remaining = daysRemaining(resident);

                  const deletionDate = timestampToDate(
                    resident.scheduledDeletionAt,
                  );

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
                          {remaining} day{remaining === 1 ? "" : "s"} left
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
                          onClick={() => void restore(resident)}
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
    </div>
  );
}
