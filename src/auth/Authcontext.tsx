import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clearSessionId, getSessionId, migrateGuestChats } from "../api/client";
import { posthog } from "../lib/posthog";

const API_BASE = import.meta.env.VITE_JUDGE_API_URL || "http://localhost:8000";

/**
 * Clé sessionStorage pour transporter l'ID du dernier chat guest migré
 * à travers la redirection full-page d'OAuth.
 *
 * Cycle de vie :
 *   1. La migration (dans fetchMe) pose la valeur après succès
 *   2. App.tsx la consomme via consumeMigratedChatId() juste après
 *      que `user` devienne truthy, pour appeler loadChat()
 *   3. consumeMigratedChatId() supprime la clé
 *
 * On utilise sessionStorage (pas localStorage) : limité à l'onglet courant
 * et effacé à la fermeture du navigateur — comportement idéal pour une
 * valeur qui ne sert qu'une seule fois juste après le login.
 */
const MIGRATED_CHAT_KEY = "judge_migrated_chat_id";

export interface User {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  providers: string[];
  is_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (provider: string) => void;
  logout: () => void;
  /**
   * ID du chat guest le plus récent qui vient d'être migré vers ce compte,
   * ou null si rien à restaurer.
   */
  migratedChatId: string | null;
  /**
   * Récupère migratedChatId et le consomme (clear + retour de la valeur).
   * À appeler exactement une fois, côté App, quand on veut restaurer
   * la conversation guest en cours.
   */
  consumeMigratedChatId: () => string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  migratedChatId: null,
  consumeMigratedChatId: () => null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // migratedChatId est hydraté depuis sessionStorage au montage, ce qui lui
  // permet de survivre à window.location.replace("/") après OAuth callback.
  const [migratedChatId, setMigratedChatIdState] = useState<string | null>(
    () => sessionStorage.getItem(MIGRATED_CHAT_KEY)
  );
  const setMigratedChatId = useCallback((id: string | null) => {
    setMigratedChatIdState(id);
    if (id) sessionStorage.setItem(MIGRATED_CHAT_KEY, id);
    else sessionStorage.removeItem(MIGRATED_CHAT_KEY);
  }, []);
  const consumeMigratedChatId = useCallback(() => {
    const id = migratedChatId;
    setMigratedChatId(null);
    return id;
  }, [migratedChatId, setMigratedChatId]);

  const initialized = useRef(false);

  /**
   * Appelle /auth/me avec credentials: "include".
   * Si user restauré ET un session_id guest traîne en localStorage,
   * migre les chats guest vers ce user et mémorise le plus récent
   * pour que App puisse le restaurer.
   */
  const fetchMe = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        return false;
      }

      const userData = (await res.json()) as User;
      setUser(userData);

      // Identify the user in PostHog
      posthog.identify(userData.id, {
        email: userData.email ?? undefined,
        name: userData.display_name ?? undefined,
        providers: userData.providers,
        is_admin: userData.is_admin,
      });

      // Migration opportuniste. On la tente à chaque fetchMe réussi avec
      // un session_id présent — que ce soit après OAuth callback ou
      // simplement parce qu'un user déjà inscrit revient depuis un état guest.
      const sessionId = getSessionId();
      if (sessionId) {
        try {
          const result = await migrateGuestChats(sessionId);
          if (result.migrated > 0) {
            console.log(`[Auth] ${result.migrated} chat(s) guest migré(s)`);
            posthog.capture("guest_chats_migrated", {
              migrated_count: result.migrated,
              latest_chat_id: result.latest_chat_id,
            });
            if (result.latest_chat_id) {
              setMigratedChatId(result.latest_chat_id);
            }
          }
          // Dans tous les cas on clear le session_id pour ne pas re-migrer
          // (les futurs /ask seront faits sous cookie user).
          clearSessionId();
        } catch (e) {
          console.warn("[Auth] Migration échouée:", e);
        }
      }
      return true;
    } catch {
      setUser(null);
      return false;
    }
  }, [setMigratedChatId]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      window.history.replaceState({}, "", window.location.pathname);
      setLoading(false);
      return;
    }

    // Le cookie est posé par le backend avant la redirection vers /auth/callback.
    // Un simple appel à /auth/me suffit pour restaurer la session.
    fetchMe().then(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback((provider: string) => {
    window.location.href = `${API_BASE}/auth/${provider}/login`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
      // Déconnexion locale même si la requête échoue
    }
    setUser(null);
    setMigratedChatId(null);
  }, [setMigratedChatId]);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, migratedChatId, consumeMigratedChatId }}
    >
      {children}
    </AuthContext.Provider>
  );
}