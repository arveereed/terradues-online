import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Pencil,
  Plus,
  Search,
  UserRound,
  Check,
} from "lucide-react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import AppInput from "../../components/AppInput";

type Resident = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  contactNumber?: string;
  email?: string;
  residencyType?: "Owner" | "Renter";
  occupancyType?: "Occupied" | "Vacant";
  avatarUrl?: string;
  phase: string;
  block: string;
  lot: string;
};

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter(Boolean).join(" ");

const lotNumber = (lotLabel: string) => {
  const n = Number(lotLabel.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** -----------------------
 * sessionStorage keys
 * ----------------------*/
const KEY_PHASE = "td:adminResidents:phase";
const KEY_BLOCK = "td:adminResidents:block";
const EXPANDED_KEY = "td:adminResidents:expandedLot";

function getExpandedKey(phase: string, block: string) {
  return `${EXPANDED_KEY}:${phase}:${block}`;
}

function readString(key: string, fallback: string) {
  try {
    const v = sessionStorage.getItem(key);
    return v ?? fallback;
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

function readExpandedLot(phase: string, block: string): number | null {
  try {
    const raw = sessionStorage.getItem(getExpandedKey(phase, block));
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeExpandedLot(phase: string, block: string, lot: number | null) {
  try {
    const key = getExpandedKey(phase, block);
    if (lot === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(lot));
  } catch {
    // ignore
  }
}

export default function AdminResidentsPage() {
  // Demo data (replace with your API)
  const residents = useMemo<Resident[]>(
    () => [
      {
        id: "r1",
        firstName: "Brylle",
        middleName: "Undag",
        lastName: "Milliomeda",
        contactNumber: "09xxxxxxxxx",
        email: "brylle@gmail.com",
        residencyType: "Owner",
        occupancyType: "Occupied",
        avatarUrl:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
        phase: "Phase 1",
        block: "Block 1",
        lot: "Lot 1",
      },
      {
        id: "r2",
        firstName: "Jessa",
        lastName: "Santos",
        contactNumber: "09xxxxxxxxx",
        email: "jessa@gmail.com",
        residencyType: "Renter",
        occupancyType: "Occupied",
        phase: "Phase 1",
        block: "Block 1",
        lot: "Lot 2",
      },
      {
        id: "r3",
        firstName: "Mark",
        lastName: "Dela Cruz",
        residencyType: "Owner",
        occupancyType: "Vacant",
        phase: "Phase 1",
        block: "Block 2",
        lot: "Lot 1",
      },
      {
        id: "r4",
        firstName: "Anne",
        lastName: "Reyes",
        residencyType: "Owner",
        occupancyType: "Occupied",
        phase: "Phase 2",
        block: "Block 1",
        lot: "Lot 4",
      },
    ],
    [],
  );

  // UI state
  const [query, setQuery] = useState("");

  // ✅ restore phase/block from sessionStorage (fallback to Phase 1 / Block 1)
  const [phase, setPhase] = useState<string>(() =>
    readString(KEY_PHASE, "Phase 1"),
  );
  const [block, setBlock] = useState<string>(() =>
    readString(KEY_BLOCK, "Block 1"),
  );

  // ✅ start closed; restore expanded based on remembered phase+block
  const [expandedLot, setExpandedLot] = useState<number | null>(() =>
    readExpandedLot(
      readString(KEY_PHASE, "Phase 1"),
      readString(KEY_BLOCK, "Block 1"),
    ),
  );

  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(
    null,
  );

  const phases = useMemo(() => {
    const unique = Array.from(new Set(residents.map((r) => r.phase))).sort();
    return unique.length ? unique : ["Phase 1"];
  }, [residents]);

  const blocks = useMemo(() => {
    const filteredByPhase = residents.filter((r) => r.phase === phase);
    const unique = Array.from(
      new Set(filteredByPhase.map((r) => r.block)),
    ).sort();
    return unique.length ? unique : ["Block 1"];
  }, [residents, phase]);

  /** ✅ Ensure phase is valid (if stored value no longer exists) */
  useEffect(() => {
    if (!phases.includes(phase)) {
      const nextPhase = phases[0] ?? "Phase 1";
      setPhase(nextPhase);
      writeString(KEY_PHASE, nextPhase);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phases]);

  /** ✅ Ensure block is valid for current phase */
  useEffect(() => {
    if (!blocks.includes(block)) {
      const nextBlock = blocks[0] ?? "Block 1";
      setBlock(nextBlock);
      writeString(KEY_BLOCK, nextBlock);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  /** ✅ Persist phase+block every change */
  useEffect(() => {
    writeString(KEY_PHASE, phase);
  }, [phase]);

  useEffect(() => {
    writeString(KEY_BLOCK, block);
  }, [block]);

  /** ✅ Restore expanded lot when phase/block changes */
  useEffect(() => {
    const remembered = readExpandedLot(phase, block);
    setExpandedLot(remembered);
  }, [phase, block]);

  // Search + phase + block filter
  const filteredResidents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return residents.filter((r) => {
      const inPhase = r.phase === phase;
      const inBlock = r.block === block;
      if (!inPhase || !inBlock) return false;

      if (!q) return true;

      const hay = [
        r.firstName,
        r.middleName ?? "",
        r.lastName,
        r.email ?? "",
        r.contactNumber ?? "",
        r.lot,
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [residents, phase, block, query]);

  const LOTS_PER_BLOCK = 5;

  const lotRows = useMemo(() => {
    const map = new Map<number, Resident>();
    for (const r of filteredResidents) map.set(lotNumber(r.lot), r);

    return Array.from({ length: LOTS_PER_BLOCK }, (_, i) => {
      const lotNo = i + 1;
      return { lotNo, resident: map.get(lotNo) ?? null };
    });
  }, [filteredResidents]);

  const selectedResident = useMemo(() => {
    if (!selectedResidentId) return null;
    return residents.find((r) => r.id === selectedResidentId) ?? null;
  }, [residents, selectedResidentId]);

  const canEdit = Boolean(selectedResident);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="lg:hidden flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Residents
          </p>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">
            List of Residents
          </h1>
        </div>
      </div>

      {/* Actions row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[auto_auto_1fr] lg:items-center">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            to="/admin/users/new"
            className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
          >
            <Plus size={18} />
            Add New
          </Link>

          <Link
            to={canEdit ? `/admin/users/${selectedResident!.id}/edit` : "#"}
            onClick={(e) => {
              if (!canEdit) e.preventDefault();
            }}
            className={cx(
              "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold shadow-sm ring-1 focus:outline-none",
              canEdit
                ? "cursor-pointer bg-white text-zinc-900 ring-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 focus:ring-4 focus:ring-emerald-200"
                : "bg-zinc-100 text-zinc-400 ring-zinc-200 cursor-not-allowed",
            )}
          >
            <Pencil size={18} />
            Edit
          </Link>
        </div>

        {/* Search */}
        <div className="relative lg:col-span-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <AppInput
            value={query}
            className="h-12 w-full pl-11 pr-23"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, lot..."
          />
        </div>
      </div>

      {/* Phase + Block (HeadlessUI modern) */}
      <div className="grid gap-2 sm:grid-cols-2">
        <SelectListbox
          label="Phase"
          value={phase}
          options={phases}
          onChange={(v) => {
            setPhase(v);

            const nextBlocks = Array.from(
              new Set(
                residents.filter((r) => r.phase === v).map((r) => r.block),
              ),
            ).sort();

            const rememberedBlock = readString(KEY_BLOCK, "Block 1");
            const nextBlock = nextBlocks.includes(rememberedBlock)
              ? rememberedBlock
              : (nextBlocks[0] ?? "Block 1");

            setBlock(nextBlock);

            const rememberedLot = readExpandedLot(v, nextBlock);
            setExpandedLot(rememberedLot);

            setSelectedResidentId(null);
          }}
        />

        <SelectListbox
          label="Block"
          value={block}
          options={blocks}
          onChange={(v) => {
            setBlock(v);

            const rememberedLot = readExpandedLot(phase, v);
            setExpandedLot(rememberedLot);

            setSelectedResidentId(null);
          }}
        />
      </div>

      {/* Lot rows */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
        {lotRows.map(({ lotNo, resident }) => {
          const open = expandedLot === lotNo;
          const isSelected = resident
            ? resident.id === selectedResidentId
            : false;

          return (
            <div
              key={lotNo}
              className={cx(
                "border-t border-zinc-200 first:border-t-0",
                isSelected && "bg-emerald-50/30",
              )}
            >
              <button
                type="button"
                onClick={() => {
                  const next = open ? null : lotNo;
                  setExpandedLot(next);
                  writeExpandedLot(phase, block, next);

                  setSelectedResidentId(resident ? resident.id : null);
                }}
                className="w-full cursor-pointer flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-50 active:bg-zinc-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-extrabold text-emerald-800 ring-1 ring-emerald-100">
                    Lot {lotNo}
                  </span>

                  <div className="min-w-0">
                    {resident ? (
                      <>
                        <p className="truncate text-sm font-extrabold text-zinc-900">
                          {resident.firstName} {resident.lastName}
                        </p>
                        <p className="text-xs font-semibold text-zinc-500">
                          {resident.residencyType ?? "—"} •{" "}
                          {resident.occupancyType ?? "—"}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="truncate text-sm font-extrabold text-zinc-400">
                          No resident assigned
                        </p>
                        <p className="text-xs font-semibold text-zinc-400">
                          Empty lot
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <ChevronDown
                  size={18}
                  className={cx(
                    "shrink-0 text-zinc-400 transition",
                    open && "rotate-180",
                  )}
                />
              </button>

              {open ? (
                <div className="border-t border-zinc-200 bg-white px-4 py-4">
                  {!resident ? (
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-sm font-semibold text-zinc-700">
                        This lot has no resident yet.
                      </p>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">
                        Add a resident and assign them to Lot {lotNo}.
                      </p>
                      <div className="mt-3">
                        <Link
                          to="/admin/users/new"
                          className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700"
                        >
                          <Plus size={18} />
                          Add New
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <ResidentCard resident={resident} />
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -----------------------
 * Modern Listbox Select
 * ----------------------*/
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
          <ChevronDown
            size={18}
            className="text-white/90 transition group-hover:text-white"
          />
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
          <ListboxOptions className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-emerald-200 bg-white p-1 shadow-2xl outline-none ring-1 ring-black/5">
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

function ResidentCard({ resident }: { resident: Resident }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[96px_1fr]">
      <div className="flex items-start gap-3 sm:flex-col">
        <div className="grid size-20 place-items-center overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200">
          {resident.avatarUrl ? (
            <img
              src={resident.avatarUrl}
              alt={`${resident.firstName} ${resident.lastName}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound className="text-zinc-400" />
          )}
        </div>

        <div className="sm:hidden">
          <p className="text-sm font-extrabold text-zinc-900">
            {resident.firstName} {resident.lastName}
          </p>
          <p className="text-xs font-semibold text-zinc-500">
            {resident.phase} • {resident.block} • {resident.lot}
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="border-b border-zinc-200 px-4 py-3">
          <div className="hidden sm:block">
            <p className="text-sm font-extrabold text-zinc-900">
              {resident.firstName}{" "}
              {resident.middleName ? `${resident.middleName} ` : ""}
              {resident.lastName}
            </p>
            <p className="mt-1 text-xs font-semibold text-zinc-500">
              {resident.phase} • {resident.block} • {resident.lot}
            </p>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            <Row label="First Name" value={resident.firstName} />
            <Row label="Middle Name" value={resident.middleName ?? "—"} />
            <Row label="Last Name" value={resident.lastName} />
            <Row label="Contact Number" value={resident.contactNumber ?? "—"} />
            <Row label="Email" value={resident.email ?? "—"} />
            <Row label="Residency Type" value={resident.residencyType ?? "—"} />
            <Row label="Occupancy Type" value={resident.occupancyType ?? "—"} />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              to={`/admin/users/${resident.id}`}
              className="cursor-pointer inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-black"
            >
              View Profile
            </Link>

            <Link
              to={`/admin/users/${resident.id}/edit`}
              className="cursor-pointer inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700"
            >
              Edit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
      <span className="text-xs font-bold text-zinc-600">{label}:</span>
      <span className="text-xs font-extrabold text-zinc-900">{value}</span>
    </div>
  );
}
