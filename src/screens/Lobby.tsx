import { useState, useEffect, useRef, useCallback } from "react";
import type { GameMode, Difficulty, BusinessType, LoanSize } from "../game/types";
import { BUSINESS_INFO, MODE_INFO, DIFFICULTY_INFO, LOAN_INFO, TASA_PER_MIL, TASA_BY_DIFFICULTY, calcWeeklyPayment, calcTotalPayback, g } from "../game/types";
import { generateCode, generateGroupName } from "../game/helpers";
import { Android } from "../components/Android";
import {
  WAStatusBar,
  WAHeader,
  WAChatBody,
  WADateDivider,
  WAMessageIn,
  WAMessageOut,
  WASystemMessage,
  WALinkPreview,
  WATyping,
  WAInputBar,
  WAToast,
} from "../components/WhatsApp";
import type { DbConnection } from "../module_bindings";
import type { Identity } from "spacetimedb";
import type { Game, Player, ChatMessage, CustomSticker } from "../module_bindings/types";
import { StickerPicker, StickerBubble, EMOJI_ROWS } from "../components/StickerPicker";

// --- Props ---

interface LobbyProps {
  conn: DbConnection;
  identity: Identity;
  gameCode: string | null;
  setGameCode: (code: string) => void;
  games: readonly Game[];
  players: readonly Player[];
  chatMessages: readonly ChatMessage[];
  customStickers: readonly CustomSticker[];
}

// --- Helpers ---

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function GrupaliaAvatar() {
  return (
    <img src="/icon.png" alt="Grupalia" className="w-full h-full object-cover" />
  );
}

function GroupAvatar() {
  return (
    <img src="/ciclogo.png" alt="Ciclo" className="w-full h-full object-cover" />
  );
}


// Hook: toast
function useToast(duration = 2000) {
  const [toast, setToast] = useState<string | null>(null);

  const show = useCallback(
    (msg: string) => {
      setToast(msg);
      setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  return { message: toast || "", visible: !!toast, show };
}

// --- Safe reducer call wrapper ---

type SafeCall = (fn: () => void) => void;

function useSafeCall(): { safeCall: SafeCall; errorToast: { message: string; visible: boolean } } {
  const toast = useToast(3000);

  const safeCall: SafeCall = useCallback(
    (fn) => {
      try {
        fn();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        toast.show(msg);
      }
    },
    [toast]
  );

  return { safeCall, errorToast: toast };
}

// --- Entry ---

export function Lobby({ conn, identity, gameCode, setGameCode, games, players, chatMessages, customStickers }: LobbyProps) {
  const urlParams = new URLSearchParams(window.location.search);
  const joinCode = urlParams.get("room");
  const [joinFlowDone, setJoinFlowDone] = useState(!joinCode);
  const { safeCall, errorToast } = useSafeCall();

  // Find the current game from subscriptions
  const game = gameCode ? games.find((g) => g.code === gameCode) : null;

  // Find players in this game
  const gamePlayers = gameCode
    ? players.filter((p) => p.gameCode === gameCode)
    : [];

  // Find local player
  const localPlayer = players.find(
    (p) => p.identity.toHexString() === identity.toHexString()
  );

  const isCreator = game
    ? game.creator.toHexString() === identity.toHexString()
    : false;

  if (!joinFlowDone) {
    return (
      <JoinFlow
        conn={conn}
        roomCode={joinCode!}
        game={game}
        safeCall={safeCall}
        errorToast={errorToast}
        onDone={() => {
          setGameCode(joinCode!);
          setJoinFlowDone(true);
        }}
      />
    );
  }

  if (!game) {
    return (
      <CreateFlow
        conn={conn}
        setGameCode={setGameCode}
        safeCall={safeCall}
        errorToast={errorToast}
      />
    );
  }

  return (
    <WaitingRoom
      conn={conn}
      identity={identity}
      game={game}
      players={gamePlayers}
      localPlayer={localPlayer ?? null}
      isCreator={isCreator}
      chatMessages={chatMessages.filter((m) => m.gameCode === gameCode)}
      customStickers={customStickers.filter((s) => s.gameCode === gameCode)}
      safeCall={safeCall}
      errorToast={errorToast}
    />
  );
}

// =====================================================
// CREATE FLOW — intro + mode picker, then straight to WaitingRoom
// =====================================================

function CreateFlow({
  conn,
  setGameCode,
  safeCall,
  errorToast,
}: {
  conn: DbConnection;
  setGameCode: (code: string) => void;
  safeCall: SafeCall;
  errorToast: { message: string; visible: boolean };
}) {
  const [step, setStep] = useState<"typing_intro" | "intro" | "pick_difficulty" | "pick_mode">("typing_intro");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setStep("intro"), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step]);

  const handlePickDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    setStep("pick_mode");
  };

  const handlePickMode = (mode: GameMode) => {
    const code = generateCode();
    const groupName = generateGroupName();
    safeCall(() => {
      conn.reducers.createGame({ code, groupName, mode, difficulty: difficulty! });
      setGameCode(code);
    });
  };

  return (
    <div className="flex items-center justify-center flex-1 min-h-0 py-2 md:py-6">
      <Android className="drop-shadow-2xl">
        <div className="flex flex-col h-full bg-white text-g-900">
          <WAStatusBar />
          <WAHeader
            name="Grupalia"
            avatar={<GrupaliaAvatar />}
            subtitle="Business account"
            verified
          />

          <WAChatBody>
            <WADateDivider text="Today" />
            <WASystemMessage>
              Messages to this business account are secured with end-to-end encryption.
            </WASystemMessage>

            {step === "typing_intro" && <WATyping />}

            {step !== "typing_intro" && (
              <WAMessageIn
                time={formatTime(Date.now())}
                buttons={
                  step === "intro"
                    ? [
                        {
                          label: "Crear grupo",
                          icon: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                            </svg>
                          ),
                          onClick: () => setStep("pick_difficulty"),
                        },
                      ]
                    : undefined
                }
              >
                <p>Hola! Soy tu promotora de <strong>Grupalia</strong>.</p>
                <p className="mt-1.5">
                  ¿Estás lista para iniciar un nuevo ciclo de crédito grupal?
                  Junta a tu grupo y empecemos la experiencia.
                </p>
              </WAMessageIn>
            )}

            {/* Difficulty picker — WhatsApp quick reply buttons */}
            {(step === "pick_difficulty" || step === "pick_mode") && (
              <>
                <WAMessageOut time={formatTime(Date.now())}>Sí, quiero crear un grupo</WAMessageOut>
                <WAMessageIn time={formatTime(Date.now())}>
                  <p>¡Qué bueno! 💜 Aquí van a sentir lo que viven nuestras clientas en un ciclo de crédito grupal. Hay que pagar, apoyarse y sobrevivir los imprevistos.</p>
                </WAMessageIn>
                <WAMessageIn time={formatTime(Date.now())}>
                  <p>¿Qué nivel de dificultad quieres?</p>
                </WAMessageIn>
                <div className="flex flex-wrap gap-1.5 mt-1 px-0">
                  {(
                    Object.entries(DIFFICULTY_INFO) as [Difficulty, { label: string; emoji: string; desc: string }][]
                  ).map(([d, info]) => (
                    <button
                      key={d}
                      onClick={() => handlePickDifficulty(d)}
                      className={`
                        inline-flex items-center py-2 px-3 rounded-lg text-center text-[13px]
                        border shadow-sm transition-all cursor-pointer
                        ${difficulty === d
                          ? "border-wa-teal bg-wa-teal text-white font-medium shadow-none"
                          : "border-[#D1D7DB] bg-white text-wa-teal hover:bg-gray-50"
                        }
                      `}
                    >
                      {info.emoji} {info.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Mode picker */}
            {step === "pick_mode" && difficulty && (
              <>
                <WAMessageOut time={formatTime(Date.now())}>
                  {DIFFICULTY_INFO[difficulty].emoji} {DIFFICULTY_INFO[difficulty].label}
                </WAMessageOut>
                <WAMessageIn time={formatTime(Date.now())}>
                  <p>¿Cuánto tiempo quieres jugar?</p>
                </WAMessageIn>
                <div className="flex flex-wrap gap-1.5 mt-1 px-0">
                  {(
                    Object.entries(MODE_INFO) as [GameMode, (typeof MODE_INFO)[GameMode]][]
                  ).map(([mode, info]) => (
                    <button
                      key={mode}
                      onClick={() => handlePickMode(mode)}
                      className="
                        inline-flex items-center gap-1 py-2 px-3 rounded-lg text-[13px]
                        border border-[#D1D7DB] bg-white text-wa-teal shadow-sm
                        hover:bg-gray-50 transition-all cursor-pointer
                      "
                    >
                      {info.emoji} {info.label} <span className="text-g-500 text-[11px]">~{info.durationMin}min</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div ref={scrollRef} />
          </WAChatBody>

          <WAInputBar disabled />
          <WAToast message={errorToast.message} visible={errorToast.visible} />
        </div>
      </Android>
    </div>
  );
}

// =====================================================
// JOIN FLOW — invite preview, tap join, then straight to WaitingRoom
// =====================================================

function JoinFlow({
  conn,
  roomCode,
  game,
  safeCall,
  errorToast,
  onDone,
}: {
  conn: DbConnection;
  roomCode: string;
  game: Game | null | undefined;
  safeCall: SafeCall;
  errorToast: { message: string; visible: boolean };
  onDone: () => void;
}) {
  const [step, setStep] = useState<"typing_intro" | "invite">("typing_intro");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setStep("invite"), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step]);

  const handleJoinGroup = () => {
    safeCall(() => {
      conn.reducers.joinGame({ code: roomCode });
      onDone();
    });
  };

  return (
    <div className="flex items-center justify-center flex-1 min-h-0 py-2 md:py-6">
      <Android className="drop-shadow-2xl">
        <div className="flex flex-col h-full bg-white text-g-900">
          <WAStatusBar />
          <WAHeader
            name="Grupalia"
            avatar={<GrupaliaAvatar />}
            subtitle="Business account"
            verified
          />

          <WAChatBody>
            <WADateDivider text="Today" />
            <WASystemMessage>
              Messages to this business account are secured with end-to-end encryption.
            </WASystemMessage>

            {step === "typing_intro" && <WATyping />}

            {step !== "typing_intro" && (
              <WAMessageIn
                time={formatTime(Date.now())}
                buttons={[{ label: "Unirme al grupo", icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="13" y1="11" x2="21" y2="3" /></svg>), onClick: handleJoinGroup }]}
              >
                <p>Te invitaron a un grupo de crédito en <strong>Grupalia</strong>!</p>
                <div className="mt-2">
                  <WALinkPreview
                    title={game ? `Únete a ${game.groupName} (${game.code})` : "Únete a un grupo de Grupalia"}
                    description={game ? `${MODE_INFO[game.mode as GameMode]?.label}  ~${MODE_INFO[game.mode as GameMode]?.durationMin} min` : "Tap para unirte al ciclo"}
                    domain="ciclo.datadiego.com"
                    onClick={handleJoinGroup}
                  />
                </div>
              </WAMessageIn>
            )}

            <div ref={scrollRef} />
          </WAChatBody>

          <WAInputBar disabled />
          <WAToast message={errorToast.message} visible={errorToast.visible} />
        </div>
      </Android>
    </div>
  );
}

// =====================================================
// WAITING ROOM
// =====================================================

function WaitingRoom({
  conn,
  identity,
  game,
  players,
  localPlayer,
  isCreator,
  chatMessages,
  customStickers,
  safeCall,
  errorToast,
}: {
  conn: DbConnection;
  identity: Identity;
  game: Game;
  players: readonly Player[];
  localPlayer: Player | null;
  isCreator: boolean;
  chatMessages: readonly ChatMessage[];
  customStickers: readonly CustomSticker[];
  safeCall: SafeCall;
  errorToast: { message: string; visible: boolean };
}) {
  const [nameInput, setNameInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [step, setStep] = useState<"name" | "pronoun" | "business" | "loan" | "ready">("name");
  const actionToast = useToast();
  const [showPicker, setShowPicker] = useState(false);
  const [businessInfoOpen, setBusinessInfoOpen] = useState<BusinessType | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);

  // Track when setup answers happened so they appear chronologically in chat
  const [nameAnsweredAt, setNameAnsweredAt] = useState<number | null>(null);
  const [pronounAnsweredAt, setPronounAnsweredAt] = useState<number | null>(null);
  const [businessAnsweredAt, setBusinessAnsweredAt] = useState<number | null>(null);
  const [loanAnsweredAt, setLoanAnsweredAt] = useState<number | null>(null);

  // Determine step based on player state
  const currentStep =
    localPlayer && localPlayer.name && localPlayer.pronoun && localPlayer.businessType && localPlayer.loanSize
      ? "ready"
      : localPlayer && localPlayer.name && localPlayer.pronoun && localPlayer.businessType
        ? "loan"
        : localPlayer && localPlayer.name && localPlayer.pronoun
          ? "business"
          : localPlayer && localPlayer.name
            ? "pronoun"
            : "name";

  useEffect(() => {
    setStep(currentStep);
  }, [currentStep]);

  // Capture timestamps when answers come in from server
  useEffect(() => {
    if (localPlayer?.name && !nameAnsweredAt) {
      setNameAnsweredAt(Date.now());
    }
  }, [localPlayer?.name, nameAnsweredAt]);

  useEffect(() => {
    if (localPlayer?.pronoun && !pronounAnsweredAt) {
      setPronounAnsweredAt(Date.now());
    }
  }, [localPlayer?.pronoun, pronounAnsweredAt]);

  useEffect(() => {
    if (localPlayer?.businessType && !businessAnsweredAt) {
      setBusinessAnsweredAt(Date.now());
    }
  }, [localPlayer?.businessType, businessAnsweredAt]);

  useEffect(() => {
    if (localPlayer?.loanSize && !loanAnsweredAt) {
      setLoanAnsweredAt(Date.now());
    }
  }, [localPlayer?.loanSize, loanAnsweredAt]);

  useEffect(() => {
    if (promptRef.current) {
      promptRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [step, players.length, chatMessages.length]);

  const shareUrl = `${window.location.origin}?room=${game.code}`;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      actionToast.show("Link copied!");
    } catch {
      actionToast.show("Could not copy");
    }
  };

  const handleSetName = (name: string) => {
    if (!name.trim()) return;
    safeCall(() => conn.reducers.setName({ name: name.trim() }));
    setNameInput("");
  };

  const handleSendChat = (text: string) => {
    if (!text.trim()) return;
    safeCall(() => conn.reducers.sendChatMessage({ content: text.trim(), kind: "text" }));
    setChatInput("");
    setShowPicker(false);
  };

  const handleSendSticker = (stickerId: string) => {
    safeCall(() => conn.reducers.sendChatMessage({ content: stickerId, kind: "sticker" }));
    setShowPicker(false);
  };

  const handleEmojiInsert = (emoji: string) => {
    setChatInput((prev) => prev + emoji);
  };

  const myHex = identity.toHexString();
  const canChat = step === "ready";

  // Build unified timeline: chat messages + setup Q&As, sorted chronologically
  type TimelineItem =
    | { type: "chat"; msg: ChatMessage; ts: number }
    | { type: "name_qa"; name: string; ts: number }
    | { type: "pronoun_qa"; name: string; pronoun: string; ts: number }
    | { type: "business_qa"; name: string; businessType: string; ts: number }
    | { type: "loan_qa"; name: string; loanSize: string; ts: number };

  const timeline: TimelineItem[] = [];

  // Add chat messages
  for (const msg of chatMessages) {
    timeline.push({ type: "chat", msg, ts: Number(msg.sentAt) });
  }

  // Add completed setup answers at their timestamps
  if (localPlayer?.name && nameAnsweredAt) {
    timeline.push({ type: "name_qa", name: localPlayer.name, ts: nameAnsweredAt });
  }
  if (localPlayer?.pronoun && pronounAnsweredAt) {
    const pronounLabel = localPlayer.pronoun === "f" ? "👩 Ella" : localPlayer.pronoun === "m" ? "👨 Él" : "🧑 Neutral";
    timeline.push({ type: "pronoun_qa", name: localPlayer.name, pronoun: pronounLabel, ts: pronounAnsweredAt });
  }
  if (localPlayer?.businessType && businessAnsweredAt) {
    timeline.push({
      type: "business_qa",
      name: localPlayer.name,
      businessType: localPlayer.businessType,
      ts: businessAnsweredAt,
    });
  }
  if (localPlayer?.loanSize && loanAnsweredAt) {
    timeline.push({
      type: "loan_qa",
      name: localPlayer.name,
      loanSize: localPlayer.loanSize,
      ts: loanAnsweredAt,
    });
  }

  timeline.sort((a, b) => a.ts - b.ts);

  return (
    <div className="flex items-center justify-center flex-1 min-h-0 py-2 md:py-6">
      <Android className="drop-shadow-2xl">
        <div className="flex flex-col h-full bg-white text-g-900 relative">
          <WAStatusBar />
          <WAHeader
            name={`${game.groupName} (${game.code})`}
            avatar={<GroupAvatar />}
            subtitle={`${players.length} participant${players.length !== 1 ? "s" : ""}`}
            verified
            onNameClick={isCreator && game.status === "lobby" ? () => { setRenameInput(game.groupName); setShowRenameModal(true); } : undefined}
          />

          <WAChatBody>
            <WADateDivider text="Today" />
            <WASystemMessage>
              Grupalia created this group
            </WASystemMessage>

            {/* Room info + share */}
            <WAMessageIn
              sender="Grupalia"
              time={formatTime(Date.now())}
              buttons={[
                {
                  label: "Share invite link",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  ),
                  onClick: handleShare,
                },
              ]}
            >
              <p>
                Grupo creado! Modo: <strong>{MODE_INFO[game.mode as GameMode]?.label || game.mode}</strong>{" "}
                ({MODE_INFO[game.mode as GameMode]?.weeks || "?"} semanas)
              </p>
              <div className="mt-2">
                <WALinkPreview
                  title={`Únete a ${game.groupName} (${game.code})`}
                  description={shareUrl}
                  domain="ciclo.datadiego.com"
                  color="#25D366"
                  onClick={handleShare}
                />
              </div>
            </WAMessageIn>

            {/* Player join notifications */}
            {players
              .filter((p) => p.name)
              .map((p) => (
                <WASystemMessage key={p.id.toString()}>
                  {p.name} joined{p.identity.toHexString() === myHex ? " (you)" : ""}
                </WASystemMessage>
              ))}

            {/* Unified timeline: chat messages + setup Q&As in chronological order */}
            {timeline.map((item, i) => {
              const time = formatTime(item.ts);

              if (item.type === "name_qa") {
                return (
                  <div key={`name-qa-${i}`} className="space-y-1.5">
                    <WAMessageIn sender="Grupalia" time={time}>¿Cómo te llamas?</WAMessageIn>
                    <WAMessageOut time={time}>{item.name}</WAMessageOut>
                  </div>
                );
              }

              if (item.type === "pronoun_qa") {
                return (
                  <div key={`pronoun-qa-${i}`} className="space-y-1.5">
                    <WAMessageIn sender="Grupalia" time={time}>
                      {item.name}, cómo te identificas?
                    </WAMessageIn>
                    <WAMessageOut time={time}>{item.pronoun}</WAMessageOut>
                  </div>
                );
              }

              if (item.type === "business_qa") {
                const info = BUSINESS_INFO[item.businessType as BusinessType];
                return (
                  <div key={`biz-qa-${i}`} className="space-y-1.5">
                    <WAMessageIn sender="Grupalia" time={time}>
                      {item.name}, qué negocio tienes?
                    </WAMessageIn>
                    <WAMessageOut time={time}>
                      {info?.emoji} {info?.label}
                    </WAMessageOut>
                  </div>
                );
              }

              if (item.type === "loan_qa") {
                const lsInfo = LOAN_INFO[item.loanSize as LoanSize];
                const gameTasa = TASA_BY_DIFFICULTY[game.difficulty as keyof typeof TASA_BY_DIFFICULTY] || TASA_PER_MIL;
                const weekly = lsInfo ? calcWeeklyPayment(lsInfo.credit, game.weeksTotal, gameTasa) : 0;
                return (
                  <div key={`loan-qa-${i}`} className="space-y-1.5">
                    <WAMessageIn sender="Grupalia" time={time}>
                      {item.name}, cuánto crédito necesitas?
                    </WAMessageIn>
                    <WAMessageOut time={time}>
                      {lsInfo?.emoji} {lsInfo?.label} ${lsInfo?.credit.toLocaleString()} (${weekly.toLocaleString()}/sem)
                    </WAMessageOut>
                  </div>
                );
              }

              // Chat message
              const msg = item.msg;
              const isMe = msg.senderIdentity.toHexString() === myHex;
              if (isMe) {
                return (
                  <WAMessageOut key={msg.id.toString()} time={time}>
                    {msg.kind === "sticker" ? (
                      <StickerBubble stickerId={msg.content} customStickers={customStickers} />
                    ) : (
                      msg.content
                    )}
                  </WAMessageOut>
                );
              }
              return (
                <WAMessageIn key={msg.id.toString()} sender={msg.senderName} time={time}>
                  {msg.kind === "sticker" ? (
                    <StickerBubble stickerId={msg.content} customStickers={customStickers} />
                  ) : (
                    msg.content
                  )}
                </WAMessageIn>
              );
            })}

            {/* Active prompt — only the current step, pinned at bottom */}
            <div ref={promptRef} />
            {step === "name" && (
              <WAMessageIn sender="Grupalia" time={formatTime(Date.now())}>
                ¿Cómo te llamas? Escribe tu nombre abajo.
              </WAMessageIn>
            )}

            {step === "pronoun" && localPlayer?.name && (
              <>
                <WAMessageIn sender="Grupalia" time={formatTime(Date.now())}>
                  <p>{localPlayer.name}, ¿Cómo te identificas?</p>
                </WAMessageIn>
                <div className="flex flex-wrap gap-1.5 mt-1 px-0">
                  {([
                    { value: "f", label: "Ella", emoji: "👩" },
                    { value: "m", label: "Él", emoji: "👨" },
                    { value: "x", label: "Neutral", emoji: "🧑" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => safeCall(() => conn.reducers.setPronoun({ pronoun: opt.value }))}
                      className="
                        inline-flex items-center py-2 px-3 rounded-lg text-[13px]
                        border border-[#D1D7DB] bg-white text-wa-teal shadow-sm
                        hover:bg-gray-50 transition-all cursor-pointer
                      "
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === "business" && localPlayer?.name && (
              <>
                <WAMessageIn sender="Grupalia" time={formatTime(Date.now())}>
                  <p>{localPlayer.name}, ¿Qué tipo de negocio tienes?</p>
                </WAMessageIn>
                <div className="flex flex-wrap gap-1.5 mt-1 px-0">
                  {(
                    Object.entries(BUSINESS_INFO) as [BusinessType, (typeof BUSINESS_INFO)[BusinessType]][]
                  ).map(([type, info]) => (
                    <div key={type} className="inline-flex items-center">
                      <button
                        onClick={() => safeCall(() => conn.reducers.pickBusinessType({ businessType: type }))}
                        className="
                          inline-flex items-center gap-1 py-2 px-3 rounded-lg text-[13px]
                          border border-[#D1D7DB] bg-white text-wa-teal shadow-sm
                          hover:bg-gray-50 transition-all cursor-pointer
                        "
                      >
                        {info.emoji} {info.label}
                        <span
                          role="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBusinessInfoOpen(type);
                          }}
                          className="ml-0.5 text-g-400 hover:text-g-600 cursor-pointer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Business info modal */}
                {businessInfoOpen && (() => {
                  const bi = BUSINESS_INFO[businessInfoOpen];
                  const diffColor =
                    bi.difficulty === "Favorable" ? "bg-green-50 text-green-700 border-green-200" :
                    bi.difficulty === "Equilibrado" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    bi.difficulty === "Riesgoso" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-red-50 text-red-700 border-red-200";
                  return (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                      onClick={() => setBusinessInfoOpen(null)}
                    >
                      <div
                        className="bg-white rounded-xl p-5 mx-6 max-w-xs w-full shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-center mb-3">
                          <span className="text-3xl">{bi.emoji}</span>
                          <h3 className="text-[16px] font-semibold text-g-900 mt-1">{bi.label}</h3>
                          <span className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${diffColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              bi.difficulty === "Favorable" ? "bg-green-500" :
                              bi.difficulty === "Equilibrado" ? "bg-blue-500" :
                              bi.difficulty === "Riesgoso" ? "bg-amber-500" :
                              "bg-red-500"
                            }`} />
                            {bi.difficulty}
                          </span>
                        </div>
                        <p className="text-[13px] text-g-600 text-center mb-4">{bi.desc}</p>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-100">
                            <span className="text-[11px] font-medium text-green-700">Evento positivo</span>
                            <span className="ml-auto text-[13px] font-semibold text-green-700">{bi.positive}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                            <span className="text-[11px] font-medium text-red-700">Evento negativo</span>
                            <span className="ml-auto text-[13px] font-semibold text-red-700">{bi.negative}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-g-400 text-center mb-3">Cada semana puede pasar un evento aleatorio en tu negocio</p>
                        <button
                          onClick={() => setBusinessInfoOpen(null)}
                          className="w-full py-2 rounded-lg text-[14px] font-medium text-wa-teal border border-[#D1D7DB] hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {step === "loan" && localPlayer?.name && (
              <>
                <WAMessageIn sender="Grupalia" time={formatTime(Date.now())}>
                  <p>{localPlayer.name}, ¿Cuánto crédito necesitas?</p>
                  <p className="text-[11px] text-g-500 mt-1">Tasa: ${TASA_BY_DIFFICULTY[game.difficulty as keyof typeof TASA_BY_DIFFICULTY] || TASA_PER_MIL} pesos por cada mil</p>
                </WAMessageIn>
                <div className="flex flex-wrap gap-1.5 mt-1 px-0">
                  {(
                    Object.entries(LOAN_INFO) as [LoanSize, { label: string; emoji: string; credit: number }][]
                  ).map(([size, info]) => {
                    const tasa = TASA_BY_DIFFICULTY[game.difficulty as keyof typeof TASA_BY_DIFFICULTY] || TASA_PER_MIL;
                    const weekly = calcWeeklyPayment(info.credit, game.weeksTotal, tasa);
                    return (
                      <button
                        key={size}
                        onClick={() => safeCall(() => conn.reducers.pickLoanSize({ loanSize: size }))}
                        className="
                          inline-flex items-center gap-1 py-2 px-3 rounded-lg text-[13px]
                          border border-[#D1D7DB] bg-white text-wa-teal shadow-sm
                          hover:bg-gray-50 transition-all cursor-pointer
                        "
                      >
                        {info.emoji} {info.label} <span className="font-semibold">${info.credit.toLocaleString()}</span>
                        <span className="text-g-500 text-[11px]">${weekly.toLocaleString()}/sem</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === "ready" && isCreator && (
              <WAMessageIn
                sender="Grupalia"
                time={formatTime(Date.now())}
                buttons={[
                  ...(players.length >= 2
                    ? [{
                        label: "Iniciar ciclo!",
                        icon: (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        ),
                        onClick: () => safeCall(() => conn.reducers.startGame({})),
                      }]
                    : []),
                ]}
              >
                {players.length < 2
                  ? `Esperando jugadores... (${players.length}/2 mínimo)`
                  : `${players.length} jugadores listos!`}
              </WAMessageIn>
            )}

            {step === "ready" && !isCreator && (() => {
              const creator = players.find((p) => p.identity.toHexString() === game.creator.toHexString());
              const cp = creator?.pronoun;
              return (
                <WAMessageIn sender="Grupalia" time={formatTime(Date.now())}>
                  Esperando a que {g(cp, "el anfitrión", "la anfitriona", "le anfitrione")} inicie el ciclo...
                </WAMessageIn>
              );
            })()}

            <div ref={scrollRef} />
          </WAChatBody>

          {/* Sticker/Emoji picker */}
          <div className="relative">
            {showPicker && canChat && (
              <StickerPicker
                onSelectSticker={handleSendSticker}
                onSelectEmoji={handleEmojiInsert}
                onUploadSticker={(name, imageData) => {
                  safeCall(() => conn.reducers.uploadSticker({ name, imageData }));
                }}
                onClose={() => setShowPicker(false)}
                customStickers={customStickers}
              />
            )}

            {/* Input bar */}
            {step === "name" ? (
              <WAInputBar
                placeholder="Tu nombre..."
                value={nameInput}
                onChange={setNameInput}
                onSend={handleSetName}
              />
            ) : canChat ? (
              <WAInputBar
                placeholder="Message..."
                value={chatInput}
                onChange={setChatInput}
                onSend={handleSendChat}
                onEmojiToggle={() => setShowPicker((v) => !v)}
                emojiActive={showPicker}
              />
            ) : (
              <WAInputBar disabled />
            )}
          </div>

          <WAToast message={actionToast.message} visible={actionToast.visible} />
          <WAToast message={errorToast.message} visible={errorToast.visible} />

          {/* Rename group modal */}
          {showRenameModal && (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
              onClick={() => setShowRenameModal(false)}
            >
              <div
                className="bg-white rounded-xl p-5 mx-6 max-w-xs w-full shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-[16px] font-semibold text-g-900 mb-1">Cambiar nombre del grupo</h3>
                <p className="text-[11px] text-g-500 mb-3">Código: {game.code}</p>
                <input
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  maxLength={30}
                  className="w-full px-3 py-2 border border-g-200 rounded-lg text-[14px] text-g-900 focus:outline-none focus:border-wa-teal mb-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && renameInput.trim()) {
                      safeCall(() => conn.reducers.setGroupName({ groupName: renameInput.trim() }));
                      setShowRenameModal(false);
                    }
                  }}
                />
                {/* Emoji picker */}
                <div className="mb-3 max-h-[120px] overflow-y-auto space-y-0.5">
                  {EMOJI_ROWS.map((row, i) => (
                    <div key={i} className="flex justify-around">
                      {row.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setRenameInput((prev) => prev + emoji)}
                          className="text-xl p-0.5 rounded hover:bg-g-50 active:bg-g-100 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRenameModal(false)}
                    className="flex-1 py-2 rounded-lg text-[14px] font-medium text-g-600 border border-[#D1D7DB] hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (renameInput.trim()) {
                        safeCall(() => conn.reducers.setGroupName({ groupName: renameInput.trim() }));
                        setShowRenameModal(false);
                      }
                    }}
                    className="flex-1 py-2 rounded-lg text-[14px] font-medium text-white bg-wa-teal hover:bg-wa-teal/90 transition-colors cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Android>
    </div>
  );
}
