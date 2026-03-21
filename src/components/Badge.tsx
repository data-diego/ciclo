import type { ReactNode } from "react";

type BadgeVariant = "brand" | "success" | "error" | "warning" | "neutral" | "presidenta";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  brand: "bg-brand-100 text-brand-700 border border-brand-700",
  success: "bg-ok-100 text-ok-700 border border-ok-700",
  error: "bg-err-100 text-err-700 border border-err-700",
  warning: "bg-warn-100 text-warn-700 border border-warn-700",
  neutral: "bg-g-100 text-g-600 border border-g-600",
  presidenta: "bg-brand-100 text-brand-800 border border-brand-800",
};

export function Badge({ variant = "neutral", className = "", children }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center
        px-4 py-0.5 text-xs font-semibold
        rounded-full
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
