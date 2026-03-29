import type { GameId, CardInfo } from "./api/client";

export type { CardInfo };

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  cards?: CardInfo[];
}

export interface Game {
  id: GameId;
  label: string;
  placeholder: string;
}

export const GAMES: Game[] = [
  {
    id: "mtg",
    label: "Magic: The Gathering",
    placeholder: 'Ex: "[[Lightning Bolt]] peut-il cibler un joueur en réponse à un sort ?"',
  },
  {
    id: "Catan",
    label: "Catan",
    placeholder: 'Ex: "Peut-on construire une route sur le port d\'un adversaire ?"',
  },
  {
    id: "Monopoly",
    label: "Monopoly",
    placeholder: 'Ex: "Que se passe-t-il si on tombe sur une propriété hypothéquée ?"',
  },
];

/** Ajoute un jeu dynamiquement après upload réussi. */
export function addGame(id: string, label: string): Game {
  const existing = GAMES.find(g => g.id === id);
  if (existing) return existing;

  const game: Game = {
    id,
    label,
    placeholder: `Pose une question sur les règles de ${label}…`,
  };
  GAMES.push(game);
  return game;
}