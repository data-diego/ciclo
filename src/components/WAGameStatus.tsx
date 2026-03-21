import type { BusinessType } from "../game/types";
import { BUSINESS_INFO } from "../game/types";

interface WAGameStatusProps {
  businessType: BusinessType | "";
  money: number;
  weeklyPayment: number;
  paidCount: number;
  totalPlayers: number;
  secondsLeft: number;
  isUrgent: boolean;
  phase: string;
  dayLabel: string;
  timeIcon: string;
}

export function WAGameStatus({
  businessType,
  money,
  weeklyPayment,
  paidCount,
  totalPlayers,
  secondsLeft,
  isUrgent,
  phase,
  dayLabel,
  timeIcon,
}: WAGameStatusProps) {
  const bt = businessType as BusinessType;
  const info = bt ? BUSINESS_INFO[bt] : null;

  const phaseLabel =
    phase === "action"
      ? dayLabel || "Pagos"
      : phase === "results"
        ? "Viernes noche"
        : "Domingo";

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-wa-teal-dark/90 text-white text-[11px] border-b border-white/10">
      <div className="flex items-center gap-2">
        {info && <span className="text-sm">{info.emoji}</span>}
        <span className="font-mono font-semibold">${money.toLocaleString()}</span>
        <span className="text-white/50 text-[10px]">pago: ${weeklyPayment}</span>
      </div>

      <div className="flex items-center gap-2">
        {phase === "action" && (
          <span className="text-white/70">
            {paidCount}/{totalPlayers}
          </span>
        )}
        <span className="text-white/70">
          {timeIcon && <span className="mr-0.5">{timeIcon}</span>}
          {phaseLabel}
        </span>
        <span
          className={`font-mono font-bold ${isUrgent ? "text-red-300 animate-pulse" : ""}`}
        >
          {secondsLeft}s
        </span>
      </div>
    </div>
  );
}
