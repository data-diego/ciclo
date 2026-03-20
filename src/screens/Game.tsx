import { useEffect, useState, useRef } from "react";
import type { BusinessType, PaymentChoice } from "../game/types";
import { BUSINESS_INFO } from "../game/types";
import { Card, Badge, ProgressBar, AppHeader } from "../components";
import type { useGameStore } from "../game/store";

type Store = ReturnType<typeof useGameStore>;

export function Game({ store }: { store: Store }) {
  const { game, localPlayer, isCreator } = store;
  if (!game || !localPlayer) return null;

  return (
    <div className="min-h-screen bg-g-50 logo-bg">
      <GameHeader game={game} />

      <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main panel */}
        <div className="lg:col-span-2 space-y-4">
          <PhaseTimer
            game={game}
            onAdvance={store.advancePhase}
            isCreator={isCreator}
            store={store}
          />

          {game.phase === "action" && <PaymentPanel store={store} />}
          {game.phase === "results" && <WeekResults store={store} />}
          {game.phase === "rest" && <RestPhase game={game} />}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <PlayerCard player={localPlayer} />
          <GroupPaymentBar store={store} />
          {localPlayer.role === "presidenta" && (
            <PresidentaPanel store={store} />
          )}
        </div>
      </div>
    </div>
  );
}

function GameHeader({ game }: { game: NonNullable<Store["game"]> }) {
  const phaseLabels: Record<string, string> = {
    action: "Lunes - Viernes",
    results: "Sabado",
    rest: "Domingo",
  };

  return (
    <AppHeader>
      <div className="flex items-center gap-4">
        <span className="font-bold text-lg tracking-tight">CICLO</span>
        <span className="text-brand-200 text-sm">{game.groupName} ({game.code})</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="bg-white/15 px-3 py-1 rounded-[--radius-pill] text-sm font-medium">
          Week {game.currentWeek} / {game.weeksTotal}
        </span>
        <span className="text-brand-200 text-sm">
          {phaseLabels[game.phase] || game.phase}
        </span>
      </div>
    </AppHeader>
  );
}

function PhaseTimer({
  game,
  onAdvance,
  isCreator,
  store,
}: {
  game: NonNullable<Store["game"]>;
  onAdvance: () => void;
  isCreator: boolean;
  store: Store;
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const botsDone = useRef(false);

  useEffect(() => {
    botsDone.current = false;
  }, [game.currentWeek, game.phase]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, game.phaseEndsAt - Date.now());
      setTimeLeft(remaining);

      if (game.phase === "action" && !botsDone.current && remaining < 30_000) {
        botsDone.current = true;
        store.simulateBotPayments();
      }

      if (remaining <= 0 && isCreator) {
        onAdvance();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [game.phaseEndsAt, game.phase, isCreator, onAdvance, store]);

  const seconds = Math.ceil(timeLeft / 1000);
  const totalDuration = game.phase === "action" ? 60 : 15;
  const progress = 1 - timeLeft / (totalDuration * 1000);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-g-500">
          {game.phase === "action" && "Make your decisions"}
          {game.phase === "results" && "Weekly results"}
          {game.phase === "rest" && "Rest & prepare"}
        </span>
        <span
          className={`text-2xl font-mono font-bold ${seconds <= 10 ? "text-err-600" : "text-g-900"}`}
        >
          {seconds}s
        </span>
      </div>

      <ProgressBar
        value={progress}
        variant={seconds <= 10 ? "error" : "brand"}
        size="lg"
      />

      {isCreator && (
        <button
          onClick={onAdvance}
          className="mt-2 text-xs text-g-400 hover:text-g-600 transition-colors"
        >
          Skip phase &rarr;
        </button>
      )}
    </Card>
  );
}

function PaymentPanel({ store }: { store: Store }) {
  const { game, localPlayer, hasLocalPaid } = store;
  if (!game || !localPlayer) return null;

  if (localPlayer.role === "presidenta") {
    return (
      <Card variant="presidenta" className="text-center">
        <p className="text-g-600">
          You are the <strong className="text-brand-700">Presidenta</strong>.
          You don't make payments. Watch the group from your panel.
        </p>
      </Card>
    );
  }

  if (hasLocalPaid) {
    return (
      <Card variant="success" className="text-center">
        <span className="text-3xl block mb-2">{"\u2713"}</span>
        <p className="font-semibold text-ok-700">Payment submitted</p>
        <p className="text-ok-600 text-sm mt-1">Waiting for others...</p>
      </Card>
    );
  }

  const canDouble = game.totalMora > 0 && localPlayer.money >= 1500;

  const options: {
    choice: PaymentChoice;
    label: string;
    amount: number;
    emoji: string;
    variant: string;
  }[] = [
    {
      choice: "full",
      label: "Pago completo",
      amount: 750,
      emoji: "\u{1F4B0}",
      variant: "bg-ok-600 hover:bg-ok-700",
    },
    {
      choice: "partial",
      label: "Pago parcial",
      amount: 400,
      emoji: "\u{1FAE3}",
      variant: "bg-warn-600 hover:bg-warn-700",
    },
    {
      choice: "none",
      label: "No puedo pagar",
      amount: 0,
      emoji: "\u{1F630}",
      variant: "bg-err-600 hover:bg-err-700",
    },
  ];

  if (canDouble) {
    options.splice(1, 0, {
      choice: "double",
      label: "Pago doble",
      amount: 1500,
      emoji: "\u{1F4B0}\u{1F4B0}",
      variant: "bg-brand-600 hover:bg-brand-700",
    });
  }

  return (
    <Card>
      <h2 className="text-base font-semibold text-g-900 mb-1">
        Cuanto abonas esta semana?
      </h2>
      <p className="text-sm text-g-500 mb-4">
        Cash:{" "}
        <span className="font-mono font-semibold text-g-700">
          ${localPlayer.money.toLocaleString()}
        </span>
        {game.totalMora > 0 && (
          <span className="text-err-600 ml-2 font-medium">
            Mora: ${game.totalMora}
          </span>
        )}
      </p>

      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.choice}
            onClick={() => store.makePayment(opt.choice)}
            disabled={opt.amount > localPlayer.money}
            className={`
              w-full flex items-center justify-between p-4
              rounded-[--radius-component] text-white font-medium
              transition-colors duration-150
              disabled:opacity-30 disabled:cursor-not-allowed
              ${opt.variant}
            `}
          >
            <span>
              {opt.emoji} {opt.label}
            </span>
            <span className="font-mono font-bold">${opt.amount}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function WeekResults({ store }: { store: Store }) {
  const { game, weekResults } = store;
  if (!game) return null;

  const result = weekResults.find((r) => r.week === game.currentWeek);
  if (!result) return null;

  return (
    <Card variant={result.passed ? "success" : "error"}>
      <h2 className="text-base font-semibold mb-4">
        {result.passed
          ? "\u2705 Group payment complete!"
          : "\u274C Payment missed"}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-g-500 mb-0.5">Total paid</p>
          <p className="text-xl font-mono font-bold text-g-900">
            ${result.totalPaid.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-g-500 mb-0.5">Target</p>
          <p className="text-xl font-mono font-bold text-g-900">
            ${result.target.toLocaleString()}
          </p>
        </div>
      </div>

      {!result.passed && result.moraAdded > 0 && (
        <div className="mt-4 p-3 bg-err-100 rounded-[--radius-component]">
          <p className="text-err-700 text-sm font-medium">
            Mora added: +${result.moraAdded} &middot; Total mora: $
            {game.totalMora}
          </p>
        </div>
      )}
    </Card>
  );
}

function RestPhase({ game }: { game: NonNullable<Store["game"]> }) {
  return (
    <Card className="text-center">
      <span className="text-4xl block mb-2">{"\u{1F634}"}</span>
      <h2 className="text-base font-semibold text-g-900 mb-1">Domingo</h2>
      <p className="text-g-500 text-sm">
        Rest up. Week {game.currentWeek + 1} starts soon.
      </p>
      <p className="text-sm text-ok-600 font-medium mt-2">
        Income arriving: +$1,200
      </p>
    </Card>
  );
}

function PlayerCard({ player }: { player: NonNullable<Store["localPlayer"]> }) {
  const bt = player.businessType as BusinessType;
  const info = bt ? BUSINESS_INFO[bt] : null;

  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{info?.emoji || "\u{2B1C}"}</span>
        <div>
          <p className="font-semibold text-g-900 text-sm">{player.name}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-g-500">
              {info?.label || "No business"}
            </span>
            {player.role === "presidenta" && (
              <Badge variant="presidenta">Presidenta</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="bg-g-50 rounded-[--radius-component] p-3">
        <p className="text-xs text-g-500 mb-0.5">Cash</p>
        <p className="text-xl font-mono font-bold text-g-900">
          ${player.money.toLocaleString()}
        </p>
      </div>
    </Card>
  );
}

function GroupPaymentBar({ store }: { store: Store }) {
  const { game, payments } = store;
  if (!game) return null;

  const weekPayments = payments.filter((p) => p.week === game.currentWeek);
  const totalPaid = weekPayments.reduce((sum, p) => sum + p.amount, 0);
  const progress = totalPaid / (game.targetPayment || 1);

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-g-500 uppercase tracking-wide">
          Group Payment
        </p>
        <p className="text-sm font-mono font-semibold text-g-900">
          ${totalPaid.toLocaleString()} / ${game.targetPayment.toLocaleString()}
        </p>
      </div>

      <ProgressBar
        value={progress}
        variant={progress >= 1 ? "success" : "warning"}
        size="lg"
      />

      {game.totalMora > 0 && (
        <p className="text-xs text-err-600 font-medium mt-2">
          Accumulated mora: ${game.totalMora}
        </p>
      )}
    </Card>
  );
}

function PresidentaPanel({ store }: { store: Store }) {
  const { game, players, payments } = store;
  if (!game) return null;

  const members = players.filter((p) => p.role === "member");
  const weekPayments = payments.filter((p) => p.week === game.currentWeek);

  return (
    <Card variant="presidenta">
      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-3">
        Panel de Presidenta
      </p>

      <div className="space-y-1.5">
        {members.map((member) => {
          const payment = weekPayments.find((p) => p.playerId === member.id);
          const bt = member.businessType as BusinessType;
          const info = bt ? BUSINESS_INFO[bt] : null;

          let badgeVariant: "success" | "warning" | "error" | "neutral" =
            "neutral";
          if (payment) {
            if (payment.choice === "full" || payment.choice === "double")
              badgeVariant = "success";
            else if (payment.choice === "partial") badgeVariant = "warning";
            else badgeVariant = "error";
          }

          return (
            <div
              key={member.id}
              className="flex items-center justify-between px-3 py-2 bg-white rounded-[--radius-component]"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{info?.emoji || "\u{2B1C}"}</span>
                <span className="text-sm font-medium text-g-900">
                  {member.name}
                </span>
              </div>
              {payment ? (
                <Badge variant={badgeVariant}>${payment.amount}</Badge>
              ) : (
                <span className="text-xs text-g-400">Pending...</span>
              )}
            </div>
          );
        })}
      </div>

      {game.totalMora > 0 && (
        <div className="mt-3 p-2 bg-err-50 rounded-[--radius-component]">
          <p className="text-xs text-err-600 font-medium">
            Mora: ${game.totalMora} &middot; Weeks missed: {game.weeksMissed}
          </p>
        </div>
      )}
    </Card>
  );
}
