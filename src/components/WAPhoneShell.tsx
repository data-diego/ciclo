import { type ReactNode, useState, useRef, useCallback, useEffect } from "react";
import { Android } from "./Android";
import {
  WAStatusBar,
  WAHeader,
  WAChatBody,
  WAInputBar,
  WAToast,
} from "./WhatsApp";

interface WAPhoneShellProps {
  headerName: string;
  headerSubtitle?: string;
  headerAvatar?: ReactNode;
  children: ReactNode;
  inputBar?: ReactNode;
  toast?: { message: string; visible: boolean };
}

// Shade covers roughly the top 40% of the phone screen area
const SHADE_FRACTION = 0.42;
const SNAP_THRESHOLD_FRACTION = 0.08;

export function WAPhoneShell({
  headerName,
  headerSubtitle,
  headerAvatar,
  children,
  inputBar,
  toast,
}: WAPhoneShellProps) {
  const [shadeY, setShadeY] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startShade = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Compute pixel values from the wrapper's actual rendered size
  const getShadeMax = useCallback(() => {
    if (!wrapperRef.current) return 300;
    return wrapperRef.current.offsetHeight * SHADE_FRACTION;
  }, []);

  const getSnapThreshold = useCallback(() => {
    if (!wrapperRef.current) return 50;
    return wrapperRef.current.offsetHeight * SNAP_THRESHOLD_FRACTION;
  }, []);

  const snapShade = useCallback(
    (currentY: number) => {
      const max = getShadeMax();
      const threshold = getSnapThreshold();
      setAnimating(true);
      if (!isOpen) {
        if (currentY > threshold) {
          setShadeY(max);
          setIsOpen(true);
        } else {
          setShadeY(0);
        }
      } else {
        if (currentY < max - threshold) {
          setShadeY(0);
          setIsOpen(false);
        } else {
          setShadeY(max);
        }
      }
      setTimeout(() => setAnimating(false), 300);
    },
    [isOpen, getShadeMax, getSnapThreshold],
  );

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const max = getShadeMax();
      const delta = e.clientY - startY.current;
      const newY = Math.max(0, Math.min(max, startShade.current + delta));
      setShadeY(newY);
    };

    const handleUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setShadeY((cur) => {
        queueMicrotask(() => snapShade(cur));
        return cur;
      });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [snapShade, getShadeMax]);

  const beginDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;
      startY.current = e.clientY;
      startShade.current = isOpen ? shadeY : 0;
    },
    [isOpen, shadeY],
  );

  return (
    <div className="flex items-center justify-center flex-1 min-h-0 px-2 py-2 md:px-6 md:py-6">
      {/* relative wrapper so shade overlay can be positioned over the SVG phone */}
      <div ref={wrapperRef} className="relative h-full">
        <Android className="drop-shadow-2xl">
          <div className="flex flex-col h-full bg-white text-g-900 relative">
            <WAStatusBar />
            <WAHeader
              name={headerName}
              subtitle={headerSubtitle}
              avatar={headerAvatar}
            />
            <WAChatBody>{children}</WAChatBody>
            {inputBar ?? <WAInputBar disabled placeholder="Type a message" />}
            {toast && (
              <WAToast message={toast.message} visible={toast.visible} />
            )}
          </div>
        </Android>

        {/* Drag zone — sits OUTSIDE the SVG, on top of the phone's top area */}
        {!isOpen && (
          <div
            onPointerDown={beginDrag}
            className="absolute z-10 cursor-grab active:cursor-grabbing bg-red-500/50"
            style={{
              top: "1.5%",
              left: "3%",
              right: "3%",
              height: "10%",
            }}
          />
        )}

        {/* Notification shade — also outside the SVG */}
        <div
          className="absolute overflow-hidden pointer-events-none bg-blue-500/50"
          style={{
            top: "1.5%",
            left: "3%",
            right: "3%",
            height: shadeY,
            borderRadius: "33px 33px 0 0",
            transition: animating
              ? "height 0.3s cubic-bezier(.2,.8,.3,1)"
              : "none",
            zIndex: 20,
          }}
        >
          <div
            className="w-full bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center gap-3 pointer-events-auto"
            style={{
              height: getShadeMax(),
              borderRadius: "33px 33px 0 0",
            }}
          >
            <img
              src="/logo.svg"
              alt="CICLO"
              className="w-40 opacity-90 invert"
              draggable={false}
            />
            <p className="text-white/40 text-xs tracking-wide">
              Hecho con cari&ntilde;o por Grupalia
            </p>
          </div>
          {/* Handle pill */}
          <div
            onPointerDown={beginDrag}
            className="absolute bottom-0 left-0 right-0 flex justify-center py-2 cursor-grab active:cursor-grabbing pointer-events-auto"
          >
            <div className="w-10 h-1.5 rounded-full bg-white/50" />
          </div>
        </div>

        {/* Full overlay when open — drag anywhere to close */}
        {isOpen && (
          <div
            onPointerDown={beginDrag}
            className="absolute inset-0 cursor-grab active:cursor-grabbing bg-green-500/30"
            style={{ zIndex: 15 }}
          />
        )}
      </div>
    </div>
  );
}
