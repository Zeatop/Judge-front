import { useEffect } from "react";
import { useAuth } from "./Authcontext";
import "./Authcallback.css";

/**
 * Page /auth/callback
 * Le backend redirige ici avec ?token=xxx&provider=yyy
 * ou ?error=auth_failed&provider=yyy
 *
 * AuthContext gère la récupération du token depuis l'URL.
 * Ce composant attend que l'utilisateur soit chargé (user != null)
 * avant de rediriger vers /, pour éviter la double connexion.
 */
export function AuthCallback() {
  const { user, loading } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  useEffect(() => {
    // Tant qu'on charge, on ne fait rien
    if (loading) return;

    // En cas d'erreur OAuth, on reste sur la page pour afficher le message
    if (error) return;

    // Si l'auth a réussi (user chargé), on redirige proprement vers /
    if (user) {
      // replace() plutôt que href = "/" pour éviter que /auth/callback
      // reste dans l'historique du navigateur.
      window.location.replace("/");
      return;
    }

    // Pas d'erreur, pas de loading, pas de user : l'auth a échoué silencieusement
    // (ex: token invalide). On renvoie vers la page de login.
    window.location.replace("/");
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