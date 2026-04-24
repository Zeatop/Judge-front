import { useEffect, useRef } from "react";
import { useAuth } from "./Authcontext";
import { getSessionId, clearSessionId, migrateGuestChats } from "../api/client";
import "./Authcallback.css";

/**
 * Page /auth/callback
 *
 * Le backend redirige ici SANS token dans l'URL — le cookie HttpOnly
 * est déjà posé par le backend sur la réponse de redirection.
 * AuthContext restaure l'utilisateur via /auth/me au montage.
 *
 * Ce composant :
 *   1. Attend que loading soit false
 *   2. Si user : migre les chats invités si un session_id existe → /
 *   3. Si error dans l'URL : affiche le message d'erreur
 *   4. Si !user : auth échouée → /
 */
export function AuthCallback() {
  const { user, loading } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  const migrated = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (error) return;

    if (user && !migrated.current) {
      migrated.current = true;
      const sessionId = getSessionId();
      if (sessionId) {
        migrateGuestChats(sessionId)
          .then((count) => {
            if (count > 0) console.log(`[Auth] ${count} chat(s) invité(s) migrés`);
            clearSessionId();
          })
          .catch(() => clearSessionId())
          .finally(() => window.location.replace("/"));
      } else {
        window.location.replace("/");
      }
      return;
    }

    if (!user) window.location.replace("/");
  }, [loading, error, user]);

  if (error) {
    return (
      <div className="auth-callback">
        <div className="auth-callback-card">
          <div className="auth-callback-icon">✕</div>
          <p className="auth-callback-title">Échec de la connexion</p>
          <p className="auth-callback-sub">
            Une erreur est survenue lors de l'authentification. Réessaie.
          </p>
          <a href="/" className="auth-callback-link">Retour à l'accueil</a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-callback">
      <div className="auth-callback-card">
        <div className="auth-callback-spinner" />
        <p className="auth-callback-title">Connexion en cours…</p>
      </div>
    </div>
  );
}