import { type SVGProps, type ReactNode, useState, useRef, useCallback, useEffect, useSyncExternalStore } from "react";

export interface AndroidProps extends SVGProps<SVGSVGElement> {
  /** Only used for the viewBox aspect ratio — the SVG scales to fit its container */
  width?: number;
  height?: number;
  src?: string;
  videoSrc?: string;
  children?: ReactNode;
}

const SHADE_FRACTION = 0.68;
const SNAP_THRESHOLD_PX = 40;
const MOBILE_BREAKPOINT = 768;

function getIsMobile() {
  return typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
}

function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("resize", cb);
      return () => window.removeEventListener("resize", cb);
    },
    getIsMobile,
    () => false,
  );
}

export function Android({
  width = 433,
  height = 882,
  src,
  videoSrc,
  children,
  ...props
}: AndroidProps) {
  const isMobile = useIsMobile();
  const [shadeY, setShadeY] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startShade = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const getShadeMax = useCallback(() => {
    if (!wrapperRef.current) return 300;
    return wrapperRef.current.offsetHeight * SHADE_FRACTION;
  }, []);

  const snapShade = useCallback(
    (currentY: number) => {
      const max = getShadeMax();
      setAnimating(true);
      if (!isOpen) {
        if (currentY > SNAP_THRESHOLD_PX) {
          setShadeY(max);
          setIsOpen(true);
        } else {
          setShadeY(0);
        }
      } else {
        if (currentY < max - SNAP_THRESHOLD_PX) {
          setShadeY(0);
          setIsOpen(false);
        } else {
          setShadeY(max);
        }
      }
      setTimeout(() => setAnimating(false), 300);
    },
    [isOpen, getShadeMax],
  );

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const max = getShadeMax();
      const delta = e.clientY - startY.current;
      setShadeY(Math.max(0, Math.min(max, startShade.current + delta)));
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

  // On mobile, skip the phone frame — foreignObject in SVG breaks on Chrome iOS (WebKit)
  if (isMobile) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-wa-teal-dark">
        {children}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative h-full w-fit max-w-full">
      <svg
        viewBox="0 0 380 830"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        className={`h-full w-auto max-w-full ${props.className ?? ""}`}
      >
        <path
          d="M376 153H378C379.105 153 380 153.895 380 155V249C380 250.105 379.105 251 378 251H376V153Z"
          fill="#1C1C1E" className="dark:fill-[#0D0D0D]"
        />
        <path
          d="M376 301H378C379.105 301 380 301.895 380 303V351C380 352.105 379.105 353 378 353H376V301Z"
          fill="#1C1C1E" className="dark:fill-[#0D0D0D]"
        />
        <path
          d="M0 42C0 18.8041 18.804 0 42 0H336C359.196 0 378 18.804 378 42V788C378 811.196 359.196 830 336 830H42C18.804 830 0 811.196 0 788V42Z"
          fill="#1C1C1E" className="dark:fill-[#0D0D0D]"
        />
        <path
          d="M2 43C2 22.0132 19.0132 5 40 5H338C358.987 5 376 22.0132 376 43V787C376 807.987 358.987 825 338 825H40C19.0132 825 2 807.987 2 787V43Z"
          fill="#2C2C2E"
          className="dark:fill-[#1A1A1A]"
        />

        <g clipPath="url(#androidClip)">
          <path
            d="M9.25 48C9.25 29.3604 24.3604 14.25 43 14.25H335C353.64 14.25 368.75 29.3604 368.75 48V780C368.75 798.64 353.64 813.75 335 813.75H43C24.3604 813.75 9.25 798.64 9.25 780V48Z"
            fill="white" className="dark:fill-[#262626]"
          />
        </g>
        <circle
          cx="189"
          cy="28"
          r="9"
          fill="#2C2C2E" className="dark:fill-[#1A1A1A]"
        />
        <circle
          cx="189"
          cy="28"
          r="4"
          fill="#0D0D0D" className="dark:fill-[#000]"
        />
        {src && (
          <image
            href={src}
            width="360"
            height="800"
            className="size-full object-cover"
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#androidClip)"
          />
        )}
        {videoSrc && (
          <foreignObject
            width="380"
            height="820"
            clipPath="url(#androidClip)"
            preserveAspectRatio="xMidYMid slice"
          >
            <video
              className="size-full object-cover"
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
            />
          </foreignObject>
        )}
        {children && (
          <foreignObject
            x="9"
            y="14"
            width="360"
            height="800"
            clipPath="url(#androidClip)"
          >
            <div className="h-full w-full overflow-hidden bg-wa-teal-dark">
              {children}
            </div>
          </foreignObject>
        )}
        <defs>
          <clipPath id="androidClip">
            <rect
              width="360"
              height="800"
              rx="33"
              ry="25"
              className="fill-white dark:fill-[#262626]"
              transform="translate(9 14)"
            />
          </clipPath>
        </defs>
      </svg>

      {/* Drag zone at top of phone (notch area only — must not cover header buttons) */}
      {!isOpen && (
        <div
          onPointerDown={beginDrag}
          className="absolute cursor-grab active:cursor-grabbing touch-none"
          style={{
            top: "0.5%",
            left: "30%",
            right: "30%",
            height: "4.5%",
            zIndex: 30,
          }}
        />
      )}

      {/* Notification shade */}
      <div
        className="absolute overflow-hidden"
        style={{
          top: "0.5%",
          left: "2%",
          right: "2%",
          height: shadeY,
          borderRadius: "33px 33px 20px 20px",
          zIndex: 40,
          transition: animating
            ? "height 0.3s cubic-bezier(.2,.8,.3,1)"
            : "none",
        }}
      >
        <div
          className="w-full bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-3"
          style={{
            height: getShadeMax(),
            borderRadius: "33px 33px 20px 20px",
          }}
        >
          <img
            src="/orinoco.webp"
            alt="Orinoco"
            className="w-52 rounded-xl"
            draggable={false}
          />
          <p className="text-white/40 text-xs tracking-wide">
            Bonus
          </p>
        </div>
        <div
          onPointerDown={beginDrag}
          className="absolute bottom-0 left-0 right-0 flex justify-center py-2 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-10 h-1.5 rounded-full bg-white/50" />
        </div>
      </div>

      {/* Full overlay when open */}
      {isOpen && (
        <div
          onPointerDown={beginDrag}
          className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
          style={{ zIndex: 35 }}
        />
      )}
    </div>
  );
}
