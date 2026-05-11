const API_BASE = import.meta.env.VITE_JUDGE_API_URL || "http://localhost:8000";
const SESSION_KEY = "judge_guest_session";
const GUEST_Q_COUNT_KEY = "judge_guest_q_count";

export type GameId = string;

// ── Helpers communs ──────────────────────────────────────────────────
// Plus de gestion de JWT côté client : le cookie HttpOnly est envoyé
// automatiquement par le navigateur sur toutes les requêtes
// credentials: "include". On garde uniquement les helpers guest.

function jsonHeaders(): Record<string, string> {
  return { "Content-Type": "application/json" };
}

// ── Session helpers (guest) ──────────────────────────────────────────

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

// ── Guest question counter (persisté pour résister au refresh) ────────

export function getGuestQuestionCount(): number {
  return parseInt(localStorage.getItem(GUEST_Q_COUNT_KEY) ?? "0", 10);
}

export function incrementGuestQuestionCount(): void {
  localStorage.setItem(GUEST_Q_COUNT_KEY, String(getGuestQuestionCount() + 1));
}

export function resetGuestQuestionCount(): void {
  localStorage.removeItem(GUEST_Q_COUNT_KEY);
}

// ── Card types ───────────────────────────────────────────────────────

export interface CardInfo {
  name: string;
  scryfall_url: string;
  image_url: string;
}

// ── Ask ──────────────────────────────────────────────────────────────

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

// ── Models ───────────────────────────────────────────────────────────

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
  const res = await fetch(`${API_BASE}/models`, { credentials: "include" });
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

  // Invité : pas de cookie → on envoie le session_id dans le body
  const sessionId = getSessionId();
  if (sessionId) body.session_id = sessionId;

  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: jsonHeaders(),
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);

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

// ── Ask stream ───────────────────────────────────────────────────────

export interface StreamDoneEvent {
  chat_id: string | null;
  cards: CardInfo[];
  chunks_used: number;
}

export async function askStream(
  question: string,
  game: GameId,
  chatId: string | undefined,
  modelId: string | undefined,
  onChunk: (text: string) => void,
  onDone: (result: StreamDoneEvent) => void,
  onError: (message: string) => void,
): Promise<void> {
  const body: AskRequest = { question, game_id: game };
  if (chatId) body.chat_id = chatId;
  if (modelId) body.model_id = modelId;
  const sessionId = getSessionId();
  if (sessionId) body.session_id = sessionId;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/ask/stream`, {
      method: "POST",
      headers: jsonHeaders(),
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch (e) {
    onError(e instanceof Error ? e.message : "Erreur réseau");
    return;
  }

  if (!response.ok) {
    try {
      const err = await response.json();
      onError(err.detail ?? `Erreur ${response.status}`);
    } catch {
      onError(`Erreur ${response.status}`);
    }
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const event = JSON.parse(line.slice(5).trim());
        if (event.type === "chunk") onChunk(event.text);
        else if (event.type === "done") onDone(event);
        else if (event.type === "error") onError(event.message);
      }
    }
  } catch (e) {
    onError(e instanceof Error ? e.message : "Erreur de lecture du stream");
  }
}

// ── Upload ───────────────────────────────────────────────────────────

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
  lang: string,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams({ game_id: gameId, lang });
  const res = await fetch(`${API_BASE}/upload?${params}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Upload error ${res.status}: ${detail}`);
  }
  return res.json();
}

// ── Games ────────────────────────────────────────────────────────────

export async function fetchGames(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/games`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch games");
  const data = await res.json();
  return data.games;
}

// ── Chats ────────────────────────────────────────────────────────────

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
  // Cookie envoyé automatiquement → 200 si connecté, 401 si invité
  const res = await fetch(`${API_BASE}/chats?limit=${limit}`, {
    credentials: "include",
  });
  if (res.ok) return res.json();

  // Fallback guest
  const sessionId = getSessionId();
  if (!sessionId) return [];
  const guestRes = await fetch(
    `${API_BASE}/chats?limit=${limit}&session_id=${sessionId}`,
    { credentials: "include" },
  );
  if (!guestRes.ok) return [];
  return guestRes.json();
}

export async function fetchChat(chatId: string): Promise<ChatDetail> {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    credentials: "include",
  });
  if (res.ok) return res.json();

  const sessionId = getSessionId();
  const url = sessionId
    ? `${API_BASE}/chats/${chatId}?session_id=${sessionId}`
    : `${API_BASE}/chats/${chatId}`;
  const guestRes = await fetch(url, { credentials: "include" });
  if (!guestRes.ok) throw new Error("Failed to fetch chat");
  return guestRes.json();
}

export async function createChat(gameId: string, title?: string): Promise<ChatSummary> {
  const res = await fetch(`${API_BASE}/chats`, {
    method: "POST",
    headers: jsonHeaders(),
    credentials: "include",
    body: JSON.stringify({ game_id: gameId, title: title ?? "Nouveau chat" }),
  });
  if (!res.ok) throw new Error("Failed to create chat");
  return res.json();
}

export async function renameChat(chatId: string, title: string): Promise<ChatSummary> {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    method: "PATCH",
    headers: jsonHeaders(),
    credentials: "include",
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to rename chat");
  return res.json();
}

export async function deleteChat(chatId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chats/${chatId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.ok) return;

  const sessionId = getSessionId();
  const url = sessionId
    ? `${API_BASE}/chats/${chatId}?session_id=${sessionId}`
    : `${API_BASE}/chats/${chatId}`;
  const guestRes = await fetch(url, { method: "DELETE", credentials: "include" });
  if (!guestRes.ok) throw new Error("Failed to delete chat");
}

// ── Migration invité → compte ─────────────────────────────────────────

export interface MigrateResponse {
  migrated: number;
  chats: ChatSummary[];
  latest_chat_id: string | null;
}

/**
 * Migre les chats guest (identifiés par session_id) vers l'utilisateur
 * actuellement authentifié (cookie envoyé automatiquement).
 *
 * Retourne les chats migrés ainsi que l'ID du plus récent — le frontend
 * peut alors restaurer automatiquement la conversation en cours.
 */
export async function migrateGuestChats(sessionId: string): Promise<MigrateResponse> {
  const EMPTY: MigrateResponse = { migrated: 0, chats: [], latest_chat_id: null };
  try {
    const res = await fetch(`${API_BASE}/chats/migrate`, {
      method: "POST",
      headers: jsonHeaders(),
      credentials: "include",
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (!res.ok) return EMPTY;
    const data = await res.json();
    return {
      migrated: (data.migrated as number) ?? 0,
      chats: (data.chats as ChatSummary[]) ?? [],
      latest_chat_id: (data.latest_chat_id as string | null) ?? null,
    };
  } catch {
    return EMPTY;
  }
}