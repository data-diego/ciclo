// Bot messages triggered by sub-phase transitions and game state.
// Presidenta = the comadre del grupo, warm, gossipy, Mexican slang.
// Client-side hook only adds REACTIVE messages not covered by server.

import { useMemo } from "react";

export interface BotMessage {
  id: string;
  text: string;
  kind: "presidenta";
}

export function useBotMessages(
  subPhase: string,
  currentWeek: number,
  totalPlayers: number,
  readyCount: number,
  targetPayment: number,
  weekPaidTotal: number,
  hasSolidarioRequests: boolean,
  solidarioRequesterName: string,
  groupPassedLastWeek: boolean | null,
): BotMessage[] {
  return useMemo(() => {
    const msgs: BotMessage[] = [];
    const wk = `w${currentWeek}`;

    // ─── PRESIDENTA (la comadre, warm Mexican Spanish) ─────

    if (subPhase === "decision" && currentWeek === 1) {
      msgs.push({
        id: `${wk}-pres-intro`,
        text: "Si no saben como abrir la app de Grupalia, solo vayan a los tres puntitos de arriba a la derecha 😊",
        kind: "presidenta",
      });
      msgs.push({
        id: `${wk}-pres-credit`,
        text: "Acuérdense que todo el crédito ya lo invertimos en nuestros negocios, así que ahora hay que pagarlo con lo que vamos ganando 💪",
        kind: "presidenta",
      });
    }

    if (subPhase === "decision" && groupPassedLastWeek === false) {
      msgs.push({
        id: `${wk}-pres-lastweek`,
        text: "Ay amigas, la semana pasada no la libramos 😔 pero no pasa nada, esta semana si se puede! Echenle ganitas",
        kind: "presidenta",
      });
    }

    if (subPhase === "decision" && hasSolidarioRequests) {
      msgs.push({
        id: `${wk}-pres-solidario`,
        text: `Oigan pues ${solidarioRequesterName} anda batallando, a ver quien le echa la manita 🙏 abran Grupalia en los tres puntitos y manden solidario`,
        kind: "presidenta",
      });
    }

    if (subPhase === "decision" && readyCount > 0 && readyCount < totalPlayers) {
      const remaining = totalPlayers - readyCount;
      msgs.push({
        id: `${wk}-pres-waiting-${readyCount}`,
        text: remaining === 1
          ? "Nomas falta una comadre! Ya merito, abran Grupalia en los puntitos de arriba 🙏"
          : `Ya van ${readyCount} listas, faltan ${remaining}. Abran los tres puntitos arriba a la derecha para ir a Grupalia!`,
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
  }, [subPhase, currentWeek, totalPlayers, readyCount, targetPayment, weekPaidTotal, hasSolidarioRequests, solidarioRequesterName, groupPassedLastWeek]);
}
