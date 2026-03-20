import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-g-700 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2 text-sm
          bg-white border rounded-[--radius-component]
          text-g-900 placeholder:text-g-400
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500
          disabled:bg-g-100 disabled:text-g-400 disabled:cursor-not-allowed
          ${error ? "border-err-500" : "border-g-300"}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-err-600">{error}</p>
      )}
    </div>
  );
}
