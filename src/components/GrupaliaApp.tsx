import { useState, useRef, useEffect, useCallback } from "react";
import type { BusinessType, PaymentChoice } from "../game/types";
import { BUSINESS_INFO, LOAN_INFO, SOLIDARIO_AMOUNT, TASA_BY_DIFFICULTY, TASA_PER_MIL, calcTotalPayback, g } from "../game/types";
import type { TimeOfDay } from "../game/useTimeOfDay";
import type { DbConnection } from "../module_bindings";
import type {
  Game as GameT,
  Player,
  Payment,
  BusinessEvent,
  SolidarioTransfer,
  SecretObjective,
  ChatMessage,
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
  chatMessages: readonly ChatMessage[];
  secondsLeft: number;
  timeOfDay: TimeOfDay;
  onBack: () => void;
}

// --- Reusable card components (Untitled UI style) ---

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-g-200 rounded-[var(--radius-card)] shadow-[var(--shadow-xs)] overflow-clip ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 pt-4 pb-2">
      <p className="text-[15px] font-semibold text-g-900 leading-snug">{title}</p>
      {subtitle && <p className="text-[13px] text-g-500 mt-0.5 leading-snug">{subtitle}</p>}
    </div>
  );
}

function CounterField({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-g-50 border border-g-200 rounded-[10px] shadow-[var(--shadow-xs)] px-2 py-1 min-w-[56px] text-center">
        <p className="text-[16px] font-medium text-g-700 font-mono leading-7">{value}</p>
      </div>
      <p className="text-[12px] text-g-500">{label}</p>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-g-200 mx-4" />;
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
  chatMessages,
  onBack,
}: GrupaliaAppProps) {
  const [showSolidarioPicker, setShowSolidarioPicker] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const myHex = localPlayer.identity.toHexString();

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [game.currentWeek, showSolidarioPicker, scrollToBottom]);

  // --- Derived state ---
  const totalPaid = payments
    .filter((p) => p.playerIdentity.toHexString() === myHex)
    .reduce((sum, p) => sum + p.amount, 0);

  const wp = localPlayer.weeklyPayment || 750;
  const lsInfo = LOAN_INFO[localPlayer.loanSize as keyof typeof LOAN_INFO];
  const credit = lsInfo?.credit || 3500;
  const gameTasa = TASA_BY_DIFFICULTY[game.difficulty as keyof typeof TASA_BY_DIFFICULTY] || TASA_PER_MIL;
  const totalPayback = calcTotalPayback(credit, gameTasa);
  const bt = localPlayer.businessType as BusinessType;
  const info = bt ? BUSINESS_INFO[bt] : null;

  const weekPayments = payments.filter((p) => p.week === game.currentWeek);
  const hasLocalPaid = weekPayments.some(
    (p) => p.playerIdentity.toHexString() === myHex
  );
  const hasSentSolidario = solidarioTransfers.some(
    (t) => t.senderIdentity.toHexString() === myHex && t.week === game.currentWeek
  );

  // All my events across all weeks, sorted by week
  const myEvents = businessEvents
    .filter((e) => e.playerIdentity.toHexString() === myHex)
    .sort((a, b) => a.week - b.week);

  const myObjective = secretObjectives.find(
    (o) => o.playerIdentity.toHexString() === myHex
  );

  // --- Action handlers ---

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  const handlePayment = (choice: PaymentChoice) => {
    try {
      conn.reducers.makePayment({ choice });
    } catch {
      // handled by toast in parent
    }
    const amount = choice === "full" ? wp : choice === "double" ? wp * 2 : choice === "partial" ? Math.floor(wp * 0.5) : 0;
    const label = choice === "full" ? "Pago completo" : choice === "double" ? "Pago doble" : choice === "partial" ? "Pago parcial" : "Sin pago";
    showFeedback(`\u2705 ${label}: $${amount}`);
  };

  const handleShareEvent = () => {
    try {
      conn.reducers.shareEvent({ week: game.currentWeek });
    } catch {
      // ignore
    }
    showFeedback("Evento compartido en WhatsApp");
  };

  const handleSendSolidario = (receiverHex: string) => {
    try {
      conn.reducers.sendSolidario({ receiverIdentityHex: receiverHex });
    } catch {
      // ignore
    }
    const receiver = players.find((p) => p.identity.toHexString() === receiverHex);
    showFeedback(`\u{1F49C} Enviaste $${SOLIDARIO_AMOUNT} a ${receiver?.name || "???"}`);
    setShowSolidarioPicker(false);
  };

  return (
    <div className="flex flex-col h-full bg-g-50">
      {/* Header */}
      <div className="bg-white border-b border-g-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-g-500 hover:text-g-900 transition-colors">
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

        {/* Week indicator */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-g-200" />
          <span className="text-[12px] font-medium text-g-400">Semana {game.currentWeek} de {game.weeksTotal}</span>
          <div className="flex-1 h-px bg-g-200" />
        </div>

        {/* Stats card */}
        <Card>
          <SectionHeader
            title={`${g(localPlayer.pronoun, "Bienvenido", "Bienvenida", "Bienvenide")}, ${localPlayer.name} ${info?.emoji || ""}`}
            subtitle="Tu resumen del ciclo"
          />
          <div className="px-4 pb-2">
            <div className="flex justify-center gap-3">
              <CounterField value={`$${localPlayer.money.toLocaleString()}`} label="Saldo" />
              <CounterField value={`$${totalPaid.toLocaleString()}`} label="Pagado" />
              <CounterField value={`$${wp}`} label="Semanal" />
            </div>
          </div>
          <Divider />
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-brand-600 font-medium">{lsInfo?.emoji} Crédito: ${credit.toLocaleString()}</span>
              <span className="text-g-400">·</span>
              <span className="text-g-500">Total: ${totalPayback.toLocaleString()}</span>
            </div>
            {game.totalMora > 0 && (
              <p className="text-[13px] font-semibold text-err-600 mt-1">
                Mora acumulada: ${game.totalMora}
              </p>
            )}
          </div>
        </Card>

        {/* Secret objective card */}
        {myObjective && (
          <Card>
            <div className="px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <span className="text-[14px]">{"\u{1F3AF}"}</span>
                </div>
                <p className="text-[15px] font-semibold text-g-900">Objetivo secreto</p>
              </div>
              <p className="text-[14px] text-g-700 leading-snug">{myObjective.description}</p>
              <p className="text-[12px] text-brand-600 mt-2 font-medium">
                Bonus: +${myObjective.bonusMoney} si lo completas
              </p>
              <p className="text-[11px] text-g-400 mt-1">Solo tú puedes ver esto.</p>
            </div>
          </Card>
        )}

        {/* All week events (history + current) */}
        {myEvents.map((ev) => {
          const isCurrent = ev.week === game.currentWeek;
          return (
            <Card
              key={ev.id.toString()}
              className={
                ev.moneyDelta > 0
                  ? "bg-ok-50 border-ok-100"
                  : ev.moneyDelta < 0
                    ? "bg-err-50 border-err-100"
                    : ""
              }
            >
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    ev.moneyDelta > 0 ? "bg-ok-100" : ev.moneyDelta < 0 ? "bg-err-100" : "bg-g-100"
                  }`}>
                    <span className="text-[14px]">
                      {ev.moneyDelta > 0 ? "\u{1F4C8}" : ev.moneyDelta < 0 ? "\u{1F4C9}" : "\u{1F4CB}"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-g-900">
                      {isCurrent ? "Evento de esta semana" : `Semana ${ev.week}`}
                    </p>
                  </div>
                </div>
                <p className="text-[14px] text-g-700 leading-snug">{ev.message}</p>
                {ev.moneyDelta !== 0 && (
                  <p className={`text-[13px] font-semibold mt-2 ${
                    ev.moneyDelta > 0 ? "text-ok-600" : "text-err-600"
                  }`}>
                    {ev.moneyDelta > 0 ? "+" : ""}${ev.moneyDelta}
                  </p>
                )}
                {(() => {
                  const isCurrWeek = ev.week === game.currentWeek;
                  const alreadyShared = chatMessages.some(
                    (m) => m.kind === "event" &&
                      m.senderIdentity.toHexString() === myHex &&
                      m.week === ev.week
                  );
                  const canShare = game.phase === "action" && isCurrWeek && !alreadyShared;
                  return (game.phase === "action" || alreadyShared) && (
                    <button
                      onClick={() => {
                        if (!canShare) return;
                        try {
                          conn.reducers.shareEvent({ week: ev.week });
                        } catch { /* ignore */ }
                        showFeedback("Evento compartido en WhatsApp");
                      }}
                      disabled={!canShare}
                      className={`mt-3 w-full text-[12px] font-semibold px-3 py-2 border rounded-lg transition-colors ${
                        canShare
                          ? "text-g-700 border-g-200 bg-white shadow-[var(--shadow-xs)] hover:bg-g-50 cursor-pointer"
                          : "text-g-400 border-g-100 bg-g-50 cursor-not-allowed"
                      }`}
                    >
                      {alreadyShared ? "✓ Compartido" : "Compartir evento en WhatsApp"}
                    </button>
                  );
                })()}
              </div>
            </Card>
          );
        })}

        {/* Payment card (only during action phase, not yet paid) */}
        {game.phase === "action" && !hasLocalPaid && (
          <Card>
            <SectionHeader
              title="Es hora del pago semanal"
              subtitle={`Tu pago: $${wp} | Saldo: $${localPlayer.money.toLocaleString()}${game.totalMora > 0 ? ` | Mora: $${game.totalMora}` : ""}`}
            />
            <div className="px-4 pb-4 space-y-2">
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
                    w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left text-[13px] font-semibold transition-colors
                    ${opt.amount > localPlayer.money
                      ? "border-g-200 text-g-300 cursor-not-allowed bg-g-50"
                      : "border-g-200 text-g-900 hover:bg-brand-50 hover:border-brand-200 active:bg-brand-100 bg-white shadow-[var(--shadow-xs)]"
                    }
                  `}
                >
                  <span>{opt.emoji} {opt.label}</span>
                  <span className="font-mono text-g-600">${opt.amount}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Solidario button (during action phase) */}
        {game.phase === "action" && !hasSentSolidario && localPlayer.money >= SOLIDARIO_AMOUNT && (
          <button
            onClick={() => setShowSolidarioPicker(true)}
            className="w-full text-[12px] text-brand-700 font-semibold px-3 py-2.5 border border-brand-200 rounded-lg bg-white shadow-[var(--shadow-xs)] hover:bg-brand-50 transition-colors"
          >
            Solidario ${SOLIDARIO_AMOUNT}
          </button>
        )}

        {/* Solidario picker */}
        {showSolidarioPicker && (
          <Card>
            <SectionHeader
              title={`Enviar solidario $${SOLIDARIO_AMOUNT}`}
              subtitle="Elige a quién ayudar"
            />
            <div className="px-4 pb-4 space-y-1.5">
              {players
                .filter((p) => p.identity.toHexString() !== myHex)
                .map((p) => {
                  const pbt = p.businessType as BusinessType;
                  const pinfo = pbt ? BUSINESS_INFO[pbt] : null;
                  return (
                    <button
                      key={p.id.toString()}
                      onClick={() => handleSendSolidario(p.identity.toHexString())}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-g-200 bg-white shadow-[var(--shadow-xs)] hover:bg-brand-50 hover:border-brand-200 transition-colors text-left"
                    >
                      <span className="text-lg">{pinfo?.emoji}</span>
                      <span className="text-[13px] font-medium text-g-900">{p.name}</span>
                    </button>
                  );
                })}
              <button
                onClick={() => setShowSolidarioPicker(false)}
                className="w-full text-[12px] text-g-400 font-medium py-2"
              >
                Cancelar
              </button>
            </div>
          </Card>
        )}

        {/* Feedback toast */}
        {feedbackMessage && (
          <div className="bg-white border border-g-200 rounded-lg shadow-[var(--shadow-sm)] px-4 py-3 text-center">
            <p className="text-[13px] font-medium text-g-700">{feedbackMessage}</p>
          </div>
        )}

        <div ref={scrollRef} />
      </div>
    </div>
  );
}
