import type React from "react";
import type { ButtonHTMLAttributes } from "react";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string | React.ReactNode;
  fullWidth?: boolean;
};

export default function AppButton({
  label,
  fullWidth = true,
  className = "",
  ...props
}: AppButtonProps) {
  return (
    <button
      {...props}
      className={`
        ${fullWidth ? "w-full max-w-xs" : ""}
        bg-green-700 hover:bg-green-800
        cursor-pointer
        text-white py-3 rounded-full
        text-lg font-semibold
        transition transform hover:scale-[1.02]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {label}
    </button>
  );
}
