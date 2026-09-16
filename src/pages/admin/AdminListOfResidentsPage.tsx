import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Image as ImageIcon,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import AppInput from "../../components/AppInput";
import {
  archiveResident,
  getAllUsers,
  updateResidentByAdmin,
  type AdminUpdateResidentPayload,
} from "../../features/auth/services/auth.service";
import type { User } from "../../types";
import { uploadToCloudinary } from "../../lib/cloudinary/cloudinary";

type Resident = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  contactNumber?: string;
  email?: string;
  gender?: string;
  userType: "Owner" | "Renter";
  picture?: string | null;
  document?: string | null;
  phase: string;
  block: string;
  lot: string;
  address?: string;
  familyMembers?: string;
  ownerName?: string;
  ownerContactNumber?: string;
  ownerAddress?: string;
  ownerNumberOccupants?: string;
};

type ResidentSourceUser = User & {
  userType: "Owner" | "Renter";
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

const getRawLocationNumber = (
  value: string,
  label: "Phase" | "Block" | "Lot",
) => clean(value).replace(new RegExp(`^${label}\\s+`, "i"), "");

const isResidentUser = (user: User): user is ResidentSourceUser =>
  user.userType === "Owner" || user.userType === "Renter";

const getResidentName = (resident: Resident) =>
  [resident.firstName, resident.middleName, resident.lastName]
    .filter(Boolean)
    .join(" ");

const getResidentLocation = (resident: Resident) => {
  const block = formatLocationPart(resident.block, "Block");
  const lot = formatLocationPart(resident.lot, "Lot");
  const phase = formatLocationPart(resident.phase, "Phase");

  return [block, lot, phase].filter(Boolean).join(" / ");
};

const getResidentAddress = (resident: Resident) => {
  const block = formatLocationPart(resident.block, "Block");
  const lot = formatLocationPart(resident.lot, "Lot");
  const phase = formatLocationPart(resident.phase, "Phase");
  const structuredAddress = [block, lot, phase].filter(Boolean).join(" ");

  return structuredAddress || clean(resident.address) || "-";
};

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

const toResident = (user: ResidentSourceUser): Resident => ({
  id: user.id,
  firstName: clean(user.firstName),
  middleName: clean(user.middleName),
  lastName: clean(user.lastName),
  contactNumber: clean(user.contactNumber),
  email: clean(user.email),
  gender: clean(user.gender),
  userType: user.userType,
  picture: user.picture,
  document: user.document,
  // Keep Firestore's raw numeric location values in state.
  // Labels such as Block/Lot/Phase are presentation only.
  phase: clean(user.phase),
  block: clean(user.block),
  lot: clean(user.lot),
  address: clean(user.address),
  familyMembers: "familyMembers" in user ? clean(user.familyMembers) : "",
  ownerName: "ownerName" in user ? clean(user.ownerName) : "",
  ownerContactNumber:
    "ownerContactNumber" in user ? clean(user.ownerContactNumber) : "",
  ownerAddress: "ownerAddress" in user ? clean(user.ownerAddress) : "",
  ownerNumberOccupants:
    "ownerNumberOccupants" in user ? clean(user.ownerNumberOccupants) : "",
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
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(
    null,
  );
  const [filePreview, setFilePreview] = useState<FilePreviewState | null>(null);
  const [residentToArchive, setResidentToArchive] = useState<Resident | null>(
    null,
  );
  const [isArchiving, setIsArchiving] = useState(false);
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

      setResidents(
        users
          .filter(isResidentUser)
          /*
           * Backward compatibility:
           *
           * Existing users without approvalStatus are treated as approved.
           * New pending and denied registrations are excluded.
           */
          .filter(
            (user) =>
              !user.approvalStatus || user.approvalStatus === "approved",
          )
          .map(toResident),
      );
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

  const handleArchiveResident = (resident: Resident) => {
    setResidentToArchive(resident);
  };

  const confirmArchiveResident = async () => {
    if (!residentToArchive || isArchiving) return;

    const residentId = residentToArchive.id;

    try {
      setIsArchiving(true);
      setDbError(null);
      await archiveResident(residentId);
      setResidents((current) =>
        current.filter((item) => item.id !== residentId),
      );
      if (selectedResident?.id === residentId) setSelectedResident(null);
      setResidentToArchive(null);
    } catch (error) {
      console.error("Failed to archive resident:", error);
      setDbError(
        error instanceof Error ? error.message : "Failed to archive resident.",
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const saveResidentChanges = async (
    residentId: string,
    payload: AdminUpdateResidentPayload,
  ) => {
    await updateResidentByAdmin(residentId, payload);

    setResidents((current) =>
      current.map((resident) =>
        resident.id === residentId ? { ...resident, ...payload } : resident,
      ),
    );

    setSelectedResident((current) =>
      current?.id === residentId ? { ...current, ...payload } : current,
    );
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/users/archive")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
          >
            <Archive size={17} />
            Archive
          </button>
          <button
            type="button"
            onClick={() => void loadResidents()}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
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
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedResident(resident)}
                            className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-black"
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchiveResident(resident)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                            title="Archive resident for 30 days"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
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
          onSave={saveResidentChanges}
        />
      )}

      {filePreview && (
        <FilePreviewModal
          preview={filePreview}
          onClose={() => setFilePreview(null)}
        />
      )}

      {residentToArchive && (
        <ArchiveResidentModal
          resident={residentToArchive}
          isArchiving={isArchiving}
          onCancel={() => {
            if (!isArchiving) setResidentToArchive(null);
          }}
          onConfirm={() => void confirmArchiveResident()}
        />
      )}
    </div>
  );
}

function ArchiveResidentModal({
  resident,
  isArchiving,
  onCancel,
  onConfirm,
}: {
  resident: Resident;
  isArchiving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const name = getResidentName(resident) || "this resident";

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isArchiving) onCancel();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isArchiving, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!isArchiving) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="archive-resident-title"
        aria-describedby="archive-resident-description"
        className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-zinc-950/20"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <Trash2 size={22} strokeWidth={2.2} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">
                Archive Resident
              </p>
              <h2
                id="archive-resident-title"
                className="mt-1 text-xl font-bold tracking-tight text-zinc-950"
              >
                Delete {name}?
              </h2>
              <p
                id="archive-resident-description"
                className="mt-2 text-sm font-medium leading-6 text-zinc-600"
              >
                This resident will be removed from all active resident lists and
                moved to the archive.
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={isArchiving}
              className="grid size-9 shrink-0 place-items-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close delete confirmation"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <Archive size={18} className="mt-0.5 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-bold text-amber-900">
                  You can still restore this resident
                </p>
                <p className="mt-1 text-xs font-medium leading-5 text-amber-800">
                  The resident stays in the archive for 30 days. After that, the
                  resident is permanently deleted if not restored.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isArchiving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isArchiving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isArchiving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Resident
                </>
              )}
            </button>
          </div>
        </div>
      </div>
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
  onSave,
}: {
  resident: Resident;
  onClose: () => void;
  onViewValidId: () => void;
  onViewDocument: () => void;
  onSave: (
    residentId: string,
    payload: AdminUpdateResidentPayload,
  ) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [pictureMarkedForDeletion, setPictureMarkedForDeletion] =
    useState(false);
  const [documentMarkedForDeletion, setDocumentMarkedForDeletion] =
    useState(false);
  const [pictureError, setPictureError] = useState("");
  const [documentError, setDocumentError] = useState("");
  const pictureInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<AdminUpdateResidentPayload>({
    firstName: resident.firstName,
    middleName: resident.middleName ?? "",
    lastName: resident.lastName,
    contactNumber: resident.contactNumber ?? "",
    gender: resident.gender ?? "",
    userType: resident.userType,
    phase: getRawLocationNumber(resident.phase, "Phase"),
    block: getRawLocationNumber(resident.block, "Block"),
    lot: getRawLocationNumber(resident.lot, "Lot"),
    address: resident.address ?? "",
    familyMembers: resident.familyMembers ?? "",
    ownerName: resident.ownerName ?? "",
    ownerContactNumber: resident.ownerContactNumber ?? "",
    ownerAddress: resident.ownerAddress ?? "",
    ownerNumberOccupants: resident.ownerNumberOccupants ?? "",
  });

  useEffect(() => {
    setForm({
      firstName: resident.firstName,
      middleName: resident.middleName ?? "",
      lastName: resident.lastName,
      contactNumber: resident.contactNumber ?? "",
      gender: resident.gender ?? "",
      userType: resident.userType,
      phase: getRawLocationNumber(resident.phase, "Phase"),
      block: getRawLocationNumber(resident.block, "Block"),
      lot: getRawLocationNumber(resident.lot, "Lot"),
      address: resident.address ?? "",
      familyMembers: resident.familyMembers ?? "",
      ownerName: resident.ownerName ?? "",
      ownerContactNumber: resident.ownerContactNumber ?? "",
      ownerAddress: resident.ownerAddress ?? "",
      ownerNumberOccupants: resident.ownerNumberOccupants ?? "",
    });
  }, [resident]);

  const name = getResidentName(resident) || "Unnamed resident";
  const location = getResidentLocation(resident);

  const setField = <K extends keyof AdminUpdateResidentPayload>(
    field: K,
    value: AdminUpdateResidentPayload[K],
  ) => {
    setSaveError(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const cancelEditing = () => {
    setForm({
      firstName: resident.firstName,
      middleName: resident.middleName ?? "",
      lastName: resident.lastName,
      contactNumber: resident.contactNumber ?? "",
      gender: resident.gender ?? "",
      userType: resident.userType,
      phase: getRawLocationNumber(resident.phase, "Phase"),
      block: getRawLocationNumber(resident.block, "Block"),
      lot: getRawLocationNumber(resident.lot, "Lot"),
      address: resident.address ?? "",
      familyMembers: resident.familyMembers ?? "",
      ownerName: resident.ownerName ?? "",
      ownerContactNumber: resident.ownerContactNumber ?? "",
      ownerAddress: resident.ownerAddress ?? "",
      ownerNumberOccupants: resident.ownerNumberOccupants ?? "",
    });
    setPictureFile(null);
    setDocumentFile(null);
    setPictureMarkedForDeletion(false);
    setDocumentMarkedForDeletion(false);
    setPictureError("");
    setDocumentError("");
    setSaveError(null);
    setIsEditing(false);
  };

  // These validators intentionally mirror SignUpOwner.tsx / SignUpRenter.tsx.
  const validateName = (value: string, label: string, required = true) => {
    const trimmed = value.trim();
    if (!trimmed) return required ? `${label} is required` : "";
    if (trimmed.length < 2) return `${label} must be at least 2 characters`;
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(trimmed))
      return `${label} can only contain letters, spaces, hyphens, and apostrophes`;
    return "";
  };

  const validateContactNumber = (value: string) => {
    const contact = value.trim();
    if (!contact) return "Contact number is required";
    if (!/^\d+$/.test(contact))
      return "Contact number must contain numbers only";
    if (contact.length >= 1 && contact[0] !== "0")
      return "Contact number must start with 09";
    if (contact.length >= 2 && !contact.startsWith("09"))
      return "Contact number must start with 09";
    if (contact.length < 11) {
      const remaining = 11 - contact.length;
      return `Contact number needs ${remaining} more digit${remaining === 1 ? "" : "s"}`;
    }
    if (contact.length > 11) return "Contact number must be exactly 11 digits";
    if (!/^09\d{9}$/.test(contact))
      return "Please enter a valid Philippine mobile number";
    return "";
  };

  const validateAddressNumber = (value: string, label: string) => {
    const trimmed = value.trim().replace(new RegExp(`^${label}\\s+`, "i"), "");
    if (!trimmed) return `${label} is required`;
    if (!/^\d+$/.test(trimmed)) return `${label} must contain numbers only`;
    if (Number(trimmed) <= 0) return `${label} must be greater than 0`;
    return "";
  };

  const validateFamilyMembers = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "Number of family members is required";
    if (!/^\d+$/.test(trimmed))
      return "Number of family members must contain numbers only";
    if (Number(trimmed) < 1)
      return "Number of family members must be at least 1";
    return "";
  };

  const validateOwnerAddress = (value: string) =>
    value.trim() ? "" : "Owner's address is required";

  const validateOccupants = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "Number of occupants is required";
    if (!/^\d+$/.test(trimmed))
      return "Number of occupants must contain numbers only";
    if (Number(trimmed) < 1) return "Number of occupants must be at least 1";
    return "";
  };

  const MAX_IMAGE_MB = 5;
  const MAX_DOC_MB = 10;

  const isImageFile = (file: File) => file.type.startsWith("image/");

  const isAllowedDocument = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExtensions = [".pdf", ".doc", ".docx"];
    return (
      allowedTypes.includes(file.type) ||
      allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
  };

  const handlePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSaveError(null);

    if (!file) {
      setPictureFile(null);
      setPictureError(
        resident.picture ? "" : "Valid Government ID is required",
      );
      return;
    }
    if (!isImageFile(file)) {
      setPictureFile(null);
      setPictureError("Please upload a valid image file");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setPictureFile(null);
      setPictureError(`Image must be less than ${MAX_IMAGE_MB}MB`);
      event.target.value = "";
      return;
    }

    setPictureFile(file);
    setPictureMarkedForDeletion(false);
    setPictureError("");
  };

  const handleDocumentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSaveError(null);

    if (!file) {
      setDocumentFile(null);
      setDocumentError("");
      return;
    }
    if (!isAllowedDocument(file)) {
      setDocumentFile(null);
      setDocumentError("Document must be PDF, DOC, or DOCX");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      setDocumentFile(null);
      setDocumentError(`Document must be less than ${MAX_DOC_MB}MB`);
      event.target.value = "";
      return;
    }

    setDocumentFile(file);
    setDocumentMarkedForDeletion(false);
    setDocumentError("");
  };

  const handleDeletePicture = () => {
    setPictureFile(null);
    setPictureMarkedForDeletion(true);
    setPictureError("Valid Government ID is required");
    setSaveError(null);
    if (pictureInputRef.current) pictureInputRef.current.value = "";
  };

  const handleDeleteDocument = () => {
    setDocumentFile(null);
    setDocumentMarkedForDeletion(true);
    setDocumentError("");
    setSaveError(null);
    if (documentInputRef.current) documentInputRef.current.value = "";
  };

  const fieldErrors = {
    firstName: validateName(form.firstName, "First name", true),
    middleName: validateName(form.middleName, "Middle name", false),
    lastName: validateName(form.lastName, "Last name", true),
    gender: form.gender ? "" : "Gender is required",
    contactNumber: validateContactNumber(form.contactNumber),
    phase: validateAddressNumber(form.phase, "Phase"),
    block: validateAddressNumber(form.block, "Block"),
    lot: validateAddressNumber(form.lot, "Lot"),
    familyMembers:
      form.userType === "Owner"
        ? validateFamilyMembers(form.familyMembers ?? "")
        : "",
    ownerName:
      form.userType === "Renter"
        ? validateName(form.ownerName ?? "", "Owner's name", true)
        : "",
    ownerContactNumber:
      form.userType === "Renter"
        ? validateContactNumber(form.ownerContactNumber ?? "")
        : "",
    ownerAddress:
      form.userType === "Renter"
        ? validateOwnerAddress(form.ownerAddress ?? "")
        : "",
    ownerNumberOccupants:
      form.userType === "Renter"
        ? validateOccupants(form.ownerNumberOccupants ?? "")
        : "",
  };

  const hasRequiredPicture = Boolean(
    pictureFile || (resident.picture && !pictureMarkedForDeletion),
  );
  const formIsValid =
    Object.values(fieldErrors).every((error) => !error) &&
    hasRequiredPicture &&
    !pictureError &&
    !documentError;
  const validationMessage = (
    error: string,
    value: string,
    success = "Valid",
  ) =>
    error ? (
      <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>
    ) : value.trim() ? (
      <p className="mt-1 text-xs font-semibold text-emerald-600">{success}</p>
    ) : null;

  const handleSave = async () => {
    if (!formIsValid) {
      setSaveError(
        "Please correct the required registration details before saving.",
      );
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      let pictureUrl = pictureMarkedForDeletion
        ? null
        : (resident.picture ?? null);
      let documentUrl = documentMarkedForDeletion
        ? null
        : (resident.document ?? null);

      if (pictureFile) {
        pictureUrl = await uploadToCloudinary(
          pictureFile,
          "terradues/users/profile",
          "image",
        );
        if (!pictureUrl)
          throw new Error("Failed to upload Valid Government ID.");
      }

      if (!pictureUrl) {
        setPictureError("Valid Government ID is required");
        throw new Error("Valid Government ID is required.");
      }

      if (documentFile) {
        documentUrl = await uploadToCloudinary(
          documentFile,
          "terradues/users/document",
          "raw",
        );
        if (!documentUrl) throw new Error("Failed to upload document.");
      }

      await onSave(resident.id, {
        ...form,
        picture: pictureUrl,
        document: documentUrl,
      });
      setPictureFile(null);
      setDocumentFile(null);
      setPictureMarkedForDeletion(false);
      setDocumentMarkedForDeletion(false);
      setPictureError("");
      setDocumentError("");
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update resident:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to update resident.",
      );
    } finally {
      setIsSaving(false);
    }
  };

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
              </div>
              {location && (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-zinc-500">
                  <MapPin size={16} />
                  {location}
                </p>
              )}
            </div>
          </div>

          {saveError && (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
              {saveError}
            </div>
          )}

          {isEditing ? (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-bold text-zinc-900">
                    Valid Government ID <span className="text-rose-600">*</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    Required. Image only, maximum 5MB.
                  </p>
                  <input
                    ref={pictureInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePictureChange}
                    className="hidden"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => pictureInputRef.current?.click()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      <ImageIcon size={16} />
                      {pictureFile
                        ? "Change Selected ID"
                        : resident.picture && !pictureMarkedForDeletion
                          ? "Replace Valid ID"
                          : "Upload Valid ID"}
                    </button>

                    {(resident.picture || pictureFile) &&
                      !pictureMarkedForDeletion && (
                        <button
                          type="button"
                          onClick={handleDeletePicture}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 size={16} />
                          Delete ID
                        </button>
                      )}
                  </div>
                  <p className="mt-2 break-all text-xs font-medium text-zinc-600">
                    {pictureFile
                      ? pictureFile.name
                      : pictureMarkedForDeletion
                        ? "Current Valid ID marked for deletion. Upload a replacement to continue."
                        : resident.picture
                          ? "Current Valid ID will be kept unless replaced or deleted."
                          : "No Valid ID uploaded."}
                  </p>
                  {pictureError ? (
                    <p className="mt-1 text-xs font-semibold text-rose-600">
                      {pictureError}
                    </p>
                  ) : hasRequiredPicture ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-600">
                      Valid Government ID provided
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-rose-600">
                      Valid Government ID is required
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-bold text-zinc-900">
                    Additional Document
                  </p>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    Optional. PDF, DOC, or DOCX, maximum 10MB.
                  </p>
                  <input
                    ref={documentInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleDocumentChange}
                    className="hidden"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => documentInputRef.current?.click()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-black"
                    >
                      <FileText size={16} />
                      {documentFile
                        ? "Change Selected Document"
                        : resident.document && !documentMarkedForDeletion
                          ? "Replace Document"
                          : "Upload Document"}
                    </button>

                    {(resident.document || documentFile) &&
                      !documentMarkedForDeletion && (
                        <button
                          type="button"
                          onClick={handleDeleteDocument}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 size={16} />
                          Delete Document
                        </button>
                      )}
                  </div>
                  <p className="mt-2 break-all text-xs font-medium text-zinc-600">
                    {documentFile
                      ? documentFile.name
                      : documentMarkedForDeletion
                        ? "Current document marked for deletion. This field is optional."
                        : resident.document
                          ? "Current document will be kept unless replaced or deleted."
                          : "No document uploaded (optional)."}
                  </p>
                  {documentError && (
                    <p className="mt-1 text-xs font-semibold text-rose-600">
                      {documentError}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <AppInput
                  label="First Name"
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                />
                {validationMessage(
                  fieldErrors.firstName,
                  form.firstName,
                  "Valid first name",
                )}
              </div>
              <div>
                <AppInput
                  label="Middle Name"
                  value={form.middleName}
                  onChange={(e) => setField("middleName", e.target.value)}
                />
                {validationMessage(
                  fieldErrors.middleName,
                  form.middleName,
                  "Valid middle name",
                )}
              </div>
              <div>
                <AppInput
                  label="Last Name"
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                />
                {validationMessage(
                  fieldErrors.lastName,
                  form.lastName,
                  "Valid last name",
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => setField("gender", e.target.value)}
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 outline-none focus:border-emerald-500"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {validationMessage(
                  fieldErrors.gender,
                  form.gender,
                  "Gender selected",
                )}
              </div>
              <div>
                <AppInput
                  label="Contact Number"
                  value={form.contactNumber}
                  onChange={(e) =>
                    setField("contactNumber", e.target.value.replace(/\D/g, ""))
                  }
                />
                {validationMessage(
                  fieldErrors.contactNumber,
                  form.contactNumber,
                  "Valid Philippine mobile number",
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  Email
                </label>
                <input
                  value={resident.email || ""}
                  disabled
                  readOnly
                  className="h-12 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 px-4 text-sm font-medium text-zinc-500"
                />
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  Email cannot be changed by an admin.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">
                  User Type
                </label>
                <select
                  value={form.userType}
                  onChange={(e) =>
                    setField("userType", e.target.value as "Owner" | "Renter")
                  }
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 outline-none focus:border-emerald-500"
                >
                  <option value="Owner">Owner</option>
                  <option value="Renter">Renter</option>
                </select>
              </div>
              <div>
                <AppInput
                  label="Phase"
                  value={form.phase}
                  onChange={(e) =>
                    setField("phase", e.target.value.replace(/\D/g, ""))
                  }
                />
                {validationMessage(
                  fieldErrors.phase,
                  form.phase,
                  "Valid phase",
                )}
              </div>
              <div>
                <AppInput
                  label="Block"
                  value={form.block}
                  onChange={(e) =>
                    setField("block", e.target.value.replace(/\D/g, ""))
                  }
                />
                {validationMessage(
                  fieldErrors.block,
                  form.block,
                  "Valid block",
                )}
              </div>
              <div>
                <AppInput
                  label="Lot"
                  value={form.lot}
                  onChange={(e) =>
                    setField("lot", e.target.value.replace(/\D/g, ""))
                  }
                />
                {validationMessage(fieldErrors.lot, form.lot, "Valid lot")}
              </div>

              {form.userType === "Owner" ? (
                <div className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <h4 className="text-sm font-bold text-emerald-900">
                    Owner Registration Details
                  </h4>
                  <p className="mb-3 mt-1 text-xs font-medium text-emerald-700">
                    Required when the resident is an Owner.
                  </p>
                  <AppInput
                    label="Number of Family Members"
                    value={form.familyMembers ?? ""}
                    onChange={(e) =>
                      setField(
                        "familyMembers",
                        e.target.value.replace(/\D/g, ""),
                      )
                    }
                  />
                  {validationMessage(
                    fieldErrors.familyMembers,
                    form.familyMembers ?? "",
                    "Valid number of family members",
                  )}
                </div>
              ) : (
                <div className="sm:col-span-2 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                  <h4 className="text-sm font-bold text-blue-900">
                    Homeowner Details
                  </h4>
                  <p className="mb-3 mt-1 text-xs font-medium text-blue-700">
                    Required when the resident is a Renter.
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <AppInput
                        label="Owner's Full Name"
                        value={form.ownerName ?? ""}
                        onChange={(e) => setField("ownerName", e.target.value)}
                      />
                      {validationMessage(
                        fieldErrors.ownerName,
                        form.ownerName ?? "",
                        "Valid owner name",
                      )}
                    </div>
                    <div>
                      <AppInput
                        label="Owner's Contact Number"
                        value={form.ownerContactNumber ?? ""}
                        onChange={(e) =>
                          setField(
                            "ownerContactNumber",
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
                      />
                      {validationMessage(
                        fieldErrors.ownerContactNumber,
                        form.ownerContactNumber ?? "",
                        "Valid Philippine mobile number",
                      )}
                    </div>
                    <div>
                      <AppInput
                        label="Owner's Address"
                        value={form.ownerAddress ?? ""}
                        onChange={(e) =>
                          setField("ownerAddress", e.target.value)
                        }
                      />
                      {validationMessage(
                        fieldErrors.ownerAddress,
                        form.ownerAddress ?? "",
                        "Valid owner address",
                      )}
                    </div>
                    <div>
                      <AppInput
                        label="Number of Occupants"
                        value={form.ownerNumberOccupants ?? ""}
                        onChange={(e) =>
                          setField(
                            "ownerNumberOccupants",
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
                      />
                      {validationMessage(
                        fieldErrors.ownerNumberOccupants,
                        form.ownerNumberOccupants ?? "",
                        "Valid number of occupants",
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem
                label="First Name"
                value={resident.firstName || "-"}
              />
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
              <DetailItem label="Phase" value={resident.phase || "-"} />
              <DetailItem label="Block" value={resident.block || "-"} />
              <DetailItem label="Lot" value={resident.lot || "-"} />
              {resident.userType === "Owner" ? (
                <DetailItem
                  label="Number of Family Members"
                  value={resident.familyMembers || "-"}
                  className="sm:col-span-2"
                />
              ) : (
                <>
                  <div className="sm:col-span-2 mt-2">
                    <h4 className="text-sm font-bold text-zinc-900">
                      Homeowner Details
                    </h4>
                  </div>
                  <DetailItem
                    label="Owner's Full Name"
                    value={resident.ownerName || "-"}
                  />
                  <DetailItem
                    label="Owner's Contact Number"
                    value={resident.ownerContactNumber || "-"}
                  />
                  <DetailItem
                    label="Owner's Address"
                    value={resident.ownerAddress || "-"}
                  />
                  <DetailItem
                    label="Number of Occupants"
                    value={resident.ownerNumberOccupants || "-"}
                  />
                </>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving || !formIsValid}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Pencil size={17} />
                  Edit Details
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
              </>
            )}
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
