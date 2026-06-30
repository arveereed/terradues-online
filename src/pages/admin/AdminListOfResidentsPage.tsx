import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Image as ImageIcon,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import AppInput from "../../components/AppInput";
import { getAllUsers } from "../../features/auth/services/auth.service";
import type { User } from "../../types";

type Resident = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  contactNumber?: string;
  email?: string;
  gender?: string;
  userType: "Owner" | "Renter";
  occupancyType: string;
  picture?: string | null;
  document?: string | null;
  phase: string;
  block: string;
  lot: string;
  address?: string;
};

type ResidentSourceUser = User & {
  userType: "Owner" | "Renter";
  occupancyType?: unknown;
};

type FilePreviewType = "image" | "pdf" | "unsupported";

type FilePreviewState = {
  type: FilePreviewType;
  title: string;
  url: string;
};

const ROWS_PER_PAGE = 5;
const ALL_FILTER = "All";
const GENDER_OPTIONS = [ALL_FILTER, "Male", "Female"];

const clean = (value: string | undefined | null) => value?.trim() ?? "";

const formatLocationPart = (
  value: string | undefined | null,
  label: "Phase" | "Block" | "Lot",
) => {
  const trimmed = clean(value);
  if (!trimmed) return "";
  if (trimmed.toLowerCase().startsWith(label.toLowerCase())) return trimmed;
  return `${label} ${trimmed}`;
};

const isResidentUser = (user: User): user is ResidentSourceUser =>
  user.userType === "Owner" || user.userType === "Renter";

const getResidentName = (resident: Resident) =>
  [resident.firstName, resident.middleName, resident.lastName]
    .filter(Boolean)
    .join(" ");

const getResidentLocation = (resident: Resident) =>
  [resident.phase, resident.block, resident.lot].filter(Boolean).join(" / ");

const getResidentAddress = (resident: Resident) =>
  `${resident.block} ${resident.lot} ${resident.phase}` ||
  getResidentLocation(resident) ||
  "-";

const getInitials = (resident: Resident) => {
  const first = resident.firstName.charAt(0);
  const last = resident.lastName.charAt(0);
  return `${first}${last}`.toUpperCase() || "R";
};

const getPreviewableUrl = (url: string) => {
  const trimmed = url.trim();

  if (!trimmed) return "";

  return trimmed;
};

const isImageUrl = (url: string) => {
  const cleanUrl = url.split("?")[0].toLowerCase();

  return (
    /\.(jpg|jpeg|png|webp|gif)$/i.test(cleanUrl) ||
    cleanUrl.includes("/image/upload/")
  );
};

const isPdfUrl = (url: string) => {
  const cleanUrl = url.split("?")[0].toLowerCase();

  return cleanUrl.endsWith(".pdf") || cleanUrl.includes(".pdf");
};

const getFilePreviewType = (url: string): FilePreviewType => {
  if (isImageUrl(url)) return "image";
  if (isPdfUrl(url)) return "pdf";

  return "unsupported";
};

const getOccupancyType = (user: ResidentSourceUser) => {
  if (Array.isArray(user.occupancyType) && user.occupancyType.length > 0) {
    return user.occupancyType.filter(Boolean).map(String).join(", ");
  }

  return user.userType === "Renter" ? "Occupied" : "Not set";
};

const toResident = (user: ResidentSourceUser): Resident => ({
  id: user.id,
  firstName: clean(user.firstName),
  middleName: clean(user.middleName),
  lastName: clean(user.lastName),
  contactNumber: clean(user.contactNumber),
  email: clean(user.email),
  gender: clean(user.gender),
  userType: user.userType,
  occupancyType: getOccupancyType(user),
  picture: user.picture,
  document: user.document,
  phase: formatLocationPart(user.phase, "Phase"),
  block: formatLocationPart(user.block, "Block"),
  lot: formatLocationPart(user.lot, "Lot"),
  address: clean(user.address),
});

const getPageNumbers = (currentPage: number, totalPages: number) => {
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = Math.max(1, currentPage - 2);
  let end = start + maxVisiblePages - 1;

  if (end > totalPages) {
    end = totalPages;
    start = end - maxVisiblePages + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

export default function AdminListOfResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(
    null,
  );
  const [filePreview, setFilePreview] = useState<FilePreviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGender, setSelectedGender] = useState(ALL_FILTER);
  const [currentPage, setCurrentPage] = useState(1);

  const loadResidents = async () => {
    setLoading(true);
    setDbError(null);

    try {
      const users = await getAllUsers();
      setResidents(users.filter(isResidentUser).map(toResident));
    } catch (error) {
      console.error("getAllUsers failed:", error);
      setResidents([]);
      setDbError(
        error instanceof Error ? error.message : "Failed to load residents.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadResidents();
  }, []);

  useEffect(() => {
    if (!selectedResident && !filePreview) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (filePreview) {
        setFilePreview(null);
        return;
      }

      setSelectedResident(null);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedResident, filePreview]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedGender]);

  const filteredResidents = useMemo(() => {
    const search = query.trim().toLowerCase();

    return residents.filter((resident) => {
      const name = getResidentName(resident).toLowerCase();
      const address = getResidentAddress(resident).toLowerCase();
      const gender = clean(resident.gender).toLowerCase();

      const matchesSearch =
        !search || name.includes(search) || address.includes(search);

      const matchesGender =
        selectedGender === ALL_FILTER ||
        gender === selectedGender.toLowerCase();

      return matchesSearch && matchesGender;
    });
  }, [query, residents, selectedGender]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredResidents.length / ROWS_PER_PAGE),
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const paginatedResidents = filteredResidents.slice(startIndex, endIndex);

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const activeFilterCount = Number(selectedGender !== ALL_FILTER);

  const showingStart = filteredResidents.length === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(endIndex, filteredResidents.length);

  const clearFilters = () => {
    setSelectedGender(ALL_FILTER);
  };

  const openValidIdPreview = (resident: Resident) => {
    const url = getPreviewableUrl(resident.picture ?? "");

    if (!url) {
      setFilePreview({
        type: "unsupported",
        title: "No valid ID uploaded",
        url: "",
      });
      return;
    }

    setFilePreview({
      type: "image",
      title: `${getResidentName(resident) || "Resident"} - Valid ID`,
      url,
    });
  };

  const openDocumentPreview = (resident: Resident) => {
    const url = getPreviewableUrl(resident.document ?? "");

    if (!url) {
      setFilePreview({
        type: "unsupported",
        title: "No document uploaded",
        url: "",
      });
      return;
    }

    setFilePreview({
      type: getFilePreviewType(url),
      title: `${getResidentName(resident) || "Resident"} - Document`,
      url,
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Residents Directory
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            List of Residents
          </h1>

          <p className="mt-1 text-sm font-medium text-zinc-500">
            Manage and review registered homeowners and renters.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadResidents()}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {dbError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">Firestore error</p>
          <p className="mt-1 text-xs font-medium text-rose-800">{dbError}</p>
        </div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
            />

            <AppInput
              value={query}
              className="h-12 w-full rounded-xl pl-11 text-sm font-medium"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resident name or address..."
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition ${
              showFilters || activeFilterCount > 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <SlidersHorizontal size={17} />
            Filters
            {activeFilterCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <GenderFilterButtons
                value={selectedGender}
                onChange={setSelectedGender}
              />

              <button
                type="button"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Residents Table
            </h2>
            <p className="text-sm font-medium text-zinc-500">
              Showing {filteredResidents.length} of {residents.length} residents
            </p>
          </div>
        </div>

        {loading ? (
          <TableLoadingState />
        ) : filteredResidents.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <TableHead>Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100 bg-white">
                  {paginatedResidents.map((resident) => (
                    <tr
                      key={resident.id}
                      className="transition hover:bg-emerald-50/40"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-500 ring-1 ring-zinc-200">
                            {resident.picture ? (
                              <img
                                src={resident.picture}
                                alt={getResidentName(resident)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(resident)
                            )}
                          </div>

                          <p className="text-sm font-semibold text-zinc-900">
                            {getResidentName(resident) || "Unnamed resident"}
                          </p>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-zinc-600">
                        {resident.gender || "-"}
                      </td>

                      <td className="min-w-[280px] px-5 py-4 text-sm font-medium text-zinc-600">
                        {getResidentAddress(resident)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedResident(resident)}
                          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-black"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              showingStart={showingStart}
              showingEnd={showingEnd}
              totalResults={filteredResidents.length}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </section>

      {selectedResident && (
        <ResidentDetailsModal
          resident={selectedResident}
          onClose={() => setSelectedResident(null)}
          onViewValidId={() => openValidIdPreview(selectedResident)}
          onViewDocument={() => openDocumentPreview(selectedResident)}
        />
      )}

      {filePreview && (
        <FilePreviewModal
          preview={filePreview}
          onClose={() => setFilePreview(null)}
        />
      )}
    </div>
  );
}

function GenderFilterButtons({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Gender
      </p>

      <div className="flex flex-wrap gap-2">
        {GENDER_OPTIONS.map((gender) => (
          <button
            key={gender}
            type="button"
            onClick={() => onChange(gender)}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${
              value === gender
                ? "bg-emerald-600 text-white shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {gender}
          </button>
        ))}
      </div>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  pageNumbers,
  showingStart,
  showingEnd,
  totalResults,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  pageNumbers: number[];
  showingStart: number;
  showingEnd: number;
  totalResults: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-zinc-500">
        Showing{" "}
        <span className="font-semibold text-zinc-800">{showingStart}</span> to{" "}
        <span className="font-semibold text-zinc-800">{showingEnd}</span> of{" "}
        <span className="font-semibold text-zinc-800">{totalResults}</span>{" "}
        results
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft size={17} />
        </button>

        {pageNumbers.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`inline-flex size-9 items-center justify-center rounded-xl text-sm font-semibold transition ${
              currentPage === page
                ? "bg-emerald-600 text-white shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

function ResidentDetailsModal({
  resident,
  onClose,
  onViewValidId,
  onViewDocument,
}: {
  resident: Resident;
  onClose: () => void;
  onViewValidId: () => void;
  onViewDocument: () => void;
}) {
  const name = getResidentName(resident) || "Unnamed resident";
  const location = getResidentLocation(resident);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/90 p-5 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Resident Details
            </p>

            <h2 className="mt-1 text-lg font-semibold text-zinc-950">{name}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
            aria-label="Close resident details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-zinc-100 text-xl font-semibold text-zinc-500 ring-1 ring-zinc-200">
              {resident.picture ? (
                <img
                  src={resident.picture}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound size={34} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-2xl font-bold tracking-tight text-zinc-950">
                {name}
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge
                  value={resident.userType}
                  className={
                    resident.userType === "Owner"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : "bg-blue-50 text-blue-700 ring-blue-100"
                  }
                />

                <Badge
                  value={resident.occupancyType}
                  className="bg-zinc-100 text-zinc-600 ring-zinc-200"
                />
              </div>

              {location && (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-zinc-500">
                  <MapPin size={16} />
                  {location}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem label="First Name" value={resident.firstName || "-"} />
            <DetailItem
              label="Middle Name"
              value={resident.middleName || "-"}
            />
            <DetailItem label="Last Name" value={resident.lastName || "-"} />
            <DetailItem label="Gender" value={resident.gender || "-"} />

            <DetailItem
              icon={<Phone size={15} />}
              label="Contact Number"
              value={resident.contactNumber || "-"}
            />

            <DetailItem
              icon={<Mail size={15} />}
              label="Email"
              value={resident.email || "-"}
            />

            <DetailItem label="User Type" value={resident.userType} />
            <DetailItem label="Occupancy Type" value={resident.occupancyType} />
            <DetailItem label="Phase" value={resident.phase || "-"} />
            <DetailItem label="Block" value={resident.block || "-"} />
            <DetailItem label="Lot" value={resident.lot || "-"} />

            <DetailItem
              label="Address"
              value={resident.address || location || "-"}
              className="sm:col-span-2"
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
            >
              Close
            </button>

            <button
              type="button"
              onClick={onViewValidId}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <ImageIcon size={17} />
              {resident.picture ? "View Valid ID" : "No Valid ID Uploaded"}
            </button>

            <button
              type="button"
              onClick={onViewDocument}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-black"
            >
              <FileText size={17} />
              {resident.document ? "View Document" : "No Document Uploaded"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilePreviewModal({
  preview,
  onClose,
}: {
  preview: FilePreviewState;
  onClose: () => void;
}) {
  const hasFile = Boolean(preview.url);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 bg-white p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              File Preview
            </p>

            <h2 className="mt-1 text-lg font-semibold text-zinc-950">
              {preview.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
            aria-label="Close file preview"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-[360px] flex-1 overflow-auto bg-zinc-50 p-5">
          {!hasFile ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
              <FileText size={40} className="text-zinc-400" />

              <p className="mt-4 text-base font-semibold text-zinc-900">
                {preview.title}
              </p>

              <p className="mt-1 text-sm font-medium text-zinc-500">
                There is no uploaded file for this resident.
              </p>
            </div>
          ) : preview.type === "image" ? (
            <div className="flex justify-center rounded-2xl border border-zinc-200 bg-white p-4">
              <img
                src={preview.url}
                alt={preview.title}
                className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain"
              />
            </div>
          ) : preview.type === "pdf" ? (
            <div className="h-[70vh] overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <iframe
                src={preview.url}
                title={preview.title}
                className="h-full w-full"
              />
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
              <FileText size={40} className="text-zinc-400" />

              <p className="mt-4 text-base font-semibold text-zinc-900">
                Preview is not available for this document type.
              </p>

              <p className="mt-1 max-w-md text-sm font-medium text-zinc-500">
                This file may be a DOC or DOCX document. Browser preview is not
                supported for this type.
              </p>

              <a
                href={preview.url}
                download
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-black"
              >
                <Eye size={17} />
                Download File
              </a>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-zinc-200 bg-white p-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

function TableHead({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 ${className}`}
    >
      {children}
    </th>
  );
}

function Badge({ value, className }: { value: string; className: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${className}`}
    >
      {value}
    </span>
  );
}

function DetailItem({
  icon,
  label,
  value,
  className = "",
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 ${className}`}
    >
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {icon}
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-zinc-100">
        <Search className="text-zinc-400" />
      </div>

      <p className="mt-4 text-base font-semibold text-zinc-900">
        No residents found.
      </p>

      <p className="mt-1 text-sm font-medium text-zinc-500">
        Try another name, address, or adjust the gender filter.
      </p>
    </div>
  );
}

function TableLoadingState() {
  return (
    <div className="p-5">
      <div className="space-y-3">
        {Array.from({ length: ROWS_PER_PAGE }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-4 gap-4 rounded-2xl border border-zinc-100 p-4"
          >
            <div className="h-5 animate-pulse rounded-full bg-zinc-100" />
            <div className="h-5 animate-pulse rounded-full bg-zinc-100" />
            <div className="h-5 animate-pulse rounded-full bg-zinc-100" />
            <div className="h-5 animate-pulse rounded-full bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
