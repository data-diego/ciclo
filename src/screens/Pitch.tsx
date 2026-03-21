import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Video,
  Store, CreditCard, CalendarClock, Dices, Target, Heart,
  MessageCircle, Smartphone, Database, Server, Zap, Play, Trophy,
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

/* ─── slide data ─── */
const slides: ReactNode[] = [
  // 0 — Title
  (
    <div className="flex flex-col items-center justify-center h-full text-center gap-6 md:gap-10">
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
    <div className="flex flex-col md:flex-row items-center justify-center h-full gap-6 md:gap-12 max-w-5xl mx-auto px-4">
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
    <div className="flex flex-col md:flex-row items-center justify-center h-full gap-6 md:gap-10 max-w-4xl mx-auto px-4">
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
    <div className="flex flex-col items-center justify-center h-full text-center gap-6 md:gap-8 max-w-3xl mx-auto px-4">
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
    <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto px-4">
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
    <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto px-4">
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
    <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto px-4">
      <Stagger className="flex flex-col gap-3 md:gap-5 w-full">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="brand" className="!text-xs md:!text-sm !px-3 md:!px-4 !py-1 md:!py-1.5">Lo hacker</Badge>
          <img src="/matrixparrot.gif" alt="" className="h-8" />
        </div>
        <IconRow icon={Database} text="SpacetimeDB v2: 10 tablas sincronizadas en tiempo real" />
        <IconRow icon={Server} text="Motor de juego server-side: eventos, scoring y objetivos determinísticos" />
        <IconRow icon={MessageCircle} text="Clon funcional de WhatsApp: chat en tiempo real, stickers, bot presidenta" />
        <IconRow icon={Zap} text="Notificaciones en tiempo real con sonido" />
        <IconRow icon={Dices} text="Simulación Montecarlo para afinar scoring con distintos tamaños de grupo y reglas" />
        <IconRow icon={Smartphone} text="Fully responsive con UI/UX pulido: apps de WhatsApp y Grupalia pixel-perfect" />
      </Stagger>
    </div>
  ),

  // 7 — Demo
  (
    <div
      className="flex flex-col items-center justify-center h-full text-center gap-8 cursor-pointer"
      onClick={() => { window.location.href = "/"; }}
    >
      <Stagger className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
          <Play className="w-7 h-7 md:w-9 md:h-9 ml-1" />
        </div>
        <p className="text-3xl md:text-5xl font-light text-g-900 tracking-tight">
          Demo en vivo
        </p>
        <p className="text-lg md:text-xl text-g-400">
          ciclo.datadiego.com
        </p>
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
        className={`flex-1 min-h-0 overflow-y-auto relative z-10 px-4 py-6 md:px-12 md:py-8 ${
          direction === 1 ? "animate-slide-in-right" : "animate-slide-in-left"
        }`}
        style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}
      >
        {slides[current]}
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
