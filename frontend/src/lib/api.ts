import type {
  AnalysisResult,
  AnalysisStatus,
  AuthToken,
  Board,
  ColorRank,
  Garment,
  GarmentTypeRank,
  Outfit,
  OutfitFacets,
  Product,
  User,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function removeToken() {
  localStorage.removeItem("token");
}

function transformKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      let camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (camelKey === "productUrl") camelKey = "url";
      result[camelKey] = transformKeys(value);
    }
    return result;
  }
  return obj;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
      throw { detail: "Sesión expirada", status: 401 };
    }
    const body = await res.json().catch(() => ({ detail: "Error de conexión" }));
    let detail = body.detail ?? "Error desconocido";
    if (Array.isArray(detail)) {
      detail = detail.map((e: { msg?: string }) => e.msg || "").join(". ");
    }
    throw { detail, status: res.status };
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return transformKeys(json) as T;
}

export const auth = {
  login: (email: string, password: string) =>
    request<AuthToken>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<AuthToken>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  me: () => request<User>("/api/auth/me"),
};

export const boards = {
  list: () => request<Board[]>("/api/boards/"),
  get: (id: string) => request<Board>(`/api/boards/${id}`),
  create: (pinterestUrl: string, name?: string) =>
    request<Board>("/api/boards/", {
      method: "POST",
      body: JSON.stringify({ pinterest_url: pinterestUrl, name: name || null }),
    }),
  delete: (id: string) =>
    request<void>(`/api/boards/${id}`, { method: "DELETE" }),
  analyze: (id: string) =>
    request<AnalysisResult>(`/api/boards/${id}/analyze`, { method: "POST" }),
  status: (id: string) =>
    request<AnalysisStatus>(`/api/boards/${id}/status`),
  outfits: (id: string, opts?: { garmentNames?: string[]; garmentColors?: string[]; garmentType?: string; connectors?: string[]; outfitSeason?: string[]; outfitStyle?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.garmentNames?.length) {
      opts.garmentNames.forEach((n) => params.append("garment_name", n));
      if (opts.connectors?.length) {
        params.set("connectors", opts.connectors.join(","));
      }
    }
    if (opts?.garmentColors?.length) {
      opts.garmentColors.forEach((c) => params.append("garment_color", c));
    }
    if (!opts?.garmentNames?.length && !opts?.garmentColors?.length && opts?.garmentType) {
      params.set("garment_type", opts.garmentType);
    }
    if (opts?.outfitSeason?.length) {
      opts.outfitSeason.forEach((s) => params.append("outfit_season", s));
    }
    if (opts?.outfitStyle?.length) {
      opts.outfitStyle.forEach((s) => params.append("outfit_style", s));
    }
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<Outfit[]>(`/api/boards/${id}/outfits${qs}`);
  },
  outfitFacets: (id: string) =>
    request<OutfitFacets>(`/api/boards/${id}/outfit-facets`),
  trends: (id: string) => request<GarmentTypeRank[]>(`/api/boards/${id}/trends`),
  colorTrends: (id: string, opts?: { garmentNames?: string[]; connectors?: string[] }) => {
    const params = new URLSearchParams();
    if (opts?.garmentNames?.length) {
      opts.garmentNames.forEach((n) => params.append("garment_name", n));
      if (opts?.connectors?.length)
        params.set("connectors", opts.connectors.join(","));
    }
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<ColorRank[]>(`/api/boards/${id}/color-trends${qs}`);
  },
};

export const outfits = {
  get: (id: string) => request<Outfit>(`/api/outfits/${id}`),
};

export const garments = {
  get: (id: string) => request<Garment>(`/api/garments/${id}`),
  products: (id: string) => request<Product[]>(`/api/garments/${id}/products`),
  searchProducts: (id: string) =>
    request<Product[]>(`/api/garments/${id}/search-products`, {
      method: "POST",
    }),
};
