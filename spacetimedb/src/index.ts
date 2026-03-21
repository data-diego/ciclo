import { schema, table, t, SenderError } from "spacetimedb/server";

// --- Tables ---

const game = table(
  { public: true },
  {
    code: t.string().primaryKey(), // room code e.g. "ABCDEF"
    groupName: t.string(), // e.g. "Las poderosas 💪"
    creator: t.identity(), // identity of the room creator
    status: t.string(), // "lobby" | "playing" | "finished"
    mode: t.string(), // "experiencia" | "medio" | "completo"
    weeksTotal: t.u32(), // 4, 8, or 16
    currentWeek: t.u32(), // 1-indexed
    phase: t.string(), // "action" | "results" | "rest"
    phaseEndsAt: t.u64(), // unix ms when current phase ends
    targetPayment: t.u32(), // weekly group payment target (sum of all weeklyPayments)
    totalMora: t.u32(), // accumulated late fees
    weeksMissed: t.u32(), // consecutive weeks with incomplete payment
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
    businessType: t.string(), // tiendita | salon | puesto | catalogo | costura | panaderia
    pronoun: t.string(), // "m" | "f" | "x"
    loanSize: t.string(), // "small" | "medium" | "large"
    weeklyPayment: t.u32(), // derived from loanSize: 500, 750, 1000
    money: t.i32(), // current cash
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
    choice: t.string(), // "full" | "partial" | "none" | "double"
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

// Event table for game-wide announcements
const gameEvent = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    gameCode: t.string(),
    kind: t.string(), // "game_started" | "week_started" | "phase_changed" | "game_ended"
    message: t.string(),
  }
);

// Chat messages in lobby/game
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
    content: t.string(), // text message or sticker ID like "sticker:abrazo"
    kind: t.string(), // "text" | "sticker"
    sentAt: t.u64(), // millis from server timestamp
  }
);

// Custom stickers uploaded per game (like Slack custom emoji)
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
    name: t.string(), // display name e.g. "loteria"
    imageData: t.string(), // base64 data URL (png/gif/webp, max ~256KB)
    uploadedBy: t.identity(),
    uploadedByName: t.string(),
  }
);

// --- New tables (Three Pillars) ---

// CHANCE: Business events per player per week
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
    eventKey: t.string(), // e.g. "buena_venta", "robo", "dia_normal"
    moneyDelta: t.i32(), // positive=gain, negative=loss, 0=neutral
    message: t.string(), // Spanish flavor text
  }
);

// SKILL: Private solidarity transfers between players
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

// SECRET: Hidden objectives per player
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
    objectiveKey: t.string(), // "solidario" | "perfeccionista" | "generoso" | "ahorradora" | "popular" | "moroso_estrategico"
    description: t.string(), // Spanish text
    completed: t.bool(),
    bonusMoney: t.i32(),
  }
);

const spacetimedb = schema({
  game, player, payment, weekResult, gameEvent, chatMessage, customSticker,
  businessEvent, solidarioTransfer, secretObjective,
});
export default spacetimedb;

// --- Constants ---

const MODES: Record<string, number> = {
  experiencia: 4,
  medio: 8,
  completo: 16,
};

const BASE_INCOME = 1200;
const MORA_PER_WEEK = 45;
const MORA_DAILY_GROWTH = 15;
const SOLIDARIO_AMOUNT = 200;

// Loan size → credit amount
const LOAN_CREDIT: Record<string, number> = {
  small: 2000,
  medium: 3500,
  large: 5000,
};

// Tasa: 75 pesos por cada $1,000 prestados (Grupalia standard range 69-82)
const TASA_PER_MIL = 75;

function calcWeeklyPayment(credit: number, weeks: number): number {
  const interest = (credit / 1000) * TASA_PER_MIL;
  return Math.ceil((credit + interest) / weeks);
}

// --- Event catalog (deterministic, no randomness) ---

interface EventDef {
  key: string;
  businessTypes: string[] | "all";
  moneyDelta: number;
  weight: number; // higher = more likely
  message: string; // {name} and {business} are replaced
}

const EVENT_CATALOG: EventDef[] = [
  // Neutral events (~60% weight)
  { key: "dia_normal", businessTypes: "all", moneyDelta: 0, weight: 10, message: "Día tranquilo en tu {business}. Sin novedades." },
  { key: "cliente_habitual", businessTypes: "all", moneyDelta: 0, weight: 8, message: "Llegaron los clientes de siempre. Día normal." },
  { key: "dia_lento", businessTypes: "all", moneyDelta: 0, weight: 6, message: "Semana lenta, pero nada fuera de lo normal." },
  // Positive events (~20%)
  { key: "buena_venta", businessTypes: ["tiendita"], moneyDelta: 200, weight: 3, message: "Se vendió todo el inventario hoy! +$200" },
  { key: "clientas_nuevas", businessTypes: ["salon"], moneyDelta: 200, weight: 3, message: "Llegaron 3 clientas nuevas al salón! +$200" },
  { key: "pedido_grande", businessTypes: ["puesto"], moneyDelta: 250, weight: 3, message: "Pedido grande de tacos para una fiesta! +$250" },
  { key: "catalogo_exito", businessTypes: ["catalogo"], moneyDelta: 200, weight: 3, message: "Vendiste todo el catálogo del mes! +$200" },
  { key: "vestido_novia", businessTypes: ["costura"], moneyDelta: 300, weight: 2, message: "Te encargaron un vestido de novia! +$300" },
  { key: "pan_vendido", businessTypes: ["panaderia"], moneyDelta: 250, weight: 3, message: "El pan se vendió todo antes del mediodía! +$250" },
  { key: "dia_nino", businessTypes: "all", moneyDelta: 300, weight: 2, message: "Día del niño — muchas ventas! +$300" },
  { key: "buen_fin", businessTypes: "all", moneyDelta: 200, weight: 2, message: "Buen fin de semana, más clientes de lo normal. +$200" },
  // Negative events (~20%)
  { key: "platanos", businessTypes: ["tiendita"], moneyDelta: -150, weight: 3, message: "Se echaron a perder los plátanos. -$150" },
  { key: "secadora", businessTypes: ["salon"], moneyDelta: -200, weight: 3, message: "Se descompuso la secadora. Reparación: -$200" },
  { key: "lluvia", businessTypes: ["puesto"], moneyDelta: -150, weight: 3, message: "Lluvia torrencial, no se pudo abrir el puesto. -$150" },
  { key: "devolucion", businessTypes: ["catalogo"], moneyDelta: -150, weight: 3, message: "Una clienta devolvió un pedido grande. -$150" },
  { key: "tela_cara", businessTypes: ["costura"], moneyDelta: -200, weight: 3, message: "Subió el precio de la tela. -$200" },
  { key: "harina", businessTypes: ["panaderia"], moneyDelta: -150, weight: 3, message: "Subió el precio de la harina. -$150" },
  { key: "pocos_clientes", businessTypes: "all", moneyDelta: -100, weight: 2, message: "Día lluvioso, pocos clientes. -$100" },
  { key: "robo_menor", businessTypes: "all", moneyDelta: -200, weight: 1, message: "Se robó mercancía de tu negocio. -$200" },
];

// --- Secret objective catalog ---

interface ObjectiveDef {
  key: string;
  description: string;
  bonus: number;
}

const OBJECTIVE_CATALOG: ObjectiveDef[] = [
  { key: "solidario", description: "Envía apoyo solidario a 2 jugadores diferentes", bonus: 500 },
  { key: "perfeccionista", description: "Paga completo todas las semanas", bonus: 500 },
  { key: "generoso", description: "Paga doble al menos 1 vez", bonus: 400 },
  { key: "ahorradora", description: "Termina con más de $3,000", bonus: 400 },
  { key: "popular", description: "Envía 10+ mensajes en el chat", bonus: 300 },
  { key: "moroso_estrategico", description: "No pagues al menos 1 semana (arriesgado!)", bonus: 600 },
];

// --- Deterministic hash for event selection ---

function deterministicHash(timestamp: bigint, identityHex: string, week: number): number {
  let hash = Number(timestamp % 999983n);
  for (let i = 0; i < identityHex.length; i += 4) {
    hash = (hash * 31 + identityHex.charCodeAt(i)) % 999983;
  }
  hash = (hash * 31 + week) % 999983;
  return hash;
}

function generateEventForPlayer(
  ctx: any,
  gameCode: string,
  playerIdentityHex: string,
  playerIdentity: any,
  businessType: string,
  week: number
) {
  // Filter events by business type
  const pool = EVENT_CATALOG.filter(
    (e) => e.businessTypes === "all" || e.businessTypes.includes(businessType)
  );

  // Build weighted pool
  const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
  const hash = deterministicHash(ctx.timestamp.microsSinceUnixEpoch, playerIdentityHex, week);
  let pick = hash % totalWeight;

  let selected = pool[0];
  for (const event of pool) {
    pick -= event.weight;
    if (pick < 0) {
      selected = event;
      break;
    }
  }

  const message = selected.message
    .replace("{business}", businessType)
    .replace("{name}", "");

  ctx.db.businessEvent.insert({
    id: 0n,
    gameCode,
    playerIdentity,
    week,
    eventKey: selected.key,
    moneyDelta: selected.moneyDelta,
    message,
  });

  // Apply money delta
  if (selected.moneyDelta !== 0) {
    const p = ctx.db.player.identity.find(playerIdentity);
    if (p) {
      ctx.db.player.id.update({
        ...p,
        money: p.money + selected.moneyDelta,
      });
    }
  }
}

function generateEventsForAllPlayers(
  ctx: any,
  gameCode: string,
  week: number
) {
  const players = [...ctx.db.player.iter()].filter(
    (pl: any) => pl.gameCode === gameCode
  );
  for (const pl of players) {
    generateEventForPlayer(
      ctx,
      gameCode,
      pl.identity.toHexString(),
      pl.identity,
      pl.businessType || "tiendita",
      week
    );
  }
}

// --- Evaluate secret objectives at game end ---

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
        const distinctReceivers = new Set(transfers.map((t: any) => t.receiverIdentity.toHexString()));
        completed = distinctReceivers.size >= 2;
        break;
      }
      case "perfeccionista": {
        const game = ctx.db.game.code.find(gameCode);
        if (game) {
          const playerPayments = [...ctx.db.payment.iter()].filter(
            (p: any) => p.gameCode === gameCode && p.playerIdentity.toHexString() === playerHex
          );
          completed = playerPayments.length >= game.weeksTotal &&
            playerPayments.every((p: any) => p.choice === "full");
        }
        break;
      }
      case "generoso": {
        const playerPayments = [...ctx.db.payment.iter()].filter(
          (p: any) => p.gameCode === gameCode && p.playerIdentity.toHexString() === playerHex
        );
        completed = playerPayments.some((p: any) => p.choice === "double");
        break;
      }
      case "ahorradora": {
        const player = ctx.db.player.identity.find(obj.playerIdentity);
        completed = player ? player.money > 3000 : false;
        break;
      }
      case "popular": {
        const messages = [...ctx.db.chatMessage.iter()].filter(
          (m: any) => m.gameCode === gameCode && m.senderIdentity.toHexString() === playerHex
        );
        completed = messages.length >= 10;
        break;
      }
      case "moroso_estrategico": {
        const playerPayments = [...ctx.db.payment.iter()].filter(
          (p: any) => p.gameCode === gameCode && p.playerIdentity.toHexString() === playerHex
        );
        completed = playerPayments.some((p: any) => p.choice === "none");
        break;
      }
    }

    ctx.db.secretObjective.id.update({
      ...obj,
      completed,
    });

    // Award bonus if completed
    if (completed) {
      const player = ctx.db.player.identity.find(obj.playerIdentity);
      if (player) {
        ctx.db.player.id.update({
          ...player,
          money: player.money + obj.bonusMoney,
        });
      }
    }
  }
}

// --- Reducers ---

// Code + groupName are generated client-side (reducers must be deterministic)
export const createGame = spacetimedb.reducer(
  { code: t.string(), groupName: t.string(), mode: t.string() },
  (ctx, { code, groupName, mode }) => {
    const weeksTotal = MODES[mode];
    if (!weeksTotal) {
      throw new SenderError(
        "Invalid mode. Use: experiencia, medio, or completo"
      );
    }

    // Check code doesn't already exist
    if (ctx.db.game.code.find(code)) {
      throw new SenderError("Room code already in use");
    }

    // Clean up any leftover player row from a previous session
    const existing = ctx.db.player.identity.find(ctx.sender);
    if (existing) {
      ctx.db.player.id.delete(existing.id);
    }

    ctx.db.game.insert({
      code,
      groupName,
      creator: ctx.sender,
      status: "lobby",
      mode,
      weeksTotal,
      currentWeek: 0,
      phase: "lobby",
      phaseEndsAt: BigInt(0),
      targetPayment: 0,
      totalMora: 0,
      weeksMissed: 0,
    });

    // Auto-join the creator
    ctx.db.player.insert({
      id: 0n,
      identity: ctx.sender,
      gameCode: code,
      name: "",
      businessType: "",
      pronoun: "",
      loanSize: "",
      weeklyPayment: 0,
      money: BASE_INCOME,
      online: true,
    });

    ctx.db.gameEvent.insert({
      id: 0n,
      gameCode: code,
      kind: "room_created",
      message: code,
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
        // Re-joining same game: just set online
        ctx.db.player.id.update({ ...existing, online: true });
        return;
      }
      // Was in a different game — clean up old row
      ctx.db.player.id.delete(existing.id);
    }

    ctx.db.player.insert({
      id: 0n,
      identity: ctx.sender,
      gameCode: code,
      name: "",
      businessType: "",
      pronoun: "",
      loanSize: "",
      weeklyPayment: 0,
      money: BASE_INCOME,
      online: true,
    });
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
    const valid = ["m", "f", "x"];
    if (!valid.includes(pronoun)) throw new SenderError("Invalid pronoun");
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    ctx.db.player.id.update({ ...p, pronoun });
  }
);

export const pickBusinessType = spacetimedb.reducer(
  { businessType: t.string() },
  (ctx, { businessType }) => {
    const valid = [
      "tiendita", "salon", "puesto", "catalogo", "costura", "panaderia",
    ];
    if (!valid.includes(businessType)) {
      throw new SenderError("Invalid business type");
    }
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    ctx.db.player.id.update({ ...p, businessType });
  }
);

export const pickLoanSize = spacetimedb.reducer(
  { loanSize: t.string() },
  (ctx, { loanSize }) => {
    const credit = LOAN_CREDIT[loanSize];
    if (!credit) throw new SenderError("Invalid loan size: small, medium, or large");
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    // weeklyPayment is computed in startGame when weeksTotal is known
    ctx.db.player.id.update({ ...p, loanSize, weeklyPayment: 0 });
  }
);

export const sendChatMessage = spacetimedb.reducer(
  { content: t.string(), kind: t.string() },
  (ctx, { content, kind }) => {
    if (!content.trim()) throw new SenderError("Message cannot be empty");
    if (kind !== "text" && kind !== "sticker") throw new SenderError("Invalid kind");

    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");

    ctx.db.chatMessage.insert({
      id: 0n,
      gameCode: p.gameCode,
      senderIdentity: ctx.sender,
      senderName: p.name || "???",
      content,
      kind,
      sentAt: ctx.timestamp.microsSinceUnixEpoch / 1000n,
    });
  }
);

export const uploadSticker = spacetimedb.reducer(
  { name: t.string(), imageData: t.string() },
  (ctx, { name, imageData }) => {
    if (!name.trim()) throw new SenderError("Sticker name required");
    if (imageData.length > 350_000) throw new SenderError("Sticker too large (max 256KB)");
    if (!imageData.startsWith("data:image/")) throw new SenderError("Must be a data:image/ URL");

    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");

    ctx.db.customSticker.insert({
      id: 0n,
      gameCode: p.gameCode,
      name: name.trim(),
      imageData,
      uploadedBy: ctx.sender,
      uploadedByName: p.name || "???",
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

// --- Share business event in WhatsApp ---

export const shareEvent = spacetimedb.reducer(
  { week: t.u32() },
  (ctx, { week }) => {
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");

    const event = [...ctx.db.businessEvent.iter()].find(
      (e) =>
        e.gameCode === p.gameCode &&
        e.playerIdentity.toHexString() === ctx.sender.toHexString() &&
        e.week === week
    );
    if (!event) throw new SenderError("No event found for this week");

    // Post as a chat message
    ctx.db.chatMessage.insert({
      id: 0n,
      gameCode: p.gameCode,
      senderIdentity: ctx.sender,
      senderName: p.name || "???",
      content: event.message,
      kind: "text",
      sentAt: ctx.timestamp.microsSinceUnixEpoch / 1000n,
    });
  }
);

// --- Solidario transfer (private, $200) ---

export const sendSolidario = spacetimedb.reducer(
  { receiverIdentityHex: t.string() },
  (ctx, { receiverIdentityHex }) => {
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");

    const g = ctx.db.game.code.find(p.gameCode);
    if (!g) throw new SenderError("Game not found");
    if (g.status !== "playing") throw new SenderError("Game not in progress");
    if (g.phase !== "action") throw new SenderError("Solo puedes enviar solidario durante la fase de pagos");

    // Can't send to yourself
    if (ctx.sender.toHexString() === receiverIdentityHex) {
      throw new SenderError("No puedes enviarte solidario a ti mismo");
    }

    // Check limit: one per week
    const existing = [...ctx.db.solidarioTransfer.iter()].find(
      (t) =>
        t.gameCode === p.gameCode &&
        t.senderIdentity.toHexString() === ctx.sender.toHexString() &&
        t.week === g.currentWeek
    );
    if (existing) throw new SenderError("Ya enviaste solidario esta semana");

    // Check funds
    if (p.money < SOLIDARIO_AMOUNT) {
      throw new SenderError("No tienes suficiente dinero para enviar solidario");
    }

    // Find receiver
    const receiver = [...ctx.db.player.iter()].find(
      (pl) => pl.gameCode === p.gameCode && pl.identity.toHexString() === receiverIdentityHex
    );
    if (!receiver) throw new SenderError("Jugador no encontrado");

    // Transfer
    ctx.db.player.id.update({ ...p, money: p.money - SOLIDARIO_AMOUNT });
    ctx.db.player.id.update({ ...receiver, money: receiver.money + SOLIDARIO_AMOUNT });

    ctx.db.solidarioTransfer.insert({
      id: 0n,
      gameCode: p.gameCode,
      senderIdentity: ctx.sender,
      receiverIdentity: receiver.identity,
      week: g.currentWeek,
      amount: SOLIDARIO_AMOUNT,
    });
  }
);

// --- Start game (symmetric, no presidenta) ---

export const startGame = spacetimedb.reducer({}, (ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (!p) throw new SenderError("Not in a game");

  const g = ctx.db.game.code.find(p.gameCode);
  if (!g) throw new SenderError("Game not found");
  if (!g.creator.isEqual(ctx.sender))
    throw new SenderError("Only the room creator can start");
  if (g.status !== "lobby") throw new SenderError("Game already started");

  // Get all players in this game
  const players = [...ctx.db.player.iter()].filter(
    (pl) => pl.gameCode === p.gameCode
  );
  if (players.length < 2)
    throw new SenderError("Need at least 2 players to start");

  // Initialize all players — assign default business/loan, compute weekly payment with tasa
  let totalTarget = 0;
  const businessDefaults = ["tiendita", "salon", "puesto", "catalogo", "costura", "panaderia"];

  for (let i = 0; i < players.length; i++) {
    const bt = players[i].businessType || businessDefaults[i % 6];
    const ls = players[i].loanSize || "medium";
    const credit = LOAN_CREDIT[ls] || 3500;
    const wp = calcWeeklyPayment(credit, g.weeksTotal);
    totalTarget += wp;

    ctx.db.player.id.update({
      ...players[i],
      businessType: bt,
      loanSize: ls,
      weeklyPayment: wp,
      money: BASE_INCOME,
    });
  }

  const now = ctx.timestamp.microsSinceUnixEpoch / 1000n;
  ctx.db.game.code.update({
    ...g,
    status: "playing",
    currentWeek: 1,
    phase: "action",
    phaseEndsAt: now + BigInt(60_000),
    targetPayment: totalTarget,
  });

  // Assign secret objectives deterministically
  const baseIdx = Number(ctx.timestamp.microsSinceUnixEpoch % BigInt(OBJECTIVE_CATALOG.length));
  for (let i = 0; i < players.length; i++) {
    const obj = OBJECTIVE_CATALOG[(baseIdx + i) % OBJECTIVE_CATALOG.length];
    ctx.db.secretObjective.insert({
      id: 0n,
      gameCode: p.gameCode,
      playerIdentity: players[i].identity,
      objectiveKey: obj.key,
      description: obj.description,
      completed: false,
      bonusMoney: obj.bonus,
    });
  }

  // Generate week 1 business events
  generateEventsForAllPlayers(ctx, p.gameCode, 1);

  ctx.db.gameEvent.insert({
    id: 0n,
    gameCode: p.gameCode,
    kind: "game_started",
    message: `El ciclo comienza! ${players.length} jugadores. Semana 1 de ${g.weeksTotal}.`,
  });
});

// --- Make payment (symmetric — all players pay) ---

export const makePayment = spacetimedb.reducer(
  { choice: t.string() },
  (ctx, { choice }) => {
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");

    const g = ctx.db.game.code.find(p.gameCode);
    if (!g) throw new SenderError("Game not found");
    if (g.status !== "playing") throw new SenderError("Game not in progress");
    if (g.phase !== "action") throw new SenderError("Not in action phase");

    // Check if already paid this week
    const existingPayments = [...ctx.db.payment.iter()].filter(
      (pay) =>
        pay.gameCode === p.gameCode &&
        pay.playerIdentity.isEqual(ctx.sender) &&
        pay.week === g.currentWeek
    );
    if (existingPayments.length > 0)
      throw new SenderError("Already paid this week");

    // Payment amounts based on player's own weeklyPayment
    const wp = p.weeklyPayment || 750;
    let amount: number;
    switch (choice) {
      case "full":
        amount = wp;
        break;
      case "partial":
        amount = Math.floor(wp * 0.5);
        break;
      case "none":
        amount = 0;
        break;
      case "double":
        amount = wp * 2;
        break;
      default:
        throw new SenderError("Invalid choice: full, partial, none, or double");
    }

    if (amount > p.money) {
      throw new SenderError("Not enough money");
    }

    ctx.db.payment.insert({
      id: 0n,
      gameCode: p.gameCode,
      playerIdentity: ctx.sender,
      week: g.currentWeek,
      amount,
      choice,
    });

    ctx.db.player.id.update({
      ...p,
      money: p.money - amount,
    });
  }
);

// --- Advance phase (symmetric) ---

export const advancePhase = spacetimedb.reducer({}, (ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (!p) throw new SenderError("Not in a game");

  const g = ctx.db.game.code.find(p.gameCode);
  if (!g) throw new SenderError("Game not found");
  if (g.status !== "playing") throw new SenderError("Game not in progress");
  if (!g.creator.isEqual(ctx.sender))
    throw new SenderError("Only creator can advance phases");

  const now = ctx.timestamp.microsSinceUnixEpoch / 1000n;

  if (g.phase === "action") {
    // Move to results phase — calculate week results
    const weekPayments = [...ctx.db.payment.iter()].filter(
      (pay) => pay.gameCode === p.gameCode && pay.week === g.currentWeek
    );
    const totalPaid = weekPayments.reduce((sum, pay) => sum + pay.amount, 0);
    const passed = totalPaid >= g.targetPayment;

    let moraAdded = 0;
    let newWeeksMissed = g.weeksMissed;
    let newTotalMora = g.totalMora;

    if (!passed) {
      newWeeksMissed += 1;
      moraAdded = MORA_PER_WEEK + MORA_DAILY_GROWTH * (newWeeksMissed - 1);
      newTotalMora += moraAdded;
    } else {
      newWeeksMissed = 0;
    }

    ctx.db.weekResult.insert({
      id: 0n,
      gameCode: p.gameCode,
      week: g.currentWeek,
      totalPaid,
      target: g.targetPayment,
      passed,
      moraAdded,
    });

    ctx.db.game.code.update({
      ...g,
      phase: "results",
      phaseEndsAt: now + BigInt(15_000),
      weeksMissed: newWeeksMissed,
      totalMora: newTotalMora,
    });

    const status = passed
      ? `Semana ${g.currentWeek}: $${totalPaid}/$${g.targetPayment} - CUMPLIDO!`
      : `Semana ${g.currentWeek}: $${totalPaid}/$${g.targetPayment} - NO CUMPLIDO. Mora: +$${moraAdded}`;

    ctx.db.gameEvent.insert({
      id: 0n,
      gameCode: p.gameCode,
      kind: "week_results",
      message: status,
    });
  } else if (g.phase === "results") {
    if (g.currentWeek >= g.weeksTotal) {
      // Game finished — evaluate objectives before finalizing
      evaluateObjectives(ctx, p.gameCode);

      const allResults = [...ctx.db.weekResult.iter()].filter(
        (r) => r.gameCode === p.gameCode
      );
      const weeksMissed = allResults.filter((r) => !r.passed).length;

      let graduation: string;
      if (weeksMissed === 0) graduation = "graduado";
      else if (weeksMissed <= 3) graduation = "no_graduado";
      else graduation = "moroso";

      ctx.db.game.code.update({
        ...g,
        status: "finished",
        phase: "finished",
        phaseEndsAt: BigInt(0),
      });

      ctx.db.gameEvent.insert({
        id: 0n,
        gameCode: p.gameCode,
        kind: "game_ended",
        message: `Ciclo completo! Estado: ${graduation}. Perdidos: ${weeksMissed} de ${g.weeksTotal}. Mora total: $${g.totalMora}`,
      });
    } else {
      // Move to rest phase (Sunday)
      ctx.db.game.code.update({
        ...g,
        phase: "rest",
        phaseEndsAt: now + BigInt(15_000),
      });

      ctx.db.gameEvent.insert({
        id: 0n,
        gameCode: p.gameCode,
        kind: "phase_changed",
        message: `Domingo de descanso. Semana ${g.currentWeek + 1} empieza pronto.`,
      });
    }
  } else if (g.phase === "rest") {
    // Start next week — give ALL players income (symmetric)
    const players = [...ctx.db.player.iter()].filter(
      (pl) => pl.gameCode === p.gameCode
    );
    for (const member of players) {
      ctx.db.player.id.update({
        ...member,
        money: member.money + BASE_INCOME,
      });
    }

    const nextWeek = g.currentWeek + 1;

    ctx.db.game.code.update({
      ...g,
      currentWeek: nextWeek,
      phase: "action",
      phaseEndsAt: now + BigInt(60_000),
    });

    // Generate business events for the new week
    generateEventsForAllPlayers(ctx, p.gameCode, nextWeek);

    ctx.db.gameEvent.insert({
      id: 0n,
      gameCode: p.gameCode,
      kind: "week_started",
      message: `Semana ${nextWeek} comienza! Ingreso recibido: $${BASE_INCOME}`,
    });
  }
});

// --- Connection handlers ---

export const onConnect = spacetimedb.clientConnected((ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (p) {
    ctx.db.player.id.update({ ...p, online: true });
  }
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (p) {
    ctx.db.player.id.update({ ...p, online: false });
  }
});
