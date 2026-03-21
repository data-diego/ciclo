// Game state types (mirror SpacetimeDB tables for local use before bindings are generated)

export type GameStatus = "lobby" | "playing" | "finished";
export type GamePhase = "lobby" | "action" | "results" | "rest" | "finished";
export type GameMode = "experiencia" | "medio" | "completo";
export type Difficulty = "facil" | "normal" | "dificil";
export type PaymentChoice = "full" | "partial" | "none";
export type GameSubPhase = "decision" | "resultado";
export type LoanSize = "small" | "medium" | "large";

export type BusinessType =
  | "tiendita"
  | "salon"
  | "puesto"
  | "catalogo"
  | "costura"
  | "panaderia";

export const BUSINESS_INFO: Record<
  BusinessType,
  { emoji: string; label: string; difficulty: string; desc: string; positivePct: number; negativePct: number }
> = {
  tiendita: { emoji: "\u{1F6D2}", label: "Tiendita", difficulty: "Equilibrado", desc: "Una tiendita de barrio con ventas estables", positivePct: 25, negativePct: -20 },
  salon: { emoji: "\u{1F487}", label: "Salón", difficulty: "Riesgoso", desc: "Buen ingreso pero los gastos de equipo son altos", positivePct: 25, negativePct: -25 },
  puesto: { emoji: "\u{1F32E}", label: "Puesto", difficulty: "Favorable", desc: "Pedidos grandes pero vulnerable al clima", positivePct: 30, negativePct: -15 },
  catalogo: { emoji: "\u{1F457}", label: "Catálogo", difficulty: "Equilibrado", desc: "Ventas por catálogo con riesgo de devoluciones", positivePct: 25, negativePct: -20 },
  costura: { emoji: "\u{1F9F5}", label: "Costura", difficulty: "Alto riesgo", desc: "Los mejores premios pero materiales caros", positivePct: 30, negativePct: -25 },
  panaderia: { emoji: "\u{1F35E}", label: "Panadería", difficulty: "Favorable", desc: "Buenas ventas, solo cuida el precio de la harina", positivePct: 30, negativePct: -20 },
};

export const MODE_INFO: Record<GameMode, { label: string; emoji: string; weeks: number; durationMin: number }> = {
  experiencia: { label: "Juego rápido", emoji: "🕐", weeks: 4, durationMin: 6 },
  medio: { label: "Medio ciclo", emoji: "⏳", weeks: 8, durationMin: 12 },
  completo: { label: "Ciclo completo", emoji: "🗓️", weeks: 16, durationMin: 24 },
};

export const DIFFICULTY_INFO: Record<Difficulty, { label: string; emoji: string; desc: string }> = {
  facil: { label: "Fácil", emoji: "💰", desc: "Menos eventos negativos, ideal para aprender" },
  normal: { label: "Normal", emoji: "💵", desc: "Experiencia balanceada, como en la vida real" },
  dificil: { label: "Difícil", emoji: "💸", desc: "Más retos e imprevistos, para expertos" },
};

// Tasa por cada $1,000 prestados — varies by difficulty (Grupalia standard range 69-82)
export const TASA_BY_DIFFICULTY: Record<Difficulty, number> = {
  facil: 65,
  normal: 75,
  dificil: 85,
};
export const TASA_PER_MIL = 75; // default fallback

export const LOAN_INFO: Record<LoanSize, { label: string; emoji: string; credit: number }> = {
  small: { label: "Peque\u00f1o", emoji: "\u{1F331}", credit: 2000 },
  medium: { label: "Mediano", emoji: "\u{1F333}", credit: 3500 },
  large: { label: "Grande", emoji: "\u{1F3D4}\u{FE0F}", credit: 5000 },
};

/** Calculate weekly payment including tasa interest */
export function calcWeeklyPayment(credit: number, weeks: number, tasa: number = TASA_PER_MIL): number {
  const interest = (credit / 1000) * tasa;
  return Math.ceil((credit + interest) / weeks);
}

/** Total payback amount (credit + interest), rounded */
export function calcTotalPayback(credit: number, tasa: number = TASA_PER_MIL): number {
  return Math.round(credit + (credit / 1000) * tasa);
}

export type Pronoun = "m" | "f" | "x";

/** Returns gendered word ending: "o" for masculine, "a" for feminine, "e" for neutral */
export function g(pronoun: string | undefined, m: string, f: string, x?: string): string {
  if (pronoun === "f") return f;
  if (pronoun === "x") return x ?? f;
  return m;
}

export const SOLIDARIO_MIN = 50;
export const SOLIDARIO_MAX = 500;
export const SOLIDARIO_STEP = 50;
export const SOLIDARIO_DEFAULT = 200;

// Income scales with loan size — bigger business = more revenue but tighter margins
export const INCOME_BY_LOAN: Record<LoanSize, number> = {
  small: 850,
  medium: 1050,
  large: 1250,
};

// Starting money = 1 week of income × this multiplier
export const STARTING_MONEY_MULT: Record<Difficulty, number> = {
  facil: 1.2,
  normal: 1.0,
  dificil: 0.8,
};

// Mora (late fees) — escalates per consecutive missed week, splits across group
export const MORA_BASE = 60;
export const MORA_GROWTH = 30;

// Scoring — points awarded in real-time
export const SCORE_FULL = 100;
export const SCORE_PARTIAL = 20;
export const SCORE_NONE = -40;
export const SCORE_SOLIDARIO = 30;
export const SCORE_GROUP_PASSED = 60;
export const SCORE_GROUP_FAILED = -20;
export const SCORE_INVESTMENT = 25;
export const SCORE_FAMILY = 20;

// Loan multiplier on group bonus only — rewards surviving harder situations
export const LOAN_GROUP_MULT: Record<LoanSize, number> = {
  small: 1.0,
  medium: 1.15,
  large: 1.3,
};

/** Calculate effective income with modifier */
export function calcEffectiveIncome(income: number, modifierPct: number): number {
  return Math.max(0, Math.round(income * (100 + modifierPct) / 100));
}
