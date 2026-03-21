// AI Promotora — escalating hints rendered client-side based on elapsed time + payment state

export interface PromoterMessage {
  id: string;
  text: string;
  triggerAt: number; // seconds elapsed when this message appears
}

export function usePromoterMessages(
  phase: string,
  secondsLeft: number,
  paymentCount: number,
  totalPlayers: number,
  targetAmount: number,
  totalPaid: number,
  totalMora: number,
): PromoterMessage[] {
  if (phase !== "action") return [];

  const elapsed = 60 - secondsLeft;
  const messages: PromoterMessage[] = [];

  // ~12s (Martes): gentle reminder
  if (elapsed >= 12) {
    messages.push({
      id: "promoter-reminder",
      text: "Buenos días grupo, recuerden que hoy toca pago \u{1F4B0}",
      triggerAt: 12,
    });
  }

  // ~24s (Miercoles): status hint
  if (elapsed >= 24) {
    if (paymentCount >= totalPlayers) {
      messages.push({
        id: "promoter-status",
        text: "Excelente! Todos ya pagaron esta semana \u{1F389}",
        triggerAt: 24,
      });
    } else if (paymentCount > 0) {
      messages.push({
        id: "promoter-status",
        text: `Algunos ya pagaron, y los demás? \u{1F914}`,
        triggerAt: 24,
      });
    } else {
      messages.push({
        id: "promoter-status",
        text: "Mmm... todavía no veo pagos esta semana \u{1F62C}",
        triggerAt: 24,
      });
    }
  }

  // ~36s (Jueves): specific numbers
  if (elapsed >= 36) {
    if (paymentCount >= totalPlayers) {
      // Already all paid, no need for more pressure
    } else {
      const remaining = totalPlayers - paymentCount;
      messages.push({
        id: "promoter-specific",
        text: `Faltan ${remaining} pago${remaining > 1 ? "s" : ""} para completar la meta. Llevamos $${totalPaid.toLocaleString()} de $${targetAmount.toLocaleString()}`,
        triggerAt: 36,
      });
    }
  }

  // ~48s (Viernes): urgent
  if (elapsed >= 48) {
    if (paymentCount >= totalPlayers) {
      messages.push({
        id: "promoter-urgent",
        text: "Felicidades, completaron a tiempo! \u{1F973}",
        triggerAt: 48,
      });
    } else {
      const potentialMora = totalMora > 0
        ? 45 + 15 * totalMora / 45  // rough estimate
        : 45;
      messages.push({
        id: "promoter-urgent",
        text: `Último día! Si no completan, habrá mora de ~$${potentialMora} \u{1F630}`,
        triggerAt: 48,
      });
    }
  }

  return messages;
}
