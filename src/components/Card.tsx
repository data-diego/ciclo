import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "default" | "brand" | "success" | "error" | "warning" | "presidenta";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padded?: boolean;
  children: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-white border-g-200",
  brand: "bg-brand-50 border-brand-200",
  success: "bg-ok-50 border-ok-500/30",
  error: "bg-err-50 border-err-500/30",
  warning: "bg-warn-50 border-warn-500/30",
  presidenta: "bg-brand-50 border-brand-400/40",
};

export function Card({
  variant = "default",
  padded = true,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-[--radius-card] border
        ${padded ? "p-5" : ""}
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
