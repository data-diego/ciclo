import { useEffect, useRef } from "react";
import { useDarkMode } from "./PageLayout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

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
  const { dark } = useDarkMode();
  const totalBadge = apps.reduce((sum, a) => sum + (a.badge || 0), 0);

  return (
    <>
      {/* Desktop: inline icons */}
      <div className="hidden sm:flex items-center gap-3">
        {apps.map((app) => (
          <AppIconButton
            key={app.id}
            app={app}
            isBuzzing={buzzAppId === app.id}
          />
        ))}
      </div>

      {/* Mobile: hamburger dropdown */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
              dark ? "text-g-300 hover:bg-g-800" : "text-g-600 hover:bg-g-200"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            {totalBadge > 0 && (
              <div className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-white text-[9px] font-bold leading-none">
                  {totalBadge > 99 ? "99+" : totalBadge}
                </span>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" sideOffset={8}>
            {apps.map((app) => (
              <DropdownMenuItem
                key={app.id}
                onClick={app.onClick}
                className={`flex items-center gap-2.5 cursor-pointer ${
                  app.active ? "font-semibold" : ""
                }`}
              >
                <div className="w-6 h-6 rounded-md overflow-hidden shrink-0">
                  {app.icon}
                </div>
                <span>{app.label}</span>
                {app.badge != null && app.badge > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {app.badge > 99 ? "99+" : app.badge}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
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
        relative active:scale-90 transition-transform duration-150
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

      {/* Badge */}
      {app.badge != null && app.badge > 0 && (
        <div className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 flex items-center justify-center shadow-md z-10">
          <span className="text-white text-[9px] font-bold leading-none">
            {app.badge > 99 ? "99+" : app.badge}
          </span>
        </div>
      )}
    </button>
  );
}
