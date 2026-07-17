import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { useClerk, useUser } from "@clerk/clerk-react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  File as FileIcon,
  FilePenLine,
  Image,
  LogOut,
  Send,
  Trash2,
} from "lucide-react";
import AppInput from "../../components/AppInput";

import { uploadToCloudinary } from "../../lib/cloudinary/cloudinary";
import { useFirestoreUser } from "../../features/auth/hooks/useFirestoreUser";

import {
  resubmitDeniedRegistration,
  type ResubmitDeniedRegistrationPayload,
} from "../../features/auth/services/auth.service";

type RegistrationForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  contactNumber: string;
  gender: string;
  phase: string;
  block: string;
  lot: string;

  familyMembers: string;
  occupancyType: string[];
  forRent: boolean;

  ownerName: string;
  ownerContactNumber: string;
  ownerAddress: string;
  ownerNumberOccupants: string;
};

const initialForm: RegistrationForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  contactNumber: "",
  gender: "",
  phase: "",
  block: "",
  lot: "",

  familyMembers: "",
  occupancyType: [],
  forRent: false,

  ownerName: "",
  ownerContactNumber: "",
  ownerAddress: "",
  ownerNumberOccupants: "",
};

const MAX_IMAGE_MB = 5;
const MAX_DOCUMENT_MB = 10;

const allowedDocumentTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const isAllowedDocument = (file: File) =>
  allowedDocumentTypes.includes(file.type) ||
  /\.(pdf|doc|docx)$/i.test(file.name);

const numbersOnly = (value: string) => value.replace(/\D/g, "");

export default function RegistrationDeniedPage() {
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();

  const {
    data: resident,
    isLoading,
    error: loadError,
  } = useFirestoreUser(clerkUser?.id);

  const [form, setForm] = useState<RegistrationForm>(initialForm);

  const [editing, setEditing] = useState(false);

  const [success, setSuccess] = useState("");

  const [formError, setFormError] = useState("");

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [governmentIdFile, setGovernmentIdFile] = useState<File | null>(null);

  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [governmentIdPreview, setGovernmentIdPreview] = useState<string | null>(
    null,
  );

  const [documentPreview, setDocumentPreview] = useState<string | null>(null);

  const governmentIdInputRef = useRef<HTMLInputElement | null>(null);

  const documentInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (governmentIdPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(governmentIdPreview);
      }

      if (documentPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(documentPreview);
      }
    };
  }, [governmentIdPreview, documentPreview]);

  useEffect(() => {
    if (!resident) {
      return;
    }

    setForm({
      firstName: resident.firstName ?? "",
      middleName: resident.middleName ?? "",
      lastName: resident.lastName ?? "",
      contactNumber: resident.contactNumber ?? "",
      gender: resident.gender ?? "",
      phase: resident.phase ?? "",
      block: resident.block ?? "",
      lot: resident.lot ?? "",

      familyMembers:
        "familyMembers" in resident ? (resident.familyMembers ?? "") : "",

      occupancyType:
        "occupancyType" in resident && Array.isArray(resident.occupancyType)
          ? resident.occupancyType
          : [],

      forRent: "forRent" in resident ? Boolean(resident.forRent) : false,

      ownerName: "ownerName" in resident ? (resident.ownerName ?? "") : "",

      ownerContactNumber:
        "ownerContactNumber" in resident
          ? (resident.ownerContactNumber ?? "")
          : "",

      ownerAddress:
        "ownerAddress" in resident ? (resident.ownerAddress ?? "") : "",

      ownerNumberOccupants:
        "ownerNumberOccupants" in resident
          ? (resident.ownerNumberOccupants ?? "")
          : "",
    });

    setGovernmentIdPreview(resident.picture ?? null);

    setDocumentPreview(resident.document ?? null);
  }, [resident]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!resident) {
        throw new Error("Resident registration was not found.");
      }

      const currentResident = resident;

      if (!currentResident.id) {
        throw new Error("Resident registration ID was not found.");
      }

      let governmentIdUrl = currentResident.picture ?? "";

      let registrationDocumentUrl = currentResident.document ?? "";

      if (governmentIdFile) {
        governmentIdUrl = await uploadToCloudinary(
          governmentIdFile,
          "terradues/users/picture",
          "image",
        );
      }

      if (documentFile) {
        registrationDocumentUrl = await uploadToCloudinary(
          documentFile,
          "terradues/users/document",
          "raw",
        );
      }

      if (!governmentIdUrl) {
        throw new Error("Please upload a valid government ID.");
      }

      if (!registrationDocumentUrl) {
        throw new Error(
          currentResident.userType === "Renter"
            ? "Please upload your house lease agreement."
            : "Please upload your house turnover document.",
        );
      }

      const payload: ResubmitDeniedRegistrationPayload = {
        firstName: form.firstName,

        middleName: form.middleName,

        lastName: form.lastName,

        contactNumber: form.contactNumber,

        gender: form.gender,

        phase: form.phase,

        block: form.block,

        lot: form.lot,

        picture: governmentIdUrl,

        document: registrationDocumentUrl,
      };

      if (currentResident.userType === "Owner") {
        payload.familyMembers = form.familyMembers;

        payload.occupancyType = form.occupancyType;

        payload.forRent = form.forRent;
      } else {
        payload.ownerName = form.ownerName;

        payload.ownerContactNumber = form.ownerContactNumber;

        payload.ownerAddress = form.ownerAddress;

        payload.ownerNumberOccupants = form.ownerNumberOccupants;
      }

      return resubmitDeniedRegistration(currentResident.id, payload);
    },

    onSuccess: async () => {
      setSuccess(
        "Your corrected registration has been resubmitted. It is now waiting for administrator approval.",
      );

      setEditing(false);
      setFormError("");
      setGovernmentIdFile(null);
      setDocumentFile(null);

      await queryClient.invalidateQueries({
        queryKey: ["userAuth", clerkUser?.id],
      });
    },

    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to resubmit registration.",
      );
    },
  });

  const handleChange = (
    field: keyof RegistrationForm,
    value: string | boolean | string[],
  ) => {
    setSuccess("");
    setFormError("");

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleOccupancyType = (value: string) => {
    const selected = form.occupancyType.includes(value);

    handleChange(
      "occupancyType",
      selected
        ? form.occupancyType.filter((item) => item !== value)
        : [...form.occupancyType, value],
    );
  };

  const handleGovernmentIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSuccess("");
    setFormError("");

    if (!file.type.startsWith("image/")) {
      setFormError("The valid government ID must be an image file.");

      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setFormError(
        `The valid government ID image must be ${MAX_IMAGE_MB}MB or smaller.`,
      );

      event.target.value = "";
      return;
    }

    if (governmentIdPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(governmentIdPreview);
    }

    setGovernmentIdFile(file);

    setGovernmentIdPreview(URL.createObjectURL(file));
  };

  const handleDocumentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSuccess("");
    setFormError("");

    if (!isAllowedDocument(file)) {
      setFormError("The document must be a PDF, DOC, or DOCX file.");

      event.target.value = "";
      return;
    }

    if (file.size > MAX_DOCUMENT_MB * 1024 * 1024) {
      setFormError(`The document must be ${MAX_DOCUMENT_MB}MB or smaller.`);

      event.target.value = "";
      return;
    }

    if (documentPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(documentPreview);
    }

    setDocumentFile(file);

    setDocumentPreview(URL.createObjectURL(file));
  };

  const removeGovernmentIdReplacement = () => {
    if (governmentIdPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(governmentIdPreview);
    }

    setGovernmentIdFile(null);

    setGovernmentIdPreview(resident?.picture ?? null);

    if (governmentIdInputRef.current) {
      governmentIdInputRef.current.value = "";
    }
  };

  const removeDocumentReplacement = () => {
    if (documentPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(documentPreview);
    }

    setDocumentFile(null);

    setDocumentPreview(resident?.document ?? null);

    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-50">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-emerald-600" />

          <p className="mt-3 text-sm font-semibold text-zinc-500">
            Loading your registration...
          </p>
        </div>
      </main>
    );
  }

  if (loadError || !resident) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-50 px-4">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-zinc-200">
          <AlertTriangle className="mx-auto text-red-600" size={42} />

          <h1 className="mt-4 text-xl font-bold text-zinc-950">
            Unable to load registration
          </h1>

          <p className="mt-2 text-sm text-zinc-600">
            Please reload the page or contact the administrator.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            <LogOut size={18} />

            {isLoggingOut ? "Logging out..." : "Log out"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="bg-gradient-to-br from-red-50 via-white to-zinc-50 px-6 py-8 text-center sm:px-10">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-100 text-red-700">
              <CircleX size={30} />
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
              TerraDues Registration
            </p>

            <h1 className="mt-2 text-2xl font-bold text-zinc-950 sm:text-3xl">
              Registration not approved
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
              Review the administrator’s reason below, correct your submitted
              information, and resubmit your registration for another review.
            </p>
          </div>

          <div className="border-t border-zinc-100 p-6 sm:p-8">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 shrink-0 text-red-700"
                  size={21}
                />

                <div>
                  <p className="text-sm font-bold text-red-900">
                    Administrator’s reason
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-800">
                    {resident.denialReason?.trim() ||
                      "No denial reason was provided. Please contact the administrator for more information."}
                  </p>
                </div>
              </div>
            </div>

            {success && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                <CheckCircle2 className="mt-0.5 shrink-0" size={20} />

                <p>{success}</p>
              </div>
            )}

            {!editing && !success && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <FilePenLine size={18} />
                  Edit submitted information
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                >
                  <LogOut size={18} />

                  {isLoggingOut ? "Logging out..." : "Log out"}
                </button>
              </div>
            )}
          </div>
        </section>

        {editing && (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Correct Registration
              </p>

              <h2 className="mt-1 text-xl font-bold text-zinc-950">
                Edit submitted information
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Your registration will return to pending after you submit these
                corrections.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AppInput
                label="First Name"
                placeholder="First Name"
                value={form.firstName}
                onChange={(event) =>
                  handleChange("firstName", event.target.value)
                }
              />

              <AppInput
                label="Middle Name"
                placeholder="Middle Name"
                value={form.middleName}
                onChange={(event) =>
                  handleChange("middleName", event.target.value)
                }
              />

              <AppInput
                label="Last Name"
                placeholder="Last Name"
                value={form.lastName}
                onChange={(event) =>
                  handleChange("lastName", event.target.value)
                }
              />

              <AppInput
                label="Contact Number"
                placeholder="09XXXXXXXXX"
                value={form.contactNumber}
                onChange={(event) =>
                  handleChange("contactNumber", numbersOnly(event.target.value))
                }
              />

              <div>
                <label
                  htmlFor="registration-gender"
                  className="mb-2 block text-sm font-semibold text-zinc-800"
                >
                  Gender
                </label>

                <select
                  id="registration-gender"
                  value={form.gender}
                  onChange={(event) =>
                    handleChange("gender", event.target.value)
                  }
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-emerald-500"
                >
                  <option value="">Select gender</option>

                  <option value="Male">Male</option>

                  <option value="Female">Female</option>

                  <option value="Other">Other</option>
                </select>
              </div>

              <AppInput
                label="Phase"
                placeholder="Phase"
                value={form.phase}
                onChange={(event) =>
                  handleChange("phase", numbersOnly(event.target.value))
                }
              />

              <AppInput
                label="Block"
                placeholder="Block"
                value={form.block}
                onChange={(event) =>
                  handleChange("block", numbersOnly(event.target.value))
                }
              />

              <AppInput
                label="Lot"
                placeholder="Lot"
                value={form.lot}
                onChange={(event) =>
                  handleChange("lot", numbersOnly(event.target.value))
                }
              />
            </div>

            {resident.userType === "Owner" ? (
              <div className="mt-6 space-y-5 border-t border-zinc-100 pt-6">
                <h3 className="font-bold text-zinc-900">
                  Homeowner information
                </h3>

                <AppInput
                  label="Number of Family Members"
                  placeholder="Number of family members"
                  value={form.familyMembers}
                  onChange={(event) =>
                    handleChange(
                      "familyMembers",
                      numbersOnly(event.target.value),
                    )
                  }
                />

                <div>
                  <p className="mb-3 text-sm font-semibold text-zinc-800">
                    Occupancy Type
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {["Permanent", "Temporary"].map((item) => (
                      <label
                        key={item}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700"
                      >
                        <input
                          type="checkbox"
                          checked={form.occupancyType.includes(item)}
                          onChange={() => toggleOccupancyType(item)}
                          className="checkbox checkbox-success checkbox-sm"
                        />

                        {item}
                      </label>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.forRent}
                    onChange={(event) =>
                      handleChange("forRent", event.target.checked)
                    }
                    className="checkbox checkbox-success checkbox-sm"
                  />

                  <span className="text-sm font-semibold text-zinc-800">
                    Property is available for rent
                  </span>
                </label>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <h3 className="font-bold text-zinc-900">
                    Property owner information
                  </h3>
                </div>

                <AppInput
                  label="Owner Name"
                  placeholder="Property owner name"
                  value={form.ownerName}
                  onChange={(event) =>
                    handleChange("ownerName", event.target.value)
                  }
                />

                <AppInput
                  label="Owner Contact Number"
                  placeholder="09XXXXXXXXX"
                  value={form.ownerContactNumber}
                  onChange={(event) =>
                    handleChange(
                      "ownerContactNumber",
                      numbersOnly(event.target.value),
                    )
                  }
                />

                <div className="sm:col-span-2">
                  <AppInput
                    label="Owner Address"
                    placeholder="Property owner address"
                    value={form.ownerAddress}
                    onChange={(event) =>
                      handleChange("ownerAddress", event.target.value)
                    }
                  />
                </div>

                <AppInput
                  label="Number of Occupants"
                  placeholder="Number of occupants"
                  value={form.ownerNumberOccupants}
                  onChange={(event) =>
                    handleChange(
                      "ownerNumberOccupants",
                      numbersOnly(event.target.value),
                    )
                  }
                />
              </div>
            )}

            <div className="mt-6 border-t border-zinc-100 pt-6">
              <div>
                <h3 className="font-bold text-zinc-900">
                  Verification documents
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  Replace either document when the administrator requested a
                  clearer or corrected copy. Files that you do not replace will
                  remain unchanged.
                </p>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {/* Valid government ID */}
                <section className="rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Image size={19} />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">
                        Valid Government ID
                      </h4>

                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Upload a clear image of your valid government-issued ID.
                      </p>
                    </div>
                  </div>

                  {governmentIdPreview && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                      <img
                        src={governmentIdPreview}
                        alt="Valid government ID preview"
                        className="h-44 w-full object-contain"
                      />
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black">
                      <Image size={17} />

                      {governmentIdFile
                        ? "Choose another ID image"
                        : "Replace ID image"}

                      <input
                        ref={governmentIdInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleGovernmentIdChange}
                      />
                    </label>

                    {governmentIdFile && (
                      <button
                        type="button"
                        onClick={removeGovernmentIdReplacement}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        <Trash2 size={17} />
                        Keep original ID
                      </button>
                    )}
                  </div>

                  {governmentIdFile && (
                    <p className="mt-3 truncate text-xs font-medium text-emerald-700">
                      New file: {governmentIdFile.name}
                    </p>
                  )}
                </section>

                {/* Lease or turnover document */}
                <section className="rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                      <FileIcon size={19} />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">
                        {resident.userType === "Renter"
                          ? "House Lease Agreement"
                          : "House Turnover Document"}
                      </h4>

                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Upload a PDF, DOC, or DOCX file for verification.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    {documentFile ? (
                      <div>
                        <p className="truncate text-sm font-semibold text-zinc-800">
                          {documentFile.name}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {Math.ceil(documentFile.size / 1024)} KB
                        </p>
                      </div>
                    ) : resident.document ? (
                      <div>
                        <p className="text-sm font-semibold text-zinc-800">
                          Current submitted document
                        </p>

                        <a
                          href={resident.document}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-sm font-semibold text-emerald-700 hover:underline"
                        >
                          Open current document
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        No document is currently uploaded.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black">
                      <FileIcon size={17} />

                      {documentFile
                        ? "Choose another document"
                        : "Replace document"}

                      <input
                        ref={documentInputRef}
                        type="file"
                        accept="application/pdf,.pdf,.doc,.docx"
                        hidden
                        onChange={handleDocumentChange}
                      />
                    </label>

                    {documentFile && (
                      <button
                        type="button"
                        onClick={removeDocumentReplacement}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        <Trash2 size={17} />
                        Keep original document
                      </button>
                    )}
                  </div>
                </section>
              </div>
            </div>

            {formError && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {formError}
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => {
                  setEditing(false);
                  setFormError("");
                }}
                className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={18} />

                {mutation.isPending ? "Resubmitting..." : "Save and resubmit"}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
