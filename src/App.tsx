import { useState, useEffect, useRef } from "react";
import { useSpacetimeDB } from "spacetimedb/react";
import { useTable } from "spacetimedb/react";
import { tables, type DbConnection } from "./module_bindings";
import { Lobby } from "./screens/Lobby";
import { Game } from "./screens/Game";
import { Results } from "./screens/Results";
import { PageLayout } from "./components/PageLayout";

function App() {
  const { getConnection, isActive, identity } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null;

  // Track which game we're in (URL param > localStorage > null)
  const [gameCode, setGameCodeRaw] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("room") || localStorage.getItem("ciclo_game_code");
  });

  // Wrapper that persists gameCode to localStorage and updates URL
  const setGameCode = (code: string | null) => {
    setGameCodeRaw(code);
    if (code) {
      localStorage.setItem("ciclo_game_code", code);
      const url = new URL(window.location.href);
      url.searchParams.set("room", code);
      window.history.replaceState({}, "", url.toString());
    } else {
      localStorage.removeItem("ciclo_game_code");
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState({}, "", url.toString());
    }
  };

  // SpacetimeDB table subscriptions
  const [games] = useTable(tables.game);
  const [players] = useTable(tables.player);
  const [chatMessages] = useTable(tables.chatMessage);
  const [customStickers] = useTable(tables.customSticker);
  const [payments] = useTable(tables.payment);
  const [weekResults] = useTable(tables.weekResult);
  const [businessEvents] = useTable(tables.businessEvent);
  const [solidarioTransfers] = useTable(tables.solidarioTransfer);
  const [secretObjectives] = useTable(tables.secretObjective);

  // Find our game
  const game = gameCode ? games.find((g) => g.code === gameCode) : null;

  // Filter data for our game
  const gamePlayers = players.filter((p) => p.gameCode === gameCode);
  const gamePayments = payments.filter((p) => p.gameCode === gameCode);
  const gameWeekResults = weekResults.filter((r) => r.gameCode === gameCode);
  const gameChatMessages = chatMessages.filter((m) => m.gameCode === gameCode);
  const gameCustomStickers = customStickers.filter((s) => s.gameCode === gameCode);
  const gameBusinessEvents = businessEvents.filter((e) => e.gameCode === gameCode);
  const gameSolidarioTransfers = solidarioTransfers.filter((t) => t.gameCode === gameCode);
  const gameSecretObjectives = secretObjectives.filter((o) => o.gameCode === gameCode);

  // Detect kicked: we had a player row, now it's gone while game is still in lobby
  const [showKickedModal, setShowKickedModal] = useState(false);
  const wasInGame = useRef(false);

  const meInGame = identity && gameCode
    ? gamePlayers.some((p) => p.identity.toHexString() === identity.toHexString())
    : false;

  useEffect(() => {
    if (meInGame) {
      wasInGame.current = true;
    } else if (wasInGame.current && gameCode && game?.status === "lobby") {
      wasInGame.current = false;
      setShowKickedModal(true);
    }
  }, [meInGame, gameCode, game?.status]);

  // Loading state
  if (!isActive) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center flex-1 min-h-0">
          <img
            src="/ciclogo.png"
            alt="Ciclo"
            className="h-20 rounded-full animate-spin-spring"
          />
        </div>
      </PageLayout>
    );
  }

  // Exit handler — in lobby, also remove player from server
  const handleExit = () => {
    if (game?.status === "lobby" && conn) {
      try { conn.reducers.leaveGame({}); } catch {}
    }
    setGameCode(null);
  };

  // Show exit button when user is in a game
  const showExit = !!gameCode;

  // Kicked modal
  if (showKickedModal) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center flex-1 min-h-0">
          <div className="bg-white rounded-xl p-6 mx-6 max-w-xs w-full shadow-xl text-center">
            <p className="text-[40px] mb-3">🚪</p>
            <h2 className="text-[18px] font-bold text-g-900 mb-2">Te corrieron</h2>
            <p className="text-[14px] text-g-600 mb-4">
              El anfitrión te sacó del grupo.
            </p>
            <button
              onClick={() => {
                setShowKickedModal(false);
                setGameCode(null);
              }}
              className="w-full py-2.5 rounded-lg text-[14px] font-medium text-white bg-wa-teal hover:bg-wa-teal/90 transition-colors cursor-pointer"
            >
              Aceptar
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Route based on game status
  if (game?.status === "playing") {
    return (
      <PageLayout showExit={showExit} onExit={handleExit}>
        <Game
          conn={conn!}
          identity={identity!}
          game={game}
          players={gamePlayers}
          payments={gamePayments}
          weekResults={gameWeekResults}
          chatMessages={gameChatMessages}
          customStickers={gameCustomStickers}
          businessEvents={gameBusinessEvents}
          solidarioTransfers={gameSolidarioTransfers}
          secretObjectives={gameSecretObjectives}
        />
      </PageLayout>
    );
  }

  if (game?.status === "finished") {
    return (
      <PageLayout showExit={showExit} onExit={handleExit}>
        <Results
          game={game}
          identity={identity!}
          players={gamePlayers}
          weekResults={gameWeekResults}
          secretObjectives={gameSecretObjectives}
        />
      </PageLayout>
    );
  }

  // Lobby (no game, or game in lobby status)
  return (
    <PageLayout showExit={showExit} onExit={handleExit}>
      <Lobby
        conn={conn!}
        identity={identity!}
        gameCode={gameCode}
        setGameCode={setGameCode}
        games={games}
        players={players}
        chatMessages={chatMessages}
        customStickers={customStickers}
      />
    </PageLayout>
  );
}

export default App;
