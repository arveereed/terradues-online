import { useSignUp } from "@clerk/clerk-react";
import { useRef, useState } from "react";
import type { UserDataSignUpRenterType } from "../../types";
import Icon from "../../assets/splashImage.png";
import { AlertCircle, Eye, EyeOff, File, Image, XCircle } from "lucide-react";
import VerifyEmailUI from "../../components/VerifyEmailUI";
import { addUser } from "../../features/auth/services/auth.service";
import { useNavigate } from "react-router-dom";
import { uploadToCloudinary } from "../../lib/cloudinary/cloudinary";
import AppInput from "../../components/AppInput";

type OwnerSignUpFormData = Omit<
  UserDataSignUpRenterType,
  "userType" | "user_id" | "document" | "picture"
> & {
  password: string;
  confirmPassword: string;
  picture: File | null;
  document: File | null;
};

type FormErrors = Partial<Record<keyof OwnerSignUpFormData, string>>;

export default function SignUpOwner() {
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState<OwnerSignUpFormData>({
    firstName: "",
    middleName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    gender: "",
    phase: "",
    block: "",
    lot: "",
    password: "",
    confirmPassword: "",
    picture: null,
    document: null,
    ownerAddress: "",
    ownerContactNumber: "",
    ownerName: "",
    ownerNumberOccupants: "",
  });

  const [imagePreview, setImagePreview] = useState<
    string | ArrayBuffer | null | undefined
  >(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);

  const pictureInputRef = useRef<HTMLInputElement | null>(null);
  const documentRef = useRef<HTMLInputElement | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notAgree, setNotAgree] = useState(true);

  const { isLoaded, signUp, setActive } = useSignUp();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pendingVerification, setPendingVerification] =
    useState<boolean>(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>("");

  const navigate = useNavigate();

  const isImageFile = (file: File) => file.type.startsWith("image/");

  const isAllowedDocument = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    ];

    const allowedExtensions = [".pdf", ".doc", ".docx"];

    return (
      allowedTypes.includes(file.type) ||
      allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
  };

  const validateForm = () => {
    const errors: FormErrors = {};

    if (!form.firstName.trim()) errors.firstName = "First name is required";
    if (!form.lastName.trim()) errors.lastName = "Last name is required";

    if (!form.contactNumber.trim()) {
      errors.contactNumber = "Contact number is required";
    } else if (!/^\d{10,11}$/.test(form.contactNumber)) {
      errors.contactNumber = "Contact number must be 10–11 digits";
    }

    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      errors.email = "Invalid email address";
    }

    if (!form.gender) errors.gender = "Gender is required";
    if (!form.phase) errors.phase = "Phase is required";
    if (!form.block) errors.block = "Block is required";
    if (!form.lot) errors.lot = "Lot is required";
    if (!form.ownerAddress) errors.ownerAddress = "Owner's address is required";
    if (!form.ownerContactNumber)
      errors.ownerContactNumber = "Owner's contact number is required";
    if (!form.ownerName) errors.ownerName = "Owner's name is required";

    if (!form.ownerNumberOccupants.trim()) {
      errors.ownerNumberOccupants = "Number of Occupants is required";
    }

    // Password
    if (!form.password) {
      errors.password = "Password is required";
    } else {
      const pwd = form.password;

      if (pwd.length < 8)
        errors.password = "Password must be at least 8 characters";
      else if (!/[A-Z]/.test(pwd))
        errors.password = "Add at least 1 uppercase letter";
      else if (!/[a-z]/.test(pwd))
        errors.password = "Add at least 1 lowercase letter";
      else if (!/\d/.test(pwd)) errors.password = "Add at least 1 number";
      else if (!/[^\w\s]/.test(pwd))
        errors.password = "Add at least 1 special character";
    }

    // Confirm Password
    if (!form.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Picture validation
    if (!form.picture) {
      errors.picture = "Picture is required";
    } else if (!isImageFile(form.picture)) {
      errors.picture = "Please upload a valid image file";
    }

    // Document validation
    if (!form.document) {
      errors.document = "Document is required";
    } else if (!isAllowedDocument(form.document)) {
      errors.document = "Document must be PDF, DOC, or DOCX";
    }

    const MAX_IMAGE_MB = 5;
    const MAX_DOC_MB = 10;

    // Picture validation size
    if (form.picture && form.picture.size > MAX_IMAGE_MB * 1024 * 1024) {
      errors.picture = `Image must be less than ${MAX_IMAGE_MB}MB`;
    }

    // Document validation size
    if (form.document && form.document.size > MAX_DOC_MB * 1024 * 1024) {
      errors.document = `Document must be less than ${MAX_DOC_MB}MB`;
    }

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submission of sign-up form
  const onSignUpPress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoaded) return;

    if (!validateForm()) return;
    setIsLoading(true);

    // Start sign-up process using email and password provided
    try {
      await signUp.create({
        emailAddress: form.email,
        password: form.password,
      });

      // Send user an email with verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Set 'pendingVerification' to true to display second form
      // and capture OTP code
      setIsLoading(false);
      setError("");
      setPendingVerification(true);
    } catch (err: any) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      if (err.errors?.[0]?.code === "form_identifier_exists") {
        setError("That email address is taken. Please try another.");
      } else if (err.errors?.[0]?.code === "form_param_format_invalid") {
        setError("Email address must be a valid email address.");
      } else if (err.errors?.[0]?.code === "form_param_nil") {
        setError("Email or password is empty");
      } else if (err.errors?.[0]?.code === "form_password_length_too_short") {
        setError("Passwords must be 8 characters or more.");
      } else if (err.errors?.[0]?.code === "form_password_pwned") {
        setError("Please use a different password.");
      } else if (err.errors?.[0]?.code === "too_many_requests") {
        setError(err.errors?.[0]?.message);
      }
      setIsLoading(false);
      console.log(JSON.stringify(err, null, 2));
    }
  };

  // Handle submission of verification form
  const onVerifyPress = async () => {
    if (!isLoaded) return;
    setIsLoading(true);

    try {
      // Use the code the user provided to attempt verification
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      // If verification was completed, set the session to active
      // and redirect the user
      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });

        const imageUrl = await uploadToCloudinary(
          form.picture as any,
          "terradues/users/profile",
          "image",
        );
        const docUrl = await uploadToCloudinary(
          form.document as any,
          "terradues/users/document",
          "raw",
        );

        const userData: UserDataSignUpRenterType = {
          userType: "Renter",
          user_id: signUpAttempt.createdUserId as string,
          email: signUpAttempt.emailAddress as string,
          firstName: form.firstName,
          lastName: form.lastName,
          middleName: form.middleName,
          contactNumber: form.contactNumber,
          gender: form.gender,
          phase: form.phase,
          block: form.block,
          lot: form.lot,
          picture: imageUrl,
          document: docUrl,

          ownerAddress: form.ownerAddress,
          ownerContactNumber: form.ownerContactNumber,
          ownerName: form.ownerName,
          ownerNumberOccupants: form.ownerNumberOccupants,
        };
        await addUser(userData);

        navigate("/");
        setIsLoading(false);
      } else {
        // If the status is not complete, check why. User may need to
        // complete further steps.
        setIsLoading(false);

        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (err: any) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      if (err.errors?.[0]?.code === "too_many_requests") {
        setError("Too many requests. Please try again in a bit.");
      } else if (err.errors?.[0]?.code === "form_param_nil") {
        setError("Enter a code");
      } else if (err.errors?.[0]?.code === "form_code_incorrect") {
        setError("The code is incorrect");
      }
      setIsLoading(false);

      // console.error(JSON.stringify(err, null, 2));
    }
  };

  if (pendingVerification) {
    return (
      <VerifyEmailUI
        pendingVerification={pendingVerification}
        isLoading={isLoading}
        error={error}
        setError={setError}
        code={code}
        setCode={setCode}
        onVerifyPress={onVerifyPress}
      />
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /* for UPLOAD PHOTO */
  const handleImageChange = async (e: any) => {
    const photo = e.target.files[0];

    setForm((prev) => ({
      ...prev,
      picture: photo,
    }));

    if (photo) {
      readFileAsDataURL(photo).then((res) => setImagePreview(res as string));
    } else {
      setImagePreview(null);
    }
  };

  /* for UPLOAD DOCUMENT */
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const doc = e.target.files?.[0] ?? null;

    setForm((prev) => ({
      ...prev,
      document: doc,
    }));

    // cleanup previous preview URL
    if (documentPreview) URL.revokeObjectURL(documentPreview);

    if (!doc) {
      setDocumentPreview(null);
      return;
    }

    // ✅ Preview logic:
    // - PDF: preview using blob URL in an iframe
    // - Others: we still keep a blob URL (optional), but we’ll mostly show filename
    const url = URL.createObjectURL(doc);
    setDocumentPreview(url);
  };

  const readFileAsDataURL = (
    file: any,
  ): Promise<string | ArrayBuffer | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const errorClass = "mt-1 text-xs text-red-500 flex items-center gap-1";

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6 md:p-10">
        {/* Header */}
        <div className="flex flex-col items-center px-4">
          <img
            src={Icon}
            alt="Welcome"
            className="max-w-md size-28 object-contain fade-in"
          />

          <div className="flex gap-1 text-xl">
            <span className=" font-bold text-green-700">TERRA</span>
            <span className=" font-bold text-black">DUES</span>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={onSignUpPress}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Personal Details */}
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">
              Personal Detail
            </h2>
          </div>

          {/* First Name */}
          <div>
            <AppInput
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.firstName
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="First Name"
            />
            {errors.firstName && (
              <p className={errorClass}>{errors.firstName}</p>
            )}
          </div>

          {/* Middle Name */}
          <div>
            <AppInput
              name="middleName"
              value={form.middleName}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Middle Name (optional)"
            />
          </div>

          {/* Last Name */}
          <div className="md:col-span-2">
            <AppInput
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.lastName
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Last Name"
            />
            {errors.lastName && <p className={errorClass}>{errors.lastName}</p>}
          </div>

          {/* Contact Number */}
          <div>
            <AppInput
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.contactNumber
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Contact Number"
            />
            {errors.contactNumber && (
              <p className={errorClass}>{errors.contactNumber}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <AppInput
              name="email"
              value={form.email}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.email
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Email"
            />
            {errors.email && <p className={errorClass}>{errors.email}</p>}
          </div>

          {/* Gender */}
          <div className="md:col-span-2 flex flex-wrap gap-4 text-sm text-gray-700">
            <span className="font-medium">Gender:</span>
            {["Male", "Female", "Prefer not to say"].map((g) => (
              <label key={g} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={form.gender === g}
                  onChange={handleChange}
                />
                {g}
              </label>
            ))}
          </div>
          {errors.gender && (
            <p className="md:col-span-2 text-xs text-red-500">
              {errors.gender}
            </p>
          )}

          {/* Address */}
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-gray-600 mt-4 mb-2">
              Address
            </h2>
          </div>

          {/* Phase */}
          <div>
            <AppInput
              name="phase"
              value={form.phase}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.phase
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Phase"
            />
            {errors.phase && <p className={errorClass}>{errors.phase}</p>}
          </div>

          {/* Block */}
          <div>
            <AppInput
              name="block"
              value={form.block}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.block
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Block"
            />
            {errors.block && <p className={errorClass}>{errors.block}</p>}
          </div>

          {/* Lot */}
          <div>
            <AppInput
              name="lot"
              value={form.lot}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.lot
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Lot"
            />
            {errors.lot && <p className={errorClass}>{errors.lot}</p>}
          </div>

          {/* Password */}
          <div className="relative">
            <AppInput
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 pr-11 text-sm focus:outline-none focus:ring-2 ${
                errors.password
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Password"
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className={`absolute right-3 ${errors.password ? "top-1/3" : "top-1/2"} -translate-y-1/2 text-gray-500 hover:text-gray-700`}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {errors.password && <p className={errorClass}>{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <AppInput
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 pr-11 text-sm focus:outline-none focus:ring-2 ${
                errors.confirmPassword
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Confirm Password"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className={`absolute right-3 ${errors.password ? "top-1/3" : "top-1/2"} -translate-y-1/2 text-gray-500 hover:text-gray-700`}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {errors.confirmPassword && (
              <p className={errorClass}>{errors.confirmPassword}</p>
            )}
          </div>

          {/* Homeowner Details */}
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-gray-600 mt-4 mb-2">
              Homeowner Details
            </h2>
          </div>

          {/* Owner Name */}
          <div>
            <AppInput
              name="ownerName"
              value={form.ownerName}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.ownerName
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Owner's fullname"
            />
            {errors.ownerName && (
              <p className={errorClass}>{errors.ownerName}</p>
            )}
          </div>

          {/* Owner Contact Number */}
          <div>
            <AppInput
              name="ownerContactNumber"
              value={form.ownerContactNumber}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.ownerContactNumber
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Owner's contact number"
            />
            {errors.ownerContactNumber && (
              <p className={errorClass}>{errors.ownerContactNumber}</p>
            )}
          </div>

          {/* Owner Address */}
          <div>
            <AppInput
              name="ownerAddress"
              value={form.ownerAddress}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.ownerAddress
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Owner's address"
            />
            {errors.ownerAddress && (
              <p className={errorClass}>{errors.ownerAddress}</p>
            )}
          </div>

          {/* Number of Occupants */}
          <div>
            <AppInput
              name="ownerNumberOccupants"
              value={form.ownerNumberOccupants}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.ownerNumberOccupants
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Number of Occupants"
            />
            {errors.ownerNumberOccupants && (
              <p className={errorClass}>{errors.ownerNumberOccupants}</p>
            )}
          </div>

          {/* Uploads */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PHOTO UPLOAD */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Photo
              </label>

              <p className="min-h-8 text-xs text-gray-500">
                This must be a clear photo of you (not someone else).
              </p>

              <label
                className={`flex h-9 w-full items-center gap-2 rounded-xl border px-4 text-sm cursor-pointer hover:bg-gray-50 ${
                  errors.picture ? "border-red-400" : "border-gray-300"
                }`}
              >
                <span className="flex size-6 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <Image size={16} />
                </span>

                <span className="flex-1 truncate">Upload Your Photo</span>

                <AppInput
                  type="file"
                  ref={pictureInputRef}
                  hidden
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>

              {errors.picture && <p className={errorClass}>{errors.picture}</p>}
              {imagePreview && (
                <div className="relative inline-block mt-2">
                  {typeof imagePreview === "string" && (
                    <>
                      <img
                        src={imagePreview}
                        alt="Selected image"
                        className="size-12 object-cover rounded-lg"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setForm((prev) => ({ ...prev, picture: null }));

                          // ✅ IMPORTANT: reset file AppInput so selecting the same file triggers onChange
                          if (pictureInputRef.current) {
                            pictureInputRef.current.value = "";
                          }
                        }}
                        className="absolute cursor-pointer -top-2 -right-2 grid size-5 place-items-center rounded-full bg-black/70 text-white hover:bg-black focus:outline-none focus:ring-2 focus:ring-green-500"
                        aria-label="Remove image"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* DOCUMENT UPLOAD */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                House Lease Agreement Document
              </label>

              <p className="min-h-8 text-xs text-gray-500">
                Upload your house lease agreement document for verification.
              </p>

              <label
                className={`flex h-9 w-full items-center gap-2 rounded-xl border px-4 text-sm cursor-pointer hover:bg-gray-50 ${
                  errors.document ? "border-red-400" : "border-gray-300"
                }`}
              >
                <span className="flex size-6 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <File size={16} />
                </span>

                <span className="flex-1 truncate">
                  {form.document
                    ? form.document.name
                    : "Upload Document (PDF/DOC/DOCX)"}
                </span>

                <AppInput
                  type="file"
                  ref={documentRef}
                  hidden
                  accept="application/pdf,.pdf,.doc,.docx"
                  onChange={handleDocumentChange}
                />
              </label>

              {errors.document && (
                <p className={errorClass}>{errors.document}</p>
              )}

              {/*Document Preview + remove */}
              {form.document && (
                <div className="relative mt-2 rounded-lg border border-gray-200 p-2">
                  {/* If PDF, show iframe preview */}
                  {form.document.type === "application/pdf" &&
                  documentPreview ? (
                    <iframe
                      src={documentPreview}
                      title="Document preview"
                      className="w-full h-40 rounded-md"
                    />
                  ) : (
                    <div className="flex flex-col gap-1 text-sm text-gray-700">
                      <p className="font-medium truncate">
                        {form.document.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Word document • {Math.round(form.document.size / 1024)}{" "}
                        KB
                      </p>

                      {documentPreview && (
                        <a
                          href={documentPreview}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-green-700 underline"
                        >
                          Open document
                        </a>
                      )}
                    </div>
                  )}

                  {/* ❌ Remove button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (documentPreview) URL.revokeObjectURL(documentPreview);
                      setDocumentPreview(null);
                      setForm((prev) => ({ ...prev, document: null }));

                      // ✅ reset AppInput so user can re-select same file
                      if (documentRef.current) documentRef.current.value = "";
                    }}
                    className="absolute cursor-pointer -top-2 -right-2 grid size-5 place-items-center rounded-full bg-black/70 text-white hover:bg-black focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label="Remove document"
                    title="Remove document"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Terms */}
          <div className="md:col-span-2 flex items-start gap-2 text-xs text-gray-600 mt-2">
            <input
              className="cursor-pointer"
              type="checkbox"
              checked={!notAgree}
              onChange={() => setNotAgree((prev) => !prev)}
            />
            <p>
              By registering, you agree to our{" "}
              <span className="text-green-600">Terms & Conditions</span> and{" "}
              <span className="text-green-600">Privacy Policy</span>.
            </p>
          </div>

          {error && (
            <div className="flex items-center justify-between  bg-red-500 text-white p-3 rounded-lg my-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} />
                <p>{error}</p>
              </div>
              <button className="cursor-pointer" onClick={() => setError("")}>
                <XCircle size={20} />
              </button>
            </div>
          )}

          {/* Submit */}
          <div className="md:col-span-2 mt-4">
            <button
              disabled={notAgree || isLoading}
              className={`btn w-full  disabled:bg-gray-400 border-green-600 bg-green-600 hover:bg-green-700 text-white `}
            >
              {isLoading ? (
                <span className="loading loading-bars loading-xs"></span>
              ) : (
                "Register"
              )}
            </button>
          </div>

          <div
            id="clerk-captcha"
            data-cl-theme="dark"
            data-cl-size="flexible"
            data-cl-language="en-US"
          />
        </form>
      </div>
    </div>
  );
}
