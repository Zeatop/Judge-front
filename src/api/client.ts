const API_BASE = "http://localhost:8000";

export type GameId = "mtg" | "Catan" | "Monopoly";

export interface AskRequest {
  question: string;
  game: GameId;
}

export interface AskResponse {
  answer: string;
}

export async function askQuestion(
  question: string,
  game: GameId
): Promise<string> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, game } satisfies AskRequest),
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  const data: AskResponse = await res.json();
  return data.answer;
}