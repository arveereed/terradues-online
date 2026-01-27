import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../assets/splashImage.png";
import AppButton from "../../components/AppButton";
import { Eye, EyeOff } from "lucide-react";
import AppInput from "../../components/AppInput";

export default function SignIn() {
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:py-10">
      {/* Center container */}
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center">
        {/* Logo */}
        <div className="flex w-full flex-col items-center">
          <img
            src={Icon}
            alt="TerraDues"
            className="h-28 w-28 object-contain"
          />

          <div className="mt-3 flex gap-1 text-2xl font-extrabold tracking-wide">
            <span className="text-green-700">TERRA</span>
            <span className="text-gray-900">DUES</span>
          </div>
        </div>

        {/* Card */}
        <div className="mt-8 slide-up w-full rounded-2xl bg-white sm:border sm:border-gray-100 sm:p-6 sm:shadow-sm">
          <h1 className="text-center text-xl font-bold text-gray-900">Login</h1>

          <form className="mt-6 space-y-4">
            {/* Email/Phone */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-600">
                Email or Phone Number
              </label>
              <AppInput
                type="text"
                placeholder="Enter your email or phone number"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-600">
                Password
              </label>

              <div className="relative">
                <AppInput
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:text-gray-700"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <Link to="/forgot-password" className="mt-2 flex justify-start">
                <button
                  type="button"
                  className="text-xs cursor-pointer font-semibold text-green-700 hover:underline"
                >
                  Forgot Password?
                </button>
              </Link>
            </div>

            {/* Login button */}
            <div className="pt-2 text-center">
              <AppButton
                label="Login"
                className="max-w-none w-full rounded-full py-3"
                type="submit"
              />
            </div>

            {/* Register */}
            <div className="pt-2 text-center text-sm text-gray-600">
              Don’t have an account?{" "}
              <Link
                to="/residency-type"
                className="font-bold text-green-700 hover:underline"
              >
                Register
              </Link>
            </div>
          </form>
        </div>

        {/* Small footer spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}
