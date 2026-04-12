import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const API_BASE = import.meta.env.JUDGE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "judge_ai_token";

export interface User {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  providers: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (provider: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [loading, setLoading] = useState(true);

  // Fetch user profile from /auth/me
  const fetchMe = useCallback(async (jwt: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) {
        const data: User = await res.json();
        setUser(data);
        return true;
      }
      // Token invalid — clear it
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      return false;
    } catch {
      return false;
    }
  }, []);

  // On mount: check for token in URL (OAuth callback) or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    const error = params.get("error");

    if (error) {
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      setLoading(false);
      return;
    }

    if (urlToken) {
      localStorage.setItem(TOKEN_KEY, urlToken);
      setToken(urlToken);
      // Clean URL
      window.history.replaceState({}, "", "/");
      fetchMe(urlToken).then(() => setLoading(false));
      return;
    }

    if (token) {
      fetchMe(token).then(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback((provider: string) => {
    window.location.href = `${API_BASE}/auth/${provider}/login`;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}