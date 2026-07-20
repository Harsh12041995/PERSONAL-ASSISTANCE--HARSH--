import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import AuthCosmicShell, { FONT, authLabel, authErr, authBox, authPrimaryBtn, authGhostBtn } from "./AuthCosmicShell";

interface SignUpFormNewProps {
  onSignUp?: (user: unknown) => void;
}

const inputEl: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", outline: "none", background: "transparent", padding: "0 16px", fontSize: 15, color: "#0f1424", fontWeight: 500, fontFamily: FONT };

export default function SignUpFormNew({ onSignUp }: SignUpFormNewProps) {
  const navigate = useNavigate();
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [signupStep, setSignupStep] = useState(0);
  const [focused, setFocused] = useState<string | null>(null);
  const [signupData, setSignupData] = useState({
    firstName: "", lastName: "", phone: "", email: "", department: "", purpose: "", password: "", confirmPassword: "",
  });
  const [signupStatus, setSignupStatus] = useState<{ message: string; type: "success" | "error" | "" }>({ message: "", type: "" });
  const [signupFieldErrors, setSignupFieldErrors] = useState<Record<string, string>>({});

  const totalSignupSteps = 3;
  const fieldToStep: Record<string, number> = { firstName: 0, lastName: 0, email: 0, phone: 1, department: 1, purpose: 1, password: 2, confirmPassword: 2 };
  const normalizeFieldName = (field: string) => field.replace(/_([a-z])/g, (_, c) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, "");
  const setFieldError = (field: string, message: string) => setSignupFieldErrors((prev) => ({ ...prev, [field]: message }));
  const clearFieldError = (field: string) => setSignupFieldErrors((prev) => { if (!prev[field]) return prev; const n = { ...prev }; delete n[field]; return n; });
  const clearAllFieldErrors = () => setSignupFieldErrors({});

  const validateSignupStep = (step: number) => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!signupData.firstName.trim()) e.firstName = "First name is required.";
      if (!signupData.lastName.trim()) e.lastName = "Last name is required.";
      if (!signupData.email.trim()) e.email = "Email is required.";
      else if (!/^\S+@\S+\.\S+$/.test(signupData.email.trim())) e.email = "Please enter a valid email address.";
    }
    if (step === 1) {
      if (!signupData.phone.trim()) e.phone = "Phone number is required.";
      else if (!/^\d{10}$/.test(signupData.phone.trim())) e.phone = "Phone number must be exactly 10 digits.";
      if (!signupData.department.trim()) e.department = "Department is required.";
      if (!signupData.purpose.trim()) e.purpose = "Purpose is required.";
    }
    if (step === 2) {
      if (!signupData.password) e.password = "Password is required.";
      else if (signupData.password.length < 8) e.password = "Password must be at least 8 characters.";
      else if (!signupData.password.match(/\d/) || !signupData.password.match(/[a-zA-Z]/)) e.password = "Password must contain at least one letter and one number.";
      if (!signupData.confirmPassword) e.confirmPassword = "Please confirm your password.";
      else if (signupData.password !== signupData.confirmPassword) e.confirmPassword = "Passwords do not match.";
    }
    if (Object.keys(e).length > 0) {
      setSignupStatus({ type: "error", message: "Please correct the highlighted fields before continuing." });
      setSignupFieldErrors((prev) => ({ ...prev, ...e }));
      return false;
    }
    return true;
  };

  const handleSignupNext = () => { if (!validateSignupStep(signupStep)) return; setSignupStatus({ message: "", type: "" }); setSignupStep((p) => Math.min(p + 1, totalSignupSteps - 1)); };
  const handleSignupBack = () => { setSignupStatus({ message: "", type: "" }); setSignupStep((p) => Math.max(p - 1, 0)); };

  const generateUsername = (data: typeof signupData) => {
    const s = (v: string) => v.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15);
    const emailPrefix = data.email ? s(data.email.split("@")[0]) : "";
    const nameBase = s(`${data.firstName}${data.lastName}`) || s(data.firstName) || "";
    let base = emailPrefix || nameBase || "user";
    if (base.length < 3) base = `user${Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(0, 3)}`;
    const suffix = Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(0, 4);
    return `${base}_${suffix}`.replace(/[^a-z0-9_]/g, "").slice(0, 20);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupStatus({ message: "", type: "" });
    clearAllFieldErrors();
    if (!validateSignupStep(0) || !validateSignupStep(1) || !validateSignupStep(2)) return;
    setIsFormLoading(true);
    try {
      const registrationData = {
        first_name: signupData.firstName.trim(), last_name: signupData.lastName.trim(), email: signupData.email.trim(),
        username: generateUsername(signupData), password: signupData.password, phone: signupData.phone.trim(),
        department: signupData.department.trim(), purpose: signupData.purpose.trim(),
      };
      const response = await authService.registerUser(registrationData);
      setSignupData({ firstName: "", lastName: "", phone: "", email: "", department: "", purpose: "", password: "", confirmPassword: "" });
      setSignupStatus({ type: "success", message: response.message || "Account created successfully! Please check your email for next steps." });
      if (onSignUp) onSignUp(response);
      setTimeout(() => navigate("/signin"), 1800);
    } catch (error: unknown) {
      let message = "Registration failed. Please try again.";
      const err = error as { response?: { status?: number; data?: { message?: string; error?: string; validationErrors?: { field?: string; message?: string }[] } }; message?: string };
      const status = err?.response?.status;
      const responseData = err?.response?.data;
      if (status === 422 && responseData?.validationErrors) {
        const fieldErrors: Record<string, string> = {};
        let firstErrorStep = signupStep;
        responseData.validationErrors.forEach((v) => {
          if (v.field && v.message) {
            const nf = normalizeFieldName(v.field);
            if (!(nf in fieldToStep)) return;
            fieldErrors[nf] = v.message;
            if (fieldToStep[nf] < firstErrorStep) firstErrorStep = fieldToStep[nf];
          }
        });
        if (Object.keys(fieldErrors).length > 0) {
          setSignupFieldErrors((prev) => ({ ...prev, ...fieldErrors }));
          message = responseData.validationErrors[0]?.message || "Please correct the highlighted fields.";
          setSignupStep(firstErrorStep);
        }
      } else if (status === 409) {
        message = responseData?.message || responseData?.error || "Account already exists. Try signing in instead.";
        setFieldError("email", message); setSignupStep(0);
      } else if (responseData?.message) message = responseData.message;
      else if (err?.message) message = err.message;
      setSignupStatus({ type: "error", message });
    } finally { setIsFormLoading(false); }
  };

  // Glass field helper.
  const field = (key: keyof typeof signupData, label: string, opts: { type?: string; placeholder?: string; autoComplete?: string } = {}): ReactNode => (
    <div>
      <label style={authLabel}>{label}</label>
      <div style={authBox(focused === key, "#6ea3f7", !!signupFieldErrors[key])}>
        <input
          type={opts.type || "text"} value={signupData[key]} placeholder={opts.placeholder} autoComplete={opts.autoComplete}
          onFocus={() => setFocused(key)} onBlur={() => setFocused(null)}
          onChange={(e) => { setSignupData({ ...signupData, [key]: e.target.value }); clearFieldError(key); }}
          style={inputEl}
        />
      </div>
      {signupFieldErrors[key] && <p style={authErr}>{signupFieldErrors[key]}</p>}
    </div>
  );

  return (
    <AuthCosmicShell cardWidth={470}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 17, background: "linear-gradient(135deg,#0fce8e,#2f9df5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 22, boxShadow: "0 16px 34px rgba(24,165,190,0.55)", animation: "li-coinFloat 5.5s ease-in-out infinite" }}>PA</div>
        <h2 style={{ margin: "16px 0 0", fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.2, textShadow: "0 2px 20px rgba(0,0,0,0.45)", background: "linear-gradient(90deg,#ffffff,#d9d2ff,#ffffff)", backgroundSize: "200% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", animation: "li-shimmer 7s linear infinite" }}>Create your account</h2>
        <p style={{ margin: "5px 0 0", fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>Set up your workspace in three quick steps</p>
      </div>

      {/* Step dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "20px 0 4px" }}>
        {[0, 1, 2].map((s) => (
          <div key={s} style={{ height: 8, borderRadius: 999, transition: "all 0.3s ease", width: signupStep === s ? 34 : 8, background: signupStep === s ? "linear-gradient(90deg,#0fce8e,#2f9df5)" : signupStep > s ? "rgba(15,206,142,0.8)" : "rgba(255,255,255,0.25)" }} />
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (signupStep === totalSignupSteps - 1) handleSignUp(e); else handleSignupNext(); }}>
        {signupStep === 0 && (
          <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {field("firstName", "FIRST NAME", { placeholder: "First name" })}
              {field("lastName", "LAST NAME", { placeholder: "Last name" })}
            </div>
            {field("email", "EMAIL", { type: "email", placeholder: "you@example.com", autoComplete: "email" })}
          </div>
        )}

        {signupStep === 1 && (
          <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {field("phone", "PHONE", { type: "tel", placeholder: "10-digit phone" })}
              {field("department", "DEPARTMENT", { placeholder: "Department" })}
            </div>
            <div>
              <label style={authLabel}>PURPOSE</label>
              <textarea
                value={signupData.purpose} rows={3} placeholder="What are you planning to manage here?"
                onFocus={() => setFocused("purpose")} onBlur={() => setFocused(null)}
                onChange={(e) => { setSignupData({ ...signupData, purpose: e.target.value }); clearFieldError("purpose"); }}
                style={{ width: "100%", marginTop: 5, minHeight: 84, borderRadius: 13, border: `1.5px solid ${signupFieldErrors.purpose ? "#ff8a8a" : focused === "purpose" ? "#6ea3f7" : "rgba(255,255,255,0.7)"}`, background: "rgba(255,255,255,0.55)", padding: "12px 16px", fontSize: 15, color: "#0f1424", fontFamily: FONT, resize: "none", outline: "none", boxSizing: "border-box" }}
              />
              {signupFieldErrors.purpose && <p style={authErr}>{signupFieldErrors.purpose}</p>}
            </div>
          </div>
        )}

        {signupStep === 2 && (
          <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
            {field("password", "PASSWORD", { type: "password", placeholder: "Create password", autoComplete: "new-password" })}
            {field("confirmPassword", "CONFIRM PASSWORD", { type: "password", placeholder: "Confirm password", autoComplete: "new-password" })}
            <div style={{ borderRadius: 12, border: "1px solid rgba(15,206,142,0.4)", background: "rgba(15,206,142,0.14)", padding: "10px 14px", fontSize: 12.5, color: "#c7f9e9" }}>
              Password must be at least 8 characters and include letters and numbers.
            </div>
          </div>
        )}

        {signupStatus.message && (
          <div style={{ marginTop: 14, borderRadius: 12, padding: "9px 14px", fontSize: 13, border: `1px solid ${signupStatus.type === "success" ? "rgba(52,211,153,0.5)" : "rgba(255,120,120,0.5)"}`, background: signupStatus.type === "success" ? "rgba(16,120,80,0.35)" : "rgba(180,40,40,0.35)", color: signupStatus.type === "success" ? "#c7f9e9" : "#ffe3e3" }}>
            {signupStatus.message}
          </div>
        )}

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          {signupStep < totalSignupSteps - 1 ? (
            <button type="button" onClick={handleSignupNext} disabled={isFormLoading} style={authPrimaryBtn}>
              <span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 70, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)", animation: "li-sweep 3.4s ease-in-out infinite", pointerEvents: "none" }} />
              Continue
            </button>
          ) : (
            <button type="submit" disabled={isFormLoading} style={{ ...authPrimaryBtn, opacity: isFormLoading ? 0.9 : 1 }}>
              {isFormLoading ? "Creating account…" : "Complete Registration"}
            </button>
          )}
          {signupStep > 0 && <button type="button" onClick={handleSignupBack} disabled={isFormLoading} style={authGhostBtn}>Back</button>}
        </div>
      </form>

      <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>
        Already have an account? <button type="button" onClick={() => navigate("/signin")} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#7dd3fc", fontFamily: FONT, fontSize: 14 }}>Sign in</button>
      </p>
    </AuthCosmicShell>
  );
}
