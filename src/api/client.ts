const API_BASE = "http://localhost:8000";

export type GameId = "mtg" | "Catan" | "Monopoly";

export interface CardInfo {
  name: string;
  scryfall_url: string;
  image_url: string;
}

export interface AskRequest {
  question: string;
  game_id: GameId;
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

  // Le backend retourne "cards" (objets enrichis avec image_url)
  // ou "cards_fetched" (noms strings selon version) — on gère les deux
  const rawCards = data.cards ?? data.cards_fetched ?? [];

  let cards: CardInfo[] = [];
  if (Array.isArray(rawCards) && rawCards.length > 0) {
    if (typeof rawCards[0] === "object" && "image_url" in rawCards[0]) {
      // Objets déjà enrichis par le backend
      cards = rawCards as CardInfo[];
    }
    // Si c'est des strings, on ne fait pas de fetch Scryfall côté frontend
    // pour éviter les problèmes CORS — les cartes seront juste sans preview
  }

  return { answer: data.answer, cards };
}