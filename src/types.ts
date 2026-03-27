import type { GameId } from "./api/client";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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