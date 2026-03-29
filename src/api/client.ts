const API_BASE = "http://localhost:8000";

export type GameId = string;

export interface CardInfo {
  name: string;
  scryfall_url: string;
  image_url: string;
}

export interface AskRequest {
  question: string;
  game_id: GameId;
}

export interface UploadResponse {
  game_id: string;
  lang: string;
  filename: string;
  chunks_indexed: number;
  total_chunks: number;
}

export async function askQuestion(
  question: string,
  game: GameId
): Promise<{ answer: string; cards: CardInfo[] }> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, game_id: game } satisfies AskRequest),
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();

  const rawCards = data.cards ?? data.cards_fetched ?? [];

  let cards: CardInfo[] = [];
  if (Array.isArray(rawCards) && rawCards.length > 0) {
    if (typeof rawCards[0] === "object" && "image_url" in rawCards[0]) {
      cards = rawCards as CardInfo[];
    }
  }

  return { answer: data.answer, cards };
}

export async function uploadRules(
  file: File,
  gameId: string,
  lang: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams({ game_id: gameId, lang });

  const res = await fetch(`${API_BASE}/upload?${params}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Upload error ${res.status}: ${detail}`);
  }

  return res.json();
}

export async function fetchGames(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/games`);
  if (!res.ok) throw new Error("Failed to fetch games");
  const data = await res.json();
  return data.games;
}