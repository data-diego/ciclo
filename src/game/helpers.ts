// Client-side utilities for game setup (not used in SpacetimeDB reducers)

export const GROUP_NAMES = [
  "Las poderosas \u{1F4AA}",
  "Las brillantes \u{1F31F}",
  "Resiliencia!! \u{1F4AA}",
  "Fortaleza \u{1F3F0}",
  "Las invencibles \u{1F525}",
  "Nueva esperanza \u{2B50}",
  "Las guerreras \u{2694}\u{FE0F}",
  "Amanecer \u{1F305}",
  "Las bazare\u{F1}as \u{1F44F}",
  "Frutitas \u{1F353}",
  "Emprendedoras \u{1F4B0}",
  "Magia \u{1F52E}",
  "Las brisas \u{1F343}",
  "Coral \u{1F419}",
  "Abejitas \u{1F41D}",
  "Los cachorros \u{1F436}",
  "El trigal \u{1F33E}",
  "El ranchito \u{1F335}",
  "Maleficas \u{1F9D9}",
  "La isla \u{1F3DD}\u{FE0F}",
];

export function generateGroupName(): string {
  return GROUP_NAMES[Math.floor(Math.random() * GROUP_NAMES.length)];
}

export function generateCode(): string {
  return String(10000 + Math.floor(Math.random() * 90000));
}
