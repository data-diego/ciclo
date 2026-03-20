import type { ReactNode } from "react";

interface HeaderProps {
  children: ReactNode;
  className?: string;
}

// Grupalia-brand header (purple gradient)
export function AppHeader({ children, className = "" }: HeaderProps) {
  return (
    <header
      className={`
        bg-gradient-to-r from-brand-700 to-brand-600
        text-white px-4 py-3
        ${className}
      `}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {children}
      </div>
    </header>
  );
}

// WhatsApp-style header (teal)
export function ChatHeader({ children, className = "" }: HeaderProps) {
  return (
    <header
      className={`
        bg-wa-teal-dark text-white px-4 py-3
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        {children}
      </div>
    </header>
  );
}
