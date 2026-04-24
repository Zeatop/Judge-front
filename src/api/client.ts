const API_BASE = import.meta.env.VITE_JUDGE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "judge_ai_token";
const SESSION_KEY = "judge_guest_session";

export type GameId = string;

// ── Auth helpers ─────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// ── Session helpers (guest) ───────────────────────────────────────────

/** Retourne le session_id existant, ou en crée un nouveau et le stocke. */
export function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function clearSessionId(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ── Card types ──────────────────────────────────────────────────────

export interface CardInfo {
  name: string;
  scryfall_url: string;
  image_url: string;
}

// ── Ask ─────────────────────────────────────────────────────────────

export interface AskRequest {
  question: string;
  game_id: GameId;
  chat_id?: string;
  session_id?: string;
  model_id?: string;
}

export interface AskResponse {
  answer: string;
  cards: CardInfo[];
  chat_id: string | null;
}

// ── Models ──────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  label: string;
  description: string;
  speed: "fast" | "medium" | "slow";
  cost_tier: "low" | "medium" | "high";
}

export interface ModelsResponse {
  default: string;
  models: ModelInfo[];
}

export async function fetchModels(): Promise<ModelsResponse> {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error("Failed to fetch models");
  return res.json();
}

export async function askQuestion(
  question: string,
  game: GameId,
  chatId?: string,
  modelId?: string,
): Promise<AskResponse> {
  const body: AskRequest = { question, game_id: game };
  if (chatId) body.chat_id = chatId;
  if (modelId) body.model_id = modelId;

  // Si pas de token → invité : on injecte automatiquement le session_id
  const token = getToken();
  if (!token) {
    body.session_id = getOrCreateSessionId();
  }

  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const rawCards = data.cards ?? [];
  let cards: CardInfo[] = [];
  if (Array.isArray(rawCards) && rawCards.length > 0) {
    if (typeof rawCards[0] === "object" && "image_url" in rawCards[0]) {
      cards = rawCards as CardInfo[];
    }
  }

  return { answer: data.answer, cards, chat_id: data.chat_id ?? null };
}

// ── Upload ──────────────────────────────────────────────────────────

export interface UploadResponse {
  game_id: string;
  lang: string;
  filename: string;
  chunks_indexed: number;
  total_chunks: number;
}

export async function uploadRules(
  file: File,
  gameId: string,
  lang: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams({ game_id: gameId, lang });
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/upload?${params}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Upload error ${res.status}: ${detail}`);
  }
  return res.json();
}

// ── Games ───────────────────────────────────────────────────────────

export async function fetchGames(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/games`);
  if (!res.ok) throw new Error("Failed to fetch games");
  const data = await res.json();
  return data.games;
}

// ── Chats ───────────────────────────────────────────────────────────

export interface ChatSummary {
  id: string;
  user_id: string | null;
  game_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  cards?: CardInfo[];
  chunks_used?: number;
  created_at: string;
}

export interface ChatDetail {
  chat: ChatSummary;
  messages: ChatMessage[];
}

export async function fetchChats(limit = 50): Promise<ChatSummary[]> {
  const token = getToken();
  if (token) {
    const res = await fetch(`${API_BASE}/chats?limit=${limit}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch chats");
    return res.json();
  }

  // Invité : on ne charge que s'il y a déjà un session_id (évite une requête inutile)
  const sessionId = getSessionId();
  if (!sessionId) return [];

  const res = await fetch(
    `${API_BASE}/chats?limit=${limit}&session_id=${sessionId}`
  );
  if (!res.ok) throw new Error("Failed to fetch chats");
  return res.json();
}

export async function fetchChat(chatId: string): Promise<ChatDetail> {
  const token = getToken();
  if (token) {
    const res = await fetch(`${API_BASE}/chats/${chatId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch chat");
    return res.json();
  }

  const sessionId = getSessionId();
  const url = sessionId
    ? `${API_BASE}/chats/${chatId}?session_id=${sessionId}`
    : `${API_BASE}/chats/${chatId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch chat");
  return res.json();
}

export async function createChat(gameId: string, title?: string): Promise<ChatSummary> {
  const res = await fetch(`${API_BASE}/chats`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ game_id: gameId, title: title ?? "Nouveau chat" }),
  });
  if (!res.ok) throw new Error("Failed to create chat");
  return res.json();
}

export async function renameChat(chatId: string, title: string): Promise<ChatSummary> {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to rename chat");
  return res.json();
}

export async function deleteChat(chatId: string): Promise<void> {
  const token = getToken();
  if (token) {
    const res = await fetch(`${API_BASE}/chats/${chatId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete chat");
    return;
  }

  const sessionId = getSessionId();
  const url = sessionId
    ? `${API_BASE}/chats/${chatId}?session_id=${sessionId}`
    : `${API_BASE}/chats/${chatId}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete chat");
}

// ── Migration invité → compte ────────────────────────────────────────

export async function migrateGuestChats(sessionId: string): Promise<number> {
  const res = await fetch(`${API_BASE}/chats/migrate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return (data.migrated as number) ?? 0;
}