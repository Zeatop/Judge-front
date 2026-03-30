import { useEffect } from "react";
import { useAuth } from "./Authcontext";
import "./Authcallback.css";

/**
 * Page /auth/callback
 * Le backend redirige ici avec ?token=xxx&provider=yyy
 * ou ?error=auth_failed&provider=yyy
 * AuthContext gère la récupération du token depuis l'URL.
 * Ce composant affiche un loader pendant le traitement.
 */
export function AuthCallback() {
  const { loading } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  useEffect(() => {
    // Si pas d'erreur et pas de loading, redirect vers /
    if (!loading && !error) {
      window.location.href = "/";
    }
  }, [loading, error]);

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