import { useEffect, useRef } from "react";
import { useDarkMode } from "./PageLayout";

export interface AppIcon {
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
    <div className="flex items-center gap-3">
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

  useEffect(() => {
    if (isBuzzing && btnRef.current) {
      btnRef.current.classList.remove("animate-buzz");
      void btnRef.current.offsetWidth;
      btnRef.current.classList.add("animate-buzz");
    }
  }, [isBuzzing]);

  return (
    <button
      ref={btnRef}
      onClick={app.onClick}
      className={`
        relative pt-2 cursor-pointer active:scale-90 transition-transform duration-150
        ${isBuzzing ? "animate-buzz" : ""}
      `}
    >
      <div
        className={`
          w-9 h-9 rounded-[10px] overflow-hidden shadow-md
          transition-all duration-200
          ${app.active
            ? `ring-2 ring-offset-1 scale-105 ${dark ? "ring-offset-g-950" : "ring-offset-white"}`
            : "opacity-70 hover:opacity-100 hover:scale-105"}
        `}
        style={app.active ? { "--tw-ring-color": app.ringColor || "#7C3AED" } as React.CSSProperties : undefined}
      >
        {app.icon}
      </div>

      {app.badge != null && app.badge > 0 && (
        <div className="absolute top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 flex items-center justify-center shadow-md z-10">
          <span className="text-white text-[9px] font-bold leading-none">
            {app.badge > 99 ? "99+" : app.badge}
          </span>
        </div>
      )}
    </button>
  );
}
