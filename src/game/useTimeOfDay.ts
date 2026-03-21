// Maps sub-phase to visual state (turn-based, no timers)

export interface TimeOfDay {
  dayLabel: string;
  timeIcon: string;
  bgClass: string;
  progress: number; // 0-1 through the week
}

const SUB_PHASE_MAP: Record<string, TimeOfDay> = {
  evento: {
    dayLabel: "Lunes",
    timeIcon: "\u{1F305}",
    bgClass: "time-morning",
    progress: 0.25,
  },
  platica: {
    dayLabel: "Miércoles",
    timeIcon: "\u2600\uFE0F",
    bgClass: "time-midday",
    progress: 0.5,
  },
  decision: {
    dayLabel: "Viernes",
    timeIcon: "\u{1F307}",
    bgClass: "time-evening",
    progress: 0.75,
  },
  resultado: {
    dayLabel: "Noche",
    timeIcon: "\u{1F319}",
    bgClass: "time-night",
    progress: 1.0,
  },
};

const DEFAULT: TimeOfDay = {
  dayLabel: "",
  timeIcon: "",
  bgClass: "",
  progress: 0,
};

export function useTimeOfDay(subPhase: string): TimeOfDay {
  return SUB_PHASE_MAP[subPhase] || DEFAULT;
}
