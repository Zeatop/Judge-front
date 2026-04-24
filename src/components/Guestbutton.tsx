import "./Guestbutton.css";

interface Props {
  onLogin: () => void;
}

export function GuestButton({ onLogin }: Props) {
  return (
    <button className="guest-btn" onClick={onLogin} title="Se connecter">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <span>Se connecter</span>
    </button>
  );
}