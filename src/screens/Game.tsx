import { useEffect, useState, useRef } from "react";
import type { BusinessType, PaymentChoice } from "../game/types";
import { BUSINESS_INFO, FULL_PAYMENT } from "../game/types";
import type { useGameStore } from "../game/store";

type Store = ReturnType<typeof useGameStore>;

export function Game({ store }: { store: Store }) {
  const { game, localPlayer, isCreator } = store;
  if (!game || !localPlayer) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar */}
      <Header game={game} />

      <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main panel */}
        <div className="lg:col-span-2 space-y-4">
          <PhaseTimer game={game} onAdvance={store.advancePhase} isCreator={isCreator} store={store} />

          {game.phase === "action" && (
            <PaymentPanel store={store} />
          )}

          {game.phase === "results" && (
            <WeekResults store={store} />
          )}

          {game.phase === "rest" && (
            <RestPhase game={game} />
          )}
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

function Header({ game }: { game: Store["game"] }) {
  if (!game) return null;

  const phaseLabels: Record<string, string> = {
    action: "Lunes - Viernes",
    results: "Sabado",
    rest: "Domingo",
  };

  return (
    <div className="bg-emerald-700 text-white px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg">CICLO</span>
          <span className="text-emerald-200 text-sm">
            Room {game.code}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-emerald-800 px-3 py-1 rounded-full text-sm">
            Week {game.currentWeek} / {game.weeksTotal}
          </span>
          <span className="text-emerald-200 text-sm">
            {phaseLabels[game.phase] || game.phase}
          </span>
        </div>
      </div>
    </div>
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

      // Auto-simulate bot payments mid-way through action phase
      if (
        game.phase === "action" &&
        !botsDone.current &&
        remaining < 30_000
      ) {
        botsDone.current = true;
        store.simulateBotPayments();
      }

      // Auto-advance when timer runs out (creator only)
      if (remaining <= 0 && isCreator) {
        onAdvance();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [game.phaseEndsAt, game.phase, isCreator, onAdvance, store]);

  const seconds = Math.ceil(timeLeft / 1000);
  const totalDuration =
    game.phase === "action" ? 60 : 15;
  const progress = Math.min(1, 1 - timeLeft / (totalDuration * 1000));

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">
          {game.phase === "action" && "Make your decisions"}
          {game.phase === "results" && "Weekly results"}
          {game.phase === "rest" && "Rest & prepare"}
        </span>
        <span className="text-2xl font-mono font-bold text-gray-900">
          {seconds}s
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-200 ${
            seconds <= 10 ? "bg-red-500" : "bg-emerald-500"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Manual advance button for dev/testing */}
      {isCreator && (
        <button
          onClick={onAdvance}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600"
        >
          Skip phase (dev) &rarr;
        </button>
      )}
    </div>
  );
}

function PaymentPanel({ store }: { store: Store }) {
  const { game, localPlayer, hasLocalPaid } = store;
  if (!game || !localPlayer) return null;

  if (localPlayer.role === "presidenta") {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm text-center">
        <p className="text-gray-500">
          You are the <strong>Presidenta</strong>. You don't make payments.
          Watch the group from your panel. &rarr;
        </p>
      </div>
    );
  }

  if (hasLocalPaid) {
    return (
      <div className="bg-emerald-50 rounded-xl p-6 shadow-sm text-center border-2 border-emerald-200">
        <span className="text-4xl mb-2 block">&#10003;</span>
        <p className="text-emerald-700 font-semibold">Payment submitted</p>
        <p className="text-emerald-600 text-sm mt-1">
          Waiting for others...
        </p>
      </div>
    );
  }

  const canDouble = game.totalMora > 0 && localPlayer.money >= 1500;

  const options: {
    choice: PaymentChoice;
    label: string;
    amount: number;
    emoji: string;
    color: string;
  }[] = [
    {
      choice: "full",
      label: "Pago completo",
      amount: 750,
      emoji: "\u{1F4B0}",
      color: "bg-emerald-600 hover:bg-emerald-700",
    },
    {
      choice: "partial",
      label: "Pago parcial",
      amount: 400,
      emoji: "\u{1FAE3}",
      color: "bg-yellow-500 hover:bg-yellow-600",
    },
    {
      choice: "none",
      label: "No puedo pagar",
      amount: 0,
      emoji: "\u{1F630}",
      color: "bg-red-500 hover:bg-red-600",
    },
  ];

  if (canDouble) {
    options.splice(1, 0, {
      choice: "double",
      label: "Pago doble",
      amount: 1500,
      emoji: "\u{1F4B0}\u{1F4B0}",
      color: "bg-blue-600 hover:bg-blue-700",
    });
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Cuanto abonas esta semana?
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Cash: ${localPlayer.money.toLocaleString()}
        {game.totalMora > 0 && (
          <span className="text-red-500 ml-2">
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
            className={`w-full flex items-center justify-between p-4 rounded-xl text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${opt.color}`}
          >
            <span>
              {opt.emoji} {opt.label}
            </span>
            <span className="font-mono">${opt.amount}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WeekResults({ store }: { store: Store }) {
  const { game, weekResults } = store;
  if (!game) return null;

  const result = weekResults.find((r) => r.week === game.currentWeek);
  if (!result) return null;

  return (
    <div
      className={`rounded-xl p-6 shadow-sm border-2 ${
        result.passed
          ? "bg-emerald-50 border-emerald-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <h2 className="text-lg font-semibold mb-4">
        {result.passed ? "Group payment complete!" : "Payment missed"}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Total paid</p>
          <p className="text-2xl font-mono font-bold">
            ${result.totalPaid.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Target</p>
          <p className="text-2xl font-mono font-bold">
            ${result.target.toLocaleString()}
          </p>
        </div>
      </div>

      {!result.passed && result.moraAdded > 0 && (
        <div className="mt-4 p-3 bg-red-100 rounded-lg">
          <p className="text-red-700 text-sm font-medium">
            Mora added: +${result.moraAdded} / Total mora: $
            {game.totalMora}
          </p>
        </div>
      )}
    </div>
  );
}

function RestPhase({ game }: { game: NonNullable<Store["game"]> }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm text-center">
      <span className="text-4xl mb-2 block">{"\u{1F634}"}</span>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Domingo</h2>
      <p className="text-gray-500">
        Rest up. Week {game.currentWeek + 1} starts soon.
      </p>
      <p className="text-sm text-emerald-600 mt-2">
        Income arriving: +$1,200
      </p>
    </div>
  );
}

function PlayerCard({ player }: { player: Store["localPlayer"] }) {
  if (!player) return null;

  const bt = player.businessType as BusinessType;
  const info = bt ? BUSINESS_INFO[bt] : null;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{info?.emoji || "\u{2B1C}"}</span>
        <div>
          <p className="font-semibold text-gray-900">{player.name}</p>
          <p className="text-sm text-gray-500">
            {info?.label || "No business"}{" "}
            {player.role === "presidenta" && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium ml-1">
                Presidenta
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-sm text-gray-500">Cash</p>
        <p className="text-2xl font-mono font-bold text-gray-900">
          ${player.money.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function GroupPaymentBar({ store }: { store: Store }) {
  const { game, payments } = store;
  if (!game) return null;

  const weekPayments = payments.filter(
    (p) => p.week === game.currentWeek
  );
  const totalPaid = weekPayments.reduce((sum, p) => sum + p.amount, 0);
  const progress = Math.min(1, totalPaid / (game.targetPayment || 1));

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-500">Group Payment</p>
        <p className="text-sm font-mono text-gray-900">
          ${totalPaid.toLocaleString()} / ${game.targetPayment.toLocaleString()}
        </p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            progress >= 1 ? "bg-emerald-500" : "bg-yellow-500"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {game.totalMora > 0 && (
        <p className="text-xs text-red-500 mt-2">
          Accumulated mora: ${game.totalMora}
        </p>
      )}
    </div>
  );
}

function PresidentaPanel({ store }: { store: Store }) {
  const { game, players, payments } = store;
  if (!game) return null;

  const members = players.filter((p) => p.role === "member");
  const weekPayments = payments.filter(
    (p) => p.week === game.currentWeek
  );

  return (
    <div className="bg-purple-50 rounded-xl p-4 shadow-sm border-2 border-purple-200">
      <h3 className="text-sm font-semibold text-purple-800 mb-3">
        Panel de Presidenta
      </h3>

      <div className="space-y-2">
        {members.map((member) => {
          const payment = weekPayments.find(
            (p) => p.playerId === member.id
          );
          const bt = member.businessType as BusinessType;
          const info = bt ? BUSINESS_INFO[bt] : null;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 bg-white rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span>{info?.emoji || "\u{2B1C}"}</span>
                <span className="text-sm font-medium text-gray-900">
                  {member.name}
                </span>
              </div>
              {payment ? (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    payment.choice === "full" || payment.choice === "double"
                      ? "bg-emerald-100 text-emerald-700"
                      : payment.choice === "partial"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  ${payment.amount}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Pending...</span>
              )}
            </div>
          );
        })}
      </div>

      {game.totalMora > 0 && (
        <div className="mt-3 p-2 bg-red-50 rounded-lg">
          <p className="text-xs text-red-600 font-medium">
            Mora: ${game.totalMora} / Weeks missed: {game.weeksMissed}
          </p>
        </div>
      )}
    </div>
  );
}
