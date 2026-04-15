import { useState } from "react";
import { useAuth } from "./Authcontext";
import "./Loginpage.css";

const PROVIDERS = [
  {
    id: "google",
    label: "Google",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
    ),
  },
  // {
  //   id: "facebook",
  //   label: "Facebook",
  //   icon: (
  //     <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
  //       <path d="M18 9a9 9 0 10-10.406 8.89v-6.29H5.309V9h2.285V7.017c0-2.255 1.343-3.501 3.4-3.501.984 0 2.014.176 2.014.176v2.215h-1.135c-1.118 0-1.467.694-1.467 1.406V9h2.496l-.399 2.6h-2.097v6.29A9.003 9.003 0 0018 9z" fill="#1877F2"/>
  //       <path d="M12.497 11.6L12.896 9h-2.496V7.313c0-.712.349-1.406 1.467-1.406h1.135V3.692s-1.03-.176-2.014-.176c-2.057 0-3.4 1.246-3.4 3.501V9H5.309v2.6h2.285v6.29a9.075 9.075 0 002.812 0v-6.29h2.091z" fill="#fff"/>
  //     </svg>
  //   ),
  // },
  // {
  //   id: "apple",
  //   label: "Apple",
  //   icon: (
  //     <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
  //       <path d="M14.94 9.63c-.023-2.44 1.993-3.613 2.085-3.672-1.135-1.66-2.903-1.887-3.533-1.913-1.504-.152-2.935.885-3.698.885-.763 0-1.942-.863-3.192-.84-1.643.024-3.158.955-4.004 2.427-1.707 2.962-.437 7.35 1.227 9.756.813 1.175 1.782 2.495 3.055 2.449 1.225-.049 1.689-.793 3.171-.793 1.483 0 1.899.793 3.195.768 1.319-.024 2.154-1.198 2.963-2.376.934-1.363 1.319-2.682 1.342-2.75-.029-.013-2.575-.988-2.6-3.92l-.01-.02zM12.44 2.81c.676-.819 1.132-1.957 1.008-3.09-.975.04-2.155.649-2.854 1.469-.627.726-1.176 1.886-1.029 2.998 1.088.084 2.199-.553 2.875-1.377z" fill="currentColor"/>
  //     </svg>
  //   ),
  // },
  {
    id: "discord",
    label: "Discord",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M15.248 3.38A14.21 14.21 0 0011.74 2.25a.053.053 0 00-.057.027c-.151.27-.32.622-.437.898a13.13 13.13 0 00-3.935 0 9.076 9.076 0 00-.444-.898.055.055 0 00-.056-.027 14.176 14.176 0 00-3.509 1.13.05.05 0 00-.023.02C1.078 6.29.372 9.087.725 11.842a.059.059 0 00.022.04 14.28 14.28 0 004.3 2.174.056.056 0 00.06-.02c.332-.452.627-.929.881-1.429a.055.055 0 00-.03-.076 9.407 9.407 0 01-1.343-.64.055.055 0 01-.005-.092c.09-.068.18-.138.266-.209a.054.054 0 01.056-.008c2.817 1.286 5.867 1.286 8.65 0a.054.054 0 01.057.007c.087.071.177.142.267.21a.055.055 0 01-.004.092 8.83 8.83 0 01-1.344.64.055.055 0 00-.029.076c.258.5.554.976.88 1.428a.054.054 0 00.06.02 14.237 14.237 0 004.305-2.174.055.055 0 00.022-.038c.422-3.194-.706-5.966-2.987-8.444a.044.044 0 00-.022-.02zM6.268 10.17c-.73 0-1.332-.671-1.332-1.496 0-.824.59-1.496 1.332-1.496.748 0 1.345.678 1.332 1.496 0 .825-.59 1.496-1.332 1.496zm4.921 0c-.73 0-1.332-.671-1.332-1.496 0-.824.59-1.496 1.332-1.496.748 0 1.345.678 1.332 1.496 0 .825-.584 1.496-1.332 1.496z" fill="#5865F2"/>
      </svg>
    ),
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleLogin = (providerId: string) => {
    setLoadingProvider(providerId);
    login(providerId);
  };

  return (
    <div className="login-page">
      {/* Ambient glow */}
      <div className="login-glow login-glow-1" />
      <div className="login-glow login-glow-2" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <h1 className="login-logo-text">Judge</h1>
          <span className="login-logo-badge">AI</span>
        </div>

        <p className="login-subtitle">
          Ton assistant de règles de jeux de société
        </p>

        {/* Divider */}
        <div className="login-divider">
          <span className="login-divider-line" />
          <span className="login-divider-text">Se connecter avec</span>
          <span className="login-divider-line" />
        </div>

        {/* OAuth buttons */}
        <div className="login-providers">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              className={`login-provider-btn ${loadingProvider === p.id ? "is-loading" : ""}`}
              onClick={() => handleLogin(p.id)}
              disabled={loadingProvider !== null}
            >
              <span className="login-provider-icon">{p.icon}</span>
              <span className="login-provider-label">
                {loadingProvider === p.id ? "Redirection…" : p.label}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="login-footer">
          En continuant, tu acceptes les{" "}
          <a href="#" className="login-footer-link">conditions d'utilisation</a>
        </p>
      </div>
    </div>
  );
}