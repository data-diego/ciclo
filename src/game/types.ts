// Game state types (mirror SpacetimeDB tables for local use before bindings are generated)

export type GameStatus = "lobby" | "playing" | "finished";
export type GamePhase = "lobby" | "action" | "results" | "rest" | "finished";
export type GameMode = "experiencia" | "medio" | "completo";
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
  { emoji: string; label: string }
> = {
  tiendita: { emoji: "\u{1F6D2}", label: "Tiendita" },
  salon: { emoji: "\u{1F487}", label: "Salón" },
  puesto: { emoji: "\u{1F32E}", label: "Puesto" },
  catalogo: { emoji: "\u{1F457}", label: "Catálogo" },
  costura: { emoji: "\u{1F9F5}", label: "Costura" },
  panaderia: { emoji: "\u{1F35E}", label: "Panadería" },
};

export const MODE_INFO: Record<GameMode, { label: string; weeks: number }> = {
  experiencia: { label: "Experiencia", weeks: 4 },
  medio: { label: "Medio ciclo", weeks: 8 },
  completo: { label: "Ciclo completo", weeks: 16 },
};

// Tasa: 75 pesos por cada $1,000 prestados (per cycle, Grupalia standard range 69-82)
export const TASA_PER_MIL = 75;

export const LOAN_INFO: Record<LoanSize, { label: string; emoji: string; credit: number }> = {
  small: { label: "Peque\u00f1o", emoji: "\u{1F331}", credit: 2000 },
  medium: { label: "Mediano", emoji: "\u{1F333}", credit: 3500 },
  large: { label: "Grande", emoji: "\u{1F3D4}\u{FE0F}", credit: 5000 },
};

/** Calculate weekly payment including tasa interest */
export function calcWeeklyPayment(credit: number, weeks: number): number {
  const interest = (credit / 1000) * TASA_PER_MIL;
  return Math.ceil((credit + interest) / weeks);
}

/** Total payback amount (credit + interest), rounded */
export function calcTotalPayback(credit: number): number {
  return Math.round(credit + (credit / 1000) * TASA_PER_MIL);
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
