import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import AppInput from "../../components/AppInput";
import { getAllUsers } from "../../features/auth/services/auth.service";
import type { User } from "../../types";

type PaymentStatus = "Paid" | "Not Paid";
type StatusFilter = "All" | PaymentStatus;
type ResidencyFilter = "All" | "Owner" | "Renter";

type ResidentUser = User & {
  userType: "Owner" | "Renter";
};

type PaymentRow = {
  id: string;
  lotNo: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  contactNumber?: string;
  picture?: string | null;
  residencyType: "Owner" | "Renter";
  amount: number;
  date: string;
  status: PaymentStatus;
  phase: string;
  block: string;
  lot: string;
  address?: string;
};

const ROWS_PER_PAGE = 5;
const ALL_FILTER = "All";

const PAYMENT_AMOUNT = 300;
const DEFAULT_PAYMENT_STATUS: PaymentStatus = "Not Paid";

const STATUS_OPTIONS: PaymentStatus[] = ["Paid", "Not Paid"];
const STATUS_FILTER_OPTIONS: StatusFilter[] = ["All", "Paid", "Not Paid"];
const RESIDENCY_FILTER_OPTIONS: ResidencyFilter[] = ["All", "Owner", "Renter"];

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter(Boolean).join(" ");

const peso = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const formatLocationPart = (
  value: unknown,
  label: "Phase" | "Block" | "Lot",
) => {
  const trimmed = clean(value);

  if (!trimmed) return "";
  if (trimmed.toLowerCase().startsWith(label.toLowerCase())) return trimmed;

  return `${label} ${trimmed}`;
};

const compareNatural = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

const toLotNumber = (value: unknown) => {
  const numeric = Number(clean(value).replace(/\D/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const getTodayShortDate = () => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);

  return `${mm}-${dd}-${yy}`;
};

function formatShortDate(input: string) {
  const [mm, dd, yy] = input.split("-").map((value) => Number(value));

  if (!mm || !dd || Number.isNaN(yy)) return input;

  const fullYear = yy < 70 ? 2000 + yy : 1900 + yy;
  const date = new Date(fullYear, mm - 1, dd);

  if (Number.isNaN(date.getTime())) return input;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function fullName(row: PaymentRow) {
  return [row.firstName, row.middleName, row.lastName]
    .filter(Boolean)
    .join(" ");
}

function getPaymentAddress(row: PaymentRow) {
  return (
    row.address ||
    [row.phase, row.block, row.lot].filter(Boolean).join(" / ") ||
    "-"
  );
}

const getPageNumbers = (currentPage: number, totalPages: number) => {
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = Math.max(1, currentPage - 2);
  let end = start + maxVisiblePages - 1;

  if (end > totalPages) {
    end = totalPages;
    start = end - maxVisiblePages + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const isResidentUser = (user: User): user is ResidentUser =>
  user.userType === "Owner" || user.userType === "Renter";

const getStoredPaymentStatus = (user: User): PaymentStatus => {
  const paymentStatus = (user as { paymentStatus?: unknown }).paymentStatus;

  return paymentStatus === "Paid" || paymentStatus === "Not Paid"
    ? paymentStatus
    : DEFAULT_PAYMENT_STATUS;
};

const getPaymentAmount = (user: User) => {
  const rawAmount =
    (user as { paymentAmount?: unknown }).paymentAmount ??
    (user as { amount?: unknown }).amount;

  const amount = Number(rawAmount);

  return Number.isFinite(amount) && amount > 0 ? amount : PAYMENT_AMOUNT;
};

const getPaymentDate = (user: User) => {
  const paymentDate = (user as { paymentDate?: unknown }).paymentDate;

  return typeof paymentDate === "string" && paymentDate.trim()
    ? paymentDate.trim()
    : getTodayShortDate();
};

const toPaymentRow = (user: ResidentUser): PaymentRow => ({
  id: user.id,
  lotNo: toLotNumber(user.lot),
  firstName: clean(user.firstName),
  middleName: clean(user.middleName),
  lastName: clean(user.lastName),
  contactNumber: clean(user.contactNumber),
  picture: user.picture,
  residencyType: user.userType,
  amount: getPaymentAmount(user),
  date: getPaymentDate(user),
  status: getStoredPaymentStatus(user),
  phase: formatLocationPart(user.phase, "Phase"),
  block: formatLocationPart(user.block, "Block"),
  lot: formatLocationPart(user.lot, "Lot"),
  address: clean(user.address),
});

export default function AdminPaymentStatusPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] =
    useState<StatusFilter>(ALL_FILTER);
  const [selectedResidency, setSelectedResidency] =
    useState<ResidencyFilter>(ALL_FILTER);
  const [currentPage, setCurrentPage] = useState(1);

  const [statusById, setStatusById] = useState<Record<string, PaymentStatus>>(
    {},
  );

  const loadResidents = async () => {
    setLoading(true);
    setDbError(null);

    try {
      const users = await getAllUsers();

      const residentRows = users
        .filter(isResidentUser)
        .map(toPaymentRow)
        .sort((a, b) => {
          const phaseCompare = compareNatural(a.phase, b.phase);
          if (phaseCompare !== 0) return phaseCompare;

          const blockCompare = compareNatural(a.block, b.block);
          if (blockCompare !== 0) return blockCompare;

          return a.lotNo - b.lotNo;
        });

      setRows(residentRows);
    } catch (error) {
      console.error("getAllUsers failed:", error);
      setRows([]);
      setDbError(
        error instanceof Error ? error.message : "Failed to load residents.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResidents();
  }, []);

  useEffect(() => {
    setStatusById((prev) => {
      const next: Record<string, PaymentStatus> = { ...prev };

      for (const row of rows) {
        if (!next[row.id]) {
          next[row.id] = row.status;
        }
      }

      return next;
    });
  }, [rows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedStatus, selectedResidency]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const currentStatus = statusById[row.id] ?? row.status;
      const name = fullName(row).toLowerCase();
      const address = getPaymentAddress(row).toLowerCase();

      const matchesSearch =
        !search ||
        name.includes(search) ||
        address.includes(search) ||
        clean(row.contactNumber).toLowerCase().includes(search) ||
        row.residencyType.toLowerCase().includes(search) ||
        String(row.lotNo).includes(search) ||
        peso(row.amount).toLowerCase().includes(search) ||
        formatShortDate(row.date).toLowerCase().includes(search) ||
        row.date.toLowerCase().includes(search) ||
        currentStatus.toLowerCase().includes(search);

      const matchesStatus =
        selectedStatus === ALL_FILTER || currentStatus === selectedStatus;

      const matchesResidency =
        selectedResidency === ALL_FILTER ||
        row.residencyType === selectedResidency;

      return matchesSearch && matchesStatus && matchesResidency;
    });
  }, [query, rows, selectedResidency, selectedStatus, statusById]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / ROWS_PER_PAGE),
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedRows = filteredRows.slice(startIndex, endIndex);

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const totalAmount = useMemo(
    () =>
      filteredRows.reduce(
        (sum, row) =>
          sum + (Number.isFinite(row.amount) ? Number(row.amount) : 0),
        0,
      ),
    [filteredRows],
  );

  const activeFilterCount =
    Number(selectedStatus !== ALL_FILTER) +
    Number(selectedResidency !== ALL_FILTER);

  const showingStart = filteredRows.length === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(endIndex, filteredRows.length);

  const clearFilters = () => {
    setSelectedStatus(ALL_FILTER);
    setSelectedResidency(ALL_FILTER);
  };

  const updateStatus = (id: string, next: PaymentStatus) => {
    setStatusById((prev) => ({ ...prev, [id]: next }));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Payments
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            Payment Status
          </h1>

          <p className="mt-1 text-sm font-medium text-zinc-500">
            Review and update resident monthly payment records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadResidents()}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {dbError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">Firestore error</p>
          <p className="mt-1 text-xs font-medium text-rose-800">{dbError}</p>
        </div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <AppInput
              value={query}
              className="h-12 w-full rounded-xl pl-11 text-sm font-medium"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resident name, address, amount, status..."
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition ${
              showFilters || activeFilterCount > 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <SlidersHorizontal size={17} />
            Filters
            {activeFilterCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <FilterButtonGroup
                label="Payment Status"
                value={selectedStatus}
                options={STATUS_FILTER_OPTIONS}
                onChange={setSelectedStatus}
              />

              <FilterButtonGroup
                label="Residency"
                value={selectedResidency}
                options={RESIDENCY_FILTER_OPTIONS}
                onChange={setSelectedResidency}
              />

              <button
                type="button"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Payment Status Table
            </h2>
            <p className="text-sm font-medium text-zinc-500">
              Showing {filteredRows.length} of {rows.length} residents
            </p>
          </div>

          <div className="text-sm font-semibold text-zinc-700">
            Total: <span className="text-zinc-950">{peso(totalAmount)}</span>
          </div>
        </div>

        {loading ? (
          <TableLoadingState />
        ) : filteredRows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <TableHead>Resident</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100 bg-white">
                  {paginatedRows.map((row) => {
                    const status = statusById[row.id] ?? row.status;

                    return (
                      <tr
                        key={row.id}
                        className="transition hover:bg-emerald-50/40"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center gap-3">
                            <AvatarThumb
                              url={row.picture ?? undefined}
                              name={fullName(row)}
                            />

                            <div>
                              <p className="text-sm font-semibold text-zinc-900">
                                {fullName(row) || "Unnamed resident"}
                              </p>
                              <p className="mt-0.5 text-xs font-medium text-zinc-500">
                                Lot {row.lotNo || "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="min-w-[280px] px-5 py-4 text-sm font-medium text-zinc-600">
                          {getPaymentAddress(row)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-zinc-900">
                          {peso(row.amount)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-zinc-600">
                          {formatShortDate(row.date)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <StatusSelectModern
                            value={status}
                            onChange={(next) => updateStatus(row.id, next)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              showingStart={showingStart}
              showingEnd={showingEnd}
              totalResults={filteredRows.length}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </section>
    </div>
  );
}

function FilterButtonGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${
              value === option
                ? "bg-emerald-600 text-white shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  pageNumbers,
  showingStart,
  showingEnd,
  totalResults,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  pageNumbers: number[];
  showingStart: number;
  showingEnd: number;
  totalResults: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-zinc-500">
        Showing{" "}
        <span className="font-semibold text-zinc-800">{showingStart}</span> to{" "}
        <span className="font-semibold text-zinc-800">{showingEnd}</span> of{" "}
        <span className="font-semibold text-zinc-800">{totalResults}</span>{" "}
        results
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={17} />
        </button>

        {pageNumbers.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`inline-flex size-9 items-center justify-center rounded-xl text-sm font-semibold transition ${
              currentPage === page
                ? "bg-emerald-600 text-white shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

function StatusSelectModern({
  value,
  onChange,
}: {
  value: PaymentStatus;
  onChange: (value: PaymentStatus) => void;
}) {
  const paid = value === "Paid";

  return (
    <div className="relative w-[160px]">
      <Listbox value={value} onChange={onChange}>
        <ListboxButton
          className={cx(
            "flex h-10 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-xs font-semibold ring-1 shadow-sm outline-none transition",
            paid
              ? "bg-emerald-50 text-emerald-800 ring-emerald-100 focus:ring-2 focus:ring-emerald-300"
              : "bg-rose-50 text-rose-800 ring-rose-100 focus:ring-2 focus:ring-rose-300",
          )}
        >
          {value}
          <ChevronDown size={16} />
        </ListboxButton>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-75"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <ListboxOptions className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl outline-none">
            {STATUS_OPTIONS.map((option) => (
              <ListboxOption
                key={option}
                value={option}
                className={({ active }) =>
                  cx(
                    "flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition",
                    active ? "bg-emerald-50" : "bg-white",
                    option === "Paid" ? "text-emerald-700" : "text-rose-700",
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span>{option}</span>
                    {selected ? (
                      <Check size={15} />
                    ) : (
                      <span className="size-4" />
                    )}
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Transition>
      </Listbox>
    </div>
  );
}

function AvatarThumb({ url, name }: { url?: string; name: string }) {
  return (
    <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-500 ring-1 ring-zinc-200">
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <ImagePlus size={18} className="text-zinc-400" />
      )}
    </div>
  );
}

function TableHead({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 ${className}`}
    >
      {children}
    </th>
  );
}

function EmptyState() {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-zinc-100">
        <Search className="text-zinc-400" />
      </div>

      <p className="mt-4 text-base font-semibold text-zinc-900">
        No payment records found.
      </p>

      <p className="mt-1 text-sm font-medium text-zinc-500">
        Try another search keyword or adjust the filters.
      </p>
    </div>
  );
}

function TableLoadingState() {
  return (
    <div className="p-5">
      <div className="space-y-3">
        {Array.from({ length: ROWS_PER_PAGE }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-4 gap-4 rounded-2xl border border-zinc-100 p-4"
          >
            <div className="h-5 animate-pulse rounded-full bg-zinc-100" />
            <div className="h-5 animate-pulse rounded-full bg-zinc-100" />
            <div className="h-5 animate-pulse rounded-full bg-zinc-100" />
            <div className="h-5 animate-pulse rounded-full bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
