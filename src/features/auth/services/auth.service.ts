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
  writeBatch,
  runTransaction,
  setDoc,
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
  /*
   * Use the Clerk user ID as the Firestore document ID.
   *
   * This prevents duplicate Firestore user records for the same
   * Clerk account.
   */
  const userRef = doc(db, "users", userData.user_id);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    return userRef.id;
  }

  await setDoc(userRef, {
    ...userData,
    role: "resident",
    approvalStatus: "pending",
    createdAt: Timestamp.now(),
  });

  return userRef.id;
};

export const getUserById = async (userId: string | undefined) => {
  try {
    const usersCollection = collection(db, "users");

    const q = query(usersCollection, where("user_id", "==", userId));

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];

      const user = {
        ...(docSnap.data() as User),
        id: docSnap.id,
      };

      /*
       * Backward compatibility:
       *
       * Existing users created before the registration approval
       * feature do not have approvalStatus.
       *
       * They are treated as approved so existing valid residents
       * are not suddenly locked out.
       */
      const approvalStatus = user.approvalStatus ?? "approved";

      /*
       * Only approved residents should trigger the monthly payment
       * initialization flow.
       *
       * Pending and denied registrations should not receive normal
       * resident payment records yet.
       */
      if (isResidentPaymentUser(user) && approvalStatus === "approved") {
        return ensureCurrentMonthPaymentRecord(user);
      }

      return user;
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

export type RegistrationDecision = "approved" | "denied";

export const getRegistrationRequests = async () => {
  const users = await getAllUsers();

  return users.filter(
    (user) =>
      (user.userType === "Owner" || user.userType === "Renter") &&
      user.approvalStatus === "pending",
  );
};

export const updateResidentApproval = async ({
  residentId,
  decision,
  decidedBy,
  denialReason,
}: {
  residentId: string;
  decision: RegistrationDecision;
  decidedBy: string;
  denialReason?: string;
}) => {
  const residentRef = doc(db, "users", residentId);

  const residentSnap = await getDoc(residentRef);

  if (!residentSnap.exists()) {
    throw new Error("Resident record not found.");
  }

  const resident = residentSnap.data() as User;

  if (resident.userType !== "Owner" && resident.userType !== "Renter") {
    throw new Error("Only resident registrations can be reviewed.");
  }

  if (resident.approvalStatus !== "pending") {
    throw new Error("This registration has already been reviewed.");
  }

  const timestamp = Timestamp.now();

  const batch = writeBatch(db);

  const common = {
    approvalStatus: decision,
    updatedAt: timestamp,
  };

  if (decision === "approved") {
    batch.update(residentRef, {
      ...common,

      approvedAt: timestamp,
      approvedBy: decidedBy,

      deniedAt: null,
      deniedBy: null,
      denialReason: null,
    });
  } else {
    batch.update(residentRef, {
      ...common,

      deniedAt: timestamp,
      deniedBy: decidedBy,

      denialReason: denialReason?.trim() || null,

      approvedAt: null,
      approvedBy: null,
    });
  }

  /*
   * Use a deterministic notification ID.
   *
   * This prevents duplicate approval/denial notifications
   * for the same resident and decision.
   */
  const notificationId = `${residentId}-registration-${decision}`;

  const notificationRef = doc(db, "notifications", notificationId);

  batch.set(notificationRef, {
    id: notificationId,

    residentId,

    userId: resident.user_id,

    title:
      decision === "approved" ? "Registration Approved" : "Registration Denied",

    message:
      decision === "approved"
        ? "Your resident registration has been approved. You may now access your TerraDues account."
        : "Your resident registration was not approved. Please contact the administrator for more information.",

    type:
      decision === "approved" ? "registration_approved" : "registration_denied",

    unread: true,

    createdAt: timestamp,
  });

  /*
   * The registration update and notification creation
   * succeed or fail together.
   */
  await batch.commit();
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

export type NotificationRecord = {
  id: string;
  residentId: string;
  userId: string;
  title: string;
  message: string;
  type: "payment_reminder";
  monthKey: string;
  monthLabel: string;
  amount: number;
  unread: boolean;
  createdAt?: unknown;
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

const isResidentPaymentUser = (user: User) =>
  user.userType === "Owner" || user.userType === "Renter";

const getResidentMonthlyCharge = (user: User) => {
  const rawAmount =
    (user as { paymentAmount?: unknown }).paymentAmount ??
    (user as { amount?: unknown }).amount;

  const amount = Number(rawAmount);

  return Number.isFinite(amount) && amount > 0 ? amount : 300;
};

const buildCurrentMonthRecord = ({
  residentId,
  history,
  monthlyCharge,
}: {
  residentId: string;
  history: PaymentHistoryRecord[];
  monthlyCharge: number;
}) => {
  const { monthKey, monthLabel } = getPhilippinePaymentDate();
  const beginningBalance = getPreviousRemainingBalance(history, monthKey);
  const totalDue = monthlyCharge + beginningBalance;
  const timestamp = Timestamp.now();

  return {
    id: `${residentId}-${monthKey}`,
    monthKey,
    monthLabel,
    beginningBalance,
    currentCharges: monthlyCharge,
    additionalCharges: beginningBalance,
    totalDue,
    collection: 0,
    remainingBalance: totalDue,
    status: "Not Paid" as PaymentStatus,
    datePaid: "-",
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies PaymentHistoryRecord;
};

const getPaymentReminderNotificationId = (
  residentId: string,
  monthKey: string,
) => `${residentId}-${monthKey}-payment-reminder`;

const buildPaymentReminderNotification = ({
  residentId,
  userId,
  monthKey,
  monthLabel,
  amount,
}: {
  residentId: string;
  userId: string;
  monthKey: string;
  monthLabel: string;
  amount: number;
}): NotificationRecord => {
  const id = getPaymentReminderNotificationId(residentId, monthKey);

  return {
    id,
    residentId,
    userId,
    title: "Upcoming Payment Reminder",
    message: `Your payment for ${monthLabel} is now available. Please settle your dues on time.`,
    type: "payment_reminder",
    monthKey,
    monthLabel,
    amount,
    unread: true,
    createdAt: Timestamp.now(),
  };
};

const createPaymentReminderNotificationIfMissing = async ({
  residentId,
  userId,
  monthKey,
  monthLabel,
  amount,
}: {
  residentId: string;
  userId: string;
  monthKey: string;
  monthLabel: string;
  amount: number;
}) => {
  const notificationId = getPaymentReminderNotificationId(residentId, monthKey);
  const notificationRef = doc(db, "notifications", notificationId);
  const notificationSnap = await getDoc(notificationRef);

  if (notificationSnap.exists()) return;

  await setDoc(
    notificationRef,
    buildPaymentReminderNotification({
      residentId,
      userId,
      monthKey,
      monthLabel,
      amount,
    }),
  );
};

export const getNotificationsByResidentId = async (residentId?: string) => {
  if (!residentId) return [];

  const notificationsCollection = collection(db, "notifications");
  const q = query(
    notificationsCollection,
    where("residentId", "==", residentId),
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs
    .map((docSnap) => ({
      ...(docSnap.data() as NotificationRecord),
      id: docSnap.id,
    }))
    .sort((a, b) => {
      const getMillis = (value: unknown) => {
        if (!value || typeof value !== "object") return 0;

        if (
          "toMillis" in value &&
          typeof (value as { toMillis?: unknown }).toMillis === "function"
        ) {
          return (value as { toMillis: () => number }).toMillis();
        }

        if (
          "seconds" in value &&
          typeof (value as { seconds?: unknown }).seconds === "number"
        ) {
          return (value as { seconds: number }).seconds * 1000;
        }

        return 0;
      };

      return getMillis(b.createdAt) - getMillis(a.createdAt);
    });
};

export const ensureCurrentMonthPaymentRecord = async (resident: User) => {
  if (!isResidentPaymentUser(resident)) return resident;

  const residentRef = doc(db, "users", resident.id);
  const { monthKey, monthLabel } = getPhilippinePaymentDate();

  return runTransaction(db, async (transaction) => {
    const residentSnap = await transaction.get(residentRef);

    if (!residentSnap.exists()) {
      throw new Error("Resident record was not found.");
    }

    const residentData = residentSnap.data() as User;
    const monthlyCharge = getResidentMonthlyCharge(residentData);

    const rawHistory = Array.isArray(
      (residentData as { paymentHistory?: unknown }).paymentHistory,
    )
      ? (residentData as { paymentHistory?: unknown }).paymentHistory
      : Array.isArray((residentData as { payments?: unknown }).payments)
        ? (residentData as { payments?: unknown }).payments
        : [];

    const normalizedHistory = normalizePaymentHistory(
      rawHistory,
      monthlyCharge,
    );

    const existingCurrentMonthRecord = normalizedHistory.find(
      (row) => row.monthKey === monthKey || row.monthLabel === monthLabel,
    );

    const currentMonthRecord =
      existingCurrentMonthRecord ??
      buildCurrentMonthRecord({
        residentId: resident.id,
        history: normalizedHistory,
        monthlyCharge,
      });

    const notificationId = getPaymentReminderNotificationId(
      resident.id,
      currentMonthRecord.monthKey,
    );

    const notificationRef = doc(db, "notifications", notificationId);
    const notificationSnap = await transaction.get(notificationRef);

    const paymentHistory = existingCurrentMonthRecord
      ? normalizedHistory.sort((a, b) =>
          compareMonthKey(b.monthKey, a.monthKey),
        )
      : [currentMonthRecord, ...normalizedHistory].sort((a, b) =>
          compareMonthKey(b.monthKey, a.monthKey),
        );

    if (!existingCurrentMonthRecord) {
      transaction.update(residentRef, {
        paymentHistory,
        currentMonthDue: currentMonthRecord.totalDue,
        remainingBalance: currentMonthRecord.remainingBalance,
        paymentStatus: currentMonthRecord.status,
        paymentDate: "",
        updatedAt: serverTimestamp(),
      });
    }

    if (!notificationSnap.exists()) {
      transaction.set(
        notificationRef,
        buildPaymentReminderNotification({
          residentId: resident.id,
          userId: cleanString(residentData.user_id),
          monthKey: currentMonthRecord.monthKey,
          monthLabel: currentMonthRecord.monthLabel,
          amount: currentMonthRecord.totalDue,
        }),
      );
    }

    return {
      ...residentData,
      id: resident.id,
      paymentStatus: currentMonthRecord.status,
      paymentDate:
        currentMonthRecord.status === "Paid" ? currentMonthRecord.datePaid : "",
      paymentHistory,
      currentMonthDue: currentMonthRecord.totalDue,
      remainingBalance: currentMonthRecord.remainingBalance,
    } as unknown as User;
  });
};

export const getAllUsersWithCurrentMonthPayments = async () => {
  const users = await getAllUsers();

  return Promise.all(
    users.map((user) =>
      isResidentPaymentUser(user)
        ? ensureCurrentMonthPaymentRecord(user)
        : user,
    ),
  );
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

  if (existingIndex < 0) {
    await createPaymentReminderNotificationIfMissing({
      residentId,
      userId: cleanString(residentData.user_id),
      monthKey,
      monthLabel,
      amount: totalDue,
    });
  }

  return {
    paymentStatus: status,
    paymentDate: status === "Paid" ? shortDate : "-",
    currentMonthDue: totalDue,
    remainingBalance,
    paymentHistory: sortedPaymentHistory,
  };
};

export type UpdateUserProfilePayload = {
  firstName: string;
  middleName: string;
  lastName: string;
  contactNumber: string;
  gender: string;
};

export type ResubmitDeniedRegistrationPayload = {
  firstName: string;
  middleName: string;
  lastName: string;
  contactNumber: string;
  gender: string;
  phase: string;
  block: string;
  lot: string;

  /*
   * These contain the final Cloudinary URLs.
   *
   * picture = Valid Government ID image
   * document = Lease Agreement or House Turnover document
   */
  picture?: string;
  document?: string;

  familyMembers?: string;
  occupancyType?: string[];
  forRent?: boolean;

  ownerName?: string;
  ownerContactNumber?: string;
  ownerAddress?: string;
  ownerNumberOccupants?: string;
};

export const resubmitDeniedRegistration = async (
  docId: string,
  payload: ResubmitDeniedRegistrationPayload,
) => {
  const userRef = doc(db, "users", docId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("Resident registration was not found.");
  }

  const userData = userSnap.data() as User;

  if (userData.approvalStatus !== "denied") {
    throw new Error("Only denied registrations can be edited and resubmitted.");
  }

  const firstName = payload.firstName.trim();
  const middleName = payload.middleName.trim();
  const lastName = payload.lastName.trim();
  const contactNumber = payload.contactNumber.trim();
  const gender = payload.gender.trim();
  const phase = payload.phase.trim();
  const block = payload.block.trim();
  const lot = payload.lot.trim();

  if (!firstName) {
    throw new Error("First name is required.");
  }

  if (!lastName) {
    throw new Error("Last name is required.");
  }

  if (!/^\d{10,11}$/.test(contactNumber)) {
    throw new Error("Contact number must contain 10 to 11 digits.");
  }

  if (!gender) {
    throw new Error("Gender is required.");
  }

  if (!/^\d+$/.test(phase)) {
    throw new Error("Phase must contain numbers only.");
  }

  if (!/^\d+$/.test(block)) {
    throw new Error("Block must contain numbers only.");
  }

  if (!/^\d+$/.test(lot)) {
    throw new Error("Lot must contain numbers only.");
  }

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

  const address = `Blk ${block} Lot ${lot} Phase ${phase}`;

  const finalPicture = payload.picture?.trim() || userData.picture;

  const finalDocument = payload.document?.trim() || userData.document;

  if (!finalPicture) {
    throw new Error("A valid government ID image is required.");
  }

  if (!finalDocument) {
    throw new Error(
      userData.userType === "Renter"
        ? "A house lease agreement document is required."
        : "A house turnover document is required.",
    );
  }

  const commonUpdates = {
    firstName,
    middleName,
    lastName,
    fullName,
    contactNumber,
    gender,
    phase,
    block,
    lot,
    address,

    picture: finalPicture,
    document: finalDocument,

    approvalStatus: "pending" as const,
    resubmittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    deniedAt: null,
    deniedBy: null,
    denialReason: null,

    approvedAt: null,
    approvedBy: null,
  };

  if (userData.userType === "Owner") {
    const familyMembers = payload.familyMembers?.trim() ?? "";

    if (!/^\d+$/.test(familyMembers)) {
      throw new Error("Family members must contain numbers only.");
    }

    if (!payload.occupancyType?.length) {
      throw new Error("Select at least one occupancy type.");
    }

    await updateDoc(userRef, {
      ...commonUpdates,
      familyMembers,
      occupancyType: payload.occupancyType,
      forRent: Boolean(payload.forRent),
    });
  } else {
    const ownerName = payload.ownerName?.trim() ?? "";
    const ownerContactNumber = payload.ownerContactNumber?.trim() ?? "";
    const ownerAddress = payload.ownerAddress?.trim() ?? "";
    const ownerNumberOccupants = payload.ownerNumberOccupants?.trim() ?? "";

    if (!ownerName) {
      throw new Error("Property owner name is required.");
    }

    if (!/^\d{10,11}$/.test(ownerContactNumber)) {
      throw new Error(
        "Property owner contact number must contain 10 to 11 digits.",
      );
    }

    if (!ownerAddress) {
      throw new Error("Property owner address is required.");
    }

    if (!/^\d+$/.test(ownerNumberOccupants)) {
      throw new Error("Number of occupants must contain numbers only.");
    }

    await updateDoc(userRef, {
      ...commonUpdates,
      ownerName,
      ownerContactNumber,
      ownerAddress,
      ownerNumberOccupants,
    });
  }

  /*
   * Remove the previous denied notification.
   *
   * setDoc with the same deterministic ID updates the existing
   * notification instead of creating duplicates.
   */
  const notificationId = `${docId}-registration-resubmitted`;

  await setDoc(doc(db, "notifications", notificationId), {
    id: notificationId,
    residentId: docId,
    userId: userData.user_id,
    title: "Registration Resubmitted",
    message:
      "Your corrected registration has been submitted for administrator review.",
    type: "registration_resubmitted",
    unread: true,
    createdAt: serverTimestamp(),
  });

  return {
    ...commonUpdates,
    familyMembers: payload.familyMembers,
    occupancyType: payload.occupancyType,
    forRent: payload.forRent,
    ownerName: payload.ownerName,
    ownerContactNumber: payload.ownerContactNumber,
    ownerAddress: payload.ownerAddress,
    ownerNumberOccupants: payload.ownerNumberOccupants,
  };
};

export const updateUserProfile = async (
  docId: string,
  payload: UpdateUserProfilePayload,
) => {
  const userRef = doc(db, "users", docId);

  const fullName = [payload.firstName, payload.middleName, payload.lastName]
    .filter(Boolean)
    .join(" ");

  await updateDoc(userRef, {
    ...payload,
    fullName,
    updatedAt: serverTimestamp(),
  });

  return {
    ...payload,
    fullName,
  };
};

export type ReportProblemPayload = {
  userId: string;
  name: string;
  email: string;
  category: string;
  message: string;
};

export const createProblemReport = async (payload: ReportProblemPayload) => {
  const reportsCollection = collection(db, "reports");

  const docRef = await addDoc(reportsCollection, {
    ...payload,
    status: "Open",
    createdAt: serverTimestamp(),
  });

  return docRef.id;
};
