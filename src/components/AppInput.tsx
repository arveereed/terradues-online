import { forwardRef, type InputHTMLAttributes } from "react";

type AppInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <input
        {...props}
        ref={ref}
        className={`
          w-full rounded-xl h-11 border px-4 py-2 text-sm
          focus:outline-none focus:ring-2
          ${
            error
              ? "border-red-400 focus:ring-red-500"
              : "border-gray-300 focus:ring-green-500"
          }
          ${className}
        `}
      />
    );
  },
);

AppInput.displayName = "AppInput";

export default AppInput;
