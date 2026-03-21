import type { BusinessType } from "../game/types";
import { BUSINESS_INFO } from "../game/types";

interface WAGameStatusProps {
  businessType: BusinessType | "";
  money: number;
  weeklyPayment: number;
  paidCount: number;
  totalPlayers: number;
  phase: string;
}

export function WAGameStatus({
  businessType,
  money,
  weeklyPayment,
  paidCount,
  totalPlayers,
  phase,
}: WAGameStatusProps) {
  const bt = businessType as BusinessType;
  const info = bt ? BUSINESS_INFO[bt] : null;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-wa-teal-dark/90 text-white text-[11px] border-b border-white/10">
      <div className="flex items-center gap-2">
        {info && <span className="text-sm">{info.emoji}</span>}
        <span className="font-mono font-semibold">${money.toLocaleString()}</span>
        <span className="text-white/50 text-[10px]">pago: ${weeklyPayment}</span>
      </div>

      {phase === "action" && (
        <span className="text-white/70">
          {paidCount}/{totalPlayers} pagaron
        </span>
      )}
    </div>
  );
}
