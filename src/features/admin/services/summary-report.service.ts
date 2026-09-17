import {
  getApprovedResidentsWithCurrentMonthPayments,
  isApprovedResidentUser,
} from "../../auth/services/auth.service";
import type { User } from "../../../types";
import { getAppDate } from "../../../lib/app-date";

import type {
  MonthlySummaryRow,
  SummaryReportData,
  SummaryReportPaymentRecord,
  SummaryReportPaymentStatus,
  SummaryReportResident,
  SummaryReportSourceData,
  SummaryReportTotals,
  UnpaidResidentRow,
} from "../types/summary-report.types";

const DEFAULT_MONTHLY_CHARGE = 300;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type ResidentUser = User & {
  userType: "Owner" | "Renter";
};

type UnknownRecord = Record<string, unknown>;

const cleanString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const toNumber = (value: unknown, fallback = 0) => {
  const convertedValue = Number(value);

  return Number.isFinite(convertedValue) ? convertedValue : fallback;
};

const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const isResidentUser = (user: User): user is ResidentUser =>
  isApprovedResidentUser(user);

const getResidentMonthlyCharge = (user: ResidentUser) => {
  const paymentAmount = toNumber(
    (user as unknown as UnknownRecord).paymentAmount ??
      (user as unknown as UnknownRecord).amount,
    DEFAULT_MONTHLY_CHARGE,
  );

  return paymentAmount > 0 ? paymentAmount : DEFAULT_MONTHLY_CHARGE;
};

const normalizePaymentStatus = (
  value: unknown,
  collection: number,
  remainingBalance: number,
): SummaryReportPaymentStatus => {
  if (value === "Paid" || value === "Not Paid") {
    return value;
  }

  if (remainingBalance <= 0 && collection > 0) {
    return "Paid";
  }

  return "Not Paid";
};

const getMonthKeyFromLabel = (value: unknown) => {
  const monthLabel = cleanString(value);

  if (!monthLabel) {
    return "";
  }

  const parsedDate = new Date(`${monthLabel} 1`);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

const normalizeMonthKey = (row: UnknownRecord) => {
  const directMonthKey = cleanString(row.monthKey);

  if (/^\d{4}-\d{2}$/.test(directMonthKey)) {
    return directMonthKey;
  }

  return getMonthKeyFromLabel(row.monthLabel ?? row.month ?? row.billingMonth);
};

const getMonthLabel = (monthKey: string, row: UnknownRecord) => {
  const existingLabel =
    cleanString(row.monthLabel) ||
    cleanString(row.month) ||
    cleanString(row.billingMonth);

  if (existingLabel) {
    return existingLabel;
  }

  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return "";
  }

  return `${MONTH_NAMES[month - 1]} ${year}`;
};

const normalizePaymentHistory = (
  rawHistory: unknown,
  monthlyCharge: number,
): SummaryReportPaymentRecord[] => {
  if (!Array.isArray(rawHistory)) {
    return [];
  }

  return rawHistory
    .map((item, index): SummaryReportPaymentRecord | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as UnknownRecord;
      const monthKey = normalizeMonthKey(row);

      /*
       * Records without a valid year-month cannot participate in a
       * month/year report. They remain untouched in Firestore and are
       * simply excluded from report aggregation.
       */
      if (!monthKey) {
        return null;
      }

      const currentCharges = toNumber(
        row.currentCharges ?? row.charges ?? row.amount,
        monthlyCharge,
      );

      const beginningBalance = toNumber(
        row.beginningBalance ??
          row.balance ??
          row.previousBalance ??
          row.additionalCharges ??
          row.additionalCharge,
        0,
      );

      const additionalCharges = toNumber(
        row.additionalCharges ??
          row.additionalCharge ??
          row.beginningBalance ??
          row.balance ??
          row.previousBalance,
        beginningBalance,
      );

      const totalDue = Math.max(
        toNumber(row.totalDue, currentCharges + additionalCharges),
        0,
      );

      const collection = Math.max(
        toNumber(row.collection ?? row.paid ?? row.payment, 0),
        0,
      );

      const calculatedRemainingBalance = Math.max(totalDue - collection, 0);

      const remainingBalance = Math.max(
        toNumber(row.remainingBalance, calculatedRemainingBalance),
        0,
      );

      const status = normalizePaymentStatus(
        row.status,
        collection,
        remainingBalance,
      );

      return {
        id: cleanString(row.id) || `${monthKey}-${index}`,
        monthKey,
        monthLabel: getMonthLabel(monthKey, row),
        beginningBalance: roundCurrency(beginningBalance),
        currentCharges: roundCurrency(currentCharges),
        additionalCharges: roundCurrency(additionalCharges),
        totalDue: roundCurrency(totalDue),
        collection: roundCurrency(collection),
        remainingBalance: roundCurrency(remainingBalance),
        status,
        datePaid:
          cleanString(row.datePaid) ||
          cleanString(row.paymentDate) ||
          (status === "Paid" ? "Paid" : "-"),
        dueDate: row.dueDate,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    })
    .filter((record): record is SummaryReportPaymentRecord => record !== null)
    .sort((first, second) => second.monthKey.localeCompare(first.monthKey));
};

const getResidentName = (user: ResidentUser) => {
  const providedFullName = cleanString(user.fullName);

  if (providedFullName) {
    return providedFullName;
  }

  return [user.firstName, user.middleName, user.lastName]
    .map(cleanString)
    .filter(Boolean)
    .join(" ");
};

const toSummaryReportResident = (user: ResidentUser): SummaryReportResident => {
  const monthlyCharge = getResidentMonthlyCharge(user);

  const rawHistory =
    (user as unknown as UnknownRecord).paymentHistory ??
    (user as unknown as UnknownRecord).payments;

  return {
    id: user.id,
    userId: cleanString(user.user_id),
    firstName: cleanString(user.firstName),
    middleName: cleanString(user.middleName),
    lastName: cleanString(user.lastName),
    fullName: getResidentName(user) || "Unnamed Resident",
    contactNumber: cleanString(user.contactNumber),
    phase: cleanString(user.phase),
    block: cleanString(user.block),
    lot: cleanString(user.lot),
    address: cleanString(user.address),
    userType: user.userType,
    monthlyCharge,
    paymentHistory: normalizePaymentHistory(rawHistory, monthlyCharge),
  };
};

const getManilaDateParts = () => {
  const parts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(getAppDate());

  const year = Number(parts.find((part) => part.type === "year")?.value);

  const month = Number(parts.find((part) => part.type === "month")?.value);

  return {
    year:
      Number.isInteger(year) && year > 0 ? year : getAppDate().getFullYear(),
    month:
      Number.isInteger(month) && month >= 1 && month <= 12
        ? month
        : getAppDate().getMonth() + 1,
  };
};

const buildMonthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

const getRecordForMonth = (resident: SummaryReportResident, monthKey: string) =>
  resident.paymentHistory.find((record) => record.monthKey === monthKey);

const isPaidRecord = (record: SummaryReportPaymentRecord) =>
  record.status === "Paid" || record.remainingBalance <= 0;

const isUnpaidRecord = (record: SummaryReportPaymentRecord) =>
  record.status === "Not Paid" || record.remainingBalance > 0;

const createEmptyTotals = (): SummaryReportTotals => ({
  totalResidents: 0,
  paidResidents: 0,
  unpaidResidents: 0,
  totalCollected: 0,
  expectedCollection: 0,
  remainingBalance: 0,
});

const calculateTotalsForMonth = (
  residents: SummaryReportResident[],
  monthKey: string,
): SummaryReportTotals => {
  const totals = createEmptyTotals();

  totals.totalResidents = residents.length;

  for (const resident of residents) {
    const record = getRecordForMonth(resident, monthKey);

    /*
     * paymentHistory is the source of truth. A missing historical record
     * does not create an artificial charge or collection in the report.
     */
    if (!record) {
      continue;
    }

    if (isPaidRecord(record)) {
      totals.paidResidents += 1;
    } else if (isUnpaidRecord(record)) {
      totals.unpaidResidents += 1;
    }

    totals.expectedCollection += record.totalDue;
    totals.totalCollected += record.collection;
    totals.remainingBalance += record.remainingBalance;
  }

  return {
    ...totals,
    totalCollected: roundCurrency(totals.totalCollected),
    expectedCollection: roundCurrency(totals.expectedCollection),
    remainingBalance: roundCurrency(totals.remainingBalance),
  };
};

const formatLocationPart = (value: string, prefix: string) => {
  const cleanedValue = cleanString(value);

  if (!cleanedValue) {
    return "";
  }

  const alreadyPrefixed = cleanedValue
    .toLowerCase()
    .startsWith(prefix.toLowerCase());

  return alreadyPrefixed ? cleanedValue : `${prefix} ${cleanedValue}`;
};

const getBlockLot = (resident: SummaryReportResident) => {
  const block = formatLocationPart(resident.block, "Block");
  const lot = formatLocationPart(resident.lot, "Lot");
  const blockLot = [block, lot].filter(Boolean).join(" / ");

  if (blockLot) {
    return blockLot;
  }

  return resident.address || "—";
};

const timestampToDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  if (
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const convertedDate = (value as { toDate: () => Date }).toDate();

    return Number.isNaN(convertedDate.getTime()) ? null : convertedDate;
  }

  if (
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    const convertedDate = new Date(
      (value as { seconds: number }).seconds * 1000,
    );

    return Number.isNaN(convertedDate.getTime()) ? null : convertedDate;
  }

  return null;
};

const parseExistingDate = (value: unknown): Date | null => {
  const timestampDate = timestampToDate(value);

  if (timestampDate) {
    return timestampDate;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getDueDate = (
  record: SummaryReportPaymentRecord,
  year: number,
  month: number,
) => {
  const existingDueDate = parseExistingDate(record.dueDate);

  /*
   * No dueDate field is currently created by the project. When it is
   * absent, use the final calendar day of the report month.
   */
  const dueDate = existingDueDate ?? new Date(year, month, 0, 12, 0, 0, 0);

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(dueDate);
};

const createMonthlySummary = (
  residents: SummaryReportResident[],
  selectedYear: number,
): MonthlySummaryRow[] =>
  MONTH_NAMES.map((month, index) => {
    const monthNumber = index + 1;
    const monthKey = buildMonthKey(selectedYear, monthNumber);

    const totals = calculateTotalsForMonth(residents, monthKey);

    const hasPaymentRecords = residents.some((resident) =>
      resident.paymentHistory.some((record) => record.monthKey === monthKey),
    );

    return {
      month,
      monthNumber,
      monthKey,
      year: selectedYear,
      hasPaymentRecords,
      ...totals,
    };
  });

const createUnpaidResidents = (
  residents: SummaryReportResident[],
  monthKey: string,
  year: number,
  month: number,
): UnpaidResidentRow[] =>
  residents
    .flatMap((resident): UnpaidResidentRow[] => {
      const record = getRecordForMonth(resident, monthKey);

      if (!record || !isUnpaidRecord(record)) {
        return [];
      }

      return [
        {
          id: resident.id,
          residentName: resident.fullName,
          blockLot: getBlockLot(resident),
          contactNumber: resident.contactNumber || "—",
          amountDue: roundCurrency(record.remainingBalance),
          status: record.status,
          dueDate: getDueDate(record, year, month),
        },
      ];
    })
    .sort((first, second) =>
      first.residentName.localeCompare(second.residentName, "en", {
        sensitivity: "base",
      }),
    );

const getAvailableYears = (
  residents: SummaryReportResident[],
  currentYear: number,
) => {
  const years = new Set<number>([currentYear]);

  for (const resident of residents) {
    for (const record of resident.paymentHistory) {
      const year = Number(record.monthKey.slice(0, 4));

      if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
        years.add(year);
      }
    }
  }

  return Array.from(years).sort((first, second) => second - first);
};

export const getSummaryReportSourceData =
  async (): Promise<SummaryReportSourceData> => {
    /*
     * Reuse the existing monthly initialization service so the current
     * month remains consistent with Payment Status and Payment History.
     */
    const users = await getApprovedResidentsWithCurrentMonthPayments();

    const residents = users
      .filter(isResidentUser)
      .map(toSummaryReportResident)
      .sort((first, second) =>
        first.fullName.localeCompare(second.fullName, "en", {
          sensitivity: "base",
        }),
      );

    const { year: currentYear, month: currentMonth } = getManilaDateParts();

    return {
      residents,
      availableYears: getAvailableYears(residents, currentYear),
      currentMonth,
      currentYear,
    };
  };

export const createSummaryReport = ({
  residents,
  month,
  year,
}: {
  residents: SummaryReportResident[];
  month: number;
  year: number;
}): SummaryReportData => {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("The selected report month is invalid.");
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("The selected report year is invalid.");
  }

  const monthKey = buildMonthKey(year, month);
  const monthName = MONTH_NAMES[month - 1];
  const totals = calculateTotalsForMonth(residents, monthKey);

  return {
    month,
    monthName,
    monthKey,
    year,
    reportPeriod: `${monthName} ${year}`,
    generatedAt: new Date(),
    totals,
    monthlySummary: createMonthlySummary(residents, year),
    unpaidResidents: createUnpaidResidents(residents, monthKey, year, month),
  };
};

export const summaryReportMonthOptions = MONTH_NAMES.map((label, index) => ({
  label,
  value: index + 1,
}));
