import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import type { BusinessType, PaymentChoice } from "../game/types";
import { BUSINESS_INFO } from "../game/types";
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
import { useSound } from "../components/PageLayout";
import type { DbConnection } from "../module_bindings";
import type { Identity } from "spacetimedb";
import type {
  Game as GameT,
  Player,
  Payment,
  WeekResult,
  ChatMessage,
  CustomSticker,
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
}

// --- Helpers ---

function formatTime(ts?: number): string {
  const d = new Date(ts ?? Date.now());
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function GrupaliaAvatar() {
  return (
    <img src="/icon.png" alt="Grupalia" className="w-full h-full object-cover" />
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
}: GameProps) {
  const myHex = identity.toHexString();
  const localPlayer = players.find((p) => p.identity.toHexString() === myHex);

  // App switching state
  const [activeApp, setActiveApp] = useState<"whatsapp" | "grupalia">("whatsapp");
  const { soundOn } = useSound();

  // Notification tracking
  const [seenMsgCount, setSeenMsgCount] = useState(chatMessages.length);
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

      // Trigger buzz animation
      setBuzzApp("whatsapp");
      const timer = setTimeout(() => setBuzzApp(null), 700);
      return () => clearTimeout(timer);
    }
  }, [chatMessages.length, seenMsgCount, activeApp, soundOn]);

  // When entering WhatsApp, mark all messages as seen
  useEffect(() => {
    if (activeApp === "whatsapp") {
      setSeenMsgCount(chatMessages.length);
    }
  }, [activeApp, chatMessages.length]);

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

  if (!localPlayer) return null;

  const unreadCount = activeApp === "whatsapp" ? 0 : chatMessages.length - seenMsgCount;

  // WhatsApp icon
  const whatsappIcon = (
    <div className="w-full h-full bg-[#25D366] flex items-center justify-center">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </div>
  );

  // Grupalia icon
  const grupaliaIcon = (
    <img src="/icon.png" alt="Grupalia" className="w-full h-full object-cover" />
  );

  return (
    <div className="flex items-center justify-center gap-4 p-4 overflow-x-auto">
      {/* App dock — left column, always visible */}
      <div className="shrink-0">
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
      </div>

      {/* Phone — always visible, shows active app */}
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
          />
        )}

        {activeApp === "grupalia" && (
          <GrupaliaApp
            game={game}
            localPlayer={localPlayer}
            players={players}
            payments={payments}
            weekResults={weekResults}
            onBack={() => setActiveApp("whatsapp")}
          />
        )}
      </Android>
      </div>
    </div>
  );
}

// --- WhatsApp Chat (inner app) ---

function WhatsAppChat({
  conn,
  identity,
  game,
  players,
  payments,
  weekResults,
  chatMessages,
  customStickers,
}: GameProps) {
  const myHex = identity.toHexString();
  const localPlayer = players.find((p) => p.identity.toHexString() === myHex);
  const isCreator = game.creator.toHexString() === myHex;

  const { secondsLeft, isUrgent } = usePhaseTimer(game, conn, isCreator);

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
  }, [game.phase, game.currentWeek, payments.length, chatMessages.length, scrollToBottom]);

  // Freeze messages into chat log on phase transitions
  useEffect(() => {
    const phaseKey = `${game.currentWeek}-${game.phase}`;
    if (prevPhaseRef.current && prevPhaseRef.current !== phaseKey) {
      const prev = prevPhaseRef.current;
      const [weekStr, ...phaseParts] = prev.split("-");
      const prevWeek = parseInt(weekStr);
      const prevPhase = phaseParts.join("-");
      const entries = buildFrozenEntries(
        prevWeek,
        prevPhase,
        game,
        localPlayer,
        players,
        payments,
        weekResults
      );
      if (entries.length > 0) {
        setChatLog((log) => [...log, ...entries]);
      }

    }
    prevPhaseRef.current = phaseKey;
  }, [game.currentWeek, game.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chat handlers
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

  const handlePayment = (choice: PaymentChoice) => {
    try {
      conn.reducers.makePayment({ choice });
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Error");
    }
  };

  if (!localPlayer) return null;

  const members = players.filter((p) => p.role === "member");
  const weekPayments = payments.filter((p) => p.week === game.currentWeek);
  const hasLocalPaid = weekPayments.some(
    (p) => p.playerIdentity.toHexString() === myHex
  );
  const paidCount = weekPayments.length;

  return (
    <div className="flex flex-col h-full bg-white text-g-900 relative">
      <WAStatusBar />
      <WAHeader
        name={`${game.groupName} (${game.code})`}
        avatar={<GrupaliaAvatar />}
        subtitle={`Semana ${game.currentWeek}/${game.weeksTotal}`}
        verified
      />
      <WAGameStatus
        businessType={localPlayer.businessType as BusinessType | ""}
        money={localPlayer.money}
        paidCount={paidCount}
        totalMembers={members.length}
        secondsLeft={secondsLeft}
        isUrgent={isUrgent}
        phase={game.phase}
        isPresidenta={localPlayer.role === "presidenta"}
      />

      <div
        ref={chatBodyRef}
        className="flex-1 overflow-y-auto wa-chat-bg px-3 py-2 space-y-1.5"
      >
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

        {/* Active phase messages */}
        {game.phase === "action" && (
          <ActionPhase
            game={game}
            localPlayer={localPlayer}
            members={members}
            weekPayments={weekPayments}
            hasLocalPaid={hasLocalPaid}
            myHex={myHex}
            onPayment={handlePayment}
          />
        )}
        {game.phase === "results" && (
          <ResultsPhase game={game} weekResults={weekResults} />
        )}
        {game.phase === "rest" && (
          <RestPhaseMsg game={game} localPlayer={localPlayer} />
        )}

        {/* Chat messages */}
        {chatMessages.map((msg) => {
          const isMe = msg.senderIdentity.toHexString() === myHex;
          const time = formatTime(Number(msg.sentAt));
          if (isMe) {
            return (
              <WAMessageOut key={msg.id.toString()} time={time}>
                {msg.kind === "sticker" ? (
                  <StickerBubble
                    stickerId={msg.content}
                    customStickers={customStickers}
                  />
                ) : (
                  msg.content
                )}
              </WAMessageOut>
            );
          }
          return (
            <WAMessageIn
              key={msg.id.toString()}
              sender={msg.senderName}
              time={time}
            >
              {msg.kind === "sticker" ? (
                <StickerBubble
                  stickerId={msg.content}
                  customStickers={customStickers}
                />
              ) : (
                msg.content
              )}
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

// --- Action Phase ---

function ActionPhase({
  game,
  localPlayer,
  members,
  weekPayments,
  hasLocalPaid,
  myHex,
  onPayment,
}: {
  game: GameT;
  localPlayer: Player;
  members: readonly Player[];
  weekPayments: readonly Payment[];
  hasLocalPaid: boolean;
  myHex: string;
  onPayment: (choice: PaymentChoice) => void;
}) {
  const isPresidenta = localPlayer.role === "presidenta";

  // Presidenta view
  if (isPresidenta) {
    return (
      <>
        <WAMessageIn sender="Grupalia" time={formatTime()}>
          Eres la <strong>Presidenta</strong> esta semana. Observa los pagos del
          grupo.
        </WAMessageIn>

        {weekPayments.map((payment) => {
          const player = members.find(
            (p) =>
              p.identity.toHexString() ===
              payment.playerIdentity.toHexString()
          );
          if (!player) return null;
          const bt = player.businessType as BusinessType;
          const info = bt ? BUSINESS_INFO[bt] : null;
          const choiceLabel =
            payment.choice === "full"
              ? "pago completo"
              : payment.choice === "double"
                ? "pago doble"
                : payment.choice === "partial"
                  ? "pago parcial"
                  : "no pago";

          return (
            <WASystemMessage key={payment.playerIdentity.toHexString()}>
              {info?.emoji} {player.name} ({info?.label}) — {choiceLabel} $
              {payment.amount}
            </WASystemMessage>
          );
        })}

        {weekPayments.length < members.length && (
          <WASystemMessage>
            Esperando {members.length - weekPayments.length} pagos mas...
          </WASystemMessage>
        )}
      </>
    );
  }

  // Member who already paid
  if (hasLocalPaid) {
    const myPayment = weekPayments.find(
      (p) => p.playerIdentity.toHexString() === myHex
    );
    const choiceLabel =
      myPayment?.choice === "full"
        ? "Pago completo"
        : myPayment?.choice === "double"
          ? "Pago doble"
          : myPayment?.choice === "partial"
            ? "Pago parcial"
            : "No puedo pagar";

    return (
      <>
        <WAMessageIn sender="Grupalia" time={formatTime()}>
          Es hora del pago semanal! Cuanto abonas?
        </WAMessageIn>
        <WAMessageOut time={formatTime()}>
          {choiceLabel} ${myPayment?.amount ?? 0}
        </WAMessageOut>
        <WASystemMessage>
          Esperando a los demas... ({weekPayments.length}/{members.length})
        </WASystemMessage>

        {weekPayments
          .filter((p) => p.playerIdentity.toHexString() !== myHex)
          .map((payment) => {
            const player = members.find(
              (m) =>
                m.identity.toHexString() ===
                payment.playerIdentity.toHexString()
            );
            if (!player) return null;
            const info = BUSINESS_INFO[player.businessType as BusinessType];
            return (
              <WASystemMessage key={payment.playerIdentity.toHexString()}>
                {info?.emoji} {player.name} pago ${payment.amount}
              </WASystemMessage>
            );
          })}
      </>
    );
  }

  // Member who hasn't paid yet
  const canDouble = game.totalMora > 0 && localPlayer.money >= 1500;

  const options: {
    choice: PaymentChoice;
    label: string;
    amount: number;
    emoji: string;
  }[] = [
    {
      choice: "full",
      label: "Pago completo",
      amount: 750,
      emoji: "\u{1F4B0}",
    },
    {
      choice: "partial",
      label: "Pago parcial",
      amount: 400,
      emoji: "\u{1FAE3}",
    },
    {
      choice: "none",
      label: "No puedo pagar",
      amount: 0,
      emoji: "\u{1F630}",
    },
  ];

  if (canDouble) {
    options.splice(1, 0, {
      choice: "double",
      label: "Pago doble",
      amount: 1500,
      emoji: "\u{1F4B0}\u{1F4B0}",
    });
  }

  const moraText = game.totalMora > 0 ? ` | Mora: $${game.totalMora}` : "";

  return (
    <WAMessageIn
      sender="Grupalia"
      time={formatTime()}
      footer={`Tu saldo: $${localPlayer.money.toLocaleString()}${moraText}`}
      buttons={options.map((opt) => ({
        label: `${opt.emoji} ${opt.label} — $${opt.amount}`,
        onClick:
          opt.amount > localPlayer.money
            ? undefined
            : () => onPayment(opt.choice),
      }))}
    >
      Es hora del pago semanal! Cuanto abonas?
    </WAMessageIn>
  );
}

// --- Results Phase ---

function ResultsPhase({
  game,
  weekResults,
}: {
  game: GameT;
  weekResults: readonly WeekResult[];
}) {
  const result = weekResults.find((r) => r.week === game.currentWeek);
  if (!result) return null;

  return (
    <WAMessageIn sender="Grupalia" time={formatTime()}>
      {result.passed ? (
        <>
          <p className="text-[15px] mb-1">
            {"\u2705"} <strong>El grupo cumplio!</strong>
          </p>
          <p className="text-[13px] text-g-600">
            Total pagado: ${result.totalPaid.toLocaleString()} / $
            {result.target.toLocaleString()}
          </p>
        </>
      ) : (
        <>
          <p className="text-[15px] mb-1">
            {"\u274C"} <strong>No se completo el pago</strong>
          </p>
          <p className="text-[13px] text-g-600">
            Total: ${result.totalPaid.toLocaleString()} / $
            {result.target.toLocaleString()}
          </p>
          {result.moraAdded > 0 && (
            <p className="text-[13px] text-red-600 font-medium mt-1">
              Mora: +${result.moraAdded} (Total: ${game.totalMora})
            </p>
          )}
        </>
      )}
    </WAMessageIn>
  );
}

// --- Rest Phase ---

function RestPhaseMsg({
  game,
  localPlayer,
}: {
  game: GameT;
  localPlayer: Player;
}) {
  return (
    <WAMessageIn
      sender="Grupalia"
      time={formatTime()}
      footer={`Nuevo saldo: $${(localPlayer.money + 1200).toLocaleString()}`}
    >
      <p>
        {"\u{1F634}"} <strong>Domingo de descanso</strong>
      </p>
      <p className="text-[13px] text-g-600 mt-1">
        Tu negocio genero <strong className="text-ok-700">+$1,200</strong>
      </p>
      {game.currentWeek < game.weeksTotal && (
        <p className="text-[12px] text-g-400 mt-1">
          Semana {game.currentWeek + 1} comienza pronto...
        </p>
      )}
    </WAMessageIn>
  );
}

// --- Build frozen entries for completed phases ---

function buildFrozenEntries(
  week: number,
  phase: string,
  game: GameT,
  localPlayer: Player | undefined,
  players: readonly Player[],
  payments: readonly Payment[],
  weekResults: readonly WeekResult[]
): ChatEntry[] {
  if (!localPlayer) return [];

  const entries: ChatEntry[] = [];
  const members = players.filter((p) => p.role === "member");
  const weekPayments = payments.filter((p) => p.week === week);
  const myHex = localPlayer.identity.toHexString();

  if (phase === "action") {
    entries.push({
      id: `divider-${week}`,
      node: (
        <WADateDivider text={`Semana ${week} de ${game.weeksTotal}`} />
      ),
    });

    if (localPlayer.role === "presidenta") {
      entries.push({
        id: `action-presidenta-${week}`,
        node: (
          <WAMessageIn sender="Grupalia" time={formatTime()}>
            Eres la <strong>Presidenta</strong> esta semana. Observa los pagos
            del grupo.
          </WAMessageIn>
        ),
      });
    } else {
      const myPayment = weekPayments.find(
        (p) => p.playerIdentity.toHexString() === myHex
      );
      entries.push({
        id: `action-ask-${week}`,
        node: (
          <WAMessageIn sender="Grupalia" time={formatTime()}>
            Es hora del pago semanal! Cuanto abonas?
          </WAMessageIn>
        ),
      });
      if (myPayment) {
        const choiceLabel =
          myPayment.choice === "full"
            ? "Pago completo"
            : myPayment.choice === "double"
              ? "Pago doble"
              : myPayment.choice === "partial"
                ? "Pago parcial"
                : "No puedo pagar";
        entries.push({
          id: `action-answer-${week}`,
          node: (
            <WAMessageOut time={formatTime()}>
              {choiceLabel} ${myPayment.amount}
            </WAMessageOut>
          ),
        });
      }
    }

    weekPayments.forEach((payment) => {
      if (payment.playerIdentity.toHexString() === myHex) return;
      const player = members.find(
        (m) =>
          m.identity.toHexString() === payment.playerIdentity.toHexString()
      );
      if (!player) return;
      const info = BUSINESS_INFO[player.businessType as BusinessType];
      entries.push({
        id: `payment-${week}-${payment.playerIdentity.toHexString()}`,
        node: (
          <WASystemMessage>
            {info?.emoji} {player.name} pago ${payment.amount}
          </WASystemMessage>
        ),
      });
    });
  }

  if (phase === "results") {
    const result = weekResults.find((r) => r.week === week);
    if (result) {
      entries.push({
        id: `results-${week}`,
        node: (
          <WAMessageIn sender="Grupalia" time={formatTime()}>
            {result.passed ? (
              <>
                <p className="text-[15px] mb-1">
                  {"\u2705"} <strong>El grupo cumplio!</strong>
                </p>
                <p className="text-[13px] text-g-600">
                  Total: ${result.totalPaid.toLocaleString()} / $
                  {result.target.toLocaleString()}
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] mb-1">
                  {"\u274C"} <strong>No se completo el pago</strong>
                </p>
                <p className="text-[13px] text-g-600">
                  Total: ${result.totalPaid.toLocaleString()} / $
                  {result.target.toLocaleString()}
                </p>
                {result.moraAdded > 0 && (
                  <p className="text-[13px] text-red-600 font-medium mt-1">
                    Mora: +${result.moraAdded}
                  </p>
                )}
              </>
            )}
          </WAMessageIn>
        ),
      });
    }
  }

  if (phase === "rest") {
    entries.push({
      id: `rest-${week}`,
      node: (
        <WAMessageIn sender="Grupalia" time={formatTime()}>
          <p>
            {"\u{1F634}"} <strong>Domingo de descanso</strong>
          </p>
          <p className="text-[13px] text-g-600 mt-1">
            Tu negocio genero <strong className="text-ok-700">+$1,200</strong>
          </p>
        </WAMessageIn>
      ),
    });
  }

  return entries;
}
