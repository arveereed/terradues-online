import { forwardRef, type InputHTMLAttributes } from "react";

type AppInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-semibold text-zinc-700">
            {label}
          </label>
        )}

        <input
          {...props}
          ref={ref}
          className={`
            h-11 w-full rounded-xl border px-4 py-2 text-sm
            focus:outline-none focus:ring-2
            ${
              error
                ? "border-red-400 focus:ring-red-500"
                : "border-gray-300 focus:ring-green-500"
            }
            ${className}
          `}
        />

        {error && (
          <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
        )}
      </div>
    );
  },
);

AppInput.displayName = "AppInput";

export default AppInput;
