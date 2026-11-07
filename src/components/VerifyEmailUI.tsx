
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { AlertCircle, ArrowRight, MailCheck, X } from "lucide-react";

type VerifyUIType = {
  pendingVerification: boolean;
  isLoading: boolean;
  error: string | null;
  setError: (msg: string) => void;
  code: string;
  setCode: (code: string) => void;
  onVerifyPress: () => void;
};

const OTP_LENGTH = 6;

export default function VerifyEmailUI({
  pendingVerification,
  isLoading,
  error,
  setError,
  code,
  setCode,
  onVerifyPress,
}: VerifyUIType) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(
    Array(OTP_LENGTH).fill("")
  );

  useEffect(() => {
    const normalized = code
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    setDigits(
      Array.from(
        { length: OTP_LENGTH },
        (_, index) => normalized[index] || ""
      )
    );
  }, [code]);

  useEffect(() => {
    if (pendingVerification && !isLoading) {
      inputRefs.current[0]?.focus();
    }
  }, [pendingVerification]);

  if (!pendingVerification) return null;

  const updateDigits = (nextDigits: string[]) => {
    setDigits(nextDigits);
    setCode(nextDigits.join(""));
    if (error) setError("");
  };

  const handleChange = (value: string, index: number) => {
    const clean = value.replace(/\D/g, "");

    if (!clean && value) return;

    if (clean.length > 1) {
      const next = [...digits];

      clean
        .slice(0, OTP_LENGTH - index)
        .split("")
        .forEach((digit, offset) => {
          next[index + offset] = digit;
        });

      updateDigits(next);

      const nextIndex = Math.min(
        index + clean.length,
        OTP_LENGTH - 1
      );

      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean;
    updateDigits(next);

    if (clean && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (
      e.key === "ArrowRight" &&
      index < OTP_LENGTH - 1
    ) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }

    if (e.key === "Enter" && code.length === OTP_LENGTH) {
      e.preventDefault();
      if (!isLoading) onVerifyPress();
    }
  };

  const handlePaste = (
    e: ClipboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();

    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    const next = Array.from(
      { length: OTP_LENGTH },
      (_, index) => pasted[index] || ""
    );

    updateDigits(next);

    inputRefs.current[
      Math.min(pasted.length, OTP_LENGTH - 1)
    ]?.focus();
  };

  const isComplete =
    digits.every((digit) => /^\d$/.test(digit)) &&
    code.length === OTP_LENGTH;

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-[#F5F8F7] px-4 py-8 sm:px-6">
      <div className="w-full max-w-[440px] overflow-hidden rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_12px_45px_rgba(0,80,60,0.07)] sm:p-9">

        {/* Logo */}
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#009B72] text-sm font-extrabold text-white shadow-sm">
            TD
          </div>

          <div className="text-left leading-tight">
            <p className="text-[11px] font-semibold tracking-widest text-gray-400">
              TERRA
            </p>
            <p className="text-lg font-extrabold tracking-tight text-gray-900">
              DUES
            </p>
          </div>
        </div>

        {/* Icon */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#009B72]">
            <MailCheck size={31} strokeWidth={1.8} />
          </div>
        </div>

        {/* Heading */}
        <div className="mb-7 text-center">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            Verify your email
          </h1>

          <p className="mx-auto mt-2 max-w-[300px] text-sm leading-relaxed text-gray-500">
            Enter the 6-digit verification code sent to your
            email address to continue.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-700"
          >
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <p className="min-w-0 flex-1 break-words text-sm leading-relaxed">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded-md p-1 transition-colors hover:bg-red-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* OTP */}
        <div className="mb-6">
          <label className="mb-3 block text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
            Verification Code
          </label>

          <div
            className="grid grid-cols-6 gap-1.5 sm:gap-2.5"
            onPaste={handlePaste}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={
                  index === 0 ? "one-time-code" : "off"
                }
                maxLength={6}
                value={digit}
                disabled={isLoading}
                aria-label={`Verification digit ${index + 1}`}
                aria-invalid={Boolean(error)}
                onChange={(e) =>
                  handleChange(e.target.value, index)
                }
                onKeyDown={(e) =>
                  handleKeyDown(e, index)
                }
                className={`
                  aspect-square w-full min-w-0 rounded-xl border-2
                  bg-[#FAFCFB] text-center text-lg font-bold
                  text-gray-900 outline-none transition-all
                  sm:text-xl
                  disabled:cursor-not-allowed disabled:opacity-60
                  ${
                    error
                      ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                      : "border-gray-200 hover:border-emerald-300 focus:border-[#009B72] focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  }
                `}
              />
            ))}
          </div>

          <p className="mt-3 text-center text-xs text-gray-400">
            Enter the code exactly as shown in your email.
          </p>
        </div>

        {/* Verify button */}
        <button
          type="button"
          onClick={onVerifyPress}
          disabled={isLoading || !isComplete}
          className="
            flex min-h-12 w-full items-center justify-center
            gap-2 rounded-xl bg-[#009B72] px-5 py-3
            text-sm font-semibold text-white shadow-sm
            transition-all duration-200
            hover:bg-[#008563] hover:shadow-md
            active:scale-[0.99]
            focus-visible:outline-none
            focus-visible:ring-4 focus-visible:ring-emerald-200
            disabled:cursor-not-allowed
            disabled:bg-gray-300 disabled:shadow-none
          "
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Verifying...
            </>
          ) : (
            <>
              Verify Email
              <ArrowRight size={17} />
            </>
          )}
        </button>

        {/* Footer */}
        <p className="mt-7 text-center text-xs text-gray-400">
          Secure email verification
          <span className="mx-2 text-gray-300">•</span>
          TerraDues
        </p>
      </div>
    </div>
  );
}
