const API_BASE = import.meta.env.JUDGE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "judge_ai_token";

export type GameId = string;

// ── Helpers ─────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
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
}

export interface AskResponse {
  answer: string;
  cards: CardInfo[];
  chat_id: string | null;
}

export async function askQuestion(
  question: string,
  game: GameId,
  chatId?: string
): Promise<AskResponse> {
  const body: AskRequest = { question, game_id: game };
  if (chatId) body.chat_id = chatId;

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
  user_id: string;
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
  const res = await fetch(`${API_BASE}/chats?limit=${limit}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch chats");
  return res.json();
}

export async function fetchChat(chatId: string): Promise<ChatDetail> {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    headers: authHeaders(),
  });
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
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete chat");
}