// Design tokens extracted from Grupalia's Figma Design System (Untitled UI)
// Source: https://www.figma.com/design/RDaAEBKLWDr33UmiOyD7qT

export const colors = {
  // Grupalia brand (violet)
  brand: {
    50: "#F7F3FF",
    100: "#EDE5FF",
    200: "#D4BBFF",
    300: "#D1B5FD", // button-primary-icon
    400: "#B48BFA",
    500: "#955CF6", // fg-brand-secondary-alt
    600: "#7C3AED", // bg-brand-solid (primary)
    700: "#6928D9", // bg-brand-solid-hover, text-brand-secondary
    800: "#5821B6", // text-brand-secondary-hover
    900: "#4A1D95",
  },

  // Gray (Grupalia light scale — maps to Figma semantic tokens)
  gray: {
    25: "#FCFCFD",
    50: "#F8FAFC",  // bg-secondary-alt, utility-gray-50
    100: "#EEF2F6", // bg-disabled
    200: "#E3E8EF", // border-secondary, border-disabled-subtle, utility-gray-200
    300: "#CDD5DF", // border-primary, fg-disabled-subtle
    400: "#9AA4B2", // fg-quaternary, fg-disabled
    500: "#697586", // text-quaternary, text-placeholder
    600: "#4B5565", // text-tertiary
    700: "#364152", // text-secondary, utility-gray-700
    800: "#202939", // text-secondary-hover
    900: "#121926", // text-primary
    950: "#0D121C",
  },

  // WhatsApp
  whatsapp: {
    green: "#25D366",
    teal: "#128C7E",
    tealDark: "#075E54",
    light: "#DCF8C6",
    chatBg: "#ECE5DD",
    headerBg: "#075E54",
    inputBg: "#F0F0F0",
  },

  // Semantic status
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

// Semantic color aliases (maps Figma variable names to palette)
export const semantic = {
  text: {
    primary: colors.gray[900],    // #121926
    secondary: colors.gray[700],  // #364152
    tertiary: colors.gray[600],   // #4B5565
    quaternary: colors.gray[500], // #697586
    placeholder: colors.gray[500],// #697586
    disabled: colors.gray[400],   // #9AA4B2
    white: colors.white,
    brand: colors.brand[700],     // #6928D9
    brandHover: colors.brand[800],// #5821B6
  },
  bg: {
    primary: colors.white,
    primaryAlt: colors.white,
    primaryHover: colors.gray[50],    // #F8FAFC
    secondaryAlt: colors.gray[50],   // #F8FAFC
    disabled: colors.gray[100],      // #EEF2F6
    brandSolid: colors.brand[600],   // #7C3AED
    brandSolidHover: colors.brand[700], // #6928D9
  },
  border: {
    primary: colors.gray[300],       // #CDD5DF
    secondary: colors.gray[200],     // #E3E8EF
    disabledSubtle: colors.gray[200],// #E3E8EF
  },
  fg: {
    brandSecondaryAlt: colors.brand[500], // #955CF6
    brandSecondaryHover: colors.brand[600], // #7C3AED
    quaternary: colors.gray[400],    // #9AA4B2
    quaternaryHover: colors.gray[500],// #697586
    disabled: colors.gray[400],      // #9AA4B2
    disabledSubtle: colors.gray[300],// #CDD5DF
    successSecondary: "#17B26A",
  },
} as const;

// Button component colors (from Figma component tokens)
export const buttonColors = {
  primary: {
    bg: colors.brand[600],
    bgHover: colors.brand[700],
    text: colors.white,
    icon: "#D1B5FD",
    iconHover: "#E4D7FE",
    border: "rgba(255, 255, 255, 0.12)",
  },
  secondary: {
    bg: colors.white,
    bgHover: colors.gray[50],
    text: colors.gray[700],
    textHover: colors.gray[800],
    border: colors.gray[300],
  },
  tertiary: {
    bg: "transparent",
    bgHover: colors.gray[50],
    text: colors.gray[600],
    textHover: colors.gray[700],
  },
  linkColor: {
    text: colors.brand[700],
    textHover: colors.brand[800],
  },
  linkGray: {
    text: colors.gray[600],
    textHover: colors.gray[700],
  },
  disabled: {
    bg: colors.gray[100],
    text: colors.gray[400],
    border: colors.gray[200],
  },
} as const;

export const typography = {
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",

  size: {
    xs: "0.75rem",   // 12px
    sm: "0.875rem",  // 14px
    md: "1rem",      // 16px
    lg: "1.125rem",  // 18px
    xl: "1.25rem",   // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem",  // 36px
  },

  lineHeight: {
    xs: "1.125rem",  // 18px
    sm: "1.25rem",   // 20px
    md: "1.5rem",    // 24px
    lg: "1.75rem",   // 28px
  },

  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
  },
} as const;

export const spacing = {
  xxs: "2px",
  xs: "4px",
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",

  radius: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "20px",
    full: "9999px",
  },
} as const;

export const shadows = {
  xs: "0px 1px 2px 0px rgba(10, 13, 18, 0.05)",
  sm: "0px 1px 2px -1px rgba(10, 13, 18, 0.1), 0px 1px 3px 0px rgba(10, 13, 18, 0.1)",
  skeuomorphicXs:
    "0px 1px 2px 0px rgba(10, 13, 18, 0.05), inset 0px -2px 0px 0px rgba(10, 13, 18, 0.05), inset 0px 0px 0px 1px rgba(10, 13, 18, 0.18)",
  focusRing: "0px 0px 0px 4px #955CF6, 0px 0px 0px 2px #FFFFFF",
  focusRingSkeuomorphicXs:
    "0px 0px 0px 4px #955CF6, 0px 0px 0px 2px #FFFFFF, 0px 1px 2px 0px rgba(10, 13, 18, 0.05), inset 0px -2px 0px 0px rgba(10, 13, 18, 0.05), inset 0px 0px 0px 1px rgba(10, 13, 18, 0.18)",
} as const;
