import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  Search,
  ChevronDown,
  Check,
  SlidersHorizontal,
  X,
  ImagePlus,
  Trash2,
} from "lucide-react";
import AppInput from "../../components/AppInput";

type PaymentStatus = "Paid" | "Not Paid";
type StatusFilter = "All" | PaymentStatus;
type ResidencyFilter = "All" | "Owner" | "Renter";

type PaymentRow = {
  id: string;
  lotNo: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  contactNumber?: string;
  residencyType?: "Owner" | "Renter";
  amount: number;
  date: string; // "10-09-25" (MM-DD-YY)
  status: PaymentStatus;
  phase: string;
  block: string;
};

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter(Boolean).join(" ");

const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);

/** session keys */
const KEY_PHASE = "td:adminPayments:phase";
const KEY_BLOCK = "td:adminPayments:block";

function readString(key: string, fallback: string) {
  try {
    return sessionStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeString(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function formatShortDate(input: string) {
  const [mm, dd, yy] = input.split("-").map((x) => Number(x));
  if (!mm || !dd || Number.isNaN(yy)) return input;

  const fullYear = yy < 70 ? 2000 + yy : 1900 + yy;
  const d = new Date(fullYear, mm - 1, dd);
  if (Number.isNaN(d.getTime())) return input;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

function fullName(r: PaymentRow) {
  return [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ");
}

const STATUS_OPTIONS: PaymentStatus[] = ["Paid", "Not Paid"];

export default function AdminPaymentsPage() {
  // ✅ demo data (replace with your query)
  const rows = useMemo<PaymentRow[]>(
    () => [
      {
        id: "p1",
        lotNo: 1,
        firstName: "Brylle",
        middleName: "Undag",
        lastName: "Milliomeda",
        contactNumber: "09xxxxxx",
        residencyType: "Owner",
        amount: 300,
        date: "10-09-25",
        status: "Not Paid",
        phase: "Phase 1",
        block: "Block 1",
      },
      {
        id: "p2",
        lotNo: 2,
        firstName: "John",
        middleName: "Mark",
        lastName: "Saldivar",
        contactNumber: "09xxxxxx",
        residencyType: "Renter",
        amount: 300,
        date: "10-09-25",
        status: "Paid",
        phase: "Phase 1",
        block: "Block 1",
      },
      {
        id: "p3",
        lotNo: 3,
        firstName: "Richard",
        lastName: "Calibuso",
        contactNumber: "09xxxxxx",
        residencyType: "Owner",
        amount: 300,
        date: "10-09-25",
        status: "Paid",
        phase: "Phase 1",
        block: "Block 1",
      },
      {
        id: "p4",
        lotNo: 4,
        firstName: "Arvee",
        lastName: "Durante",
        contactNumber: "09xxxxxx",
        residencyType: "Owner",
        amount: 300,
        date: "10-09-25",
        status: "Paid",
        phase: "Phase 1",
        block: "Block 1",
      },
      {
        id: "p5",
        lotNo: 5,
        firstName: "Michael",
        lastName: "Jordan",
        contactNumber: "09xxxxxx",
        residencyType: "Owner",
        amount: 300,
        date: "10-09-25",
        status: "Not Paid",
        phase: "Phase 1",
        block: "Block 1",
      },
      {
        id: "p6",
        lotNo: 1,
        firstName: "Anne",
        lastName: "Reyes",
        contactNumber: "09xxxxxx",
        residencyType: "Owner",
        amount: 300,
        date: "10-09-25",
        status: "Paid",
        phase: "Phase 1",
        block: "Block 2",
      },
      {
        id: "p7",
        lotNo: 1,
        firstName: "Jessa",
        lastName: "Santos",
        contactNumber: "09xxxxxx",
        residencyType: "Renter",
        amount: 300,
        date: "10-09-25",
        status: "Not Paid",
        phase: "Phase 2",
        block: "Block 1",
      },
    ],
    [],
  );

  // ✅ remembered filters
  const [phase, setPhase] = useState<string>(() =>
    readString(KEY_PHASE, "Phase 1"),
  );
  const [block, setBlock] = useState<string>(() =>
    readString(KEY_BLOCK, "Block 1"),
  );
  const [query, setQuery] = useState("");

  // ✅ Filter modal state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [residencyFilter, setResidencyFilter] =
    useState<ResidencyFilter>("All");

  const activeFiltersCount =
    (statusFilter !== "All" ? 1 : 0) + (residencyFilter !== "All" ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("All");
    setResidencyFilter("All");
  };

  // ✅ status state (demo)
  const [statusById, setStatusById] = useState<Record<string, PaymentStatus>>(
    () => Object.fromEntries(rows.map((r) => [r.id, r.status])),
  );

  // ✅ photo state (TEMP only): id -> objectURL
  const [photoById, setPhotoById] = useState<Record<string, string>>({});
  const urlsRef = useRef<Record<string, string>>({});

  const setPhoto = (id: string, nextUrl: string | null) => {
    // revoke previous url for this id
    const prevUrl = urlsRef.current[id];
    if (prevUrl && prevUrl.startsWith("blob:")) URL.revokeObjectURL(prevUrl);

    if (!nextUrl) {
      delete urlsRef.current[id];
      setPhotoById((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      return;
    }

    urlsRef.current[id] = nextUrl;
    setPhotoById((prev) => ({ ...prev, [id]: nextUrl }));
  };

  // cleanup all blob urls on unmount
  useEffect(() => {
    return () => {
      Object.values(urlsRef.current).forEach((u) => {
        if (u && u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
      urlsRef.current = {};
    };
  }, []);

  useEffect(() => {
    setStatusById((prev) => {
      const next: Record<string, PaymentStatus> = { ...prev };
      for (const r of rows) if (!next[r.id]) next[r.id] = r.status;
      return next;
    });
  }, [rows]);

  const phases = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.phase))).sort();
    return unique.length ? unique : ["Phase 1"];
  }, [rows]);

  const blocks = useMemo(() => {
    const filteredByPhase = rows.filter((r) => r.phase === phase);
    const unique = Array.from(
      new Set(filteredByPhase.map((r) => r.block)),
    ).sort();
    return unique.length ? unique : ["Block 1"];
  }, [rows, phase]);

  // keep phase/block valid if data changes
  useEffect(() => {
    if (!phases.includes(phase)) {
      const nextPhase = phases[0] ?? "Phase 1";
      setPhase(nextPhase);
      writeString(KEY_PHASE, nextPhase);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phases]);

  useEffect(() => {
    if (!blocks.includes(block)) {
      const nextBlock = blocks[0] ?? "Block 1";
      setBlock(nextBlock);
      writeString(KEY_BLOCK, nextBlock);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  useEffect(() => writeString(KEY_PHASE, phase), [phase]);
  useEffect(() => writeString(KEY_BLOCK, block), [block]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows
      .filter((r) => r.phase === phase && r.block === block)
      .filter((r) => {
        const currentStatus = statusById[r.id] ?? r.status;

        if (statusFilter !== "All" && currentStatus !== statusFilter)
          return false;
        if (residencyFilter !== "All" && r.residencyType !== residencyFilter)
          return false;

        if (!q) return true;

        const hay = [
          r.lotNo,
          fullName(r),
          r.contactNumber ?? "",
          r.residencyType ?? "",
          formatShortDate(r.date),
          r.date,
          r.amount,
          currentStatus,
        ]
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      })
      .sort((a, b) => a.lotNo - b.lotNo);
  }, [rows, phase, block, query, statusById, statusFilter, residencyFilter]);

  const totalAmount = useMemo(
    () =>
      filtered.reduce(
        (sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0),
        0,
      ),
    [filtered],
  );

  const updateStatus = (id: string, next: PaymentStatus) => {
    setStatusById((prev) => ({ ...prev, [id]: next }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="lg:hidden flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Payments
          </p>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">
            Payment Status
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Badge label="Records" value={String(filtered.length)} />
          <Badge label="Total" value={peso(totalAmount)} />
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <SelectListbox
                label="Phase"
                value={phase}
                options={phases}
                onChange={(v) => {
                  setPhase(v);
                  const nextBlocks = Array.from(
                    new Set(
                      rows.filter((r) => r.phase === v).map((r) => r.block),
                    ),
                  ).sort();
                  setBlock(nextBlocks[0] ?? "Block 1");
                }}
              />

              <SelectListbox
                label="Block"
                value={block}
                options={blocks}
                onChange={setBlock}
              />
            </div>

            <SearchBox
              value={query}
              onChange={setQuery}
              onOpenFilters={() => setIsFilterOpen(true)}
              onClear={() => setQuery("")}
              activeCount={activeFiltersCount}
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-500 lg:justify-end">
            <span>
              Showing <span className="text-zinc-900">{filtered.length}</span>{" "}
              record
              {filtered.length === 1 ? "" : "s"}
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              Total Amount:{" "}
              <span className="text-zinc-900">{peso(totalAmount)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-[1120px] w-full">
              <thead className="bg-zinc-50">
                <tr className="text-left text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                  <Th>Lot</Th>
                  <Th>Name</Th>
                  <Th>Contact</Th>
                  <Th>Residency</Th>
                  <Th>Amount</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th>Photo</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-sm font-semibold text-zinc-500"
                      colSpan={8}
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const status = statusById[r.id] ?? r.status;
                    const photoUrl = photoById[r.id];

                    return (
                      <tr key={r.id} className="hover:bg-zinc-50">
                        <TdStrong>{r.lotNo}</TdStrong>

                        <Td>
                          <p className="truncate text-sm font-semibold text-zinc-900">
                            {fullName(r)}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-zinc-500">
                            {r.contactNumber ?? "—"}
                          </p>
                        </Td>

                        <Td>{r.contactNumber ?? "—"}</Td>
                        <Td>{r.residencyType ?? "—"}</Td>
                        <TdStrong>{peso(r.amount)}</TdStrong>
                        <Td>{formatShortDate(r.date)}</Td>

                        <Td>
                          <StatusSelectModern
                            value={status}
                            onChange={(next) => updateStatus(r.id, next)}
                          />
                        </Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            <AvatarThumb url={photoUrl} name={fullName(r)} />
                            <PhotoButton
                              id={r.id}
                              hasPhoto={Boolean(photoUrl)}
                              onPick={(file) => {
                                const url = URL.createObjectURL(file);
                                setPhoto(r.id, url);
                              }}
                              onRemove={() => setPhoto(r.id, null)}
                            />
                          </div>
                        </Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3">
            <span className="text-xs font-semibold text-zinc-500">
              Total Amount:
            </span>
            <span className="text-sm font-extrabold text-zinc-900">
              {peso(totalAmount)}
            </span>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          <div className="p-4">
            {filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {filtered.map((r) => {
                  const status = statusById[r.id] ?? r.status;
                  const photoUrl = photoById[r.id];

                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900">
                            Lot {r.lotNo} • {r.firstName} {r.lastName}
                          </p>
                          <p className="mt-1 text-xs font-medium text-zinc-500">
                            {r.residencyType ?? "—"} • {r.contactNumber ?? "—"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <AvatarThumb url={photoUrl} name={fullName(r)} />
                          <StatusPillModern status={status} />
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <MiniField label="Amount" value={peso(r.amount)} />
                        <MiniField
                          label="Date"
                          value={formatShortDate(r.date)}
                        />
                        <MiniField label="Middle" value={r.middleName ?? "—"} />
                        <MiniField label="Status" value={status} />
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2">
                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            Update Status
                          </p>
                          <StatusSelectModern
                            value={status}
                            onChange={(next) => updateStatus(r.id, next)}
                            fullWidth
                          />
                        </div>

                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            Photo
                          </p>
                          <div className="flex items-center gap-2">
                            <AvatarThumb url={photoUrl} name={fullName(r)} />
                            <PhotoButton
                              id={r.id}
                              hasPhoto={Boolean(photoUrl)}
                              onPick={(file) => {
                                const url = URL.createObjectURL(file);
                                setPhoto(r.id, url);
                              }}
                              onRemove={() => setPhoto(r.id, null)}
                              fullWidth
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-zinc-200 bg-white px-4 py-3">
            <span className="text-xs font-semibold text-zinc-500">
              Total Amount
            </span>
            <span className="text-sm font-extrabold text-zinc-900">
              {peso(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      <FilterModal
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        status={statusFilter}
        setStatus={setStatusFilter}
        residency={residencyFilter}
        setResidency={setResidencyFilter}
        activeCount={activeFiltersCount}
        onClear={clearFilters}
      />
    </div>
  );
}

/* ---------- Photo UI (TEMP state) ---------- */

function AvatarThumb({ url, name }: { url?: string; name: string }) {
  return (
    <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <ImagePlus size={18} className="text-emerald-700" />
      )}
    </div>
  );
}

function PhotoButton({
  /*  id, */
  hasPhoto,
  onPick,
  onRemove,
  fullWidth,
}: {
  id: string;
  hasPhoto: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
  fullWidth?: boolean;
}) {
  return (
    <div className={cx("flex items-center gap-2", fullWidth && "w-full")}>
      <label
        className={cx(
          "cursor-pointer inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-3",
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800",
          "ring-1 ring-emerald-700/20",
          fullWidth ? "flex-1" : "",
        )}
      >
        <ImagePlus size={16} />
        <span className="text-xs font-extrabold">
          {hasPhoto ? "Change Photo" : "Add Photo"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            onPick(f);
            // allow picking the same file again
            e.currentTarget.value = "";
          }}
        />
      </label>

      {hasPhoto ? (
        <button
          type="button"
          onClick={onRemove}
          className={cx(
            "cursor-pointer grid size-10 place-items-center rounded-2xl",
            "border border-emerald-200 bg-emerald-50 text-emerald-800",
            "hover:bg-emerald-100 active:bg-emerald-200",
          )}
          aria-label="Remove photo"
          title="Remove"
        >
          <Trash2 size={16} />
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Small UI components ---------- */

function SearchBox({
  value,
  onChange,
  onOpenFilters,
  onClear,
  activeCount = 0,
}: {
  value: string;
  onChange: (v: string) => void;
  onOpenFilters: () => void;
  onClear: () => void;
  activeCount?: number;
}) {
  return (
    <div className="relative w-full sm:max-w-xl">
      <Search
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
      />
      <AppInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search lot, name, contact,date..."
        className="h-12 w-full pl-11 pr-23"
      />

      {value.trim() ? (
        <button
          type="button"
          className="cursor-pointer absolute right-[46px] top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 active:bg-zinc-100"
          aria-label="Clear search"
          onClick={onClear}
        >
          <X size={18} />
        </button>
      ) : null}

      <button
        type="button"
        className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm hover:bg-emerald-100 active:bg-emerald-200"
        aria-label="Filters"
        onClick={onOpenFilters}
      >
        <SlidersHorizontal size={18} />
        {activeCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-emerald-600 text-[10px] font-extrabold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}

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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 text-sm font-medium text-zinc-700">{children}</td>
  );
}

function TdStrong({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 text-sm font-bold text-zinc-900">{children}</td>
  );
}

/* ---------- Phase/Block LISTBOX ---------- */

function SelectListbox({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <p className="sr-only">{label}</p>

      <Listbox value={value} onChange={onChange}>
        <ListboxButton
          className={cx(
            "cursor-pointer group flex h-12 w-full items-center justify-between rounded-2xl px-4",
            "bg-linear-to-r from-emerald-600 to-emerald-700 text-white",
            "text-sm font-extrabold shadow-sm ring-1 ring-emerald-700/30 outline-none",
            "focus:ring-4 focus:ring-emerald-200/60",
          )}
        >
          <span className="text-sm font-extrabold tracking-wide">{value}</span>
          <ChevronDown size={18} className="text-white/90" />
        </ListboxButton>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-120"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <ListboxOptions
            className={cx(
              "absolute z-40 mt-2 w-full rounded-2xl border border-emerald-200 bg-white p-1 shadow-2xl outline-none",
              "ring-1 ring-black/5",
            )}
          >
            {options.map((opt) => (
              <ListboxOption
                key={opt}
                value={opt}
                className={({ active }) =>
                  cx(
                    "cursor-pointer select-none rounded-xl px-3 py-2.5",
                    "flex items-center justify-between gap-3",
                    "text-sm font-bold",
                    active
                      ? "bg-emerald-100 text-emerald-950"
                      : "text-zinc-900",
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span className="whitespace-normal leading-5">{opt}</span>
                    {selected ? (
                      <span className="grid size-7 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm">
                        <Check size={16} />
                      </span>
                    ) : (
                      <span className="size-7" />
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

/* ---------- MODERN STATUS DROPDOWN ---------- */

function StatusSelectModern({
  value,
  onChange,
  fullWidth,
}: {
  value: PaymentStatus;
  onChange: (v: PaymentStatus) => void;
  fullWidth?: boolean;
}) {
  const paid = value === "Paid";

  return (
    <div className={cx("relative", fullWidth ? "w-full" : "w-[190px]")}>
      <Listbox value={value} onChange={onChange}>
        <ListboxButton
          className={cx(
            "cursor-pointer group flex h-10 w-full items-center justify-between rounded-xl px-3",
            "ring-1 shadow-sm outline-none transition",
            "focus:ring-2 focus:ring-offset-2 focus:ring-offset-white",
            paid
              ? "bg-emerald-50 text-emerald-900 ring-emerald-100 focus:ring-emerald-300"
              : "bg-rose-50 text-rose-900 ring-rose-100 focus:ring-rose-300",
          )}
        >
          <span className="text-xs font-extrabold tracking-wide">{value}</span>
          <ChevronDown
            size={16}
            className="opacity-70 transition group-hover:opacity-100"
          />
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
          <ListboxOptions className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-emerald-100 bg-white p-1 shadow-xl outline-none">
            {STATUS_OPTIONS.map((opt) => {
              const optPaid = opt === "Paid";
              return (
                <ListboxOption
                  key={opt}
                  value={opt}
                  className={({ active }) =>
                    cx(
                      "cursor-pointer flex items-center justify-between rounded-xl px-3 py-2",
                      "text-xs font-extrabold transition",
                      active ? "bg-emerald-50" : "bg-white",
                      optPaid ? "text-emerald-800" : "text-rose-700",
                    )
                  }
                >
                  {({ selected }) => (
                    <>
                      <span className="tracking-wide">{opt}</span>
                      {selected ? (
                        <Check size={16} />
                      ) : (
                        <span className="size-4" />
                      )}
                    </>
                  )}
                </ListboxOption>
              );
            })}
          </ListboxOptions>
        </Transition>
      </Listbox>
    </div>
  );
}

function StatusPillModern({ status }: { status: PaymentStatus }) {
  const paid = status === "Paid";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1",
        paid
          ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
          : "bg-rose-50 text-rose-900 ring-rose-100",
      )}
    >
      <span
        className={cx(
          "inline-block size-2 rounded-full",
          paid ? "bg-emerald-500" : "bg-rose-500",
        )}
      />
      {status}
    </span>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="truncate text-sm font-bold text-zinc-900">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center">
      <p className="text-sm font-semibold text-zinc-700">No records found.</p>
      <p className="mt-1 text-xs font-medium text-zinc-500">
        Try changing phase/block or search keyword.
      </p>
    </div>
  );
}

/* ---------- FILTER MODAL ---------- */

function FilterModal({
  open,
  onClose,
  status,
  setStatus,
  residency,
  setResidency,
  activeCount,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  status: StatusFilter;
  setStatus: (v: StatusFilter) => void;
  residency: ResidencyFilter;
  setResidency: (v: ResidencyFilter) => void;
  activeCount: number;
  onClear: () => void;
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-[0.98]"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-2 sm:translate-y-0 sm:scale-[0.98]"
            >
              <Dialog.Panel className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-emerald-100">
                <div className="flex items-start justify-between gap-3 border-b border-emerald-100 p-5">
                  <div>
                    <Dialog.Title className="text-lg font-black tracking-tight text-zinc-900">
                      Filters
                    </Dialog.Title>
                    <p className="mt-1 text-xs font-medium text-zinc-500">
                      Narrow down the payment records.
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="cursor-pointer grid size-10 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:bg-emerald-200"
                    aria-label="Close"
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-5 p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Status
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <FilterChip
                        active={status === "All"}
                        onClick={() => setStatus("All")}
                      >
                        All
                      </FilterChip>
                      <FilterChip
                        active={status === "Paid"}
                        onClick={() => setStatus("Paid")}
                      >
                        Paid
                      </FilterChip>
                      <FilterChip
                        active={status === "Not Paid"}
                        onClick={() => setStatus("Not Paid")}
                      >
                        Not Paid
                      </FilterChip>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Residency
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <FilterChip
                        active={residency === "All"}
                        onClick={() => setResidency("All")}
                      >
                        All
                      </FilterChip>
                      <FilterChip
                        active={residency === "Owner"}
                        onClick={() => setResidency("Owner")}
                      >
                        Owner
                      </FilterChip>
                      <FilterChip
                        active={residency === "Renter"}
                        onClick={() => setResidency("Renter")}
                      >
                        Renter
                      </FilterChip>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-emerald-100 bg-white p-5">
                  <div className="text-xs font-semibold text-zinc-500">
                    Active filters:{" "}
                    <span className="text-zinc-900">{activeCount}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClear}
                      className="cursor-pointer h-10 rounded-2xl border border-emerald-200 bg-white px-4 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="cursor-pointer h-10 rounded-2xl bg-linear-to-r from-emerald-600 to-emerald-700 px-4 text-xs font-extrabold text-white hover:from-emerald-500 hover:to-emerald-700 active:from-emerald-700 active:to-emerald-800"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
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
