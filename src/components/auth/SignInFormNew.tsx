import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";

export default function SignInFormNew() {
  const navigate = useNavigate();
  const { login, user: authUser, token, isLoading: authLoading, isInitialized } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "", form: "" });

  useEffect(() => {
    if (token && authUser && isInitialized) {
      navigate("/");
    }
  }, [token, authUser, isInitialized, navigate]);

  const validate = () => {
    const nextErrors = { email: "", password: "", form: "" };
    let isValid = true;

    if (!email.trim()) {
      nextErrors.email = "Email is required";
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = "Invalid email format";
      isValid = false;
    }

    if (!password) {
      nextErrors.password = "Password is required";
      isValid = false;
    }

    setErrors(nextErrors);
    return isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({ email: "", password: "", form: "" });

    try {
      const response = await authService.loginUser({ email: email.trim(), password });
      const { user: userData, token: accessToken, role, permissions } = response;

      const resolvedRole = (
        typeof userData.role === "string"
          ? userData.role
          : userData.role?.name || role?.name || "owner"
      )?.toLowerCase() || "owner";

      login(accessToken, null, resolvedRole, permissions, userData);
      navigate("/");
    } catch (error: any) {
      setEmail("");
      setPassword("");

      let message = "Something went wrong. Please try again.";
      if (error?.response) {
        const data = error.response.data;
        message = data?.message || data?.error || data?.errors?.[0]?.message || message;
      } else if (error?.message) {
        message = error.message;
      }

      setErrors((prev) => ({ ...prev, form: message }));
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !isInitialized) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          <p className="mt-2 text-sm text-slate-500">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue where you left off"
      sideHeading="Organize your day with one command center"
      sideDescription="Manage goals, finances, tasks, and notes in one place with a faster and clearer workflow."
      quote="You do not rise to the level of your goals. You fall to the level of your systems."
      quoteAuthor="James Clear"
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
            }}
            placeholder="you@example.com"
            disabled={isLoading}
            className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-200 ${
              errors.email ? "border-red-400 bg-red-50" : "border-slate-200"
            }`}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
              }}
              placeholder="Your password"
              disabled={isLoading}
              className={`w-full rounded-xl border bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-200 ${
                errors.password ? "border-red-400 bg-red-50" : "border-slate-200"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
        </div>

        {errors.form && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errors.form}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline">
          Create one
        </Link>
      </div>
    </AuthShell>
  );
}
