// Local game store for development/testing before SpacetimeDB is wired up
// This will be replaced by SpacetimeDB subscriptions later

import { useState, useCallback } from "react";
import type {
  GameStatus,
  GamePhase,
  GameMode,
  PlayerRole,
  BusinessType,
  PaymentChoice,
} from "./types";
import { BASE_INCOME, FULL_PAYMENT } from "./types";

export interface GameState {
  code: string;
  status: GameStatus;
  mode: GameMode;
  weeksTotal: number;
  currentWeek: number;
  phase: GamePhase;
  phaseEndsAt: number;
  targetPayment: number;
  totalMora: number;
  weeksMissed: number;
}

export interface PlayerState {
  id: string;
  name: string;
  businessType: BusinessType | "";
  role: PlayerRole;
  money: number;
  online: boolean;
  isLocal: boolean; // is this the current user
}

export interface PaymentState {
  playerId: string;
  week: number;
  amount: number;
  choice: PaymentChoice;
}

export interface WeekResultState {
  week: number;
  totalPaid: number;
  target: number;
  passed: boolean;
  moraAdded: number;
}

const MORA_BASE = 45;
const MORA_GROWTH = 15;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function useGameStore() {
  const [game, setGame] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [payments, setPayments] = useState<PaymentState[]>([]);
  const [weekResults, setWeekResults] = useState<WeekResultState[]>([]);
  const [localPlayerId, setLocalPlayerId] = useState<string>("");
  const [isCreator, setIsCreator] = useState(false);

  const localPlayer = players.find((p) => p.id === localPlayerId);

  const createGame = useCallback((mode: GameMode) => {
    const code = generateCode();
    const playerId = crypto.randomUUID();

    setGame({
      code,
      status: "lobby",
      mode,
      weeksTotal: mode === "experiencia" ? 4 : mode === "medio" ? 8 : 16,
      currentWeek: 0,
      phase: "lobby",
      phaseEndsAt: 0,
      targetPayment: 0,
      totalMora: 0,
      weeksMissed: 0,
    });

    setPlayers([
      {
        id: playerId,
        name: "",
        businessType: "",
        role: "member",
        money: BASE_INCOME,
        online: true,
        isLocal: true,
      },
    ]);

    setLocalPlayerId(playerId);
    setIsCreator(true);
    setPayments([]);
    setWeekResults([]);

    return code;
  }, []);

  const setName = useCallback(
    (name: string) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === localPlayerId ? { ...p, name } : p))
      );
    },
    [localPlayerId]
  );

  const pickBusinessType = useCallback(
    (bt: BusinessType) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === localPlayerId ? { ...p, businessType: bt } : p
        )
      );
    },
    [localPlayerId]
  );

  // Add a bot player (for testing without SpacetimeDB)
  const addBot = useCallback((name: string, bt: BusinessType) => {
    setPlayers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        businessType: bt,
        role: "member" as PlayerRole,
        money: BASE_INCOME,
        online: true,
        isLocal: false,
      },
    ]);
  }, []);

  const startGame = useCallback(() => {
    if (!game) return;

    setPlayers((prev) => {
      const presidentaIdx = Math.floor(Math.random() * prev.length);
      const defaultTypes: BusinessType[] = [
        "tiendita",
        "salon",
        "puesto",
        "catalogo",
        "costura",
        "panaderia",
      ];

      return prev.map((p, i) => ({
        ...p,
        role: i === presidentaIdx ? ("presidenta" as const) : ("member" as const),
        businessType: p.businessType || defaultTypes[i % 6],
        money: BASE_INCOME,
      }));
    });

    setGame((prev) => {
      if (!prev) return prev;
      const memberCount = players.length - 1;
      return {
        ...prev,
        status: "playing",
        currentWeek: 1,
        phase: "action",
        phaseEndsAt: Date.now() + 60_000,
        targetPayment: memberCount * FULL_PAYMENT,
      };
    });
  }, [game, players.length]);

  const makePayment = useCallback(
    (choice: PaymentChoice) => {
      if (!game || !localPlayer) return;

      const amounts: Record<PaymentChoice, number> = {
        full: 750,
        partial: 400,
        none: 0,
        double: 1500,
      };
      const amount = amounts[choice];
      if (amount > localPlayer.money) return;

      setPayments((prev) => [
        ...prev,
        { playerId: localPlayerId, week: game.currentWeek, amount, choice },
      ]);

      setPlayers((prev) =>
        prev.map((p) =>
          p.id === localPlayerId ? { ...p, money: p.money - amount } : p
        )
      );
    },
    [game, localPlayer, localPlayerId]
  );

  // Simulate bot payments
  const simulateBotPayments = useCallback(() => {
    if (!game) return;

    setPlayers((prev) => {
      const newPayments: PaymentState[] = [];
      const updated = prev.map((p) => {
        if (p.isLocal || p.role === "presidenta") return p;

        // Bots pay randomly: 70% full, 20% partial, 10% none
        const rand = Math.random();
        let choice: PaymentChoice;
        let amount: number;

        if (rand < 0.7) {
          choice = "full";
          amount = 750;
        } else if (rand < 0.9) {
          choice = "partial";
          amount = 400;
        } else {
          choice = "none";
          amount = 0;
        }

        if (amount > p.money) {
          choice = "none";
          amount = 0;
        }

        newPayments.push({
          playerId: p.id,
          week: game.currentWeek,
          amount,
          choice,
        });

        return { ...p, money: p.money - amount };
      });

      setPayments((prev) => [...prev, ...newPayments]);
      return updated;
    });
  }, [game]);

  const advancePhase = useCallback(() => {
    if (!game) return;

    setGame((prev) => {
      if (!prev) return prev;

      if (prev.phase === "action") {
        // Calculate results
        const weekPayments = payments.filter(
          (p) => p.week === prev.currentWeek
        );

        // Include bot payments that were just simulated
        const totalPaid = weekPayments.reduce(
          (sum, p) => sum + p.amount,
          0
        );
        const passed = totalPaid >= prev.targetPayment;

        let moraAdded = 0;
        let newWeeksMissed = prev.weeksMissed;
        let newTotalMora = prev.totalMora;

        if (!passed) {
          newWeeksMissed += 1;
          moraAdded = MORA_BASE + MORA_GROWTH * (newWeeksMissed - 1);
          newTotalMora += moraAdded;
        } else {
          newWeeksMissed = 0;
        }

        setWeekResults((wr) => [
          ...wr,
          {
            week: prev.currentWeek,
            totalPaid,
            target: prev.targetPayment,
            passed,
            moraAdded,
          },
        ]);

        return {
          ...prev,
          phase: "results",
          phaseEndsAt: Date.now() + 15_000,
          weeksMissed: newWeeksMissed,
          totalMora: newTotalMora,
        };
      }

      if (prev.phase === "results") {
        if (prev.currentWeek >= prev.weeksTotal) {
          return { ...prev, status: "finished", phase: "finished" };
        }
        return {
          ...prev,
          phase: "rest",
          phaseEndsAt: Date.now() + 15_000,
        };
      }

      if (prev.phase === "rest") {
        // Give income to members
        setPlayers((ps) =>
          ps.map((p) =>
            p.role === "member"
              ? { ...p, money: p.money + BASE_INCOME }
              : p
          )
        );

        return {
          ...prev,
          currentWeek: prev.currentWeek + 1,
          phase: "action",
          phaseEndsAt: Date.now() + 60_000,
        };
      }

      return prev;
    });
  }, [game, payments]);

  // Get payments for a specific week
  const getWeekPayments = useCallback(
    (week: number) => payments.filter((p) => p.week === week),
    [payments]
  );

  // Has local player paid this week?
  const hasLocalPaid = game
    ? payments.some(
        (p) => p.playerId === localPlayerId && p.week === game.currentWeek
      )
    : false;

  // Graduation status
  const graduationStatus = (() => {
    if (!game || game.status !== "finished") return null;
    const missed = weekResults.filter((r) => !r.passed).length;
    if (missed === 0) return "graduado";
    if (missed <= 3) return "no_graduado";
    return "moroso";
  })();

  return {
    game,
    players,
    payments,
    weekResults,
    localPlayer,
    localPlayerId,
    isCreator,
    hasLocalPaid,
    graduationStatus,
    createGame,
    setName,
    pickBusinessType,
    addBot,
    startGame,
    makePayment,
    simulateBotPayments,
    advancePhase,
    getWeekPayments,
  };
}
