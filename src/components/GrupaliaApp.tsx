import { useState, useRef, useEffect, useCallback } from "react";
import type { BusinessType, PaymentChoice } from "../game/types";
import { BUSINESS_INFO, LOAN_INFO, SOLIDARIO_MIN, SOLIDARIO_MAX, SOLIDARIO_STEP, SOLIDARIO_DEFAULT, g } from "../game/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
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
  onBack: () => void;
  // Progress bar props
  readyCount: number;
  totalPlayers: number;
  isReady: boolean;
  isCreator: boolean;
  onMarkReady: () => void;
  onForceAdvance: () => void;
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
  platica: { label: "Plática", desc: "Revisa eventos, platica y pide solidario" },
  decision: { label: "Decisión", desc: "Paga y envía solidario" },
  resultado: { label: "Resultado", desc: "Ve cómo le fue al grupo" },
};

const SUB_PHASES = [
  { key: "platica", label: "Plática", icon: "\u{1F4AC}" },
  { key: "decision", label: "Decisión", icon: "\u{1F4B0}" },
  { key: "resultado", label: "Resultado", icon: "\u{1F4CA}" },
];

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
  onBack,
  readyCount,
  totalPlayers,
  isReady,
  isCreator,
  onMarkReady,
  onForceAdvance,
}: GrupaliaAppProps) {
  const [showSolidarioPicker, setShowSolidarioPicker] = useState(false);
  const [solidarioAmount, setSolidarioAmount] = useState(SOLIDARIO_DEFAULT);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const myHex = localPlayer.identity.toHexString();

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
    <div className="flex flex-col h-full bg-g-50">
      {/* Header */}
      <div className="bg-white border-b border-g-200 shrink-0">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-g-500 hover:text-g-900 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-g-900 truncate">{game.groupName} ({game.code})</p>
            <p className="text-[11px] text-g-500">
              Semana {game.currentWeek}/{game.weeksTotal}
              {subPhaseInfo && ` · ${subPhaseInfo.label}`}
            </p>
          </div>
        </div>

        {/* Progress bar + actions */}
        {(() => {
          const activeIdx = SUB_PHASES.findIndex((sp) => sp.key === game.subPhase);
          const buttonLabel =
            game.subPhase === "resultado"
              ? game.currentWeek >= game.weeksTotal
                ? "Ver resultados"
                : "Siguiente semana"
              : isReady
                ? "✓ Listo"
                : "Listo";
          return (
            <div className="px-3 pb-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-bold tabular-nums px-1.5 shrink-0">
                  S{game.currentWeek}/{game.weeksTotal}
                </Badge>
                <div className="flex gap-0.5 flex-1">
                  {SUB_PHASES.map((sp, i) => {
                    const isDone = i < activeIdx;
                    const isCurrent = i === activeIdx;
                    return (
                      <div key={sp.key} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                            isCurrent
                              ? "bg-brand-500 shadow-sm shadow-brand-500/40"
                              : isDone
                                ? "bg-brand-500/40"
                                : "bg-g-100"
                          }`}
                        />
                        <span
                          className={`text-[9px] leading-none transition-colors duration-300 ${
                            isCurrent
                              ? "text-brand-600 font-semibold"
                              : isDone
                                ? "text-brand-400/60"
                                : "text-g-400"
                          }`}
                        >
                          {sp.icon} {isCurrent ? sp.label : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <Badge
                  variant={isReady ? "default" : "outline"}
                  className={`text-[10px] tabular-nums px-1.5 shrink-0 ${
                    isReady ? "bg-brand-600 text-white border-brand-600" : "border-g-300 text-g-400"
                  }`}
                >
                  {readyCount}/{totalPlayers}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={onMarkReady}
                  disabled={game.subPhase !== "resultado" && isReady}
                  size="sm"
                  className={`flex-1 text-[12px] font-semibold transition-all cursor-pointer ${
                    game.subPhase === "resultado"
                      ? "bg-brand-600 hover:bg-brand-700 text-white"
                      : isReady
                        ? "bg-brand-100 text-brand-700 border-brand-200"
                        : "bg-brand-600 hover:bg-brand-700 text-white"
                  }`}
                >
                  {buttonLabel}
                </Button>
                {isCreator && (
                  <Button
                    onClick={onForceAdvance}
                    variant="ghost"
                    size="sm"
                    className="text-[10px] text-g-400 hover:text-g-600 shrink-0 cursor-pointer"
                  >
                    Avanzar
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

        {/* Sub-phase banner */}
        {subPhaseInfo && (
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-g-200" />
            <span className="text-[12px] font-medium text-g-400">{subPhaseInfo.desc}</span>
            <div className="flex-1 h-px bg-g-200" />
          </div>
        )}

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
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-g-700">{p.score} pts</span>
                    <span className="font-mono text-g-400 text-[11px]">${p.money.toLocaleString()}</span>
                  </div>
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

        {/* PLATICA/DECISION: Events with choice UI + share button */}
        {(game.subPhase === "platica" || game.subPhase === "decision") && myCurrentEvents.map((ev) => {
          const alreadyShared = chatMessages.some(
            (m) => m.kind === "event" && m.senderIdentity.toHexString() === myHex && m.week === ev.week
          );
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
                {ev.isChoice && !ev.choiceMade && game.subPhase === "platica" && (
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

                {/* Share button */}
                <button
                  onClick={() => {
                    if (alreadyShared) return;
                    try { conn.reducers.shareEvent({ week: ev.week }); } catch { /* ignore */ }
                    showFeedback("Evento compartido en WhatsApp");
                  }}
                  disabled={alreadyShared}
                  className={`mt-3 w-full text-[12px] font-semibold px-3 py-2 border rounded-lg transition-colors ${
                    alreadyShared
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

        {/* DECISION PHASE: already paid confirmation */}
        {game.subPhase === "decision" && hasLocalPaid && (
          <Card className="bg-ok-50 border-ok-100">
            <div className="px-4 py-4 text-center">
              <p className="text-[14px] font-semibold text-ok-700">{"\u2705"} Pago registrado</p>
            </div>
          </Card>
        )}

        {/* DECISION PHASE: Solidario button */}
        {game.subPhase === "decision" && !hasSentSolidario && localPlayer.money >= SOLIDARIO_MIN && (
          <button
            onClick={() => setShowSolidarioPicker(true)}
            className="w-full text-[12px] text-brand-700 font-semibold px-3 py-2.5 border border-brand-200 rounded-lg bg-white shadow-[var(--shadow-xs)] hover:bg-brand-50 transition-colors cursor-pointer"
          >
            {"\u{1F49C}"} Enviar solidario
          </button>
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
