export type SummaryReportPaymentStatus = "Paid" | "Not Paid";

export type SummaryReportPaymentRecord = {
  id: string;
  monthKey: string;
  monthLabel: string;
  beginningBalance: number;
  currentCharges: number;
  additionalCharges: number;
  totalDue: number;
  collection: number;
  remainingBalance: number;
  status: SummaryReportPaymentStatus;
  datePaid: string;
  dueDate?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type SummaryReportResident = {
  id: string;
  userId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  contactNumber: string;
  phase: string;
  block: string;
  lot: string;
  address: string;
  userType: "Owner" | "Renter";
  monthlyCharge: number;
  paymentHistory: SummaryReportPaymentRecord[];
};

export type SummaryReportTotals = {
  totalResidents: number;
  paidResidents: number;
  unpaidResidents: number;
  totalCollected: number;
  expectedCollection: number;
  remainingBalance: number;
};

export type MonthlySummaryRow = SummaryReportTotals & {
  month: string;
  monthNumber: number;
  monthKey: string;
  year: number;
  hasPaymentRecords: boolean;
};

export type UnpaidResidentRow = {
  id: string;
  residentName: string;
  blockLot: string;
  contactNumber: string;
  amountDue: number;
  status: SummaryReportPaymentStatus;
  dueDate: string;
};

export type SummaryReportData = {
  month: number;
  monthName: string;
  monthKey: string;
  year: number;
  reportPeriod: string;
  generatedAt: Date;
  totals: SummaryReportTotals;
  monthlySummary: MonthlySummaryRow[];
  unpaidResidents: UnpaidResidentRow[];
};

export type SummaryReportSourceData = {
  residents: SummaryReportResident[];
  availableYears: number[];
  currentMonth: number;
  currentYear: number;
};