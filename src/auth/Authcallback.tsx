import { useEffect, useRef } from "react";
import { useAuth } from "./Authcontext";
import { getSessionId, clearSessionId, migrateGuestChats } from "../api/client";
import "./Authcallback.css";

/**
 * Page /auth/callback
 * Le backend redirige ici avec ?token=xxx&provider=yyy
 * ou ?error=auth_failed&provider=yyy
 *
 * Après authentification réussie :
 *   1. Migre les chats invités (session_id) vers le nouveau compte
 *   2. Nettoie le session_id du localStorage
 *   3. Redirige vers /
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
        // Migrer les chats invités puis rediriger
        migrateGuestChats(sessionId)
          .then((count) => {
            if (count > 0) {
              console.log(`[Auth] ${count} chat(s) invité(s) migrés`);
            }
            clearSessionId();
          })
          .catch(() => {
            // En cas d'échec de migration, on nettoie quand même le session_id
            // pour éviter des tentatives infinies
            clearSessionId();
          })
          .finally(() => {
            window.location.replace("/");
          });
      } else {
        window.location.replace("/");
      }
      return;
    }

    if (!user && !loading) {
      window.location.replace("/");
    }
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
          <a href="/" className="auth-callback-link">
            Retour à l'accueil
          </a>
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