// src/pages/ForgotPassword.tsx
import React, { useState, useEffect } from "react";
import { useSignIn, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import AppInput from "../../components/AppInput";

export default function ForgotPassword() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<"request" | "reset">("request");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isSignedIn) navigate("/");
  }, [isSignedIn, navigate]);

  if (!isLoaded) return null;

  async function sendResetCode(e?: React.FormEvent) {
    e?.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await signIn!.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setStage("reset");
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.message ||
        "Failed to send reset code";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitNewPassword(e?: React.FormEvent) {
    e?.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn!.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      if (!result) throw new Error("No result from Clerk");

      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        navigate("/");
      } else if (result.status === "needs_second_factor") {
        setError("2FA required but not handled in this example.");
      } else {
        setError(`Unexpected status: ${result.status}`);
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.message ||
        "Failed to reset password";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative bg-gray-50">
      {/* 🔙 Back to Sign In */}
      <button
        onClick={() => navigate("/sign-in")}
        className="absolute cursor-pointer top-6 left-6 flex items-center gap-2 text-gray-700 hover:text-gray-900 transition"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
        <h1 className="text-2xl font-extrabold mb-2 text-center text-gray-900">
          Forgot Password
        </h1>
        <p className="text-center text-sm text-gray-600 mb-6">
          Reset your password to access your TerraDues account.
        </p>

        {stage === "request" && (
          <form onSubmit={sendResetCode} className="space-y-5">
            <div>
              <label className="text-xs font-medium text-gray-600">Email</label>
              <AppInput
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-full bg-green-600 py-3 text-sm font-semibold text-white transition hover:bg-green-700
                disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isSubmitting ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        )}

        {stage === "reset" && (
          <form onSubmit={submitNewPassword} className="space-y-5">
            <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-gray-700">
              We sent a reset code to{" "}
              <span className="font-semibold text-gray-900">{email}</span>.
              Enter it along with your new password.
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">
                Reset Code
              </label>
              <AppInput
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="Enter the code"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">
                New Password
              </label>

              <div className="relative mt-2">
                <AppInput
                  value={password}
                  type={showPassword ? "text" : "password"}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex slide-up items-center gap-3">
              <button
                disabled={isSubmitting}
                className="w-full cursor-pointer rounded-full bg-green-700 py-3 text-sm font-semibold text-white transition hover:bg-green-800
                  disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isSubmitting ? "Resetting…" : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => setStage("request")}
                className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
