// Game state types (mirror SpacetimeDB tables for local use before bindings are generated)

export type GameStatus = "lobby" | "playing" | "finished";
export type GamePhase = "lobby" | "action" | "results" | "rest" | "finished";
export type GameMode = "experiencia" | "medio" | "completo";
export type Difficulty = "facil" | "normal" | "dificil";
export type PaymentChoice = "full" | "partial" | "none" | "double";
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
  { emoji: string; label: string; difficulty: string; desc: string; positive: string; negative: string }
> = {
  tiendita: { emoji: "\u{1F6D2}", label: "Tiendita", difficulty: "Equilibrado", desc: "Una tiendita de barrio con ventas estables", positive: "+$200", negative: "−$150" },
  salon: { emoji: "\u{1F487}", label: "Salón", difficulty: "Riesgoso", desc: "Buen ingreso pero los gastos de equipo son altos", positive: "+$200", negative: "−$200" },
  puesto: { emoji: "\u{1F32E}", label: "Puesto", difficulty: "Favorable", desc: "Pedidos grandes pero vulnerable al clima", positive: "+$250", negative: "−$150" },
  catalogo: { emoji: "\u{1F457}", label: "Catálogo", difficulty: "Equilibrado", desc: "Ventas por catálogo con riesgo de devoluciones", positive: "+$200", negative: "−$150" },
  costura: { emoji: "\u{1F9F5}", label: "Costura", difficulty: "Alto riesgo", desc: "Los mejores premios pero materiales caros", positive: "+$300", negative: "−$200" },
  panaderia: { emoji: "\u{1F35E}", label: "Panadería", difficulty: "Favorable", desc: "Buenas ventas, solo cuida el precio de la harina", positive: "+$250", negative: "−$150" },
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

export type PlayerRole = "member" | "presidenta"; // legacy compat for store.ts
export const FULL_PAYMENT = 750; // legacy compat — payments now use player.weeklyPayment

export const BASE_INCOME = 1200;
export const SOLIDARIO_AMOUNT = 200;
