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

// --- Header center slot context ---

const HeaderCenterContext = createContext({
  headerCenter: null as ReactNode,
  setHeaderCenter: (_node: ReactNode) => {},
});

export function useHeaderCenter() {
  return useContext(HeaderCenterContext);
}

// --- Exit confirmation modal ---

function ExitModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full">
        <h3 className="text-lg font-semibold text-g-900 mb-2">
          Salir del juego
        </h3>
        <p className="text-sm text-g-500 mb-6">
          Estas seguro que quieres salir? Perderas tu progreso en esta partida.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-g-300 text-sm font-medium text-g-700 hover:bg-g-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-lg bg-err-600 text-white text-sm font-medium hover:bg-err-700 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Page layout ---

interface PageLayoutProps {
  children: ReactNode;
  showExit?: boolean;
  onExit?: () => void;
}

export function PageLayout({ children, showExit, onExit }: PageLayoutProps) {
  const [dark, setDark] = useState(() => localStorage.getItem("ciclo_dark") === "1");
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem("ciclo_sound") !== "0");
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [headerCenter, setHeaderCenter] = useState<ReactNode>(null);

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

  const handleExitConfirm = () => {
    setExitModalOpen(false);
    onExit?.();
  };

  return (
    <DarkModeContext.Provider value={{ dark, toggle }}>
    <SoundContext.Provider value={{ soundOn, toggleSound }}>
    <HeaderCenterContext.Provider value={{ headerCenter, setHeaderCenter }}>
      <div
        className={`h-dvh flex flex-col transition-colors duration-300 ${
          dark ? "bg-g-950" : "bg-g-50"
        } logo-bg ${dark ? "logo-bg-dark" : ""}`}
      >
        {/* Header bar */}
        <header className="relative z-10 flex items-center justify-between px-4 py-3">
          {/* Left: logo/title */}
          <div className="flex items-center gap-2">
            <img src="/ciclogo.png" alt="Ciclo" className="h-7" />
          </div>

          {/* Center: slot for app dock etc */}
          {headerCenter && (
            <div className="flex items-center">{headerCenter}</div>
          )}

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className={`p-2 rounded-lg transition-colors ${
                dark
                  ? "text-g-400 hover:bg-g-800"
                  : "text-g-400 hover:bg-g-200"
              }`}
              title={dark ? "Modo claro" : "Modo oscuro"}
            >
              {dark ? (
                // Sun icon
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                // Moon icon
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Sound toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg transition-colors ${
                dark
                  ? "text-g-400 hover:bg-g-800"
                  : "text-g-400 hover:bg-g-200"
              }`}
              title={soundOn ? "Silenciar" : "Activar sonido"}
            >
              {soundOn ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </button>

            {/* Exit button */}
            {showExit && (
              <button
                onClick={() => setExitModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dark
                    ? "text-err-500 hover:bg-g-800"
                    : "text-err-600 hover:bg-err-50"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Salir
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="relative z-1 flex-1 min-h-0">{children}</div>
      </div>

      <ExitModal
        open={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        onConfirm={handleExitConfirm}
      />
    </HeaderCenterContext.Provider>
    </SoundContext.Provider>
    </DarkModeContext.Provider>
  );
}
