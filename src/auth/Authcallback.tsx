import { useEffect } from "react";
import { useAuth } from "./Authcontext";
import "./Authcallback.css";

/**
 * Page /auth/callback
 *
 * Le backend redirige ici SANS token dans l'URL — le cookie HttpOnly
 * est déjà posé par le backend sur la réponse de redirection.
 *
 * La séquence est :
 *   1. AuthProvider monte ce composant → fetchMe() → user restauré
 *   2. Dans fetchMe, si un session_id guest existe → migrateGuestChats
 *      et migratedChatId stocké en sessionStorage
 *   3. Ce composant redirige vers /
 *   4. L'app se remonte à / ; AuthProvider.fetchMe re-tourne mais sans
 *      session_id (déjà cleared), donc no-op côté migration.
 *   5. App.tsx consomme migratedChatId (hydraté depuis sessionStorage)
 *      pour recharger le chat guest, maintenant rattaché au user.
 */
export function AuthCallback() {
  const { user, loading } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  useEffect(() => {
    if (loading) return;
    if (error) return;

    // Peu importe le résultat de fetchMe : si l'auth a réussi le cookie
    // est posé et on a déjà migré les chats. Si elle a échoué (user null),
    // on repart vers l'accueil. Dans les deux cas : redirection propre.
    // Note : l'utilisateur est bien `user` ci-dessous si la session est
    // active, mais on ne s'en sert pas ici — c'est App qui en a besoin.
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