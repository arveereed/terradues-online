import { useEffect, useMemo, useState } from "react";

import { useUser } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  AlertTriangle,
  Check,
  ExternalLink,
  Eye,
  FileText,
  Image,
  RefreshCw,
  Search,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

import {
  getRegistrationRequests,
  updateResidentApproval,
} from "../../features/auth/services/auth.service";

import type { User } from "../../types";

const ROWS_PER_PAGE = 6;

type Decision = "approved" | "denied";

const formatDate = (value: unknown) => {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    )
      .toDate()
      .toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  }

  return "—";
};

type DetailRowProps = {
  label: string;
  value?: string | number | boolean | null;
};

function DetailRow({ label, value }: DetailRowProps) {
  let displayedValue = "Not provided";

  if (typeof value === "boolean") {
    displayedValue = value ? "Yes" : "No";
  } else if (value !== null && value !== undefined && String(value).trim()) {
    displayedValue = String(value);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-zinc-900">
        {displayedValue}
      </p>
    </div>
  );
}

type RegistrationDocumentProps = {
  title: string;
  description: string;
  url?: string | null;
  type: "image" | "document";
};

function RegistrationDocument({
  title,
  description,
  url,
  type,
}: RegistrationDocumentProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
          {type === "image" ? <Image size={19} /> : <FileText size={19} />}
        </div>

        <div className="min-w-0">
          <h4 className="text-sm font-bold text-zinc-900">{title}</h4>

          <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
        </div>
      </div>

      {!url ? (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center">
          <AlertTriangle className="mx-auto text-amber-600" size={24} />

          <p className="mt-2 text-sm font-semibold text-zinc-700">
            No file was uploaded
          </p>
        </div>
      ) : type === "image" ? (
        <>
          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
            <img src={url} alt={title} className="h-64 w-full object-contain" />
          </div>

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline"
          >
            <ExternalLink size={16} />
            Open full image
          </a>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-zinc-800">
            Uploaded verification document
          </p>

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
          >
            <ExternalLink size={16} />
            Open document
          </a>
        </div>
      )}
    </section>
  );
}

export default function AdminRegistrationRequestsPage() {
  const queryClient = useQueryClient();
  const { user: admin } = useUser();

  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [type, setType] = useState("All");

  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<User | null>(null);

  const [confirm, setConfirm] = useState<{
    user: User;
    decision: Decision;
  } | null>(null);

  const [reason, setReason] = useState("");

  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const requests = await getRegistrationRequests();

      setUsers(requests);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load registration requests.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, type]);

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const haystack = `
            ${user.fullName}
            ${user.email}
            ${user.contactNumber}
            ${user.address}
            ${user.phase}
            ${user.block}
            ${user.lot}
          `.toLowerCase();

      const matchesSearch =
        !search.trim() || haystack.includes(search.trim().toLowerCase());

      const matchesType = type === "All" || user.userType === type;

      return matchesSearch && matchesType;
    });
  }, [users, search, type]);

  const pages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));

  const visible = filtered.slice(
    (page - 1) * ROWS_PER_PAGE,

    page * ROWS_PER_PAGE,
  );

  const decide = async () => {
    if (!confirm) {
      return;
    }

    if (confirm.decision === "denied" && !reason.trim()) {
      setError(
        "Please provide a denial reason so the resident knows what information must be corrected.",
      );

      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await updateResidentApproval({
        residentId: confirm.user.id,

        decision: confirm.decision,

        decidedBy:
          admin?.id ?? admin?.primaryEmailAddress?.emailAddress ?? "admin",

        denialReason: reason,
      });

      /**
       * Approval changes which residents are included in the Dashboard and Summary
       * Report. Mark those query results as stale immediately.
       */
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-dashboard-users"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["admin", "summary-report"],
        }),
      ]);

      setUsers((current) =>
        current.filter((user) => user.id !== confirm.user.id),
      );

      setSuccess(
        `${confirm.user.fullName || "Resident"} was ${confirm.decision}.`,
      );

      setConfirm(null);
      setReason("");
      setSelected(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update registration.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Resident Management
          </p>

          <h1 className="mt-1 text-2xl font-bold text-zinc-950 sm:text-3xl">
            Registration Requests
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Review and decide newly submitted resident registrations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <label className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              size={18}
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, address..."
              className="w-full rounded-2xl border border-zinc-200 py-3 pl-10 pr-4 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
            />
          </label>

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-emerald-500"
          >
            <option>All</option>

            <option>Owner</option>

            <option>Renter</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
        {loading ? (
          <div className="grid min-h-64 place-items-center text-sm text-zinc-500">
            <span className="loading loading-spinner loading-md" />
          </div>
        ) : visible.length === 0 ? (
          <div className="grid min-h-64 place-items-center px-6 text-center">
            <div>
              <UserCheck className="mx-auto text-emerald-600" size={38} />

              <h2 className="mt-3 font-bold text-zinc-900">
                No pending registrations
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                New requests will appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-5 py-4">Resident</th>

                    <th className="px-5 py-4">Contact</th>

                    <th className="px-5 py-4">Type</th>

                    <th className="px-5 py-4">Location</th>

                    <th className="px-5 py-4">Registered</th>

                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">
                  {visible.map((user) => (
                    <tr
                      key={user.id}
                      className="transition hover:bg-zinc-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {user.picture ? (
                            <img
                              src={user.picture}
                              alt={user.fullName}
                              className="size-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="grid size-10 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                              {user.firstName?.[0]}
                              {user.lastName?.[0]}
                            </div>
                          )}

                          <div>
                            <p className="font-semibold text-zinc-900">
                              {user.fullName}
                            </p>

                            <p className="text-xs text-zinc-500">Pending</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-zinc-600">
                        <p>{user.email}</p>

                        <p className="text-xs">{user.contactNumber || "—"}</p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                          {user.userType}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-zinc-600">
                        {user.address ||
                          `Blk ${user.block} Lot ${user.lot} Phase ${user.phase}`}
                      </td>

                      <td className="px-5 py-4 text-zinc-600">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelected(user)}
                            className="rounded-xl border border-zinc-200 p-2 text-zinc-600 transition hover:bg-zinc-50"
                            title="View details"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({
                                user,
                                decision: "approved",
                              })
                            }
                            className="rounded-xl bg-emerald-600 p-2 text-white transition hover:bg-emerald-700"
                            title="Approve"
                          >
                            <Check size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({
                                user,
                                decision: "denied",
                              })
                            }
                            className="rounded-xl bg-red-600 p-2 text-white transition hover:bg-red-700"
                            title="Deny"
                          >
                            <X size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-zinc-100 md:hidden">
              {visible.map((user) => (
                <article key={user.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.fullName}
                        className="size-11 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-900">
                        {user.fullName}
                      </p>

                      <p className="truncate text-xs text-zinc-500">
                        {user.email}
                      </p>

                      <p className="mt-2 text-sm text-zinc-600">
                        {user.userType}
                        {" · "}
                        {user.address ||
                          `Blk ${user.block} Lot ${user.lot} Phase ${user.phase}`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(user)}
                      className="rounded-xl border border-zinc-200 py-2 text-sm font-semibold text-zinc-700"
                    >
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({
                          user,
                          decision: "approved",
                        })
                      }
                      className="rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white"
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirm({
                          user,
                          decision: "denied",
                        })
                      }
                      className="rounded-xl bg-red-600 py-2 text-sm font-semibold text-white"
                    >
                      Deny
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-4 text-sm text-zinc-500">
            <span>
              Page {page} of {pages}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-xl border border-zinc-200 px-3 py-2 font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page === pages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-xl border border-zinc-200 px-3 py-2 font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* View details modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
          onMouseDown={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-100 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Registration Review
                </p>

                <h2 className="mt-1 text-xl font-bold text-zinc-950">
                  {selected.fullName ||
                    [selected.firstName, selected.middleName, selected.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    "Resident details"}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Review all submitted information and verification files.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl p-2 transition hover:bg-zinc-100"
                aria-label="Close resident details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-7 p-6">
              <section>
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Personal Information
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-zinc-950">
                    Resident details
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailRow label="First Name" value={selected.firstName} />
                  <DetailRow label="Middle Name" value={selected.middleName} />
                  <DetailRow label="Last Name" value={selected.lastName} />
                  <DetailRow label="Full Name" value={selected.fullName} />
                  <DetailRow label="Gender" value={selected.gender} />
                  <DetailRow
                    label="Contact Number"
                    value={selected.contactNumber}
                  />
                  <DetailRow label="Email Address" value={selected.email} />
                  <DetailRow label="Resident Type" value={selected.userType} />
                  <DetailRow
                    label="Registration Date"
                    value={formatDate(selected.createdAt)}
                  />
                </div>
              </section>

              <section className="border-t border-zinc-100 pt-6">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Property Information
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-zinc-950">
                    Registered address
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailRow label="Phase" value={selected.phase} />
                  <DetailRow label="Block" value={selected.block} />
                  <DetailRow label="Lot" value={selected.lot} />
                  <DetailRow
                    label="Complete Address"
                    value={selected.address}
                  />
                </div>
              </section>

              {selected.userType === "Owner" && (
                <section className="border-t border-zinc-100 pt-6">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Homeowner Information
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-zinc-950">
                      Ownership and occupancy
                    </h3>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailRow
                      label="Number of Family Members"
                      value={
                        "familyMembers" in selected
                          ? selected.familyMembers
                          : null
                      }
                    />

                    <DetailRow
                      label="Available for Rent"
                      value={
                        "forRent" in selected ? Boolean(selected.forRent) : null
                      }
                    />
                  </div>
                </section>
              )}

              {selected.userType === "Renter" && (
                <section className="border-t border-zinc-100 pt-6">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Rental Information
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-zinc-950">
                      Property owner details
                    </h3>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailRow
                      label="Property Owner Name"
                      value={
                        "ownerName" in selected ? selected.ownerName : null
                      }
                    />

                    <DetailRow
                      label="Owner Contact Number"
                      value={
                        "ownerContactNumber" in selected
                          ? selected.ownerContactNumber
                          : null
                      }
                    />

                    <DetailRow
                      label="Owner Address"
                      value={
                        "ownerAddress" in selected
                          ? selected.ownerAddress
                          : null
                      }
                    />

                    <DetailRow
                      label="Number of Occupants"
                      value={
                        "ownerNumberOccupants" in selected
                          ? selected.ownerNumberOccupants
                          : null
                      }
                    />
                  </div>
                </section>
              )}

              <section className="border-t border-zinc-100 pt-6">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Verification Documents
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-zinc-950">
                    Uploaded registration files
                  </h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    Review both files before approving or denying the
                    registration.
                  </p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <RegistrationDocument
                    title="Valid Government ID"
                    description="Government-issued identification submitted by the resident."
                    url={selected.picture}
                    type="image"
                  />

                  <RegistrationDocument
                    title={
                      selected.userType === "Renter"
                        ? "House Lease Agreement"
                        : "House Turnover Document"
                    }
                    description={
                      selected.userType === "Renter"
                        ? "Lease agreement submitted as proof of the resident's rental."
                        : "House turnover document submitted as proof of ownership."
                    }
                    url={selected.document}
                    type="document"
                  />
                </div>
              </section>

              <section className="flex flex-col gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setConfirm({
                      user: selected,
                      decision: "denied",
                    });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  <X size={18} />
                  Deny registration
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setConfirm({
                      user: selected,
                      decision: "approved",
                    });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Check size={18} />
                  Approve registration
                </button>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div
              className={`grid size-12 place-items-center rounded-2xl ${
                confirm.decision === "approved"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {confirm.decision === "approved" ? <Check /> : <XCircle />}
            </div>

            <h2 className="mt-4 text-xl font-bold text-zinc-950">
              {confirm.decision === "approved"
                ? "Approve resident?"
                : "Deny registration?"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Are you sure you want to{" "}
              {confirm.decision === "approved" ? "approve" : "deny"}{" "}
              <strong>{confirm.user.fullName}</strong>?
            </p>

            {confirm.decision === "denied" && (
              <div className="mt-4">
                <label
                  htmlFor="denial-reason"
                  className="mb-2 block text-sm font-semibold text-zinc-800"
                >
                  Reason for denial
                </label>

                <textarea
                  id="denial-reason"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setError("");
                  }}
                  placeholder="Explain which information the resident needs to correct."
                  required
                  className="min-h-28 w-full resize-y rounded-2xl border border-zinc-200 p-3 text-sm text-zinc-900 outline-none transition focus:border-red-400"
                />

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  The resident will see this reason on their denied-registration
                  page.
                </p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirm(null);
                  setReason("");
                }}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  saving || (confirm.decision === "denied" && !reason.trim())
                }
                onClick={() => void decide()}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  confirm.decision === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {saving
                  ? "Saving..."
                  : confirm.decision === "approved"
                    ? "Approve"
                    : "Deny"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
