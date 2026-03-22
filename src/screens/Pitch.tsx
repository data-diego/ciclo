import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Video,
  Store, CreditCard, CalendarClock, Dices, Target, Heart,
  Smartphone, Database, Server, Zap, Trophy,
} from "lucide-react";
import { Badge } from "../components/Badge";

/* ─── helpers ─── */

function Stagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`stagger-in ${className}`}>{children}</div>;
}

function IconRow({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-start gap-3 md:gap-4">
      <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 md:w-5 md:h-5" />
      </div>
      <p className="text-base md:text-lg text-g-700 leading-snug pt-1 md:pt-1.5">{text}</p>
    </div>
  );
}

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

/* ─── slide data ─── */
const slides: ReactNode[] = [
  // 0 — Title
  (
    <div className="flex flex-col items-center text-center gap-6 md:gap-10">
      <Stagger className="flex flex-col items-center gap-4 md:gap-6">
        <div className="relative">
          <img src="/ciclo.svg" alt="Ciclo" className="h-14 md:h-20" />
          <div className="absolute -top-2 -right-16 md:-right-20 flex items-center gap-1 md:gap-1.5">
            <span className="text-g-600 text-xs md:text-sm">by</span>
            <img src="/logo.svg" alt="Grupalia" className="h-4 md:h-5" />
          </div>
        </div>
        <p className="text-2xl md:text-4xl font-light text-g-800 leading-snug mt-4">
          Vive el crédito grupal
        </p>
      </Stagger>
    </div>
  ),

  // 1 — Contexto (Zoom meeting)
  (
    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 max-w-5xl mx-auto px-4">
      <div className="w-full max-w-[280px] md:max-w-none md:w-[420px] shrink-0 rounded-2xl overflow-hidden shadow-lg border border-g-200">
        <img src="/ss.png" alt="Monthly meeting" className="w-full h-auto" />
      </div>
      <Stagger className="flex flex-col gap-4 md:gap-6 flex-1">
        <Badge variant="neutral" className="!text-xs md:!text-sm !px-3 md:!px-4 !py-1 md:!py-1.5 self-start">
          <Video size={14} className="mr-1.5" /> Contexto
        </Badge>
        <p className="text-2xl md:text-3xl font-light text-g-800 leading-snug">
          Termina la monthly.
          <br />
          <span className="text-g-400">Todos cierran Meet.</span>
        </p>
        <p className="text-lg md:text-xl font-medium text-brand-600">
          ¿Y si antes de irnos, jugamos?
        </p>
      </Stagger>
    </div>
  ),

  // 2 — El problema
  (
    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 max-w-4xl mx-auto px-4">
      <div className="w-48 h-64 md:w-72 md:h-96 rounded-2xl overflow-hidden shrink-0">
        <img
          src="https://grupalia.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsubhero-3.3b7c97c4.avif&w=384&q=75"
          alt="" className="w-full h-full object-cover brightness-75"
        />
      </div>
      <Stagger className="flex flex-col gap-4 md:gap-6 flex-1">
        <Badge variant="brand" className="!text-xs md:!text-sm !px-3 md:!px-4 !py-1 md:!py-1.5 self-start">Propuesta</Badge>
        <blockquote className="text-xl md:text-3xl font-light text-g-800 leading-snug border-l-4 border-brand-500 pl-4 md:pl-6">
          "Todos construimos el producto,
          <br />
          pero <span className="text-brand-600 font-medium">nadie ha sentido</span> lo que es
          <br />
          estar del otro lado."
        </blockquote>
        <p className="text-base md:text-lg text-g-600 leading-relaxed max-w-md">
          Nunca hemos vivido la presión de un pago semanal,
          la frustración de cubrir a alguien más,
          o la soledad de ser la que cobra.
        </p>
      </Stagger>
    </div>
  ),

  // 3 — La solución
  (
    <div className="flex flex-col items-center text-center gap-6 md:gap-8 max-w-3xl mx-auto px-4">
      <Stagger className="flex flex-col items-center gap-4 md:gap-6">
        <div className="relative">
          <img src="/ciclo.svg" alt="Ciclo" className="h-10 md:h-14" />
          <div className="absolute -top-2 -right-16 md:-right-20 flex items-center gap-1 md:gap-1.5">
            <span className="text-g-600 text-xs md:text-sm">by</span>
            <img src="/logo.svg" alt="Grupalia" className="h-4 md:h-5" />
          </div>
        </div>
        <p className="text-2xl md:text-4xl font-light text-g-800 leading-snug">
          Un juego multijugador donde
          <br />
          <span className="text-brand-600 font-medium">tú eres la clienta</span>
        </p>
        <p className="text-base md:text-lg text-g-500 max-w-lg leading-relaxed">
          Escoge tu negocito, pide tu crédito y sobrevive el ciclo
          de pagos semanales junto a tu grupo.
        </p>
      </Stagger>
    </div>
  ),

  // 4 — Cómo se juega
  (
    <div className="flex flex-col items-center max-w-3xl mx-auto px-4">
      <Stagger className="flex flex-col gap-3 md:gap-5 w-full">
        <Badge variant="brand" className="!text-xs md:!text-sm !px-3 md:!px-4 !py-1 md:!py-1.5 self-start mb-1 md:mb-2">Cómo se juega</Badge>
        <IconRow icon={Store} text="Elige tu negocio y el tamaño de tu crédito" />
        <IconRow icon={CreditCard} text="Cada semana decides: ¿pago completo, parcial, o nada?" />
        <IconRow icon={CalendarClock} text="Eventos de negocio cambian tus ingresos semana a semana" />
        <IconRow icon={Dices} text="Eventos aleatorios: buena racha, gastos inesperados, cliente grande..." />
        <IconRow icon={Target} text="Objetivo secreto: una misión oculta que solo tú conoces" />
        <IconRow icon={Heart} text="Solidario: ayudar a tu grupo da puntos" />
        <IconRow icon={Trophy} text="Gana quien más puntos acumule al final del ciclo" />
      </Stagger>
    </div>
  ),

  // 6 — Puntos
  (
    <div className="flex flex-col items-center max-w-3xl mx-auto px-4">
      <Stagger className="flex flex-col gap-3 md:gap-5 w-full">
        <Badge variant="brand" className="!text-xs md:!text-sm !px-3 md:!px-4 !py-1 md:!py-1.5 self-start mb-1 md:mb-2">Sistema de puntos</Badge>
        <IconRow icon={CreditCard} text="Pago completo: +100 pts · Pago parcial: +20 pts" />
        <IconRow icon={Heart} text="Enviar solidario: +20 a +30 pts" />
        <IconRow icon={Trophy} text="Que tu grupo pase la semana: +40 a +60 pts" />
        <IconRow icon={Target} text="Cumplir tu objetivo secreto: bonus al final" />
        <IconRow icon={Dices} text="Eventos de negocio: +25 pts si inviertes bien" />
        <p className="text-sm text-g-400 mt-2">
          Pagar te conviene, pero ayudar a tu grupo te conviene más
        </p>
      </Stagger>
    </div>
  ),

  // 6 — Lo hacker
  (
    <div className="flex flex-col items-center max-w-3xl mx-auto px-4">
      <Stagger className="flex flex-col gap-3 md:gap-5 w-full">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="brand" className="!text-xs md:!text-sm !px-3 md:!px-4 !py-1 md:!py-1.5">Lo hacker</Badge>
          <img src="/matrixparrot.gif" alt="" className="h-8" />
        </div>
        <IconRow icon={Database} text="SpacetimeDB v2: 10 tablas sincronizadas en tiempo real" />
        <IconRow icon={Server} text="Motor de juego server-side: eventos, scoring y objetivos determinísticos" />
        <IconRow icon={WhatsAppIcon} text="Clon funcional de WhatsApp: chat en tiempo real, stickers, bot presidenta" />
        <IconRow icon={Zap} text="Notificaciones en tiempo real con sonido" />
        <IconRow icon={Dices} text="Simulación Montecarlo para afinar scoring con distintos tamaños de grupo y reglas" />
        <IconRow icon={Smartphone} text="Fully responsive con UI/UX pulido: apps de WhatsApp y Grupalia pixel-perfect" />
      </Stagger>
    </div>
  ),

  // 7 — Vamos a probarlo
  (
    <div className="flex flex-col items-center text-center gap-8">
      <Stagger className="flex flex-col items-center gap-6">
        <p className="text-lg md:text-xl text-g-400">
          ciclo.datadiego.com
        </p>
        <p className="text-3xl md:text-5xl font-light text-g-900 tracking-tight">
          ¡Vamos a probarlo!
        </p>
        <a
          href="/"
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 rounded-xl bg-brand-600 text-white text-base md:text-lg font-medium
            hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
        >
          Ir al juego
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="13" y1="11" x2="21" y2="3" />
          </svg>
        </a>
      </Stagger>
    </div>
  ),
];


/* ─── Pitch component ─── */
export function Pitch() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const total = slides.length;

  const go = useCallback(
    (dir: 1 | -1) => {
      const next = current + dir;
      if (next < 0 || next >= total) return;
      setDirection(dir);
      setCurrent(next);
    },
    [current, total]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        go(1);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        go(-1);
      }
      if (e.key === "Escape") {
        window.location.href = "/";
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go]);

  return (
    <div
      className="bg-g-50 text-g-900"
      style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 9999 }}
    >
      {/* Logo tile pattern bg */}
      <div
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: "url('/logo-tile.svg')", backgroundSize: "250px auto", backgroundRepeat: "repeat",
          opacity: 0.04, transform: "rotate(-30deg)", transformOrigin: "center center",
          top: "-50%", left: "-50%", width: "200%", height: "200%",
        }}
      />

      {/* Slide content */}
      <div
        key={current}
        className={`flex-1 min-h-0 overflow-y-auto relative z-10 px-4 py-6 md:px-12 md:py-8 flex flex-col ${
          direction === 1 ? "animate-slide-in-right" : "animate-slide-in-left"
        }`}
      >
        <div className="my-auto w-full">
          {slides[current]}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 relative z-10">
        <button
          onClick={() => go(-1)}
          disabled={current === 0}
          className="w-10 h-10 rounded-[var(--radius-component)] flex items-center justify-center
            bg-g-100 text-g-500 hover:bg-g-200 transition-all cursor-pointer
            disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Segments */}
        <div className="flex items-center gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i === current) return;
                setDirection(i > current ? 1 : -1);
                setCurrent(i);
              }}
              className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                i <= current ? "bg-brand-600" : "bg-g-300 hover:bg-g-400"
              }`}
              style={{ width: `${100 / slides.length}%`, maxWidth: 32 }}
            />
          ))}
        </div>

        <button
          onClick={() => go(1)}
          disabled={current === total - 1}
          className="w-10 h-10 rounded-[var(--radius-component)] flex items-center justify-center
            bg-brand-600 text-white hover:bg-brand-700 transition-all cursor-pointer
            disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
