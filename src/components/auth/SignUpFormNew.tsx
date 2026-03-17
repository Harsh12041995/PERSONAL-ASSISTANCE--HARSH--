import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import { authService } from "../../services/authService";

interface SignUpFormNewProps {
  onSignUp?: (user: any) => void;
}

export default function SignUpFormNew({ onSignUp }: SignUpFormNewProps) {
  const navigate = useNavigate();
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [signupStep, setSignupStep] = useState(0);
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    department: "",
    purpose: "",
    password: "",
    confirmPassword: "",
  });
  const [signupStatus, setSignupStatus] = useState<{ message: string; type: "success" | "error" | "" }>({
    message: "",
    type: "",
  });
  const [signupFieldErrors, setSignupFieldErrors] = useState<Record<string, string>>({});

  const totalSignupSteps = 3;

  const fieldToStep: Record<string, number> = {
    firstName: 0,
    lastName: 0,
    email: 0,
    phone: 1,
    department: 1,
    purpose: 1,
    password: 2,
    confirmPassword: 2,
  };

  const normalizeFieldName = (field: string) =>
    field
      .replace(/_([a-z])/g, (_, char) => char.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, "");

  const setFieldError = (field: string, message: string) => {
    setSignupFieldErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field: string) => {
    setSignupFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearAllFieldErrors = () => setSignupFieldErrors({});

  const validateSignupStep = (step: number) => {
    const stepErrors: Record<string, string> = {};

    if (step === 0) {
      if (!signupData.firstName.trim()) stepErrors.firstName = "First name is required.";
      if (!signupData.lastName.trim()) stepErrors.lastName = "Last name is required.";
      if (!signupData.email.trim()) {
        stepErrors.email = "Email is required.";
      } else if (!/^\S+@\S+\.\S+$/.test(signupData.email.trim())) {
        stepErrors.email = "Please enter a valid email address.";
      }
    }

    if (step === 1) {
      if (!signupData.phone.trim()) {
        stepErrors.phone = "Phone number is required.";
      } else if (!/^\d{10}$/.test(signupData.phone.trim())) {
        stepErrors.phone = "Phone number must be exactly 10 digits.";
      }
      if (!signupData.department.trim()) stepErrors.department = "Department is required.";
      if (!signupData.purpose.trim()) stepErrors.purpose = "Purpose is required.";
    }

    if (step === 2) {
      if (!signupData.password) {
        stepErrors.password = "Password is required.";
      } else if (signupData.password.length < 8) {
        stepErrors.password = "Password must be at least 8 characters.";
      } else if (!signupData.password.match(/\d/) || !signupData.password.match(/[a-zA-Z]/)) {
        stepErrors.password = "Password must contain at least one letter and one number.";
      }
      if (!signupData.confirmPassword) {
        stepErrors.confirmPassword = "Please confirm your password.";
      } else if (signupData.password !== signupData.confirmPassword) {
        stepErrors.confirmPassword = "Passwords do not match.";
      }
    }

    if (Object.keys(stepErrors).length > 0) {
      setSignupStatus({ type: "error", message: "Please correct the highlighted fields before continuing." });
      setSignupFieldErrors((prev) => ({ ...prev, ...stepErrors }));
      return false;
    }

    return true;
  };

  const handleSignupNext = () => {
    if (!validateSignupStep(signupStep)) return;
    setSignupStatus({ message: "", type: "" });
    setSignupStep((prev) => Math.min(prev + 1, totalSignupSteps - 1));
  };

  const handleSignupBack = () => {
    setSignupStatus({ message: "", type: "" });
    setSignupStep((prev) => Math.max(prev - 1, 0));
  };

  const generateUsername = (data: typeof signupData) => {
    const sanitize = (value: string) => value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15);
    const emailPrefix = data.email ? sanitize(data.email.split("@")[0]) : "";
    const nameBase = sanitize(`${data.firstName}${data.lastName}`) || sanitize(data.firstName) || "";

    let base = emailPrefix || nameBase || "user";
    if (base.length < 3) {
      base = `user${Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(0, 3)}`;
    }

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
        first_name: signupData.firstName.trim(),
        last_name: signupData.lastName.trim(),
        email: signupData.email.trim(),
        username: generateUsername(signupData),
        password: signupData.password,
        phone: signupData.phone.trim(),
        department: signupData.department.trim(),
        purpose: signupData.purpose.trim(),
      };

      const response = await authService.registerUser(registrationData);

      setSignupData({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        department: "",
        purpose: "",
        password: "",
        confirmPassword: "",
      });

      setSignupStatus({
        type: "success",
        message: response.message || "Account created successfully! Please check your email for next steps.",
      });

      if (onSignUp) onSignUp(response);

      setTimeout(() => {
        navigate("/signin");
      }, 1800);
    } catch (error: any) {
      let message = "Registration failed. Please try again.";
      const status = error?.response?.status;
      const responseData = error?.response?.data;

      if (status === 422 && responseData?.validationErrors) {
        const fieldErrors: Record<string, string> = {};
        let firstErrorStep = signupStep;

        responseData.validationErrors.forEach((validationError: any) => {
          if (validationError.field && validationError.message) {
            const normalizedField = normalizeFieldName(validationError.field);
            if (!(normalizedField in fieldToStep)) return;

            fieldErrors[normalizedField] = validationError.message;
            if (fieldToStep[normalizedField] < firstErrorStep) {
              firstErrorStep = fieldToStep[normalizedField];
            }
          }
        });

        if (Object.keys(fieldErrors).length > 0) {
          setSignupFieldErrors((prev) => ({ ...prev, ...fieldErrors }));
          message = responseData.validationErrors[0]?.message || "Please correct the highlighted fields.";
          setSignupStep(firstErrorStep);
        }
      } else if (status === 409) {
        message = responseData?.message || responseData?.error || "Account already exists. Try signing in instead.";
        setFieldError("email", message);
        setSignupStep(0);
      } else if (responseData?.message) {
        message = responseData.message;
      } else if (error?.message) {
        message = error.message;
      }

      setSignupStatus({ type: "error", message });
    } finally {
      setIsFormLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-200 ${
      signupFieldErrors[field] ? "border-red-400 bg-red-50" : "border-slate-200"
    }`;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your workspace in three quick steps"
      sideHeading="Build a system that actually supports your goals"
      sideDescription="Use one clean interface for personal planning, execution, and long-term progress tracking."
      quote="The best way to predict the future is to invent it."
      quoteAuthor="Alan Kay"
    >
      <div className="mb-6 flex items-center justify-center gap-2">
        {[0, 1, 2].map((step) => (
          <div
            key={step}
            className={`h-2.5 rounded-full transition-all ${
              signupStep === step ? "w-10 bg-emerald-600" : signupStep > step ? "w-2.5 bg-emerald-400" : "w-2.5 bg-slate-200"
            }`}
          />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (signupStep === totalSignupSteps - 1) {
            handleSignUp(e);
          } else {
            handleSignupNext();
          }
        }}
      >
        {signupStep === 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">First Name</label>
              <input
                type="text"
                value={signupData.firstName}
                onChange={(e) => {
                  setSignupData({ ...signupData, firstName: e.target.value });
                  clearFieldError("firstName");
                }}
                className={inputClass("firstName")}
                placeholder="First name"
              />
              {signupFieldErrors.firstName && <p className="mt-1 text-xs text-red-500">{signupFieldErrors.firstName}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Last Name</label>
              <input
                type="text"
                value={signupData.lastName}
                onChange={(e) => {
                  setSignupData({ ...signupData, lastName: e.target.value });
                  clearFieldError("lastName");
                }}
                className={inputClass("lastName")}
                placeholder="Last name"
              />
              {signupFieldErrors.lastName && <p className="mt-1 text-xs text-red-500">{signupFieldErrors.lastName}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Email</label>
              <input
                type="email"
                value={signupData.email}
                onChange={(e) => {
                  setSignupData({ ...signupData, email: e.target.value });
                  clearFieldError("email");
                }}
                className={inputClass("email")}
                placeholder="you@example.com"
              />
              {signupFieldErrors.email && <p className="mt-1 text-xs text-red-500">{signupFieldErrors.email}</p>}
            </div>
          </div>
        )}

        {signupStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Phone</label>
                <input
                  type="tel"
                  value={signupData.phone}
                  onChange={(e) => {
                    setSignupData({ ...signupData, phone: e.target.value });
                    clearFieldError("phone");
                  }}
                  className={inputClass("phone")}
                  placeholder="10-digit phone"
                />
                {signupFieldErrors.phone && <p className="mt-1 text-xs text-red-500">{signupFieldErrors.phone}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Department</label>
                <input
                  type="text"
                  value={signupData.department}
                  onChange={(e) => {
                    setSignupData({ ...signupData, department: e.target.value });
                    clearFieldError("department");
                  }}
                  className={inputClass("department")}
                  placeholder="Department"
                />
                {signupFieldErrors.department && <p className="mt-1 text-xs text-red-500">{signupFieldErrors.department}</p>}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Purpose</label>
              <textarea
                value={signupData.purpose}
                onChange={(e) => {
                  setSignupData({ ...signupData, purpose: e.target.value });
                  clearFieldError("purpose");
                }}
                rows={3}
                className={`${inputClass("purpose")} resize-none`}
                placeholder="What are you planning to manage here?"
              />
              {signupFieldErrors.purpose && <p className="mt-1 text-xs text-red-500">{signupFieldErrors.purpose}</p>}
            </div>
          </div>
        )}

        {signupStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Password</label>
              <input
                type="password"
                value={signupData.password}
                onChange={(e) => {
                  setSignupData({ ...signupData, password: e.target.value });
                  clearFieldError("password");
                }}
                className={inputClass("password")}
                placeholder="Create password"
                autoComplete="new-password"
              />
              {signupFieldErrors.password && <p className="mt-1 text-xs text-red-500">{signupFieldErrors.password}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Confirm Password</label>
              <input
                type="password"
                value={signupData.confirmPassword}
                onChange={(e) => {
                  setSignupData({ ...signupData, confirmPassword: e.target.value });
                  clearFieldError("confirmPassword");
                }}
                className={inputClass("confirmPassword")}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
              {signupFieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{signupFieldErrors.confirmPassword}</p>
              )}
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700">
              Password must be at least 8 characters and include letters and numbers.
            </div>
          </div>
        )}

        {signupStatus.message && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              signupStatus.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {signupStatus.message}
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3">
          {signupStep < totalSignupSteps - 1 ? (
            <button
              type="button"
              onClick={handleSignupNext}
              disabled={isFormLoading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={isFormLoading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFormLoading ? "Creating account..." : "Complete Registration"}
            </button>
          )}

          {signupStep > 0 && (
            <button
              type="button"
              onClick={handleSignupBack}
              disabled={isFormLoading}
              className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Back
            </button>
          )}
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => navigate("/signin")}
          className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          Sign in
        </button>
      </p>
    </AuthShell>
  );
}
