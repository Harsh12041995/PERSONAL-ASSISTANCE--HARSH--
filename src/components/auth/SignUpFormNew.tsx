// src/components/auth/SignUpFormNew.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { authService } from "../../services/authService";

// Local assets
const SORIGIN_LOGO = "/images/logo/auth-logo.png";
const RENEWABLE_ENERGY_BG = "/images/login/loginbg.png";
const WIND_PATTERN = "/images/login/image 45.png";

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
  const [signupStatus, setSignupStatus] = useState<{
    message: string;
    type: "success" | "error" | "";
  }>({ message: "", type: "" });
  const [signupFieldErrors, setSignupFieldErrors] = useState<Record<string, string>>({});

  const signupSteps = [
    { number: 1, label: "Step 1", title: "Basic Information" },
    { number: 2, label: "Step 2", title: "Role & Details" },
    { number: 3, label: "Step 3", title: "Security" },
  ];

  const totalSignupSteps = signupSteps.length;

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

  const clearAllFieldErrors = () => {
    setSignupFieldErrors({});
  };

  const validateSignupStep = (step: number) => {
    const stepErrors: Record<string, string> = {};

    switch (step) {
      case 0: {
        if (!signupData.firstName.trim()) {
          stepErrors.firstName = "First name is required.";
        }
        if (!signupData.lastName.trim()) {
          stepErrors.lastName = "Last name is required.";
        }
        if (!signupData.email.trim()) {
          stepErrors.email = "Email is required.";
        } else if (!/^\S+@\S+\.\S+$/.test(signupData.email.trim())) {
          stepErrors.email = "Please enter a valid email address.";
        }
        break;
      }
      case 1: {
        if (!signupData.phone.trim()) {
          stepErrors.phone = "Phone number is required.";
        } else if (!/^\d{10}$/.test(signupData.phone.trim())) {
          stepErrors.phone = "Phone number must be exactly 10 digits.";
        }
        if (!signupData.department.trim()) {
          stepErrors.department = "Department is required.";
        }
        if (!signupData.purpose.trim()) {
          stepErrors.purpose = "Purpose is required.";
        }
        break;
      }
      case 2: {
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
        break;
      }
    }

    if (Object.keys(stepErrors).length > 0) {
      setSignupStatus({
        type: "error",
        message: "Please correct the highlighted fields before continuing.",
      });
      setSignupFieldErrors((prev) => ({ ...prev, ...stepErrors }));
      return false;
    }

    // Clear errors for this step
    setSignupFieldErrors((prev) => {
      const next = { ...prev };
      switch (step) {
        case 0:
          delete next.firstName;
          delete next.lastName;
          delete next.email;
          break;
        case 1:
          delete next.phone;
          delete next.department;
          delete next.purpose;
          break;
        case 2:
          delete next.password;
          delete next.confirmPassword;
          break;
      }
      return next;
    });

    return true;
  };

  const handleSignupNext = () => {
    if (!validateSignupStep(signupStep)) return;
    clearAllFieldErrors();
    setSignupStatus({ message: "", type: "" });
    setSignupStep((prev) => Math.min(prev + 1, totalSignupSteps - 1));
  };

  const handleSignupBack = () => {
    setSignupStatus({ message: "", type: "" });
    clearAllFieldErrors();
    setSignupStep((prev) => Math.max(prev - 1, 0));
  };

  const generateUsername = (data: typeof signupData) => {
    const sanitize = (value: string) =>
      value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15);

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

    if (!validateSignupStep(0) || !validateSignupStep(1) || !validateSignupStep(2)) {
      return;
    }

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

      // Reset form
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
      clearAllFieldErrors();

      setSignupStatus({
        type: "success",
        message: response.message || "Account created successfully! Please check your email for next steps.",
      });

      if (onSignUp) {
        onSignUp(response);
      }

      // Navigate to sign in after success
      setTimeout(() => {
        navigate("/signin");
      }, 2000);
    } catch (error: any) {
      console.error("Registration error:", error);

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

            if (typeof fieldToStep[normalizedField] === "number" && fieldToStep[normalizedField] < firstErrorStep) {
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
        setSignupStep(fieldToStep.email ?? 0);
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

  return (
    <div className="min-h-screen flex bg-white relative overflow-x-hidden">
      {/* Left Panel - Gradient with Renewable Energy Imagery */}
      <div 
        className="hidden lg:flex lg:w-[50%] relative"
        style={{
          background: "linear-gradient(152deg, rgba(34, 164, 197, 1) 12%, rgba(16, 185, 129, 1) 91%)"
        }}
      >
        {/* Swirly Wind Pattern Background Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img 
            src={WIND_PATTERN}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content - Text on top */}
        <div className="relative z-20 flex flex-col justify-start p-10 pt-12">
          <motion.h1 
            className="text-white font-medium text-3xl lg:text-[42px] leading-tight lg:leading-[52px] max-w-[500px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ fontFamily: "'Plus Jakarta Sans', 'Helvetica Neue', sans-serif" }}
          >
            Your gateway to renewable energy
          </motion.h1>
          
          <motion.p 
            className="text-white text-lg lg:text-[22px] leading-relaxed lg:leading-[32px] mt-3 max-w-[500px] opacity-90"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontFamily: "'Plus Jakarta Sans', 'Helvetica Neue', sans-serif" }}
          >
            Investments and sustainable portfolio management.
          </motion.p>
        </div>
      </div>

      {/* Renewable Energy Illustration - positioned absolutely to overlap both panels */}
      <motion.div 
        className="absolute left-0 pointer-events-none hidden lg:block"
        style={{ 
          bottom: 0,
          height: '62vh',
          width: '65vw',
          zIndex: 15
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <img 
          src={RENEWABLE_ENERGY_BG}
          alt="Renewable Energy"
          className="w-full h-auto max-w-none"
          style={{ 
            position: 'absolute',
            bottom: 0,
            left: 0
          }}
        />
      </motion.div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 lg:px-12 py-6 relative">
        {/* White background layer */}
        <div className="absolute inset-0 bg-white" style={{ zIndex: 10 }} />
        
        <motion.div 
          className="w-full max-w-[520px] relative"
          style={{ zIndex: 50 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <div className="mb-4 flex justify-center">
            <img 
              src={SORIGIN_LOGO}
              alt="Sorigin"
              className="h-[45px] object-contain"
            />
          </div>

          {/* Sign Up Header */}
          <div className="mb-4">
            <h2 
              className="text-[24px] font-medium text-black mb-2"
              style={{ fontFamily: "'Plus Jakarta Sans', 'Helvetica Neue', sans-serif" }}
            >
              Sign up
            </h2>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-6">
            {signupSteps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all ${
                      index < signupStep 
                        ? "bg-[#22A4C5] border-[#22A4C5] text-white" 
                        : index === signupStep 
                        ? "border-[#22A4C5] text-[#22A4C5] bg-white" 
                        : "border-gray-300 text-gray-400 bg-white"
                    }`}
                  >
                    {index < signupStep ? (
                      <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                        <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  <div className="ml-2">
                    <p className={`text-[11px] font-medium ${index === signupStep ? "text-black" : "text-gray-400"}`}>
                      {step.label}
                    </p>
                    <p className={`text-[12px] ${index === signupStep ? "text-black" : "text-gray-400"}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < signupSteps.length - 1 && (
                  <div className={`w-12 h-[2px] mx-3 ${index < signupStep ? "bg-[#22A4C5]" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Signup Form */}
          <form onSubmit={(e) => {
            e.preventDefault();
            if (signupStep === totalSignupSteps - 1) {
              handleSignUp(e);
            } else {
              handleSignupNext();
            }
          }}>
            {/* Step 1: Basic Information */}
            {signupStep === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-black mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={signupData.firstName}
                      onChange={(e) => {
                        setSignupData({ ...signupData, firstName: e.target.value });
                        clearFieldError("firstName");
                      }}
                      className={`w-full px-3 py-2.5 border-b ${signupFieldErrors.firstName ? "border-red-500" : "border-gray-300"} bg-transparent text-black text-[14px] focus:outline-none focus:border-[#22A4C5] transition-colors`}
                      placeholder="Enter first name"
                    />
                    {signupFieldErrors.firstName && (
                      <p className="mt-1 text-xs text-red-500">{signupFieldErrors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-black mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={signupData.lastName}
                      onChange={(e) => {
                        setSignupData({ ...signupData, lastName: e.target.value });
                        clearFieldError("lastName");
                      }}
                      className={`w-full px-3 py-2.5 border-b ${signupFieldErrors.lastName ? "border-red-500" : "border-gray-300"} bg-transparent text-black text-[14px] focus:outline-none focus:border-[#22A4C5] transition-colors`}
                      placeholder="Enter last name"
                    />
                    {signupFieldErrors.lastName && (
                      <p className="mt-1 text-xs text-red-500">{signupFieldErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-black mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={signupData.email}
                    onChange={(e) => {
                      setSignupData({ ...signupData, email: e.target.value });
                      clearFieldError("email");
                    }}
                    className={`w-full px-3 py-2.5 border-b ${signupFieldErrors.email ? "border-red-500" : "border-gray-300"} bg-transparent text-black text-[14px] focus:outline-none focus:border-[#22A4C5] transition-colors`}
                    placeholder="Enter work email address"
                  />
                  {signupFieldErrors.email && (
                    <p className="mt-1 text-xs text-red-500">{signupFieldErrors.email}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Role & Details */}
            {signupStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-black mb-1">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      value={signupData.phone}
                      onChange={(e) => {
                        setSignupData({ ...signupData, phone: e.target.value });
                        clearFieldError("phone");
                      }}
                      className={`w-full px-3 py-2.5 border-b ${signupFieldErrors.phone ? "border-red-500" : "border-gray-300"} bg-transparent text-black text-[14px] focus:outline-none focus:border-[#22A4C5] transition-colors`}
                      placeholder="Enter phone number"
                    />
                    {signupFieldErrors.phone && (
                      <p className="mt-1 text-xs text-red-500">{signupFieldErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-black mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={signupData.department}
                      onChange={(e) => {
                        setSignupData({ ...signupData, department: e.target.value });
                        clearFieldError("department");
                      }}
                      className={`w-full px-3 py-2.5 border-b ${signupFieldErrors.department ? "border-red-500" : "border-gray-300"} bg-transparent text-black text-[14px] focus:outline-none focus:border-[#22A4C5] transition-colors`}
                      placeholder="Your department"
                    />
                    {signupFieldErrors.department && (
                      <p className="mt-1 text-xs text-red-500">{signupFieldErrors.department}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-black mb-1">
                    Purpose
                  </label>
                  <textarea
                    value={signupData.purpose}
                    onChange={(e) => {
                      setSignupData({ ...signupData, purpose: e.target.value });
                      clearFieldError("purpose");
                    }}
                    rows={2}
                    className={`w-full px-3 py-2.5 border-b ${signupFieldErrors.purpose ? "border-red-500" : "border-gray-300"} bg-transparent text-black text-[14px] focus:outline-none focus:border-[#22A4C5] transition-colors resize-none`}
                    placeholder="Write something..."
                  />
                  {signupFieldErrors.purpose && (
                    <p className="mt-1 text-xs text-red-500">{signupFieldErrors.purpose}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Security */}
            {signupStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-black mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={signupData.password}
                    onChange={(e) => {
                      setSignupData({ ...signupData, password: e.target.value });
                      clearFieldError("password");
                    }}
                    className={`w-full px-3 py-2.5 border-b ${signupFieldErrors.password ? "border-red-500" : "border-gray-300"} bg-transparent text-black text-[14px] focus:outline-none focus:border-[#22A4C5] transition-colors`}
                    placeholder="Create password"
                    autoComplete="new-password"
                  />
                  {signupFieldErrors.password && (
                    <p className="mt-1 text-xs text-red-500">{signupFieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-black mb-1">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={signupData.confirmPassword}
                    onChange={(e) => {
                      setSignupData({ ...signupData, confirmPassword: e.target.value });
                      clearFieldError("confirmPassword");
                    }}
                    className={`w-full px-3 py-2.5 border-b ${signupFieldErrors.confirmPassword ? "border-red-500" : "border-gray-300"} bg-transparent text-black text-[14px] focus:outline-none focus:border-[#22A4C5] transition-colors`}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                  />
                  {signupFieldErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">{signupFieldErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Password Requirements */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-[13px] font-medium text-black mb-2">Password requirements:</p>
                  <ul className="text-[12px] text-gray-600 space-y-1">
                    <li className="flex items-center">
                      <span className="mr-2">•</span>
                      At least 8 characters
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">•</span>
                      Include letters and numbers
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">•</span>
                      Use special characters for stronger security (optional)
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Status Messages */}
            {signupStatus.message && (
              <div className={`mt-4 p-3 rounded-lg text-sm flex items-center ${
                signupStatus.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                <svg 
                  className="w-4 h-4 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {signupStatus.type === "success" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                {signupStatus.message}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6 gap-4">
              <button
                type="button"
                onClick={handleSignupBack}
                disabled={signupStep === 0 || isFormLoading}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-[14px] font-medium transition-all flex items-center justify-center ${
                  signupStep === 0 || isFormLoading
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                }`}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              {signupStep < totalSignupSteps - 1 ? (
                <button
                  type="button"
                  onClick={handleSignupNext}
                  disabled={isFormLoading}
                  className="flex-1 py-2.5 px-4 rounded-lg text-[14px] font-medium text-white transition-all cursor-pointer"
                  style={{ background: "linear-gradient(90deg, #22A4C5 0%, #10B981 100%)" }}
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isFormLoading}
                  className="flex-1 py-2.5 px-4 rounded-lg text-[14px] font-medium text-white transition-all cursor-pointer flex items-center justify-center"
                  style={{ background: "linear-gradient(90deg, #22A4C5 0%, #10B981 100%)" }}
                >
                  {isFormLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    "Create account"
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Already have an account */}
          <p className="text-center text-[13px] text-gray-500 mt-5">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/signin")}
              className="text-[#22A4C5] font-medium hover:underline cursor-pointer"
            >
              Sign in
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

