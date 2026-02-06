export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitial?: string;
  boardsCount?: number;
  outfitsCount?: number;
  garmentsCount?: number;
  createdAt: string;
}

export interface Board {
  id: string;
  name: string;
  pinterestUrl: string;
  imageUrl: string | null;
  pinsCount: number;
  status: "completed" | "analyzing" | "pending" | "failed";
  analyzedAt: string | null;
  createdAt: string;
  outfits?: Outfit[];
  outfitsCount?: number;
  garmentsCount?: number;
}

export interface Outfit {
  id: string;
  boardId?: string;
  imageUrl: string;
  cloudinaryUrl: string | null;
  style: string | null;
  season: string | null;
  sourcePinUrl: string | null;
  createdAt: string;
  garments?: Garment[];
  garmentsCount?: number;
}

export interface Garment {
  id: string;
  outfitId?: string;
  name: string;
  type: string;
  color: string | null;
  material: string | null;
  style: string | null;
  season: string | null;
  imageUrl: string | null;
  confidence: number | null;
  createdAt: string;
  products?: Product[];
}

export interface Product {
  id: string;
  garmentId?: string;
  name: string;
  price: string | null;
  store: string | null;
  imageUrl: string | null;
  url: string | null;
  similarity: number | null;
  createdAt: string;
}

export interface GarmentRank {
  type: string;
  color: string | null;
  count: number;
  percentage?: number;
}

export interface AnalysisPhase {
  label: string;
  status: "completed" | "active" | "pending";
}

export interface AuthToken {
  accessToken: string;
  tokenType: string;
}

export interface AnalysisResult {
  status: string;
  boardId: string;
  outfitsCreated: number;
  garmentsCreated: number;
  pinsScraped: number;
}

export interface ApiError {
  detail: string;
}
