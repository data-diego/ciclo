import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { BusinessType } from "../game/types";
import { BUSINESS_INFO, LOAN_INFO } from "../game/types";
import { useTimeOfDay } from "../game/useTimeOfDay";
import { usePromoterMessages } from "../game/usePromoterMessages";
import { Android } from "../components/Android";
import {
  WAStatusBar,
  WAHeader,
  WADateDivider,
  WAMessageIn,
  WAMessageOut,
  WASystemMessage,
  WAInputBar,
  WAToast,
} from "../components/WhatsApp";
import { WAGameStatus } from "../components/WAGameStatus";
import { StickerPicker, StickerBubble } from "../components/StickerPicker";
import { AppDock } from "../components/AppDock";
import { GrupaliaApp } from "../components/GrupaliaApp";
import { useSound, HEADER_CENTER_PORTAL_ID } from "../components/PageLayout";
import type { DbConnection } from "../module_bindings";
import type { Identity } from "spacetimedb";
import type {
  Game as GameT,
  Player,
  Payment,
  WeekResult,
  ChatMessage,
  CustomSticker,
  BusinessEvent,
  SolidarioTransfer,
  SecretObjective,
} from "../module_bindings/types";

// --- Props ---

interface GameProps {
  conn: DbConnection;
  identity: Identity;
  game: GameT;
  players: readonly Player[];
  payments: readonly Payment[];
  weekResults: readonly WeekResult[];
  chatMessages: readonly ChatMessage[];
  customStickers: readonly CustomSticker[];
  businessEvents: readonly BusinessEvent[];
  solidarioTransfers: readonly SolidarioTransfer[];
  secretObjectives: readonly SecretObjective[];
}

// --- Helpers ---

function formatTime(ts?: number): string {
  const d = new Date(ts ?? Date.now());
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function GrupaliaAvatar() {
  return (
    <img src="/ciclogo.png" alt="Grupalia" className="w-full h-full object-cover" />
  );
}

function useToast(duration = 3000) {
  const [state, setState] = useState({ message: "", visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(
    (message: string) => {
      clearTimeout(timerRef.current);
      setState({ message, visible: true });
      timerRef.current = setTimeout(
        () => setState((s) => ({ ...s, visible: false })),
        duration
      );
    },
    [duration]
  );

  return { ...state, show };
}

// --- Phase timer hook (uses SpacetimeDB game state) ---

function usePhaseTimer(
  game: GameT,
  conn: DbConnection,
  isCreator: boolean
) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Number(game.phaseEndsAt) - Date.now());
      setTimeLeft(remaining);

      if (remaining <= 0 && isCreator) {
        conn.reducers.advancePhase({});
      }
    }, 200);

    return () => clearInterval(interval);
  }, [game.phaseEndsAt, game.phase, isCreator, conn]);

  const secondsLeft = Math.ceil(timeLeft / 1000);
  return { secondsLeft, isUrgent: secondsLeft <= 10 };
}

// --- Main component (app switcher) ---

export function Game({
  conn,
  identity,
  game,
  players,
  payments,
  chatMessages,
  customStickers,
  businessEvents,
  solidarioTransfers,
  secretObjectives,
}: GameProps) {
  const myHex = identity.toHexString();
  const localPlayer = players.find((p) => p.identity.toHexString() === myHex);

  const isCreator = game.creator.toHexString() === myHex;
  const { secondsLeft, isUrgent } = usePhaseTimer(game, conn, isCreator);
  const timeOfDay = useTimeOfDay(game.phase, secondsLeft);

  // Promoter messages (computed at top level to track notifications)
  const weekPayments = payments.filter((p) => p.week === game.currentWeek);
  const totalPaidThisWeek = weekPayments.reduce((sum, p) => sum + p.amount, 0);
  const promoterMessages = usePromoterMessages(
    game.phase,
    secondsLeft,
    weekPayments.length,
    players.length,
    game.targetPayment,
    totalPaidThisWeek,
    game.totalMora,
  );

  // Persist promoter messages to DB — only the creator sends them, one at a time
  const sentPromoterRef = useRef<Set<string>>(new Set());
  const lastPromoterMsg = promoterMessages.length > 0 ? promoterMessages[promoterMessages.length - 1] : null;
  useEffect(() => {
    if (game.phase !== "action" || !isCreator || !lastPromoterMsg) return;
    const key = `w${game.currentWeek}-${lastPromoterMsg.id}`;
    if (!sentPromoterRef.current.has(key)) {
      sentPromoterRef.current.add(key);
      conn.reducers.sendChatMessage({ content: lastPromoterMsg.text, kind: "promoter" });
    }
  }, [lastPromoterMsg?.id, game.phase, game.currentWeek, isCreator]);

  // App switching state
  const [activeApp, setActiveApp] = useState<"whatsapp" | "grupalia">("whatsapp");
  const { soundOn } = useSound();

  // Notification tracking
  const [seenMsgCount, setSeenMsgCount] = useState(chatMessages.length);
  const [seenPromoterCount, setSeenPromoterCount] = useState(0);
  const [buzzApp, setBuzzApp] = useState<string | null>(null);
  const notifSoundRef = useRef<HTMLAudioElement | null>(null);
  const grupaliaNotifRef = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sounds
  useEffect(() => {
    notifSoundRef.current = new Audio("/1.mp3");
    notifSoundRef.current.volume = 0.5;
    grupaliaNotifRef.current = new Audio("/2.mp3");
    grupaliaNotifRef.current.volume = 0.5;
  }, []);

  // When new chat messages arrive while not in WhatsApp, buzz + play sound
  useEffect(() => {
    if (chatMessages.length > seenMsgCount && activeApp !== "whatsapp") {
      if (soundOn) notifSoundRef.current?.play().catch(() => {});
      setBuzzApp("whatsapp");
      const timer = setTimeout(() => setBuzzApp(null), 700);
      return () => clearTimeout(timer);
    }
  }, [chatMessages.length, seenMsgCount, activeApp, soundOn]);

  // When new promoter messages appear while not in WhatsApp, buzz + play sound
  useEffect(() => {
    if (promoterMessages.length > seenPromoterCount && activeApp !== "whatsapp") {
      if (soundOn) notifSoundRef.current?.play().catch(() => {});
      setBuzzApp("whatsapp");
      const timer = setTimeout(() => setBuzzApp(null), 700);
      return () => clearTimeout(timer);
    }
  }, [promoterMessages.length, seenPromoterCount, activeApp, soundOn]);

  // When entering WhatsApp, mark all messages as seen
  useEffect(() => {
    if (activeApp === "whatsapp") {
      setSeenMsgCount(chatMessages.length);
      setSeenPromoterCount(promoterMessages.length);
    }
  }, [activeApp, chatMessages.length, promoterMessages.length]);

  // Grupalia notification on phase change
  const prevPhaseKeyRef = useRef<string>("");
  useEffect(() => {
    const phaseKey = `${game.currentWeek}-${game.phase}`;
    if (prevPhaseKeyRef.current && prevPhaseKeyRef.current !== phaseKey) {
      if (soundOn) grupaliaNotifRef.current?.play().catch(() => {});
      setBuzzApp("grupalia");
      setTimeout(() => setBuzzApp(null), 700);
    }
    prevPhaseKeyRef.current = phaseKey;
  }, [game.currentWeek, game.phase, soundOn]);

  const unreadChat = chatMessages.length - seenMsgCount;
  const unreadPromoter = promoterMessages.length - seenPromoterCount;
  const unreadCount = activeApp === "whatsapp" ? 0 : Math.max(0, unreadChat + unreadPromoter);

  if (!localPlayer) return null;

  const portalTarget = document.getElementById(HEADER_CENTER_PORTAL_ID);

  const whatsappIcon = (
    <div className="w-full h-full bg-[#25D366] flex items-center justify-center">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </div>
  );
  const grupaliaIcon = (
    <img src="/icon.png" alt="Grupalia" className="w-full h-full object-cover" />
  );

  const dock = (
    <AppDock
      buzzAppId={buzzApp}
      apps={[
        {
          id: "whatsapp",
          label: "WhatsApp",
          icon: whatsappIcon,
          badge: unreadCount > 0 ? unreadCount : undefined,
          active: activeApp === "whatsapp",
          ringColor: "#25D366",
          onClick: () => setActiveApp("whatsapp"),
        },
        {
          id: "grupalia",
          label: "Grupalia",
          icon: grupaliaIcon,
          active: activeApp === "grupalia",
          onClick: () => setActiveApp("grupalia"),
        },
      ]}
    />
  );

  return (
    <>
      {portalTarget && createPortal(dock, portalTarget)}

      <div className="flex items-center justify-center flex-1 min-h-0 pt-1 pb-2 md:pt-3 md:pb-6 overflow-x-auto">

      <div className="shrink-0 h-full">
      <Android className="drop-shadow-2xl">
        {activeApp === "whatsapp" && (
          <WhatsAppChat
            conn={conn}
            identity={identity}
            game={game}
            players={players}
            payments={payments}
            chatMessages={chatMessages}
            customStickers={customStickers}
            secondsLeft={secondsLeft}
            isUrgent={isUrgent}
            timeOfDay={timeOfDay}
            promoterMessages={promoterMessages}
            onBack={() => setActiveApp("grupalia")}
          />
        )}

        {activeApp === "grupalia" && (
          <GrupaliaApp
            conn={conn}
            game={game}
            localPlayer={localPlayer}
            players={players}
            payments={payments}
            businessEvents={businessEvents}
            solidarioTransfers={solidarioTransfers}
            secretObjectives={secretObjectives}
            chatMessages={chatMessages}
            secondsLeft={secondsLeft}
            timeOfDay={timeOfDay}
            onBack={() => setActiveApp("whatsapp")}
          />
        )}
      </Android>
      </div>
    </div>
    </>
  );
}

// --- WhatsApp Chat (PURE SOCIAL — no game mechanics) ---

function WhatsAppChat({
  conn,
  identity,
  game,
  players,
  payments,
  chatMessages,
  customStickers,
  secondsLeft,
  isUrgent,
  timeOfDay,
  promoterMessages,
  onBack,
}: {
  conn: DbConnection;
  identity: Identity;
  game: GameT;
  players: readonly Player[];
  payments: readonly Payment[];
  chatMessages: readonly ChatMessage[];
  customStickers: readonly CustomSticker[];
  secondsLeft: number;
  isUrgent: boolean;
  timeOfDay: ReturnType<typeof useTimeOfDay>;
  promoterMessages: import("../game/usePromoterMessages").PromoterMessage[];
  onBack: () => void;
}) {
  const myHex = identity.toHexString();
  const localPlayer = players.find((p) => p.identity.toHexString() === myHex);

  const weekPayments = payments.filter((p) => p.week === game.currentWeek);

  // Chat input state
  const [chatInput, setChatInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const toast = useToast();

  // Scroll management
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);

  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    const onScroll = () => {
      isNearBottom.current =
        el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (isNearBottom.current) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages.length, promoterMessages.length, scrollToBottom]);

  const handleSendChat = (text: string) => {
    if (!text.trim()) return;
    try {
      conn.reducers.sendChatMessage({ content: text.trim(), kind: "text" });
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Error");
    }
    setChatInput("");
    setShowPicker(false);
  };

  const handleSendSticker = (stickerId: string) => {
    try {
      conn.reducers.sendChatMessage({ content: stickerId, kind: "sticker" });
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Error");
    }
    setShowPicker(false);
  };

  const handleEmojiInsert = (emoji: string) => {
    setChatInput((prev) => prev + emoji);
  };

  if (!localPlayer) return null;

  // All messages (including promoter) are now in the DB, just sort by sentAt
  const timeline = [...chatMessages].sort((a, b) => Number(a.sentAt) - Number(b.sentAt));

  const bgClass = `flex-1 overflow-y-auto wa-chat-bg ${timeOfDay.bgClass} px-3 py-2 space-y-1.5`;

  return (
    <div className="flex flex-col h-full bg-white text-g-900 relative">
      <WAStatusBar />
      <WAHeader
        name={`${game.groupName} (${game.code})`}
        avatar={<GrupaliaAvatar />}
        subtitle={`Semana ${game.currentWeek}/${game.weeksTotal} — ${timeOfDay.dayLabel || "..."}`}
        verified
        onBack={onBack}
        onNameClick={() => setShowGroupInfo(true)}
      />
      <WAGameStatus
        businessType={localPlayer.businessType as BusinessType | ""}
        money={localPlayer.money}
        weeklyPayment={localPlayer.weeklyPayment || 750}
        paidCount={weekPayments.length}
        totalPlayers={players.length}
        secondsLeft={secondsLeft}
        isUrgent={isUrgent}
        phase={game.phase}
        dayLabel={timeOfDay.dayLabel}
        timeIcon={timeOfDay.timeIcon}
      />

      <div ref={chatBodyRef} className={bgClass}>
        {/* All messages from DB, sorted by time */}
        {timeline.map((msg) => {
          // Promoter messages
          if (msg.kind === "promoter") {
            return (
              <WAMessageIn key={msg.id.toString()} sender="Promotora" time={formatTime(Number(msg.sentAt))}>
                {msg.content}
              </WAMessageIn>
            );
          }

          // Week dividers
          if (msg.kind === "divider") {
            return (
              <WADateDivider
                key={msg.id.toString()}
                text={msg.content.replace(/^---\s*/, "").replace(/\s*---$/, "")}
              />
            );
          }

          // System messages (results, rest, action prompts)
          if (msg.kind === "system") {
            return (
              <WASystemMessage key={msg.id.toString()}>
                {msg.content}
              </WASystemMessage>
            );
          }

          // Regular chat messages + stickers
          const isMe = msg.senderIdentity.toHexString() === myHex;
          const time = formatTime(Number(msg.sentAt));
          if (isMe) {
            return (
              <WAMessageOut key={msg.id.toString()} time={time}>
                {msg.kind === "sticker" ? (
                  <StickerBubble stickerId={msg.content} customStickers={customStickers} />
                ) : msg.content}
              </WAMessageOut>
            );
          }
          return (
            <WAMessageIn key={msg.id.toString()} sender={msg.senderName} time={time}>
              {msg.kind === "sticker" ? (
                <StickerBubble stickerId={msg.content} customStickers={customStickers} />
              ) : msg.content}
            </WAMessageIn>
          );
        })}

        <div ref={scrollRef} />
      </div>

      {/* Sticker picker & input */}
      <div className="relative">
        {showPicker && (
          <StickerPicker
            onSelectSticker={handleSendSticker}
            onSelectEmoji={handleEmojiInsert}
            onUploadSticker={(name, imageData) => {
              try {
                conn.reducers.uploadSticker({ name, imageData });
              } catch (err) {
                toast.show(err instanceof Error ? err.message : "Error");
              }
            }}
            onClose={() => setShowPicker(false)}
            customStickers={customStickers}
          />
        )}

        <WAInputBar
          placeholder="Mensaje..."
          value={chatInput}
          onChange={setChatInput}
          onSend={handleSendChat}
          onEmojiToggle={() => setShowPicker((v) => !v)}
          emojiActive={showPicker}
        />
      </div>

      <WAToast message={toast.message} visible={toast.visible} />

      {/* Group info modal */}
      {showGroupInfo && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowGroupInfo(false)}
        >
          <div
            className="bg-white rounded-xl p-5 mx-6 max-w-xs w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[16px] font-semibold text-g-900 mb-1">{game.groupName}</h3>
            <p className="text-[11px] text-g-500 mb-3">Código: {game.code} · Semana {game.currentWeek}/{game.weeksTotal}</p>
            <div className="space-y-2 mb-4">
              {players.map((p) => {
                const bt = p.businessType ? BUSINESS_INFO[p.businessType as BusinessType] : null;
                const ls = p.loanSize ? LOAN_INFO[p.loanSize as keyof typeof LOAN_INFO] : null;
                const isMe = p.identity.toHexString() === myHex;
                return (
                  <div key={p.id.toString()} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-g-50">
                    <span className="text-lg">{bt?.emoji || "❓"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-medium text-g-900 truncate">{p.name || "..."}</span>
                        {isMe && <span className="text-[10px] text-wa-teal font-medium">(tú)</span>}
                      </div>
                      <p className="text-[10px] text-g-500">
                        {bt?.label || "Sin negocio"} · {ls ? `$${ls.credit.toLocaleString()}` : "Sin crédito"}
                      </p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${p.online ? "bg-green-500" : "bg-g-300"}`} />
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setShowGroupInfo(false)}
              className="w-full py-2 rounded-lg text-[14px] font-medium text-wa-teal border border-[#D1D7DB] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
