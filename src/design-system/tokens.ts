// NexusEdu Global Design System Tokens
// Unified color palette, typography hierarchy, spacing scale, glassmorphism, and White-Label defaults.

export const NEXUS_TOKENS = {
  brand: {
    name: "NexusEdu",
    tagline: "A plataforma que conecta toda a sua escola.",
    primary: "#2563eb", // Royal Blue
    primaryGradient: "from-blue-600 via-indigo-600 to-cyan-500",
    secondary: "#4f46e5", // Deep Indigo
    accent: "#06b6d4", // Electric Cyan
    darkBg: "#0b0f19", // Deep Space Slate
    surfaceBg: "#0f172a", // Slate 900
    cardBg: "rgba(15, 23, 42, 0.85)", // Glassmorphic Slate
    cardBorder: "rgba(51, 65, 85, 0.6)", // Slate 700/60
  },
  typography: {
    fontDisplay: "'Outfit', sans-serif",
    fontSans: "'Inter', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
  },
  status: {
    success: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      solid: "bg-emerald-600 text-white",
      dot: "bg-emerald-400",
    },
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      solid: "bg-amber-600 text-white",
      dot: "bg-amber-400",
    },
    danger: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      text: "text-rose-400",
      solid: "bg-rose-600 text-white",
      dot: "bg-rose-400",
    },
    info: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      solid: "bg-blue-600 text-white",
      dot: "bg-blue-400",
    },
    neutral: {
      bg: "bg-slate-800/60",
      border: "border-slate-700/50",
      text: "text-slate-300",
      solid: "bg-slate-700 text-white",
      dot: "bg-slate-400",
    },
  },
  shadows: {
    glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
    cardHover: "0 20px 40px -15px rgba(37, 99, 235, 0.25)",
    buttonPrimary: "0 10px 25px -5px rgba(37, 99, 235, 0.4)",
  },
  radii: {
    sm: "rounded-xl",
    md: "rounded-2xl",
    lg: "rounded-3xl",
    full: "rounded-full",
  },
};

export interface WhiteLabelConfig {
  schoolName: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export const getWhiteLabelTheme = (config?: WhiteLabelConfig) => {
  return {
    name: config?.schoolName || NEXUS_TOKENS.brand.name,
    logoUrl: config?.logoUrl || null,
    primaryColor: config?.primaryColor || NEXUS_TOKENS.brand.primary,
    secondaryColor: config?.secondaryColor || NEXUS_TOKENS.brand.secondary,
  };
};
