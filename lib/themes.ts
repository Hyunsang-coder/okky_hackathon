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
    name: "Blue",
    colors: {
      accent: "#2563eb",
      success: "#16a34a",
      warning: "#ca8a04",
      caution: "#ea580c",
      danger: "#dc2626",
      link: "#1d4ed8",
    },
  },
  {
    id: "slate",
    name: "Slate",
    colors: {
      accent: "#475569",
      success: "#16a34a",
      warning: "#ca8a04",
      caution: "#ea580c",
      danger: "#dc2626",
      link: "#334155",
    },
  },
  {
    id: "teal",
    name: "Teal",
    colors: {
      accent: "#0d9488",
      success: "#16a34a",
      warning: "#ca8a04",
      caution: "#ea580c",
      danger: "#dc2626",
      link: "#0f766e",
    },
  },
];

export const DEFAULT_SCHEME = COLOR_SCHEMES[0];

export function getSchemeById(id: string): ColorScheme {
  return COLOR_SCHEMES.find((s) => s.id === id) ?? DEFAULT_SCHEME;
}
