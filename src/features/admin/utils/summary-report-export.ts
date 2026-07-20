import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import type {
  MonthlySummaryRow,
  SummaryReportData,
  SummaryReportTotals,
  UnpaidResidentRow,
} from "../types/summary-report.types";

const PROJECT_NAME = "Terra Dues";
const ORGANIZATION_NAME = "Homeowners Association";
const REPORT_TITLE = "Monthly Financial Summary Report";

const PDF_PAGE_MARGIN = 14;
const PDF_CONTENT_WIDTH = 269;
const EXCEL_CURRENCY_FORMAT = '"₱"#,##0.00';

type PdfDocumentWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

type WorksheetWithColumns = XLSX.WorkSheet & {
  "!cols"?: Array<{
    width?: number;
    wch?: number;
  }>;
  "!rows"?: Array<{
    hpt?: number;
  }>;
  "!merges"?: XLSX.Range[];
  "!autofilter"?: {
    ref: string;
  };
};

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-PH");

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "long",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
});

const fileDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatCurrency = (value: number) =>
  currencyFormatter.format(Number.isFinite(value) ? value : 0);

const formatPdfCurrency = (value: number) =>
  `PHP ${(Number.isFinite(value) ? value : 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatNumber = (value: number) =>
  numberFormatter.format(Number.isFinite(value) ? value : 0);

const formatGeneratedDate = (value: Date) => dateFormatter.format(value);

const formatFileDate = (value: Date) =>
  fileDateFormatter.format(value).replaceAll("/", "-");

const sanitizeFilePart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

const buildReportFileName = (
  report: SummaryReportData,
  extension: "pdf" | "xlsx",
) => {
  const period = sanitizeFilePart(report.reportPeriod);
  const generatedDate = formatFileDate(report.generatedAt);

  return `terra-dues-summary-report-${period}-${generatedDate}.${extension}`;
};

const getLastAutoTableFinalY = (document: jsPDF, fallback: number) => {
  const documentWithTable = document as PdfDocumentWithAutoTable;

  return documentWithTable.lastAutoTable?.finalY ?? fallback;
};

const drawPdfPageHeader = (document: jsPDF, report: SummaryReportData) => {
  document.setTextColor(22, 101, 52);
  document.setFont("helvetica", "bold");
  document.setFontSize(17);
  document.text(PROJECT_NAME, PDF_PAGE_MARGIN, 14);

  document.setTextColor(39, 39, 42);
  document.setFontSize(10);
  document.text(ORGANIZATION_NAME, PDF_PAGE_MARGIN, 20);

  document.setFont("helvetica", "normal");
  document.setTextColor(82, 82, 91);
  document.setFontSize(8.5);

  document.text(`Report Period: ${report.reportPeriod}`, PDF_PAGE_MARGIN, 26);

  document.text(
    `Generated: ${formatGeneratedDate(report.generatedAt)}`,
    PDF_PAGE_MARGIN,
    31,
  );

  document.setDrawColor(209, 213, 219);
  document.setLineWidth(0.3);
  document.line(PDF_PAGE_MARGIN, 35, PDF_PAGE_MARGIN + PDF_CONTENT_WIDTH, 35);
};

const addPdfPageNumbers = (document: jsPDF) => {
  const totalPages = document.getNumberOfPages();

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    document.setPage(pageNumber);

    const pageWidth = document.internal.pageSize.getWidth();
    const pageHeight = document.internal.pageSize.getHeight();

    document.setDrawColor(228, 228, 231);
    document.setLineWidth(0.25);
    document.line(
      PDF_PAGE_MARGIN,
      pageHeight - 12,
      pageWidth - PDF_PAGE_MARGIN,
      pageHeight - 12,
    );

    document.setFont("helvetica", "normal");
    document.setFontSize(8);
    document.setTextColor(113, 113, 122);

    document.text(
      `${PROJECT_NAME} · ${REPORT_TITLE}`,
      PDF_PAGE_MARGIN,
      pageHeight - 7,
    );

    document.text(
      `Page ${pageNumber} of ${totalPages}`,
      pageWidth - PDF_PAGE_MARGIN,
      pageHeight - 7,
      {
        align: "right",
      },
    );
  }
};

const addPdfReportTitle = (document: jsPDF, report: SummaryReportData) => {
  document.setFont("helvetica", "bold");
  document.setFontSize(20);
  document.setTextColor(24, 24, 27);

  document.text(REPORT_TITLE, PDF_PAGE_MARGIN, 47);

  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  document.setTextColor(82, 82, 91);

  document.text(
    `Financial overview for ${report.reportPeriod}`,
    PDF_PAGE_MARGIN,
    54,
  );
};

const createSummaryCardRows = (totals: SummaryReportTotals) => [
  [
    "Total Residents",
    formatNumber(totals.totalResidents),
    "Paid Residents",
    formatNumber(totals.paidResidents),
    "Unpaid Residents",
    formatNumber(totals.unpaidResidents),
  ],
  [
    "Total Collected",
    formatPdfCurrency(totals.totalCollected),
    "Expected Collection",
    formatPdfCurrency(totals.expectedCollection),
    "Remaining Balance",
    formatPdfCurrency(totals.remainingBalance),
  ],
];

const addPdfSummaryCards = (document: jsPDF, report: SummaryReportData) => {
  autoTable(document, {
    startY: 62,
    margin: {
      left: PDF_PAGE_MARGIN,
      right: PDF_PAGE_MARGIN,
    },
    body: createSummaryCardRows(report.totals),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: {
        top: 4,
        right: 3,
        bottom: 4,
        left: 3,
      },
      lineColor: [212, 212, 216],
      lineWidth: 0.2,
      textColor: [39, 39, 42],
      valign: "middle",
    },
    columnStyles: {
      0: {
        fillColor: [240, 253, 244],
        textColor: [22, 101, 52],
        fontStyle: "bold",
        cellWidth: 38,
      },
      1: {
        fontStyle: "bold",
        cellWidth: 47,
      },
      2: {
        fillColor: [240, 253, 244],
        textColor: [22, 101, 52],
        fontStyle: "bold",
        cellWidth: 38,
      },
      3: {
        fontStyle: "bold",
        cellWidth: 47,
      },
      4: {
        fillColor: [254, 242, 242],
        textColor: [185, 28, 28],
        fontStyle: "bold",
        cellWidth: 38,
      },
      5: {
        fontStyle: "bold",
        cellWidth: 47,
      },
    },
  });
};

const monthlySummaryPdfRows = (
  rows: MonthlySummaryRow[],
  selectedMonthKey: string,
) =>
  rows.map((row) => [
    row.month,
    row.year.toString(),
    formatNumber(row.totalResidents),
    formatNumber(row.paidResidents),
    formatNumber(row.unpaidResidents),
    formatPdfCurrency(row.totalCollected),
    formatPdfCurrency(row.remainingBalance),
    row.monthKey === selectedMonthKey ? "Selected" : "",
  ]);

const addPdfMonthlySummary = (document: jsPDF, report: SummaryReportData) => {
  const previousTableY = getLastAutoTableFinalY(document, 96);

  document.setFont("helvetica", "bold");
  document.setFontSize(12);
  document.setTextColor(24, 24, 27);

  document.text("Monthly Summary", PDF_PAGE_MARGIN, previousTableY + 12);

  document.setFont("helvetica", "normal");
  document.setFontSize(8.5);
  document.setTextColor(82, 82, 91);

  document.text(
    `Overview of resident payments for ${report.year}.`,
    PDF_PAGE_MARGIN,
    previousTableY + 18,
  );

  autoTable(document, {
    startY: previousTableY + 23,
    margin: {
      top: 39,
      left: PDF_PAGE_MARGIN,
      right: PDF_PAGE_MARGIN,
      bottom: 18,
    },
    head: [
      [
        "Month",
        "Year",
        "Residents",
        "Paid",
        "Unpaid",
        "Collected",
        "Remaining",
        "",
      ],
    ],
    body: monthlySummaryPdfRows(report.monthlySummary, report.monthKey),
    theme: "grid",
    showHead: "everyPage",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: [228, 228, 231],
      lineWidth: 0.15,
      textColor: [39, 39, 42],
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [220, 252, 231],
      textColor: [20, 83, 45],
      fontStyle: "bold",
      lineColor: [187, 247, 208],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: {
        cellWidth: 32,
      },
      1: {
        cellWidth: 21,
        halign: "center",
      },
      2: {
        cellWidth: 32,
        halign: "center",
      },
      3: {
        cellWidth: 25,
        halign: "center",
      },
      4: {
        cellWidth: 25,
        halign: "center",
      },
      5: {
        cellWidth: 48,
        halign: "right",
      },
      6: {
        cellWidth: 48,
        halign: "right",
      },
      7: {
        cellWidth: 25,
        halign: "center",
      },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== "body") {
        return;
      }

      const row = report.monthlySummary[hookData.row.index];

      if (row?.monthKey === report.monthKey) {
        hookData.cell.styles.fillColor = [236, 253, 245];
        hookData.cell.styles.textColor = [6, 95, 70];
        hookData.cell.styles.fontStyle = "bold";
      }
    },
    didDrawPage: () => {
      if (document.getCurrentPageInfo().pageNumber > 1) {
        drawPdfPageHeader(document, report);
      }
    },
  });
};

const unpaidResidentPdfRows = (rows: UnpaidResidentRow[]) =>
  rows.map((resident, index) => [
    String(index + 1),
    resident.residentName,
    resident.blockLot,
    resident.contactNumber,
    formatPdfCurrency(resident.amountDue),
    resident.status,
    resident.dueDate,
  ]);

const addPdfUnpaidResidents = (document: jsPDF, report: SummaryReportData) => {
  const previousTableY = getLastAutoTableFinalY(document, 160);

  const pageHeight = document.internal.pageSize.getHeight();

  const needsNewPage = previousTableY > pageHeight - 65;

  if (needsNewPage) {
    document.addPage();
    drawPdfPageHeader(document, report);
  }

  const sectionStartY = needsNewPage ? 47 : previousTableY + 13;

  document.setFont("helvetica", "bold");
  document.setFontSize(12);
  document.setTextColor(24, 24, 27);

  document.text(
    `Residents with Unpaid Dues (${report.reportPeriod})`,
    PDF_PAGE_MARGIN,
    sectionStartY,
  );

  document.setFont("helvetica", "normal");
  document.setFontSize(8.5);
  document.setTextColor(82, 82, 91);

  document.text(
    "Residents with an unpaid status or remaining balance for the selected month.",
    PDF_PAGE_MARGIN,
    sectionStartY + 6,
  );

  const tableBody =
    report.unpaidResidents.length > 0
      ? unpaidResidentPdfRows(report.unpaidResidents)
      : [
          [
            "",
            "No unpaid residents found for this report period.",
            "",
            "",
            "",
            "",
            "",
          ],
        ];

  autoTable(document, {
    startY: sectionStartY + 11,
    margin: {
      top: 39,
      left: PDF_PAGE_MARGIN,
      right: PDF_PAGE_MARGIN,
      bottom: 22,
    },
    head: [
      [
        "No.",
        "Resident Name",
        "Block / Lot",
        "Contact Number",
        "Amount Due",
        "Status",
        "Due Date",
      ],
    ],
    body: tableBody,
    theme: "grid",
    showHead: "everyPage",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: [228, 228, 231],
      lineWidth: 0.15,
      textColor: [39, 39, 42],
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [220, 252, 231],
      textColor: [20, 83, 45],
      fontStyle: "bold",
      lineColor: [187, 247, 208],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: {
        cellWidth: 15,
        halign: "center",
      },
      1: {
        cellWidth: 57,
      },
      2: {
        cellWidth: 45,
      },
      3: {
        cellWidth: 42,
      },
      4: {
        cellWidth: 42,
        halign: "right",
      },
      5: {
        cellWidth: 30,
        halign: "center",
      },
      6: {
        cellWidth: 38,
        halign: "center",
      },
    },
    didParseCell: (hookData) => {
      if (report.unpaidResidents.length === 0 && hookData.section === "body") {
        if (hookData.column.index === 1) {
          hookData.cell.colSpan = 6;
          hookData.cell.styles.halign = "center";
          hookData.cell.styles.textColor = [113, 113, 122];
        }
      }

      if (
        report.unpaidResidents.length > 0 &&
        hookData.section === "body" &&
        hookData.column.index === 5
      ) {
        hookData.cell.styles.textColor = [185, 28, 28];
        hookData.cell.styles.fontStyle = "bold";
      }
    },
    didDrawPage: () => {
      if (document.getCurrentPageInfo().pageNumber > 1) {
        drawPdfPageHeader(document, report);
      }
    },
  });

  const totalsY = getLastAutoTableFinalY(document, sectionStartY + 30);

  const totalAmountDue = report.unpaidResidents.reduce(
    (total, resident) => total + resident.amountDue,
    0,
  );

  const totalsNeedNewPage = totalsY > pageHeight - 31;

  if (totalsNeedNewPage) {
    document.addPage();
    drawPdfPageHeader(document, report);
  }

  const finalTotalsY = totalsNeedNewPage ? 49 : totalsY + 9;

  document.setFillColor(240, 253, 244);
  document.roundedRect(
    PDF_PAGE_MARGIN,
    finalTotalsY - 6,
    PDF_CONTENT_WIDTH,
    17,
    2,
    2,
    "F",
  );

  document.setFont("helvetica", "bold");
  document.setFontSize(9);
  document.setTextColor(22, 101, 52);

  document.text(
    `Total Unpaid Residents: ${formatNumber(report.unpaidResidents.length)}`,
    PDF_PAGE_MARGIN + 5,
    finalTotalsY + 4,
  );

  document.text(
    `Total Amount Due: ${formatPdfCurrency(totalAmountDue)}`,
    PDF_PAGE_MARGIN + PDF_CONTENT_WIDTH - 5,
    finalTotalsY + 4,
    {
      align: "right",
    },
  );
};

const createSummaryWorksheet = (report: SummaryReportData) => {
  const rows: Array<Array<string | number>> = [
    [PROJECT_NAME],
    [ORGANIZATION_NAME],
    [REPORT_TITLE],
    [],
    ["Report Period", report.reportPeriod],
    ["Generated Date", formatGeneratedDate(report.generatedAt)],
    [],
    ["Summary Metric", "Value"],
    ["Total Residents", report.totals.totalResidents],
    ["Paid Residents", report.totals.paidResidents],
    ["Unpaid Residents", report.totals.unpaidResidents],
    ["Total Collected", report.totals.totalCollected],
    ["Expected Collection", report.totals.expectedCollection],
    ["Remaining Balance", report.totals.remainingBalance],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows) as WorksheetWithColumns;

  worksheet["!cols"] = [
    {
      wch: 28,
    },
    {
      wch: 24,
    },
  ];

  worksheet["!rows"] = [
    {
      hpt: 24,
    },
    {
      hpt: 20,
    },
    {
      hpt: 22,
    },
  ];

  worksheet["!merges"] = [
    XLSX.utils.decode_range("A1:B1"),
    XLSX.utils.decode_range("A2:B2"),
    XLSX.utils.decode_range("A3:B3"),
  ];

  for (const cellAddress of ["B12", "B13", "B14"]) {
    const cell = worksheet[cellAddress];

    if (cell) {
      cell.z = EXCEL_CURRENCY_FORMAT;
    }
  }

  return worksheet;
};

const createMonthlySummaryWorksheet = (report: SummaryReportData) => {
  const rows: Array<Array<string | number>> = [
    [PROJECT_NAME],
    [REPORT_TITLE],
    [`Monthly Summary for ${report.year}`],
    [],
    [
      "Month",
      "Year",
      "Total Residents",
      "Paid Residents",
      "Unpaid Residents",
      "Total Collected",
      "Expected Collection",
      "Remaining Balance",
      "Selected Period",
      "Has Payment Records",
    ],
    ...report.monthlySummary.map((row) => [
      row.month,
      row.year,
      row.totalResidents,
      row.paidResidents,
      row.unpaidResidents,
      row.totalCollected,
      row.expectedCollection,
      row.remainingBalance,
      row.monthKey === report.monthKey ? "Yes" : "",
      row.hasPaymentRecords ? "Yes" : "No",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows) as WorksheetWithColumns;

  worksheet["!cols"] = [
    {
      wch: 14,
    },
    {
      wch: 10,
    },
    {
      wch: 18,
    },
    {
      wch: 16,
    },
    {
      wch: 18,
    },
    {
      wch: 20,
    },
    {
      wch: 22,
    },
    {
      wch: 20,
    },
    {
      wch: 16,
    },
    {
      wch: 21,
    },
  ];

  worksheet["!merges"] = [
    XLSX.utils.decode_range("A1:J1"),
    XLSX.utils.decode_range("A2:J2"),
    XLSX.utils.decode_range("A3:J3"),
  ];

  worksheet["!autofilter"] = {
    ref: `A5:J${rows.length}`,
  };

  for (let rowNumber = 6; rowNumber <= rows.length; rowNumber += 1) {
    for (const column of ["F", "G", "H"]) {
      const cell = worksheet[`${column}${rowNumber}`];

      if (cell) {
        cell.z = EXCEL_CURRENCY_FORMAT;
      }
    }
  }

  return worksheet;
};

const createUnpaidResidentsWorksheet = (report: SummaryReportData) => {
  const totalAmountDue = report.unpaidResidents.reduce(
    (total, resident) => total + resident.amountDue,
    0,
  );

  const residentRows =
    report.unpaidResidents.length > 0
      ? report.unpaidResidents.map((resident, index) => [
          index + 1,
          resident.residentName,
          resident.blockLot,
          resident.contactNumber,
          resident.amountDue,
          resident.status,
          resident.dueDate,
        ])
      : [["", "No unpaid residents found.", "", "", "", "", ""]];

  const rows: Array<Array<string | number>> = [
    [PROJECT_NAME],
    [REPORT_TITLE],
    [`Residents with Unpaid Dues — ${report.reportPeriod}`],
    [],
    [
      "No.",
      "Resident Name",
      "Block / Lot",
      "Contact Number",
      "Amount Due",
      "Status",
      "Due Date",
    ],
    ...residentRows,
    [],
    [
      "Total Unpaid Residents",
      report.unpaidResidents.length,
      "",
      "",
      "Total Amount Due",
      totalAmountDue,
      "",
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows) as WorksheetWithColumns;

  worksheet["!cols"] = [
    {
      wch: 8,
    },
    {
      wch: 32,
    },
    {
      wch: 24,
    },
    {
      wch: 20,
    },
    {
      wch: 18,
    },
    {
      wch: 14,
    },
    {
      wch: 18,
    },
  ];

  worksheet["!merges"] = [
    XLSX.utils.decode_range("A1:G1"),
    XLSX.utils.decode_range("A2:G2"),
    XLSX.utils.decode_range("A3:G3"),
  ];

  if (report.unpaidResidents.length > 0) {
    worksheet["!autofilter"] = {
      ref: `A5:G${5 + report.unpaidResidents.length}`,
    };
  }

  const firstResidentRow = 6;
  const lastResidentRow =
    firstResidentRow + Math.max(report.unpaidResidents.length, 1) - 1;

  for (
    let rowNumber = firstResidentRow;
    rowNumber <= lastResidentRow;
    rowNumber += 1
  ) {
    const amountCell = worksheet[`E${rowNumber}`];

    if (amountCell) {
      amountCell.z = EXCEL_CURRENCY_FORMAT;
    }
  }

  const totalsRowNumber = rows.length;
  const totalAmountCell = worksheet[`F${totalsRowNumber}`];

  if (totalAmountCell) {
    totalAmountCell.z = EXCEL_CURRENCY_FORMAT;
  }

  return worksheet;
};

const applyWorkbookProperties = (
  workbook: XLSX.WorkBook,
  report: SummaryReportData,
) => {
  workbook.Props = {
    Title: `${REPORT_TITLE} - ${report.reportPeriod}`,
    Subject: `Homeowners association financial report for ${report.reportPeriod}`,
    Author: PROJECT_NAME,
    Company: ORGANIZATION_NAME,
    Category: "Financial Report",
    Keywords: "HOA, residents, payments, dues, collections",
    Comments: "Generated from the Terra Dues administration system.",
    CreatedDate: report.generatedAt,
  };
};

export const exportSummaryReportToPdf = async (report: SummaryReportData) => {
  const document = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  document.setProperties({
    title: `${REPORT_TITLE} - ${report.reportPeriod}`,
    subject: `Financial report for ${report.reportPeriod}`,
    author: PROJECT_NAME,
    creator: PROJECT_NAME,
    keywords: "HOA, monthly report, payment history, collections",
  });

  drawPdfPageHeader(document, report);
  addPdfReportTitle(document, report);
  addPdfSummaryCards(document, report);
  addPdfMonthlySummary(document, report);
  addPdfUnpaidResidents(document, report);
  addPdfPageNumbers(document);

  document.save(buildReportFileName(report, "pdf"));
};

export const exportSummaryReportToExcel = async (report: SummaryReportData) => {
  const workbook = XLSX.utils.book_new();

  applyWorkbookProperties(workbook, report);

  const summaryWorksheet = createSummaryWorksheet(report);

  const monthlySummaryWorksheet = createMonthlySummaryWorksheet(report);

  const unpaidResidentsWorksheet = createUnpaidResidentsWorksheet(report);

  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");

  XLSX.utils.book_append_sheet(
    workbook,
    monthlySummaryWorksheet,
    "Monthly Summary",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    unpaidResidentsWorksheet,
    "Unpaid Residents",
  );

  XLSX.writeFile(workbook, buildReportFileName(report, "xlsx"), {
    compression: true,
    bookType: "xlsx",
  });
};

export const getSummaryReportTotalAmountDue = (report: SummaryReportData) =>
  report.unpaidResidents.reduce(
    (total, resident) => total + resident.amountDue,
    0,
  );

export const formatSummaryReportCurrency = formatCurrency;
