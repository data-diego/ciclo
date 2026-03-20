// Game state types (mirror SpacetimeDB tables for local use before bindings are generated)

export type GameStatus = "lobby" | "playing" | "finished";
export type GamePhase = "lobby" | "action" | "results" | "rest" | "finished";
export type GameMode = "experiencia" | "medio" | "completo";
export type PlayerRole = "member" | "presidenta";
export type PaymentChoice = "full" | "partial" | "none" | "double";

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
  salon: { emoji: "\u{1F487}", label: "Salon" },
  puesto: { emoji: "\u{1F32E}", label: "Puesto" },
  catalogo: { emoji: "\u{1F457}", label: "Catalogo" },
  costura: { emoji: "\u{1F9F5}", label: "Costura" },
  panaderia: { emoji: "\u{1F35E}", label: "Panaderia" },
};

export const MODE_INFO: Record<GameMode, { label: string; weeks: number }> = {
  experiencia: { label: "Experiencia", weeks: 4 },
  medio: { label: "Medio ciclo", weeks: 8 },
  completo: { label: "Ciclo completo", weeks: 16 },
};

export const FULL_PAYMENT = 750;
export const PARTIAL_PAYMENT = 400;
export const DOUBLE_PAYMENT = 1500;
export const BASE_INCOME = 1200;
