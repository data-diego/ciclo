// Design tokens extracted from Grupalia's rn-ui-kit + WhatsApp patterns
// See: rn-ui-kit/src/styles/colors.ts, rn-ui-kit/src/preset.ts

export const colors = {
  // Grupalia brand
  brand: {
    50: "#F7F3FF",
    100: "#EDE5FF",
    200: "#D4BBFF",
    400: "#B48BFA",
    500: "#955CF6",
    600: "#7C3AED", // primary
    700: "#6928D9",
    800: "#5821B6",
    900: "#4A1D95",
  },

  // Gray (Grupalia light scale)
  gray: {
    25: "#FCFCFD",
    50: "#F8FAFC",
    100: "#EEF2F6",
    200: "#E3E8EF",
    300: "#CDD5DF",
    400: "#9AA4B2",
    500: "#697586",
    600: "#4B5565",
    700: "#364152",
    800: "#414651",
    900: "#121926",
    950: "#0D121C",
  },

  // WhatsApp
  whatsapp: {
    green: "#25D366",
    teal: "#128C7E",
    tealDark: "#075E54",
    light: "#DCF8C6", // outgoing bubble
    chatBg: "#ECE5DD", // chat background
    headerBg: "#075E54",
    inputBg: "#F0F0F0",
  },

  // Semantic status (from Grupalia)
  success: {
    50: "#ECFDF3",
    100: "#D1FADF",
    500: "#12B76A",
    600: "#079455",
    700: "#067647",
  },
  error: {
    50: "#FEF3F2",
    100: "#FEE4E2",
    500: "#F04438",
    600: "#D92D20",
    700: "#B42318",
  },
  warning: {
    50: "#FFFAEB",
    100: "#FEF0C7",
    500: "#F79009",
    600: "#DC6803",
    700: "#B54708",
  },

  white: "#FFFFFF",
  black: "#000000",
} as const;

export const typography = {
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",

  // Matches Grupalia's rn-ui-kit text scale
  size: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    md: "1.125rem", // 18px
    lg: "1.25rem", // 20px
    xl: "1.5rem", // 24px
    "2xl": "1.875rem", // 30px
    "3xl": "2.25rem", // 36px
  },
} as const;

export const spacing = {
  radius: {
    sm: "6px",
    md: "8px", // Grupalia default for interactive elements
    lg: "12px",
    xl: "16px",
    "2xl": "20px",
    full: "9999px",
  },
} as const;
