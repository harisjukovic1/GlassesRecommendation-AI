import { useState } from "react";
import { X } from "lucide-react";

function AuthModal({ open, onClose, login, register }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      if (!email || !password) {
        throw new Error("Enter both email and password.");
      }

      if (mode === "login") {
        await login(email, password);

        setEmail("");
        setPassword("");
        setMessage("");
        onClose();
      } else {
        await register(email, password);

        setMessage(
          "Account created. If email confirmation is enabled in Supabase, check your inbox."
        );
      }
    } catch (error) {
      setMessage(error.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-modal">
      <div className="auth-card">
        <button className="icon-btn auth-close" onClick={onClose}>
          <X size={20} />
        </button>

        <p className="eyebrow">
          {mode === "login" ? "Welcome back" : "Create account"}
        </p>

        <h2>{mode === "login" ? "Login" : "Register"}</h2>

        <p className="auth-subtitle">
          Login lets you save favorite frames, store scan history, and give
          feedback on recommendations.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button className="primary-btn" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Register"}
          </button>
        </form>

        {message && <div className="auth-message">{message}</div>}

        <button
          className="switch-auth"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setMessage("");
          }}
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

export default AuthModal;