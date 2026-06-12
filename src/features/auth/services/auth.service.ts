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

type UpdateResidentPaymentParams = {
  residentId: string;
  status: PaymentStatus;
  amount: number;
  additionalCharges?: number;
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

export const updateResidentPaymentForMonth = async ({
  residentId,
  status,
  amount,
  additionalCharges = 0,
}: UpdateResidentPaymentParams) => {
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

  const existingIndex = rawHistory.findIndex((item: unknown) => {
    const row = item as Record<string, unknown>;

    return (
      row.monthKey === monthKey ||
      row.monthLabel === monthLabel ||
      row.month === monthLabel ||
      row.billingMonth === monthLabel
    );
  });

  const previousRecord =
    existingIndex >= 0
      ? (rawHistory[existingIndex] as Record<string, unknown>)
      : {};

  const updatedMonthRecord = {
    ...previousRecord,
    id:
      typeof previousRecord.id === "string" && previousRecord.id.trim()
        ? previousRecord.id
        : `${residentId}-${monthKey}`,
    monthKey,
    monthLabel,
    beginningBalance: toNumber(
      previousRecord.beginningBalance ??
        previousRecord.balance ??
        previousRecord.previousBalance,
      0,
    ),
    currentCharges: amount,
    additionalCharges,
    collection: status === "Paid" ? amount : 0,
    status,
    datePaid: status === "Paid" ? shortDate : "-",
    createdAt: previousRecord.createdAt ?? Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const nextPaymentHistory =
    existingIndex >= 0
      ? rawHistory.map((item: unknown, index: number) =>
          index === existingIndex ? updatedMonthRecord : item,
        )
      : [updatedMonthRecord, ...rawHistory];

  await updateDoc(residentRef, {
    paymentStatus: status,
    paymentDate: status === "Paid" ? shortDate : "",
    paymentHistory: nextPaymentHistory,
    updatedAt: serverTimestamp(),
  });

  return {
    paymentStatus: status,
    paymentDate: status === "Paid" ? shortDate : "-",
    paymentHistory: nextPaymentHistory,
  };
};
