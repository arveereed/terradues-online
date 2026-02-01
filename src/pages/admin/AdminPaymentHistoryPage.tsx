import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import {
  Search,
  ChevronDown,
  Check,
  SlidersHorizontal,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
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
  photoUrl?: string | null;
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
const KEY_PHASE = "td:adminPaymentHistory:phase";
const KEY_BLOCK = "td:adminPaymentHistory:block";

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

export default function AdminPaymentHistoryPage() {
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
        photoUrl:
          "https://res.cloudinary.com/dhl0zf4ho/image/upload/v1769708059/terradues/users/profile/mlunqjdgqewimvdty6ua.jpg",
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
        photoUrl:
          "https://res.cloudinary.com/dhl0zf4ho/image/upload/v1769708059/terradues/users/profile/mlunqjdgqewimvdty6ua.jpg",
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
        photoUrl:
          "https://res.cloudinary.com/dhl0zf4ho/image/upload/v1769708059/terradues/users/profile/mlunqjdgqewimvdty6ua.jpg",
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

  // ✅ remembered phase/block
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
        // ✅ filters (READ ONLY)
        if (statusFilter !== "All" && r.status !== statusFilter) return false;
        if (residencyFilter !== "All" && r.residencyType !== residencyFilter)
          return false;

        // ✅ search
        if (!q) return true;

        const hay = [
          r.lotNo,
          fullName(r),
          r.contactNumber ?? "",
          r.residencyType ?? "",
          formatShortDate(r.date),
          r.date,
          r.amount,
          r.status,
        ]
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      })
      .sort((a, b) => a.lotNo - b.lotNo);
  }, [rows, phase, block, query, statusFilter, residencyFilter]);

  const totalAmount = useMemo(
    () =>
      filtered.reduce(
        (sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0),
        0,
      ),
    [filtered],
  );

  // ✅ Fullscreen photo viewer (based on currently filtered list)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const photoItems = useMemo(() => {
    return filtered
      .filter((r) => !!r.photoUrl)
      .map((r) => ({
        id: r.id,
        url: r.photoUrl as string,
        name: fullName(r),
        meta: `Lot ${r.lotNo} • ${r.phase} • ${r.block}`,
      }));
  }, [filtered]);

  const openViewerByRow = (row: PaymentRow) => {
    if (!row.photoUrl) return;
    const idx = photoItems.findIndex((p) => p.id === row.id);
    setViewerIndex(Math.max(0, idx));
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);
  const goPrev = () =>
    setViewerIndex((i) =>
      photoItems.length ? (i - 1 + photoItems.length) % photoItems.length : 0,
    );
  const goNext = () =>
    setViewerIndex((i) =>
      photoItems.length ? (i + 1) % photoItems.length : 0,
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="lg:hidden flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Payments
          </p>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">
            Payment History
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
                  filtered.map((r) => (
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

                      {/* ✅ READ ONLY status */}
                      <Td>
                        <StatusPillModern status={r.status} />
                      </Td>

                      {/* ✅ READ ONLY photo (click to fullscreen if exists) */}
                      <Td>
                        <div className="flex items-center gap-2">
                          <AvatarThumbReadOnly
                            url={r.photoUrl ?? undefined}
                            name={fullName(r)}
                            onClick={() => openViewerByRow(r)}
                          />
                          {r.photoUrl ? (
                            <span className="text-xs font-semibold text-zinc-600">
                              Attached
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-zinc-400">
                              —
                            </span>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))
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
                {filtered.map((r) => (
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
                        <AvatarThumbReadOnly
                          url={r.photoUrl ?? undefined}
                          name={fullName(r)}
                          onClick={() => openViewerByRow(r)}
                        />
                        <StatusPillModern status={r.status} />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MiniField label="Amount" value={peso(r.amount)} />
                      <MiniField label="Date" value={formatShortDate(r.date)} />
                      <MiniField label="Middle" value={r.middleName ?? "—"} />
                      <MiniField label="Status" value={r.status} />
                    </div>

                    <div className="mt-3">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Photo
                      </p>
                      <div className="flex items-center gap-2">
                        <AvatarThumbReadOnly
                          url={r.photoUrl ?? undefined}
                          name={fullName(r)}
                          onClick={() => openViewerByRow(r)}
                        />
                        <span
                          className={cx(
                            "text-xs font-semibold",
                            r.photoUrl ? "text-zinc-600" : "text-zinc-400",
                          )}
                        >
                          {r.photoUrl ? "Tap to view" : "No attachment"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
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

      {/* ✅ Fullscreen Photo Viewer */}
      <PhotoViewer
        open={viewerOpen}
        onClose={closeViewer}
        items={photoItems}
        index={viewerIndex}
        onPrev={goPrev}
        onNext={goNext}
      />

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

/* ---------- READ-ONLY photo thumb (clickable if has url) ---------- */

function AvatarThumbReadOnly({
  url,
  name,
  onClick,
}: {
  url?: string;
  name: string;
  onClick?: () => void;
}) {
  const clickable = !!url && !!onClick;

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      className={cx(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl",
        "bg-emerald-50 ring-1 ring-emerald-100",
        clickable
          ? "cursor-pointer transition hover:scale-[1.03] hover:ring-emerald-200 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-emerald-200/60"
          : "cursor-default",
      )}
      aria-label={
        url ? `View attachment for ${name}` : `No attachment for ${name}`
      }
      disabled={!clickable}
    >
      {url ? (
        <>
          <img src={url} alt={name} className="h-full w-full object-cover" />
          <span className="pointer-events-none absolute bottom-1 right-1 grid size-5 place-items-center rounded-lg bg-black/40 text-white">
            <Maximize2 size={12} />
          </span>
        </>
      ) : (
        <span className="text-[11px] font-extrabold text-emerald-700">No</span>
      )}
    </button>
  );
}

/* ---------- Fullscreen Photo Viewer (modern lightbox) ---------- */

function PhotoViewer({
  open,
  onClose,
  items,
  index,
  onPrev,
  onNext,
}: {
  open: boolean;
  onClose: () => void;
  items: Array<{ id: string; url: string; name: string; meta?: string }>;
  index: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const current = items[index];

  // keyboard navigation
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, onPrev, onNext]);

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-120"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="min-h-full p-3 sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-2 sm:scale-[0.98]"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-120"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-2 sm:scale-[0.98]"
            >
              <Dialog.Panel
                className={cx(
                  "mx-auto w-full max-w-6xl overflow-hidden rounded-3xl",
                  "bg-white shadow-2xl ring-1 ring-emerald-100",
                )}
              >
                {/* Top bar */}
                <div className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-white px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <Dialog.Title className="truncate text-sm font-black text-zinc-900 sm:text-base">
                      {current?.name ?? "Attachment"}
                    </Dialog.Title>
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      {current?.meta ?? "Payment attachment"}{" "}
                      {items.length ? `• ${index + 1}/${items.length}` : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer grid size-10 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 active:bg-emerald-200"
                    aria-label="Close viewer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="relative bg-zinc-950">
                  {/* Image */}
                  <div className="flex items-center justify-center">
                    {current?.url ? (
                      <img
                        src={current.url}
                        alt={current.name}
                        className={cx(
                          "max-h-[72vh] w-full object-contain",
                          "bg-zinc-950",
                        )}
                      />
                    ) : (
                      <div className="grid h-[60vh] w-full place-items-center text-sm font-semibold text-white/80">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Prev/Next (only if multiple) */}
                  {items.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={onPrev}
                        className={cx(
                          "cursor-pointer absolute left-3 top-1/2 -translate-y-1/2",
                          "grid size-11 place-items-center rounded-2xl",
                          "bg-white/10 text-white ring-1 ring-white/15 backdrop-blur",
                          "hover:bg-white/15 active:bg-white/20",
                        )}
                        aria-label="Previous photo"
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={onNext}
                        className={cx(
                          "cursor-pointer absolute right-3 top-1/2 -translate-y-1/2",
                          "grid size-11 place-items-center rounded-2xl",
                          "bg-white/10 text-white ring-1 ring-white/15 backdrop-blur",
                          "hover:bg-white/15 active:bg-white/20",
                        )}
                        aria-label="Next photo"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  ) : null}

                  {/* Hint */}
                  <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-zinc-950 px-4 py-3 text-[11px] font-semibold text-white/70">
                    <span>Tip: Use ← → keys to navigate</span>
                    <span>ESC to close</span>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
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

/* ---------- Status pill (READ ONLY) ---------- */

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
            <Transition.Child
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
            </Transition.Child>
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
