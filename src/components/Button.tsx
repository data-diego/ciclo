import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "warning";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-g-200 disabled:text-g-400",
  secondary:
    "bg-white text-g-700 border border-g-300 hover:bg-g-50 active:bg-g-100 disabled:bg-g-100 disabled:text-g-400",
  ghost:
    "bg-transparent text-g-600 hover:bg-g-100 active:bg-g-200 disabled:text-g-400",
  danger:
    "bg-err-600 text-white hover:bg-err-700 active:bg-err-700 disabled:bg-g-200 disabled:text-g-400",
  success:
    "bg-ok-600 text-white hover:bg-ok-700 active:bg-ok-700 disabled:bg-g-200 disabled:text-g-400",
  warning:
    "bg-warn-600 text-white hover:bg-warn-700 active:bg-warn-700 disabled:bg-g-200 disabled:text-g-400",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-11 px-5 text-base",
  xl: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold rounded-[--radius-component]
        transition-colors duration-150
        disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
