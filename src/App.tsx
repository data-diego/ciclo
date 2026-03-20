import { useState } from "react";
import { useSpacetimeDB } from "spacetimedb/react";
import { useTable } from "spacetimedb/react";
import { tables, type DbConnection } from "./module_bindings";
import { useGameStore } from "./game/store";
import { Lobby } from "./screens/Lobby";
import { Game } from "./screens/Game";
import { Results } from "./screens/Results";

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

  // Find our game
  const game = gameCode ? games.find((g) => g.code === gameCode) : null;

  // Local store for Game/Results screens (temporary bridge)
  const localStore = useGameStore();

  // Loading state
  if (!isActive) {
    return (
      <div className="min-h-screen bg-g-50 logo-bg flex items-center justify-center">
        <div className="text-g-500 text-sm">Connecting...</div>
      </div>
    );
  }

  // Route based on game status
  if (game?.status === "playing") {
    return <Game store={localStore} />;
  }

  if (game?.status === "finished") {
    return <Results store={localStore} />;
  }

  // Lobby (no game, or game in lobby status)
  return (
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
  );
}

export default App;
