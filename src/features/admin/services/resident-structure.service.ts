import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../lib/firebase/firebase";

export type PhaseNode = {
  id: string;
  name: string;
  blocks: Array<{ id: string; name: string }>;
};

export type LotNode = {
  id: string;
  phaseId: string;
  blockId: string;
  lotNo: number;
  label: string;
  status?: "Occupied" | "Vacant";
  assignedResidentId?: string | null;
  createdAt?: number;
  updatedAt?: number;
};

type BlockDoc = {
  name: string;
  normalizedName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type PhaseDoc = {
  name: string;
  normalizedName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type LotDoc = {
  lotNo: number;
  label: string;
  status?: "Occupied" | "Vacant";
  assignedResidentId?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const PHASES_COLLECTION = "resident_phases";

const normalizeLabel = (input: string) =>
  input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "");

const blocksCollection = (phaseId: string) =>
  collection(db, PHASES_COLLECTION, phaseId, "blocks");

const lotsCollection = (phaseId: string, blockId: string) =>
  collection(db, PHASES_COLLECTION, phaseId, "blocks", blockId, "lots");

const toMillis = (value: unknown): number | undefined => {
  if (!value || typeof value !== "object") return undefined;
  if ("toMillis" in value && typeof (value as any).toMillis === "function") {
    return (value as any).toMillis();
  }
  return undefined;
};

function docFromPath(path: string[]) {
  if (path.length === 2) return doc(db, path[0], path[1]);
  if (path.length === 4) return doc(db, path[0], path[1], path[2], path[3]);
  if (path.length === 6) {
    return doc(db, path[0], path[1], path[2], path[3], path[4], path[5]);
  }
  throw new Error(`Unsupported Firestore path length: ${path.length}`);
}

async function commitDeletesInChunks(paths: Array<{ path: string[] }>) {
  for (let i = 0; i < paths.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = paths.slice(i, i + 400);

    for (const item of chunk) {
      batch.delete(docFromPath(item.path));
    }

    await batch.commit();
  }
}

export async function getPhasesWithBlocks(): Promise<PhaseNode[]> {
  const phaseSnapshot = await getDocs(collection(db, PHASES_COLLECTION));

  const phases = await Promise.all(
    phaseSnapshot.docs.map(async (phaseDoc) => {
      const blocksSnapshot = await getDocs(blocksCollection(phaseDoc.id));

      const blocks = blocksSnapshot.docs
        .map((blockDoc) => ({
          id: blockDoc.id,
          name: (blockDoc.data() as BlockDoc).name,
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true }),
        );

      return {
        id: phaseDoc.id,
        name: (phaseDoc.data() as PhaseDoc).name,
        blocks,
      } satisfies PhaseNode;
    }),
  );

  return phases.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}

export async function addPhase(name: string): Promise<string | null> {
  const clean = normalizeLabel(name);
  if (!clean) return null;

  const normalizedName = clean.toLowerCase();
  const phasesRef = collection(db, PHASES_COLLECTION);

  const existing = await getDocs(
    query(phasesRef, where("normalizedName", "==", normalizedName)),
  );

  if (!existing.empty) return existing.docs[0]?.id ?? null;

  const created = await addDoc(phasesRef, {
    name: clean,
    normalizedName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return created.id;
}

export async function deletePhase(phaseId: string) {
  const blocksSnapshot = await getDocs(blocksCollection(phaseId));
  const deletePaths: Array<{ path: string[] }> = [];

  for (const blockDoc of blocksSnapshot.docs) {
    const lotsSnapshot = await getDocs(lotsCollection(phaseId, blockDoc.id));

    for (const lotDoc of lotsSnapshot.docs) {
      deletePaths.push({
        path: [
          PHASES_COLLECTION,
          phaseId,
          "blocks",
          blockDoc.id,
          "lots",
          lotDoc.id,
        ],
      });
    }

    deletePaths.push({
      path: [PHASES_COLLECTION, phaseId, "blocks", blockDoc.id],
    });
  }

  deletePaths.push({ path: [PHASES_COLLECTION, phaseId] });
  await commitDeletesInChunks(deletePaths);
}

export async function phaseHasLots(phaseId: string): Promise<boolean> {
  const blocksSnapshot = await getDocs(blocksCollection(phaseId));

  for (const blockDoc of blocksSnapshot.docs) {
    const lotsSnapshot = await getDocs(lotsCollection(phaseId, blockDoc.id));
    if (!lotsSnapshot.empty) return true;
  }

  return false;
}

export async function addBlock(
  phaseId: string,
  name: string,
): Promise<string | null> {
  const clean = normalizeLabel(name);
  if (!clean) return null;

  const normalizedName = clean.toLowerCase();

  const existing = await getDocs(
    query(
      blocksCollection(phaseId),
      where("normalizedName", "==", normalizedName),
    ),
  );

  if (!existing.empty) return existing.docs[0]?.id ?? null;

  const created = await addDoc(blocksCollection(phaseId), {
    name: clean,
    normalizedName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return created.id;
}

export async function deleteBlock(phaseId: string, blockId: string) {
  const lotsSnapshot = await getDocs(lotsCollection(phaseId, blockId));

  const deletePaths = lotsSnapshot.docs.map((lotDoc) => ({
    path: [PHASES_COLLECTION, phaseId, "blocks", blockId, "lots", lotDoc.id],
  }));

  deletePaths.push({
    path: [PHASES_COLLECTION, phaseId, "blocks", blockId],
  });

  await commitDeletesInChunks(deletePaths);
}

export async function blockHasLots(
  phaseId: string,
  blockId: string,
): Promise<boolean> {
  const lotsSnapshot = await getDocs(lotsCollection(phaseId, blockId));
  return !lotsSnapshot.empty;
}

export async function getLots(
  phaseId: string,
  blockId: string,
): Promise<LotNode[]> {
  const snapshot = await getDocs(lotsCollection(phaseId, blockId));

  return snapshot.docs
    .map((lotDoc) => {
      const data = lotDoc.data() as LotDoc;

      return {
        id: lotDoc.id,
        phaseId,
        blockId,
        lotNo: data.lotNo,
        label: data.label,
        status: data.status,
        assignedResidentId: data.assignedResidentId ?? null,
        createdAt: toMillis(data.createdAt),
        updatedAt: toMillis(data.updatedAt),
      } satisfies LotNode;
    })
    .sort((a, b) => a.lotNo - b.lotNo);
}

export async function addLot(phaseId: string, blockId: string, lotNo: number) {
  const n = Math.max(1, Math.min(9999, Math.trunc(lotNo)));
  if (!Number.isFinite(n)) return;

  const existing = await getDocs(
    query(lotsCollection(phaseId, blockId), where("lotNo", "==", n)),
  );

  if (!existing.empty) return;

  await addDoc(lotsCollection(phaseId, blockId), {
    lotNo: n,
    label: `Lot ${n}`,
    status: "Vacant",
    assignedResidentId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function addLotsRange(
  phaseId: string,
  blockId: string,
  from: number,
  to: number,
) {
  const start = Math.max(1, Math.min(9999, Math.trunc(Math.min(from, to))));
  const end = Math.max(1, Math.min(9999, Math.trunc(Math.max(from, to))));

  const currentLots = await getLots(phaseId, blockId);
  const existing = new Set(currentLots.map((lot) => lot.lotNo));

  const batch = writeBatch(db);
  let pendingWrites = 0;

  for (let lotNo = start; lotNo <= end; lotNo++) {
    if (existing.has(lotNo)) continue;

    const lotRef = doc(lotsCollection(phaseId, blockId));
    batch.set(lotRef, {
      lotNo,
      label: `Lot ${lotNo}`,
      status: "Vacant",
      assignedResidentId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    pendingWrites += 1;
  }

  if (pendingWrites > 0) {
    await batch.commit();
  }
}

export async function setLotAssignment(
  phaseId: string,
  blockId: string,
  lotId: string,
  residentId: string | null,
) {
  await updateDoc(
    doc(db, PHASES_COLLECTION, phaseId, "blocks", blockId, "lots", lotId),
    {
      assignedResidentId: residentId,
      status: residentId ? "Occupied" : "Vacant",
      updatedAt: serverTimestamp(),
    },
  );
}

export async function deleteLot(
  phaseId: string,
  blockId: string,
  lotId: string,
) {
  await deleteDoc(
    doc(db, PHASES_COLLECTION, phaseId, "blocks", blockId, "lots", lotId),
  );
}
