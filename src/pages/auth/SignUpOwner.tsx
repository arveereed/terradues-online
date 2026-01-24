import { useSignUp } from "@clerk/clerk-react";
import { useRef, useState } from "react";
import type { UserDataSignUpType } from "../../types";
import Icon from "../../assets/splashImage.png";
import { AlertCircle, Eye, EyeOff, Image, XCircle } from "lucide-react";
import VerifyEmailUI from "../../components/VerifyEmailUI";
import { addUser } from "../../features/auth/services/auth.service";
import { useNavigate } from "react-router-dom";

interface FormData {
  firstName: string;
  middleName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  gender: string;
  phase: string;
  block: string;
  lot: string;
  familyMembers: string;
  occupied: boolean;
  forRent: boolean;
  password: string;
  confirmPassword: string;
  picture: string | ArrayBuffer | null;
  document: File | null;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

export default function SignUp() {
  const [errors, setErrors] = useState<FormErrors>({});

  const [form, setForm] = useState<FormData>({
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
    occupied: false,
    forRent: false,
    password: "",
    confirmPassword: "",
    picture: null,
    document: null, // todo: make document upload to cloudinary
  });
  const [imagePreview, setImagePreview] = useState<
    string | ArrayBuffer | null | undefined
  >(null);
  const pictureInputRef = useRef<HTMLInputElement | null>(null);
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

    if (!form.familyMembers.trim()) {
      errors.familyMembers = "Family members is required";
    }

    // Boolean fields
    if (!form.occupied && !form.forRent) {
      errors.occupied = "Occupancy Type is required";
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

    if (!form.picture) {
      errors.picture = "Picture is required";
    }

    // todo: it should not be empty
    /* 
    if (!form.document) {
      errors.document = "Document is required";
    } */

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submission of sign-up form
  const onSignUpPress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoaded) return;
    setIsLoading(true);

    if (!validateForm()) return;
    console.log("validation passed");

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

        const userData: UserDataSignUpType = {
          email: signUpAttempt.emailAddress as string,
          firstName: form.firstName,
          lastName: form.lastName,
          middleName: form.middleName,
          contactNumber: form.contactNumber,
          gender: form.gender,
          phase: form.phase,
          block: form.block,
          lot: form.lot,
          familyMembers: form.familyMembers,
          occupied: form.occupied,
          forRent: form.forRent,
          picture: form.picture,
          document: form.document, // temporary
        };
        const id = await addUser(userData);
        console.log("User saved, doc id:", id);

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

  const handleImageChange = async (e: any) => {
    const file = e.target.files[0];
    const imageUrl = await readFileAsDataURL(file);
    setForm((prev) => ({
      ...prev,
      picture: imageUrl,
    }));

    if (file) {
      readFileAsDataURL(file).then(setImagePreview);
    } else {
      setImagePreview(null);
    }
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
        {/* Logo + Image Section */}
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
            <input
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
            <input
              name="middleName"
              value={form.middleName}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Middle Name (optional)"
            />
          </div>

          {/* Last Name */}
          <div className="md:col-span-2">
            <input
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
            <input
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
            <input
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
            <input
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
            <input
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
            <input
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

          {/* Family Members */}
          <div>
            <input
              name="familyMembers"
              value={form.familyMembers}
              onChange={handleChange}
              className={`w-full rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.familyMembers
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300 focus:ring-green-500"
              }`}
              placeholder="Number of Family Members"
            />
            {errors.familyMembers && (
              <p className={errorClass}>{errors.familyMembers}</p>
            )}
          </div>

          {/* Occupancy */}
          <div className="md:col-span-2 flex flex-wrap gap-4 text-sm text-gray-700">
            <span className="font-medium">Occupancy Type:</span>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                name="occupied"
                checked={form.occupied}
                onChange={handleChange}
              />
              Occupied
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                name="forRent"
                checked={form.forRent}
                onChange={handleChange}
              />
              For Rent
            </label>
          </div>
          {errors.occupied && (
            <p className="md:col-span-2 text-xs text-red-500">
              Please select occupancy type
            </p>
          )}

          {/* Password */}
          <div className="relative">
            <input
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {errors.password && <p className={errorClass}>{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {errors.confirmPassword && (
              <p className={errorClass}>{errors.confirmPassword}</p>
            )}
          </div>

          {/* Uploads */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                  errors.picture ? "border-red-400" : "border-gray-300"
                }`}
              >
                <span className="flex items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <Image size={16} />
                </span>

                <span className="flex-1">Upload Your Photo</span>

                <input
                  type="file"
                  ref={pictureInputRef}
                  hidden
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

                          // ✅ IMPORTANT: reset file input so selecting the same file triggers onChange
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
              <label
                className={`flex items-center justify-between rounded-xl border px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                  errors.document ? "border-red-400" : "border-gray-300"
                }`}
              >
                House Turnover Document
                <input type="file" hidden />
              </label>
              {errors.document && (
                <p className={errorClass}>{errors.document}</p>
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

          {/* Submit */}
          <div className="md:col-span-2 mt-4">
            <button
              disabled={notAgree}
              className={`w-full cursor-pointer disabled:cursor-default disabled:bg-gray-400 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold`}
            >
              Register
            </button>
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
          </div>

          {/* Clerk's CAPTCHA widget */}
          <div
            id="clerk-captcha"
            data-cl-theme="dark"
            data-cl-size="flexible"
            data-cl-language="es-ES"
          />
        </form>
      </div>
    </div>
  );
}
