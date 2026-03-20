import { useEffect, useRef } from "react";
import { useDarkMode } from "./PageLayout";

interface AppIcon {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  active: boolean;
  ringColor?: string;
  onClick: () => void;
}

interface AppDockProps {
  apps: AppIcon[];
  buzzAppId?: string | null;
}

export function AppDock({ apps, buzzAppId }: AppDockProps) {
  return (
    <div className="flex flex-col items-center gap-7 pt-6 pr-4">
      {apps.map((app) => (
        <AppIconButton
          key={app.id}
          app={app}
          isBuzzing={buzzAppId === app.id}
        />
      ))}
    </div>
  );
}

function AppIconButton({
  app,
  isBuzzing,
}: {
  app: AppIcon;
  isBuzzing: boolean;
}) {
  const { dark } = useDarkMode();
  const btnRef = useRef<HTMLButtonElement>(null);

  // Re-trigger buzz animation
  useEffect(() => {
    if (isBuzzing && btnRef.current) {
      btnRef.current.classList.remove("animate-buzz");
      void btnRef.current.offsetWidth; // force reflow
      btnRef.current.classList.add("animate-buzz");
    }
  }, [isBuzzing]);

  return (
    <button
      ref={btnRef}
      onClick={app.onClick}
      className={`
        flex flex-col items-center gap-2 relative
        active:scale-90 transition-transform duration-150
        ${isBuzzing ? "animate-buzz" : ""}
      `}
    >
      {/* Icon */}
      <div
        className={`
          w-14 h-14 rounded-[16px] overflow-hidden shadow-lg relative
          transition-all duration-200
          ${app.active
            ? `ring-2 ring-offset-2 scale-110 ${dark ? "ring-offset-g-950" : "ring-offset-white"}`
            : "opacity-80 hover:opacity-100 hover:scale-105"}
        `}
        style={app.active ? { "--tw-ring-color": app.ringColor || "#7C3AED" } as React.CSSProperties : undefined}
      >
        {app.icon}
      </div>

      {/* Badge */}
      {app.badge != null && app.badge > 0 && (
        <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 flex items-center justify-center shadow-md z-10">
          <span className="text-white text-[10px] font-bold leading-none">
            {app.badge > 99 ? "99+" : app.badge}
          </span>
        </div>
      )}

      {/* Label */}
      <span
        className={`
          text-[11px] font-medium transition-colors
          ${app.active
            ? dark ? "text-g-100" : "text-g-900"
            : dark ? "text-g-400" : "text-g-500"}
        `}
      >
        {app.label}
      </span>
    </button>
  );
}
