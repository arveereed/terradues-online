import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { Search, ChevronDown, Check, X, SlidersHorizontal } from "lucide-react";
import AppInput from "../../components/AppInput";

/**
 * ✅ AdminPaymentSummaryPage (TerraDues theme)
 * - Phase / Block / Lot selectors (remembered in sessionStorage)
 * - Search
 * - Resident info header
 * - Payment summary table (Beginning Balance, Current Charges, Collection)
 * - Responsive: desktop table + mobile cards
 *
 * Copy-paste ready ✅
 */

type ResidencyType = "Owner" | "Renter";
type OccupancyType = "Occupied" | "Vacant";

type SummaryRow = {
  id: string;
  phase: string;
  block: string;
  lotNo: number;

  firstName: string;
  middleName?: string;
  lastName: string;
  contactNumber?: string;

  residencyType?: ResidencyType;
  occupancyType?: OccupancyType;

  monthLabel: string; // e.g. "September 2025"
  beginningBalance: number;
  currentCharges: number;
  collection: number;
};

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter(Boolean).join(" ");

const peso = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);

// session keys
const KEY_PHASE = "td:adminPaymentSummary:phase";
const KEY_BLOCK = "td:adminPaymentSummary:block";
const KEY_LOT = "td:adminPaymentSummary:lot";

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

function fullName(
  r: Pick<SummaryRow, "firstName" | "middleName" | "lastName">,
) {
  return [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ");
}

function numLot(n: number) {
  return Number.isFinite(n) ? n : 0;
}

export default function AdminPaymentSummaryPage() {
  // ✅ demo data (replace with your real query)
  const rows = useMemo<SummaryRow[]>(
    () => [
      // Lot 1 summary months
      {
        id: "s1",
        phase: "Phase 1",
        block: "Block 1",
        lotNo: 1,
        firstName: "Brylle",
        middleName: "Undag",
        lastName: "Milliomeda",
        contactNumber: "09xxxxxxx",
        residencyType: "Owner",
        occupancyType: "Occupied",
        monthLabel: "September 2025",
        beginningBalance: 180,
        currentCharges: 180,
        collection: 180,
      },
      {
        id: "s2",
        phase: "Phase 1",
        block: "Block 1",
        lotNo: 1,
        firstName: "Brylle",
        middleName: "Undag",
        lastName: "Milliomeda",
        contactNumber: "09xxxxxxx",
        residencyType: "Owner",
        occupancyType: "Occupied",
        monthLabel: "August 2025",
        beginningBalance: 180,
        currentCharges: 180,
        collection: 300,
      },
      {
        id: "s3",
        phase: "Phase 1",
        block: "Block 1",
        lotNo: 1,
        firstName: "Brylle",
        middleName: "Undag",
        lastName: "Milliomeda",
        contactNumber: "09xxxxxxx",
        residencyType: "Owner",
        occupancyType: "Occupied",
        monthLabel: "July 2025",
        beginningBalance: 180,
        currentCharges: 180,
        collection: 300,
      },
      {
        id: "s4",
        phase: "Phase 1",
        block: "Block 1",
        lotNo: 1,
        firstName: "Brylle",
        middleName: "Undag",
        lastName: "Milliomeda",
        contactNumber: "09xxxxxxx",
        residencyType: "Owner",
        occupancyType: "Occupied",
        monthLabel: "June 2025",
        beginningBalance: 180,
        currentCharges: 180,
        collection: 600,
      },
      {
        id: "s5",
        phase: "Phase 1",
        block: "Block 1",
        lotNo: 1,
        firstName: "Brylle",
        middleName: "Undag",
        lastName: "Milliomeda",
        contactNumber: "09xxxxxxx",
        residencyType: "Owner",
        occupancyType: "Occupied",
        monthLabel: "May 2025",
        beginningBalance: 180,
        currentCharges: 180,
        collection: 180,
      },
      {
        id: "s6",
        phase: "Phase 1",
        block: "Block 1",
        lotNo: 1,
        firstName: "Brylle",
        middleName: "Undag",
        lastName: "Milliomeda",
        contactNumber: "09xxxxxxx",
        residencyType: "Owner",
        occupancyType: "Occupied",
        monthLabel: "April 2025",
        beginningBalance: 180,
        currentCharges: 180,
        collection: 300,
      },
      {
        id: "s7",
        phase: "Phase 1",
        block: "Block 1",
        lotNo: 1,
        firstName: "Brylle",
        middleName: "Undag",
        lastName: "Milliomeda",
        contactNumber: "09xxxxxxx",
        residencyType: "Owner",
        occupancyType: "Occupied",
        monthLabel: "March 2025",
        beginningBalance: 180,
        currentCharges: 180,
        collection: 300,
      },
      {
        id: "s8",
        phase: "Phase 1",
        block: "Block 1",
        lotNo: 1,
        firstName: "Brylle",
        middleName: "Undag",
        lastName: "Milliomeda",
        contactNumber: "09xxxxxxx",
        residencyType: "Owner",
        occupancyType: "Occupied",
        monthLabel: "February 2025",
        beginningBalance: 180,
        currentCharges: 180,
        collection: 300,
      },
      {
        id: "s9",
        phase: "Phase 1",
        block: "Block 1",
        lotNo: 1,
        firstName: "Brylle",
        middleName: "Undag",
        lastName: "Milliomeda",
        contactNumber: "09xxxxxxx",
        residencyType: "Owner",
        occupancyType: "Occupied",
        monthLabel: "January 2025",
        beginningBalance: 180,
        currentCharges: 180,
        collection: 300,
      },

      // Other lots (so selector feels real)
      {
        id: "s10",
        phase: "Phase 1",
        block: "Block 1",
        lotNo: 2,
        firstName: "John",
        middleName: "Mark",
        lastName: "Saldivar",
        contactNumber: "09xxxxxxx",
        residencyType: "Renter",
        occupancyType: "Occupied",
        monthLabel: "September 2025",
        beginningBalance: 0,
        currentCharges: 180,
        collection: 180,
      },
      {
        id: "s11",
        phase: "Phase 1",
        block: "Block 2",
        lotNo: 1,
        firstName: "Anne",
        lastName: "Reyes",
        contactNumber: "09xxxxxxx",
        residencyType: "Owner",
        occupancyType: "Occupied",
        monthLabel: "September 2025",
        beginningBalance: 180,
        currentCharges: 180,
        collection: 0,
      },
      {
        id: "s12",
        phase: "Phase 2",
        block: "Block 1",
        lotNo: 1,
        firstName: "Jessa",
        lastName: "Santos",
        contactNumber: "09xxxxxxx",
        residencyType: "Renter",
        occupancyType: "Occupied",
        monthLabel: "September 2025",
        beginningBalance: 180,
        currentCharges: 180,
        collection: 180,
      },
    ],
    [],
  );

  // selectors (remembered)
  const [phase, setPhase] = useState(() => readString(KEY_PHASE, "Phase 1"));
  const [block, setBlock] = useState(() => readString(KEY_BLOCK, "Block 1"));
  const [lot, setLot] = useState(() => readString(KEY_LOT, "Lot 1"));

  const [query, setQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false); // kept for UI parity (optional)

  const phases = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.phase))).sort();
    return unique.length ? unique : ["Phase 1"];
  }, [rows]);

  const blocks = useMemo(() => {
    const byPhase = rows.filter((r) => r.phase === phase);
    const unique = Array.from(new Set(byPhase.map((r) => r.block))).sort();
    return unique.length ? unique : ["Block 1"];
  }, [rows, phase]);

  const lots = useMemo(() => {
    const byPB = rows.filter((r) => r.phase === phase && r.block === block);
    const uniqueNums = Array.from(new Set(byPB.map((r) => r.lotNo)))
      .map((n) => numLot(n))
      .sort((a, b) => a - b);
    const labels = uniqueNums.map((n) => `Lot ${n}`);
    return labels.length ? labels : ["Lot 1"];
  }, [rows, phase, block]);

  // keep selections valid when data changes
  useEffect(() => {
    if (!phases.includes(phase)) {
      const next = phases[0] ?? "Phase 1";
      setPhase(next);
      writeString(KEY_PHASE, next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phases]);

  useEffect(() => {
    if (!blocks.includes(block)) {
      const next = blocks[0] ?? "Block 1";
      setBlock(next);
      writeString(KEY_BLOCK, next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  useEffect(() => {
    if (!lots.includes(lot)) {
      const next = lots[0] ?? "Lot 1";
      setLot(next);
      writeString(KEY_LOT, next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lots]);

  useEffect(() => writeString(KEY_PHASE, phase), [phase]);
  useEffect(() => writeString(KEY_BLOCK, block), [block]);
  useEffect(() => writeString(KEY_LOT, lot), [lot]);

  const lotNoSelected = useMemo(() => {
    const n = Number(lot.replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : 1;
  }, [lot]);

  const scoped = useMemo(() => {
    return rows
      .filter(
        (r) =>
          r.phase === phase && r.block === block && r.lotNo === lotNoSelected,
      )
      .slice()
      .sort((a, b) => {
        // newest-ish first (rough ordering by month string)
        return a.monthLabel.localeCompare(b.monthLabel) * -1;
      });
  }, [rows, phase, block, lotNoSelected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scoped;

    return scoped.filter((r) => {
      const hay = [
        r.monthLabel,
        fullName(r),
        r.contactNumber ?? "",
        r.residencyType ?? "",
        r.occupancyType ?? "",
        r.phase,
        r.block,
        `Lot ${r.lotNo}`,
        r.beginningBalance,
        r.currentCharges,
        r.collection,
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [scoped, query]);

  const resident = useMemo(() => scoped[0], [scoped]);

  const totals = useMemo(() => {
    const beginning = filtered.reduce(
      (s, r) =>
        s + (Number.isFinite(r.beginningBalance) ? r.beginningBalance : 0),
      0,
    );
    const charges = filtered.reduce(
      (s, r) => s + (Number.isFinite(r.currentCharges) ? r.currentCharges : 0),
      0,
    );
    const collection = filtered.reduce(
      (s, r) => s + (Number.isFinite(r.collection) ? r.collection : 0),
      0,
    );
    return { beginning, charges, collection };
  }, [filtered]);

  const net = useMemo(
    () => totals.beginning + totals.charges - totals.collection,
    [totals],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Payments
          </p>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">
            Payment Summary
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Badge label="Months" value={String(filtered.length)} />
          <Badge label="Collection" value={peso(totals.collection)} />
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
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
                  const nextBlock = nextBlocks[0] ?? "Block 1";
                  setBlock(nextBlock);

                  const nextLots = Array.from(
                    new Set(
                      rows
                        .filter((r) => r.phase === v && r.block === nextBlock)
                        .map((r) => r.lotNo),
                    ),
                  )
                    .map((n) => numLot(n))
                    .sort((a, b) => a - b)
                    .map((n) => `Lot ${n}`);
                  setLot(nextLots[0] ?? "Lot 1");
                }}
              />

              <SelectListbox
                label="Block"
                value={block}
                options={blocks}
                onChange={(v) => {
                  setBlock(v);
                  const nextLots = Array.from(
                    new Set(
                      rows
                        .filter((r) => r.phase === phase && r.block === v)
                        .map((r) => r.lotNo),
                    ),
                  )
                    .map((n) => numLot(n))
                    .sort((a, b) => a - b)
                    .map((n) => `Lot ${n}`);
                  setLot(nextLots[0] ?? "Lot 1");
                }}
              />

              <SelectListbox
                label="Lot"
                value={lot}
                options={lots}
                onChange={setLot}
              />
            </div>

            <SearchBox
              value={query}
              onChange={setQuery}
              onOpenFilters={() => setIsFilterOpen(true)}
              onClear={() => setQuery("")}
              activeCount={0}
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-500 lg:justify-end">
            <span>
              Showing <span className="text-zinc-900">{filtered.length}</span>{" "}
              month{filtered.length === 1 ? "" : "s"}
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              Net Balance:{" "}
              <span
                className={cx(
                  "font-extrabold",
                  net <= 0 ? "text-emerald-700" : "text-rose-700",
                )}
              >
                {peso(net)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Resident info */}
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AvatarBadge name={resident ? fullName(resident) : "Resident"} />
            <div className="min-w-0">
              <p className="truncate text-base font-black text-zinc-900">
                {resident ? fullName(resident) : "No resident selected"}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                {phase} • {block} • Lot {lotNoSelected}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
            <InfoPill label="Contact" value={resident?.contactNumber ?? "—"} />
            <InfoPill
              label="Residency"
              value={resident?.residencyType ?? "—"}
            />
            <InfoPill
              label="Occupancy"
              value={resident?.occupancyType ?? "—"}
            />
            <InfoPill label="Months" value={String(filtered.length)} />
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <StatCard
            label="Beginning Balance"
            value={peso(totals.beginning)}
            tone="neutral"
          />
          <StatCard
            label="Current Charges"
            value={peso(totals.charges)}
            tone="emerald"
          />
          <StatCard
            label="Collection"
            value={peso(totals.collection)}
            tone="emeraldStrong"
          />
          <StatCard
            label="Net Balance"
            value={peso(net)}
            tone={net <= 0 ? "ok" : "warn"}
          />
        </div>
      </div>

      {/* Summary table */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
        {/* Desktop */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full">
              <thead className="bg-zinc-50">
                <tr className="text-left text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                  <Th>Month</Th>
                  <ThRight>Beginning Balance</ThRight>
                  <ThRight>Current Charges</ThRight>
                  <ThRight>Collection</ThRight>
                  <ThRight>Net</ThRight>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm font-semibold text-zinc-500"
                    >
                      No summary rows found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const rowNet =
                      r.beginningBalance + r.currentCharges - r.collection;
                    return (
                      <tr key={r.id} className="hover:bg-zinc-50">
                        <Td>
                          <p className="text-sm font-extrabold text-zinc-900">
                            {r.monthLabel}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                            {phase} • {block} • Lot {r.lotNo}
                          </p>
                        </Td>

                        <TdRight>{peso(r.beginningBalance)}</TdRight>
                        <TdRight>{peso(r.currentCharges)}</TdRight>
                        <TdRight>{peso(r.collection)}</TdRight>

                        <TdRight>
                          <span
                            className={cx(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1",
                              rowNet <= 0
                                ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                                : "bg-rose-50 text-rose-900 ring-rose-100",
                            )}
                          >
                            {peso(rowNet)}
                          </span>
                        </TdRight>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {filtered.length ? (
                <tfoot className="bg-white">
                  <tr className="border-t border-zinc-200">
                    <td className="px-4 py-4 text-sm font-black text-zinc-900">
                      Total
                    </td>
                    <TdRightStrong>{peso(totals.beginning)}</TdRightStrong>
                    <TdRightStrong>{peso(totals.charges)}</TdRightStrong>
                    <TdRightStrong>{peso(totals.collection)}</TdRightStrong>
                    <TdRightStrong>{peso(net)}</TdRightStrong>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <div className="p-4">
            {filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {filtered.map((r) => {
                  const rowNet =
                    r.beginningBalance + r.currentCharges - r.collection;
                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-zinc-900">
                            {r.monthLabel}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-zinc-500">
                            {phase} • {block} • Lot {r.lotNo}
                          </p>
                        </div>

                        <span
                          className={cx(
                            "shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1",
                            rowNet <= 0
                              ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                              : "bg-rose-50 text-rose-900 ring-rose-100",
                          )}
                        >
                          {peso(rowNet)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <MiniField
                          label="Beginning"
                          value={peso(r.beginningBalance)}
                        />
                        <MiniField
                          label="Charges"
                          value={peso(r.currentCharges)}
                        />
                        <MiniField
                          label="Collection"
                          value={peso(r.collection)}
                        />
                        <MiniField label="Net" value={peso(rowNet)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span>Total</span>
              <span
                className={cx(
                  "text-sm font-black",
                  net <= 0 ? "text-emerald-700" : "text-rose-700",
                )}
              >
                {peso(net)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <MiniStat label="Begin" value={peso(totals.beginning)} />
              <MiniStat label="Charges" value={peso(totals.charges)} />
              <MiniStat label="Collect" value={peso(totals.collection)} />
            </div>
          </div>
        </div>
      </div>

      {/* Optional: you can remove this; kept for same UI behavior as your other pages */}
      {isFilterOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl ring-1 ring-emerald-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black text-zinc-900">Filters</p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">
                  No extra filters on summary for now.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="grid size-10 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:bg-emerald-200"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="mt-4 h-10 w-full rounded-2xl bg-linear-to-r from-emerald-600 to-emerald-700 text-xs font-extrabold text-white hover:from-emerald-500 hover:to-emerald-700 active:from-emerald-700 active:to-emerald-800"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- UI bits (TerraDues) ---------------- */

function AvatarBadge({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="grid size-12 shrink-0 place-items-center rounded-3xl bg-emerald-50 ring-1 ring-emerald-100">
      <span className="text-sm font-black text-emerald-800">
        {initials || "TD"}
      </span>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="truncate text-sm font-extrabold text-zinc-900">{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "emerald" | "emeraldStrong" | "ok" | "warn";
}) {
  const toneClass =
    tone === "neutral"
      ? "bg-zinc-50 ring-zinc-200 text-zinc-900"
      : tone === "emerald"
        ? "bg-emerald-50 ring-emerald-100 text-emerald-900"
        : tone === "emeraldStrong"
          ? "bg-linear-to-r from-emerald-600 to-emerald-700 ring-emerald-700/20 text-white"
          : tone === "ok"
            ? "bg-emerald-50 ring-emerald-100 text-emerald-900"
            : "bg-rose-50 ring-rose-100 text-rose-900";

  const labelClass =
    tone === "emeraldStrong" ? "text-white/85" : "text-zinc-500";

  return (
    <div className={cx("rounded-3xl px-4 py-3 ring-1", toneClass)}>
      <p
        className={cx(
          "text-[10px] font-semibold uppercase tracking-[0.16em]",
          labelClass,
        )}
      >
        {label}
      </p>
      <p
        className={cx(
          "mt-1 text-base font-black",
          tone === "emeraldStrong" ? "text-white" : "",
        )}
      >
        {value}
      </p>
    </div>
  );
}

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
        placeholder="Search month, amounts, resident..."
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
function ThRight({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-right">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 text-sm font-medium text-zinc-700">{children}</td>
  );
}
function TdRight({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-800">
      {children}
    </td>
  );
}
function TdRightStrong({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-4 text-right text-sm font-black text-zinc-900">
      {children}
    </td>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="truncate text-xs font-black text-zinc-900">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center">
      <p className="text-sm font-semibold text-zinc-700">No summary found.</p>
      <p className="mt-1 text-xs font-medium text-zinc-500">
        Try changing phase/block/lot or search keyword.
      </p>
    </div>
  );
}

/* ---------- TerraDues Listbox (same style as your reference) ---------- */

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
