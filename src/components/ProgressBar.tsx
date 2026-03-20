type ProgressVariant = "brand" | "success" | "error" | "warning";
type ProgressSize = "sm" | "md" | "lg";

interface ProgressBarProps {
  value: number; // 0-1
  variant?: ProgressVariant;
  size?: ProgressSize;
  className?: string;
}

const variantStyles: Record<ProgressVariant, string> = {
  brand: "bg-brand-600",
  success: "bg-ok-500",
  error: "bg-err-500",
  warning: "bg-warn-500",
};

const sizeStyles: Record<ProgressSize, string> = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export function ProgressBar({
  value,
  variant = "brand",
  size = "md",
  className = "",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div
      className={`
        w-full bg-g-200 rounded-[--radius-pill] overflow-hidden
        ${sizeStyles[size]}
        ${className}
      `}
    >
      <div
        className={`
          ${sizeStyles[size]} rounded-[--radius-pill]
          transition-all duration-300 ease-out
          ${variantStyles[variant]}
        `}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
