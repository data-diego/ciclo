import { useState, useEffect, useRef } from "react";
import type { GameState } from "./store";

interface PhaseTimerResult {
  secondsLeft: number;
  isUrgent: boolean;
}

export function usePhaseTimer(
  game: GameState | null,
  simulateBotPayments: () => void,
  advancePhase: () => void,
  isCreator: boolean
): PhaseTimerResult {
  const [timeLeft, setTimeLeft] = useState(0);
  const botsDone = useRef(false);

  useEffect(() => {
    botsDone.current = false;
  }, [game?.currentWeek, game?.phase]);

  useEffect(() => {
    if (!game) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, game.phaseEndsAt - Date.now());
      setTimeLeft(remaining);

      if (game.phase === "action" && !botsDone.current && remaining < 30_000) {
        botsDone.current = true;
        simulateBotPayments();
      }

      if (remaining <= 0 && isCreator) {
        advancePhase();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [game, isCreator, simulateBotPayments, advancePhase]);

  const secondsLeft = Math.ceil(timeLeft / 1000);

  return {
    secondsLeft,
    isUrgent: secondsLeft <= 10,
  };
}
