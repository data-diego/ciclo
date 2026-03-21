// Bot messages triggered by sub-phase transitions and game state.
// Promotora = official Grupalia communications (mora, results).
// Presidenta = the comadre del grupo, warm, gossipy, Mexican slang.
// Client-side hook only adds REACTIVE messages not covered by server.

import { useMemo } from "react";

export interface BotMessage {
  id: string;
  text: string;
  kind: "promoter" | "presidenta";
}

export function useBotMessages(
  subPhase: string,
  currentWeek: number,
  totalPlayers: number,
  readyCount: number,
  totalMora: number,
  targetPayment: number,
  weekPaidTotal: number,
  _weekPaidCount: number,
  hasSolidarioRequests: boolean,
  solidarioRequesterName: string,
  groupPassedLastWeek: boolean | null,
): BotMessage[] {
  return useMemo(() => {
    const msgs: BotMessage[] = [];
    const wk = `w${currentWeek}`;

    // ─── PROMOTORA (official, factual) ─────────────────────

    if (subPhase === "evento" && totalMora > 0) {
      msgs.push({
        id: `${wk}-promo-mora`,
        text: `Aviso: El grupo tiene mora acumulada de $${totalMora}. Se divide entre todos.`,
        kind: "promoter",
      });
    }

    if (subPhase === "platica") {
      msgs.push({
        id: `${wk}-promo-target`,
        text: `El pago grupal de esta semana es de $${targetPayment.toLocaleString()}.`,
        kind: "promoter",
      });
    }

    // ─── PRESIDENTA (la comadre, warm Mexican Spanish) ─────

    if (subPhase === "evento" && groupPassedLastWeek === false) {
      msgs.push({
        id: `${wk}-pres-lastweek`,
        text: "Ay amigas, la semana pasada no la libramos 😔 pero no pasa nada, esta semana si se puede! Echenle ganitas",
        kind: "presidenta",
      });
    }

    if (subPhase === "platica" && hasSolidarioRequests) {
      msgs.push({
        id: `${wk}-pres-solidario`,
        text: `Oigan pues ${solidarioRequesterName} anda batallando, a ver quien le echa la manita 🙏 entre todas nos sacamos adelante`,
        kind: "presidenta",
      });
    }

    if (subPhase === "decision" && readyCount > 0 && readyCount < totalPlayers) {
      const remaining = totalPlayers - readyCount;
      msgs.push({
        id: `${wk}-pres-waiting-${readyCount}`,
        text: remaining === 1
          ? "Nomas falta una comadre! Ya merito acabamos, ahi le apuramos plis 🙏"
          : `Oigan pues ya somos ${readyCount} listas, faltan ${remaining} nomas. Ahi le mueven porfa!`,
        kind: "presidenta",
      });
    }

    if (subPhase === "resultado") {
      const passed = weekPaidTotal >= targetPayment;
      msgs.push({
        id: `${wk}-pres-resultado`,
        text: passed
          ? "Eso si!! Todas cumplimos esta semana, que bonito es cuando nos apoyamos 🥹💪"
          : "Hijole amigas, no se completo 😞 a ver que paso, necesitamos echarle mas ganas la proxima",
        kind: "presidenta",
      });
    }

    return msgs;
  }, [subPhase, currentWeek, totalPlayers, readyCount, totalMora, targetPayment, weekPaidTotal, hasSolidarioRequests, solidarioRequesterName, groupPassedLastWeek]);
}
