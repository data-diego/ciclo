import { useState } from "react";
import type { GameMode, BusinessType } from "../game/types";
import { BUSINESS_INFO, MODE_INFO } from "../game/types";
import type { useGameStore } from "../game/store";

type Store = ReturnType<typeof useGameStore>;

export function Lobby({ store }: { store: Store }) {
  const { game, players, localPlayer, isCreator } = store;
  const [nameInput, setNameInput] = useState("");
  const [nameSet, setNameSet] = useState(false);

  if (!game) return <CreateRoom store={store} />;

  const handleSetName = () => {
    if (!nameInput.trim()) return;
    store.setName(nameInput.trim());
    setNameSet(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CICLO</h1>
          <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
            <span className="text-sm text-gray-500">Room</span>
            <span className="text-2xl font-mono font-bold tracking-widest text-gray-900">
              {game.code}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {MODE_INFO[game.mode as GameMode].label} /{" "}
            {MODE_INFO[game.mode as GameMode].weeks} weeks
          </p>
        </div>

        {/* Name input */}
        {!nameSet ? (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetName()}
                placeholder="Enter your name..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                autoFocus
              />
              <button
                onClick={handleSetName}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Business type picker */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Pick your business
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(BUSINESS_INFO) as [BusinessType, { emoji: string; label: string }][]).map(
                  ([type, info]) => (
                    <button
                      key={type}
                      onClick={() => store.pickBusinessType(type)}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                        localPlayer?.businessType === type
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-2xl mb-1">{info.emoji}</span>
                      <span className="text-xs font-medium text-gray-700">
                        {info.label}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          </>
        )}

        {/* Players list */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">
            Players ({players.length})
          </h2>
          <div className="space-y-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-50"
              >
                <span className="text-lg">
                  {p.businessType
                    ? BUSINESS_INFO[p.businessType as BusinessType]?.emoji
                    : "\u{2B1C}"}
                </span>
                <span className="font-medium text-gray-900">
                  {p.name || "..."}
                </span>
                {p.isLocal && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    you
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add bots (dev mode) */}
        {isCreator && (
          <div className="mb-4">
            <button
              onClick={() => {
                const names = [
                  "Ana",
                  "Rosa",
                  "Lupita",
                  "Maria",
                  "Carmen",
                  "Diana",
                ];
                const types: BusinessType[] = [
                  "tiendita",
                  "salon",
                  "puesto",
                  "catalogo",
                  "costura",
                  "panaderia",
                ];
                const idx = players.length - 1;
                store.addBot(
                  names[idx % names.length],
                  types[idx % types.length]
                );
              }}
              className="w-full py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              + Add bot player (dev)
            </button>
          </div>
        )}

        {/* Start button */}
        {isCreator && (
          <button
            onClick={store.startGame}
            disabled={players.length < 2}
            className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg"
          >
            Start Game
          </button>
        )}
        {!isCreator && (
          <p className="text-center text-sm text-gray-400">
            Waiting for host to start...
          </p>
        )}
      </div>
    </div>
  );
}

function CreateRoom({ store }: { store: Store }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">CICLO</h1>
        <p className="text-gray-500 mb-8">
          Experience a Grupalia credit cycle
        </p>

        <div className="space-y-3">
          {(Object.entries(MODE_INFO) as [GameMode, { label: string; weeks: number }][]).map(
            ([mode, info]) => (
              <button
                key={mode}
                onClick={() => store.createGame(mode)}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all"
              >
                <div className="text-left">
                  <div className="font-semibold text-gray-900">
                    {info.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {info.weeks} weeks
                  </div>
                </div>
                <span className="text-gray-400">&rarr;</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
