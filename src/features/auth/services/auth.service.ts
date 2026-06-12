import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type {
  UserDataSignUpOwnerType,
  UserDataSignUpRenterType,
  User,
} from "../../../types";
import { db } from "../../../lib/firebase/firebase";

export const addUser = async (
  userData: UserDataSignUpOwnerType | UserDataSignUpRenterType,
) => {
  const usersCollection = collection(db, "users");

  const docRef = await addDoc(usersCollection, {
    ...userData,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getUserById = async (userId: string | undefined) => {
  try {
    const usersCollection = collection(db, "users");
    const q = query(usersCollection, where("user_id", "==", userId));

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return { ...(docSnap.data() as User), id: docSnap.id };
    }

    console.warn(`No user found with ID: ${userId}`);
    return null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

export const getAllUsers = async () => {
  const usersCollection = collection(db, "users");
  const querySnapshot = await getDocs(usersCollection);

  return querySnapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as User),
    id: docSnap.id,
  }));
};

type PaymentStatus = "Paid" | "Not Paid";

type PaymentHistoryRecord = {
  id: string;
  monthKey: string;
  monthLabel: string;
  beginningBalance: number;
  currentCharges: number;
  additionalCharges: number;
  totalDue: number;
  collection: number;
  remainingBalance: number;
  status: PaymentStatus;
  datePaid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type UpdateResidentPaymentParams = {
  residentId: string;
  status: PaymentStatus;
  amount: number;
};

const getPhilippinePaymentDate = () => {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const yy = year.slice(-2);

  return {
    shortDate: `${month}-${day}-${yy}`,
    monthKey: `${year}-${month}`,
    monthLabel: new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      month: "long",
      year: "numeric",
    }).format(now),
  };
};

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const cleanString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const getHistoryStatus = (
  value: unknown,
  collection: number,
): PaymentStatus => {
  if (value === "Paid" || value === "Not Paid") return value;

  return collection > 0 ? "Paid" : "Not Paid";
};

const compareMonthKey = (a: string, b: string) => a.localeCompare(b);

const normalizePaymentHistory = (
  rawHistory: unknown,
  monthlyCharge: number,
): PaymentHistoryRecord[] => {
  if (!Array.isArray(rawHistory)) return [];

  return rawHistory.map((item, index) => {
    const row = item as Record<string, unknown>;

    const currentCharges = toNumber(
      row.currentCharges ?? row.charges ?? row.amount,
      monthlyCharge,
    );

    const additionalCharges = toNumber(
      row.additionalCharges ?? row.additionalCharge ?? row.beginningBalance,
      0,
    );

    const totalDue = toNumber(row.totalDue, currentCharges + additionalCharges);

    const collection = toNumber(row.collection ?? row.paid ?? row.payment, 0);
    const status = getHistoryStatus(row.status, collection);

    const remainingBalance = toNumber(
      row.remainingBalance,
      status === "Paid" ? 0 : Math.max(totalDue - collection, 0),
    );

    return {
      id: cleanString(row.id) || `history-${index}`,
      monthKey: cleanString(row.monthKey) || `legacy-${index}`,
      monthLabel:
        cleanString(row.monthLabel) ||
        cleanString(row.month) ||
        cleanString(row.billingMonth) ||
        `Month ${index + 1}`,
      beginningBalance: toNumber(
        row.beginningBalance ?? row.balance ?? row.previousBalance,
        additionalCharges,
      ),
      currentCharges,
      additionalCharges,
      totalDue,
      collection: status === "Paid" ? collection : 0,
      remainingBalance,
      status,
      datePaid:
        cleanString(row.datePaid) ||
        cleanString(row.paymentDate) ||
        (status === "Paid" ? "Paid" : "-"),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
};

const getPreviousRemainingBalance = (
  history: PaymentHistoryRecord[],
  currentMonthKey: string,
) => {
  const previousRows = history
    .filter((row) => row.monthKey && row.monthKey < currentMonthKey)
    .sort((a, b) => compareMonthKey(a.monthKey, b.monthKey));

  if (previousRows.length === 0) return 0;

  return previousRows[previousRows.length - 1].remainingBalance;
};

export const updateResidentPaymentForMonth = async ({
  residentId,
  status,
  amount,
}: UpdateResidentPaymentParams) => {
  const monthlyCharge = toNumber(amount, 300);
  const residentRef = doc(db, "users", residentId);
  const residentSnap = await getDoc(residentRef);

  if (!residentSnap.exists()) {
    throw new Error("Resident record was not found.");
  }

  const residentData = residentSnap.data();
  const { shortDate, monthKey, monthLabel } = getPhilippinePaymentDate();

  const rawHistory = Array.isArray(residentData.paymentHistory)
    ? residentData.paymentHistory
    : Array.isArray(residentData.payments)
      ? residentData.payments
      : [];

  const normalizedHistory = normalizePaymentHistory(rawHistory, monthlyCharge);

  const previousBalance = getPreviousRemainingBalance(
    normalizedHistory,
    monthKey,
  );

  const existingIndex = normalizedHistory.findIndex(
    (row) => row.monthKey === monthKey || row.monthLabel === monthLabel,
  );

  const previousRecord =
    existingIndex >= 0 ? normalizedHistory[existingIndex] : undefined;

  const totalDue = monthlyCharge + previousBalance;
  const collection = status === "Paid" ? totalDue : 0;
  const remainingBalance = Math.max(totalDue - collection, 0);
  const timestamp = Timestamp.now();

  const updatedMonthRecord: PaymentHistoryRecord = {
    id: previousRecord?.id?.trim() || `${residentId}-${monthKey}`,
    monthKey,
    monthLabel,
    beginningBalance: previousBalance,
    currentCharges: monthlyCharge,
    additionalCharges: previousBalance,
    totalDue,
    collection,
    remainingBalance,
    status,
    datePaid: status === "Paid" ? shortDate : "-",
    createdAt: previousRecord?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  const nextPaymentHistory =
    existingIndex >= 0
      ? normalizedHistory.map((item, index) =>
          index === existingIndex ? updatedMonthRecord : item,
        )
      : [updatedMonthRecord, ...normalizedHistory];

  const sortedPaymentHistory = [...nextPaymentHistory].sort((a, b) =>
    compareMonthKey(b.monthKey, a.monthKey),
  );

  await updateDoc(residentRef, {
    paymentStatus: status,
    paymentDate: status === "Paid" ? shortDate : "",
    paymentHistory: sortedPaymentHistory,
    currentMonthDue: totalDue,
    remainingBalance,
    updatedAt: serverTimestamp(),
  });

  return {
    paymentStatus: status,
    paymentDate: status === "Paid" ? shortDate : "-",
    currentMonthDue: totalDue,
    remainingBalance,
    paymentHistory: sortedPaymentHistory,
  };
};
