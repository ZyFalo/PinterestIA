import type {
  AuthToken,
  Board,
  Garment,
  GarmentRank,
  Outfit,
  Product,
  User,
  AnalysisResult,
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
    const body = await res.json().catch(() => ({ detail: "Error de conexión" }));
    throw body;
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
  outfits: (id: string) => request<Outfit[]>(`/api/boards/${id}/outfits`),
  trends: (id: string) => request<GarmentRank[]>(`/api/boards/${id}/trends`),
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
