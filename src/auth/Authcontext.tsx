import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

const API_BASE = import.meta.env.VITE_JUDGE_API_URL || "http://localhost:8000";

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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  /**
   * Appelle /auth/me avec credentials: "include".
   * Le cookie HttpOnly est envoyé automatiquement par le navigateur.
   */
  const fetchMe = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      if (res.ok) {
        setUser(await res.json());
        return true;
      }
      setUser(null);
      return false;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

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
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}