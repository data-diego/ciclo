import { useState } from "react";
import type { BusinessType } from "../game/types";
import { BUSINESS_INFO, LOAN_INFO, g } from "../game/types";
import { Android } from "../components/Android";
import {
  WAStatusBar,
  WAHeader,
  WAChatBody,
  WADateDivider,
  WAMessageIn,
  WASystemMessage,
  WAInputBar,
} from "../components/WhatsApp";
import { AppDock } from "../components/AppDock";
import type {
  Game as GameT,
  Player,
  WeekResult,
  SecretObjective,
} from "../module_bindings/types";
import type { Identity } from "spacetimedb";

// --- Props ---

interface ResultsProps {
  game: GameT;
  identity: Identity;
  players: readonly Player[];
  weekResults: readonly WeekResult[];
  secretObjectives: readonly SecretObjective[];
}

function GrupaliaAvatar() {
  return (
    <img src="/ciclogo.png" alt="Grupalia" className="w-full h-full object-cover" />
  );
}

export function Results({ game, identity, players, weekResults, secretObjectives }: ResultsProps) {
  const [activeApp, setActiveApp] = useState<"whatsapp">("whatsapp");

  const myHex = identity.toHexString();
  const localPlayer = players.find((p) => p.identity.toHexString() === myHex);

  const totalWeeks = weekResults.length;
  const weeksPassed = weekResults.filter((r) => r.passed).length;
  const weeksMissed = totalWeeks - weeksPassed;

  const graduationStatus =
    weeksMissed === 0
      ? "graduado"
      : weeksMissed <= 3
        ? "no_graduado"
        : "moroso";

  const pn = localPlayer?.pronoun;
  const graduationConfig = {
    graduado: {
      emoji: "\u{1F393}",
      label: g(pn, "GRADUADO", "GRADUADA", "GRADUADE"),
      message: "0 pagos perdidos. El grupo sobrevivió el ciclo!",
    },
    no_graduado: {
      emoji: "\u{1F62C}",
      label: g(pn, "NO GRADUADO", "NO GRADUADA", "NO GRADUADE"),
      message: `${weeksMissed} pagos tardíos. Sobrevivieron... apenas.`,
    },
    moroso: {
      emoji: "\u{1F480}",
      label: g(pn, "MOROSO", "MOROSA", "MOROSE"),
      message: `${weeksMissed} pagos perdidos. El grupo no sobrevivió.`,
    },
  };

  const grad = graduationConfig[graduationStatus];
  const sortedPlayers = [...players].sort((a, b) => b.money - a.money);

  const whatsappIcon = (
    <div className="w-full h-full bg-[#25D366] flex items-center justify-center">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </div>
  );

  return (
    <div className="flex items-center justify-center gap-4 flex-1 min-h-0 py-2 md:py-6 overflow-x-auto">
      <div className="shrink-0 h-full">
        <AppDock
          apps={[
            {
              id: "whatsapp",
              label: "WhatsApp",
              icon: whatsappIcon,
              active: activeApp === "whatsapp",
              ringColor: "#25D366",
              onClick: () => setActiveApp("whatsapp"),
            },
          ]}
        />
      </div>

      <div className="shrink-0 h-full">
        <Android className="drop-shadow-2xl">
          <div className="flex flex-col h-full bg-white text-g-900 relative">
            <WAStatusBar />
            <WAHeader
              name={`${game.groupName} (${game.code})`}
              avatar={<GrupaliaAvatar />}
              subtitle="Ciclo terminado"
              verified
            />

            <WAChatBody>
              <WADateDivider text="Fin del ciclo" />

              <WASystemMessage>El ciclo ha terminado</WASystemMessage>

              <WAMessageIn sender="Grupalia">
                <div className="text-center py-2">
                  <span className="text-5xl block mb-3">{grad.emoji}</span>
                  <p className="text-[18px] font-bold mb-1">{grad.label}</p>
                  <p className="text-[13px] text-g-600">{grad.message}</p>
                  {game.totalMora > 0 && (
                    <p className="text-[12px] text-red-600 font-medium mt-2">
                      Mora total acumulada: ${game.totalMora}
                    </p>
                  )}
                </div>
              </WAMessageIn>

              <WAMessageIn sender="Grupalia">
                <p className="font-semibold text-[14px] mb-3">Resumen del ciclo</p>
                <div className="flex justify-around mb-3">
                  <div className="text-center">
                    <p className="text-xl font-bold font-mono text-ok-600">{weeksPassed}</p>
                    <p className="text-[11px] text-g-500">Cumplidos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold font-mono text-red-500">{weeksMissed}</p>
                    <p className="text-[11px] text-g-500">Perdidos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold font-mono text-g-900">{totalWeeks}</p>
                    <p className="text-[11px] text-g-500">Total</p>
                  </div>
                </div>
                <div className="flex gap-1 justify-center flex-wrap">
                  {weekResults.map((r) => (
                    <div
                      key={r.week}
                      className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-mono font-bold ${
                        r.passed ? "bg-ok-100 text-ok-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {r.week}
                    </div>
                  ))}
                </div>
              </WAMessageIn>

              {/* Ranking final */}
              <WAMessageIn sender="Grupalia">
                <p className="font-semibold text-[14px] mb-2">Ranking final</p>
                <div className="space-y-1">
                  {sortedPlayers.map((p, i) => {
                    const bt = p.businessType as BusinessType;
                    const info = bt ? BUSINESS_INFO[bt] : null;
                    const lsInfo = LOAN_INFO[p.loanSize as keyof typeof LOAN_INFO];
                    return (
                      <div
                        key={p.id.toString()}
                        className="flex items-center justify-between py-1.5 px-2 rounded bg-g-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-g-400 w-4 text-right font-mono">{i + 1}</span>
                          <span className="text-sm">{info?.emoji || "\u{2B1C}"}</span>
                          <div>
                            <span className="text-[13px] font-medium text-g-900">{p.name}</span>
                            <p className="text-[10px] text-g-500">{info?.label} — {lsInfo?.emoji} ${lsInfo?.credit.toLocaleString()}</p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-g-900 text-[13px]">
                          ${p.money.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </WAMessageIn>

              {/* Secret objectives reveal */}
              {secretObjectives.length > 0 && (
                <WAMessageIn sender="Grupalia">
                  <p className="font-semibold text-[14px] mb-2">{"\u{1F3AF}"} Objetivos secretos</p>
                  <div className="space-y-2">
                    {secretObjectives.map((obj) => {
                      const player = players.find(
                        (p) => p.identity.toHexString() === obj.playerIdentity.toHexString()
                      );
                      const bt = player?.businessType as BusinessType;
                      const info = bt ? BUSINESS_INFO[bt] : null;
                      return (
                        <div
                          key={obj.id.toString()}
                          className={`px-2.5 py-2 rounded-lg border ${
                            obj.completed
                              ? "bg-ok-50 border-ok-100"
                              : "bg-red-50 border-red-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{info?.emoji}</span>
                            <span className="text-[13px] font-medium text-g-900">{player?.name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              obj.completed ? "bg-ok-100 text-ok-700" : "bg-red-100 text-red-700"
                            }`}>
                              {obj.completed ? "CUMPLIDO" : "NO"}
                            </span>
                          </div>
                          <p className="text-[12px] text-g-600">{obj.description}</p>
                          {obj.completed && (
                            <p className="text-[11px] text-ok-600 font-medium mt-0.5">
                              +${obj.bonusMoney} bonus!
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </WAMessageIn>
              )}

              <WAMessageIn
                sender="Grupalia"
                buttons={[{
                  label: "Jugar de nuevo",
                  onClick: () => window.location.reload(),
                }]}
              >
                Gracias por participar en este ciclo!
              </WAMessageIn>
            </WAChatBody>

            <WAInputBar disabled placeholder="El ciclo ha terminado" />
          </div>
        </Android>
      </div>
    </div>
  );
}
