import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { EyeIcon, EyeCloseIcon } from "../../icons";
import Button from "../ui/button/Button";
import api from "../../services/axiosInstance";

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ password: "", confirm: "", form: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setErrors((prev) => ({
        ...prev,
        form: "Invalid or missing token. Please check your email link.",
      }));
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ password: "", confirm: "", form: "" });
    setMessage("");

    if (password.length < 8) {
      setErrors((prev) => ({ ...prev, password: "Password must be at least 8 characters." }));
      return;
    }

    if (password !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirm: "Passwords do not match." }));
      return;
    }

    setIsLoading(true);
    try {
      await api.post(`${baseUrl}/auth/set-password?token=${token}`, {
        password,
      });

      setMessage("Password set successfully! Redirecting to login...");
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        form: err.response?.data?.message || "Something went wrong.",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0faf7] to-[#e6f4ee] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-2xl max-w-md w-full shadow-xl border border-[#d2e6df]"
      >
        <div className="flex flex-col items-center mb-6">
          <motion.img
            src="/images/logo/logo.svg"
            alt="Personal Portal Logo"
            className="w-40 mb-3 drop-shadow"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />
          <h2 className="text-xl font-semibold text-[#334E41]">Set Your Password</h2>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-6"
        >
          {/* Password */}
          <PasswordField
            label="New Password"
            value={password}
            onChange={setPassword}
            show={showPassword}
            toggleShow={() => setShowPassword((s) => !s)}
            error={errors.password}
          />

          {/* Confirm Password */}
          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showPassword}
            toggleShow={() => setShowPassword((s) => !s)}
            error={errors.confirm}
          />

          {/* Feedback */}
          {errors.form && (
            <p className="text-sm text-error-500 text-center">{errors.form}</p>
          )}
          {message && (
            <p className="text-sm text-green-600 text-center">{message}</p>
          )}

          {/* Button */}
          <div className="px-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="portalv"
                className="w-full"
                size="md"
                disabled={isLoading || !token}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0..."
                      />
                    </svg>
                    Setting...
                  </div>
                ) : (
                  "Set Password"
                )}
              </Button>
            </motion.div>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  toggleShow,
  error,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  show: boolean;
  toggleShow: () => void;
  error: string;
}) {
  return (
    <div className="w-full px-2">
      <div
        className={`relative flex items-center h-14 px-4 rounded-xl transition-all duration-300 
          ${
            error
              ? "bg-red-50 border border-error-500"
              : "bg-gray-100 border border-transparent hover:border-[#334E41]"
          }`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 30 30"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7.8125 8.75C7.8125 4.78045 11.0304 1.5625 15 1.5625C18.9695 1.5625 22.1875 4.78045 22.1875 8.75V10.1422..."
            fill="#334E41"
          />
        </svg>
        <input
          type={show ? "text" : "password"}
          placeholder={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 ml-3 bg-transparent outline-none text-gray-900 placeholder-gray-500 text-sm h-full"
        />
        <span
          onClick={toggleShow}
          className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
        >
          {show ? (
            <EyeIcon className="fill-gray-500 size-5" />
          ) : (
            <EyeCloseIcon className="fill-gray-500 size-5" />
          )}
        </span>
      </div>
      {error && <p className="mt-1 text-sm text-error-500">{error}</p>}
    </div>
  );
}
