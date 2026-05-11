import "./EmptyState.css";

const SUGGESTIONS: Record<string, string[]> = {
  mtg: [
    "Comment fonctionnent [[Sigarda's aid]] ?",
    "Les compteurs boucliers protègent-ils du sacrifice ?",
    "Que se passe-t-il si j'ai plus de 7 cartes en main à la fin de mon tour ?",
  ],
  Catan: [
    "Peut-on acheter une carte développement et l'utiliser dans le même tour ?",
    "Le voleur peut-il être placé sur une tuile désert ?",
    "Faut-il construire dans l'ordre (routes → colonies → villes) ?",
  ],
  Monopoly: [
    "Faut-il posséder tous les terrains d'une couleur pour commencer à construire ?",
    "Que se passe-t-il si on ne peut pas payer un loyer ?",
    "Peut-on vendre des maisons à la banque en cours de partie ?",
  ],
};

const DEFAULT_SUGGESTIONS = [
  "Comment se déroule un tour de jeu ?",
  "Que se passe-t-il en cas de règle contestée entre joueurs ?",
  "Quelles sont les conditions de victoire ?",
];

interface Props {
  gameId: string;
  gameName: string;
  onSuggest: (question: string) => void;
}

export function EmptyState({ gameId, gameName, onSuggest }: Props) {
  const suggestions = SUGGESTIONS[gameId] ?? DEFAULT_SUGGESTIONS;

  return (
    <div className="empty-state">
      <div className="empty-header">
        <img src="/Judge.png" alt="Judge" className="empty-logo" />
        <h2 className="empty-title">Judge</h2>
        <p className="empty-sub">
        <span className="empty-game">{gameName}</span>
        </p>
      </div>
      <ul className="empty-suggestions" role="list">
        {suggestions.map((q) => (
          <li key={q}>
            <button
              className="suggestion-chip"
              onClick={() => onSuggest(q)}
              type="button"
            >
              <svg
                className="suggestion-icon"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{q}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
