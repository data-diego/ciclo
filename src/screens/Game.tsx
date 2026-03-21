import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import type { BusinessType } from "../game/types";
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
import { useSound, useHeaderCenter } from "../components/PageLayout";
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

// --- Chat log types ---

interface ChatEntry {
  id: string;
  node: ReactNode;
}

// --- Main component (app switcher) ---

export function Game({
  conn,
  identity,
  game,
  players,
  payments,
  weekResults,
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

  // App switching state
  const [activeApp, setActiveApp] = useState<"whatsapp" | "grupalia">("whatsapp");
  const { soundOn } = useSound();
  const { setHeaderCenter } = useHeaderCenter();

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

  // Push app dock into the page header
  useEffect(() => {
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

    setHeaderCenter(
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

    return () => setHeaderCenter(null);
  }, [activeApp, unreadCount, buzzApp, setHeaderCenter]);

  if (!localPlayer) return null;

  return (
    <div className="flex items-center justify-center p-4 overflow-x-auto">

      <div className="shrink-0">
      <Android className="drop-shadow-2xl">
        {activeApp === "whatsapp" && (
          <WhatsAppChat
            conn={conn}
            identity={identity}
            game={game}
            players={players}
            payments={payments}
            weekResults={weekResults}
            chatMessages={chatMessages}
            customStickers={customStickers}
            secondsLeft={secondsLeft}
            isUrgent={isUrgent}
            timeOfDay={timeOfDay}
            promoterMessages={promoterMessages}
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
            secondsLeft={secondsLeft}
            timeOfDay={timeOfDay}
            onBack={() => setActiveApp("whatsapp")}
          />
        )}
      </Android>
      </div>
    </div>
  );
}

// --- WhatsApp Chat (PURE SOCIAL — no game mechanics) ---

function WhatsAppChat({
  conn,
  identity,
  game,
  players,
  payments,
  weekResults,
  chatMessages,
  customStickers,
  secondsLeft,
  isUrgent,
  timeOfDay,
  promoterMessages,
}: {
  conn: DbConnection;
  identity: Identity;
  game: GameT;
  players: readonly Player[];
  payments: readonly Payment[];
  weekResults: readonly WeekResult[];
  chatMessages: readonly ChatMessage[];
  customStickers: readonly CustomSticker[];
  secondsLeft: number;
  isUrgent: boolean;
  timeOfDay: ReturnType<typeof useTimeOfDay>;
  promoterMessages: import("../game/usePromoterMessages").PromoterMessage[];
}) {
  const myHex = identity.toHexString();
  const localPlayer = players.find((p) => p.identity.toHexString() === myHex);


  const weekPayments = payments.filter((p) => p.week === game.currentWeek);

  // Chat log: frozen messages from completed phases
  const [chatLog, setChatLog] = useState<ChatEntry[]>([]);
  const prevPhaseRef = useRef<string>("");

  // Chat input state
  const [chatInput, setChatInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);
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
  }, [game.phase, game.currentWeek, chatMessages.length, scrollToBottom]);

  // Freeze phase transition messages into chat log
  useEffect(() => {
    const phaseKey = `${game.currentWeek}-${game.phase}`;
    if (prevPhaseRef.current && prevPhaseRef.current !== phaseKey) {
      const prev = prevPhaseRef.current;
      const [weekStr, ...phaseParts] = prev.split("-");
      const prevWeek = parseInt(weekStr);
      const prevPhase = phaseParts.join("-");
      const entries = buildFrozenEntries(prevWeek, prevPhase, game, weekResults);
      if (entries.length > 0) {
        setChatLog((log) => [...log, ...entries]);
      }
    }
    prevPhaseRef.current = phaseKey;
  }, [game.currentWeek, game.phase]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const bgClass = `flex-1 overflow-y-auto wa-chat-bg ${timeOfDay.bgClass} px-3 py-2 space-y-1.5`;

  return (
    <div className="flex flex-col h-full bg-white text-g-900 relative">
      <WAStatusBar />
      <WAHeader
        name={`${game.groupName} (${game.code})`}
        avatar={<GrupaliaAvatar />}
        subtitle={`Semana ${game.currentWeek}/${game.weeksTotal} — ${timeOfDay.dayLabel || "..."}`}
        verified
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
        {/* Frozen chat log from previous phases */}
        {chatLog.map((entry) => (
          <div key={entry.id}>{entry.node}</div>
        ))}

        {/* Current week divider */}
        {!chatLog.some((e) => e.id === `divider-${game.currentWeek}`) && (
          <WADateDivider
            text={`Semana ${game.currentWeek} de ${game.weeksTotal}`}
          />
        )}

        {/* Phase system messages */}
        {game.phase === "action" && (
          <WASystemMessage>
            Revisa tu app Grupalia para pagar esta semana
          </WASystemMessage>
        )}
        {game.phase === "results" && (
          <ResultsBubble game={game} weekResults={weekResults} />
        )}
        {game.phase === "rest" && (
          <WASystemMessage>
            Domingo de descanso. Tu negocio generó +$1,200
          </WASystemMessage>
        )}

        {/* Promotora messages */}
        {promoterMessages.map((msg) => (
          <WAMessageIn key={msg.id} sender="Promotora" time={formatTime()}>
            {msg.text}
          </WAMessageIn>
        ))}

        {/* Chat messages */}
        {chatMessages.map((msg) => {
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
    </div>
  );
}

// --- Results bubble (shown in WhatsApp as group result) ---

function ResultsBubble({
  game,
  weekResults,
}: {
  game: GameT;
  weekResults: readonly WeekResult[];
}) {
  const result = weekResults.find((r) => r.week === game.currentWeek);
  if (!result) return null;

  if (result.passed) {
    return (
      <WASystemMessage>
        {"\u2705"} El grupo cumplió! ${result.totalPaid.toLocaleString()} / ${result.target.toLocaleString()}
      </WASystemMessage>
    );
  }

  return (
    <WASystemMessage>
      {"\u274C"} No se completó. ${result.totalPaid.toLocaleString()} / ${result.target.toLocaleString()}
      {result.moraAdded > 0 && ` — Mora: +$${result.moraAdded}`}
    </WASystemMessage>
  );
}

// --- Build frozen entries (simplified — WhatsApp only shows system messages) ---

function buildFrozenEntries(
  week: number,
  phase: string,
  game: GameT,
  weekResults: readonly WeekResult[]
): ChatEntry[] {
  const entries: ChatEntry[] = [];

  if (phase === "action") {
    entries.push({
      id: `divider-${week}`,
      node: <WADateDivider text={`Semana ${week} de ${game.weeksTotal}`} />,
    });
  }

  if (phase === "results") {
    const result = weekResults.find((r) => r.week === week);
    if (result) {
      const text = result.passed
        ? `\u2705 Semana ${week}: El grupo cumplió! $${result.totalPaid.toLocaleString()}/$${result.target.toLocaleString()}`
        : `\u274C Semana ${week}: No se completó. $${result.totalPaid.toLocaleString()}/$${result.target.toLocaleString()}${result.moraAdded > 0 ? ` — Mora: +$${result.moraAdded}` : ""}`;
      entries.push({
        id: `results-${week}`,
        node: <WASystemMessage>{text}</WASystemMessage>,
      });
    }
  }

  if (phase === "rest") {
    entries.push({
      id: `rest-${week}`,
      node: <WASystemMessage>Domingo — Ingreso recibido: +$1,200</WASystemMessage>,
    });
  }

  return entries;
}
