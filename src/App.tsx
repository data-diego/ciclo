import { useState } from "react";
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

  // Find our game
  const game = gameCode ? games.find((g) => g.code === gameCode) : null;

  // Filter data for our game
  const gamePlayers = players.filter((p) => p.gameCode === gameCode);
  const gamePayments = payments.filter((p) => p.gameCode === gameCode);
  const gameWeekResults = weekResults.filter((r) => r.gameCode === gameCode);
  const gameChatMessages = chatMessages.filter((m) => m.gameCode === gameCode);
  const gameCustomStickers = customStickers.filter((s) => s.gameCode === gameCode);

  // Loading state
  if (!isActive) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 52px)" }}>
          <div className="text-g-500 text-sm">Connecting...</div>
        </div>
      </PageLayout>
    );
  }

  // Exit handler — clears game code to return to lobby
  const handleExit = () => setGameCode(null);

  // Show exit button when user is in a game
  const showExit = !!gameCode;

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
          payments={gamePayments}
          weekResults={gameWeekResults}
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
