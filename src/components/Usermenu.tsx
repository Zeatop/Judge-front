import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../auth";
import "./Usermenu.css";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  if (!user) return null;

  const initials =
    user.display_name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  const openMenu = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      const target = e.target as Node;
      const menu = document.getElementById("user-menu-dropdown");
      if (!btnRef.current?.contains(target) && !menu?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        className={`um-trigger ${open ? "open" : ""}`}
        onClick={openMenu}
        aria-label="Menu utilisateur"
      >
        {user.avatar_url ? (
          <img className="um-avatar-img" src={user.avatar_url} alt="" />
        ) : (
          <span className="um-avatar-initials">{initials}</span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            id="user-menu-dropdown"
            className="um-dropdown"
            style={{ position: "fixed", top: pos.top, right: pos.right }}
          >
            {/* User info */}
            <div className="um-info">
              <p className="um-name">{user.display_name ?? "Utilisateur"}</p>
              {user.email && <p className="um-email">{user.email}</p>}
            </div>

            <div className="um-divider" />

            {/* Providers */}
            <div className="um-section-label">Comptes liés</div>
            <div className="um-providers">
              {user.providers.map((p) => (
                <span key={p} className="um-provider-tag">
                  {p}
                </span>
              ))}
            </div>

            <div className="um-divider" />

            {/* Logout */}
            <button
              className="um-logout"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Se déconnecter
            </button>
          </div>,
          document.body
        )}
    </>
  );
}