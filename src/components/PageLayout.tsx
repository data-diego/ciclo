import { useState, createContext, useContext, type ReactNode } from "react";

// --- Dark mode context ---

const DarkModeContext = createContext({
  dark: false,
  toggle: () => {},
});

export function useDarkMode() {
  return useContext(DarkModeContext);
}

// --- Sound context ---

const SoundContext = createContext({
  soundOn: true,
  toggleSound: () => {},
});

export function useSound() {
  return useContext(SoundContext);
}

// --- Page layout ---

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const [dark, setDark] = useState(() => localStorage.getItem("ciclo_dark") === "1");
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem("ciclo_sound") !== "0");

  const toggle = () => setDark((d) => {
    const next = !d;
    localStorage.setItem("ciclo_dark", next ? "1" : "0");
    return next;
  });

  const toggleSound = () => setSoundOn((s) => {
    const next = !s;
    localStorage.setItem("ciclo_sound", next ? "1" : "0");
    return next;
  });

  return (
    <DarkModeContext.Provider value={{ dark, toggle }}>
    <SoundContext.Provider value={{ soundOn, toggleSound }}>
      <div
        className={`h-dvh flex flex-col transition-colors duration-300 ${
          dark ? "bg-g-950" : "bg-g-50"
        } logo-bg ${dark ? "logo-bg-dark" : ""}`}
      >
        {/* Page content */}
        <div className="relative z-1 flex-1 min-h-0 flex">{children}</div>
      </div>
    </SoundContext.Provider>
    </DarkModeContext.Provider>
  );
}
