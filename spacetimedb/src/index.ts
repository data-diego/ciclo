import { schema, table, t, SenderError } from "spacetimedb/server";

// ═══════════════════════════════════════════════════════════════════
// TABLES
// ═══════════════════════════════════════════════════════════════════

const game = table(
  { public: true },
  {
    code: t.string().primaryKey(),
    groupName: t.string(),
    creator: t.identity(),
    status: t.string(), // "lobby" | "playing" | "finished"
    mode: t.string(), // "experiencia" | "medio" | "completo"
    difficulty: t.string(), // "facil" | "normal" | "dificil"
    weeksTotal: t.u32(),
    currentWeek: t.u32(),
    phase: t.string(), // "lobby" | "action" | "finished"
    subPhase: t.string(), // "decision" | "resultado" | ""
    readyPlayers: t.string(), // JSON array of identity hex strings
    targetPayment: t.u32(),
    totalMora: t.u32(),
    weeksMissed: t.u32(),
  }
);

const player = table(
  {
    public: true,
    indexes: [
      { accessor: "player_game_code", algorithm: "btree" as const, columns: ["gameCode"] },
    ],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    identity: t.identity().unique(),
    gameCode: t.string(),
    name: t.string(),
    businessType: t.string(),
    pronoun: t.string(),
    loanSize: t.string(),
    weeklyPayment: t.u32(),
    income: t.u32(), // weekly income (850/1050/1250)
    money: t.i32(),
    score: t.i32(), // running score total
    incomeModPct: t.i32(), // current income modifier %
    incomeModWeeks: t.u32(), // weeks remaining (0 = permanent)
    online: t.bool(),
  }
);

const payment = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    gameCode: t.string(),
    playerIdentity: t.identity(),
    week: t.u32(),
    amount: t.u32(),
    choice: t.string(), // "full" | "partial" | "none"
  }
);

const weekResult = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    gameCode: t.string(),
    week: t.u32(),
    totalPaid: t.u32(),
    target: t.u32(),
    passed: t.bool(),
    moraAdded: t.u32(),
  }
);

const gameEvent = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    gameCode: t.string(),
    kind: t.string(),
    message: t.string(),
  }
);

const chatMessage = table(
  {
    public: true,
    indexes: [
      { accessor: "chat_game_code", algorithm: "btree" as const, columns: ["gameCode"] },
    ],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    gameCode: t.string(),
    senderIdentity: t.identity(),
    senderName: t.string(),
    content: t.string(),
    kind: t.string(), // "text" | "sticker" | "system" | "presidenta" | "event" | "divider" | "solidario_request"
    sentAt: t.u64(),
    week: t.u32(),
  }
);

const customSticker = table(
  {
    public: true,
    indexes: [
      { accessor: "sticker_game_code", algorithm: "btree" as const, columns: ["gameCode"] },
    ],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    gameCode: t.string(),
    name: t.string(),
    imageData: t.string(),
    uploadedBy: t.identity(),
    uploadedByName: t.string(),
  }
);

const businessEvent = table(
  {
    public: true,
    indexes: [
      { accessor: "event_game_code", algorithm: "btree" as const, columns: ["gameCode"] },
    ],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    gameCode: t.string(),
    playerIdentity: t.identity(),
    week: t.u32(),
    eventKey: t.string(),
    moneyDelta: t.i32(), // computed from percentage × income
    message: t.string(),
    isChoice: t.bool(),
    choiceMade: t.bool(),
    accepted: t.bool(),
    costAmount: t.i32(),
    benefitPct: t.i32(),
    benefitDuration: t.u32(), // 0 = permanent, >0 = weeks
    penaltyPct: t.i32(),
    penaltyDuration: t.u32(),
  }
);

const solidarioTransfer = table(
  {
    public: true,
    indexes: [
      { accessor: "solidario_game_code", algorithm: "btree" as const, columns: ["gameCode"] },
    ],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    gameCode: t.string(),
    senderIdentity: t.identity(),
    receiverIdentity: t.identity(),
    week: t.u32(),
    amount: t.u32(),
  }
);

const secretObjective = table(
  {
    public: true,
    indexes: [
      { accessor: "objective_game_code", algorithm: "btree" as const, columns: ["gameCode"] },
    ],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    gameCode: t.string(),
    playerIdentity: t.identity(),
    objectiveKey: t.string(),
    description: t.string(),
    completed: t.bool(),
    bonusMoney: t.i32(),
    bonusScore: t.i32(),
  }
);

const spacetimedb = schema({
  game, player, payment, weekResult, gameEvent, chatMessage, customSticker,
  businessEvent, solidarioTransfer, secretObjective,
});
export default spacetimedb;

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const MODES: Record<string, number> = {
  experiencia: 4,
  medio: 8,
  completo: 16,
};

const INCOME_BY_LOAN: Record<string, number> = {
  small: 850,
  medium: 1050,
  large: 1250,
};

const STARTING_MONEY_MULT: Record<string, number> = {
  facil: 1.2,
  normal: 1.0,
  dificil: 0.8,
};

const LOAN_CREDIT: Record<string, number> = {
  small: 2000,
  medium: 3500,
  large: 5000,
};

const TASA_BY_DIFFICULTY: Record<string, number> = {
  facil: 65,
  normal: 75,
  dificil: 85,
};

const MORA_BASE = 60;
const MORA_GROWTH = 30;
const SOLIDARIO_MIN = 50;
const SOLIDARIO_MAX = 500;
const SOLIDARIO_STEP = 50; // UI should show multiples of 50

// Scoring
const SCORE_FULL = 100;
const SCORE_PARTIAL = 20;
const SCORE_NONE = -40;
const SCORE_SOLIDARIO = 30;
const SCORE_GROUP_PASSED = 60;
const SCORE_GROUP_FAILED = -20;
const SCORE_INVESTMENT = 25;
const SCORE_FAMILY = 20;

const LOAN_GROUP_MULT: Record<string, number> = {
  small: 1.0,
  medium: 1.15,
  large: 1.3,
};

// ═══════════════════════════════════════════════════════════════════
// EVENT CATALOG — percentage-based
// ═══════════════════════════════════════════════════════════════════

interface EventDef {
  key: string;
  businessTypes: string[] | "all";
  isChoice: boolean;
  moneyDeltaPct: number; // passive: % of income
  costPct: number; // choice: cost as % of income
  benefitPct: number; // choice: income boost %
  benefitDuration: number; // weeks (0 = permanent)
  penaltyPct: number; // choice: penalty if rejected
  penaltyDuration: number;
  weight: number;
  category: string; // "business" | "personal" | "investment" | "universal"
  message: string;
  choiceAcceptMsg: string;
  choiceRejectMsg: string;
}

const EVENT_CATALOG: EventDef[] = [
  // Passive neutral
  { key: "dia_normal", businessTypes: "all", isChoice: false, moneyDeltaPct: 0, costPct: 0, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 7, category: "business", message: "Día tranquilo en tu negocio. Sin novedades.", choiceAcceptMsg: "", choiceRejectMsg: "" },
  { key: "cliente_habitual", businessTypes: "all", isChoice: false, moneyDeltaPct: 8, costPct: 0, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 5, category: "business", message: "Llegaron los clientes de siempre, algo extra.", choiceAcceptMsg: "", choiceRejectMsg: "" },
  { key: "dia_lento", businessTypes: "all", isChoice: false, moneyDeltaPct: -8, costPct: 0, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 5, category: "business", message: "Semana lenta, menos ventas de lo normal.", choiceAcceptMsg: "", choiceRejectMsg: "" },
  // Passive positive
  { key: "buena_venta", businessTypes: ["tiendita", "catalogo"], isChoice: false, moneyDeltaPct: 25, costPct: 0, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 3, category: "business", message: "Se vendió todo el inventario! Buena semana.", choiceAcceptMsg: "", choiceRejectMsg: "" },
  { key: "pedido_grande", businessTypes: ["puesto", "panaderia"], isChoice: false, moneyDeltaPct: 30, costPct: 0, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 2, category: "business", message: "Pedido grande para una fiesta! Excelente semana.", choiceAcceptMsg: "", choiceRejectMsg: "" },
  { key: "clientas_nuevas", businessTypes: ["salon", "costura"], isChoice: false, moneyDeltaPct: 25, costPct: 0, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 3, category: "business", message: "Llegaron clientas nuevas! Más trabajo, más ingreso.", choiceAcceptMsg: "", choiceRejectMsg: "" },
  { key: "dia_festivo", businessTypes: "all", isChoice: false, moneyDeltaPct: 35, costPct: 0, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 1, category: "universal", message: "Día festivo — muchas ventas!", choiceAcceptMsg: "", choiceRejectMsg: "" },
  // Passive negative
  { key: "perdida", businessTypes: ["tiendita", "panaderia"], isChoice: false, moneyDeltaPct: -20, costPct: 0, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 3, category: "business", message: "Se echó a perder mercancía esta semana.", choiceAcceptMsg: "", choiceRejectMsg: "" },
  { key: "pocos_clientes", businessTypes: "all", isChoice: false, moneyDeltaPct: -15, costPct: 0, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 4, category: "universal", message: "Semana de pocos clientes, ventas bajas.", choiceAcceptMsg: "", choiceRejectMsg: "" },
  { key: "robo", businessTypes: "all", isChoice: false, moneyDeltaPct: -30, costPct: 0, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 2, category: "universal", message: "Se robaron mercancía del negocio.", choiceAcceptMsg: "", choiceRejectMsg: "" },
  { key: "crisis", businessTypes: "all", isChoice: false, moneyDeltaPct: -45, costPct: 0, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 1, category: "universal", message: "Crisis en el barrio — casi no hubo ventas.", choiceAcceptMsg: "", choiceRejectMsg: "" },
  // Choice: Repairs
  { key: "reparacion", businessTypes: ["salon", "panaderia", "costura"], isChoice: true, moneyDeltaPct: 0, costPct: 25, benefitPct: 0, benefitDuration: 0, penaltyPct: -20, penaltyDuration: 2, weight: 3, category: "business", message: "Se descompuso equipo de tu negocio.", choiceAcceptMsg: "Pagaste la reparación. Tu negocio sigue funcionando.", choiceRejectMsg: "No reparaste. Tus ventas bajarán las próximas semanas." },
  { key: "emergencia", businessTypes: "all", isChoice: true, moneyDeltaPct: 0, costPct: 35, benefitPct: 0, benefitDuration: 0, penaltyPct: -25, penaltyDuration: 2, weight: 2, category: "business", message: "Emergencia en tu negocio — necesita atención urgente.", choiceAcceptMsg: "Atendiste la emergencia. Todo en orden.", choiceRejectMsg: "No atendiste la emergencia. Tu ingreso bajará." },
  // Choice: Investments
  { key: "inversion", businessTypes: "all", isChoice: true, moneyDeltaPct: 0, costPct: 30, benefitPct: 15, benefitDuration: 2, penaltyPct: 0, penaltyDuration: 0, weight: 3, category: "investment", message: "Oportunidad: comprar mercancía con descuento.", choiceAcceptMsg: "Invertiste! Tus ventas subirán las próximas semanas.", choiceRejectMsg: "Decidiste no invertir. Sin cambios." },
  { key: "expansion", businessTypes: "all", isChoice: true, moneyDeltaPct: 0, costPct: 50, benefitPct: 25, benefitDuration: 3, penaltyPct: 0, penaltyDuration: 0, weight: 1, category: "investment", message: "Oportunidad grande: ampliar tu negocio.", choiceAcceptMsg: "Expandiste tu negocio! Más ventas por varias semanas.", choiceRejectMsg: "Pasaste la oportunidad. Quizás la próxima." },
  { key: "oportunidad", businessTypes: "all", isChoice: true, moneyDeltaPct: 0, costPct: 20, benefitPct: 10, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 1, category: "investment", message: "Oportunidad única: un trato que mejorará tu negocio permanentemente.", choiceAcceptMsg: "Tomaste la oportunidad! Tu ingreso sube permanentemente.", choiceRejectMsg: "Dejaste pasar la oportunidad." },
  // Choice: Family/Personal
  { key: "gasto_familiar", businessTypes: "all", isChoice: true, moneyDeltaPct: 0, costPct: 15, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 3, category: "personal", message: "Tu familia necesita ayuda con un gasto.", choiceAcceptMsg: "Ayudaste a tu familia.", choiceRejectMsg: "No pudiste ayudar esta vez." },
  { key: "uniformes", businessTypes: "all", isChoice: true, moneyDeltaPct: 0, costPct: 20, benefitPct: 0, benefitDuration: 0, penaltyPct: 0, penaltyDuration: 0, weight: 2, category: "personal", message: "Tus hijos necesitan uniformes escolares.", choiceAcceptMsg: "Compraste los uniformes.", choiceRejectMsg: "No alcanzó para los uniformes." },
];

// Difficulty weight adjustments
const DIFFICULTY_NEG_MULT: Record<string, number> = { facil: 0.5, normal: 1.0, dificil: 1.8 };
const DIFFICULTY_POS_MULT: Record<string, number> = { facil: 1.3, normal: 1.0, dificil: 0.6 };
const DIFFICULTY_EXTRA_EVENT: Record<string, number> = { facil: 0, normal: 10, dificil: 30 }; // % chance of 2nd event

// ═══════════════════════════════════════════════════════════════════
// SECRET OBJECTIVE CATALOG
// ═══════════════════════════════════════════════════════════════════

interface ObjectiveDef {
  key: string;
  description: string;
  bonusScore: number;
}

const OBJECTIVE_CATALOG: ObjectiveDef[] = [
  { key: "solidario", description: "Envía solidario a 2 o más jugadores diferentes", bonusScore: 400 },
  { key: "perfeccionista", description: "Paga completo todas las semanas", bonusScore: 350 },
  { key: "ahorradora", description: "Termina con más de $2,000", bonusScore: 300 },
  { key: "moroso_estrategico", description: "No pagues al menos 1 semana (arriesgado!)", bonusScore: 500 },
  { key: "generosa", description: "Envía 3 o más solidarios en total", bonusScore: 450 },
  { key: "inversionista", description: "Acepta 2 o más inversiones", bonusScore: 350 },
];

// ═══════════════════════════════════════════════════════════════════
// SHARE PARAPHRASES (first-person natural language for WhatsApp)
// ═══════════════════════════════════════════════════════════════════

const SHARE_PARAPHRASES: Record<string, string[]> = {
  dia_normal: ["Hola grupo, esta semana todo tranquilo en mi negocio", "Pues aqui andamos, semana normal"],
  cliente_habitual: ["Vinieron los clientes de siempre, algo extra", "Semana tranquila, caras conocidas"],
  dia_lento: ["Estuvo floja la semana, pero nada grave", "Semana lenta por aca"],
  buena_venta: ["Grupo les tengo buenas noticias! Se vendio todo!", "Buena semana, se acabo el inventario"],
  pedido_grande: ["Me hicieron un pedido grande para una fiesta!", "Grupo que creen, pedido grande!"],
  clientas_nuevas: ["Me llegaron clientas nuevas! Estoy contenta", "Buenas noticias, mas clientas"],
  dia_festivo: ["Con el dia festivo nos fue super bien!", "Muchas ventas este dia festivo!"],
  perdida: ["Se me echo a perder mercancia esta semana", "Malas noticias, perdi mercancia"],
  pocos_clientes: ["Casi no vinieron clientes esta semana", "Semana dificil, pocos clientes"],
  robo: ["Me robaron mercancia del negocio", "Paso algo feo, se llevaron cosas del negocio"],
  crisis: ["Esta semana estuvo muy dificil, casi no hubo ventas", "Crisis en el barrio, no se vendio nada"],
  reparacion: ["Se me descompuso equipo del negocio", "Tuve que mandar a reparar equipo"],
  emergencia: ["Tuve una emergencia en el negocio", "Paso algo urgente en mi negocio"],
  inversion: ["Me salio una oportunidad de comprar mercancia barata", "Hay descuento en mercancia"],
  expansion: ["Tengo oportunidad de ampliar mi negocio", "Puedo crecer mi negocio pero necesito lana"],
  oportunidad: ["Me salio un trato que me conviene mucho", "Oportunidad unica para mi negocio"],
  gasto_familiar: ["Mi familia necesita ayuda con un gasto", "Me salio un gasto familiar"],
  uniformes: ["Mis hijos necesitan uniformes", "Toca comprar uniformes escolares"],
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function calcWeeklyPayment(credit: number, weeks: number, difficulty: string): number {
  const tasa = TASA_BY_DIFFICULTY[difficulty] || 75;
  const interest = (credit / 1000) * tasa;
  return Math.ceil((credit + interest) / weeks);
}

function calcEffectiveIncome(income: number, modPct: number): number {
  return Math.max(0, Math.round(income * (100 + modPct) / 100));
}

function deterministicHash(timestamp: bigint, identityHex: string, week: number, salt: number = 0): number {
  let hash = Number(timestamp % 999983n);
  for (let i = 0; i < identityHex.length; i += 4) {
    hash = (hash * 31 + identityHex.charCodeAt(i)) % 999983;
  }
  hash = (hash * 31 + week) % 999983;
  hash = (hash * 31 + salt) % 999983;
  return hash;
}

function getReadySet(readyJson: string): Set<string> {
  try {
    const arr = JSON.parse(readyJson);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function readySetToJson(set: Set<string>): string {
  return JSON.stringify([...set]);
}

function playerHasPendingChoices(ctx: any, gameCode: string, playerIdentity: any, week: number): boolean {
  return [...ctx.db.businessEvent.iter()].some(
    (e: any) => e.gameCode === gameCode && e.week === week
      && e.playerIdentity.isEqual(playerIdentity) && e.isChoice && !e.choiceMade
  );
}

function playerHasPaid(ctx: any, gameCode: string, playerIdentity: any, week: number): boolean {
  return [...ctx.db.payment.iter()].some(
    (p: any) => p.gameCode === gameCode && p.week === week && p.playerIdentity.isEqual(playerIdentity)
  );
}

function playerIsDecisionReady(ctx: any, gameCode: string, playerIdentity: any, week: number): boolean {
  return !playerHasPendingChoices(ctx, gameCode, playerIdentity, week)
    && playerHasPaid(ctx, gameCode, playerIdentity, week);
}

function autoMarkDecisionReady(ctx: any, gameCode: string) {
  const g = ctx.db.game.code.find(gameCode);
  if (!g || g.subPhase !== "decision") return;
  const players = [...ctx.db.player.iter()].filter((pl: any) => pl.gameCode === gameCode);
  const ready = getReadySet(g.readyPlayers);
  let changed = false;
  for (const pl of players) {
    const hex = pl.identity.toHexString();
    if (!ready.has(hex) && playerIsDecisionReady(ctx, gameCode, pl.identity, g.currentWeek)) {
      ready.add(hex);
      changed = true;
    }
  }
  if (!changed) return;
  if (players.every((pl: any) => ready.has(pl.identity.toHexString()))) {
    advanceSubPhaseInternal(ctx, gameCode);
  } else {
    ctx.db.game.code.update({ ...g, readyPlayers: readySetToJson(ready) });
  }
}

function markPlayerReady(ctx: any, gameCode: string, sender: any) {
  const g = ctx.db.game.code.find(gameCode);
  if (!g || g.status !== "playing") return;
  const ready = getReadySet(g.readyPlayers);
  const hex = sender.toHexString();
  if (ready.has(hex)) return;
  ready.add(hex);
  const players = [...ctx.db.player.iter()].filter((pl: any) => pl.gameCode === gameCode);
  if (players.every((pl: any) => ready.has(pl.identity.toHexString()))) {
    advanceSubPhaseInternal(ctx, gameCode);
  } else {
    ctx.db.game.code.update({ ...g, readyPlayers: readySetToJson(ready) });
  }
}

// ═══════════════════════════════════════════════════════════════════
// EVENT GENERATION
// ═══════════════════════════════════════════════════════════════════

function pickEvent(difficulty: string, businessType: string, hash: number): EventDef {
  const negMult = DIFFICULTY_NEG_MULT[difficulty] || 1;
  const posMult = DIFFICULTY_POS_MULT[difficulty] || 1;

  const pool = EVENT_CATALOG.filter(
    (e) => e.businessTypes === "all" || e.businessTypes.includes(businessType)
  );

  const adjusted: [EventDef, number][] = pool.map((e) => {
    let w = e.weight;
    const isNeg = e.moneyDeltaPct < 0 || e.penaltyPct < 0 || (e.isChoice && e.costPct > 0 && e.benefitPct === 0);
    const isPos = e.moneyDeltaPct > 0 || e.benefitPct > 0;
    if (isNeg) w = Math.max(1, Math.round(w * negMult));
    else if (isPos) w = Math.max(1, Math.round(w * posMult));
    return [e, w];
  });

  const totalWeight = adjusted.reduce((sum, [, w]) => sum + w, 0);
  let pick = hash % totalWeight;
  for (const [event, w] of adjusted) {
    pick -= w;
    if (pick < 0) return event;
  }
  return adjusted[0][0];
}

function generateEventForPlayer(
  ctx: any,
  gameCode: string,
  playerIdentity: any,
  businessType: string,
  income: number,
  incomeModPct: number,
  week: number,
  salt: number = 0
) {
  const identityHex = playerIdentity.toHexString();
  const hash = deterministicHash(ctx.timestamp.microsSinceUnixEpoch, identityHex, week, salt);
  const event = pickEvent(
    [...ctx.db.game.iter()].find((g: any) => g.code === gameCode)?.difficulty || "normal",
    businessType || "tiendita",
    hash
  );

  const effectiveIncome = calcEffectiveIncome(income, incomeModPct);

  if (event.isChoice) {
    const costAmount = Math.round(effectiveIncome * event.costPct / 100);
    ctx.db.businessEvent.insert({
      id: 0n,
      gameCode,
      playerIdentity,
      week,
      eventKey: event.key,
      moneyDelta: 0, // applied when choice is made
      message: event.message,
      isChoice: true,
      choiceMade: false,
      accepted: false,
      costAmount,
      benefitPct: event.benefitPct,
      benefitDuration: event.benefitDuration,
      penaltyPct: event.penaltyPct,
      penaltyDuration: event.penaltyDuration,
    });
  } else {
    const delta = Math.round(effectiveIncome * event.moneyDeltaPct / 100);
    ctx.db.businessEvent.insert({
      id: 0n,
      gameCode,
      playerIdentity,
      week,
      eventKey: event.key,
      moneyDelta: delta,
      message: event.message,
      isChoice: false,
      choiceMade: true, // passive events are "auto-resolved"
      accepted: false,
      costAmount: 0,
      benefitPct: 0,
      benefitDuration: 0,
      penaltyPct: 0,
      penaltyDuration: 0,
    });
    // Apply passive event immediately
    if (delta !== 0) {
      const p = ctx.db.player.identity.find(playerIdentity);
      if (p) ctx.db.player.id.update({ ...p, money: p.money + delta });
    }
  }
}

function generateEventsForAllPlayers(ctx: any, gameCode: string, week: number) {
  const g = ctx.db.game.code.find(gameCode);
  const difficulty = g?.difficulty || "normal";
  const players = [...ctx.db.player.iter()].filter((pl: any) => pl.gameCode === gameCode);

  for (const pl of players) {
    generateEventForPlayer(ctx, gameCode, pl.identity, pl.businessType || "tiendita", pl.income, pl.incomeModPct, week, 0);

    // Dificil: chance of a second event
    const extraChance = DIFFICULTY_EXTRA_EVENT[difficulty] || 0;
    if (extraChance > 0) {
      const hash2 = deterministicHash(ctx.timestamp.microsSinceUnixEpoch, pl.identity.toHexString(), week, 777);
      if (hash2 % 100 < extraChance) {
        generateEventForPlayer(ctx, gameCode, pl.identity, pl.businessType || "tiendita", pl.income, pl.incomeModPct, week, 1);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// OBJECTIVE EVALUATION
// ═══════════════════════════════════════════════════════════════════

function evaluateObjectives(ctx: any, gameCode: string) {
  const objectives = [...ctx.db.secretObjective.iter()].filter(
    (o: any) => o.gameCode === gameCode
  );

  for (const obj of objectives) {
    let completed = false;
    const playerHex = obj.playerIdentity.toHexString();

    switch (obj.objectiveKey) {
      case "solidario": {
        const transfers = [...ctx.db.solidarioTransfer.iter()].filter(
          (t: any) => t.gameCode === gameCode && t.senderIdentity.toHexString() === playerHex
        );
        const distinct = new Set(transfers.map((t: any) => t.receiverIdentity.toHexString()));
        completed = distinct.size >= 2;
        break;
      }
      case "perfeccionista": {
        const g = ctx.db.game.code.find(gameCode);
        if (g) {
          const pays = [...ctx.db.payment.iter()].filter(
            (p: any) => p.gameCode === gameCode && p.playerIdentity.toHexString() === playerHex
          );
          completed = pays.length >= g.weeksTotal && pays.every((p: any) => p.choice === "full");
        }
        break;
      }
      case "ahorradora": {
        const p = ctx.db.player.identity.find(obj.playerIdentity);
        completed = p ? p.money > 2000 : false;
        break;
      }
      case "moroso_estrategico": {
        const pays = [...ctx.db.payment.iter()].filter(
          (p: any) => p.gameCode === gameCode && p.playerIdentity.toHexString() === playerHex
        );
        completed = pays.some((p: any) => p.choice === "none");
        break;
      }
      case "generosa": {
        const transfers = [...ctx.db.solidarioTransfer.iter()].filter(
          (t: any) => t.gameCode === gameCode && t.senderIdentity.toHexString() === playerHex
        );
        completed = transfers.length >= 3;
        break;
      }
      case "inversionista": {
        const events = [...ctx.db.businessEvent.iter()].filter(
          (e: any) => e.gameCode === gameCode &&
            e.playerIdentity.toHexString() === playerHex &&
            e.isChoice && e.accepted && e.benefitPct > 0
        );
        completed = events.length >= 2;
        break;
      }
    }

    ctx.db.secretObjective.id.update({ ...obj, completed });

    if (completed) {
      const p = ctx.db.player.identity.find(obj.playerIdentity);
      if (p) {
        ctx.db.player.id.update({
          ...p,
          score: p.score + obj.bonusScore,
          money: p.money + obj.bonusMoney,
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// SUB-PHASE ADVANCEMENT LOGIC
// ═══════════════════════════════════════════════════════════════════

function advanceSubPhaseInternal(ctx: any, gameCode: string) {
  const g = ctx.db.game.code.find(gameCode);
  if (!g || g.status !== "playing") return;

  const now = ctx.timestamp.microsSinceUnixEpoch / 1000n;
  const players = [...ctx.db.player.iter()].filter((pl: any) => pl.gameCode === gameCode);

  if (g.subPhase === "decision") {
    // Auto-reject any unanswered choice events
    const unanswered = [...ctx.db.businessEvent.iter()].filter(
      (e: any) => e.gameCode === gameCode && e.week === g.currentWeek && e.isChoice && !e.choiceMade
    );
    for (const ev of unanswered) {
      ctx.db.businessEvent.id.update({ ...ev, choiceMade: true, accepted: false });
      if (ev.penaltyPct !== 0) {
        const p = ctx.db.player.identity.find(ev.playerIdentity);
        if (p) {
          ctx.db.player.id.update({
            ...p,
            incomeModPct: p.incomeModPct + ev.penaltyPct,
            incomeModWeeks: Math.max(p.incomeModWeeks, ev.penaltyDuration),
          });
        }
      }
    }

    // Auto-assign "none" for players who didn't pay
    const weekPayments = [...ctx.db.payment.iter()].filter(
      (p: any) => p.gameCode === gameCode && p.week === g.currentWeek
    );
    const paidIdentities = new Set(weekPayments.map((p: any) => p.playerIdentity.toHexString()));

    for (const pl of players) {
      if (!paidIdentities.has(pl.identity.toHexString())) {
        ctx.db.payment.insert({
          id: 0n, gameCode, playerIdentity: pl.identity,
          week: g.currentWeek, amount: 0, choice: "none",
        });
        ctx.db.player.id.update({ ...pl, score: pl.score + SCORE_NONE });
      }
    }

    // Calculate week results
    const allPayments = [...ctx.db.payment.iter()].filter(
      (p: any) => p.gameCode === gameCode && p.week === g.currentWeek
    );
    const totalPaid = allPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const passed = totalPaid >= g.targetPayment;

    let moraAdded = 0;
    let newWeeksMissed = g.weeksMissed;
    let newTotalMora = g.totalMora;

    if (!passed) {
      newWeeksMissed += 1;
      moraAdded = MORA_BASE + MORA_GROWTH * (newWeeksMissed - 1);
      newTotalMora += moraAdded;
      // Split mora across all players as money loss + score penalty
      const moraSplit = Math.ceil(moraAdded / players.length);
      for (const pl of players) {
        const fresh = ctx.db.player.identity.find(pl.identity);
        if (fresh) {
          ctx.db.player.id.update({
            ...fresh,
            money: fresh.money - moraSplit,
            score: fresh.score + SCORE_GROUP_FAILED,
          });
        }
      }
    } else {
      newWeeksMissed = 0;
      for (const pl of players) {
        const mult = LOAN_GROUP_MULT[pl.loanSize] || 1.0;
        const fresh = ctx.db.player.identity.find(pl.identity);
        if (fresh) {
          ctx.db.player.id.update({
            ...fresh,
            score: fresh.score + Math.round(SCORE_GROUP_PASSED * mult),
          });
        }
      }
    }

    ctx.db.weekResult.insert({
      id: 0n, gameCode, week: g.currentWeek,
      totalPaid, target: g.targetPayment, passed, moraAdded,
    });

    // Move to resultado
    ctx.db.game.code.update({
      ...g,
      subPhase: "resultado",
      readyPlayers: "[]",
      weeksMissed: newWeeksMissed,
      totalMora: newTotalMora,
    });

    const emoji = passed ? "\u2705" : "\u274C";
    ctx.db.chatMessage.insert({
      id: 0n, gameCode, senderIdentity: g.creator, senderName: "Grupalia",
      content: `${emoji} Semana ${g.currentWeek}: $${totalPaid}/$${g.targetPayment}${passed ? " — Cumplido!" : ` — No cumplido. Mora: +$${moraAdded}`}`,
      kind: "system", sentAt: now, week: g.currentWeek,
    });

  } else if (g.subPhase === "resultado") {
    // Check if game is over
    if (g.currentWeek >= g.weeksTotal) {
      evaluateObjectives(ctx, gameCode);
      ctx.db.game.code.update({
        ...g, status: "finished", phase: "finished", subPhase: "", readyPlayers: "[]",
      });
      ctx.db.gameEvent.insert({
        id: 0n, gameCode, kind: "game_ended",
        message: `Ciclo completo! Mora total: $${g.totalMora}`,
      });
      return;
    }

    // Next week: give income, decay modifiers, generate events
    const nextWeek = g.currentWeek + 1;

    for (const pl of players) {
      const fresh = ctx.db.player.identity.find(pl.identity);
      if (!fresh) continue;

      const effectiveIncome = calcEffectiveIncome(fresh.income, fresh.incomeModPct);

      // Decay income modifier
      let newModPct = fresh.incomeModPct;
      let newModWeeks = fresh.incomeModWeeks;
      if (newModWeeks > 0) {
        newModWeeks -= 1;
        if (newModWeeks === 0) newModPct = 0;
      }
      // modWeeks === 0 with modPct !== 0 means permanent

      ctx.db.player.id.update({
        ...fresh,
        money: fresh.money + effectiveIncome,
        incomeModPct: newModPct,
        incomeModWeeks: newModWeeks,
      });
    }

    ctx.db.game.code.update({
      ...g,
      currentWeek: nextWeek,
      subPhase: "decision",
      readyPlayers: "[]",
    });

    generateEventsForAllPlayers(ctx, gameCode, nextWeek);

    ctx.db.chatMessage.insert({
      id: 0n, gameCode, senderIdentity: g.creator, senderName: "Grupalia",
      content: `--- Semana ${nextWeek} de ${g.weeksTotal} ---`,
      kind: "divider", sentAt: now, week: nextWeek,
    });

    ctx.db.gameEvent.insert({
      id: 0n, gameCode, kind: "week_started",
      message: `Semana ${nextWeek} comienza!`,
    });

    // Auto-mark ready for players with no choice events
    autoMarkDecisionReady(ctx, gameCode);
  }
}

// ═══════════════════════════════════════════════════════════════════
// REDUCERS
// ═══════════════════════════════════════════════════════════════════

export const createGame = spacetimedb.reducer(
  { code: t.string(), groupName: t.string(), mode: t.string(), difficulty: t.string() },
  (ctx, { code, groupName, mode, difficulty }) => {
    const weeksTotal = MODES[mode];
    if (!weeksTotal) throw new SenderError("Invalid mode");
    if (!["facil", "normal", "dificil"].includes(difficulty)) throw new SenderError("Invalid difficulty");
    if (ctx.db.game.code.find(code)) throw new SenderError("Room code already in use");

    const existing = ctx.db.player.identity.find(ctx.sender);
    if (existing) ctx.db.player.id.delete(existing.id);

    ctx.db.game.insert({
      code, groupName, creator: ctx.sender,
      status: "lobby", mode, difficulty, weeksTotal,
      currentWeek: 0, phase: "lobby", subPhase: "",
      readyPlayers: "[]", targetPayment: 0, totalMora: 0, weeksMissed: 0,
    });

    const income = INCOME_BY_LOAN["medium"] || 1050;
    ctx.db.player.insert({
      id: 0n, identity: ctx.sender, gameCode: code,
      name: "", businessType: "", pronoun: "", loanSize: "",
      weeklyPayment: 0, income, money: income, score: 0,
      incomeModPct: 0, incomeModWeeks: 0, online: true,
    });

    ctx.db.gameEvent.insert({
      id: 0n, gameCode: code, kind: "room_created", message: code,
    });
  }
);

export const joinGame = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const g = ctx.db.game.code.find(code);
    if (!g) throw new SenderError("Room not found");
    if (g.status !== "lobby") throw new SenderError("Game already started");

    const existing = ctx.db.player.identity.find(ctx.sender);
    if (existing) {
      if (existing.gameCode === code) {
        ctx.db.player.id.update({ ...existing, online: true });
        return;
      }
      ctx.db.player.id.delete(existing.id);
    }

    const income = INCOME_BY_LOAN["medium"] || 1050;
    ctx.db.player.insert({
      id: 0n, identity: ctx.sender, gameCode: code,
      name: "", businessType: "", pronoun: "", loanSize: "",
      weeklyPayment: 0, income, money: income, score: 0,
      incomeModPct: 0, incomeModWeeks: 0, online: true,
    });
  }
);

export const setGroupName = spacetimedb.reducer(
  { groupName: t.string() },
  (ctx, { groupName }) => {
    if (!groupName.trim()) throw new SenderError("Group name cannot be empty");
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    const g = ctx.db.game.code.find(p.gameCode);
    if (!g) throw new SenderError("Game not found");
    if (g.creator.toHexString() !== ctx.sender.toHexString()) throw new SenderError("Only creator");
    if (g.status !== "lobby") throw new SenderError("Cannot rename after start");
    ctx.db.game.code.update({ ...g, groupName });
  }
);

export const setName = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    if (!name.trim()) throw new SenderError("Name cannot be empty");
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    ctx.db.player.id.update({ ...p, name });
  }
);

export const setPronoun = spacetimedb.reducer(
  { pronoun: t.string() },
  (ctx, { pronoun }) => {
    if (!["m", "f", "x"].includes(pronoun)) throw new SenderError("Invalid pronoun");
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    ctx.db.player.id.update({ ...p, pronoun });
  }
);

export const pickBusinessType = spacetimedb.reducer(
  { businessType: t.string() },
  (ctx, { businessType }) => {
    if (!["tiendita", "salon", "puesto", "catalogo", "costura", "panaderia"].includes(businessType))
      throw new SenderError("Invalid business type");
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    ctx.db.player.id.update({ ...p, businessType });
  }
);

export const pickLoanSize = spacetimedb.reducer(
  { loanSize: t.string() },
  (ctx, { loanSize }) => {
    const credit = LOAN_CREDIT[loanSize];
    if (!credit) throw new SenderError("Invalid loan size");
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    const income = INCOME_BY_LOAN[loanSize] || 1050;
    ctx.db.player.id.update({ ...p, loanSize, income, weeklyPayment: 0 });
  }
);

// ─── Start Game ─────────────────────────────────────────────────

export const startGame = spacetimedb.reducer({}, (ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (!p) throw new SenderError("Not in a game");
  const g = ctx.db.game.code.find(p.gameCode);
  if (!g) throw new SenderError("Game not found");
  if (!g.creator.isEqual(ctx.sender)) throw new SenderError("Only creator");
  if (g.status !== "lobby") throw new SenderError("Already started");

  const players = [...ctx.db.player.iter()].filter((pl: any) => pl.gameCode === p.gameCode);
  if (players.length < 2) throw new SenderError("Need at least 2 players");

  const businessDefaults = ["tiendita", "salon", "puesto", "catalogo", "costura", "panaderia"];
  let totalTarget = 0;

  for (let i = 0; i < players.length; i++) {
    const bt = players[i].businessType || businessDefaults[i % 6];
    const ls = players[i].loanSize || "medium";
    const credit = LOAN_CREDIT[ls] || 3500;
    const income = INCOME_BY_LOAN[ls] || 1050;
    const wp = calcWeeklyPayment(credit, g.weeksTotal, g.difficulty);
    const startMoney = Math.round(income * (STARTING_MONEY_MULT[g.difficulty] || 1.0));
    totalTarget += wp;

    ctx.db.player.id.update({
      ...players[i],
      businessType: bt,
      loanSize: ls,
      weeklyPayment: wp,
      income,
      money: startMoney,
      score: 0,
      incomeModPct: 0,
      incomeModWeeks: 0,
    });
  }

  const now = ctx.timestamp.microsSinceUnixEpoch / 1000n;
  ctx.db.game.code.update({
    ...g,
    status: "playing",
    currentWeek: 1,
    phase: "action",
    subPhase: "decision",
    readyPlayers: "[]",
    targetPayment: totalTarget,
  });

  // Assign secret objectives
  const baseIdx = Number(ctx.timestamp.microsSinceUnixEpoch % BigInt(OBJECTIVE_CATALOG.length));
  for (let i = 0; i < players.length; i++) {
    const obj = OBJECTIVE_CATALOG[(baseIdx + i) % OBJECTIVE_CATALOG.length];
    ctx.db.secretObjective.insert({
      id: 0n, gameCode: p.gameCode, playerIdentity: players[i].identity,
      objectiveKey: obj.key, description: obj.description,
      completed: false, bonusMoney: 0, bonusScore: obj.bonusScore,
    });
  }

  // Generate week 1 events
  generateEventsForAllPlayers(ctx, p.gameCode, 1);

  ctx.db.gameEvent.insert({
    id: 0n, gameCode: p.gameCode, kind: "game_started",
    message: `El ciclo comienza! ${players.length} jugadores. Semana 1 de ${g.weeksTotal}.`,
  });

  ctx.db.chatMessage.insert({
    id: 0n, gameCode: p.gameCode, senderIdentity: g.creator, senderName: "Grupalia",
    content: `--- Semana 1 de ${g.weeksTotal} ---`, kind: "divider", sentAt: now, week: 1,
  });
  ctx.db.chatMessage.insert({
    id: 0n, gameCode: p.gameCode, senderIdentity: g.creator, senderName: "Presidenta",
    content: "Buenos dias amigas!! 🌞 Ya empezo la semana, chequen su app de Grupalia para ver que les toco esta vez. Si no saben como abrirla, vayan a los tres puntitos de arriba a la derecha. Echenle ganas!", kind: "presidenta", sentAt: now + 1n, week: 1,
  });

  // Auto-mark ready for players with no choice events
  autoMarkDecisionReady(ctx, p.gameCode);
});

// ─── Mark Ready ─────────────────────────────────────────────────

export const markReady = spacetimedb.reducer({}, (ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (!p) throw new SenderError("Not in a game");
  const g = ctx.db.game.code.find(p.gameCode);
  if (!g) throw new SenderError("Game not found");
  if (g.status !== "playing") throw new SenderError("Game not in progress");
  markPlayerReady(ctx, p.gameCode, ctx.sender);
});

// ─── Force Advance (creator only) ──────────────────────────────

export const forceAdvance = spacetimedb.reducer({}, (ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (!p) throw new SenderError("Not in a game");
  const g = ctx.db.game.code.find(p.gameCode);
  if (!g) throw new SenderError("Game not found");
  if (!g.creator.isEqual(ctx.sender)) throw new SenderError("Only creator");
  if (g.status !== "playing") throw new SenderError("Game not in progress");

  advanceSubPhaseInternal(ctx, p.gameCode);
});

// ─── Legacy advancePhase (kept for compat, delegates to forceAdvance logic) ──

export const advancePhase = spacetimedb.reducer({}, (ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (!p) throw new SenderError("Not in a game");
  const g = ctx.db.game.code.find(p.gameCode);
  if (!g) throw new SenderError("Game not found");
  if (!g.creator.isEqual(ctx.sender)) throw new SenderError("Only creator");
  if (g.status !== "playing") throw new SenderError("Game not in progress");

  advanceSubPhaseInternal(ctx, p.gameCode);
});

// ─── Respond to Choice Event ────────────────────────────────────

export const respondToEvent = spacetimedb.reducer(
  { eventId: t.u64(), accepted: t.bool() },
  (ctx, { eventId, accepted }) => {
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    const g = ctx.db.game.code.find(p.gameCode);
    if (!g) throw new SenderError("Game not found");
    if (g.subPhase !== "decision") throw new SenderError("Solo puedes responder durante la fase de decisión");

    const ev = ctx.db.businessEvent.id.find(eventId);
    if (!ev) throw new SenderError("Event not found");
    if (!ev.playerIdentity.isEqual(ctx.sender)) throw new SenderError("Not your event");
    if (!ev.isChoice) throw new SenderError("Not a choice event");
    if (ev.choiceMade) throw new SenderError("Already responded");

    if (accepted) {
      if (p.money < ev.costAmount) throw new SenderError("No tienes suficiente dinero");

      ctx.db.player.id.update({ ...p, money: p.money - ev.costAmount });

      // Apply benefit modifier
      if (ev.benefitPct > 0) {
        const fresh = ctx.db.player.identity.find(ctx.sender)!;
        const newMod = fresh.incomeModPct + ev.benefitPct;
        const newWeeks = ev.benefitDuration === 0 ? 0 : Math.max(fresh.incomeModWeeks, ev.benefitDuration);
        ctx.db.player.id.update({ ...fresh, incomeModPct: newMod, incomeModWeeks: newWeeks });
      }

      // Score for investment/family
      const eventDef = EVENT_CATALOG.find((e) => e.key === ev.eventKey);
      if (eventDef) {
        const fresh2 = ctx.db.player.identity.find(ctx.sender)!;
        if (eventDef.category === "investment") {
          ctx.db.player.id.update({ ...fresh2, score: fresh2.score + SCORE_INVESTMENT });
        } else if (eventDef.category === "personal") {
          ctx.db.player.id.update({ ...fresh2, score: fresh2.score + SCORE_FAMILY });
        }
      }
    } else {
      // Apply penalty modifier
      if (ev.penaltyPct !== 0) {
        const newMod = p.incomeModPct + ev.penaltyPct;
        const newWeeks = ev.penaltyDuration === 0 ? 0 : Math.max(p.incomeModWeeks, ev.penaltyDuration);
        ctx.db.player.id.update({ ...p, incomeModPct: newMod, incomeModWeeks: newWeeks });
      }
    }

    // Find the accept/reject message from catalog
    const eventDef = EVENT_CATALOG.find((e) => e.key === ev.eventKey);
    const resultMsg = accepted
      ? (eventDef?.choiceAcceptMsg || "Aceptaste.")
      : (eventDef?.choiceRejectMsg || "Rechazaste.");

    ctx.db.businessEvent.id.update({
      ...ev, choiceMade: true, accepted,
      moneyDelta: accepted ? -ev.costAmount : 0,
      message: `${ev.message} — ${resultMsg}`,
    });

    // Auto-mark ready if choices done + paid
    if (playerIsDecisionReady(ctx, p.gameCode, ctx.sender, g.currentWeek)) {
      markPlayerReady(ctx, p.gameCode, ctx.sender);
    }
  }
);

// ─── Make Payment ───────────────────────────────────────────────

export const makePayment = spacetimedb.reducer(
  { choice: t.string() },
  (ctx, { choice }) => {
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    const g = ctx.db.game.code.find(p.gameCode);
    if (!g) throw new SenderError("Game not found");
    if (g.status !== "playing") throw new SenderError("Game not in progress");
    if (g.subPhase !== "decision") throw new SenderError("Solo puedes pagar durante la fase de decisión");

    const existing = [...ctx.db.payment.iter()].filter(
      (pay: any) => pay.gameCode === p.gameCode && pay.playerIdentity.isEqual(ctx.sender) && pay.week === g.currentWeek
    );
    if (existing.length > 0) throw new SenderError("Already paid this week");

    const wp = p.weeklyPayment || 750;
    let amount: number;
    let scoreGain: number;

    switch (choice) {
      case "full":
        amount = wp;
        scoreGain = SCORE_FULL;
        break;
      case "partial":
        amount = Math.floor(wp * 0.5);
        scoreGain = SCORE_PARTIAL;
        break;
      case "none":
        amount = 0;
        scoreGain = SCORE_NONE;
        break;
      default:
        throw new SenderError("Invalid choice: full, partial, or none");
    }

    if (amount > p.money) throw new SenderError("Not enough money");

    ctx.db.payment.insert({
      id: 0n, gameCode: p.gameCode, playerIdentity: ctx.sender,
      week: g.currentWeek, amount, choice,
    });

    ctx.db.player.id.update({
      ...p, money: p.money - amount, score: p.score + scoreGain,
    });

    // Auto-mark ready if choices done + paid
    if (playerIsDecisionReady(ctx, p.gameCode, ctx.sender, g.currentWeek)) {
      markPlayerReady(ctx, p.gameCode, ctx.sender);
    }
  }
);

// ─── Send Solidario ─────────────────────────────────────────────

export const sendSolidario = spacetimedb.reducer(
  { receiverIdentityHex: t.string(), amount: t.u32() },
  (ctx, { receiverIdentityHex, amount }) => {
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    const g = ctx.db.game.code.find(p.gameCode);
    if (!g) throw new SenderError("Game not found");
    if (g.status !== "playing") throw new SenderError("Game not in progress");
    if (g.subPhase !== "decision") throw new SenderError("Solo durante la fase de decisión");

    if (amount < SOLIDARIO_MIN || amount > SOLIDARIO_MAX)
      throw new SenderError(`El solidario debe ser entre $${SOLIDARIO_MIN} y $${SOLIDARIO_MAX}`);

    if (ctx.sender.toHexString() === receiverIdentityHex)
      throw new SenderError("No puedes enviarte solidario a ti mismo");

    const existing = [...ctx.db.solidarioTransfer.iter()].find(
      (tr: any) => tr.gameCode === p.gameCode &&
        tr.senderIdentity.toHexString() === ctx.sender.toHexString() &&
        tr.week === g.currentWeek
    );
    if (existing) throw new SenderError("Ya enviaste solidario esta semana");

    if (p.money < amount) throw new SenderError("No tienes suficiente dinero");

    const receiver = [...ctx.db.player.iter()].find(
      (pl: any) => pl.gameCode === p.gameCode && pl.identity.toHexString() === receiverIdentityHex
    );
    if (!receiver) throw new SenderError("Jugador no encontrado");

    // Score proportional: 30 pts per $200 → 0.15 pts per peso
    // 5 base + 5 per $100 (so $50=5, $100=10, $200=15, $300=20, $400=25, $500=30)
    const scoreGain = 5 + Math.floor(amount / 100) * 5;

    ctx.db.player.id.update({ ...p, money: p.money - amount, score: p.score + scoreGain });
    ctx.db.player.id.update({ ...receiver, money: receiver.money + amount });

    ctx.db.solidarioTransfer.insert({
      id: 0n, gameCode: p.gameCode,
      senderIdentity: ctx.sender, receiverIdentity: receiver.identity,
      week: g.currentWeek, amount,
    });
  }
);

// ─── Request Solidario (public ask in WhatsApp) ─────────────────

export const requestSolidario = spacetimedb.reducer(
  { amount: t.u32() },
  (ctx, { amount }) => {
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    const g = ctx.db.game.code.find(p.gameCode);
    if (!g) throw new SenderError("Game not found");
    if (g.status !== "playing") throw new SenderError("Game not in progress");
    if (g.subPhase !== "decision")
      throw new SenderError("Solo durante la fase de decisión");

    if (amount < SOLIDARIO_MIN || amount > SOLIDARIO_MAX)
      throw new SenderError(`El solidario debe ser entre $${SOLIDARIO_MIN} y $${SOLIDARIO_MAX}`);

    const existing = [...ctx.db.chatMessage.iter()].some(
      (m: any) => m.gameCode === p.gameCode && m.kind === "solidario_request" &&
        m.senderIdentity.toHexString() === ctx.sender.toHexString() && m.week === g.currentWeek
    );
    if (existing) throw new SenderError("Ya pediste solidario esta semana");

    const now = ctx.timestamp.microsSinceUnixEpoch / 1000n;
    ctx.db.chatMessage.insert({
      id: 0n, gameCode: p.gameCode, senderIdentity: ctx.sender,
      senderName: p.name || "???",
      content: `${p.name || "Alguien"} pide $${amount} de solidario`,
      kind: "solidario_request", sentAt: now, week: g.currentWeek,
    });
  }
);

// ─── Share Event ────────────────────────────────────────────────

export const shareEvent = spacetimedb.reducer(
  { week: t.u32() },
  (ctx, { week }) => {
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    const g = ctx.db.game.code.find(p.gameCode);
    if (!g) throw new SenderError("Game not found");
    if (g.subPhase !== "decision") throw new SenderError("Solo durante la fase de decisión");
    if (week !== g.currentWeek) throw new SenderError("Solo eventos de la semana actual");

    const event = [...ctx.db.businessEvent.iter()].find(
      (e: any) => e.gameCode === p.gameCode &&
        e.playerIdentity.toHexString() === ctx.sender.toHexString() && e.week === week
    );
    if (!event) throw new SenderError("No event found");

    const alreadyShared = [...ctx.db.chatMessage.iter()].some(
      (m: any) => m.gameCode === p.gameCode && m.kind === "event" &&
        m.senderIdentity.toHexString() === ctx.sender.toHexString() && m.week === week
    );
    if (alreadyShared) throw new SenderError("Ya compartiste tu evento");

    const phrases = SHARE_PARAPHRASES[event.eventKey];
    let content: string;
    if (phrases && phrases.length > 0) {
      const hash = deterministicHash(ctx.timestamp.microsSinceUnixEpoch, ctx.sender.toHexString(), week);
      content = phrases[hash % phrases.length];
    } else {
      content = event.message;
    }

    const now = ctx.timestamp.microsSinceUnixEpoch / 1000n;
    ctx.db.chatMessage.insert({
      id: 0n, gameCode: p.gameCode, senderIdentity: ctx.sender,
      senderName: p.name || "???", content, kind: "event",
      sentAt: now, week: g.currentWeek,
    });
  }
);

// ─── Chat & Stickers ────────────────────────────────────────────

export const sendChatMessage = spacetimedb.reducer(
  { content: t.string(), kind: t.string() },
  (ctx, { content, kind }) => {
    if (!content.trim()) throw new SenderError("Message cannot be empty");
    if (!["text", "sticker", "presidenta"].includes(kind)) throw new SenderError("Invalid kind");

    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    const g = [...ctx.db.game.iter()].find((g: any) => g.code === p.gameCode);

    ctx.db.chatMessage.insert({
      id: 0n, gameCode: p.gameCode,
      senderIdentity: ctx.sender,
      senderName: kind === "presidenta" ? "Presidenta" : (p.name || "???"),
      content, kind,
      sentAt: ctx.timestamp.microsSinceUnixEpoch / 1000n,
      week: g ? g.currentWeek : 0,
    });
  }
);

export const uploadSticker = spacetimedb.reducer(
  { name: t.string(), imageData: t.string() },
  (ctx, { name, imageData }) => {
    if (!name.trim()) throw new SenderError("Sticker name required");
    if (imageData.length > 350_000) throw new SenderError("Sticker too large");
    if (!imageData.startsWith("data:image/")) throw new SenderError("Must be data:image/ URL");
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    ctx.db.customSticker.insert({
      id: 0n, gameCode: p.gameCode, name: name.trim(), imageData,
      uploadedBy: ctx.sender, uploadedByName: p.name || "???",
    });
  }
);

export const deleteSticker = spacetimedb.reducer(
  { stickerId: t.u64() },
  (ctx, { stickerId }) => {
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    const sticker = ctx.db.customSticker.id.find(stickerId);
    if (!sticker) throw new SenderError("Sticker not found");
    if (sticker.gameCode !== p.gameCode) throw new SenderError("Not your game");
    ctx.db.customSticker.id.delete(stickerId);
  }
);

// ═══════════════════════════════════════════════════════════════════
// LEAVE / KICK
// ═══════════════════════════════════════════════════════════════════

export const leaveGame = spacetimedb.reducer(
  {},
  (ctx) => {
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    const g = ctx.db.game.code.find(p.gameCode);
    if (!g) throw new SenderError("Game not found");
    if (g.status !== "lobby") throw new SenderError("Cannot leave a game in progress");
    ctx.db.player.id.delete(p.id);
  }
);

export const kickPlayer = spacetimedb.reducer(
  { playerIdentity: t.identity() },
  (ctx, { playerIdentity }) => {
    const caller = ctx.db.player.identity.find(ctx.sender);
    if (!caller) throw new SenderError("Not in a game");
    const g = ctx.db.game.code.find(caller.gameCode);
    if (!g) throw new SenderError("Game not found");
    if (g.status !== "lobby") throw new SenderError("Cannot kick during a game");
    if (g.creator.toHexString() !== ctx.sender.toHexString()) throw new SenderError("Only the host can kick");
    const target = ctx.db.player.identity.find(playerIdentity);
    if (!target) throw new SenderError("Player not found");
    if (target.gameCode !== caller.gameCode) throw new SenderError("Player not in your game");
    if (target.identity.toHexString() === ctx.sender.toHexString()) throw new SenderError("Cannot kick yourself");
    ctx.db.player.id.delete(target.id);
  }
);

// ═══════════════════════════════════════════════════════════════════
// CONNECTION HANDLERS
// ═══════════════════════════════════════════════════════════════════

export const onConnect = spacetimedb.clientConnected((ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (p) ctx.db.player.id.update({ ...p, online: true });
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (p) ctx.db.player.id.update({ ...p, online: false });
});
