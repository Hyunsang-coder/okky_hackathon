export interface ColorScheme {
  id: string;
  name: string;
  colors: {
    accent: string;
    success: string;
    warning: string;
    caution: string;
    danger: string;
    link: string;
  };
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: "default",
    name: "Default",
    colors: {
      accent: "#3b82f6",   // blue-500
      success: "#22c55e",  // green-500
      warning: "#eab308",  // yellow-500
      caution: "#f97316",  // orange-500
      danger: "#ef4444",   // red-500
      link: "#60a5fa",     // blue-400
    },
  },
  {
    id: "midnight-indigo",
    name: "Midnight Indigo",
    colors: {
      accent: "#818cf8",   // indigo-400
      success: "#34d399",  // emerald-400
      warning: "#fbbf24",  // amber-400
      caution: "#fb923c",  // orange-400
      danger: "#f87171",   // red-400
      link: "#a5b4fc",     // indigo-300
    },
  },
  {
    id: "ocean-teal",
    name: "Ocean Teal",
    colors: {
      accent: "#2dd4bf",   // teal-400
      success: "#4ade80",  // green-400
      warning: "#facc15",  // yellow-400
      caution: "#fb923c",  // orange-400
      danger: "#fb7185",   // rose-400
      link: "#5eead4",     // teal-300
    },
  },
  {
    id: "warm-amber",
    name: "Warm Amber",
    colors: {
      accent: "#f59e0b",   // amber-500
      success: "#84cc16",  // lime-500
      warning: "#eab308",  // yellow-500
      caution: "#f97316",  // orange-500
      danger: "#ef4444",   // red-500
      link: "#fbbf24",     // amber-400
    },
  },
  {
    id: "neon-cyber",
    name: "Neon Cyber",
    colors: {
      accent: "#a78bfa",   // violet-400
      success: "#4ade80",  // green-400
      warning: "#facc15",  // yellow-400
      caution: "#fb923c",  // orange-400
      danger: "#f43f5e",   // rose-500
      link: "#c4b5fd",     // violet-300
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    colors: {
      accent: "#10b981",   // emerald-500
      success: "#22c55e",  // green-500
      warning: "#eab308",  // yellow-500
      caution: "#f97316",  // orange-500
      danger: "#ef4444",   // red-500
      link: "#34d399",     // emerald-400
    },
  },
];

export const DEFAULT_SCHEME = COLOR_SCHEMES[0];

export function getSchemeById(id: string): ColorScheme {
  return COLOR_SCHEMES.find((s) => s.id === id) ?? DEFAULT_SCHEME;
}
