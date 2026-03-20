import type { BusinessType } from "../game/types";
import { BUSINESS_INFO } from "../game/types";
import type { useGameStore } from "../game/store";

type Store = ReturnType<typeof useGameStore>;

export function Results({ store }: { store: Store }) {
  const { game, players, weekResults, graduationStatus } = store;
  if (!game || !graduationStatus) return null;

  const totalWeeks = weekResults.length;
  const weeksPassed = weekResults.filter((r) => r.passed).length;
  const weeksMissed = totalWeeks - weeksPassed;

  const graduationConfig = {
    graduado: {
      emoji: "\u{1F393}",
      label: "GRADUADO",
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
      message: "0 pagos perdidos. El grupo sobrevivio el ciclo!",
    },
    no_graduado: {
      emoji: "\u{1F62C}",
      label: "NO GRADUADO",
      color: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
      message: `${weeksMissed} pagos tardios. Sobrevivieron... apenas.`,
    },
    moroso: {
      emoji: "\u{1F480}",
      label: "MOROSO",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
      message: `${weeksMissed} pagos perdidos. El grupo no sobrevivio.`,
    },
  };

  const grad = graduationConfig[graduationStatus];

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-4">
        {/* Graduation status */}
        <div
          className={`rounded-2xl p-8 shadow-lg border-2 text-center ${grad.bg}`}
        >
          <span className="text-6xl block mb-4">{grad.emoji}</span>
          <h1 className={`text-3xl font-bold mb-2 ${grad.color}`}>
            {grad.label}
          </h1>
          <p className="text-gray-600">{grad.message}</p>

          {game.totalMora > 0 && (
            <p className="text-red-500 text-sm mt-2">
              Total mora accumulated: ${game.totalMora}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Cycle Summary
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {weeksPassed}
              </p>
              <p className="text-xs text-gray-500">Weeks passed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">
                {weeksMissed}
              </p>
              <p className="text-xs text-gray-500">Weeks missed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {totalWeeks}
              </p>
              <p className="text-xs text-gray-500">Total weeks</p>
            </div>
          </div>

          {/* Week by week */}
          <div className="flex gap-1 justify-center flex-wrap">
            {weekResults.map((r) => (
              <div
                key={r.week}
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono ${
                  r.passed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
                title={`Week ${r.week}: $${r.totalPaid}/$${r.target}`}
              >
                {r.week}
              </div>
            ))}
          </div>
        </div>

        {/* Player standings */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Players
          </h2>

          <div className="space-y-2">
            {players
              .sort((a, b) => b.money - a.money)
              .map((p, i) => {
                const bt = p.businessType as BusinessType;
                const info = bt ? BUSINESS_INFO[bt] : null;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 w-6">
                        {i + 1}
                      </span>
                      <span className="text-xl">{info?.emoji || "\u{2B1C}"}</span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {p.name}
                          {p.role === "presidenta" && (
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium ml-2">
                              Presidenta
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {info?.label}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-gray-900">
                      ${p.money.toLocaleString()}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Play again */}
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors text-lg"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
