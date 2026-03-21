import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import type { BusinessType, PaymentChoice } from "../game/types";
import { BUSINESS_INFO, LOAN_INFO, SOLIDARIO_MIN, SOLIDARIO_MAX, SOLIDARIO_STEP, SOLIDARIO_DEFAULT, g } from "../game/types";
import { Button } from "./ui/button";
import { WAStatusBar, type StatusBarNotification } from "./WhatsApp";
import { useSound, useDarkMode } from "./PageLayout";
import type { DbConnection } from "../module_bindings";
import type {
  Game as GameT,
  Player,
  Payment,
  BusinessEvent,
  SolidarioTransfer,
  SecretObjective,
  ChatMessage,
  WeekResult,
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
  weekResults: readonly WeekResult[];
  onBack: () => void;
  isCreator: boolean;
  onMarkReady: () => void;
  onForceAdvance: () => void;
  onExit?: () => void;
  statusNotifications?: StatusBarNotification[];
}

// --- Reusable card components ---

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

// --- Sub-phase label ---

const SUB_PHASE_LABELS: Record<string, { label: string; desc: string }> = {
  decision: { label: "Decisión", desc: "Revisa eventos, paga y envía solidario" },
  resultado: { label: "Resultado", desc: "Ve cómo le fue al grupo" },
};

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
  chatMessages,
  weekResults,
  onBack,
  isCreator,
  onMarkReady,
  onForceAdvance,
  onExit,
  statusNotifications,
}: GrupaliaAppProps) {
  const [showSolidarioPicker, setShowSolidarioPicker] = useState(false);
  const [showPedirSolidario, setShowPedirSolidario] = useState(false);
  const [solidarioAmount, setSolidarioAmount] = useState(SOLIDARIO_DEFAULT);
  const [pedirAmount, setPedirAmount] = useState(SOLIDARIO_DEFAULT);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const myHex = localPlayer.identity.toHexString();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { soundOn, toggleSound } = useSound();

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [game.currentWeek, game.subPhase, showSolidarioPicker, scrollToBottom]);

  // --- Derived state ---
  const totalPaid = payments
    .filter((p) => p.playerIdentity.toHexString() === myHex)
    .reduce((sum, p) => sum + p.amount, 0);

  const wp = localPlayer.weeklyPayment || 750;
  const lsInfo = LOAN_INFO[localPlayer.loanSize as keyof typeof LOAN_INFO];
  const credit = lsInfo?.credit || 3500;
  const bt = localPlayer.businessType as BusinessType;
  const info = bt ? BUSINESS_INFO[bt] : null;

  const weekPayments = payments.filter((p) => p.week === game.currentWeek);
  const hasLocalPaid = weekPayments.some(
    (p) => p.playerIdentity.toHexString() === myHex
  );
  const hasSentSolidario = solidarioTransfers.some(
    (tr) => tr.senderIdentity.toHexString() === myHex && tr.week === game.currentWeek
  );

  // Current week events for this player
  const myCurrentEvents = businessEvents
    .filter((e) => e.playerIdentity.toHexString() === myHex && e.week === game.currentWeek);

  // All my events across all weeks for history
  const myAllEvents = businessEvents
    .filter((e) => e.playerIdentity.toHexString() === myHex)
    .sort((a, b) => a.week - b.week);

  const hasPendingChoices = myCurrentEvents.some((e) => e.isChoice && !e.choiceMade);
  const isDecisionDone = hasLocalPaid && !hasPendingChoices;

  const myObjective = secretObjectives.find(
    (o) => o.playerIdentity.toHexString() === myHex
  );

  const subPhaseInfo = SUB_PHASE_LABELS[game.subPhase];

  // --- Action handlers ---

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  const handlePayment = (choice: PaymentChoice) => {
    try {
      conn.reducers.makePayment({ choice });
    } catch { /* ignore */ }
    const amount = choice === "full" ? wp : choice === "partial" ? Math.floor(wp * 0.5) : 0;
    const label = choice === "full" ? "Pago completo" : choice === "partial" ? "Pago parcial" : "Sin pago";
    showFeedback(`\u2705 ${label}: $${amount}`);
  };

  const handleRespondEvent = (eventId: bigint, accepted: boolean) => {
    try {
      conn.reducers.respondToEvent({ eventId, accepted });
    } catch { /* ignore */ }
    showFeedback(accepted ? "Aceptaste el evento" : "Rechazaste el evento");
  };

  const handleSendSolidario = (receiverHex: string) => {
    try {
      conn.reducers.sendSolidario({ receiverIdentityHex: receiverHex, amount: solidarioAmount });
    } catch { /* ignore */ }
    const receiver = players.find((p) => p.identity.toHexString() === receiverHex);
    showFeedback(`\u{1F49C} Enviaste $${solidarioAmount} a ${receiver?.name || "???"}`);
    setShowSolidarioPicker(false);
    setSolidarioAmount(SOLIDARIO_DEFAULT);
  };

  return (
    <div className="flex flex-col h-full bg-g-50 relative">
      <WAStatusBar notifications={statusNotifications} className="bg-brand-700 pb-2 mb-0" />
      {/* Header */}
      <div className="bg-white border-b border-g-200 shrink-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center -ml-1 rounded-full text-g-500 hover:bg-g-100 hover:text-g-900 active:bg-g-200 transition-colors cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-g-900 truncate">{game.groupName} ({game.code})</p>
            <p className="text-[11px] text-g-500">
              {game.status === "finished"
                ? "Ciclo terminado"
                : <>Semana {game.currentWeek}/{game.weeksTotal}{subPhaseInfo && ` · ${subPhaseInfo.label}`}</>
              }
            </p>
          </div>
          <button onClick={() => setShowMenu((v) => !v)} className="w-9 h-9 flex items-center justify-center rounded-full text-g-500 hover:bg-g-100 hover:text-g-900 active:bg-g-200 transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>

        {/* Resultado: advance button */}
        {game.status !== "finished" && game.subPhase === "resultado" && (() => {
          let readySet: Set<string>;
          try {
            const arr = JSON.parse(game.readyPlayers);
            readySet = new Set(Array.isArray(arr) ? arr : []);
          } catch { readySet = new Set(); }
          const imReady = readySet.has(myHex);
          return (
            <div className="px-3 pb-2 space-y-1">
              {imReady ? (
                <div className="w-full text-center py-2 text-[12px] text-g-500">
                  Esperando a los demás ({readySet.size}/{players.length})...
                </div>
              ) : (
                <Button
                  onClick={onMarkReady}
                  size="sm"
                  className="w-full text-[12px] font-semibold bg-brand-600 hover:bg-brand-700 text-white cursor-pointer"
                >
                  {game.currentWeek >= game.weeksTotal ? "Ver resultados" : "Siguiente semana"}
                </Button>
              )}
              {isCreator && (
                <Button
                  onClick={onForceAdvance}
                  variant="ghost"
                  size="sm"
                  className="w-full text-[10px] text-g-400 hover:text-g-600 cursor-pointer"
                >
                  Avanzar fase
                </Button>
              )}
            </div>
          );
        })()}
        {/* Creator force advance */}
        {game.status !== "finished" && game.subPhase !== "resultado" && isCreator && (
          <div className="px-3 pb-2">
            <Button
              onClick={onForceAdvance}
              variant="ghost"
              size="sm"
              className="w-full text-[10px] text-g-400 hover:text-g-600 cursor-pointer"
            >
              Avanzar fase
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

        {/* FINISHED STATE */}
        {game.status === "finished" && <FinishedResults
          players={players}
          weekResults={weekResults}
          secretObjectives={secretObjectives}
          game={game}
          myHex={myHex}
          onExit={onExit}
        />}

        {/* Sub-phase banner */}
        {game.status !== "finished" && subPhaseInfo && (
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-g-200" />
            <span className="text-[12px] font-medium text-g-400">{subPhaseInfo.desc}</span>
            <div className="flex-1 h-px bg-g-200" />
          </div>
        )}

        {game.status !== "finished" && <>
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
              <CounterField value={`${localPlayer.score}`} label="Puntos" />
            </div>
          </div>
          <Divider />
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-brand-600 font-medium">{lsInfo?.emoji} Crédito: ${credit.toLocaleString()}</span>
              <span className="text-g-400">·</span>
              <span className="text-g-500">Pago: ${wp}/sem</span>
              <span className="text-g-400">·</span>
              <span className="text-g-500">Ingreso: ${localPlayer.income}/sem</span>
            </div>
            {localPlayer.incomeModPct !== 0 && (
              <p className={`text-[12px] font-medium mt-1 ${localPlayer.incomeModPct > 0 ? "text-ok-600" : "text-err-600"}`}>
                Ventas {localPlayer.incomeModPct > 0 ? "+" : ""}{localPlayer.incomeModPct}%
                {localPlayer.incomeModWeeks > 0 ? ` (${localPlayer.incomeModWeeks} sem restantes)` : " (permanente)"}
              </p>
            )}
            {game.totalMora > 0 && (
              <p className="text-[13px] font-semibold text-err-600 mt-1">
                Mora acumulada: ${game.totalMora}
              </p>
            )}
          </div>
        </Card>

        {/* Live ranking */}
        <Card>
          <div className="px-4 pt-3 pb-1">
            <p className="text-[13px] font-semibold text-g-900">{"\u{1F3C6}"} Ranking</p>
          </div>
          <div className="px-3 pb-3 space-y-1">
            {[...players].sort((a, b) => b.score - a.score).map((p, i) => {
              const pbt = p.businessType as BusinessType;
              const pinfo = pbt ? BUSINESS_INFO[pbt] : null;
              const isMe = p.identity.toHexString() === myHex;
              return (
                <div
                  key={p.id.toString()}
                  className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg text-[12px] ${
                    isMe ? "bg-brand-50 border border-brand-100" : "bg-g-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-g-400 w-3 text-right font-mono">{i + 1}</span>
                    <span>{pinfo?.emoji || "\u2753"}</span>
                    <span className={`font-medium truncate ${isMe ? "text-brand-700" : "text-g-900"}`}>
                      {p.name || "..."}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-g-700 shrink-0">{p.score} pts</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Secret objective */}
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
                Bonus: +{myObjective.bonusScore} pts si lo completas
              </p>
              <p className="text-[11px] text-g-400 mt-1">Solo tú puedes ver esto.</p>
            </div>
          </Card>
        )}

        {/* Current week events with choice UI + share button */}
        {myCurrentEvents.map((ev) => {
          const alreadyShared = chatMessages.some(
            (m) => m.kind === "event" && m.senderIdentity.toHexString() === myHex && m.week === ev.week
          );
          const canShare = game.subPhase === "decision" && !alreadyShared;
          return (
            <Card
              key={ev.id.toString()}
              className={
                ev.isChoice && !ev.choiceMade
                  ? "border-brand-200 bg-brand-50"
                  : ev.moneyDelta > 0
                    ? "bg-ok-50 border-ok-100"
                    : ev.moneyDelta < 0
                      ? "bg-err-50 border-err-100"
                      : ""
              }
            >
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    ev.isChoice && !ev.choiceMade ? "bg-brand-100" :
                    ev.moneyDelta > 0 ? "bg-ok-100" : ev.moneyDelta < 0 ? "bg-err-100" : "bg-g-100"
                  }`}>
                    <span className="text-[14px]">
                      {ev.isChoice && !ev.choiceMade ? "\u2753" :
                       ev.moneyDelta > 0 ? "\u{1F4C8}" : ev.moneyDelta < 0 ? "\u{1F4C9}" : "\u{1F4CB}"}
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold text-g-900">
                    {ev.isChoice && !ev.choiceMade ? "Decisión necesaria" : "Evento de esta semana"}
                  </p>
                </div>
                <p className="text-[14px] text-g-700 leading-snug">{ev.message}</p>

                {/* Passive event result */}
                {!ev.isChoice && ev.moneyDelta !== 0 && (
                  <p className={`text-[13px] font-semibold mt-2 ${ev.moneyDelta > 0 ? "text-ok-600" : "text-err-600"}`}>
                    {ev.moneyDelta > 0 ? "+" : ""}${ev.moneyDelta}
                  </p>
                )}

                {/* Choice event: accept/reject buttons */}
                {ev.isChoice && !ev.choiceMade && game.subPhase === "decision" && (
                  <div className="mt-3 space-y-2">
                    <div className="text-[12px] text-g-500 space-y-1">
                      <p>Costo: <span className="font-semibold text-g-700">${ev.costAmount}</span></p>
                      {ev.benefitPct > 0 && (
                        <p>Beneficio: <span className="font-semibold text-ok-600">+{ev.benefitPct}% ingreso por {ev.benefitDuration === 0 ? "siempre" : `${ev.benefitDuration} sem`}</span></p>
                      )}
                      {ev.penaltyPct < 0 && (
                        <p>Si no pagas: <span className="font-semibold text-err-600">{ev.penaltyPct}% ingreso por {ev.penaltyDuration} sem</span></p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespondEvent(ev.id, true)}
                        disabled={localPlayer.money < ev.costAmount}
                        className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                          localPlayer.money < ev.costAmount
                            ? "bg-g-100 text-g-400 cursor-not-allowed"
                            : "bg-ok-600 text-white hover:bg-ok-700 cursor-pointer"
                        }`}
                      >
                        Aceptar (${ev.costAmount})
                      </button>
                      <button
                        onClick={() => handleRespondEvent(ev.id, false)}
                        className="flex-1 py-2 rounded-lg text-[13px] font-semibold bg-g-100 text-g-700 hover:bg-g-200 transition-colors cursor-pointer"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}

                {/* Choice event: already resolved */}
                {ev.isChoice && ev.choiceMade && (
                  <p className={`text-[13px] font-semibold mt-2 ${ev.accepted ? "text-ok-600" : "text-g-500"}`}>
                    {ev.accepted ? `Aceptaste — $${Math.abs(ev.moneyDelta)}` : "Rechazaste"}
                  </p>
                )}

                {/* Share button — only enabled during decision phase of current week */}
                <button
                  onClick={() => {
                    if (!canShare) return;
                    try { conn.reducers.shareEvent({ week: ev.week }); } catch { /* ignore */ }
                    showFeedback("Evento compartido en WhatsApp");
                  }}
                  disabled={!canShare}
                  className={`mt-3 w-full text-[12px] font-semibold px-3 py-2 border rounded-lg transition-colors ${
                    !canShare
                      ? "text-g-400 border-g-100 bg-g-50 cursor-not-allowed"
                      : "text-g-700 border-g-200 bg-white shadow-[var(--shadow-xs)] hover:bg-g-50 cursor-pointer"
                  }`}
                >
                  {alreadyShared ? "\u2713 Compartido" : "Compartir en WhatsApp"}
                </button>
              </div>
            </Card>
          );
        })}

        {/* DECISION PHASE: Payment card */}
        {game.subPhase === "decision" && !hasLocalPaid && (
          <Card>
            <SectionHeader
              title="Es hora del pago semanal"
              subtitle={`Tu pago: $${wp} | Saldo: $${localPlayer.money.toLocaleString()}${game.totalMora > 0 ? ` | Mora: $${game.totalMora}` : ""}`}
            />
            <div className="px-4 pb-4 space-y-2">
              {[
                { choice: "full" as PaymentChoice, label: "Pago completo", amount: wp, emoji: "\u{1F4B0}" },
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

        {/* DECISION PHASE: done state */}
        {game.subPhase === "decision" && isDecisionDone && (() => {
          let readySet: Set<string>;
          try {
            const arr = JSON.parse(game.readyPlayers);
            readySet = new Set(Array.isArray(arr) ? arr : []);
          } catch { readySet = new Set(); }
          const imReady = readySet.has(myHex);
          return (
            <Card className="bg-ok-50 border-ok-100">
              <div className="px-4 py-4 text-center space-y-2">
                {imReady ? (
                  <>
                    <p className="text-[14px] font-semibold text-ok-700">Listo</p>
                    <p className="text-[12px] text-g-500">Esperando a los demás ({readySet.size}/{players.length})...</p>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] font-semibold text-ok-700">Acciones completadas</p>
                    <Button
                      onClick={onMarkReady}
                      size="sm"
                      className="w-full text-[12px] font-semibold bg-brand-600 hover:bg-brand-700 text-white cursor-pointer"
                    >
                      Siguiente semana
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })()}
        {game.subPhase === "decision" && hasLocalPaid && !isDecisionDone && (
          <Card className="bg-ok-50 border-ok-100">
            <div className="px-4 py-4 text-center">
              <p className="text-[14px] font-semibold text-ok-700">{"\u2705"} Pago registrado</p>
              <p className="text-[12px] text-g-500 mt-1">Revisa tus eventos pendientes</p>
            </div>
          </Card>
        )}

        {/* Pedir solidario picker with amount selector */}
        {showPedirSolidario && (
          <Card>
            <SectionHeader
              title="Pedir solidario"
              subtitle="Elige cuánto necesitas"
            />
            <div className="px-4 pb-4 space-y-3">
              {/* Amount selector */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPedirAmount((a) => Math.max(SOLIDARIO_MIN, a - SOLIDARIO_STEP))}
                  className="w-8 h-8 rounded-full border border-g-200 bg-white text-g-600 font-bold text-[16px] hover:bg-g-50 transition-colors cursor-pointer"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <p className="text-[20px] font-bold text-purple-700 font-mono">${pedirAmount}</p>
                </div>
                <button
                  onClick={() => setPedirAmount((a) => Math.min(SOLIDARIO_MAX, a + SOLIDARIO_STEP))}
                  className="w-8 h-8 rounded-full border border-g-200 bg-white text-g-600 font-bold text-[16px] hover:bg-g-50 transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => {
                  try { conn.reducers.requestSolidario({ amount: pedirAmount }); } catch { /* ignore */ }
                  showFeedback(`🙏 Solicitud de $${pedirAmount} enviada al grupo`);
                  setShowPedirSolidario(false);
                  setPedirAmount(SOLIDARIO_DEFAULT);
                }}
                className="w-full text-[13px] font-semibold py-2.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors cursor-pointer"
              >
                Enviar solicitud
              </button>
              <button
                onClick={() => { setShowPedirSolidario(false); setPedirAmount(SOLIDARIO_DEFAULT); }}
                className="w-full text-[12px] text-g-400 font-medium py-2 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </Card>
        )}

        {/* Solidario picker with amount selector */}
        {showSolidarioPicker && (
          <Card>
            <SectionHeader
              title="Enviar solidario"
              subtitle="Elige cuánto y a quién"
            />
            <div className="px-4 pb-4 space-y-3">
              {/* Amount selector */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSolidarioAmount((a) => Math.max(SOLIDARIO_MIN, a - SOLIDARIO_STEP))}
                  className="w-8 h-8 rounded-full border border-g-200 bg-white text-g-600 font-bold text-[16px] hover:bg-g-50 transition-colors cursor-pointer"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <p className="text-[20px] font-bold text-brand-700 font-mono">${solidarioAmount}</p>
                  <p className="text-[10px] text-g-400">+{5 + Math.floor(solidarioAmount / 100) * 5} pts</p>
                </div>
                <button
                  onClick={() => setSolidarioAmount((a) => Math.min(Math.min(SOLIDARIO_MAX, localPlayer.money), a + SOLIDARIO_STEP))}
                  className="w-8 h-8 rounded-full border border-g-200 bg-white text-g-600 font-bold text-[16px] hover:bg-g-50 transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Player list */}
              <div className="space-y-1.5">
                {players
                  .filter((p) => p.identity.toHexString() !== myHex)
                  .map((p) => {
                    const pbt = p.businessType as BusinessType;
                    const pinfo = pbt ? BUSINESS_INFO[pbt] : null;
                    return (
                      <button
                        key={p.id.toString()}
                        onClick={() => handleSendSolidario(p.identity.toHexString())}
                        disabled={localPlayer.money < solidarioAmount}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                          localPlayer.money < solidarioAmount
                            ? "border-g-100 bg-g-50 text-g-400 cursor-not-allowed"
                            : "border-g-200 bg-white shadow-[var(--shadow-xs)] hover:bg-brand-50 hover:border-brand-200 cursor-pointer"
                        }`}
                      >
                        <span className="text-lg">{pinfo?.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] font-medium text-g-900">{p.name}</span>
                          <p className="text-[10px] text-g-400">${p.money.toLocaleString()}</p>
                        </div>
                      </button>
                    );
                  })}
              </div>
              <button
                onClick={() => { setShowSolidarioPicker(false); setSolidarioAmount(SOLIDARIO_DEFAULT); }}
                className="w-full text-[12px] text-g-400 font-medium py-2 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </Card>
        )}

        {/* DECISION PHASE: Solidario buttons */}
        {game.subPhase === "decision" && (
          <div className="flex gap-2">
            {!hasSentSolidario && localPlayer.money >= SOLIDARIO_MIN && (
              <button
                onClick={() => { setShowSolidarioPicker(s => !s); setShowPedirSolidario(false); }}
                className="flex-1 text-[12px] text-brand-700 font-semibold px-3 py-2.5 border border-brand-200 rounded-lg bg-white shadow-[var(--shadow-xs)] hover:bg-brand-50 transition-colors cursor-pointer"
              >
                {"\u{1F49C}"} Enviar solidario
              </button>
            )}
            <button
              onClick={() => { setShowPedirSolidario(s => !s); setShowSolidarioPicker(false); }}
              className="flex-1 text-[12px] text-purple-700 font-semibold px-3 py-2.5 border border-purple-200 rounded-lg bg-white shadow-[var(--shadow-xs)] hover:bg-purple-50 transition-colors cursor-pointer"
            >
              {"\u{1F64F}"} Pedir solidario
            </button>
          </div>
        )}

        {/* RESULTADO PHASE: Week summary */}
        {game.subPhase === "resultado" && (() => {
          const wr = [...payments].filter((p) => p.week === game.currentWeek);
          const total = wr.reduce((s, p) => s + p.amount, 0);
          const passed = total >= game.targetPayment;
          return (
            <Card className={passed ? "bg-ok-50 border-ok-100" : "bg-err-50 border-err-100"}>
              <div className="px-4 py-4 text-center">
                <p className="text-3xl mb-2">{passed ? "\u2705" : "\u274C"}</p>
                <p className="text-[15px] font-semibold text-g-900">
                  {passed ? "El grupo cumplió!" : "No se completó el pago"}
                </p>
                <p className="text-[13px] text-g-600 mt-1">
                  ${total.toLocaleString()} / ${game.targetPayment.toLocaleString()}
                </p>
              </div>
            </Card>
          );
        })()}

        {/* Event history (past weeks, collapsed) */}
        {myAllEvents.filter((e) => e.week < game.currentWeek).length > 0 && (
          <details className="group">
            <summary className="text-[12px] text-g-400 font-medium cursor-pointer hover:text-g-600 transition-colors py-1">
              Historial de eventos ({myAllEvents.filter((e) => e.week < game.currentWeek).length})
            </summary>
            <div className="space-y-2 mt-2">
              {myAllEvents.filter((e) => e.week < game.currentWeek).map((ev) => (
                <div key={ev.id.toString()} className="text-[12px] text-g-500 px-3 py-2 bg-white rounded-lg border border-g-100">
                  <span className="font-medium text-g-400">S{ev.week}</span> {ev.message}
                  {ev.moneyDelta !== 0 && (
                    <span className={ev.moneyDelta > 0 ? " text-ok-600" : " text-err-600"}>
                      {" "}{ev.moneyDelta > 0 ? "+" : ""}${ev.moneyDelta}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

        </>}

        {/* Feedback toast */}
        {feedbackMessage && (
          <div className="bg-white border border-g-200 rounded-lg shadow-[var(--shadow-sm)] px-4 py-3 text-center">
            <p className="text-[13px] font-medium text-g-700">{feedbackMessage}</p>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Three-dot dropdown menu */}
      {showMenu && (
        <div
          className="absolute inset-0 z-40"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="absolute top-11 right-2 bg-white rounded-lg shadow-xl border border-g-200 py-1 min-w-[180px] z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setShowMenu(false); onBack(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-g-800 hover:bg-g-100 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span>Abrir WhatsApp</span>
            </button>
            <button
              onClick={() => { setShowMenu(false); toggleDark(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-g-800 hover:bg-g-100 cursor-pointer"
            >
              {dark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
              <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
            </button>
            <button
              onClick={() => { setShowMenu(false); toggleSound(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-g-800 hover:bg-g-100 cursor-pointer"
            >
              {soundOn ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              )}
              <span>{soundOn ? "Silenciar" : "Activar sonido"}</span>
            </button>
            {onExit && (
              <button
                onClick={() => { setShowMenu(false); onExit(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span>Salir del juego</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Finished Results Component ---

function FinishedResults({
  players,
  weekResults,
  secretObjectives,
  game,
  myHex,
  onExit,
}: {
  players: readonly Player[];
  weekResults: readonly WeekResult[];
  secretObjectives: readonly SecretObjective[];
  game: GameT;
  myHex: string;
  onExit?: () => void;
}) {
  const confettiFired = useRef(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const totalWeeks = weekResults.length;
  const weeksPassed = weekResults.filter((r) => r.passed).length;
  const weeksMissed = totalWeeks - weeksPassed;
  const graduationStatus =
    weeksMissed === 0 ? "graduado" : weeksMissed <= 3 ? "no_graduado" : "moroso";
  const graduationConfig = {
    graduado: {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-600 mx-auto">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
        </svg>
      ),
      label: "GRADUADAS",
      message: "0 pagos perdidos. El grupo sobrevivi\u00F3 el ciclo!",
      bg: "bg-brand-50",
      border: "border-brand-200",
      textColor: "text-brand-700",
    },
    no_graduado: {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-warn-600 mx-auto">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      label: "NO GRADUADAS",
      message: `${weeksMissed} pagos tard\u00EDos. Sobrevivieron... apenas.`,
      bg: "bg-warn-50",
      border: "border-warn-100",
      textColor: "text-warn-700",
    },
    moroso: {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-err-600 mx-auto">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" /><line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
      label: "MOROSAS",
      message: `${weeksMissed} pagos perdidos. El grupo no sobrevivi\u00F3.`,
      bg: "bg-err-50",
      border: "border-err-100",
      textColor: "text-err-700",
    },
  };
  const grad = graduationConfig[graduationStatus];
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const winnerInfo = winner?.businessType ? BUSINESS_INFO[winner.businessType as BusinessType] : null;

  const isWinnerMe = winner?.identity.toHexString() === myHex;

  useEffect(() => {
    if (confettiFired.current || !isWinnerMe) return;
    confettiFired.current = true;
    const duration = 1200;
    const end = Date.now() + duration;
    const colors = ["#7C3AED", "#B48BFA", "#F7F3FF", "#FFD700", "#12B76A"];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <>
      {/* Winner spotlight */}
      <Card>
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-100/60 via-brand-50/30 to-transparent" />
          <div className="relative px-4 pt-6 pb-5 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500 mx-auto mb-1">
              <path d="M2 4l3 12h14l3-12-6 7-4-9-4 9-6-7z" /><path d="M5 16v2a2 2 0 002 2h10a2 2 0 002-2v-2" />
            </svg>
            <p className="text-[20px] font-bold text-brand-700 mb-2">{winner?.name}</p>
            <p className="text-[28px] font-bold font-mono text-brand-600 leading-tight">
              {winner?.score} pts
            </p>
            <p className="text-[12px] text-g-500 mt-1">
              {winnerInfo?.label} {"\u00B7"} ${winner?.money.toLocaleString()} finales
            </p>
          </div>
        </div>
      </Card>

      {/* Graduation status */}
      <Card>
        <div className={`px-4 py-4 text-center border-l-4 ${grad.border} ${grad.bg} rounded-[var(--radius-card)]`}>
          <div className="mb-2">{grad.icon}</div>
          <p className={`text-[16px] font-bold ${grad.textColor} mb-0.5`}>{grad.label}</p>
          <p className="text-[13px] text-g-600">{grad.message}</p>
          {game.totalMora > 0 && (
            <p className="text-[12px] text-err-600 font-medium mt-2">
              Mora total: ${game.totalMora}
            </p>
          )}
        </div>
      </Card>

      {/* Week summary */}
      <Card>
        <SectionHeader title="Resumen del ciclo" />
        <div className="px-4 pb-3">
          <div className="flex justify-center gap-3 mb-3">
            <CounterField value={`${weeksPassed}`} label="Cumplidos" />
            <CounterField value={`${weeksMissed}`} label="Perdidos" />
            <CounterField value={`${totalWeeks}`} label="Total" />
          </div>
          <div className="flex gap-1 justify-center flex-wrap">
            {weekResults.map((r) => (
              <div
                key={r.week}
                className={`w-7 h-7 rounded-[var(--radius-component)] flex items-center justify-center text-[10px] font-mono font-bold ${
                  r.passed ? "bg-ok-100 text-ok-700" : "bg-err-100 text-err-700"
                }`}
              >
                {r.week}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Final ranking */}
      <Card>
        <SectionHeader title="Ranking final" />
        <div className="px-3 pb-3 space-y-1.5">
          {sortedPlayers.map((p, i) => {
            const pbt = p.businessType as BusinessType;
            const pinfo = pbt ? BUSINESS_INFO[pbt] : null;
            const plsInfo = LOAN_INFO[p.loanSize as keyof typeof LOAN_INFO];
            const isMe = p.identity.toHexString() === myHex;
            const isWinner = i === 0;
            return (
              <div
                key={p.id.toString()}
                className={`flex items-center justify-between py-2 px-3 rounded-[var(--radius-component)] text-[12px] transition-colors ${
                  isWinner
                    ? "bg-brand-50 border border-brand-200 shadow-[var(--shadow-xs)]"
                    : isMe
                      ? "bg-brand-50/50 border border-brand-100"
                      : "bg-g-50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`font-bold w-4 text-right font-mono ${
                    isWinner ? "text-brand-600" : "text-g-400"
                  }`}>
                    {isWinner ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block">
                        <path d="M2 4l3 12h14l3-12-6 7-4-9-4 9-6-7z" /><path d="M5 16v2a2 2 0 002 2h10a2 2 0 002-2v-2" />
                      </svg>
                    ) : <span className="text-[11px]">{i + 1}</span>}
                  </span>
                  <span className="text-sm">{pinfo?.emoji || "?"}</span>
                  <div className="min-w-0">
                    <span className={`font-medium truncate block ${
                      isWinner ? "text-brand-700" : isMe ? "text-brand-600" : "text-g-900"
                    }`}>
                      {p.name || "..."}
                      {isMe && <span className="text-[10px] text-g-400 ml-1">(t{"\u00FA"})</span>}
                    </span>
                    <p className="text-[10px] text-g-500">
                      {pinfo?.label} {"\u00B7"} {plsInfo?.emoji} ${plsInfo?.credit.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={`font-mono font-bold ${isWinner ? "text-brand-700" : "text-g-700"}`}>
                    {p.score} pts
                  </span>
                  <span className="font-mono text-g-400 text-[11px]">${p.money.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Secret objectives reveal */}
      {secretObjectives.length > 0 && (
        <Card>
          <SectionHeader title="Objetivos secretos" subtitle="Revelados al final del ciclo" />
          <div className="px-3 pb-3 space-y-2">
            {secretObjectives.map((obj) => {
              const player = players.find(
                (p) => p.identity.toHexString() === obj.playerIdentity.toHexString()
              );
              return (
                <div
                  key={obj.id.toString()}
                  className={`px-3 py-2.5 rounded-[var(--radius-component)] border ${
                    obj.completed
                      ? "bg-ok-50 border-ok-100"
                      : "bg-g-50 border-g-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-medium text-g-900">{player?.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[var(--radius-pill)] ${
                      obj.completed ? "bg-ok-100 text-ok-700" : "bg-g-100 text-g-500"
                    }`}>
                      {obj.completed ? "CUMPLIDO" : "NO CUMPLIDO"}
                    </span>
                  </div>
                  <p className="text-[12px] text-g-600">{obj.description}</p>
                  {obj.completed && (
                    <p className="text-[11px] text-ok-600 font-medium mt-0.5">
                      +{obj.bonusScore} pts bonus!
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Play again */}
      {onExit && (
        <>
          <Button
            onClick={() => setShowExitConfirm(true)}
            className="w-full py-3 text-[14px] font-semibold bg-brand-600 hover:bg-brand-700 text-white cursor-pointer"
          >
            Jugar de nuevo
          </Button>

          {showExitConfirm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              onClick={() => setShowExitConfirm(false)}
            >
              <div
                className="bg-white rounded-[var(--radius-card)] p-5 mx-6 max-w-xs w-full shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-[16px] font-semibold text-g-900 mb-1">Salir del grupo</p>
                <p className="text-[13px] text-g-600 mb-4">
                  Vas a salir de este grupo y volver al inicio para crear o unirte a otro.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowExitConfirm(false)}
                    variant="outline"
                    className="flex-1 text-[13px] cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={onExit}
                    className="flex-1 text-[13px] bg-brand-600 hover:bg-brand-700 text-white cursor-pointer"
                  >
                    Salir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
