import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import AppInput from "../AppInput";
import SettingsSectionShell from "../settings/SettingsSectionShell";
import { useFirestoreUser } from "../../features/auth/hooks/useFirestoreUser";
import {
  updateUserProfile,
  type UpdateUserProfilePayload,
} from "../../features/auth/services/auth.service";
import { uploadToCloudinary } from "../../lib/cloudinary/cloudinary";

const MAX_IMAGE_MB = 5;
const MAX_DOC_MB = 10;

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export default function PersonalDetailsSection() {
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useFirestoreUser(clerkUser?.id);
  const pictureInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<UpdateUserProfilePayload>({
    firstName: "",
    middleName: "",
    lastName: "",
    contactNumber: "",
    gender: "",
    phase: "",
    block: "",
    lot: "",
    userType: "Owner",
    familyMembers: "",
    ownerName: "",
    ownerContactNumber: "",
    ownerAddress: "",
    ownerNumberOccupants: "",
    picture: null,
    document: null,
  });
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [pictureDeleted, setPictureDeleted] = useState(false);
  const [documentDeleted, setDocumentDeleted] = useState(false);
  const [pictureError, setPictureError] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!user) return;
    const source = user as typeof user & Record<string, unknown>;
    setForm({
      firstName: clean(user.firstName),
      middleName: clean(user.middleName),
      lastName: clean(user.lastName),
      contactNumber: clean(user.contactNumber),
      gender: clean(user.gender),
      phase: clean(user.phase),
      block: clean(user.block),
      lot: clean(user.lot),
      userType: user.userType === "Renter" ? "Renter" : "Owner",
      familyMembers: clean(source.familyMembers),
      ownerName: clean(source.ownerName),
      ownerContactNumber: clean(source.ownerContactNumber),
      ownerAddress: clean(source.ownerAddress),
      ownerNumberOccupants: clean(source.ownerNumberOccupants),
      picture: user.picture ?? null,
      document: user.document ?? null,
    });
    setPictureFile(null);
    setDocumentFile(null);
    setPictureDeleted(false);
    setDocumentDeleted(false);
    setPictureError("");
    setDocumentError("");
  }, [user]);

  const validateName = (value: string, label: string, required = true) => {
    const v = value.trim();
    if (!v) return required ? `${label} is required` : "";
    if (v.length < 2) return `${label} must be at least 2 characters`;
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(v))
      return `${label} can only contain letters, spaces, hyphens, and apostrophes`;
    return "";
  };
  const validateContact = (value: string) => {
    const v = value.trim();
    if (!v) return "Contact number is required";
    if (!/^\d+$/.test(v)) return "Contact number must contain numbers only";
    if (v.length >= 1 && v[0] !== "0")
      return "Contact number must start with 09";
    if (v.length >= 2 && !v.startsWith("09"))
      return "Contact number must start with 09";
    if (v.length < 11)
      return `Contact number needs ${11 - v.length} more digit${11 - v.length === 1 ? "" : "s"}`;
    if (v.length > 11) return "Contact number must be exactly 11 digits";
    if (!/^09\d{9}$/.test(v))
      return "Please enter a valid Philippine mobile number";
    return "";
  };
  const validateNumber = (value: string, label: string) => {
    const v = value.trim();
    if (!v) return `${label} is required`;
    if (!/^\d+$/.test(v)) return `${label} must contain numbers only`;
    if (Number(v) <= 0) return `${label} must be greater than 0`;
    return "";
  };

  const errors = useMemo(
    () => ({
      firstName: validateName(form.firstName, "First name"),
      middleName: validateName(form.middleName, "Middle name", false),
      lastName: validateName(form.lastName, "Last name"),
      contactNumber: validateContact(form.contactNumber),
      gender: form.gender ? "" : "Gender is required",
      phase: validateNumber(form.phase, "Phase"),
      block: validateNumber(form.block, "Block"),
      lot: validateNumber(form.lot, "Lot"),
      familyMembers:
        form.userType === "Owner"
          ? validateNumber(form.familyMembers ?? "", "Number of family members")
          : "",
      ownerName:
        form.userType === "Renter"
          ? validateName(form.ownerName ?? "", "Owner's name")
          : "",
      ownerContactNumber:
        form.userType === "Renter"
          ? validateContact(form.ownerContactNumber ?? "")
          : "",
      ownerAddress:
        form.userType === "Renter" && !clean(form.ownerAddress)
          ? "Owner's address is required"
          : "",
      ownerNumberOccupants:
        form.userType === "Renter"
          ? validateNumber(
              form.ownerNumberOccupants ?? "",
              "Number of occupants",
            )
          : "",
    }),
    [form],
  );

  const hasPicture = Boolean(pictureFile || (!pictureDeleted && form.picture));
  const formIsValid =
    Object.values(errors).every((e) => !e) &&
    hasPicture &&
    !pictureError &&
    !documentError;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User document not found.");
      if (!formIsValid)
        throw new Error("Please correct all invalid fields before saving.");
      let picture = pictureDeleted ? null : (form.picture ?? null);
      let document = documentDeleted ? null : (form.document ?? null);
      if (pictureFile)
        picture = await uploadToCloudinary(
          pictureFile,
          "terradues/users/profile",
          "image",
        );
      if (!picture) throw new Error("Valid Government ID is required.");
      if (documentFile)
        document = await uploadToCloudinary(
          documentFile,
          "terradues/users/document",
          "raw",
        );
      return updateUserProfile(user.id, { ...form, picture, document });
    },
    onSuccess: async () => {
      setSuccess("Personal details updated successfully.");
      setPictureFile(null);
      setDocumentFile(null);
      setPictureDeleted(false);
      setDocumentDeleted(false);
      await queryClient.invalidateQueries({
        queryKey: ["userAuth", clerkUser?.id],
      });
    },
  });

  const setField = <K extends keyof UpdateUserProfilePayload>(
    field: K,
    value: UpdateUserProfilePayload[K],
  ) => {
    setSuccess("");
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const validation = (err: string, value: string, ok = "Valid") =>
    err ? (
      <p className="mt-1 text-xs font-semibold text-rose-600">{err}</p>
    ) : value.trim() ? (
      <p className="mt-1 text-xs font-semibold text-emerald-600">{ok}</p>
    ) : null;

  const handlePicture = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSuccess("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPictureError("Please upload a valid image file");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setPictureError(`Image must be less than ${MAX_IMAGE_MB}MB`);
      e.target.value = "";
      return;
    }
    setPictureFile(file);
    setPictureDeleted(false);
    setPictureError("");
  };
  const handleDocument = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSuccess("");
    if (!file) return;
    const allowed =
      [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(file.type) || /\.(pdf|doc|docx)$/i.test(file.name);
    if (!allowed) {
      setDocumentError("Document must be PDF, DOC, or DOCX");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      setDocumentError(`Document must be less than ${MAX_DOC_MB}MB`);
      e.target.value = "";
      return;
    }
    setDocumentFile(file);
    setDocumentDeleted(false);
    setDocumentError("");
  };

  return (
    <SettingsSectionShell
      title="Personal Details"
      subtitle="Update your registration information."
    >
      {isLoading ? (
        <p className="text-sm font-semibold text-zinc-500">
          Loading personal details...
        </p>
      ) : error ? (
        <p className="text-sm font-semibold text-red-600">
          Failed to load personal details.
        </p>
      ) : (
        <>
          <div className="mb-5 flex items-center gap-4">
            {form.picture && !pictureDeleted ? (
              <img
                src={form.picture}
                alt={user?.fullName || "User"}
                className="size-16 rounded-full object-cover ring-2 ring-emerald-100"
              />
            ) : (
              <div className="grid size-16 place-items-center rounded-full bg-zinc-100 text-zinc-500">
                <ImageIcon />
              </div>
            )}
            <div>
              <p className="text-sm font-extrabold text-zinc-900">
                {user?.fullName}
              </p>
              <p className="text-xs font-semibold text-zinc-500">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FileEditor
              title="Valid Government ID"
              required
              fileName={pictureFile?.name}
              hasExisting={Boolean(form.picture) && !pictureDeleted}
              error={
                pictureError ||
                (!hasPicture ? "Valid Government ID is required" : "")
              }
              onChoose={() => pictureInputRef.current?.click()}
              onDelete={() => {
                setPictureFile(null);
                setPictureDeleted(true);
                setPictureError("Valid Government ID is required");
                if (pictureInputRef.current) pictureInputRef.current.value = "";
              }}
            />
            <input
              ref={pictureInputRef}
              type="file"
              accept="image/*"
              onChange={handlePicture}
              className="hidden"
            />
            <FileEditor
              title="Additional Document"
              fileName={documentFile?.name}
              hasExisting={Boolean(form.document) && !documentDeleted}
              error={documentError}
              onChoose={() => documentInputRef.current?.click()}
              onDelete={() => {
                setDocumentFile(null);
                setDocumentDeleted(true);
                setDocumentError("");
                if (documentInputRef.current)
                  documentInputRef.current.value = "";
              }}
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleDocument}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="First Name"
              value={form.firstName}
              error={errors.firstName}
              onChange={(v) => setField("firstName", v)}
              validation={validation}
            />
            <Field
              label="Middle Name"
              value={form.middleName}
              error={errors.middleName}
              onChange={(v) => setField("middleName", v)}
              validation={validation}
            />
            <Field
              label="Last Name"
              value={form.lastName}
              error={errors.lastName}
              onChange={(v) => setField("lastName", v)}
              validation={validation}
            />
            <Field
              label="Contact Number"
              value={form.contactNumber}
              error={errors.contactNumber}
              onChange={(v) => setField("contactNumber", v.replace(/\D/g, ""))}
              validation={validation}
            />
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) => setField("gender", e.target.value)}
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium"
              >
                <option value="">Select gender</option>
                <option>Male</option>
                <option>Female</option>
              </select>
              {validation(errors.gender, form.gender, "Gender selected")}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Email
              </label>
              <input
                value={user?.email || ""}
                disabled
                readOnly
                className="h-12 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 px-4 text-sm text-zinc-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Email cannot be changed here.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                User Type
              </label>
              <input
                value={form.userType}
                disabled
                readOnly
                className="h-12 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 px-4 text-sm text-zinc-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Only an administrator can change the user type.
              </p>
            </div>
            <Field
              label="Phase"
              value={form.phase}
              error={errors.phase}
              onChange={(v) => setField("phase", v.replace(/\D/g, ""))}
              validation={validation}
            />
            <Field
              label="Block"
              value={form.block}
              error={errors.block}
              onChange={(v) => setField("block", v.replace(/\D/g, ""))}
              validation={validation}
            />
            <Field
              label="Lot"
              value={form.lot}
              error={errors.lot}
              onChange={(v) => setField("lot", v.replace(/\D/g, ""))}
              validation={validation}
            />
          </div>

          {form.userType === "Owner" ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
              <h3 className="font-bold text-emerald-900">
                Owner Registration Details
              </h3>
              <div className="mt-3">
                <Field
                  label="Number of Family Members"
                  value={form.familyMembers ?? ""}
                  error={errors.familyMembers}
                  onChange={(v) =>
                    setField("familyMembers", v.replace(/\D/g, ""))
                  }
                  validation={validation}
                />
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
              <h3 className="font-bold text-blue-900">Homeowner Details</h3>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Owner's Full Name"
                  value={form.ownerName ?? ""}
                  error={errors.ownerName}
                  onChange={(v) => setField("ownerName", v)}
                  validation={validation}
                />
                <Field
                  label="Owner's Contact Number"
                  value={form.ownerContactNumber ?? ""}
                  error={errors.ownerContactNumber}
                  onChange={(v) =>
                    setField("ownerContactNumber", v.replace(/\D/g, ""))
                  }
                  validation={validation}
                />
                <Field
                  label="Owner's Address"
                  value={form.ownerAddress ?? ""}
                  error={errors.ownerAddress}
                  onChange={(v) => setField("ownerAddress", v)}
                  validation={validation}
                />
                <Field
                  label="Number of Occupants"
                  value={form.ownerNumberOccupants ?? ""}
                  error={errors.ownerNumberOccupants}
                  onChange={(v) =>
                    setField("ownerNumberOccupants", v.replace(/\D/g, ""))
                  }
                  validation={validation}
                />
              </div>
            </div>
          )}

          {success && (
            <p className="mt-4 text-sm font-semibold text-emerald-700">
              {success}
            </p>
          )}
          {mutation.error && (
            <p className="mt-4 text-sm font-semibold text-red-600">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Failed to update personal details."}
            </p>
          )}
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !formIsValid}
            className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </>
      )}
    </SettingsSectionShell>
  );
}

function Field({
  label,
  value,
  error,
  onChange,
  validation,
}: {
  label: string;
  value: string;
  error: string;
  onChange: (v: string) => void;
  validation: (e: string, v: string, ok?: string) => React.ReactNode;
}) {
  return (
    <div>
      <AppInput
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {validation(error, value)}
    </div>
  );
}

function FileEditor({
  title,
  required,
  fileName,
  hasExisting,
  error,
  onChoose,
  onDelete,
}: {
  title: string;
  required?: boolean;
  fileName?: string;
  hasExisting: boolean;
  error: string;
  onChoose: () => void;
  onDelete: () => void;
}) {
  const present = Boolean(fileName || hasExisting);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-bold text-zinc-900">
        {title} {required && <span className="text-rose-600">*</span>}
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {required
          ? "Required. Image only, maximum 5MB."
          : "Optional. PDF, DOC, or DOCX, maximum 10MB."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onChoose}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white"
        >
          <FileText size={16} />
          {present ? "Replace" : "Upload"}
        </button>
        {present && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700"
          >
            <Trash2 size={16} />
            Delete
          </button>
        )}
      </div>
      <p className="mt-2 text-xs font-medium text-zinc-600">
        {fileName ||
          (hasExisting ? "Current uploaded file" : "No file uploaded")}
      </p>
      {error && (
        <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>
      )}
    </div>
  );
}
