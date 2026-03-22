import { useState, useEffect, useRef, useCallback } from "react";
import type { GameMode, Difficulty, BusinessType, LoanSize } from "../game/types";
import { BUSINESS_INFO, MODE_INFO, DIFFICULTY_INFO, LOAN_INFO, INCOME_BY_LOAN, TASA_PER_MIL, TASA_BY_DIFFICULTY, calcWeeklyPayment, g } from "../game/types";
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
  CicloInfoModal,
} from "../components/WhatsApp";
import type { DbConnection } from "../module_bindings";
import type { Identity } from "spacetimedb";
import type { Game, Player, ChatMessage, CustomSticker } from "../module_bindings/types";
import { StickerPicker, StickerBubble, EMOJI_ROWS } from "../components/StickerPicker";
import { useDarkMode, useSound } from "../components/PageLayout";

// --- Props ---

interface LobbyProps {
  conn: DbConnection;
  identity: Identity;
  gameCode: string | null;
  setGameCode: (code: string | null) => void;
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

function PhoneModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-4 mx-6 max-w-xs w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img src="/conquienhablaswe.png" alt="" className="w-full rounded-lg" />
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="text-[13px] font-medium text-wa-teal cursor-pointer hover:opacity-80 transition-opacity py-0 px-1"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function GrupaliaInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-4 mx-6 max-w-xs w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <img src="/icon.png" alt="Grupalia" className="w-10 h-10 rounded-lg" />
          <div>
            <h3 className="text-[16px] font-bold text-g-900">Grupalia</h3>
            <p className="text-[11px] text-g-500">Crédito grupal digital</p>
          </div>
        </div>
        <p className="text-[13px] text-g-700 leading-relaxed mb-3">
          Grupalia es una plataforma financiera que ofrece crédito grupal digital
          para pequeños negocios en México. Grupos de 6+ emprendedoras se respaldan
          mutuamente para acceder a préstamos sin aval, sin papeleo y con
          desembolso en 24 horas.
        </p>
        <div className="space-y-1.5 mb-4">
          <p className="text-[12px] text-g-500">
            <span className="font-semibold text-g-700">Ciclos de 16 semanas</span> con pagos semanales
          </p>
          <p className="text-[12px] text-g-500">
            <span className="font-semibold text-g-700">100% digital</span> desde la app móvil
          </p>
          <p className="text-[12px] text-g-500">
            <span className="font-semibold text-g-700">+10,000 clientas</span> y +$140M desembolsados
          </p>
          <p className="text-[12px] text-g-500">
            <span className="font-semibold text-g-700">Para quién:</span> vendedoras por catálogo, comerciantes, emprendedoras
          </p>
        </div>
        <a
          href="https://www.grupalia.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[13px] text-wa-teal font-medium hover:underline"
        >
          Ir a Grupalia.com
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-wa-teal">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
        <div className="flex justify-end mt-2">
          <button
            onClick={onClose}
            className="text-[13px] font-medium text-wa-teal cursor-pointer hover:opacity-80 transition-opacity py-0 px-1"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
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

  // If player already joined this room, skip join flow and go straight to lobby
  const alreadyInRoom = joinCode && players.some(
    (p) => p.gameCode === joinCode && p.identity.toHexString() === identity.toHexString()
  );

  if (!joinFlowDone && !alreadyInRoom) {
    const joinGame = joinCode ? games.find((g) => g.code === joinCode) ?? null : null;
    return (
      <JoinFlow
        conn={conn}
        roomCode={joinCode!}
        game={joinGame}
        safeCall={safeCall}
        errorToast={errorToast}
        onDone={() => {
          setGameCode(joinCode!);
          setJoinFlowDone(true);
        }}
        onGoToCreate={() => {
          window.history.replaceState(null, "", window.location.pathname);
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
        games={games}
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
      onExit={() => setGameCode(null)}
    />
  );
}

function ResetModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-4 mx-6 max-w-xs w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-2">
          <img src="/ciclo.svg" alt="CICLO" className="w-16 h-16" />
        </div>
        <h3 className="text-[16px] font-bold text-g-900 text-center mb-1">¿Quieres empezar de nuevo?</h3>
        <p className="text-[12px] text-g-500 text-center">
          Volverás al inicio para crear o unirte a otro grupo.
        </p>
        <div className="flex justify-center mt-5">
          <button
            onClick={onConfirm}
            className="py-1.5 px-5 rounded-lg text-[12px] font-semibold text-white bg-wa-teal hover:bg-wa-teal-dark transition-colors cursor-pointer"
          >
            Sí, reiniciar
          </button>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="text-[13px] font-medium text-wa-teal cursor-pointer hover:opacity-80 transition-opacity py-0 px-1"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// --- About Messages (timed reveal) ---

function AboutMessages({
  onCreateGroup,
  onJoinGroup,
  scrollToBottom,
  hideButtons,
}: {
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  scrollToBottom: () => void;
  hideButtons?: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  const totalMessages = 7;

  useEffect(() => {
    if (visibleCount >= totalMessages) return;
    const delays = [1200, 3500, 3800, 3500, 3800, 3200, 2800];
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), delays[visibleCount]);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  useEffect(() => {
    scrollToBottom();
  }, [visibleCount, scrollToBottom]);

  return (
    <>
      <WAMessageOut time={formatTime(Date.now())}>¿Qué es esto?</WAMessageOut>

      {visibleCount >= 1 && (
        <WAMessageIn time={formatTime(Date.now())}>
          <p>¡Buena pregunta! 😄</p>
          <p className="mt-1.5"><strong>CICLO</strong> es un juego que hicimos en el <strong>Hackatón Grupalia 2026</strong>. La idea es que entiendas qué es un crédito grupal y lo que viven nuestras clientas.</p>
        </WAMessageIn>
      )}

      {visibleCount >= 2 && (
        <WAMessageIn time={formatTime(Date.now())}>
          <p>¿Sabes cómo funciona Grupalia? 💡 Un grupo de emprendedoras se juntan, cada una pide un préstamo, y entre todas se respaldan. Si una no paga, afecta al grupo entero.</p>
        </WAMessageIn>
      )}

      {visibleCount >= 3 && (
        <WAMessageIn time={formatTime(Date.now())}>
          <p>Aquí vas a simular que tienes tu propio negocito 🏪 Eliges qué vendes, pides tu crédito y lo inviertes todo en tu negocio. Luego tienes que ir pagándolo semana a semana con lo que ganas.</p>
        </WAMessageIn>
      )}

      {visibleCount >= 4 && (
        <WAMessageIn time={formatTime(Date.now())}>
          <p>Pero no todo es tan fácil 📅 cada semana pasan cosas al azar: te llegan clientes, se te descompone algo, te sale un pedidote... y con eso decides cuánto puedes abonar.</p>
        </WAMessageIn>
      )}

      {visibleCount >= 5 && (
        <WAMessageIn time={formatTime(Date.now())}>
          <p>Lo más importante: si alguien de tu grupo anda corta, le puedes mandar solidario para ayudarle 🤝 El grupo se sostiene entre todas, igualito que en la vida real.</p>
        </WAMessageIn>
      )}

      {visibleCount >= 6 && (
        <WAMessageIn time={formatTime(Date.now())}>
          <p>Ah, y cada quien tiene un <strong>objetivo secreto</strong> que nadie más conoce 🤫 Si lo logras, puntos extra. Hay que ser estratégica también.</p>
        </WAMessageIn>
      )}

      {visibleCount >= 7 && (
        <WAMessageIn
          time={formatTime(Date.now())}
          buttons={hideButtons ? undefined : [
            {
              label: "Crear grupo",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              ),
              onClick: onCreateGroup,
            },
            {
              label: "Unirse a un grupo",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              ),
              onClick: onJoinGroup,
            },
          ]}
        >
          <p>Es un ejercicio de empatía para sentir lo que viven nuestras clientas 💜 ¿Le entramos?</p>
        </WAMessageIn>
      )}

      {visibleCount < totalMessages && !hideButtons && <WATyping />}
    </>
  );
}

// --- Created Messages (timed reveal) ---

function CreatedMessages({
  groupName,
  code,
  onGo,
  scrollToBottom,
}: {
  groupName: string;
  code: string;
  onGo: () => void;
  scrollToBottom: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  const totalMessages = 2;

  useEffect(() => {
    if (visibleCount >= totalMessages) return;
    const delays = [800, 1500];
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), delays[visibleCount]);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  useEffect(() => {
    scrollToBottom();
  }, [visibleCount, scrollToBottom]);

  return (
    <>
      {visibleCount >= 1 && (
        <WAMessageIn time={formatTime(Date.now())}>
          <p>¡Listo! Tu grupo <strong>{groupName}</strong> ya está creado 🎉</p>
          <p className="mt-1.5">El código es <strong>{code}</strong>, compártelo con tu equipo para que se unan.</p>
        </WAMessageIn>
      )}

      {visibleCount >= 2 && (
        <WAMessageIn
          time={formatTime(Date.now())}
          buttons={[
            {
              label: "Ir a mi grupo",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              ),
              onClick: onGo,
            },
          ]}
        >
          <p>Mucha suerte en este ciclo, van a ver que se pone bueno 💜 ¡Échenle ganas y apóyense entre todas!</p>
        </WAMessageIn>
      )}

      {visibleCount < totalMessages && <WATyping />}
    </>
  );
}

function JoinFoundMessages({
  game,
  onJoin,
  scrollToBottom,
}: {
  game: Game;
  onJoin: () => void;
  scrollToBottom: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  const totalMessages = 2;

  useEffect(() => {
    if (visibleCount >= totalMessages) return;
    const delays = [800, 1500];
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), delays[visibleCount]);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  useEffect(() => {
    scrollToBottom();
  }, [visibleCount, scrollToBottom]);

  return (
    <>
      {visibleCount >= 1 && (
        <WAMessageIn time={formatTime(Date.now())}>
          <p>¡Encontré tu grupo! Te invitaron a un ciclo de crédito en <strong>Grupalia</strong> 💜</p>
          <div className="mt-2">
            <WALinkPreview
              title={`Únete a ${game.groupName} (${game.code})`}
              description={`${MODE_INFO[game.mode as GameMode]?.label}  ~${MODE_INFO[game.mode as GameMode]?.durationMin} min`}
              domain="ciclo.datadiego.com"
              onClick={onJoin}
            />
          </div>
        </WAMessageIn>
      )}

      {visibleCount >= 2 && (
        <WAMessageIn
          time={formatTime(Date.now())}
          buttons={[
            {
              label: "Unirme al grupo",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="13" y1="11" x2="21" y2="3" />
                </svg>
              ),
              onClick: onJoin,
            },
          ]}
        >
          <p>Mucha suerte en este ciclo, recuerda que en el grupo se apoyan entre todas 🤝</p>
        </WAMessageIn>
      )}

      {visibleCount < totalMessages && <WATyping />}
    </>
  );
}

// CREATE FLOW — intro + mode picker, then straight to WaitingRoom
// =====================================================

function CreateFlow({
  conn,
  setGameCode,
  games,
  safeCall,
  errorToast,
}: {
  conn: DbConnection;
  setGameCode: (code: string | null) => void;
  games: readonly Game[];
  safeCall: SafeCall;
  errorToast: { message: string; visible: boolean };
}) {
  const [step, setStep] = useState<"typing_intro" | "intro" | "pick_difficulty" | "pick_mode" | "join_input" | "join_not_found" | "join_found" | "about" | "created">("typing_intro");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [triedCode, setTriedCode] = useState("");
  const [foundGame, setFoundGame] = useState<Game | null>(null);
  const [showGrupaliaInfo, setShowGrupaliaInfo] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [didAbout, setDidAbout] = useState(false);
  const { dark, toggle: toggleDark } = useDarkMode();
  const { soundOn, toggleSound } = useSound();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setStep("intro"), 800);
    return () => clearTimeout(t);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [step, scrollToBottom]);

  const handlePickDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    setStep("pick_mode");
  };

  const [createdCode, setCreatedCode] = useState("");
  const [createdName, setCreatedName] = useState("");

  const handlePickMode = (mode: GameMode) => {
    setSelectedMode(mode);
    const code = generateCode();
    const groupName = generateGroupName();
    safeCall(() => {
      conn.reducers.createGame({ code, groupName, mode, difficulty: difficulty! });
      setCreatedCode(code);
      setCreatedName(groupName);
      setStep("created");
    });
  };

  return (
    <div className="flex items-center justify-center flex-1 min-h-0 px-2 py-2 md:px-6 md:py-6">
      <Android className="drop-shadow-2xl">
        <div className="flex flex-col h-full bg-white text-g-900 relative">
          <WAStatusBar />
          <WAHeader
            name="Grupalia"
            avatar={<GrupaliaAvatar />}
            subtitle="Business account"
            verified
            onBack={() => setShowResetModal(true)}
            onAvatarClick={() => setShowGrupaliaInfo(true)}
            onNameClick={() => setShowGrupaliaInfo(true)}
            onPhoneClick={() => setShowPhoneModal(true)}
            onMenuClick={() => setShowSettingsMenu(v => !v)}
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
                        {
                          label: "Unirse a un grupo",
                          icon: (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                              <polyline points="10 17 15 12 10 7" />
                              <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                          ),
                          onClick: () => setStep("join_input"),
                        },
                        {
                          label: "¿Qué es esto?",
                          onClick: () => { setDidAbout(true); setStep("about"); },
                        },
                      ]
                    : undefined
                }
              >
                <p>Hola! Soy tu promotora de Grupalia 💜</p>
                <p className="mt-1.5">
                  ¿Estás lista para iniciar un nuevo ciclo de crédito grupal?
                  Junta a tu grupo y empecemos la experiencia.
                </p>
              </WAMessageIn>
            )}

            {didAbout && (
              <AboutMessages
                onCreateGroup={() => setStep("pick_difficulty")}
                onJoinGroup={() => setStep("join_input")}
                scrollToBottom={scrollToBottom}
                hideButtons={step !== "about"}
              />
            )}

            {/* Difficulty picker — WhatsApp quick reply buttons */}
            {(step === "pick_difficulty" || step === "pick_mode" || step === "created") && (
              <>
                <WAMessageOut time={formatTime(Date.now())}>Sí, quiero crear un grupo</WAMessageOut>
                <WAMessageIn time={formatTime(Date.now())}>
                  <p>¡Qué bueno! 💜 Aquí van a sentir lo que viven nuestras clientas en un ciclo de crédito grupal. Hay que pagar, apoyarse y sobrevivir los imprevistos.</p>
                </WAMessageIn>
                <WAMessageIn time={formatTime(Date.now())}>
                  <p>¿Qué nivel de dificultad quieres?</p>
                </WAMessageIn>
                {step === "pick_difficulty" && (
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
                )}
              </>
            )}

            {/* Mode picker */}
            {(step === "pick_mode" || step === "created") && difficulty && (
              <>
                <WAMessageOut time={formatTime(Date.now())}>
                  {DIFFICULTY_INFO[difficulty].emoji} {DIFFICULTY_INFO[difficulty].label}
                </WAMessageOut>
                <WAMessageIn time={formatTime(Date.now())}>
                  <p>¿Cuánto tiempo quieres jugar?</p>
                </WAMessageIn>
                {step === "pick_mode" && (
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
                )}
              </>
            )}

            {/* Selected mode answer */}
            {step === "created" && selectedMode && (
              <WAMessageOut time={formatTime(Date.now())}>
                {MODE_INFO[selectedMode].emoji} {MODE_INFO[selectedMode].label}
              </WAMessageOut>
            )}

            {/* Created — confirmation message */}
            {step === "created" && (
              <CreatedMessages
                groupName={createdName}
                code={createdCode}
                onGo={() => setGameCode(createdCode)}
                scrollToBottom={scrollToBottom}
              />
            )}

            {/* Join group input */}
            {(step === "join_input" || step === "join_not_found" || step === "join_found") && (
              <>
                <WAMessageOut time={formatTime(Date.now())}>Quiero unirme a un grupo</WAMessageOut>
                <WAMessageIn time={formatTime(Date.now())}>
                  <p>¡Perfecto! Escribe el código del grupo que te compartieron.</p>
                </WAMessageIn>
              </>
            )}

            {step === "join_found" && foundGame && (
              <>
                <WAMessageOut time={formatTime(Date.now())}>{foundGame.code}</WAMessageOut>
                <JoinFoundMessages
                  game={foundGame}
                  onJoin={() => {
                    safeCall(() => {
                      conn.reducers.joinGame({ code: foundGame.code });
                      setGameCode(foundGame.code);
                    });
                  }}
                  scrollToBottom={scrollToBottom}
                />
              </>
            )}

            {step === "join_not_found" && (
              <>
                <WAMessageOut time={formatTime(Date.now())}>{triedCode}</WAMessageOut>
                <WAMessageIn
                  time={formatTime(Date.now())}
                  buttons={[
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
                    {
                      label: "Intentar otro código",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                        </svg>
                      ),
                      onClick: () => {
                        setJoinCodeInput("");
                        setStep("join_input");
                      },
                    },
                  ]}
                >
                  <p>No encontré ningún grupo con el código <strong>{triedCode}</strong>. Revisa que esté bien escrito o crea tu propio grupo.</p>
                </WAMessageIn>
              </>
            )}

            <div ref={scrollRef} />
          </WAChatBody>

          <WAInputBar
            disabled={step !== "join_input"}
            placeholder={step === "join_input" ? "Código del grupo" : "Type a message"}
            value={step === "join_input" ? joinCodeInput : ""}
            onChange={step === "join_input" ? (v) => setJoinCodeInput(v.toUpperCase()) : undefined}
            onSend={step === "join_input" ? (v) => {
              const code = v.trim();
              if (!code) return;
              const found = games.find((g) => g.code === code);
              if (found) {
                setFoundGame(found);
                setJoinCodeInput("");
                setStep("join_found");
              } else {
                setTriedCode(code);
                setJoinCodeInput("");
                setStep("join_not_found");
              }
            } : undefined}
          />
          <WAToast message={errorToast.message} visible={errorToast.visible} />
          {showGrupaliaInfo && <GrupaliaInfoModal onClose={() => setShowGrupaliaInfo(false)} />}
          {showPhoneModal && <PhoneModal onClose={() => setShowPhoneModal(false)} />}
          {showResetModal && (
            <ResetModal
              onConfirm={() => { window.history.replaceState(null, "", window.location.pathname); window.location.reload(); }}
              onClose={() => setShowResetModal(false)}
            />
          )}
          {showSettingsMenu && (
            <div
              className="absolute inset-0 z-40"
              onClick={() => setShowSettingsMenu(false)}
            >
              <div
                className="absolute top-[72px] right-1 bg-white rounded-md shadow-xl border border-g-200 py-0.5 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setShowSettingsMenu(false); toggleDark(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-g-800 hover:bg-g-100 cursor-pointer"
                >
                  {dark ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  )}
                  <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
                </button>
                <button
                  onClick={() => { setShowSettingsMenu(false); toggleSound(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-g-800 hover:bg-g-100 cursor-pointer"
                >
                  {soundOn ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  )}
                  <span>{soundOn ? "Silenciar" : "Activar sonido"}</span>
                </button>
              </div>
            </div>
          )}
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
  onGoToCreate,
}: {
  conn: DbConnection;
  roomCode: string;
  game: Game | null | undefined;
  safeCall: SafeCall;
  errorToast: { message: string; visible: boolean };
  onDone: () => void;
  onGoToCreate: () => void;
}) {
  const [step, setStep] = useState<"typing_intro" | "invite">("typing_intro");
  const [showGrupaliaInfo, setShowGrupaliaInfo] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const { dark, toggle: toggleDark } = useDarkMode();
  const { soundOn, toggleSound } = useSound();
  const scrollRef = useRef<HTMLDivElement>(null);
  const gameExists = !!game;

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
    <div className="flex items-center justify-center flex-1 min-h-0 px-2 py-2 md:px-6 md:py-6">
      <Android className="drop-shadow-2xl">
        <div className="flex flex-col h-full bg-white text-g-900 relative">
          <WAStatusBar />
          <WAHeader
            name="Grupalia"
            avatar={<GrupaliaAvatar />}
            subtitle="Business account"
            verified
            onBack={() => setShowResetModal(true)}
            onAvatarClick={() => setShowGrupaliaInfo(true)}
            onNameClick={() => setShowGrupaliaInfo(true)}
            onPhoneClick={() => setShowPhoneModal(true)}
            onMenuClick={() => setShowSettingsMenu(v => !v)}
          />

          <WAChatBody>
            <WADateDivider text="Today" />
            <WASystemMessage>
              Messages to this business account are secured with end-to-end encryption.
            </WASystemMessage>

            {step === "typing_intro" && <WATyping />}

            {step !== "typing_intro" && gameExists && (
              <WAMessageIn
                time={formatTime(Date.now())}
                buttons={[{ label: "Unirme al grupo", icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="13" y1="11" x2="21" y2="3" /></svg>), onClick: handleJoinGroup }]}
              >
                <p>Te invitaron a un grupo de crédito en <strong>Grupalia</strong> 💜</p>
                <div className="mt-2">
                  <WALinkPreview
                    title={`Únete a ${game!.groupName} (${game!.code})`}
                    description={`${MODE_INFO[game!.mode as GameMode]?.label}  ~${MODE_INFO[game!.mode as GameMode]?.durationMin} min`}
                    domain="ciclo.datadiego.com"
                    onClick={handleJoinGroup}
                  />
                </div>
              </WAMessageIn>
            )}

            {step !== "typing_intro" && !gameExists && (
              <WAMessageIn
                time={formatTime(Date.now())}
                buttons={[
                  {
                    label: "Crear grupo",
                    icon: (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                      </svg>
                    ),
                    onClick: onGoToCreate,
                  },
                ]}
              >
                <p>No encontré ningún grupo con el código <strong>{roomCode}</strong>.</p>
                <p className="mt-1.5">Revisa que el código esté bien escrito o pide que te compartan el enlace de nuevo. También puedes crear tu propio grupo.</p>
              </WAMessageIn>
            )}

            <div ref={scrollRef} />
          </WAChatBody>

          <WAInputBar disabled />
          <WAToast message={errorToast.message} visible={errorToast.visible} />
          {showGrupaliaInfo && <GrupaliaInfoModal onClose={() => setShowGrupaliaInfo(false)} />}
          {showPhoneModal && <PhoneModal onClose={() => setShowPhoneModal(false)} />}
          {showResetModal && (
            <ResetModal
              onConfirm={() => { window.history.replaceState(null, "", window.location.pathname); window.location.reload(); }}
              onClose={() => setShowResetModal(false)}
            />
          )}
          {showSettingsMenu && (
            <div
              className="absolute inset-0 z-40"
              onClick={() => setShowSettingsMenu(false)}
            >
              <div
                className="absolute top-[72px] right-1 bg-white rounded-md shadow-xl border border-g-200 py-0.5 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setShowSettingsMenu(false); toggleDark(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-g-800 hover:bg-g-100 cursor-pointer"
                >
                  {dark ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  )}
                  <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
                </button>
                <button
                  onClick={() => { setShowSettingsMenu(false); toggleSound(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-g-800 hover:bg-g-100 cursor-pointer"
                >
                  {soundOn ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  )}
                  <span>{soundOn ? "Silenciar" : "Activar sonido"}</span>
                </button>
              </div>
            </div>
          )}
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
  onExit,
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
  onExit: () => void;
}) {
  const [nameInput, setNameInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [step, setStep] = useState<"name" | "pronoun" | "income" | "business" | "ready">("name");
  const actionToast = useToast();
  const [showPicker, setShowPicker] = useState(false);
  const [businessInfoOpen, setBusinessInfoOpen] = useState<BusinessType | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [showEmojiInModal, setShowEmojiInModal] = useState(false);

  const [showCicloInfo, setShowCicloInfo] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showPlayerMenu, setShowPlayerMenu] = useState(false);
  const [kickConfirm, setKickConfirm] = useState<{ name: string; identity: import("spacetimedb").Identity } | null>(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const { dark, toggle: toggleDark } = useDarkMode();
  const { soundOn, toggleSound } = useSound();
  const scrollRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);

  // Track when setup answers happened so they appear chronologically in chat
  const [nameAnsweredAt, setNameAnsweredAt] = useState<number | null>(null);
  const [pronounAnsweredAt, setPronounAnsweredAt] = useState<number | null>(null);
  const [businessAnsweredAt, setBusinessAnsweredAt] = useState<number | null>(null);
  const [loanAnsweredAt, setLoanAnsweredAt] = useState<number | null>(null);

  // Determine step based on player state (business → income)
  const currentStep =
    localPlayer && localPlayer.name && localPlayer.pronoun && localPlayer.businessType && localPlayer.loanSize
      ? "ready"
      : localPlayer && localPlayer.name && localPlayer.pronoun && localPlayer.businessType
        ? "income"
        : localPlayer && localPlayer.name && localPlayer.pronoun
          ? "business"
          : localPlayer && localPlayer.name
            ? "pronoun"
            : "name";

  const allPlayersReady = players.length >= 2 && players.every(p => p.name && p.businessType && p.loanSize);

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
      actionToast.show("Link copiado");
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
    <div className="flex items-center justify-center flex-1 min-h-0 px-2 py-2 md:px-6 md:py-6">
      <Android className="drop-shadow-2xl">
        <div className="flex flex-col h-full bg-white text-g-900 relative">
          <WAStatusBar />
          <WAHeader
            name={`${game.groupName} (${game.code})`}
            avatar={<GroupAvatar />}
            subtitle={`${players.length} participant${players.length !== 1 ? "s" : ""}`}
            verified
            onBack={() => setShowQuitConfirm(true)}
            onAvatarClick={() => setShowCicloInfo(true)}
            onNameClick={isCreator && game.status === "lobby" ? () => { setRenameInput(game.groupName); setShowEmojiInModal(false); setShowRenameModal(true); } : undefined}
            onPhoneClick={() => setShowPhoneModal(true)}
            onMenuClick={() => setShowPlayerMenu(v => !v)}
          />

          <WAChatBody>
            <WADateDivider text="Today" />
            <WASystemMessage>
              Grupo creado por Grupalia
            </WASystemMessage>

            {/* Room info + share */}
            <WAMessageIn
              sender="Grupalia"
              time={formatTime(Date.now())}
              buttons={[
                {
                  label: "Compartir link de invitación",
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
                const income = INCOME_BY_LOAN[item.loanSize as LoanSize];
                return (
                  <div key={`loan-qa-${i}`} className="space-y-1.5">
                    <WAMessageIn sender="Grupalia" time={time}>
                      {item.name}, cuánto gana tu negocio?
                    </WAMessageIn>
                    <WAMessageOut time={time}>
                      {lsInfo?.emoji} ${income?.toLocaleString()}/sem
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
                        className="bg-white rounded-xl p-4 mx-6 max-w-xs w-full shadow-xl"
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
                            <span className="ml-auto text-[13px] font-semibold text-green-700">+{bi.positivePct}% de tu ingreso</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-g-50 border border-g-200">
                            <span className="text-[11px] font-medium text-g-600">Evento neutro</span>
                            <span className="ml-auto text-[13px] font-semibold text-g-600">Sin efecto</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                            <span className="text-[11px] font-medium text-red-700">Evento negativo</span>
                            <span className="ml-auto text-[13px] font-semibold text-red-700">{bi.negativePct}% de tu ingreso</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-g-400 text-center">Cada semana puede pasar un evento aleatorio en tu negocio</p>
                        <div className="flex justify-end mt-5">
                          <button
                            onClick={() => setBusinessInfoOpen(null)}
                            className="text-[13px] font-medium text-wa-teal cursor-pointer hover:opacity-80 transition-opacity py-0 px-1"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {step === "income" && localPlayer?.name && (
              <>
                <WAMessageIn sender="Grupalia" time={formatTime(Date.now())}>
                  <p>{localPlayer.name}, ¿Cuánto gana tu negocio por semana?</p>
                </WAMessageIn>
                <div className="flex flex-col gap-1.5 mt-1 px-0">
                  {(
                    Object.entries(LOAN_INFO) as [LoanSize, { label: string; emoji: string; credit: number }][]
                  ).map(([size, info]) => {
                    const income = INCOME_BY_LOAN[size];
                    const tasa = TASA_BY_DIFFICULTY[game.difficulty as keyof typeof TASA_BY_DIFFICULTY] || TASA_PER_MIL;
                    const weekly = calcWeeklyPayment(info.credit, game.weeksTotal, tasa);
                    return (
                      <button
                        key={size}
                        onClick={() => safeCall(() => conn.reducers.pickLoanSize({ loanSize: size }))}
                        className="
                          flex items-center gap-3 py-2.5 px-3 rounded-xl text-left
                          border border-[#D1D7DB] bg-white shadow-sm
                          hover:border-wa-teal/40 hover:bg-emerald-50/50 transition-all cursor-pointer
                        "
                      >
                        <span className="text-2xl">{info.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[15px] font-bold text-wa-teal">${income.toLocaleString()}/sem</span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Crédito ${info.credit.toLocaleString()} · Pago ${weekly}/sem
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
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
                        label: allPlayersReady
                          ? "Iniciar ciclo!"
                          : "Esperando que todos elijan negocio...",
                        icon: allPlayersReady ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        ) : undefined,
                        disabled: !allPlayersReady,
                        onClick: allPlayersReady ? () => safeCall(() => conn.reducers.startGame({})) : undefined,
                      }]
                    : []),
                ]}
              >
                {players.length < 2
                  ? `Esperando jugadores... (${players.length}/2 mínimo)`
                  : allPlayersReady
                    ? `${players.length} jugadores listos!`
                    : `${players.filter(p => p.businessType && p.loanSize).length}/${players.length} jugadores listos`}
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
              onClick={() => { setShowRenameModal(false); setShowEmojiInModal(false); }}
            >
              <div
                className="bg-white rounded-xl p-4 mx-6 max-w-xs w-full shadow-xl max-h-[80%] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Group name input with emoji icon */}
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => setShowEmojiInModal((v) => !v)}
                    className="shrink-0"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={showEmojiInModal ? "#128C7E" : "#9AA4B2"}
                      strokeWidth="1.8"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <circle cx="9" cy="9.5" r="1.2" fill={showEmojiInModal ? "#128C7E" : "#9AA4B2"} stroke="none" />
                      <circle cx="15" cy="9.5" r="1.2" fill={showEmojiInModal ? "#128C7E" : "#9AA4B2"} stroke="none" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    maxLength={30}
                    className="flex-1 px-3 py-1.5 border border-g-200 rounded-lg text-[15px] font-semibold text-g-900 focus:outline-none focus:border-wa-teal"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && renameInput.trim()) {
                        safeCall(() => conn.reducers.setGroupName({ groupName: renameInput.trim() }));
                        setShowRenameModal(false);
                        setShowEmojiInModal(false);
                      }
                    }}
                  />
                </div>

                {/* Togglable emoji grid */}
                {showEmojiInModal && (
                  <div className="mb-2 max-h-[100px] overflow-y-auto space-y-0.5 rounded-lg bg-g-50 p-1.5">
                    {EMOJI_ROWS.map((row, i) => (
                      <div key={i} className="flex justify-around">
                        {row.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setRenameInput((prev) => prev + emoji)}
                            className="text-lg p-0.5 rounded hover:bg-g-100 active:bg-g-200 transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-g-500 mb-3">Código: {game.code}</p>

                {/* Group info: player list with kick */}
                <p className="text-[11px] font-semibold text-g-500 uppercase tracking-wide mb-1.5">
                  Integrantes ({players.length})
                </p>
                <div className="space-y-1.5 mb-4">
                  {players.map((p) => {
                    const biz = p.businessType ? BUSINESS_INFO[p.businessType as BusinessType] : null;
                    const isMe = p.identity.toHexString() === myHex;
                    const isPlayerCreator = p.identity.toHexString() === game.creator.toHexString();
                    return (
                      <div key={p.id.toString()} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-g-50">
                        <span className="text-[16px]">{biz?.emoji || "\u23F3"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[13px] font-medium text-g-900 truncate">{p.name || "Sin nombre"}</span>
                            {isMe && <span className="text-[10px] text-wa-teal font-medium">(tú)</span>}
                            {isPlayerCreator && <span className="text-[10px] text-g-400">· anfitrión</span>}
                          </div>
                          {biz && <p className="text-[10px] text-g-500 truncate">{biz.label}</p>}
                        </div>
                        <span className={`w-2 h-2 rounded-full ${p.online ? "bg-green-500" : "bg-g-300"}`} />
                        {isCreator && !isMe && (
                          <button
                            onClick={() => {
                              setShowRenameModal(false);
                              setShowEmojiInModal(false);
                              setKickConfirm({ name: p.name || "Sin nombre", identity: p.identity });
                            }}
                            className="text-[11px] text-red-500 hover:text-red-700 font-medium px-1.5 py-0.5 rounded hover:bg-red-50 cursor-pointer shrink-0"
                          >
                            Sacar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowRenameModal(false); setShowEmojiInModal(false); }}
                    className="flex-1 py-2 rounded-lg text-[14px] font-medium text-g-600 border border-[#D1D7DB] hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (renameInput.trim()) {
                        safeCall(() => conn.reducers.setGroupName({ groupName: renameInput.trim() }));
                        setShowRenameModal(false);
                        setShowEmojiInModal(false);
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


          {/* Kick confirm modal */}
          {kickConfirm && (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
              onClick={() => setKickConfirm(null)}
            >
              <div
                className="bg-white rounded-xl p-4 mx-6 max-w-xs w-full shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-[16px] font-semibold text-g-900 mb-2">Sacar jugador</h3>
                <p className="text-[14px] text-g-600 mb-4">
                  ¿Estás seguro que quieres sacar a <strong>{kickConfirm.name}</strong> del grupo?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setKickConfirm(null)}
                    className="flex-1 py-2 rounded-lg text-[14px] font-medium text-g-600 border border-[#D1D7DB] hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      safeCall(() => conn.reducers.kickPlayer({ playerIdentity: kickConfirm.identity }));
                      setKickConfirm(null);
                    }}
                    className="flex-1 py-2 rounded-lg text-[14px] font-medium text-white bg-err-600 hover:bg-err-700 transition-colors cursor-pointer"
                  >
                    Sacar
                  </button>
                </div>
              </div>
            </div>
          )}
          {showPhoneModal && <PhoneModal onClose={() => setShowPhoneModal(false)} />}
          {showCicloInfo && <CicloInfoModal onClose={() => setShowCicloInfo(false)} />}

          {/* Three-dot settings menu */}
          {showPlayerMenu && (
            <div
              className="absolute inset-0 z-40"
              onClick={() => setShowPlayerMenu(false)}
            >
              <div
                className="absolute top-[72px] right-1 bg-white rounded-md shadow-xl border border-g-200 py-0.5 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setShowPlayerMenu(false); toggleDark(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-g-800 hover:bg-g-100 cursor-pointer"
                >
                  {dark ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  )}
                  <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
                </button>
                <button
                  onClick={() => { setShowPlayerMenu(false); toggleSound(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-g-800 hover:bg-g-100 cursor-pointer"
                >
                  {soundOn ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  )}
                  <span>{soundOn ? "Silenciar" : "Activar sonido"}</span>
                </button>
                <button
                  onClick={() => { setShowPlayerMenu(false); setShowQuitConfirm(true); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  <span>Salir del grupo</span>
                </button>
              </div>
            </div>
          )}

          {/* Quit room confirmation modal */}
          {showQuitConfirm && (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
              onClick={() => setShowQuitConfirm(false)}
            >
              <div
                className="bg-white rounded-xl p-4 mx-6 max-w-xs w-full shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-[16px] font-bold text-g-900 mb-2">Salir del grupo</h3>
                <p className="text-[13px] text-g-700 mb-4">
                  ¿Seguro que quieres salir del grupo?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowQuitConfirm(false)}
                    className="text-[13px] font-medium text-g-500 hover:text-g-700 cursor-pointer px-3 py-1.5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      try { conn.reducers.leaveGame({}); } catch {}
                      onExit();
                    }}
                    className="text-[13px] font-medium text-red-600 hover:text-red-700 cursor-pointer px-3 py-1.5"
                  >
                    Salir
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
