import { useRef, useState } from "react";
import { XCircle, AlertCircle } from "lucide-react";

type VerifyUIType = {
  pendingVerification: boolean;
  isLoading: boolean;
  error: string | null;
  setError: (msg: string) => void;
  code: string;
  setCode: (code: string) => void;
  onVerifyPress: () => void;
};

export default function VerifyEmailUI({
  pendingVerification,
  isLoading,
  error,
  setError,
  code,
  setCode,
  onVerifyPress,
}: VerifyUIType) {
  if (!pendingVerification) return null;

  const inputRefs = Array.from({ length: 6 }, () =>
    useRef<HTMLInputElement>(null),
  );
  const [digits, setDigits] = useState(Array(6).fill(""));

  // Handle typing per box
  const handleChange = (value: string, index: number) => {
    if (!/^[0-9]?$/.test(value)) return; // Only digits

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Update final code
    setCode(newDigits.join(""));

    // Move to next box
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  // Handle backspace to go to previous box
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          Verify your email
        </h1>

        {error && (
          <div className="flex items-center justify-between bg-red-500 text-white p-3 rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
            <button onClick={() => setError("")}>
              <XCircle size={20} />
            </button>
          </div>
        )}

        {/* 6-digit Telegram-style code boxes */}
        <div className="flex justify-between gap-2 mb-6">
          {digits.map((digit, index) => (
            <input
              key={index}
              type="text"
              maxLength={1}
              value={digit}
              ref={inputRefs[index]}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`w-12 h-14 text-center text-xl font-semibold rounded-lg border 
                ${error ? "border-red-500" : "border-gray-300"} 
                focus:outline-none focus:ring-2 focus:ring-blue-600`}
            />
          ))}
        </div>

        <div className="flex justify-center mt-4">
          <button
            onClick={onVerifyPress}
            disabled={isLoading || code.length !== 6}
            className="bg-green-700 slide-up delay-1 disabled:cursor-default text-white hover:bg-green-800 shadow-sm hover:shadow-md  px-8 py-3 cursor-pointer font-medium rounded-lg  disabled:bg-neutral-400"
          >
            {isLoading ? "Verifying..." : "Verify"}
          </button>
        </div>
      </div>
    </div>
  );
}
