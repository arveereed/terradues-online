import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Loader2,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppInput from "../../components/AppInput";
import { uploadToCloudinary } from "../../lib/cloudinary/cloudinary";

type UserType = "Owner" | "Renter";
type FormState = {
  userType: UserType;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  contactNumber: string;
  gender: string;
  phase: string;
  block: string;
  lot: string;
  familyMembers: string;
  ownerName: string;
  ownerContactNumber: string;
  ownerAddress: string;
  ownerNumberOccupants: string;
};

const initialForm: FormState = {
  userType: "Owner",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  password: "",
  contactNumber: "",
  gender: "",
  phase: "",
  block: "",
  lot: "",
  familyMembers: "",
  ownerName: "",
  ownerContactNumber: "",
  ownerAddress: "",
  ownerNumberOccupants: "",
};
const nameRe = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateName = (v: string, l: string, required = true) => {
  const t = v.trim();
  if (!t) return required ? `${l} is required` : "";
  if (t.length < 2) return `${l} must be at least 2 characters`;
  if (!nameRe.test(t))
    return `${l} can only contain letters, spaces, hyphens, and apostrophes`;
  return "";
};
const validatePhone = (v: string, l = "Contact number") => {
  const t = v.trim();
  if (!t) return `${l} is required`;
  if (!/^\d+$/.test(t)) return `${l} must contain numbers only`;
  if (!t.startsWith("09")) return `${l} must start with 09`;
  if (t.length !== 11) return `${l} must be exactly 11 digits`;
  return "";
};
const validateNumber = (v: string, l: string) => {
  const t = v.trim();
  if (!t) return `${l} is required`;
  if (!/^\d+$/.test(t)) return `${l} must contain numbers only`;
  if (Number(t) <= 0) return `${l} must be greater than 0`;
  return "";
};

export default function AdminRegisterResidentPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [idError, setIdError] = useState("");
  const [docError, setDocError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const idRef = useRef<HTMLInputElement | null>(null);
  const docRef = useRef<HTMLInputElement | null>(null);
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setSubmitError("");
    setForm((c) => ({ ...c, [k]: v }));
  };
  const errors = useMemo(
    () => ({
      firstName: validateName(form.firstName, "First name"),
      middleName: validateName(form.middleName, "Middle name", false),
      lastName: validateName(form.lastName, "Last name"),
      email: !form.email.trim()
        ? "Email is required"
        : !emailRe.test(form.email.trim())
          ? "Enter a valid email address"
          : "",
      password: !form.password
        ? "Temporary password is required"
        : form.password.length < 8
          ? "Password must be at least 8 characters"
          : "",
      contactNumber: validatePhone(form.contactNumber),
      gender: form.gender ? "" : "Gender is required",
      phase: validateNumber(form.phase, "Phase"),
      block: validateNumber(form.block, "Block"),
      lot: validateNumber(form.lot, "Lot"),
      familyMembers:
        form.userType === "Owner"
          ? validateNumber(form.familyMembers, "Number of family members")
          : "",
      ownerName:
        form.userType === "Renter"
          ? validateName(form.ownerName, "Owner's name")
          : "",
      ownerContactNumber:
        form.userType === "Renter"
          ? validatePhone(form.ownerContactNumber, "Owner's contact number")
          : "",
      ownerAddress:
        form.userType === "Renter" && !form.ownerAddress.trim()
          ? "Owner's address is required"
          : "",
      ownerNumberOccupants:
        form.userType === "Renter"
          ? validateNumber(form.ownerNumberOccupants, "Number of occupants")
          : "",
    }),
    [form],
  );
  const valid =
    Object.values(errors).every((e) => !e) && !!idFile && !idError && !docError;
  const message = (error: string, value: string, success = "Valid") =>
    error ? (
      <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>
    ) : value.trim() ? (
      <p className="mt-1 text-xs font-semibold text-emerald-600">{success}</p>
    ) : null;
  const onId = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setIdError("");
    if (!f) {
      setIdFile(null);
      setIdError("Valid Government ID is required");
      return;
    }
    if (!f.type.startsWith("image/")) {
      setIdFile(null);
      setIdError("Please upload a valid image file");
      e.target.value = "";
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setIdFile(null);
      setIdError("Image must be less than 5MB");
      e.target.value = "";
      return;
    }
    setIdFile(f);
  };
  const onDoc = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setDocError("");
    if (!f) {
      setDocFile(null);
      return;
    }
    const ok =
      [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(f.type) || /[.](pdf|doc|docx)$/i.test(f.name);
    if (!ok) {
      setDocFile(null);
      setDocError("Document must be PDF, DOC, or DOCX");
      e.target.value = "";
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setDocFile(null);
      setDocError("Document must be less than 10MB");
      e.target.value = "";
      return;
    }
    setDocFile(f);
  };
  const submit = async () => {
    if (!valid) {
      setSubmitError("Please complete all required fields correctly.");
      if (!idFile) setIdError("Valid Government ID is required");
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      const picture = await uploadToCloudinary(
        idFile!,
        "terradues/users/profile",
        "image",
      );
      const document = docFile
        ? await uploadToCloudinary(docFile, "terradues/users/document", "raw")
        : null;
      const token = await getToken();
      if (!token)
        throw new Error("Admin session expired. Please sign in again.");
      const apiBaseUrl = (
        import.meta.env.VITE_API_URL || "http://localhost:3001"
      ).replace(/\/$/, "");
      const response = await fetch(`${apiBaseUrl}/api/admin/residents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, picture, document }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          data?.message || data?.error || "Failed to register resident.",
        );
      navigate("/admin/users", {
        replace: true,
        state: { residentCreated: true },
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to register resident.",
      );
    } finally {
      setSaving(false);
    }
  };
  const digits = (v: string) => v.replace(/\D/g, "");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Residents Directory
          </p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-950 sm:text-3xl">
            Register New Resident
          </h1>
          <p className="mt-1 text-sm font-medium text-zinc-500">
            Create an approved resident account directly from the admin portal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/users")}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <ArrowLeft size={17} />
          Back to Residents
        </button>
      </header>

      {submitError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {submitError}
        </div>
      )}
      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-zinc-950">
            Account & Personal Details
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            The email and temporary password will be used by the resident to
            sign in.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="First Name"
            error={errors.firstName}
            value={form.firstName}
            onChange={(v) => setField("firstName", v)}
          />
          <Field
            label="Middle Name"
            error={errors.middleName}
            value={form.middleName}
            onChange={(v) => setField("middleName", v)}
          />
          <Field
            label="Last Name"
            error={errors.lastName}
            value={form.lastName}
            onChange={(v) => setField("lastName", v)}
          />
          <Field
            label="Email"
            type="email"
            error={errors.email}
            value={form.email}
            onChange={(v) => setField("email", v)}
          />
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-700">
              Temporary Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                className="h-12 w-full rounded-xl border border-zinc-200 px-4 pr-11 text-sm outline-none focus:border-emerald-500"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {message(errors.password, form.password, "Password accepted")}
          </div>
          <Field
            label="Contact Number"
            error={errors.contactNumber}
            value={form.contactNumber}
            onChange={(v) => setField("contactNumber", digits(v))}
            placeholder="09XXXXXXXXX"
          />
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-700">
              Gender
            </label>
            <select
              value={form.gender}
              onChange={(e) => setField("gender", e.target.value)}
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">Select gender</option>
              <option>Male</option>
              <option>Female</option>
            </select>
            {message(errors.gender, form.gender, "Gender selected")}
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-700">
              User Type
            </label>
            <select
              value={form.userType}
              onChange={(e) => setField("userType", e.target.value as UserType)}
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-emerald-500"
            >
              <option value="Owner">Owner</option>
              <option value="Renter">Renter</option>
            </select>
            <p className="mt-1 text-xs font-semibold text-emerald-600">
              {form.userType} selected
            </p>
          </div>
        </div>
        <div className="my-7 border-t border-zinc-200" />
        <h2 className="mb-4 text-lg font-bold text-zinc-950">
          Residence Details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="Phase"
            error={errors.phase}
            value={form.phase}
            onChange={(v) => setField("phase", digits(v))}
          />
          <Field
            label="Block"
            error={errors.block}
            value={form.block}
            onChange={(v) => setField("block", digits(v))}
          />
          <Field
            label="Lot"
            error={errors.lot}
            value={form.lot}
            onChange={(v) => setField("lot", digits(v))}
          />
        </div>
        {form.userType === "Owner" ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
            <h3 className="font-bold text-emerald-900">Owner Details</h3>
            <div className="mt-3 max-w-md">
              <Field
                label="Number of Family Members"
                error={errors.familyMembers}
                value={form.familyMembers}
                onChange={(v) => setField("familyMembers", digits(v))}
              />
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
            <h3 className="font-bold text-blue-900">Homeowner Details</h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Owner's Name"
                error={errors.ownerName}
                value={form.ownerName}
                onChange={(v) => setField("ownerName", v)}
              />
              <Field
                label="Owner's Contact Number"
                error={errors.ownerContactNumber}
                value={form.ownerContactNumber}
                onChange={(v) => setField("ownerContactNumber", digits(v))}
              />
              <Field
                label="Owner's Address"
                error={errors.ownerAddress}
                value={form.ownerAddress}
                onChange={(v) => setField("ownerAddress", v)}
              />
              <Field
                label="Number of Occupants"
                error={errors.ownerNumberOccupants}
                value={form.ownerNumberOccupants}
                onChange={(v) => setField("ownerNumberOccupants", digits(v))}
              />
            </div>
          </div>
        )}
        <div className="my-7 border-t border-zinc-200" />
        <h2 className="mb-4 text-lg font-bold text-zinc-950">
          Registration Documents
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UploadCard
            title="Valid Government ID"
            required
            hint="Image only, maximum 5MB"
            icon={<ImageIcon size={18} />}
            file={idFile}
            error={idError}
            onChoose={() => idRef.current?.click()}
            onClear={() => {
              setIdFile(null);
              setIdError("Valid Government ID is required");
              if (idRef.current) idRef.current.value = "";
            }}
          />
          <input
            ref={idRef}
            hidden
            type="file"
            accept="image/*"
            onChange={onId}
          />
          <UploadCard
            title="Additional Document"
            hint="Optional. PDF, DOC, or DOCX, maximum 10MB"
            icon={<FileText size={18} />}
            file={docFile}
            error={docError}
            onChoose={() => docRef.current?.click()}
            onClear={() => {
              setDocFile(null);
              setDocError("");
              if (docRef.current) docRef.current.value = "";
            }}
          />
          <input
            ref={docRef}
            hidden
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={onDoc}
          />
        </div>
        <div className="mt-7 flex flex-col-reverse gap-2 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() => navigate("/admin/users")}
            className="h-11 rounded-xl border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid || saving}
            onClick={() => void submit()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Creating Resident...
              </>
            ) : (
              <>
                <UserPlus size={17} />
                Create Resident
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <AppInput
        label={label}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>
      ) : value.trim() ? (
        <p className="mt-1 text-xs font-semibold text-emerald-600">Valid</p>
      ) : null}
    </div>
  );
}
function UploadCard({
  title,
  required = false,
  hint,
  icon,
  file,
  error,
  onChoose,
  onClear,
}: {
  title: string;
  required?: boolean;
  hint: string;
  icon: ReactNode;
  file: File | null;
  error: string;
  onChoose: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-bold text-zinc-900">
        {title}
        {required && <span className="text-rose-600"> *</span>}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onChoose}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-black"
        >
          {icon}
          {file ? "Replace File" : "Choose File"}
        </button>
        {file && (
          <button
            type="button"
            onClick={onClear}
            className="h-10 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100"
          >
            Remove
          </button>
        )}
      </div>
      <p className="mt-2 break-all text-xs font-medium text-zinc-600">
        {file ? file.name : "No file selected."}
      </p>
      {error && (
        <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>
      )}
    </div>
  );
}
