import { useState, useEffect, useRef, useCallback } from "react";
import type { BusinessType } from "../game/types";
import { BUSINESS_INFO, LOAN_INFO, SOLIDARIO_MIN, SOLIDARIO_MAX, SOLIDARIO_STEP, SOLIDARIO_DEFAULT } from "../game/types";
import { useTimeOfDay } from "../game/useTimeOfDay";
import { useBotMessages } from "../game/useBotMessages";
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
import { StickerPicker, StickerBubble, EMOJI_ROWS } from "../components/StickerPicker";
import { GrupaliaApp } from "../components/GrupaliaApp";
import { useSound, useDarkMode } from "../components/PageLayout";
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
  onExit?: () => void;
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

// --- Ready state helpers ---

function getReadySet(readyJson: string): Set<string> {
  try {
    const arr = JSON.parse(readyJson);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
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
  onExit,
}: GameProps) {
  const myHex = identity.toHexString();
  const localPlayer = players.find((p) => p.identity.toHexString() === myHex);

  const isCreator = game.creator.toHexString() === myHex;
  useTimeOfDay(game.subPhase); // kept for future background tints

  // Ready state
  const readySet = getReadySet(game.readyPlayers);
  const readyCount = readySet.size;
  const isReady = readySet.has(myHex);

  // Bot messages (promotora + presidenta)
  const weekPayments = payments.filter((p) => p.week === game.currentWeek);
  const weekPaidTotal = weekPayments.reduce((sum, p) => sum + p.amount, 0);
  const solidarioReqs = chatMessages.filter(
    (m) => m.kind === "solidario_request" && m.week === game.currentWeek
  );
  const lastWeekPassed = game.currentWeek > 1
    ? weekPayments.length > 0 ? null : null // will be derived from weekResults if available
    : null;

  const botMessages = useBotMessages(
    game.subPhase,
    game.currentWeek,
    players.length,
    readyCount,
    game.totalMora,
    game.targetPayment,
    weekPaidTotal,
    weekPayments.length,
    solidarioReqs.length > 0,
    solidarioReqs[0]?.senderName || "",
    lastWeekPassed,
  );

  // Creator sends bot messages to DB (dedup by id)
  const sentBotRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isCreator) return;
    for (const msg of botMessages) {
      if (!sentBotRef.current.has(msg.id)) {
        sentBotRef.current.add(msg.id);
        try {
          conn.reducers.sendChatMessage({ content: msg.text, kind: msg.kind });
        } catch { /* ignore */ }
      }
    }
  }, [botMessages, isCreator, conn]);

  // App switching state
  const [activeApp, setActiveApp] = useState<"whatsapp" | "grupalia">("whatsapp");
  const { soundOn } = useSound();

  // Notification sounds
  const [seenMsgCount, setSeenMsgCount] = useState(chatMessages.length);
  const notifSoundRef = useRef<HTMLAudioElement | null>(null);
  const grupaliaNotifRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notifSoundRef.current = new Audio("/1.mp3");
    notifSoundRef.current.volume = 0.5;
    grupaliaNotifRef.current = new Audio("/2.mp3");
    grupaliaNotifRef.current.volume = 0.5;
  }, []);

  // Chat notification sound
  useEffect(() => {
    if (chatMessages.length > seenMsgCount && activeApp !== "whatsapp") {
      if (soundOn) notifSoundRef.current?.play().catch(() => {});
    }
  }, [chatMessages.length, seenMsgCount, activeApp, soundOn]);

  useEffect(() => {
    if (activeApp === "whatsapp") setSeenMsgCount(chatMessages.length);
  }, [activeApp, chatMessages.length]);

  // Phase change notification sound
  const prevPhaseKeyRef = useRef<string>("");
  useEffect(() => {
    const phaseKey = `${game.currentWeek}-${game.subPhase}`;
    if (prevPhaseKeyRef.current && prevPhaseKeyRef.current !== phaseKey) {
      if (soundOn) grupaliaNotifRef.current?.play().catch(() => {});
    }
    prevPhaseKeyRef.current = phaseKey;
  }, [game.currentWeek, game.subPhase, soundOn]);

  if (!localPlayer) return null;

  const handleMarkReady = () => {
    try { conn.reducers.markReady({}); } catch { /* ignore */ }
  };

  const handleForceAdvance = () => {
    try { conn.reducers.forceAdvance({}); } catch { /* ignore */ }
  };

  return (
      <div className="flex flex-col items-center flex-1 min-h-0 px-2 pt-1 pb-2 md:px-6 md:pt-3 md:pb-6 overflow-x-auto">

      <div className="shrink-0 flex-1 min-h-0">
      <Android className="drop-shadow-2xl h-full">
        {activeApp === "whatsapp" && (
          <WhatsAppChat
            conn={conn}
            identity={identity}
            game={game}
            players={players}
            chatMessages={chatMessages}
            customStickers={customStickers}
            onBack={() => setActiveApp("grupalia")}
            onExit={onExit}
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
            weekResults={weekResults}
            onBack={() => setActiveApp("whatsapp")}
            readyCount={readyCount}
            totalPlayers={players.length}
            isReady={isReady}
            isCreator={isCreator}
            onMarkReady={handleMarkReady}
            onForceAdvance={handleForceAdvance}
          />
        )}
      </Android>
      </div>
    </div>
  );
}

// --- Solidario Request Bar (modal with amount picker) ---

function SolidarioRequestBar({ game, conn }: { game: GameT; conn: DbConnection }) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState(SOLIDARIO_DEFAULT);

  if (game.subPhase !== "platica" && game.subPhase !== "decision") return null;

  const handleSend = () => {
    try { conn.reducers.requestSolidario({ amount }); } catch { /* ignore */ }
    setShowModal(false);
    setAmount(SOLIDARIO_DEFAULT);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold text-purple-600 bg-purple-50 border-t border-purple-100 hover:bg-purple-100 transition-colors cursor-pointer"
      >
        {"\u{1F49C}"} Pedir solidario
      </button>

      {showModal && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl p-4 mx-6 max-w-[260px] w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[15px] font-semibold text-g-900 mb-1 text-center">{"\u{1F49C}"} Pedir solidario</p>
            <p className="text-[11px] text-g-500 mb-4 text-center">Todos verán tu solicitud</p>

            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setAmount((a) => Math.max(SOLIDARIO_MIN, a - SOLIDARIO_STEP))}
                className="w-9 h-9 rounded-full border border-g-200 bg-white text-g-600 font-bold text-[18px] hover:bg-g-50 transition-colors cursor-pointer"
              >
                −
              </button>
              <p className="text-[24px] font-bold text-purple-700 font-mono">${amount}</p>
              <button
                onClick={() => setAmount((a) => Math.min(SOLIDARIO_MAX, a + SOLIDARIO_STEP))}
                className="w-9 h-9 rounded-full border border-g-200 bg-white text-g-600 font-bold text-[18px] hover:bg-g-50 transition-colors cursor-pointer"
              >
                +
              </button>
            </div>

            <button
              onClick={handleSend}
              className="w-full py-2.5 rounded-lg text-[14px] font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors cursor-pointer mb-2"
            >
              Pedir ${amount}
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2 text-[12px] text-g-400 font-medium cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// --- WhatsApp Chat (PURE SOCIAL — no game mechanics) ---

function WhatsAppChat({
  conn,
  identity,
  game,
  players,
  chatMessages,
  customStickers,
  onBack,
  onExit,
}: {
  conn: DbConnection;
  identity: Identity;
  game: GameT;
  players: readonly Player[];
  chatMessages: readonly ChatMessage[];
  customStickers: readonly CustomSticker[];
  onBack: () => void;
  onExit?: () => void;
}) {
  const myHex = identity.toHexString();
  const localPlayer = players.find((p) => p.identity.toHexString() === myHex);
  const { dark, toggle: toggleDark } = useDarkMode();
  const { soundOn, toggleSound } = useSound();
  const [chatInput, setChatInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showCicloInfo, setShowCicloInfo] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [showEmojiInModal, setShowEmojiInModal] = useState(false);
  const [kickConfirm, setKickConfirm] = useState<{ name: string; identity: import("spacetimedb").Identity } | null>(null);
  const toast = useToast();
  const isCreator = game.creator.toHexString() === myHex;

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);

  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    const onScroll = () => {
      isNearBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (isNearBottom.current) scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [chatMessages.length, scrollToBottom]);

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

  const timeline = [...chatMessages].sort((a, b) => Number(a.sentAt) - Number(b.sentAt));

  return (
    <div className="flex flex-col h-full bg-white text-g-900 relative">
      <WAStatusBar />
      <WAHeader
        name={`${game.groupName} (${game.code})`}
        avatar={<GrupaliaAvatar />}
        subtitle={`${players.length} integrantes`}
        verified
        onBack={onBack}
        onAvatarClick={() => setShowCicloInfo(true)}
        onNameClick={() => { setRenameInput(game.groupName); setShowEmojiInModal(false); setShowGroupInfo(true); }}
        onPhoneClick={() => setShowPhoneModal(true)}
        onMenuClick={() => setShowMenu((v) => !v)}
      />

      <div ref={chatBodyRef} className="flex-1 overflow-y-auto wa-chat-bg px-3 py-2 space-y-1.5">
        {timeline.map((msg) => {
          if (msg.kind === "promoter") {
            return (
              <WAMessageIn key={msg.id.toString()} sender="Promotora" time={formatTime(Number(msg.sentAt))}>
                {msg.content}
              </WAMessageIn>
            );
          }

          if (msg.kind === "presidenta") {
            return (
              <WAMessageIn key={msg.id.toString()} sender="Presidenta" time={formatTime(Number(msg.sentAt))}>
                {msg.content}
              </WAMessageIn>
            );
          }

          if (msg.kind === "divider") {
            return (
              <WADateDivider
                key={msg.id.toString()}
                text={msg.content.replace(/^---\s*/, "").replace(/\s*---$/, "")}
              />
            );
          }

          if (msg.kind === "system") {
            return (
              <WASystemMessage key={msg.id.toString()}>
                {msg.content}
              </WASystemMessage>
            );
          }

          if (msg.kind === "solidario_request") {
            return (
              <div key={msg.id.toString()} className="flex justify-center">
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 text-[12px] text-purple-700 font-medium">
                  {"\u{1F49C}"} {msg.content}
                </div>
              </div>
            );
          }

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

        {/* Solidario request button during platica/decision */}
        <SolidarioRequestBar
          game={game}
          conn={conn}
        />

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

      {showGroupInfo && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowGroupInfo(false)}
        >
          <div
            className="bg-white rounded-xl p-4 mx-6 max-w-xs w-full shadow-xl max-h-[80%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Group name with emoji toggle */}
            {isCreator ? (
              <>
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && renameInput.trim()) {
                        try { conn.reducers.setGroupName({ groupName: renameInput.trim() }); } catch {}
                        setShowGroupInfo(false);
                      }
                    }}
                  />
                </div>
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
              </>
            ) : (
              <h3 className="text-[16px] font-semibold text-g-900 mb-1">{game.groupName}</h3>
            )}

            <p className="text-[11px] text-g-500 mb-3">Código: {game.code} · Semana {game.currentWeek}/{game.weeksTotal}</p>

            {/* Player list */}
            <div className="space-y-2 mb-4">
              {players.map((p) => {
                const bt = p.businessType ? BUSINESS_INFO[p.businessType as BusinessType] : null;
                const ls = p.loanSize ? LOAN_INFO[p.loanSize as keyof typeof LOAN_INFO] : null;
                const isMe = p.identity.toHexString() === myHex;
                const isPlayerCreator = p.identity.toHexString() === game.creator.toHexString();
                return (
                  <div key={p.id.toString()} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-g-50">
                    <span className="text-lg">{bt?.emoji || "\u2753"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-medium text-g-900 truncate">{p.name || "..."}</span>
                        {isMe && <span className="text-[10px] text-wa-teal font-medium">(tú)</span>}
                        {isPlayerCreator && <span className="text-[10px] text-g-400">· anfitrión</span>}
                      </div>
                      <p className="text-[10px] text-g-500">
                        {bt?.label || "Sin negocio"} · {ls ? `$${ls.credit.toLocaleString()}` : "Sin crédito"}
                      </p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${p.online ? "bg-green-500" : "bg-g-300"}`} />
                    {isCreator && !isMe && (
                      <button
                        onClick={() => {
                          setShowGroupInfo(false);
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

            {isCreator && renameInput.trim() && renameInput.trim() !== game.groupName ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowGroupInfo(false)}
                  className="flex-1 py-2 rounded-lg text-[14px] font-medium text-g-600 border border-[#D1D7DB] hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    try { conn.reducers.setGroupName({ groupName: renameInput.trim() }); } catch {}
                    setShowGroupInfo(false);
                  }}
                  className="flex-1 py-2 rounded-lg text-[14px] font-medium text-white bg-wa-teal hover:bg-wa-teal/90 transition-colors cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            ) : (
              <div className="flex justify-end mt-5">
              <button
                onClick={() => setShowGroupInfo(false)}
                className="text-[13px] font-medium text-wa-teal cursor-pointer hover:opacity-80 transition-opacity py-0 px-1"
              >
                Cerrar
              </button>
              </div>
            )}
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
                  try { conn.reducers.kickPlayer({ playerIdentity: kickConfirm.identity }); } catch {}
                  setKickConfirm(null);
                }}
                className="flex-1 py-2 rounded-lg text-[14px] font-medium text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
              >
                Sacar
              </button>
            </div>
          </div>
        </div>
      )}

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
              <img src="/icon.png" alt="" className="w-4 h-4 rounded" />
              <span>Abrir Grupalia</span>
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

      {showCicloInfo && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowCicloInfo(false)}
        >
          <div
            className="bg-white rounded-xl p-4 mx-6 max-w-xs w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <img src="/ciclogo.png" alt="CICLO" className="w-10 h-10 rounded-full" />
              <h3 className="text-[16px] font-bold text-g-900">CICLO</h3>
            </div>
            <p className="text-[13px] text-g-700 leading-relaxed mb-3">
              Simulador de crédito grupal inspirado en la experiencia Grupalia.
              Únete a un grupo, elige tu negocio y monto de crédito, y navega
              ciclos semanales de pagos, eventos de negocio y mecánicas de solidaridad.
            </p>
            <div className="space-y-1.5 mb-4">
              <p className="text-[12px] text-g-500">
                <span className="font-semibold text-g-700">Suerte:</span> Eventos de negocio cada semana
              </p>
              <p className="text-[12px] text-g-500">
                <span className="font-semibold text-g-700">Habilidad:</span> Decisiones de pago y solidario
              </p>
              <p className="text-[12px] text-g-500">
                <span className="font-semibold text-g-700">Objetivos secretos:</span> Metas ocultas con bonos al final
              </p>
            </div>
            <p className="text-[11px] text-g-400 text-center">
              Ejercicio de empatía para entender la experiencia del crédito grupal
            </p>
            <div className="flex justify-end mt-5">
            <button
              onClick={() => setShowCicloInfo(false)}
              className="text-[13px] font-medium text-wa-teal cursor-pointer hover:opacity-80 transition-opacity py-0 px-1"
            >
              Cerrar
            </button>
            </div>
          </div>
        </div>
      )}

      {showPhoneModal && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowPhoneModal(false)}
        >
          <div
            className="bg-white rounded-xl p-4 mx-6 max-w-xs w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img src="/conquienhablaswe.png" alt="" className="w-full rounded-lg" />
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowPhoneModal(false)}
                className="text-[13px] font-medium text-wa-teal cursor-pointer hover:opacity-80 transition-opacity py-0 px-1"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
