import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Pencil,
  Plus,
  Search,
  UserRound,
  Check,
  X,
  Trash2,
  Settings2,
  MapPin,
  AlertTriangle,
  Unlink,
} from "lucide-react";
import {
  Dialog,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import AppInput from "../../components/AppInput";

/**
 * ✅ FIXED BUG:
 * Lots can have assignedResidentId, but UI previously matched residents ONLY by lot number.
 * Result: Lot shows "Assigned" in Manage but main UI shows "No resident assigned".
 *
 * ✅ What changed:
 * - Main list now resolves resident by:
 *    1) lotNode.assignedResidentId (authoritative)
 *    2) fallback to resident.lot label match (legacy)
 * - If assignedResidentId points to a missing resident → show "Assigned resident missing" warning
 * - Manage modal shows warnings for missing assignments + adds "Clear assignment" button
 * - Delete confirmation only blocks when assignment is VALID (resident exists)
 */

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
  lot: string; // "Lot 1"
};

type PhaseNode = {
  id: string;
  name: string;
  blocks: Array<{ id: string; name: string }>;
};

type LotNode = {
  id: string; // unique across db
  phaseId: string;
  blockId: string;
  lotNo: number;
  label: string;
  status?: "Occupied" | "Vacant";
  assignedResidentId?: string | null;
  createdAt?: number;
  updatedAt?: number;
};

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter(Boolean).join(" ");

const lotNumber = (lotLabel: string) => {
  const n = Number(lotLabel.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** sessionStorage keys */
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
  } catch {}
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
  } catch {}
}

export default function AdminListOfResidentsPage() {
  // demo residents (replace with db)
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

  const residentById = useMemo(() => {
    const m = new Map<string, Resident>();
    for (const r of residents) m.set(r.id, r);
    return m;
  }, [residents]);

  const residentIdSet = useMemo(
    () => new Set(residents.map((r) => r.id)),
    [residents],
  );

  // DB state
  const [phaseNodes, setPhaseNodes] = useState<PhaseNode[]>([]);
  const [pbLoading, setPbLoading] = useState(true);

  const [lots, setLots] = useState<LotNode[]>([]);
  const [lotsLoading, setLotsLoading] = useState(true);

  const [query, setQuery] = useState("");

  const [phase, setPhase] = useState<string>(() =>
    readString(KEY_PHASE, "Phase 1"),
  );
  const [block, setBlock] = useState<string>(() =>
    readString(KEY_BLOCK, "Block 1"),
  );

  const [expandedLot, setExpandedLot] = useState<number | null>(() =>
    readExpandedLot(
      readString(KEY_PHASE, "Phase 1"),
      readString(KEY_BLOCK, "Block 1"),
    ),
  );

  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(
    null,
  );

  const selectedResident = useMemo(() => {
    if (!selectedResidentId) return null;
    return residents.find((r) => r.id === selectedResidentId) ?? null;
  }, [residents, selectedResidentId]);

  const canEdit = Boolean(selectedResident);

  /** request guards */
  const nodesReqId = useRef(0);
  const lotsReqId = useRef(0);

  /** derived */
  const phases = useMemo(() => {
    const fromDb = phaseNodes.map((p) => p.name).sort();
    if (fromDb.length) return fromDb;
    const unique = Array.from(new Set(residents.map((r) => r.phase))).sort();
    return unique.length ? unique : ["Phase 1"];
  }, [phaseNodes, residents]);

  const blocks = useMemo(() => {
    const node = phaseNodes.find((p) => p.name === phase);
    const fromDb = node?.blocks.map((b) => b.name).sort() ?? [];
    if (fromDb.length) return fromDb;

    const filteredByPhase = residents.filter((r) => r.phase === phase);
    const unique = Array.from(
      new Set(filteredByPhase.map((r) => r.block)),
    ).sort();
    return unique.length ? unique : ["Block 1"];
  }, [phaseNodes, residents, phase]);

  const loadPhaseNodes = async () => {
    const req = ++nodesReqId.current;
    setPbLoading(true);
    try {
      const nodes = await mock_getPhasesWithBlocks();
      if (req !== nodesReqId.current) return;
      setPhaseNodes(nodes);
      return nodes;
    } finally {
      if (req === nodesReqId.current) setPbLoading(false);
    }
  };

  /** ✅ Loads lots ONLY from DB (no auto-ensure) */
  const loadLotsFor = async (
    nodes: PhaseNode[],
    phaseName: string,
    blockName: string,
  ) => {
    const req = ++lotsReqId.current;
    setLotsLoading(true);
    try {
      const phaseId = phaseIdByName(nodes, phaseName);
      const blockId = blockIdByName(nodes, phaseName, blockName);
      if (!phaseId || !blockId) {
        if (req === lotsReqId.current) setLots([]);
        return;
      }
      const data = await mock_getLots(phaseId, blockId);
      if (req === lotsReqId.current) setLots(data);
    } finally {
      if (req === lotsReqId.current) setLotsLoading(false);
    }
  };

  const pickValidSelection = (
    nodes: PhaseNode[],
    desiredPhase: string,
    desiredBlock: string,
  ) => {
    const phaseName = nodes.some((p) => p.name === desiredPhase)
      ? desiredPhase
      : (nodes[0]?.name ?? "Phase 1");

    const blockOptions = blocksForPhaseName(nodes, phaseName);
    const blockName = blockOptions.includes(desiredBlock)
      ? desiredBlock
      : (blockOptions[0] ?? "Block 1");

    return { phaseName, blockName };
  };

  /** initial load */
  useEffect(() => {
    (async () => {
      const nodes = await loadPhaseNodes();
      if (!nodes) return;
      const { phaseName, blockName } = pickValidSelection(nodes, phase, block);

      setPhase(phaseName);
      setBlock(blockName);
      writeString(KEY_PHASE, phaseName);
      writeString(KEY_BLOCK, blockName);

      await loadLotsFor(nodes, phaseName, blockName);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => writeString(KEY_PHASE, phase), [phase]);
  useEffect(() => writeString(KEY_BLOCK, block), [block]);

  useEffect(() => {
    const remembered = readExpandedLot(phase, block);
    setExpandedLot(remembered);
  }, [phase, block]);

  const onChangePhase = async (nextPhase: string) => {
    setPhase(nextPhase);
    setSelectedResidentId(null);

    const nextBlocks = blocksForPhaseName(phaseNodes, nextPhase);
    const nextBlock = nextBlocks[0] ?? "Block 1";
    setBlock(nextBlock);

    await loadLotsFor(phaseNodes, nextPhase, nextBlock);
  };

  const onChangeBlock = async (nextBlock: string) => {
    setBlock(nextBlock);
    setSelectedResidentId(null);
    await loadLotsFor(phaseNodes, phase, nextBlock);
  };

  const applyManagerSelection = async (opts: {
    phaseName: string;
    blockName: string;
  }) => {
    const nodes = await loadPhaseNodes();
    if (!nodes) return;

    const { phaseName, blockName } = pickValidSelection(
      nodes,
      opts.phaseName,
      opts.blockName,
    );

    setPhase(phaseName);
    setBlock(blockName);
    setSelectedResidentId(null);
    await loadLotsFor(nodes, phaseName, blockName);
  };

  const filteredResidents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return residents.filter((r) => {
      if (r.phase !== phase || r.block !== block) return false;
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

  /**
   * ✅ FIX:
   * Use lot.assignedResidentId (authoritative), fallback to lotNo mapping for legacy data.
   * Also detect "ghost assignments" (assignedResidentId exists but resident missing).
   */
  const lotRows = useMemo(() => {
    const resByLotNo = new Map<number, Resident>();
    for (const r of filteredResidents) resByLotNo.set(lotNumber(r.lot), r);

    const lotList = [...lots].sort((a, b) => a.lotNo - b.lotNo);

    return lotList.map((l) => {
      const assignedId = l.assignedResidentId ?? null;
      const assignedResident = assignedId
        ? (residentById.get(assignedId) ?? null)
        : null;

      // fallback: if no assignedResidentId, try match by lotNo (legacy)
      const fallbackResident = !assignedId
        ? (resByLotNo.get(l.lotNo) ?? null)
        : null;

      const resident = assignedResident ?? fallbackResident;
      const ghostAssigned = Boolean(assignedId && !assignedResident);

      return {
        lotNo: l.lotNo,
        lotNode: l,
        resident,
        ghostAssigned,
        assignedId,
      };
    });
  }, [filteredResidents, lots, residentById]);

  const [manageOpen, setManageOpen] = useState(false);

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
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[auto_auto_1fr_auto] lg:items-center">
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

        {/* Manage */}
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-extrabold text-emerald-900 shadow-sm hover:bg-emerald-100 active:bg-emerald-200 focus:outline-none focus:ring-4 focus:ring-emerald-200"
        >
          <Settings2 size={18} />
          Manage
        </button>
      </div>

      {/* Phase + Block */}
      <div className="grid gap-2 sm:grid-cols-2">
        <SelectListbox
          label="Phase"
          value={phase}
          options={phases}
          onChange={(v) => void onChangePhase(v)}
        />

        <SelectListbox
          label="Block"
          value={block}
          options={blocks}
          onChange={(v) => void onChangeBlock(v)}
        />
      </div>

      {/* Lots list */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
        {lotsLoading ? (
          <div className="p-6">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-zinc-700">
                Loading lots…
              </p>
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                Please wait.
              </p>
            </div>
          </div>
        ) : lotRows.length === 0 ? (
          <div className="p-6">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center">
              <p className="text-sm font-semibold text-zinc-700">
                No lots found for this block.
              </p>
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                Open Manage to add lots.
              </p>
            </div>
          </div>
        ) : (
          lotRows.map(
            ({ lotNo, lotNode, resident, ghostAssigned, assignedId }) => {
              const open = expandedLot === lotNo;
              const isSelected = resident
                ? resident.id === selectedResidentId
                : false;

              const rowKey = `${phase}|${block}|${lotNode.id}`;

              return (
                <div
                  key={rowKey}
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

                      // ✅ if ghost assignment, do NOT select a fake resident
                      setSelectedResidentId(resident ? resident.id : null);
                    }}
                    className="w-full cursor-pointer flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-50 active:bg-zinc-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-extrabold text-emerald-800 ring-1 ring-emerald-100">
                        {lotNode.label}
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
                        ) : ghostAssigned ? (
                          <>
                            <p className="truncate text-sm font-extrabold text-amber-900">
                              Assigned resident missing
                            </p>
                            <p className="text-xs font-semibold text-amber-700">
                              Assigned ID: {assignedId} • Fix in Manage
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="truncate text-sm font-extrabold text-zinc-400">
                              No resident assigned
                            </p>
                            <p className="text-xs font-semibold text-zinc-400">
                              {lotNode.status ?? "Vacant"}
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
                      {resident ? (
                        <ResidentCard resident={resident} />
                      ) : ghostAssigned ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-900 ring-1 ring-amber-200">
                              <AlertTriangle size={16} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-amber-950">
                                This lot points to a resident that doesn’t
                                exist.
                              </p>
                              <p className="mt-1 text-xs font-semibold text-amber-800">
                                Lot: {lotNode.label} • AssignedResidentId:{" "}
                                <span className="font-black">{assignedId}</span>
                              </p>
                              <p className="mt-2 text-xs font-semibold text-amber-800">
                                Fix: open{" "}
                                <span className="font-black">Manage</span> →
                                Lots → click{" "}
                                <span className="font-black">Clear</span> on
                                this lot (or delete the lot).
                              </p>

                              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <button
                                  type="button"
                                  onClick={() => setManageOpen(true)}
                                  className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700"
                                >
                                  <Settings2 size={18} />
                                  Open Manage
                                </button>

                                <span className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-extrabold text-amber-950">
                                  <MapPin size={18} />
                                  {phase} • {block}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <p className="text-sm font-semibold text-zinc-700">
                            This lot has no resident yet.
                          </p>
                          <p className="mt-1 text-xs font-semibold text-zinc-500">
                            Assign a resident to {lotNode.label}.
                          </p>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <Link
                              to="/admin/users/new"
                              className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700"
                            >
                              <Plus size={18} />
                              Add New
                            </Link>

                            <span className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-extrabold text-zinc-900">
                              <MapPin size={18} />
                              {phase} • {block}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            },
          )
        )}
      </div>

      {/* Manager Modal */}
      <PhaseBlockLotManager
        open={manageOpen}
        loading={pbLoading}
        initialNodes={phaseNodes}
        initialPhaseName={phase}
        initialBlockName={block}
        residentIdSet={residentIdSet}
        onRequestClose={async (result) => {
          setManageOpen(false);
          if (result) await applyManagerSelection(result);
          else
            await applyManagerSelection({ phaseName: phase, blockName: block });
        }}
      />
    </div>
  );
}

/* -----------------------
 * ✅ Manager Modal (standard + delete anything)
 * ----------------------*/
function PhaseBlockLotManager({
  open,
  onRequestClose,
  initialNodes,
  initialPhaseName,
  initialBlockName,
  loading,
  residentIdSet,
}: {
  open: boolean;
  onRequestClose: (result?: { phaseName: string; blockName: string }) => void;
  initialNodes: PhaseNode[];
  initialPhaseName: string;
  initialBlockName: string;
  loading: boolean;
  residentIdSet: Set<string>;
}) {
  const [nodes, setNodes] = useState<PhaseNode[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<string>("");
  const [activeBlockId, setActiveBlockId] = useState<string>("");

  const [newPhase, setNewPhase] = useState("");
  const [newBlock, setNewBlock] = useState("");

  const [lots, setLots] = useState<LotNode[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);

  const [newLotNo, setNewLotNo] = useState<string>("");
  const [bulkFrom, setBulkFrom] = useState<string>("1");
  const [bulkTo, setBulkTo] = useState<string>("10");

  const lotsReqId = useRef(0);

  useEffect(() => {
    if (!open) return;

    const cloned = JSON.parse(JSON.stringify(initialNodes)) as PhaseNode[];
    setNodes(cloned);

    const byName =
      cloned.find((p) => p.name === initialPhaseName) ?? cloned[0] ?? null;
    const phaseId = byName?.id ?? "";
    setActivePhaseId(phaseId);

    const blocks = byName?.blocks ?? [];
    const blockByName =
      blocks.find((b) => b.name === initialBlockName) ?? blocks[0] ?? null;
    setActiveBlockId(blockByName?.id ?? "");

    setNewPhase("");
    setNewBlock("");
    setNewLotNo("");
  }, [open, initialNodes, initialPhaseName, initialBlockName]);

  const activePhase = useMemo(
    () => nodes.find((p) => p.id === activePhaseId) ?? nodes[0] ?? null,
    [nodes, activePhaseId],
  );

  const activeBlocks = useMemo(() => activePhase?.blocks ?? [], [activePhase]);

  const activeBlock = useMemo(
    () =>
      activeBlocks.find((b) => b.id === activeBlockId) ??
      activeBlocks[0] ??
      null,
    [activeBlocks, activeBlockId],
  );

  const refreshLots = async (phaseId: string, blockId: string) => {
    const req = ++lotsReqId.current;
    setLotsLoading(true);
    try {
      const data = await mock_getLots(phaseId, blockId);
      if (req === lotsReqId.current) setLots(data);
    } finally {
      if (req === lotsReqId.current) setLotsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!activePhase?.id || !activeBlock?.id) {
      setLots([]);
      return;
    }
    void refreshLots(activePhase.id, activeBlock.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activePhase?.id, activeBlock?.id]);

  const busy = loading;

  const addPhaseUI = async () => {
    const name = newPhase.trim();
    if (!name) return;

    const id = await mock_addPhase(name);
    if (!id) return;

    const clean = normalizeLabel(name);
    setNodes((prev) =>
      prev.some((p) => p.id === id)
        ? prev
        : [...prev, { id, name: clean, blocks: [] }],
    );

    setActivePhaseId(id);
    setActiveBlockId("");
    setNewPhase("");
    setLots([]);
  };

  const deletePhaseUI = async (phaseId: string) => {
    const anyLots = Object.keys(MOCK_LOTS).some((k) =>
      k.startsWith(`${phaseId}|`),
    );
    if (anyLots) {
      const ok = window.confirm(
        "This phase has lots. Deleting it will also delete ALL its blocks and lots. Continue?",
      );
      if (!ok) return;
    }

    await mock_deletePhase(phaseId);

    setNodes((prev) => {
      const next = prev.filter((p) => p.id !== phaseId);
      if (activePhaseId === phaseId) {
        const np = next[0] ?? null;
        setActivePhaseId(np?.id ?? "");
        setActiveBlockId(np?.blocks[0]?.id ?? "");
        setLots([]);
      }
      return next;
    });
  };

  const addBlockUI = async () => {
    if (!activePhase?.id) return;
    const name = newBlock.trim();
    if (!name) return;

    const createdBlockId = await mock_addBlock(activePhase.id, name);
    if (!createdBlockId) return;

    const clean = normalizeLabel(name);

    setNodes((prev) =>
      prev.map((p) =>
        p.id !== activePhase.id
          ? p
          : {
              ...p,
              blocks: [...p.blocks, { id: createdBlockId, name: clean }],
            },
      ),
    );

    setActiveBlockId(createdBlockId);
    setNewBlock("");
    setLots([]);
    void refreshLots(activePhase.id, createdBlockId);
  };

  const deleteBlockUI = async (phaseId: string, blockId: string) => {
    const hasLots = (MOCK_LOTS[lotKey(phaseId, blockId)]?.length ?? 0) > 0;
    if (hasLots) {
      const ok = window.confirm(
        "This block has lots. Deleting it will delete ALL its lots. Continue?",
      );
      if (!ok) return;
    }

    await mock_deleteBlock(phaseId, blockId);

    setNodes((prev) => {
      const next = prev.map((p) =>
        p.id !== phaseId
          ? p
          : { ...p, blocks: p.blocks.filter((b) => b.id !== blockId) },
      );

      if (activePhaseId === phaseId && activeBlockId === blockId) {
        const phase = next.find((p) => p.id === phaseId) ?? null;
        const nb = phase?.blocks[0]?.id ?? "";
        setActiveBlockId(nb);
        setLots([]);
        if (nb) void refreshLots(phaseId, nb);
      }

      return next;
    });
  };

  const addLotUI = async () => {
    if (!activePhase?.id || !activeBlock?.id) return;
    const n = Number(newLotNo);
    if (!Number.isFinite(n) || n <= 0) return;

    await mock_addLot(activePhase.id, activeBlock.id, n);
    setNewLotNo("");
    await refreshLots(activePhase.id, activeBlock.id);
  };

  const addBulkLotsUI = async () => {
    if (!activePhase?.id || !activeBlock?.id) return;

    const from = Number(bulkFrom);
    const to = Number(bulkTo);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;

    const a = Math.max(1, Math.min(9999, Math.trunc(from)));
    const b = Math.max(1, Math.min(9999, Math.trunc(to)));
    const start = Math.min(a, b);
    const end = Math.max(a, b);

    await mock_addLotsRange(activePhase.id, activeBlock.id, start, end);
    await refreshLots(activePhase.id, activeBlock.id);
  };

  const clearAssignmentUI = async (lot: LotNode) => {
    if (!activePhase?.id || !activeBlock?.id) return;
    await mock_setLotAssignment(activePhase.id, activeBlock.id, lot.id, null);
    await refreshLots(activePhase.id, activeBlock.id);
  };

  const deleteLotUI = async (lot: LotNode) => {
    if (!activePhase?.id || !activeBlock?.id) return;

    const assignedId = lot.assignedResidentId ?? null;
    const assignedIsValid = Boolean(
      assignedId && residentIdSet.has(assignedId),
    );

    // ✅ Only block delete if assignment is VALID (resident exists)
    if (assignedIsValid) {
      const ok = window.confirm(
        `${lot.label} is assigned to a resident. Delete anyway?`,
      );
      if (!ok) return;
    }

    await mock_deleteLot(activePhase.id, activeBlock.id, lot.id);
    await refreshLots(activePhase.id, activeBlock.id);
  };

  const closeAndApply = () => {
    const phaseName = activePhase?.name ?? initialPhaseName;
    const blockName = activeBlock?.name ?? initialBlockName;
    onRequestClose({ phaseName, blockName });
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[70]" onClose={closeAndApply}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-emerald-100">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-emerald-100 p-5">
                  <div>
                    <Dialog.Title className="text-lg font-black tracking-tight text-zinc-900">
                      Manage Phase • Block • Lots
                    </Dialog.Title>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">
                      Selected:{" "}
                      <span className="text-zinc-900">
                        {activePhase?.name ?? "—"} • {activeBlock?.name ?? "—"}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={closeAndApply}
                    className="cursor-pointer grid size-10 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 active:bg-emerald-200"
                    aria-label="Close"
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr_1.35fr]">
                  {/* Phases */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-zinc-900">
                        Phases
                      </h3>
                      {busy ? (
                        <span className="text-xs font-semibold text-zinc-500">
                          Loading…
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <AppInput
                        value={newPhase}
                        onChange={(e) => setNewPhase(e.target.value)}
                        placeholder="e.g. Phase 3"
                        className="h-11 w-full"
                      />
                      <button
                        type="button"
                        onClick={() => void addPhaseUI()}
                        disabled={busy || !newPhase.trim()}
                        className={cx(
                          "h-11 shrink-0 rounded-2xl px-4 text-xs font-extrabold",
                          "bg-linear-to-r from-emerald-600 to-emerald-700 text-white",
                          "hover:from-emerald-500 hover:to-emerald-700 active:from-emerald-700 active:to-emerald-800",
                          (busy || !newPhase.trim()) &&
                            "opacity-50 cursor-not-allowed",
                        )}
                      >
                        Add
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {nodes.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center">
                          <p className="text-sm font-semibold text-zinc-700">
                            No phases yet.
                          </p>
                        </div>
                      ) : (
                        nodes
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((p) => {
                            const active = activePhase?.id === p.id;
                            return (
                              <div
                                key={p.id}
                                className={cx(
                                  "flex items-center justify-between gap-2 rounded-2xl border px-3 py-2",
                                  active
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-zinc-200 bg-white",
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePhaseId(p.id);
                                    setActiveBlockId(p.blocks[0]?.id ?? "");
                                  }}
                                  className="text-left min-w-0 flex-1"
                                >
                                  <p className="truncate text-sm font-extrabold text-zinc-900">
                                    {p.name}
                                  </p>
                                  <p className="text-xs font-semibold text-zinc-500">
                                    {p.blocks.length} block
                                    {p.blocks.length === 1 ? "" : "s"}
                                  </p>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void deletePhaseUI(p.id)}
                                  disabled={busy}
                                  className={cx(
                                    "grid size-10 place-items-center rounded-2xl border",
                                    "border-rose-200 bg-rose-50 text-rose-900",
                                    "hover:bg-rose-100 active:bg-rose-200",
                                    busy && "opacity-50 cursor-not-allowed",
                                  )}
                                  aria-label={`Delete ${p.name}`}
                                  title={`Delete ${p.name}`}
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </section>

                  {/* Blocks */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-zinc-900">
                        Blocks {activePhase ? `• ${activePhase.name}` : ""}
                      </h3>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <AppInput
                        value={newBlock}
                        onChange={(e) => setNewBlock(e.target.value)}
                        placeholder="e.g. Block 3"
                        className="h-11 w-full"
                      />
                      <button
                        type="button"
                        onClick={() => void addBlockUI()}
                        disabled={busy || !newBlock.trim() || !activePhase?.id}
                        className={cx(
                          "h-11 shrink-0 rounded-2xl px-4 text-xs font-extrabold",
                          "bg-linear-to-r from-emerald-600 to-emerald-700 text-white",
                          "hover:from-emerald-500 hover:to-emerald-700 active:from-emerald-700 active:to-emerald-800",
                          (busy || !newBlock.trim() || !activePhase?.id) &&
                            "opacity-50 cursor-not-allowed",
                        )}
                      >
                        Add
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {!activePhase ? (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center">
                          <p className="text-sm font-semibold text-zinc-700">
                            Select a phase.
                          </p>
                        </div>
                      ) : activeBlocks.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center">
                          <p className="text-sm font-semibold text-zinc-700">
                            No blocks yet.
                          </p>
                        </div>
                      ) : (
                        activeBlocks
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((b) => {
                            const isActive = activeBlock?.id === b.id;
                            return (
                              <div
                                key={`${activePhase.id}|${b.id}`}
                                className={cx(
                                  "flex items-center justify-between gap-2 rounded-2xl border px-3 py-2",
                                  isActive
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-zinc-200 bg-white",
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => setActiveBlockId(b.id)}
                                  className="text-left min-w-0 flex-1"
                                >
                                  <p className="truncate text-sm font-extrabold text-zinc-900">
                                    {b.name}
                                  </p>
                                  <p className="text-xs font-semibold text-zinc-500">
                                    ID: {b.id}
                                  </p>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void deleteBlockUI(activePhase.id, b.id)
                                  }
                                  disabled={busy || !activePhase?.id}
                                  className={cx(
                                    "grid size-10 place-items-center rounded-2xl border",
                                    "border-rose-200 bg-rose-50 text-rose-900",
                                    "hover:bg-rose-100 active:bg-rose-200",
                                    (busy || !activePhase?.id) &&
                                      "opacity-50 cursor-not-allowed",
                                  )}
                                  aria-label={`Delete ${b.name}`}
                                  title={`Delete ${b.name}`}
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </section>

                  {/* Lots */}
                  <section className="rounded-3xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-zinc-900">
                        Lots{" "}
                        {activePhase && activeBlock
                          ? `• ${activePhase.name} / ${activeBlock.name}`
                          : ""}
                      </h3>
                      {lotsLoading ? (
                        <span className="text-xs font-semibold text-zinc-500">
                          Loading…
                        </span>
                      ) : null}
                    </div>

                    {/* Add single lot */}
                    <div className="mt-3 flex gap-2">
                      <AppInput
                        value={newLotNo}
                        onChange={(e) => setNewLotNo(e.target.value)}
                        placeholder="Add lot no. (e.g. 12)"
                        className="h-11 w-full"
                      />
                      <button
                        type="button"
                        onClick={() => void addLotUI()}
                        disabled={
                          !activePhase?.id ||
                          !activeBlock?.id ||
                          !newLotNo.trim()
                        }
                        className={cx(
                          "h-11 shrink-0 rounded-2xl px-4 text-xs font-extrabold",
                          "bg-linear-to-r from-emerald-600 to-emerald-700 text-white",
                          "hover:from-emerald-500 hover:to-emerald-700 active:from-emerald-700 active:to-emerald-800",
                          (!activePhase?.id ||
                            !activeBlock?.id ||
                            !newLotNo.trim()) &&
                            "opacity-50 cursor-not-allowed",
                        )}
                      >
                        Add
                      </button>
                    </div>

                    {/* Bulk create */}
                    <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-900 ring-1 ring-amber-200">
                          <AlertTriangle size={16} />
                        </span>
                        <p className="text-xs font-semibold text-zinc-600">
                          Bulk create only runs when you click it (won’t auto
                          re-add deleted lots).
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <AppInput
                          value={bulkFrom}
                          onChange={(e) => setBulkFrom(e.target.value)}
                          placeholder="From (e.g. 1)"
                          className="h-11 w-full"
                        />
                        <AppInput
                          value={bulkTo}
                          onChange={(e) => setBulkTo(e.target.value)}
                          placeholder="To (e.g. 20)"
                          className="h-11 w-full"
                        />
                        <button
                          type="button"
                          onClick={() => void addBulkLotsUI()}
                          disabled={!activePhase?.id || !activeBlock?.id}
                          className={cx(
                            "h-11 rounded-2xl px-4 text-xs font-extrabold",
                            "bg-zinc-900 text-white hover:bg-black",
                            (!activePhase?.id || !activeBlock?.id) &&
                              "opacity-50 cursor-not-allowed",
                          )}
                        >
                          Create
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {!activePhase || !activeBlock ? (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center">
                          <p className="text-sm font-semibold text-zinc-700">
                            Select a phase and block.
                          </p>
                        </div>
                      ) : lots.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-center">
                          <p className="text-sm font-semibold text-zinc-700">
                            No lots found.
                          </p>
                          <p className="mt-1 text-xs font-semibold text-zinc-500">
                            Add lots above.
                          </p>
                        </div>
                      ) : (
                        lots
                          .slice()
                          .sort((a, b) => a.lotNo - b.lotNo)
                          .map((l) => {
                            const assignedId = l.assignedResidentId ?? null;
                            const assignedValid = Boolean(
                              assignedId && residentIdSet.has(assignedId),
                            );
                            const assignedMissing = Boolean(
                              assignedId && !assignedValid,
                            );

                            return (
                              <div
                                key={`${l.phaseId}|${l.blockId}|${l.id}`}
                                className={cx(
                                  "flex items-center justify-between gap-2 rounded-2xl border px-3 py-2",
                                  assignedMissing
                                    ? "border-amber-200 bg-amber-50"
                                    : "border-zinc-200 bg-white",
                                )}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-extrabold text-zinc-900">
                                    {l.label}
                                  </p>
                                  <p
                                    className={cx(
                                      "text-xs font-semibold",
                                      assignedMissing
                                        ? "text-amber-800"
                                        : "text-zinc-500",
                                    )}
                                  >
                                    {l.status ?? "Vacant"}
                                    {assignedId
                                      ? assignedValid
                                        ? " • Assigned"
                                        : " • Assigned (missing resident)"
                                      : ""}{" "}
                                    • ID: {l.id}
                                    {assignedMissing
                                      ? ` • assignedResidentId: ${assignedId}`
                                      : ""}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  {assignedId ? (
                                    <button
                                      type="button"
                                      onClick={() => void clearAssignmentUI(l)}
                                      className={cx(
                                        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold",
                                        assignedMissing
                                          ? "border-amber-200 bg-white text-amber-950 hover:bg-amber-100"
                                          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
                                      )}
                                      title="Clear assignment"
                                    >
                                      <Unlink size={16} />
                                      Clear
                                    </button>
                                  ) : null}

                                  <button
                                    type="button"
                                    onClick={() => void deleteLotUI(l)}
                                    disabled={busy}
                                    className={cx(
                                      "grid size-10 place-items-center rounded-2xl border",
                                      "border-rose-200 bg-rose-50 text-rose-900",
                                      "hover:bg-rose-100 active:bg-rose-200",
                                      busy && "opacity-50 cursor-not-allowed",
                                    )}
                                    aria-label={`Delete ${l.label}`}
                                    title={`Delete ${l.label}`}
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </section>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-emerald-100 bg-white p-5">
                  <p className="text-xs font-semibold text-zinc-500">
                    Fix tip: if you see “Assigned (missing resident)”, click{" "}
                    <b>Clear</b>.
                  </p>

                  <button
                    type="button"
                    onClick={closeAndApply}
                    className="cursor-pointer h-10 rounded-2xl bg-linear-to-r from-emerald-600 to-emerald-700 px-4 text-xs font-extrabold text-white hover:from-emerald-500 hover:to-emerald-700 active:from-emerald-700 active:to-emerald-800"
                  >
                    Done
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

/* -----------------------
 * SelectListbox
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

/* -----------------------
 * ResidentCard
 * ----------------------*/
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

/* -----------------------
 * Helpers
 * ----------------------*/
function blocksForPhaseName(nodes: PhaseNode[], phaseName: string) {
  const node = nodes.find((p) => p.name === phaseName);
  return (node?.blocks ?? []).map((b) => b.name).sort();
}
function phaseIdByName(nodes: PhaseNode[], phaseName: string) {
  return nodes.find((p) => p.name === phaseName)?.id ?? "";
}
function blockIdByName(
  nodes: PhaseNode[],
  phaseName: string,
  blockName: string,
) {
  const phase = nodes.find((p) => p.name === phaseName);
  return phase?.blocks.find((b) => b.name === blockName)?.id ?? "";
}

/* -----------------------
 * ✅ MOCK DB — replace with Firestore
 * ----------------------*/
let MOCK_DB: PhaseNode[] = [
  {
    id: "phase-1",
    name: "Phase 1",
    blocks: [
      { id: "block-1", name: "Block 1" },
      { id: "block-2", name: "Block 2" },
    ],
  },
  {
    id: "phase-2",
    name: "Phase 2",
    blocks: [{ id: "block-1", name: "Block 1" }],
  },
];

function normalizeLabel(input: string) {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "");
}
function makeId(label: string) {
  return normalizeLabel(label).toLowerCase().replace(/\s+/g, "-");
}
function now() {
  return Date.now();
}

async function mock_getPhasesWithBlocks(): Promise<PhaseNode[]> {
  await new Promise((r) => setTimeout(r, 120));
  return JSON.parse(JSON.stringify(MOCK_DB)) as PhaseNode[];
}

async function mock_addPhase(name: string): Promise<string | null> {
  await new Promise((r) => setTimeout(r, 80));
  const clean = normalizeLabel(name);
  if (!clean) return null;

  const base = makeId(clean);
  let id = base;
  let i = 2;
  while (MOCK_DB.some((p) => p.id === id)) id = `${base}-${i++}`;

  MOCK_DB = [...MOCK_DB, { id, name: clean, blocks: [] }];
  return id;
}

async function mock_deletePhase(phaseId: string) {
  await new Promise((r) => setTimeout(r, 80));
  MOCK_DB = MOCK_DB.filter((p) => p.id !== phaseId);
  for (const key of Object.keys(MOCK_LOTS)) {
    if (key.startsWith(`${phaseId}|`)) delete MOCK_LOTS[key];
  }
}

async function mock_addBlock(
  phaseId: string,
  name: string,
): Promise<string | null> {
  await new Promise((r) => setTimeout(r, 80));
  const clean = normalizeLabel(name);
  if (!clean) return null;

  const base = makeId(clean);
  let created: string | null = null;

  MOCK_DB = MOCK_DB.map((p) => {
    if (p.id !== phaseId) return p;

    let id = base;
    let i = 2;
    while (p.blocks.some((b) => b.id === id)) id = `${base}-${i++}`;

    created = id;
    return { ...p, blocks: [...p.blocks, { id, name: clean }] };
  });

  return created;
}

async function mock_deleteBlock(phaseId: string, blockId: string) {
  await new Promise((r) => setTimeout(r, 80));
  MOCK_DB = MOCK_DB.map((p) => {
    if (p.id !== phaseId) return p;
    return { ...p, blocks: p.blocks.filter((b) => b.id !== blockId) };
  });
  delete MOCK_LOTS[lotKey(phaseId, blockId)];
}

/* -----------------------
 * ✅ MOCK LOTS DB (NO AUTO 5 LOTS)
 * ----------------------*/
const lotKey = (phaseId: string, blockId: string) => `${phaseId}|${blockId}`;
const makeLotId = (phaseId: string, blockId: string, lotNo: number) =>
  `${phaseId}:${blockId}:lot-${lotNo}`;

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

let MOCK_LOTS: Record<string, LotNode[]> = {
  [lotKey("phase-1", "block-1")]: [1, 2, 3, 4, 5].map((n) => ({
    id: makeLotId("phase-1", "block-1", n),
    phaseId: "phase-1",
    blockId: "block-1",
    lotNo: n,
    label: `Lot ${n}`,
    status: n === 3 ? "Vacant" : "Occupied",
    // NOTE: this intentionally creates a "ghost" assignment for Lot 5 (r5 doesn't exist)
    assignedResidentId: n === 3 ? null : `r${n}`,
    createdAt: now(),
    updatedAt: now(),
  })),
  [lotKey("phase-1", "block-2")]: [1, 2].map((n) => ({
    id: makeLotId("phase-1", "block-2", n),
    phaseId: "phase-1",
    blockId: "block-2",
    lotNo: n,
    label: `Lot ${n}`,
    status: "Vacant",
    assignedResidentId: null,
    createdAt: now(),
    updatedAt: now(),
  })),
  [lotKey("phase-2", "block-1")]: [1, 2, 4].map((n) => ({
    id: makeLotId("phase-2", "block-1", n),
    phaseId: "phase-2",
    blockId: "block-1",
    lotNo: n,
    label: `Lot ${n}`,
    status: n === 4 ? "Occupied" : "Vacant",
    assignedResidentId: n === 4 ? "r4" : null,
    createdAt: now(),
    updatedAt: now(),
  })),
};

function sortLots(lots: LotNode[]) {
  return [...lots].sort((a, b) => a.lotNo - b.lotNo);
}
function uniqueByLotNo(lots: LotNode[]) {
  const map = new Map<number, LotNode>();
  for (const l of lots) map.set(l.lotNo, l);
  return sortLots(Array.from(map.values()));
}

async function mock_getLots(
  phaseId: string,
  blockId: string,
): Promise<LotNode[]> {
  await new Promise((r) => setTimeout(r, 100));
  const key = lotKey(phaseId, blockId);
  const lots = MOCK_LOTS[key] ?? [];
  return JSON.parse(JSON.stringify(sortLots(lots))) as LotNode[];
}

async function mock_addLot(phaseId: string, blockId: string, lotNo: number) {
  await new Promise((r) => setTimeout(r, 80));
  const key = lotKey(phaseId, blockId);
  const n = clampInt(lotNo, 1, 9999);

  const current = uniqueByLotNo(MOCK_LOTS[key] ?? []);
  if (current.some((l) => l.lotNo === n)) return;

  MOCK_LOTS[key] = sortLots([
    ...current,
    {
      id: makeLotId(phaseId, blockId, n),
      phaseId,
      blockId,
      lotNo: n,
      label: `Lot ${n}`,
      status: "Vacant",
      assignedResidentId: null,
      createdAt: now(),
      updatedAt: now(),
    },
  ]);
}

async function mock_addLotsRange(
  phaseId: string,
  blockId: string,
  from: number,
  to: number,
) {
  await new Promise((r) => setTimeout(r, 120));
  const key = lotKey(phaseId, blockId);

  const start = clampInt(from, 1, 9999);
  const end = clampInt(to, 1, 9999);

  const current = uniqueByLotNo(MOCK_LOTS[key] ?? []);
  const existing = new Set(current.map((l) => l.lotNo));

  const toAdd: LotNode[] = [];
  for (let n = Math.min(start, end); n <= Math.max(start, end); n++) {
    if (existing.has(n)) continue;
    toAdd.push({
      id: makeLotId(phaseId, blockId, n),
      phaseId,
      blockId,
      lotNo: n,
      label: `Lot ${n}`,
      status: "Vacant",
      assignedResidentId: null,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  MOCK_LOTS[key] = sortLots([...current, ...toAdd]);
}

async function mock_setLotAssignment(
  phaseId: string,
  blockId: string,
  lotId: string,
  residentId: string | null,
) {
  await new Promise((r) => setTimeout(r, 80));
  const key = lotKey(phaseId, blockId);
  const current = MOCK_LOTS[key] ?? [];
  MOCK_LOTS[key] = current.map((l) =>
    l.id !== lotId
      ? l
      : {
          ...l,
          assignedResidentId: residentId,
          status: residentId ? "Occupied" : (l.status ?? "Vacant"),
          updatedAt: now(),
        },
  );
}

async function mock_deleteLot(phaseId: string, blockId: string, lotId: string) {
  await new Promise((r) => setTimeout(r, 80));
  const key = lotKey(phaseId, blockId);
  const current = MOCK_LOTS[key] ?? [];
  MOCK_LOTS[key] = current.filter((l) => l.id !== lotId);
}
