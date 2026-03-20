import type { BusinessType } from "../game/types";
import { BUSINESS_INFO } from "../game/types";

interface WAGameStatusProps {
  businessType: BusinessType | "";
  money: number;
  paidCount: number;
  totalMembers: number;
  secondsLeft: number;
  isUrgent: boolean;
  phase: string;
  isPresidenta: boolean;
}

export function WAGameStatus({
  businessType,
  money,
  paidCount,
  totalMembers,
  secondsLeft,
  isUrgent,
  phase,
  isPresidenta,
}: WAGameStatusProps) {
  const bt = businessType as BusinessType;
  const info = bt ? BUSINESS_INFO[bt] : null;

  const phaseLabel =
    phase === "action"
      ? "Pagos"
      : phase === "results"
        ? "Resultados"
        : "Descanso";

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-wa-teal-dark/90 text-white text-[11px] border-b border-white/10">
      <div className="flex items-center gap-2">
        {info && <span className="text-sm">{info.emoji}</span>}
        <span className="font-mono font-semibold">${money.toLocaleString()}</span>
        {isPresidenta && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
            Presidenta
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {phase === "action" && (
          <span className="text-white/70">
            {paidCount}/{totalMembers} pagaron
          </span>
        )}
        <span className="text-white/70">{phaseLabel}</span>
        <span
          className={`font-mono font-bold ${isUrgent ? "text-red-300 animate-pulse" : ""}`}
        >
          {secondsLeft}s
        </span>
      </div>
    </div>
  );
}
