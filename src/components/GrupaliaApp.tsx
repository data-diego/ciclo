import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import type { BusinessType, PaymentChoice } from "../game/types";
import { BUSINESS_INFO, LOAN_INFO, SOLIDARIO_AMOUNT, calcTotalPayback, g } from "../game/types";
import type { TimeOfDay } from "../game/useTimeOfDay";
import type { DbConnection } from "../module_bindings";
import type {
  Game as GameT,
  Player,
  Payment,
  BusinessEvent,
  SolidarioTransfer,
  SecretObjective,
} from "../module_bindings/types";

interface GrupaliaAppProps {
  conn: DbConnection;
  game: GameT;
  localPlayer: Player;
  players: readonly Player[];
  payments: readonly Payment[];
  businessEvents: readonly BusinessEvent[];
  solidarioTransfers: readonly SolidarioTransfer[];
  secretObjectives: readonly SecretObjective[];
  secondsLeft: number;
  timeOfDay: TimeOfDay;
  onBack: () => void;
}

// --- Helpers ---

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function InitialsAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-[13px] font-semibold"
      style={{ background: color }}
    >
      {initials || "?"}
    </div>
  );
}

const AVATAR_COLORS = [
  "#7C3AED", "#128C7E", "#E67E22", "#2ECC71", "#E74C3C",
  "#3498DB", "#9B59B6", "#1ABC9C", "#F39C12", "#E91E63",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// --- Chat message components ---

function ChatMessageIn({
  sender,
  time,
  children,
  avatar,
}: {
  sender: string;
  time?: string;
  children: ReactNode;
  avatar?: ReactNode;
}) {
  return (
    <div className="flex gap-2.5 items-start pr-8">
      {avatar || <InitialsAvatar name={sender} color={getAvatarColor(sender)} />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13px] font-medium text-g-700 truncate">{sender}</span>
          <span className="text-[11px] text-g-500 shrink-0">{time || formatTime()}</span>
        </div>
        <div className="bg-[#F8FAFC] border border-[#E3E8EF] rounded-br-lg rounded-bl-lg rounded-tr-lg px-3 py-2">
          <div className="text-[14px] text-g-900 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ChatDivider({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-[#E3E8EF]" />
      <span className="text-[13px] font-medium text-g-500">{text}</span>
      <div className="flex-1 h-px bg-[#E3E8EF]" />
    </div>
  );
}

interface ChatEntry {
  id: string;
  node: ReactNode;
}

function GrupaliaAvatar() {
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-brand-200">
      <img src="/icon.png" alt="Grupalia" className="w-full h-full object-cover" />
    </div>
  );
}

// --- Main component ---

export function GrupaliaApp({
  conn,
  game,
  localPlayer,
  players,
  payments,
  businessEvents,
  solidarioTransfers,
  secretObjectives,
  secondsLeft,
  timeOfDay,
  onBack,
}: GrupaliaAppProps) {
  const [chatLog, setChatLog] = useState<ChatEntry[]>([]);
  const [showSolidarioPicker, setShowSolidarioPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const myHex = localPlayer.identity.toHexString();

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Build initial messages on mount
  useEffect(() => {
    const entries: ChatEntry[] = [];
    const bt = localPlayer.businessType as BusinessType;
    const info = bt ? BUSINESS_INFO[bt] : null;

    // Welcome
    entries.push({
      id: "welcome",
      node: (
        <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
          Hola <strong>{localPlayer.name}</strong>! {info?.emoji}{" "}
          {g(localPlayer.pronoun, "Bienvenido", "Bienvenida", "Bienvenide")} a tu panel de Grupalia.
        </ChatMessageIn>
      ),
    });

    // Stats card
    const totalPaid = payments
      .filter((p) => p.playerIdentity.toHexString() === myHex)
      .reduce((sum, p) => sum + p.amount, 0);

    const wp = localPlayer.weeklyPayment || 750;
    const lsInfo = LOAN_INFO[localPlayer.loanSize as keyof typeof LOAN_INFO];
    const credit = lsInfo?.credit || 3500;
    const totalPayback = calcTotalPayback(credit);

    entries.push({
      id: "stats",
      node: (
        <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
          <p className="font-semibold mb-2">Tu resumen del ciclo:</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg p-2 text-center border border-[#E3E8EF]">
              <p className="text-[16px] font-bold font-mono text-brand-700">
                ${localPlayer.money.toLocaleString()}
              </p>
              <p className="text-[10px] text-g-500">Saldo</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center border border-[#E3E8EF]">
              <p className="text-[16px] font-bold font-mono text-ok-600">
                ${totalPaid.toLocaleString()}
              </p>
              <p className="text-[10px] text-g-500">Pagado</p>
            </div>
          </div>
          <div className="mt-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
            <p className="text-[13px] font-semibold text-brand-800">
              {lsInfo?.emoji} Crédito: ${credit.toLocaleString()}
            </p>
            <p className="text-[11px] text-brand-600 mt-0.5">
              Total a pagar: ${totalPayback.toLocaleString()}
            </p>
            <p className="text-[11px] font-semibold text-brand-700">
              ${wp}/sem x {game.weeksTotal}
            </p>
          </div>
          {game.totalMora > 0 && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 text-center">
              <span className="text-[13px] font-semibold text-red-700">
                Mora: ${game.totalMora}
              </span>
            </div>
          )}
        </ChatMessageIn>
      ),
    });

    // Secret objective
    const myObjective = secretObjectives.find(
      (o) => o.playerIdentity.toHexString() === myHex
    );
    if (myObjective) {
      entries.push({
        id: "objective",
        node: (
          <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
            <p className="font-semibold mb-1">Tu objetivo secreto:</p>
            <div className="bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
              <p className="text-[14px] font-medium text-brand-800">
                {"\u{1F3AF}"} {myObjective.description}
              </p>
              <p className="text-[11px] text-brand-600 mt-1">
                Bonus: +${myObjective.bonusMoney} si lo completas
              </p>
            </div>
            <p className="text-[11px] text-g-400 mt-1">Solo tú puedes ver esto.</p>
          </ChatMessageIn>
        ),
      });
    }

    // Week event
    const weekEvent = businessEvents.find(
      (e) => e.playerIdentity.toHexString() === myHex && e.week === game.currentWeek
    );
    if (weekEvent) {
      entries.push({
        id: `event-${game.currentWeek}`,
        node: (
          <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
            <p className="font-semibold mb-1">Evento de esta semana:</p>
            <div className={`rounded-lg px-3 py-2 border ${
              weekEvent.moneyDelta > 0
                ? "bg-ok-50 border-ok-100"
                : weekEvent.moneyDelta < 0
                  ? "bg-red-50 border-red-200"
                  : "bg-g-50 border-g-200"
            }`}>
              <p className="text-[14px]">{weekEvent.message}</p>
            </div>
          </ChatMessageIn>
        ),
      });
    }

    setChatLog(entries);
  }, [game.currentWeek]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [chatLog.length, scrollToBottom]);

  // --- Action handlers ---

  const handlePayment = (choice: PaymentChoice) => {
    try {
      conn.reducers.makePayment({ choice });
    } catch {
      // handled by toast in parent
    }

    const wp = localPlayer.weeklyPayment || 750;
    const amount = choice === "full" ? wp : choice === "double" ? wp * 2 : choice === "partial" ? Math.floor(wp * 0.5) : 0;
    const label = choice === "full" ? "Pago completo" : choice === "double" ? "Pago doble" : choice === "partial" ? "Pago parcial" : "No puedo pagar";

    setChatLog((prev) => [
      ...prev,
      {
        id: `payment-${Date.now()}`,
        node: (
          <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
            <p className="text-ok-700 font-semibold">{"\u2705"} {label}: ${amount}</p>
            <p className="text-[12px] text-g-500 mt-1">Nuevo saldo: ${(localPlayer.money - amount).toLocaleString()}</p>
          </ChatMessageIn>
        ),
      },
    ]);
  };

  const handleShareEvent = () => {
    try {
      conn.reducers.shareEvent({ week: game.currentWeek });
    } catch {
      // ignore
    }
    setChatLog((prev) => [
      ...prev,
      {
        id: `shared-event-${Date.now()}`,
        node: (
          <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
            <p className="text-[12px] text-g-500">Evento compartido en WhatsApp</p>
          </ChatMessageIn>
        ),
      },
    ]);
  };

  const handleSendSolidario = (receiverHex: string) => {
    try {
      conn.reducers.sendSolidario({ receiverIdentityHex: receiverHex });
    } catch {
      // ignore
    }
    const receiver = players.find((p) => p.identity.toHexString() === receiverHex);
    setChatLog((prev) => [
      ...prev,
      {
        id: `solidario-${Date.now()}`,
        node: (
          <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
            <p className="text-brand-700 font-semibold">
              {"\u{1F49C}"} Enviaste ${SOLIDARIO_AMOUNT} a {receiver?.name || "???"}
            </p>
          </ChatMessageIn>
        ),
      },
    ]);
    setShowSolidarioPicker(false);
  };

  const handleViewRanking = () => {
    const sorted = [...players].sort((a, b) => b.money - a.money);
    setChatLog((prev) => [
      ...prev,
      {
        id: `ranking-${Date.now()}`,
        node: (
          <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
            <p className="font-semibold mb-2">Ranking del grupo:</p>
            <div className="space-y-1">
              {sorted.map((p, i) => {
                const bt = p.businessType as BusinessType;
                const info = bt ? BUSINESS_INFO[bt] : null;
                const isMe = p.identity.toHexString() === myHex;
                return (
                  <div
                    key={p.id.toString()}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${
                      isMe ? "bg-brand-50 border border-brand-200" : "bg-white border border-[#E3E8EF]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-g-400 w-4 text-right font-mono">{i + 1}</span>
                      <span className="text-sm">{info?.emoji}</span>
                      <span className="text-[13px] font-medium text-g-900">{p.name}</span>
                    </div>
                    <span className="font-mono font-bold text-g-900 text-[13px]">
                      ${p.money.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </ChatMessageIn>
        ),
      },
    ]);
  };

  // --- Derived state ---
  const weekPayments = payments.filter((p) => p.week === game.currentWeek);
  const hasLocalPaid = weekPayments.some(
    (p) => p.playerIdentity.toHexString() === myHex
  );
  const hasSentSolidario = solidarioTransfers.some(
    (t) => t.senderIdentity.toHexString() === myHex && t.week === game.currentWeek
  );
  const weekEvent = businessEvents.find(
    (e) => e.playerIdentity.toHexString() === myHex && e.week === game.currentWeek
  );
  const wp = localPlayer.weeklyPayment || 750;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-[#E3E8EF] px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-g-600 hover:text-g-900 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-g-900 truncate">
            {game.groupName}
          </p>
          <p className="text-[11px] text-g-500">
            Semana {game.currentWeek}/{game.weeksTotal} — {timeOfDay.timeIcon} {timeOfDay.dayLabel} — {secondsLeft}s
          </p>
        </div>
      </div>

      {/* Chat stream */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <ChatDivider text={`Semana ${game.currentWeek}`} />

        {chatLog.map((entry) => (
          <div key={entry.id}>{entry.node}</div>
        ))}

        {/* Payment UI (only during action phase, not yet paid) */}
        {game.phase === "action" && !hasLocalPaid && (
          <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
            <p className="font-semibold mb-2">Es hora del pago semanal</p>
            <p className="text-[12px] text-g-500 mb-3">
              Tu pago: ${wp} | Saldo: ${localPlayer.money.toLocaleString()}
              {game.totalMora > 0 && ` | Mora: $${game.totalMora}`}
            </p>
            <div className="space-y-1.5">
              {[
                { choice: "full" as PaymentChoice, label: "Pago completo", amount: wp, emoji: "\u{1F4B0}" },
                ...(game.totalMora > 0 && localPlayer.money >= wp * 2
                  ? [{ choice: "double" as PaymentChoice, label: "Pago doble", amount: wp * 2, emoji: "\u{1F4B0}\u{1F4B0}" }]
                  : []),
                { choice: "partial" as PaymentChoice, label: "Pago parcial", amount: Math.floor(wp * 0.5), emoji: "\u{1FAE3}" },
                { choice: "none" as PaymentChoice, label: "No puedo pagar", amount: 0, emoji: "\u{1F630}" },
              ].map((opt) => (
                <button
                  key={opt.choice}
                  onClick={opt.amount > localPlayer.money ? undefined : () => handlePayment(opt.choice)}
                  disabled={opt.amount > localPlayer.money}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left text-[13px] font-medium transition-colors
                    ${opt.amount > localPlayer.money
                      ? "border-g-200 text-g-300 cursor-not-allowed"
                      : "border-brand-200 text-g-900 hover:bg-brand-50 active:bg-brand-100"
                    }
                  `}
                >
                  <span>{opt.emoji} {opt.label}</span>
                  <span className="font-mono">${opt.amount}</span>
                </button>
              ))}
            </div>
          </ChatMessageIn>
        )}

        {/* Solidario + Share event actions (during action phase) */}
        {game.phase === "action" && (
          <div className="flex gap-2">
            {weekEvent && (
              <button
                onClick={handleShareEvent}
                className="flex-1 text-[12px] text-g-600 font-medium px-3 py-2 border border-g-200 rounded-lg hover:bg-g-50 transition-colors"
              >
                Compartir evento
              </button>
            )}
            {!hasSentSolidario && localPlayer.money >= SOLIDARIO_AMOUNT && (
              <button
                onClick={() => setShowSolidarioPicker(true)}
                className="flex-1 text-[12px] text-brand-600 font-medium px-3 py-2 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
              >
                Solidario ${SOLIDARIO_AMOUNT}
              </button>
            )}
            <button
              onClick={handleViewRanking}
              className="flex-1 text-[12px] text-g-600 font-medium px-3 py-2 border border-g-200 rounded-lg hover:bg-g-50 transition-colors"
            >
              Ranking
            </button>
          </div>
        )}

        {/* Solidario picker */}
        {showSolidarioPicker && (
          <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
            <p className="font-semibold mb-2">Enviar solidario ${SOLIDARIO_AMOUNT}</p>
            <div className="space-y-1.5">
              {players
                .filter((p) => p.identity.toHexString() !== myHex)
                .map((p) => {
                  const bt = p.businessType as BusinessType;
                  const info = bt ? BUSINESS_INFO[bt] : null;
                  return (
                    <button
                      key={p.id.toString()}
                      onClick={() => handleSendSolidario(p.identity.toHexString())}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-g-200 hover:bg-brand-50 transition-colors text-left"
                    >
                      <span className="text-lg">{info?.emoji}</span>
                      <span className="text-[13px] font-medium text-g-900">{p.name}</span>
                    </button>
                  );
                })}
              <button
                onClick={() => setShowSolidarioPicker(false)}
                className="w-full text-[12px] text-g-400 py-1"
              >
                Cancelar
              </button>
            </div>
          </ChatMessageIn>
        )}

        <div ref={scrollRef} />
      </div>
    </div>
  );
}
