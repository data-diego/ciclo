import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import type { BusinessType } from "../game/types";
import { BUSINESS_INFO } from "../game/types";
import type {
  Game as GameT,
  Player,
  Payment,
  WeekResult,
} from "../module_bindings/types";

interface GrupaliaAppProps {
  game: GameT;
  localPlayer: Player;
  players: readonly Player[];
  payments: readonly Payment[];
  weekResults: readonly WeekResult[];
  onBack: () => void;
}

// --- Helpers ---

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function InitialsAvatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

// --- Chat message components (Figma-inspired) ---

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
      {avatar || (
        <InitialsAvatar name={sender} color={getAvatarColor(sender)} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13px] font-medium text-g-700 truncate">
            {sender}
          </span>
          <span className="text-[11px] text-g-500 shrink-0">
            {time || formatTime()}
          </span>
        </div>
        <div className="bg-[#F8FAFC] border border-[#E3E8EF] rounded-br-lg rounded-bl-lg rounded-tr-lg px-3 py-2">
          <div className="text-[14px] text-g-900 leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMessageOut({
  time,
  children,
}: {
  time?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-end pl-8">
      <div className="max-w-[80%]">
        <div className="flex items-center gap-2 mb-1 justify-end">
          <span className="text-[13px] font-medium text-g-700">Tu</span>
          <span className="text-[11px] text-g-500">{time || formatTime()}</span>
        </div>
        <div className="bg-white border border-[#E3E8EF] rounded-bl-lg rounded-br-lg rounded-tl-lg px-3 py-2">
          <div className="text-[14px] text-g-900 leading-relaxed">
            {children}
          </div>
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


// --- Chat log entry ---

interface ChatEntry {
  id: string;
  node: ReactNode;
}

// --- Grupalia bot avatar ---

function GrupaliaAvatar() {
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-brand-200">
      <img src="/icon.png" alt="Grupalia" className="w-full h-full object-cover" />
    </div>
  );
}

// --- Main component ---

export function GrupaliaApp({
  game,
  localPlayer,
  players,
  payments,
  weekResults,
  onBack,
}: GrupaliaAppProps) {
  const [chatLog, setChatLog] = useState<ChatEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Build initial messages on mount
  useEffect(() => {
    const entries: ChatEntry[] = [];
    const bt = localPlayer.businessType as BusinessType;
    const info = bt ? BUSINESS_INFO[bt] : null;

    entries.push({
      id: "welcome",
      node: (
        <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
          Hola <strong>{localPlayer.name}</strong>! {info?.emoji} Bienvenida a tu panel de Grupalia.
        </ChatMessageIn>
      ),
    });

    // Stats card
    const totalPaid = payments
      .filter((p) => p.playerIdentity.toHexString() === localPlayer.identity.toHexString())
      .reduce((sum, p) => sum + p.amount, 0);

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

    entries.push({
      id: "week-info",
      node: (
        <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
          Semana <strong>{game.currentWeek}</strong> de{" "}
          <strong>{game.weeksTotal}</strong>. Usa los botones de abajo para ver
          tus pagos o el ranking del grupo.
        </ChatMessageIn>
      ),
    });

    setChatLog(entries);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [chatLog.length, scrollToBottom]);

  // Button handlers that add messages to the chat
  const handleViewPayments = () => {
    // append payment view to chat
    const myHex = localPlayer.identity.toHexString();

    setChatLog((prev) => [
      ...prev,
      {
        id: `req-payments-${Date.now()}`,
        node: <ChatMessageOut>Ver mis pagos</ChatMessageOut>,
      },
      {
        id: `payments-${Date.now()}`,
        node: (
          <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
            <p className="font-semibold mb-2">Calendario de pagos:</p>
            <div className="space-y-1.5">
              {Array.from({ length: game.weeksTotal }, (_, i) => {
                const week = i + 1;
                const result = weekResults.find((r) => r.week === week);
                const myPayment = payments.find(
                  (p) => p.week === week && p.playerIdentity.toHexString() === myHex
                );

                let status: string;
                let statusClass: string;
                if (week === game.currentWeek) {
                  status = myPayment ? "Pagado" : "En curso";
                  statusClass = myPayment
                    ? "bg-ok-50 text-ok-700 border-ok-100"
                    : "bg-brand-50 text-brand-700 border-brand-200";
                } else if (result) {
                  status = result.passed || (myPayment && myPayment.choice !== "none")
                    ? "Pagado"
                    : "Atrasado";
                  statusClass = status === "Pagado"
                    ? "bg-ok-50 text-ok-700 border-ok-100"
                    : "bg-red-50 text-red-700 border-red-200";
                } else {
                  status = "Pendiente";
                  statusClass = "bg-g-50 text-g-600 border-g-200";
                }

                return (
                  <div
                    key={week}
                    className={`
                      flex items-center justify-between px-2.5 py-1.5 rounded-lg border
                      ${week === game.currentWeek ? "border-brand-300 bg-brand-50/30" : "border-[#E3E8EF] bg-white"}
                    `}
                  >
                    <span className="text-[13px] font-medium text-g-900">
                      #{week}
                      {myPayment ? ` — $${myPayment.amount}` : " — $750"}
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusClass}`}
                    >
                      {status}
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

  const handleViewRanking = () => {
    // append ranking view to chat
    const sorted = [...players].sort((a, b) => b.money - a.money);

    setChatLog((prev) => [
      ...prev,
      {
        id: `req-ranking-${Date.now()}`,
        node: <ChatMessageOut>Ver ranking</ChatMessageOut>,
      },
      {
        id: `ranking-${Date.now()}`,
        node: (
          <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
            <p className="font-semibold mb-2">Ranking del grupo:</p>
            <div className="space-y-1">
              {sorted.map((p, i) => {
                const bt = p.businessType as BusinessType;
                const info = bt ? BUSINESS_INFO[bt] : null;
                const isMe =
                  p.identity.toHexString() === localPlayer.identity.toHexString();

                return (
                  <div
                    key={p.id.toString()}
                    className={`
                      flex items-center justify-between px-2.5 py-1.5 rounded-lg
                      ${isMe ? "bg-brand-50 border border-brand-200" : "bg-white border border-[#E3E8EF]"}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-g-400 w-4 text-right font-mono">
                        {i + 1}
                      </span>
                      <span className="text-sm">{info?.emoji}</span>
                      <span className="text-[13px] font-medium text-g-900">
                        {p.name}
                        {p.role === "presidenta" && (
                          <span className="ml-1 text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded-full">
                            P
                          </span>
                        )}
                      </span>
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

  const handleViewMembers = () => {
    setChatLog((prev) => [
      ...prev,
      {
        id: `req-members-${Date.now()}`,
        node: <ChatMessageOut>Ver grupo</ChatMessageOut>,
      },
      {
        id: `members-${Date.now()}`,
        node: (
          <ChatMessageIn sender="Grupalia" avatar={<GrupaliaAvatar />}>
            <p className="font-semibold mb-2">
              {game.groupName} ({game.code})
            </p>
            <p className="text-[12px] text-g-500 mb-2">
              {players.length} integrantes &middot; Semana {game.currentWeek}/
              {game.weeksTotal}
            </p>
            <div className="space-y-1">
              {players.map((p) => {
                const bt = p.businessType as BusinessType;
                const info = bt ? BUSINESS_INFO[bt] : null;
                const weekPayment = payments.find(
                  (pay) =>
                    pay.week === game.currentWeek &&
                    pay.playerIdentity.toHexString() === p.identity.toHexString()
                );

                return (
                  <div
                    key={p.id.toString()}
                    className="flex items-center justify-between px-2 py-1 rounded-lg bg-white border border-[#E3E8EF]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{info?.emoji}</span>
                      <span className="text-[13px] text-g-900">{p.name}</span>
                    </div>
                    {p.role === "presidenta" ? (
                      <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                        Presidenta
                      </span>
                    ) : weekPayment ? (
                      <span className="text-[10px] bg-ok-50 text-ok-700 px-2 py-0.5 rounded-full font-medium">
                        Pago ${weekPayment.amount}
                      </span>
                    ) : (
                      <span className="text-[10px] text-g-400">Pendiente</span>
                    )}
                  </div>
                );
              })}
            </div>
          </ChatMessageIn>
        ),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-[#E3E8EF] px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-g-600 hover:text-g-900 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-brand-200 shrink-0">
          <img src="/icon.png" alt="Grupalia" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-g-900 truncate">
            Grupalia
          </p>
          <p className="text-[11px] text-g-500">
            Semana {game.currentWeek}/{game.weeksTotal}
          </p>
        </div>
      </div>

      {/* Chat stream */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <ChatDivider text="Hoy" />

        {chatLog.map((entry) => (
          <div key={entry.id}>{entry.node}</div>
        ))}

        <div ref={scrollRef} />
      </div>

      {/* Action buttons (no text input) */}
      <div className="border-t border-[#E3E8EF] bg-white px-3 py-3">
        <div className="flex gap-2">
          <ActionButton
            onClick={handleViewPayments}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
            label="Pagos"
          />
          <ActionButton
            onClick={handleViewRanking}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
            label="Ranking"
          />
          <ActionButton
            onClick={handleViewMembers}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            label="Grupo"
          />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="
        flex-1 flex items-center justify-center gap-1.5
        bg-white border border-[#CDD5DF] rounded-lg
        px-3 py-2.5 text-[13px] font-semibold text-g-700
        hover:bg-g-50 active:bg-g-100 transition-colors
        shadow-sm
      "
    >
      {icon}
      {label}
    </button>
  );
}
