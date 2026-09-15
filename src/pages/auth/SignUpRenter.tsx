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

type RenterSignUpFormData = Omit<
  UserDataSignUpRenterType,
  "userType" | "user_id" | "document" | "picture" | "fullName" | "address"
> & {
  password: string;
  confirmPassword: string;
  picture: File | null;
  document: File | null;
};

type FormErrors = Partial<Record<keyof RenterSignUpFormData, string>>;

const NUMBER_ONLY_FIELDS = [
  "contactNumber",
  "phase",
  "block",
  "lot",
  "ownerContactNumber",
  "ownerNumberOccupants",
] as const;

type NumberOnlyField = (typeof NUMBER_ONLY_FIELDS)[number];

const isNumberOnlyField = (name: string): name is NumberOnlyField =>
  NUMBER_ONLY_FIELDS.includes(name as NumberOnlyField);

const numbersOnly = (value: string) => value.replace(/\D/g, "");

export default function SignUpRenter() {
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState<RenterSignUpFormData>({
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
  const handleBack = () => {
    navigate(-1);
  };

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

  const validateContactNumber = (value: string): string => {
    const contactNumber = value.trim();
    if (!contactNumber) return "Contact number is required";
    if (!/^\d+$/.test(contactNumber))
      return "Contact number must contain numbers only";
    if (contactNumber.length >= 1 && contactNumber[0] !== "0")
      return "Contact number must start with 09";
    if (contactNumber.length >= 2 && !contactNumber.startsWith("09"))
      return "Contact number must start with 09";
    if (contactNumber.length < 11) {
      const remaining = 11 - contactNumber.length;
      return `Contact number needs ${remaining} more digit${remaining === 1 ? "" : "s"}`;
    }
    if (contactNumber.length > 11)
      return "Contact number must be exactly 11 digits";
    if (!/^09\d{9}$/.test(contactNumber))
      return "Please enter a valid Philippine mobile number";
    return "";
  };

  const validatePassword = (value: string): string => {
    if (!value) return "Password is required";
    if (value.length < 8)
      return `Password needs ${8 - value.length} more character${8 - value.length === 1 ? "" : "s"}`;
    if (!/[A-Z]/.test(value)) return "Add at least 1 uppercase letter";
    if (!/[a-z]/.test(value)) return "Add at least 1 lowercase letter";
    if (!/\d/.test(value)) return "Add at least 1 number";
    if (!/[^\w\s]/.test(value)) return "Add at least 1 special character";
    return "";
  };

  const validateConfirmPassword = (
    confirmPassword: string,
    password: string,
  ): string => {
    if (!confirmPassword) return "Please confirm your password";
    if (confirmPassword !== password) return "Passwords do not match";
    return "";
  };

  const validateName = (
    value: string,
    fieldLabel: string,
    required = true,
  ): string => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return required ? `${fieldLabel} is required` : "";
    if (trimmedValue.length < 2)
      return `${fieldLabel} must be at least 2 characters`;
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(trimmedValue))
      return `${fieldLabel} can only contain letters, spaces, hyphens, and apostrophes`;
    return "";
  };

  const validateAddressNumber = (value: string, fieldLabel: string): string => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return `${fieldLabel} is required`;
    if (!/^\d+$/.test(trimmedValue))
      return `${fieldLabel} must contain numbers only`;
    if (Number(trimmedValue) <= 0)
      return `${fieldLabel} must be greater than 0`;
    return "";
  };

  const validateOwnerAddress = (value: string): string =>
    value.trim() ? "" : "Owner's address is required";

  const validateOccupants = (value: string): string => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return "Number of occupants is required";
    if (!/^\d+$/.test(trimmedValue))
      return "Number of occupants must contain numbers only";
    if (Number(trimmedValue) < 1)
      return "Number of occupants must be at least 1";
    return "";
  };

  const validateForm = () => {
    const errors: FormErrors = {};

    const firstNameError = validateName(form.firstName, "First name", true);
    const middleNameError = validateName(form.middleName, "Middle name", false);
    const lastNameError = validateName(form.lastName, "Last name", true);
    const contactNumberError = validateContactNumber(form.contactNumber);
    const phaseError = validateAddressNumber(form.phase, "Phase");
    const blockError = validateAddressNumber(form.block, "Block");
    const lotError = validateAddressNumber(form.lot, "Lot");
    const ownerNameError = validateName(form.ownerName, "Owner's name", true);
    const ownerContactNumberError = validateContactNumber(
      form.ownerContactNumber,
    );
    const ownerAddressError = validateOwnerAddress(form.ownerAddress);
    const occupantsError = validateOccupants(form.ownerNumberOccupants);
    const passwordError = validatePassword(form.password);
    const confirmPasswordError = validateConfirmPassword(
      form.confirmPassword,
      form.password,
    );

    if (firstNameError) errors.firstName = firstNameError;
    if (middleNameError) errors.middleName = middleNameError;
    if (lastNameError) errors.lastName = lastNameError;
    if (contactNumberError) errors.contactNumber = contactNumberError;

    if (!form.email.trim()) errors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      errors.email = "Invalid email address";

    if (!form.gender) errors.gender = "Gender is required";
    if (phaseError) errors.phase = phaseError;
    if (blockError) errors.block = blockError;
    if (lotError) errors.lot = lotError;
    if (ownerNameError) errors.ownerName = ownerNameError;
    if (ownerContactNumberError)
      errors.ownerContactNumber = ownerContactNumberError;
    if (ownerAddressError) errors.ownerAddress = ownerAddressError;
    if (occupantsError) errors.ownerNumberOccupants = occupantsError;
    if (passwordError) errors.password = passwordError;
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

    if (!form.picture) errors.picture = "Picture is required";
    else if (!isImageFile(form.picture))
      errors.picture = "Please upload a valid image file";

    // House Lease Agreement Document is optional.
    if (form.document && !isAllowedDocument(form.document)) {
      errors.document = "Document must be PDF, DOC, or DOCX";
    }

    const MAX_IMAGE_MB = 5;
    const MAX_DOC_MB = 10;

    if (form.picture && form.picture.size > MAX_IMAGE_MB * 1024 * 1024)
      errors.picture = `Image must be less than ${MAX_IMAGE_MB}MB`;

    if (form.document && form.document.size > MAX_DOC_MB * 1024 * 1024)
      errors.document = `Document must be less than ${MAX_DOC_MB}MB`;

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSignUpPress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoaded) return;
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await signUp.create({
        emailAddress: form.email,
        password: form.password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setIsLoading(false);
      setError("");
      setPendingVerification(true);
    } catch (err: any) {
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

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    const verificationCode = code.trim();

    if (!verificationCode) {
      setError("Enter the verification code.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      /*
       * IMPORTANT:
       * Keep the same Clerk signUp object alive from:
       * signUp.create()
       * -> prepareEmailAddressVerification()
       * -> attemptEmailAddressVerification()
       *
       * Do not navigate, reload, recreate the signup, or call setActive()
       * before the Firestore registration has been saved.
       */
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (signUpAttempt.status !== "complete") {
        console.error(
          "RENTER SIGNUP NOT COMPLETE:",
          JSON.stringify(signUpAttempt, null, 2),
        );
        setError(
          "Email verification is not complete yet. Please check the code and try again.",
        );
        return;
      }

      const createdUserId = signUpAttempt.createdUserId;
      const createdSessionId = signUpAttempt.createdSessionId;

      if (!createdUserId) {
        throw new Error(
          "Clerk verified the email but did not return a user ID. Please try registering again.",
        );
      }

      if (!createdSessionId) {
        throw new Error(
          "Clerk verified the email but did not return a session ID. Please try registering again.",
        );
      }

      if (!form.picture) {
        throw new Error(
          "Valid Government ID is missing. Please select your photo again.",
        );
      }

      // Upload the required government ID first.
      const imageUrl = await uploadToCloudinary(
        form.picture,
        "terradues/users/profile",
        "image",
      );

      if (!imageUrl) {
        throw new Error("Failed to upload Valid Government ID.");
      }

      // House Lease Agreement Document is OPTIONAL.
      let docUrl: string | null = null;

      if (form.document) {
        docUrl = await uploadToCloudinary(
          form.document,
          "terradues/users/document",
          "raw",
        );

        if (!docUrl) {
          throw new Error("Failed to upload House Lease Agreement Document.");
        }
      }

      const userData: UserDataSignUpRenterType = {
        userType: "Renter",
        user_id: createdUserId,
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        middleName: form.middleName.trim(),
        contactNumber: form.contactNumber.trim(),
        gender: form.gender,
        phase: form.phase.trim(),
        block: form.block.trim(),
        lot: form.lot.trim(),
        picture: imageUrl,
        document: docUrl,

        ownerAddress: form.ownerAddress.trim(),
        ownerContactNumber: form.ownerContactNumber.trim(),
        ownerName: form.ownerName.trim(),
        ownerNumberOccupants: form.ownerNumberOccupants.trim(),

        fullName: `${form.firstName.trim()} ${
          form.middleName.trim() ? form.middleName.trim()[0] + "." : ""
        } ${form.lastName.trim()}`
          .replace(/\s+/g, " ")
          .trim(),

        address: `Blk ${form.block.trim()} Lot ${form.lot.trim()} Phase ${form.phase.trim()}`,
      };

      /*
       * CRITICAL ORDER:
       *
       * 1. Clerk email verification
       * 2. Upload registration files
       * 3. Save renter in Firestore
       * 4. Activate Clerk session
       * 5. Navigate
       *
       * addUser() creates the resident document with approvalStatus: "pending",
       * which is what makes the renter appear in Admin Registration Requests.
       */
      await addUser(userData);

      // Only activate the Clerk session AFTER Firestore registration succeeds.
      await setActive({ session: createdSessionId });

      navigate("/");
    } catch (err: any) {
      console.error("RENTER REGISTRATION ERROR:", JSON.stringify(err, null, 2));

      const clerkCode = err?.errors?.[0]?.code;
      const clerkMessage =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message;

      if (clerkCode === "too_many_requests") {
        setError("Too many requests. Please try again in a bit.");
      } else if (clerkCode === "form_param_nil") {
        setError("Enter the verification code.");
      } else if (clerkCode === "form_code_incorrect") {
        setError("The verification code is incorrect.");
      } else if (clerkCode === "verification_expired") {
        setError(
          "The verification code has expired. Please register again to request a new code.",
        );
      } else if (clerkCode === "client_state_invalid") {
        setError(
          "The registration session expired or was interrupted. Please register again without refreshing the page during email verification.",
        );
      } else {
        setError(
          clerkMessage ||
            "Registration could not be completed. Please try again.",
        );
      }
    } finally {
      setIsLoading(false);
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

    const newValue = isNumberOnlyField(name)
      ? numbersOnly(value)
      : type === "checkbox"
        ? checked
        : value;

    setForm((prev) => ({ ...prev, [name]: newValue }));

    let fieldError = "";

    switch (name) {
      case "firstName":
        fieldError = validateName(String(newValue), "First name", true);
        break;
      case "middleName":
        fieldError = validateName(String(newValue), "Middle name", false);
        break;
      case "lastName":
        fieldError = validateName(String(newValue), "Last name", true);
        break;
      case "contactNumber":
        fieldError = validateContactNumber(String(newValue));
        break;
      case "email":
        fieldError = !String(newValue).trim()
          ? "Email is required"
          : !/^\S+@\S+\.\S+$/.test(String(newValue))
            ? "Invalid email address"
            : "";
        break;
      case "gender":
        fieldError = String(newValue) ? "" : "Gender is required";
        break;
      case "phase":
        fieldError = validateAddressNumber(String(newValue), "Phase");
        break;
      case "block":
        fieldError = validateAddressNumber(String(newValue), "Block");
        break;
      case "lot":
        fieldError = validateAddressNumber(String(newValue), "Lot");
        break;
      case "ownerName":
        fieldError = validateName(String(newValue), "Owner's name", true);
        break;
      case "ownerContactNumber":
        fieldError = validateContactNumber(String(newValue));
        break;
      case "ownerAddress":
        fieldError = validateOwnerAddress(String(newValue));
        break;
      case "ownerNumberOccupants":
        fieldError = validateOccupants(String(newValue));
        break;
      case "password":
        fieldError = validatePassword(String(newValue));
        break;
      case "confirmPassword":
        fieldError = validateConfirmPassword(String(newValue), form.password);
        break;
    }

    setErrors((prev) => {
      const updatedErrors = { ...prev };
      const key = name as keyof RenterSignUpFormData;

      if (fieldError) updatedErrors[key] = fieldError;
      else delete updatedErrors[key];

      if (name === "password" && form.confirmPassword) {
        const confirmError = validateConfirmPassword(
          form.confirmPassword,
          String(newValue),
        );
        if (confirmError) updatedErrors.confirmPassword = confirmError;
        else delete updatedErrors.confirmPassword;
      }

      return updatedErrors;
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const photo = e.target.files?.[0] ?? null;

    setForm((prev) => ({
      ...prev,
      picture: photo,
    }));

    setErrors((prev) => {
      const updatedErrors = { ...prev };
      if (!photo) updatedErrors.picture = "Picture is required";
      else if (!isImageFile(photo))
        updatedErrors.picture = "Please upload a valid image file";
      else if (photo.size > 5 * 1024 * 1024)
        updatedErrors.picture = "Image must be less than 5MB";
      else delete updatedErrors.picture;
      return updatedErrors;
    });

    if (photo) {
      readFileAsDataURL(photo).then((res) => setImagePreview(res as string));
    } else {
      setImagePreview(null);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const doc = e.target.files?.[0] ?? null;

    setForm((prev) => ({
      ...prev,
      document: doc,
    }));

    if (documentPreview) URL.revokeObjectURL(documentPreview);

    setErrors((prev) => {
      const updatedErrors = { ...prev };
      if (!doc) delete updatedErrors.document;
      else if (!isAllowedDocument(doc))
        updatedErrors.document = "Document must be PDF, DOC, or DOCX";
      else if (doc.size > 10 * 1024 * 1024)
        updatedErrors.document = "Document must be less than 10MB";
      else delete updatedErrors.document;
      return updatedErrors;
    });

    if (!doc) {
      setDocumentPreview(null);
      return;
    }

    const url = URL.createObjectURL(doc);
    setDocumentPreview(url);
  };

  const readFileAsDataURL = (
    file: File,
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
    <div className="relative min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Back Button */}
      <button
        type="button"
        onClick={handleBack}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-lg
                 text-gray-700 font-semibold hover:bg-gray-200
                 transition cursor-pointer"
      >
        <span className="text-2xl">←</span>
        <span>Back</span>
      </button>

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6 md:p-10">
        <div className="flex flex-col items-center px-4 mb-8">
          <img
            src={Icon}
            alt="TerraDues"
            className="max-w-md size-28 object-contain fade-in"
          />

          <div className="flex gap-1 text-xl">
            <span className="font-bold text-green-700">TERRA</span>
            <span className="font-bold text-black">DUES</span>
          </div>

          {/* Registration Header */}
          <div className="mt-6 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Renter Registration
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Please provide your renter information to create your account.
            </p>
          </div>
        </div>

        <form
          onSubmit={onSignUpPress}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">
              Personal Detail
            </h2>
          </div>

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

          <div>
            <AppInput
              name="middleName"
              value={form.middleName}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Middle Name (optional)"
            />
          </div>

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

          <div>
            <AppInput
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={11}
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

          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-gray-600 mt-4 mb-2">
              Address
            </h2>
          </div>

          <div>
            <AppInput
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="phase"
              value={form.phase}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.phase
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Phase Number"
            />
            {errors.phase && <p className={errorClass}>{errors.phase}</p>}
          </div>

          <div>
            <AppInput
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="block"
              value={form.block}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.block
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Block Number"
            />
            {errors.block && <p className={errorClass}>{errors.block}</p>}
          </div>

          <div>
            <AppInput
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="lot"
              value={form.lot}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.lot
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Lot Number"
            />
            {errors.lot && <p className={errorClass}>{errors.lot}</p>}
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-4 text-sm text-gray-700">
            <span className="font-medium">Password</span>
          </div>

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
              className={`absolute right-3 ${
                errors.password ? "top-1/3" : "top-1/2"
              } -translate-y-1/2 text-gray-500 hover:text-gray-700`}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {errors.password && <p className={errorClass}>{errors.password}</p>}
          </div>

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
              className={`absolute right-3 ${
                errors.confirmPassword ? "top-1/3" : "top-1/2"
              } -translate-y-1/2 text-gray-500 hover:text-gray-700`}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {errors.confirmPassword && (
              <p className={errorClass}>{errors.confirmPassword}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-gray-600 mt-4 mb-2">
              Homeowner Details
            </h2>
          </div>

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

          <div>
            <AppInput
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={11}
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

          <div>
            <AppInput
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
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

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Valid Government ID
              </label>

              <p className="min-h-8 text-xs text-gray-500">
                This must be a clear photo of you, not someone else.
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                House Lease Agreement Document (Optional)
              </label>

              <p className="min-h-8 text-xs text-gray-500">
                Optional — upload your house lease agreement document if
                available.
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

              {form.document && (
                <div className="relative mt-2 rounded-lg border border-gray-200 p-2">
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

                  <button
                    type="button"
                    onClick={() => {
                      if (documentPreview) URL.revokeObjectURL(documentPreview);
                      setDocumentPreview(null);
                      setForm((prev) => ({ ...prev, document: null }));

                      if (documentRef.current) {
                        documentRef.current.value = "";
                      }
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
            <div className="md:col-span-2 flex items-center justify-between bg-red-500 text-white p-3 rounded-lg my-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} />
                <p>{error}</p>
              </div>

              <button
                type="button"
                className="cursor-pointer"
                onClick={() => setError("")}
              >
                <XCircle size={20} />
              </button>
            </div>
          )}

          <div className="md:col-span-2 mt-4">
            <button
              type="submit"
              disabled={notAgree || isLoading}
              className="btn w-full disabled:bg-gray-400 border-green-600 bg-green-700 hover:bg-green-800 text-white"
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
