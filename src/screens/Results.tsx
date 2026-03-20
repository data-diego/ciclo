import type { BusinessType } from "../game/types";
import { BUSINESS_INFO } from "../game/types";
import { Card, Badge, Button } from "../components";
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
      variant: "success" as const,
      message: "0 pagos perdidos. El grupo sobrevivio el ciclo!",
    },
    no_graduado: {
      emoji: "\u{1F62C}",
      label: "NO GRADUADO",
      variant: "warning" as const,
      message: `${weeksMissed} pagos tardios. Sobrevivieron... apenas.`,
    },
    moroso: {
      emoji: "\u{1F480}",
      label: "MOROSO",
      variant: "error" as const,
      message: `${weeksMissed} pagos perdidos. El grupo no sobrevivio.`,
    },
  };

  const grad = graduationConfig[graduationStatus as keyof typeof graduationConfig];

  const statusTextColor: Record<string, string> = {
    success: "text-ok-700",
    warning: "text-warn-700",
    error: "text-err-700",
  };

  return (
    <div className="min-h-screen bg-g-50 logo-bg flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-4">
        {/* Graduation status */}
        <Card variant={grad.variant} className="text-center">
          <span className="text-6xl block mb-4">{grad.emoji}</span>
          <h1
            className={`text-2xl font-bold mb-2 ${statusTextColor[grad.variant]}`}
          >
            {grad.label}
          </h1>
          <p className="text-g-600 text-sm">{grad.message}</p>

          {game.totalMora > 0 && (
            <p className="text-err-600 text-xs mt-3 font-medium">
              Total mora accumulated: ${game.totalMora}
            </p>
          )}
        </Card>

        {/* Stats */}
        <Card>
          <h2 className="text-base font-semibold text-g-900 mb-4">
            Cycle Summary
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-ok-600">
                {weeksPassed}
              </p>
              <p className="text-xs text-g-500">Passed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-err-500">
                {weeksMissed}
              </p>
              <p className="text-xs text-g-500">Missed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-g-900">
                {totalWeeks}
              </p>
              <p className="text-xs text-g-500">Total</p>
            </div>
          </div>

          {/* Week grid */}
          <div className="flex gap-1 justify-center flex-wrap">
            {weekResults.map((r) => (
              <div
                key={r.week}
                className={`
                  w-8 h-8 rounded-[--radius-component] flex items-center justify-center
                  text-xs font-mono font-bold
                  ${r.passed ? "bg-ok-100 text-ok-700" : "bg-err-100 text-err-700"}
                `}
                title={`Week ${r.week}: $${r.totalPaid}/$${r.target}`}
              >
                {r.week}
              </div>
            ))}
          </div>
        </Card>

        {/* Player standings */}
        <Card>
          <h2 className="text-base font-semibold text-g-900 mb-4">Players</h2>

          <div className="space-y-1.5">
            {players
              .sort((a, b) => b.money - a.money)
              .map((p, i) => {
                const bt = p.businessType as BusinessType;
                const info = bt ? BUSINESS_INFO[bt] : null;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-[--radius-component] bg-g-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-g-400 w-5 text-right font-mono">
                        {i + 1}
                      </span>
                      <span className="text-lg">{info?.emoji || "\u{2B1C}"}</span>
                      <div>
                        <p className="font-medium text-g-900 text-sm">
                          {p.name}
                          {p.role === "presidenta" && (
                            <Badge variant="presidenta" className="ml-2">
                              Presidenta
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-g-500">{info?.label}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-g-900 text-sm">
                      ${p.money.toLocaleString()}
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>

        {/* Play again */}
        <Button onClick={() => window.location.reload()} fullWidth size="xl">
          Play Again
        </Button>
      </div>
    </div>
  );
}
