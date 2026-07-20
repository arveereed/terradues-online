import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Banknote,
  Calculator,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileChartColumn,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  SearchX,
  Users,
  UserRoundCheck,
  UserRoundX,
  WalletCards,
  X,
} from "lucide-react";

import {
  createSummaryReport,
  getSummaryReportSourceData,
  summaryReportMonthOptions,
} from "../../features/admin/services/summary-report.service";

import {
  exportSummaryReportToExcel,
  exportSummaryReportToPdf,
  formatSummaryReportCurrency,
  getSummaryReportTotalAmountDue,
} from "../../features/admin/utils/summary-report-export";

import type {
  SummaryReportData,
  SummaryReportTotals,
} from "../../features/admin/types/summary-report.types";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type ExportType = "pdf" | "excel" | null;

type SummaryCardConfig = {
  label: string;
  value: string;
  icon: React.ElementType;
  iconClassName: string;
  iconContainerClassName: string;
  valueClassName: string;
};

const SUMMARY_REPORT_QUERY_KEY = [
  "admin",
  "summary-report",
  "source-data",
] as const;

const numberFormatter = new Intl.NumberFormat("en-PH");

const generatedDateFormatter = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
});

const formatNumber = (value: number) =>
  numberFormatter.format(Number.isFinite(value) ? value : 0);

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

const createSummaryCards = (
  totals: SummaryReportTotals,
): SummaryCardConfig[] => [
  {
    label: "Total Residents",
    value: formatNumber(totals.totalResidents),
    icon: Users,
    iconClassName: "text-emerald-700",
    iconContainerClassName: "bg-emerald-50 ring-emerald-100",
    valueClassName: "text-zinc-950",
  },
  {
    label: "Paid Residents",
    value: formatNumber(totals.paidResidents),
    icon: UserRoundCheck,
    iconClassName: "text-green-700",
    iconContainerClassName: "bg-green-50 ring-green-100",
    valueClassName: "text-zinc-950",
  },
  {
    label: "Unpaid Residents",
    value: formatNumber(totals.unpaidResidents),
    icon: UserRoundX,
    iconClassName: "text-red-600",
    iconContainerClassName: "bg-red-50 ring-red-100",
    valueClassName: "text-zinc-950",
  },
  {
    label: "Total Collected",
    value: formatSummaryReportCurrency(totals.totalCollected),
    icon: WalletCards,
    iconClassName: "text-emerald-700",
    iconContainerClassName: "bg-emerald-50 ring-emerald-100",
    valueClassName: "text-emerald-700",
  },
  {
    label: "Expected Collection",
    value: formatSummaryReportCurrency(totals.expectedCollection),
    icon: Calculator,
    iconClassName: "text-blue-700",
    iconContainerClassName: "bg-blue-50 ring-blue-100",
    valueClassName: "text-blue-700",
  },
  {
    label: "Remaining Balance",
    value: formatSummaryReportCurrency(totals.remainingBalance),
    icon: CircleDollarSign,
    iconClassName: "text-amber-700",
    iconContainerClassName: "bg-amber-50 ring-amber-100",
    valueClassName: "text-amber-700",
  },
];

const SummaryReportSkeleton = () => {
  return (
    <div
      className="space-y-6"
      aria-label="Loading summary report"
      aria-busy="true"
    >
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="h-1.5 animate-pulse bg-emerald-100" />

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="size-12 animate-pulse rounded-2xl bg-zinc-200" />

              <div className="space-y-2">
                <div className="h-7 w-56 animate-pulse rounded-lg bg-zinc-200" />
                <div className="h-4 w-80 max-w-full animate-pulse rounded-lg bg-zinc-100" />
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-11 animate-pulse rounded-xl bg-zinc-100"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200"
          />
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="space-y-3 p-5 sm:p-6">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-lg bg-zinc-100" />

          <div className="mt-6 space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse rounded-xl bg-zinc-100"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
        <div className="space-y-3 p-5 sm:p-6">
          <div className="h-6 w-64 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-lg bg-zinc-100" />

          <div className="mt-6 space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse rounded-xl bg-zinc-100"
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const ErrorState = ({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}) => {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-8">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
          <AlertCircle size={26} />
        </div>

        <h1 className="mt-5 text-xl font-extrabold tracking-tight text-zinc-950">
          Unable to load the Summary Report
        </h1>

        <p className="mt-2 text-sm leading-6 text-zinc-600">{message}</p>

        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={isRetrying ? "animate-spin" : undefined}
          />

          {isRetrying ? "Retrying..." : "Try Again"}
        </button>
      </div>
    </section>
  );
};

const FeedbackBanner = ({
  feedback,
  onClose,
}: {
  feedback: Exclude<FeedbackState, null>;
  onClose: () => void;
}) => {
  const isSuccess = feedback.type === "success";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900"
      }`}
    >
      <span
        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${
          isSuccess
            ? "bg-emerald-100 text-emerald-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {isSuccess ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
      </span>

      <p className="min-w-0 flex-1 pt-1 text-sm font-semibold leading-5">
        {feedback.message}
      </p>

      <button
        type="button"
        onClick={onClose}
        className="grid size-8 shrink-0 place-items-center rounded-xl transition hover:bg-black/5"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

const FilterSelect = ({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string;
  label: string;
  value: string | number;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled: boolean;
  children: React.ReactNode;
}) => {
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold text-zinc-600">
        {label}
      </span>

      <span className="relative block">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-3 pr-9 text-sm font-semibold text-zinc-900 shadow-sm outline-none transition hover:border-zinc-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
        >
          {children}
        </select>

        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
      </span>
    </label>
  );
};

const SummaryCard = ({ card }: { card: SummaryCardConfig }) => {
  const Icon = card.icon;

  return (
    <article className="group flex min-h-28 items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
      <div
        className={`grid size-12 shrink-0 place-items-center rounded-2xl ring-1 transition-transform duration-200 group-hover:scale-105 ${card.iconContainerClassName}`}
      >
        <Icon size={22} className={card.iconClassName} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold leading-5 text-zinc-500">
          {card.label}
        </p>

        <p
          className={`mt-0.5 break-words text-xl font-extrabold tracking-tight ${card.valueClassName}`}
        >
          {card.value}
        </p>
      </div>
    </article>
  );
};

const EmptyUnpaidResidentsState = ({
  reportPeriod,
}: {
  reportPeriod: string;
}) => {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <CheckCircle2 size={26} />
      </div>

      <h3 className="mt-4 text-base font-extrabold text-zinc-950">
        No unpaid residents
      </h3>

      <p className="mt-1 max-w-md text-sm leading-6 text-zinc-600">
        No resident has an unpaid payment record or remaining balance for{" "}
        {reportPeriod}.
      </p>
    </div>
  );
};

export default function AdminSummaryReportPage() {
  const printReportRef = useRef<HTMLDivElement>(null);

  const [filterMonth, setFilterMonth] = useState<number | null>(null);

  const [filterYear, setFilterYear] = useState<number | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  const [activeExport, setActiveExport] = useState<ExportType>(null);

  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const {
    data: sourceData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: SUMMARY_REPORT_QUERY_KEY,
    queryFn: getSummaryReportSourceData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!sourceData) {
      return;
    }

    setFilterMonth((currentValue) => currentValue ?? sourceData.currentMonth);

    setFilterYear((currentValue) => currentValue ?? sourceData.currentYear);

    setSelectedMonth((currentValue) => currentValue ?? sourceData.currentMonth);

    setSelectedYear((currentValue) => currentValue ?? sourceData.currentYear);
  }, [sourceData]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedback]);

  const availableYears = useMemo(() => {
    if (!sourceData) {
      return [];
    }

    const years = new Set(sourceData.availableYears);

    if (filterYear !== null) {
      years.add(filterYear);
    }

    if (selectedYear !== null) {
      years.add(selectedYear);
    }

    return Array.from(years).sort((first, second) => second - first);
  }, [filterYear, selectedYear, sourceData]);

  const report = useMemo<SummaryReportData | null>(() => {
    if (!sourceData || selectedMonth === null || selectedYear === null) {
      return null;
    }

    return createSummaryReport({
      residents: sourceData.residents,
      month: selectedMonth,
      year: selectedYear,
    });
  }, [selectedMonth, selectedYear, sourceData]);

  const summaryCards = useMemo(
    () => (report ? createSummaryCards(report.totals) : []),
    [report],
  );

  const totalAmountDue = useMemo(
    () => (report ? getSummaryReportTotalAmountDue(report) : 0),
    [report],
  );

  const hasUnappliedFilters =
    filterMonth !== selectedMonth || filterYear !== selectedYear;

  const controlsDisabled = isLoading || isGenerating || activeExport !== null;

  const handleGenerateReport = async () => {
    if (filterMonth === null || filterYear === null) {
      setFeedback({
        type: "error",
        message: "Select a valid month and year before generating the report.",
      });

      return;
    }

    setIsGenerating(true);
    setFeedback(null);

    try {
      /*
       * Yield one frame so the disabled/loading state is
       * visible before the in-memory report calculation.
       */
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      setSelectedMonth(filterMonth);
      setSelectedYear(filterYear);

      const monthName =
        summaryReportMonthOptions.find((option) => option.value === filterMonth)
          ?.label ?? "Selected month";

      setFeedback({
        type: "success",
        message: `Summary report generated for ${monthName} ${filterYear}.`,
      });
    } catch (generateError) {
      setFeedback({
        type: "error",
        message: getErrorMessage(
          generateError,
          "The report could not be generated.",
        ),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefresh = async () => {
    setFeedback(null);

    try {
      const result = await refetch();

      if (result.error) {
        throw result.error;
      }

      setFeedback({
        type: "success",
        message: "Firestore report data has been refreshed.",
      });
    } catch (refreshError) {
      setFeedback({
        type: "error",
        message: getErrorMessage(
          refreshError,
          "The report data could not be refreshed.",
        ),
      });
    }
  };

  const handlePrint = () => {
    if (!report || !printReportRef.current) {
      setFeedback({
        type: "error",
        message: "Generate a report before trying to print it.",
      });

      return;
    }

    setFeedback(null);

    /*
     * The print stylesheet added in Part 5 hides the admin
     * navigation and displays only #summary-report-print-area.
     */
    window.print();
  };

  const handlePdfExport = async () => {
    if (!report) {
      setFeedback({
        type: "error",
        message: "Generate a report before exporting a PDF.",
      });

      return;
    }

    setActiveExport("pdf");
    setFeedback(null);

    try {
      await exportSummaryReportToPdf(report);

      setFeedback({
        type: "success",
        message: `PDF report exported for ${report.reportPeriod}.`,
      });
    } catch (exportError) {
      console.error("Unable to export the summary report PDF:", exportError);

      setFeedback({
        type: "error",
        message: getErrorMessage(
          exportError,
          "The PDF report could not be exported.",
        ),
      });
    } finally {
      setActiveExport(null);
    }
  };

  const handleExcelExport = async () => {
    if (!report) {
      setFeedback({
        type: "error",
        message: "Generate a report before exporting an Excel workbook.",
      });

      return;
    }

    setActiveExport("excel");
    setFeedback(null);

    try {
      await exportSummaryReportToExcel(report);

      setFeedback({
        type: "success",
        message: `Excel report exported for ${report.reportPeriod}.`,
      });
    } catch (exportError) {
      console.error(
        "Unable to export the summary report workbook:",
        exportError,
      );

      setFeedback({
        type: "error",
        message: getErrorMessage(
          exportError,
          "The Excel report could not be exported.",
        ),
      });
    } finally {
      setActiveExport(null);
    }
  };

  if (isLoading) {
    return <SummaryReportSkeleton />;
  }

  if (isError || !sourceData) {
    return (
      <ErrorState
        message={getErrorMessage(
          error,
          "An unexpected error occurred while loading Firestore report data.",
        )}
        onRetry={() => {
          void refetch();
        }}
        isRetrying={isFetching}
      />
    );
  }

  if (!report || filterMonth === null || filterYear === null) {
    return <SummaryReportSkeleton />;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {feedback && (
        <div className="no-print">
          <FeedbackBanner
            feedback={feedback}
            onClose={() => setFeedback(null)}
          />
        </div>
      )}

      <div
        id="summary-report-print-area"
        ref={printReportRef}
        className="summary-report-print-area space-y-5 sm:space-y-6"
      >
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="h-1.5 bg-linear-to-r from-emerald-600 via-emerald-500 to-teal-400" />

          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100">
                  <FileChartColumn size={23} />
                </div>

                <div className="min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">
                      Summary Report
                    </h1>

                    {isFetching && (
                      <span className="no-print inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                        <RefreshCw size={12} className="animate-spin" />
                        Refreshing
                      </span>
                    )}
                  </div>

                  <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-600">
                    Generate and review the monthly financial summary of the
                    homeowners association.
                  </p>

                  <div className="print-only mt-3 hidden text-xs text-zinc-600">
                    <p>
                      <span className="font-bold">Report period:</span>{" "}
                      {report.reportPeriod}
                    </p>

                    <p className="mt-1">
                      <span className="font-bold">Generated:</span>{" "}
                      {generatedDateFormatter.format(report.generatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="no-print w-full xl:max-w-3xl">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={controlsDisabled || isFetching}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      size={15}
                      className={isFetching ? "animate-spin" : undefined}
                    />

                    {isFetching ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(140px,1fr)_minmax(120px,0.8fr)_auto]">
                  <FilterSelect
                    id="summary-report-month"
                    label="Month"
                    value={filterMonth}
                    disabled={controlsDisabled}
                    onChange={(event) => {
                      setFilterMonth(Number(event.target.value));
                    }}
                  >
                    {summaryReportMonthOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </FilterSelect>

                  <FilterSelect
                    id="summary-report-year"
                    label="Year"
                    value={filterYear}
                    disabled={controlsDisabled}
                    onChange={(event) => {
                      setFilterYear(Number(event.target.value));
                    }}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </FilterSelect>

                  <div className="flex items-end sm:col-span-2 lg:col-span-1">
                    <button
                      type="button"
                      onClick={handleGenerateReport}
                      disabled={controlsDisabled}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                    >
                      {isGenerating ? (
                        <RefreshCw size={17} className="animate-spin" />
                      ) : (
                        <FileText size={17} />
                      )}

                      {isGenerating
                        ? "Generating..."
                        : hasUnappliedFilters
                          ? "Generate Report"
                          : "Report Generated"}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={controlsDisabled || isFetching}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Printer size={15} />
                    Print Report
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handlePdfExport();
                    }}
                    disabled={controlsDisabled || isFetching}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 active:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activeExport === "pdf" ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <FileText size={15} />
                    )}

                    {activeExport === "pdf" ? "Exporting PDF..." : "Export PDF"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void handleExcelExport();
                    }}
                    disabled={controlsDisabled || isFetching}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 active:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activeExport === "excel" ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet size={15} />
                    )}

                    {activeExport === "excel"
                      ? "Exporting Excel..."
                      : "Export Excel"}
                  </button>
                </div>

                {hasUnappliedFilters && (
                  <p className="mt-2 text-right text-xs font-medium text-amber-700">
                    Click Generate Report to apply the selected month and year.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {sourceData.residents.length === 0 ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-10">
            <div className="mx-auto flex max-w-lg flex-col items-center text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-zinc-100 text-zinc-600">
                <SearchX size={26} />
              </div>

              <h2 className="mt-4 text-lg font-extrabold text-zinc-950">
                No approved residents found
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
                The report has no approved Owner or Renter accounts to include.
                Approve resident registrations before generating financial
                totals.
              </p>
            </div>
          </section>
        ) : (
          <>
            <section
              aria-label="Summary values"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
            >
              {summaryCards.map((card) => (
                <SummaryCard key={card.label} card={card} />
              ))}
            </section>

            <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
              <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="text-base font-extrabold text-zinc-950">
                    Monthly Summary
                  </h2>

                  <p className="mt-1 text-sm text-zinc-600">
                    Overview of collections and resident payments for{" "}
                    {report.year}.
                  </p>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                  <Banknote size={14} />
                  Selected: {report.reportPeriod}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-emerald-50/80 text-xs uppercase tracking-wide text-emerald-900">
                      <th className="border-b border-emerald-100 px-5 py-3.5 font-extrabold sm:px-6">
                        Month
                      </th>

                      <th className="border-b border-emerald-100 px-4 py-3.5 text-center font-extrabold">
                        Year
                      </th>

                      <th className="border-b border-emerald-100 px-4 py-3.5 text-center font-extrabold">
                        Total Residents
                      </th>

                      <th className="border-b border-emerald-100 px-4 py-3.5 text-center font-extrabold">
                        Paid Residents
                      </th>

                      <th className="border-b border-emerald-100 px-4 py-3.5 text-center font-extrabold">
                        Unpaid Residents
                      </th>

                      <th className="border-b border-emerald-100 px-4 py-3.5 text-right font-extrabold">
                        Total Collected
                      </th>

                      <th className="border-b border-emerald-100 px-5 py-3.5 text-right font-extrabold sm:px-6">
                        Remaining Balance
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.monthlySummary.map((row) => {
                      const isSelected = row.monthKey === report.monthKey;

                      return (
                        <tr
                          key={row.monthKey}
                          className={`border-b border-zinc-100 transition last:border-b-0 ${
                            isSelected
                              ? "bg-emerald-50 font-bold text-emerald-950"
                              : "text-zinc-700 hover:bg-zinc-50/80"
                          }`}
                        >
                          <td className="px-5 py-3.5 sm:px-6">
                            <div className="flex items-center gap-2">
                              <span>{row.month}</span>

                              {isSelected && (
                                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                                  Selected
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            {row.year}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            {formatNumber(row.totalResidents)}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={
                                row.paidResidents > 0
                                  ? "text-emerald-700"
                                  : "text-zinc-500"
                              }
                            >
                              {formatNumber(row.paidResidents)}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={
                                row.unpaidResidents > 0
                                  ? "text-red-600"
                                  : "text-zinc-500"
                              }
                            >
                              {formatNumber(row.unpaidResidents)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold">
                            {formatSummaryReportCurrency(row.totalCollected)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold sm:px-6">
                            <span
                              className={
                                row.remainingBalance > 0
                                  ? "text-amber-700"
                                  : "text-emerald-700"
                              }
                            >
                              {formatSummaryReportCurrency(
                                row.remainingBalance,
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
              <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="text-base font-extrabold text-zinc-950">
                    Residents with Unpaid Dues ({report.reportPeriod})
                  </h2>

                  <p className="mt-1 text-sm text-zinc-600">
                    Residents who have an unpaid payment status or a remaining
                    balance for the selected month.
                  </p>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-100">
                  <UserRoundX size={14} />
                  {formatNumber(report.unpaidResidents.length)} unpaid
                </span>
              </div>

              {report.unpaidResidents.length === 0 ? (
                <EmptyUnpaidResidentsState reportPeriod={report.reportPeriod} />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1020px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-emerald-50/80 text-xs uppercase tracking-wide text-emerald-900">
                          <th className="w-16 border-b border-emerald-100 px-5 py-3.5 text-center font-extrabold sm:px-6">
                            No.
                          </th>

                          <th className="border-b border-emerald-100 px-4 py-3.5 font-extrabold">
                            Resident Name
                          </th>

                          <th className="border-b border-emerald-100 px-4 py-3.5 font-extrabold">
                            Block / Lot
                          </th>

                          <th className="border-b border-emerald-100 px-4 py-3.5 font-extrabold">
                            Contact Number
                          </th>

                          <th className="border-b border-emerald-100 px-4 py-3.5 text-right font-extrabold">
                            Amount Due
                          </th>

                          <th className="border-b border-emerald-100 px-4 py-3.5 text-center font-extrabold">
                            Status
                          </th>

                          <th className="border-b border-emerald-100 px-5 py-3.5 text-center font-extrabold sm:px-6">
                            Due Date
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {report.unpaidResidents.map((resident, index) => (
                          <tr
                            key={`${resident.id}-${report.monthKey}`}
                            className="border-b border-zinc-100 text-zinc-700 transition last:border-b-0 hover:bg-zinc-50/80"
                          >
                            <td className="px-5 py-3.5 text-center font-semibold text-zinc-500 sm:px-6">
                              {index + 1}
                            </td>

                            <td className="px-4 py-3.5 font-bold text-zinc-900">
                              {resident.residentName}
                            </td>

                            <td className="px-4 py-3.5">{resident.blockLot}</td>

                            <td className="px-4 py-3.5">
                              {resident.contactNumber}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold text-red-600">
                              {formatSummaryReportCurrency(resident.amountDue)}
                            </td>

                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100">
                                {resident.status}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-3.5 text-center sm:px-6">
                              {resident.dueDate}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-zinc-200 bg-emerald-50/60 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="font-bold text-zinc-800">
                      Total Unpaid Residents:{" "}
                      <span className="text-red-600">
                        {formatNumber(report.unpaidResidents.length)}
                      </span>
                    </p>

                    <p className="font-bold text-zinc-800">
                      Total Amount Due:{" "}
                      <span className="text-red-600">
                        {formatSummaryReportCurrency(totalAmountDue)}
                      </span>
                    </p>
                  </div>
                </>
              )}
            </section>

            <section className="print-only hidden rounded-2xl border border-zinc-300 p-4 text-xs text-zinc-600">
              <div className="flex items-center justify-between gap-4">
                <p>Terra Dues Homeowners Association</p>

                <p>
                  Generated {generatedDateFormatter.format(report.generatedAt)}
                </p>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="no-print flex items-center justify-end">
        <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
          <Download size={13} />
          Exports and printing use the currently generated period:{" "}
          <span className="font-bold text-zinc-700">{report.reportPeriod}</span>
        </p>
      </div>
    </div>
  );
}
