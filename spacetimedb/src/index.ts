import { schema, table, t, SenderError } from "spacetimedb/server";

// --- Tables ---

const game = table(
  { public: true },
  {
    code: t.string().primaryKey(), // room code e.g. "ABCDEF"
    creator: t.identity(), // identity of the room creator
    status: t.string(), // "lobby" | "playing" | "finished"
    mode: t.string(), // "experiencia" | "medio" | "completo"
    weeksTotal: t.u32(), // 4, 8, or 16
    currentWeek: t.u32(), // 1-indexed
    phase: t.string(), // "action" | "results" | "rest"
    phaseEndsAt: t.u64(), // unix ms when current phase ends
    targetPayment: t.u32(), // weekly group payment target
    totalMora: t.u32(), // accumulated late fees
    weeksMissed: t.u32(), // consecutive weeks with incomplete payment
  }
);

const player = table(
  { public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    identity: t.identity().unique(),
    gameCode: t.string(),
    name: t.string(),
    businessType: t.string(), // tiendita | salon | puesto | catalogo | costura | panaderia
    role: t.string(), // "member" | "presidenta"
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
    amount: t.u32(), // 0, 400, 750, 1500
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

// Event table for game-wide announcements (broadcasts to all clients)
const gameEvent = table(
  { public: true, event: true },
  {
    gameCode: t.string(),
    kind: t.string(), // "game_started" | "week_started" | "phase_changed" | "game_ended"
    message: t.string(),
  }
);

const spacetimedb = schema({ game, player, payment, weekResult, gameEvent });
export default spacetimedb;

// --- Helpers ---

const MODES: Record<string, number> = {
  experiencia: 4,
  medio: 8,
  completo: 16,
};

const BASE_INCOME = 1200;
const FULL_PAYMENT = 750;
const PARTIAL_PAYMENT = 400;
const DOUBLE_PAYMENT = 1500;
const MORA_PER_WEEK = 45;
const MORA_DAILY_GROWTH = 15;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// --- Reducers ---

export const createGame = spacetimedb.reducer(
  { mode: t.string() },
  (ctx, { mode }) => {
    const weeksTotal = MODES[mode];
    if (!weeksTotal) {
      throw new SenderError(
        "Invalid mode. Use: experiencia, medio, or completo"
      );
    }

    const code = generateCode();

    ctx.db.game.insert({
      code,
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
      id: undefined as unknown as bigint,
      identity: ctx.sender,
      gameCode: code,
      name: "",
      businessType: "",
      role: "member",
      money: BASE_INCOME,
      online: true,
    });

    ctx.db.gameEvent.insert({
      gameCode: code,
      kind: "room_created",
      message: code,
    });
  }
);

export const joinGame = spacetimedb.reducer(
  { code: t.string(), name: t.string() },
  (ctx, { code, name }) => {
    if (!name.trim()) {
      throw new SenderError("Name cannot be empty");
    }

    const g = ctx.db.game.code.find(code);
    if (!g) throw new SenderError("Room not found");
    if (g.status !== "lobby") throw new SenderError("Game already started");

    const existing = ctx.db.player.identity.find(ctx.sender);
    if (existing) {
      // Update name if re-joining
      ctx.db.player.identity.update({ ...existing, name, online: true });
      return;
    }

    ctx.db.player.insert({
      id: undefined as unknown as bigint,
      identity: ctx.sender,
      gameCode: code,
      name,
      businessType: "",
      role: "member",
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
    ctx.db.player.identity.update({ ...p, name });
  }
);

export const pickBusinessType = spacetimedb.reducer(
  { businessType: t.string() },
  (ctx, { businessType }) => {
    const valid = [
      "tiendita",
      "salon",
      "puesto",
      "catalogo",
      "costura",
      "panaderia",
    ];
    if (!valid.includes(businessType)) {
      throw new SenderError("Invalid business type");
    }
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    ctx.db.player.identity.update({ ...p, businessType });
  }
);

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

  // Assign random presidenta
  const presidentaIdx = Math.floor(Math.random() * players.length);
  for (let i = 0; i < players.length; i++) {
    const role = i === presidentaIdx ? "presidenta" : "member";
    // Give default business type if not picked
    const bt =
      players[i].businessType ||
      ["tiendita", "salon", "puesto", "catalogo", "costura", "panaderia"][
        i % 6
      ];
    ctx.db.player.identity.update({
      ...players[i],
      role,
      businessType: bt,
      money: BASE_INCOME,
    });
  }

  // Calculate target: number of members (non-presidenta) * full payment
  const memberCount = players.length - 1;
  const target = memberCount * FULL_PAYMENT;

  const now = BigInt(Date.now());
  ctx.db.game.code.update({
    ...g,
    status: "playing",
    currentWeek: 1,
    phase: "action",
    phaseEndsAt: now + BigInt(60_000), // 60 seconds for action phase
    targetPayment: target,
  });

  ctx.db.gameEvent.insert({
    gameCode: p.gameCode,
    kind: "game_started",
    message: `The cycle begins! ${players.length} players, ${memberCount} businesses. Week 1 of ${g.weeksTotal}.`,
  });
});

export const makePayment = spacetimedb.reducer(
  { choice: t.string() },
  (ctx, { choice }) => {
    const p = ctx.db.player.identity.find(ctx.sender);
    if (!p) throw new SenderError("Not in a game");
    if (p.role === "presidenta")
      throw new SenderError("Presidenta does not make payments");

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

    let amount: number;
    switch (choice) {
      case "full":
        amount = FULL_PAYMENT;
        break;
      case "partial":
        amount = PARTIAL_PAYMENT;
        break;
      case "none":
        amount = 0;
        break;
      case "double":
        amount = DOUBLE_PAYMENT;
        break;
      default:
        throw new SenderError("Invalid choice: full, partial, none, or double");
    }

    // Check if player can afford it
    if (amount > p.money) {
      throw new SenderError("Not enough money");
    }

    ctx.db.payment.insert({
      id: undefined as unknown as bigint,
      gameCode: p.gameCode,
      playerIdentity: ctx.sender,
      week: g.currentWeek,
      amount,
      choice,
    });

    // Deduct from player money
    ctx.db.player.identity.update({
      ...p,
      money: p.money - amount,
    });
  }
);

export const advancePhase = spacetimedb.reducer({}, (ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (!p) throw new SenderError("Not in a game");

  const g = ctx.db.game.code.find(p.gameCode);
  if (!g) throw new SenderError("Game not found");
  if (g.status !== "playing") throw new SenderError("Game not in progress");
  if (!g.creator.isEqual(ctx.sender))
    throw new SenderError("Only creator can advance phases");

  const now = BigInt(Date.now());

  if (g.phase === "action") {
    // Move to results phase
    // Calculate week results
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
      id: undefined as unknown as bigint,
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
      phaseEndsAt: now + BigInt(15_000), // 15 seconds
      weeksMissed: newWeeksMissed,
      totalMora: newTotalMora,
    });

    const status = passed
      ? `Week ${g.currentWeek}: $${totalPaid}/$${g.targetPayment} - PASSED!`
      : `Week ${g.currentWeek}: $${totalPaid}/$${g.targetPayment} - MISSED. Mora: +$${moraAdded}`;

    ctx.db.gameEvent.insert({
      gameCode: p.gameCode,
      kind: "week_results",
      message: status,
    });
  } else if (g.phase === "results") {
    // Check if game is over
    if (g.currentWeek >= g.weeksTotal) {
      // Game finished
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
        gameCode: p.gameCode,
        kind: "game_ended",
        message: `Cycle complete! Status: ${graduation}. Missed ${weeksMissed} of ${g.weeksTotal} weeks. Total mora: $${g.totalMora}`,
      });
    } else {
      // Move to rest phase (Sunday)
      ctx.db.game.code.update({
        ...g,
        phase: "rest",
        phaseEndsAt: now + BigInt(15_000),
      });

      ctx.db.gameEvent.insert({
        gameCode: p.gameCode,
        kind: "phase_changed",
        message: `Domingo. Rest up. Week ${g.currentWeek + 1} starts soon.`,
      });
    }
  } else if (g.phase === "rest") {
    // Start next week - give everyone income
    const players = [...ctx.db.player.iter()].filter(
      (pl) => pl.gameCode === p.gameCode && pl.role === "member"
    );
    for (const member of players) {
      ctx.db.player.identity.update({
        ...member,
        money: member.money + BASE_INCOME,
      });
    }

    ctx.db.game.code.update({
      ...g,
      currentWeek: g.currentWeek + 1,
      phase: "action",
      phaseEndsAt: now + BigInt(60_000),
    });

    ctx.db.gameEvent.insert({
      gameCode: p.gameCode,
      kind: "week_started",
      message: `Week ${g.currentWeek + 1} begins! Income received: $${BASE_INCOME}`,
    });
  }
});

// --- Connection handlers ---

export const onConnect = spacetimedb.clientConnected((ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (p) {
    ctx.db.player.identity.update({ ...p, online: true });
  }
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (p) {
    ctx.db.player.identity.update({ ...p, online: false });
  }
});
