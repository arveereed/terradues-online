import { useSignUp } from "@clerk/clerk-react";
import { useRef, useState } from "react";
import type { UserDataSignUpOwnerType } from "../../types";
import Icon from "../../assets/splashImage.png";
import { AlertCircle, Eye, EyeOff, File, Image, XCircle } from "lucide-react";
import VerifyEmailUI from "../../components/VerifyEmailUI";
import { addUser } from "../../features/auth/services/auth.service";
import { useNavigate } from "react-router-dom";
import { uploadToCloudinary } from "../../lib/cloudinary/cloudinary";
import AppInput from "../../components/AppInput";

type OwnerSignUpFormData = Omit<
  UserDataSignUpOwnerType,
  "userType" | "user_id" | "document" | "picture" | "fullName" | "address"
> & {
  password: string;
  confirmPassword: string;
  picture: File | null;
  document: File | null;
};

type FormErrors = Partial<Record<keyof OwnerSignUpFormData, string>>;

const NUMBER_ONLY_FIELDS = [
  "contactNumber",
  "phase",
  "block",
  "lot",
  "familyMembers",
] as const;

type NumberOnlyField = (typeof NUMBER_ONLY_FIELDS)[number];

const isNumberOnlyField = (name: string): name is NumberOnlyField =>
  NUMBER_ONLY_FIELDS.includes(name as NumberOnlyField);

const numbersOnly = (value: string) => value.replace(/\D/g, "");

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
    familyMembers: "",
    forRent: false,
    password: "",
    confirmPassword: "",
    picture: null,
    document: null,
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

    if (!contactNumber) {
      return "Contact number is required";
    }

    if (!/^\d+$/.test(contactNumber)) {
      return "Contact number must contain numbers only";
    }

    // Philippine mobile number must start with 09
    if (contactNumber.length >= 1 && contactNumber[0] !== "0") {
      return "Contact number must start with 09";
    }

    if (contactNumber.length >= 2 && !contactNumber.startsWith("09")) {
      return "Contact number must start with 09";
    }

    // Philippine mobile number must be exactly 11 digits
    if (contactNumber.length < 11) {
      const remaining = 11 - contactNumber.length;

      return `Contact number needs ${remaining} more digit${
        remaining === 1 ? "" : "s"
      }`;
    }

    if (contactNumber.length > 11) {
      return "Contact number must be exactly 11 digits";
    }

    // Final validation
    if (!/^09\d{9}$/.test(contactNumber)) {
      return "Please enter a valid Philippine mobile number";
    }

    return "";
  };

  const validatePassword = (value: string): string => {
    if (!value) {
      return "Password is required";
    }

    if (value.length < 8) {
      return `Password needs ${8 - value.length} more character${
        8 - value.length === 1 ? "" : "s"
      }`;
    }

    if (!/[A-Z]/.test(value)) {
      return "Add at least 1 uppercase letter";
    }

    if (!/[a-z]/.test(value)) {
      return "Add at least 1 lowercase letter";
    }

    if (!/\d/.test(value)) {
      return "Add at least 1 number";
    }

    if (!/[^\w\s]/.test(value)) {
      return "Add at least 1 special character";
    }

    return "";
  };

  const validateConfirmPassword = (
    confirmPassword: string,
    password: string,
  ): string => {
    if (!confirmPassword) {
      return "Please confirm your password";
    }

    if (confirmPassword !== password) {
      return "Passwords do not match";
    }

    return "";
  };

  const validateName = (
    value: string,
    fieldLabel: string,
    required = true,
  ): string => {
    const trimmedValue = value.trim();

    // Middle name can be optional
    if (!trimmedValue) {
      return required ? `${fieldLabel} is required` : "";
    }

    if (trimmedValue.length < 2) {
      return `${fieldLabel} must be at least 2 characters`;
    }

    // Allows:
    // Juan
    // Mary Jane
    // Anne-Marie
    // O'Connor
    // José
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(trimmedValue)) {
      return `${fieldLabel} can only contain letters, spaces, hyphens, and apostrophes`;
    }

    return "";
  };

  const validateAddressNumber = (value: string, fieldLabel: string): string => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return `${fieldLabel} is required`;
    }

    if (!/^\d+$/.test(trimmedValue)) {
      return `${fieldLabel} must contain numbers only`;
    }

    if (Number(trimmedValue) <= 0) {
      return `${fieldLabel} must be greater than 0`;
    }

    return "";
  };

  const validateFamilyMembers = (value: string): string => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return "Number of family members is required";
    }

    if (!/^\d+$/.test(trimmedValue)) {
      return "Number of family members must contain numbers only";
    }

    if (Number(trimmedValue) < 1) {
      return "Number of family members must be at least 1";
    }

    return "";
  };

  const validateForm = () => {
    const errors: FormErrors = {};

    const firstNameError = validateName(form.firstName, "First name", true);

    const middleNameError = validateName(form.middleName, "Middle name", false);

    const lastNameError = validateName(form.lastName, "Last name", true);

    if (firstNameError) {
      errors.firstName = firstNameError;
    }

    if (middleNameError) {
      errors.middleName = middleNameError;
    }

    if (lastNameError) {
      errors.lastName = lastNameError;
    }

    const contactNumberError = validateContactNumber(form.contactNumber);
    if (contactNumberError) {
      errors.contactNumber = contactNumberError;
    }

    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      errors.email = "Invalid email address";
    }

    if (!form.gender) errors.gender = "Gender is required";

    const phaseError = validateAddressNumber(form.phase, "Phase");
    const blockError = validateAddressNumber(form.block, "Block");
    const lotError = validateAddressNumber(form.lot, "Lot");

    if (phaseError) {
      errors.phase = phaseError;
    }

    if (blockError) {
      errors.block = blockError;
    }

    if (lotError) {
      errors.lot = lotError;
    }

    const familyMembersError = validateFamilyMembers(form.familyMembers);

    if (familyMembersError) {
      errors.familyMembers = familyMembersError;
    }

    const passwordError = validatePassword(form.password);

    if (passwordError) {
      errors.password = passwordError;
    }

    const confirmPasswordError = validateConfirmPassword(
      form.confirmPassword,
      form.password,
    );

    if (confirmPasswordError) {
      errors.confirmPassword = confirmPasswordError;
    }

    if (!form.picture) {
      errors.picture = "Picture is required";
    } else if (!isImageFile(form.picture)) {
      errors.picture = "Please upload a valid image file";
    }

    // House Turnover Document is optional.
    // Validate its type only when the user selects a file.
    if (form.document && !isAllowedDocument(form.document)) {
      errors.document = "Document must be PDF, DOC, or DOCX";
    }

    const MAX_IMAGE_MB = 5;
    const MAX_DOC_MB = 10;

    if (form.picture && form.picture.size > MAX_IMAGE_MB * 1024 * 1024) {
      errors.picture = `Image must be less than ${MAX_IMAGE_MB}MB`;
    }

    if (form.document && form.document.size > MAX_DOC_MB * 1024 * 1024) {
      errors.document = `Document must be less than ${MAX_DOC_MB}MB`;
    }

    const isValid = Object.keys(errors).length === 0;

    console.log("Validation result:", {
      isValid,
      errors,
    });

    setErrors(errors);

    return isValid;
  };
  const onSignUpPress = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (!isLoaded || !signUp) {
      setError("Authentication is still loading. Please try again.");
      return;
    }

    const isValid = validateForm();

    if (!isValid) {
      setError(
        "Please check the highlighted fields and correct the errors before registering.",
      );

      setTimeout(() => {
        const firstInvalidField = document.querySelector(".border-red-400");

        firstInvalidField?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);

      return;
    }

    setIsLoading(true);

    try {
      console.log("===== CREATING CLERK SIGNUP =====");

      const signUpAttempt = await signUp.create({
        emailAddress: form.email.trim(),
        password: form.password,
      });

      console.log("Signup ID:", signUpAttempt.id);
      console.log("Signup status:", signUpAttempt.status);
      console.log("Signup:", signUpAttempt);

      if (!signUpAttempt.id) {
        throw new Error(
          "Clerk did not create a signup attempt. Please try again.",
        );
      }

      console.log("===== PREPARING EMAIL VERIFICATION =====");

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      console.log("Verification email sent.");
      console.log("Current signup ID:", signUp.id);

      /*
       * IMPORTANT:
       *
       * Do NOT:
       * - navigate()
       * - setActive()
       * - window.location.reload()
       * - window.location.href
       *
       * We must keep the current Clerk signup attempt alive.
       */

      setCode("");
      setError("");
      setPendingVerification(true);
    } catch (err: any) {
      console.error("HOMEOWNER SIGNUP ERROR:", err);

      const clerkError = err?.errors?.[0];

      console.error(
        "HOMEOWNER SIGNUP ERROR JSON:",
        JSON.stringify(err, null, 2),
      );

      switch (clerkError?.code) {
        case "form_identifier_exists":
          setError(
            "This email address is already registered. Please use another email or sign in.",
          );
          break;

        case "form_param_format_invalid":
          setError("Please enter a valid email address.");
          break;

        case "form_param_nil":
          setError("Email or password is missing.");
          break;

        case "form_password_length_too_short":
          setError("Password must be at least 8 characters.");
          break;

        case "form_password_pwned":
          setError(
            "This password has been found in a data breach. Please use a different password.",
          );
          break;

        case "too_many_requests":
          setError(
            clerkError?.longMessage ||
              "Too many registration attempts. Please wait and try again.",
          );
          break;

        default:
          setError(
            clerkError?.longMessage ||
              clerkError?.message ||
              err?.message ||
              "Unable to create your account. Please try again.",
          );
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyPress = async () => {
    setError("");

    if (!isLoaded || !signUp) {
      setError("Authentication is still loading. Please try again.");
      return;
    }

    const verificationCode = code.trim();

    if (!verificationCode) {
      setError("Please enter the verification code.");
      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);

    try {
      console.log("===== EMAIL VERIFICATION =====");
      console.log("Signup ID before verification:", signUp.id);
      console.log("Signup status:", signUp.status);

      /*
       * If this is undefined, Clerk lost the signup attempt.
       * Don't blindly send the verification request.
       */
      if (!signUp.id) {
        throw new Error("SIGNUP_SESSION_LOST");
      }

      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      console.log("Verification result:", signUpAttempt);

      /*
       * Verification may still need requirements.
       */
      if (signUpAttempt.status !== "complete") {
        console.error("Signup is not complete:", signUpAttempt);

        setError(
          "Email verification could not be completed. Please try again.",
        );

        return;
      }

      const createdUserId = signUpAttempt.createdUserId;

      const createdSessionId = signUpAttempt.createdSessionId;

      if (!createdUserId) {
        throw new Error(
          "Clerk verified the account but did not return a user ID.",
        );
      }

      if (!createdSessionId) {
        throw new Error(
          "Clerk verified the account but did not return a session.",
        );
      }

      console.log("===== CLERK ACCOUNT VERIFIED =====");

      console.log("Created user:", createdUserId);

      /*
       * Files were already required by validateForm(),
       * but check again before uploading.
       */
      if (!form.picture) {
        throw new Error("Government ID is missing. Please register again.");
      }

      /*
       * ==========================================
       * CLOUDINARY - GOVERNMENT ID
       * ==========================================
       */

      console.log("Uploading Government ID...");

      const imageUrl = await uploadToCloudinary(
        form.picture,
        "terradues/users/profile",
        "image",
      );

      if (!imageUrl) {
        throw new Error("Failed to upload Government ID.");
      }

      console.log("Government ID uploaded:", imageUrl);

      /*
       * ==========================================
       * CLOUDINARY - HOUSE TURNOVER DOCUMENT
       * ==========================================
       */

      let docUrl: string | null = null;

      if (form.document) {
        console.log("Uploading House Turnover Document...");

        docUrl = await uploadToCloudinary(
          form.document,
          "terradues/users/document",
          "raw",
        );

        if (!docUrl) {
          throw new Error("Failed to upload House Turnover Document.");
        }

        console.log("House Turnover Document uploaded:", docUrl);
      } else {
        console.log("No House Turnover Document provided (optional).");
      }

      /*
       * ==========================================
       * CREATE FIRESTORE RESIDENT
       * ==========================================
       */

      const firstName = form.firstName.trim();

      const middleName = form.middleName.trim();

      const lastName = form.lastName.trim();

      const fullName = [firstName, middleName, lastName]
        .filter(Boolean)
        .join(" ");

      const userData: UserDataSignUpOwnerType = {
        userType: "Owner",

        user_id: createdUserId,

        email: signUpAttempt.emailAddress?.trim() || form.email.trim(),

        firstName,
        middleName,
        lastName,

        contactNumber: form.contactNumber.trim(),

        gender: form.gender,

        phase: form.phase.trim(),
        block: form.block.trim(),
        lot: form.lot.trim(),

        familyMembers: form.familyMembers.trim(),

        forRent: false,

        picture: imageUrl,
        document: docUrl,

        fullName,

        address: `Blk ${form.block.trim()} Lot ${form.lot.trim()} Phase ${form.phase.trim()}`,
      };

      console.log("===== SAVING FIRESTORE RESIDENT =====");

      console.log(userData);

      const firestoreUserId = await addUser(userData);

      if (!firestoreUserId) {
        throw new Error("Firestore did not return the created resident ID.");
      }

      console.log("Firestore resident created successfully:", firestoreUserId);

      /*
       * IMPORTANT:
       *
       * Activate the Clerk session only AFTER
       * Firestore has successfully stored the resident.
       */
      console.log("Activating Clerk session...");

      await setActive({
        session: createdSessionId,
      });

      console.log("===== HOMEOWNER REGISTRATION COMPLETE =====");

      /*
       * Your auth flow can now detect:
       *
       * role: resident
       * approvalStatus: pending
       *
       * and show the pending approval page.
       */
      navigate("/", {
        replace: true,
      });
    } catch (err: any) {
      console.error("HOMEOWNER REGISTRATION ERROR:", err);

      console.error(
        "HOMEOWNER REGISTRATION ERROR JSON:",
        JSON.stringify(err, null, 2),
      );

      const clerkError = err?.errors?.[0];

      /*
       * Exact Clerk error you encountered:
       *
       * client_state_invalid
       * "No sign up attempt was found."
       */
      if (
        clerkError?.code === "client_state_invalid" ||
        err?.message === "SIGNUP_SESSION_LOST"
      ) {
        setError(
          "Your registration session was lost. Please return to the registration form and register again.",
        );

        /*
         * Leave verification mode so the user
         * isn't permanently stuck here.
         */
        setPendingVerification(false);
        setCode("");

        return;
      }

      if (clerkError?.code === "form_code_incorrect") {
        setError(
          "The verification code is incorrect. Please check your email and try again.",
        );

        return;
      }

      if (clerkError?.code === "form_code_expired") {
        setError(
          "The verification code has expired. Please register again to receive a new code.",
        );

        setPendingVerification(false);
        setCode("");

        return;
      }

      if (clerkError?.code === "too_many_requests") {
        setError(
          clerkError?.longMessage ||
            clerkError?.message ||
            "Too many attempts. Please wait before trying again.",
        );

        return;
      }

      setError(
        clerkError?.longMessage ||
          clerkError?.message ||
          err?.message ||
          "Registration failed. Please try again.",
      );
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;

    const newValue = isNumberOnlyField(name)
      ? numbersOnly(value)
      : type === "checkbox"
        ? checked
        : value;

    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Instant Number of Family Members validation
    if (name === "familyMembers") {
      const familyMembersError = validateFamilyMembers(String(newValue));

      setErrors((prev) => {
        const updatedErrors = { ...prev };

        if (familyMembersError) {
          updatedErrors.familyMembers = familyMembersError;
        } else {
          delete updatedErrors.familyMembers;
        }

        return updatedErrors;
      });
    }

    // Instant name validation while typing
    if (name === "firstName" || name === "middleName" || name === "lastName") {
      let nameError = "";

      if (name === "firstName") {
        nameError = validateName(value, "First name", true);
      }

      if (name === "middleName") {
        nameError = validateName(value, "Middle name", false);
      }

      if (name === "lastName") {
        nameError = validateName(value, "Last name", true);
      }

      setErrors((prev) => {
        const updatedErrors = { ...prev };

        if (nameError) {
          updatedErrors[name] = nameError;
        } else {
          delete updatedErrors[name];
        }

        return updatedErrors;
      });
    }

    // Instant Contact Number validation while typing
    if (name === "contactNumber") {
      const contactNumberError = validateContactNumber(String(newValue));

      setErrors((prev) => {
        const updatedErrors = { ...prev };

        if (contactNumberError) {
          updatedErrors.contactNumber = contactNumberError;
        } else {
          delete updatedErrors.contactNumber;
        }

        return updatedErrors;
      });
    }

    // Instant Password validation while typing
    if (name === "password") {
      const passwordError = validatePassword(value);

      setErrors((prev) => {
        const updatedErrors = { ...prev };

        if (passwordError) {
          updatedErrors.password = passwordError;
        } else {
          delete updatedErrors.password;
        }

        // Re-check Confirm Password whenever Password changes
        if (form.confirmPassword) {
          const confirmPasswordError = validateConfirmPassword(
            form.confirmPassword,
            value,
          );

          if (confirmPasswordError) {
            updatedErrors.confirmPassword = confirmPasswordError;
          } else {
            delete updatedErrors.confirmPassword;
          }
        }

        return updatedErrors;
      });
    }

    // Instant Confirm Password validation while typing
    if (name === "confirmPassword") {
      const confirmPasswordError = validateConfirmPassword(
        value,
        form.password,
      );

      setErrors((prev) => {
        const updatedErrors = { ...prev };

        if (confirmPasswordError) {
          updatedErrors.confirmPassword = confirmPasswordError;
        } else {
          delete updatedErrors.confirmPassword;
        }

        return updatedErrors;
      });
    }

    // Instant Address validation while typing
    if (name === "phase" || name === "block" || name === "lot") {
      let addressError = "";

      if (name === "phase") {
        addressError = validateAddressNumber(String(newValue), "Phase");
      }

      if (name === "block") {
        addressError = validateAddressNumber(String(newValue), "Block");
      }

      if (name === "lot") {
        addressError = validateAddressNumber(String(newValue), "Lot");
      }

      setErrors((prev) => {
        const updatedErrors = { ...prev };

        if (addressError) {
          updatedErrors[name] = addressError;
        } else {
          delete updatedErrors[name];
        }

        return updatedErrors;
      });
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const photo = e.target.files?.[0] ?? null;
    const MAX_IMAGE_MB = 5;

    let pictureError = "";

    // Instant photo validation
    if (!photo) {
      pictureError = "Picture is required";
    } else if (!isImageFile(photo)) {
      pictureError = "Please upload a valid image file";
    } else if (photo.size > MAX_IMAGE_MB * 1024 * 1024) {
      pictureError = `Image must be less than ${MAX_IMAGE_MB}MB`;
    }

    setErrors((prev) => {
      const updatedErrors = { ...prev };

      if (pictureError) {
        updatedErrors.picture = pictureError;
      } else {
        delete updatedErrors.picture;
      }

      return updatedErrors;
    });

    // Do not keep or preview an invalid photo.
    if (pictureError) {
      setForm((prev) => ({
        ...prev,
        picture: null,
      }));

      setImagePreview(null);

      if (pictureInputRef.current) {
        pictureInputRef.current.value = "";
      }

      return;
    }

    setForm((prev) => ({
      ...prev,
      picture: photo,
    }));

    if (photo) {
      try {
        const preview = await readFileAsDataURL(photo);
        setImagePreview(preview);
      } catch {
        setErrors((prev) => ({
          ...prev,
          picture:
            "Unable to read the selected image. Please choose another photo.",
        }));

        setForm((prev) => ({
          ...prev,
          picture: null,
        }));

        setImagePreview(null);

        if (pictureInputRef.current) {
          pictureInputRef.current.value = "";
        }
      }
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const doc = e.target.files?.[0] ?? null;

    setForm((prev) => ({
      ...prev,
      document: doc,
    }));

    if (documentPreview) URL.revokeObjectURL(documentPreview);

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
              Homeowner Registration
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Please provide your homeowner information to create your account.
            </p>
          </div>
        </div>

        <form
          onSubmit={onSignUpPress}
          className="grid grid-cols-1 text-black md:grid-cols-2 gap-4"
        >
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
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.firstName
                  ? "border-red-400 focus:ring-red-500"
                  : form.firstName.trim()
                    ? "border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="First Name"
            />

            {errors.firstName && (
              <p className={errorClass}>
                <AlertCircle size={12} />
                {errors.firstName}
              </p>
            )}

            {!errors.firstName && form.firstName.trim() && (
              <p className="mt-1 text-xs text-green-600">Valid first name</p>
            )}
          </div>

          {/* Middle Name */}
          <div>
            <AppInput
              name="middleName"
              value={form.middleName}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.middleName
                  ? "border-red-400 focus:ring-red-500"
                  : form.middleName.trim()
                    ? "border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Middle Name (optional)"
            />

            {errors.middleName && (
              <p className={errorClass}>
                <AlertCircle size={12} />
                {errors.middleName}
              </p>
            )}

            {!errors.middleName && form.middleName.trim() && (
              <p className="mt-1 text-xs text-green-600">Valid middle name</p>
            )}
          </div>

          {/* Last Name */}
          <div className="md:col-span-2">
            <AppInput
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.lastName
                  ? "border-red-400 focus:ring-red-500"
                  : form.lastName.trim()
                    ? "border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Last Name"
            />

            {errors.lastName && (
              <p className={errorClass}>
                <AlertCircle size={12} />
                {errors.lastName}
              </p>
            )}

            {!errors.lastName && form.lastName.trim() && (
              <p className="mt-1 text-xs text-green-600">Valid last name</p>
            )}
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
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.contactNumber
                  ? "border-red-400 focus:ring-red-500"
                  : /^09\d{9}$/.test(form.contactNumber)
                    ? "border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="09XXXXXXXXX"
            />

            {errors.contactNumber && (
              <p className={errorClass}>
                <AlertCircle size={12} />
                {errors.contactNumber}
              </p>
            )}

            {!errors.contactNumber && /^09\d{9}$/.test(form.contactNumber) && (
              <p className="mt-1 text-xs text-green-600">
                Valid Philippine mobile number
              </p>
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
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.phase
                  ? "border-red-400 focus:ring-red-500"
                  : form.phase && !validateAddressNumber(form.phase, "Phase")
                    ? "border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Phase Number"
            />

            {errors.phase && (
              <p className={errorClass}>
                <AlertCircle size={12} />
                {errors.phase}
              </p>
            )}

            {!errors.phase &&
              form.phase &&
              !validateAddressNumber(form.phase, "Phase") && (
                <p className="mt-1 text-xs text-green-600">
                  Valid phase number
                </p>
              )}
          </div>

          <div>
            <AppInput
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="block"
              value={form.block}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.block
                  ? "border-red-400 focus:ring-red-500"
                  : form.block && !validateAddressNumber(form.block, "Block")
                    ? "border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Block Number"
            />

            {errors.block && (
              <p className={errorClass}>
                <AlertCircle size={12} />
                {errors.block}
              </p>
            )}

            {!errors.block &&
              form.block &&
              !validateAddressNumber(form.block, "Block") && (
                <p className="mt-1 text-xs text-green-600">
                  Valid block number
                </p>
              )}
          </div>

          <div>
            <AppInput
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="lot"
              value={form.lot}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.lot
                  ? "border-red-400 focus:ring-red-500"
                  : form.lot && !validateAddressNumber(form.lot, "Lot")
                    ? "border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Lot Number"
            />

            {errors.lot && (
              <p className={errorClass}>
                <AlertCircle size={12} />
                {errors.lot}
              </p>
            )}

            {!errors.lot &&
              form.lot &&
              !validateAddressNumber(form.lot, "Lot") && (
                <p className="mt-1 text-xs text-green-600">Valid lot number</p>
              )}
          </div>

          <div>
            <AppInput
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              name="familyMembers"
              value={form.familyMembers}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.familyMembers
                  ? "border-red-400 focus:ring-red-500"
                  : form.familyMembers &&
                      !validateFamilyMembers(form.familyMembers)
                    ? "border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Number of Family Members"
            />

            {errors.familyMembers && (
              <p className={errorClass}>
                <AlertCircle size={12} />
                {errors.familyMembers}
              </p>
            )}

            {!errors.familyMembers &&
              form.familyMembers &&
              !validateFamilyMembers(form.familyMembers) && (
                <p className="mt-1 text-xs text-green-600">
                  Valid number of family members
                </p>
              )}
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
              className={`w-full rounded-xl border px-4 py-2 pr-11 text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.password
                  ? "border-red-400 focus:ring-red-500"
                  : form.password && !validatePassword(form.password)
                    ? "border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Password"
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-5 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {errors.password && (
              <p className={errorClass}>
                <AlertCircle size={12} />
                {errors.password}
              </p>
            )}

            {!errors.password &&
              form.password &&
              !validatePassword(form.password) && (
                <p className="mt-1 text-xs text-green-600">Valid password</p>
              )}
          </div>

          <div className="relative">
            <AppInput
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 pr-11 text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.confirmPassword
                  ? "border-red-400 focus:ring-red-500"
                  : form.confirmPassword &&
                      !validateConfirmPassword(
                        form.confirmPassword,
                        form.password,
                      )
                    ? "border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Confirm Password"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-5 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {errors.confirmPassword && (
              <p className={errorClass}>
                <AlertCircle size={12} />
                {errors.confirmPassword}
              </p>
            )}

            {!errors.confirmPassword &&
              form.confirmPassword &&
              !validateConfirmPassword(form.confirmPassword, form.password) && (
                <p className="mt-1 text-xs text-green-600">Passwords match</p>
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
                  errors.picture
                    ? "border-red-400"
                    : form.picture
                      ? "border-green-500"
                      : "border-gray-300"
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

              {errors.picture && (
                <p className={errorClass}>
                  <AlertCircle size={12} />
                  {errors.picture}
                </p>
              )}

              {!errors.picture && form.picture && (
                <p className="mt-1 text-xs text-green-600">
                  Valid photo • {Math.round(form.picture.size / 1024)} KB
                </p>
              )}

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
                          setErrors((prev) => ({
                            ...prev,
                            picture: "Picture is required",
                          }));

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
                House Turnover Document (Optional)
              </label>

              <p className="min-h-8 text-xs text-gray-500">
                Optional — upload your house turnover document if available.
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
              className="btn w-full disabled:bg-gray-400 border-green-60 bg-green-700 hover:bg-green-800 text-white"
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
