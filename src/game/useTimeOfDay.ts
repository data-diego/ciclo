// Maps elapsed time within the action phase to a day-of-week visual

export interface TimeOfDay {
  dayLabel: string;
  timeIcon: string;
  bgClass: string;
  progress: number; // 0-1 through the week
}

const PHASE_DURATION = 60; // seconds

const DAYS = [
  { label: "Lunes", icon: "\u{1F305}", bg: "time-morning" },    // 0-12s
  { label: "Martes", icon: "\u2600\uFE0F", bg: "time-midday" },  // 12-24s
  { label: "Miercoles", icon: "\u{1F324}\uFE0F", bg: "time-afternoon" }, // 24-36s
  { label: "Jueves", icon: "\u{1F307}", bg: "time-evening" },    // 36-48s
  { label: "Viernes", icon: "\u{1F306}", bg: "time-sunset" },    // 48-60s
];

export function useTimeOfDay(
  phase: string,
  secondsLeft: number,
): TimeOfDay {
  if (phase === "results") {
    return {
      dayLabel: "Viernes noche",
      timeIcon: "\u{1F319}",
      bgClass: "time-night",
      progress: 1,
    };
  }

  if (phase === "rest") {
    return {
      dayLabel: "Domingo",
      timeIcon: "\u2600\uFE0F",
      bgClass: "time-sunday",
      progress: 1,
    };
  }

  if (phase !== "action") {
    return {
      dayLabel: "",
      timeIcon: "",
      bgClass: "",
      progress: 0,
    };
  }

  const elapsed = PHASE_DURATION - secondsLeft;
  const dayIndex = Math.min(Math.floor(elapsed / 12), DAYS.length - 1);
  const day = DAYS[dayIndex];
  const progress = elapsed / PHASE_DURATION;

  return {
    dayLabel: day.label,
    timeIcon: day.icon,
    bgClass: day.bg,
    progress,
  };
}
