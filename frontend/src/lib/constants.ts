export const ROUTES = {
  home: "/",
  registro: "/registro",
  login: "/login",
  inicio: "/inicio",
  importar: "/tableros/importar",
  tablero: (id: string) => `/tableros/${id}`,
  progreso: (id: string) => `/tableros/${id}/progreso`,
  outfit: (boardId: string, outfitId: string) =>
    `/tableros/${boardId}/outfits/${outfitId}`,
  prenda: (id: string) => `/prendas/${id}`,
  tendencias: (id: string) => `/tableros/${id}/tendencias`,
  perfil: "/perfil",
} as const;

export const GARMENT_CATEGORIES = [
  "Todos",
  "Tops",
  "Bottoms",
  "Vestidos",
  "Abrigos",
  "Calzado",
  "Accesorios",
] as const;

export const GARMENT_COLORS: Record<string, string> = {
  Negro: "#1A1A1A",
  Blanco: "#F5F5F5",
  Azul: "#2563EB",
  Rojo: "#E31E24",
  Verde: "#16A34A",
  Beige: "#D4B896",
  Gris: "#9CA3AF",
  Rosa: "#EC4899",
  Marrón: "#92400E",
  Amarillo: "#EAB308",
};
