import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Button from "../ui/button/Button";
import api from "../../services/axiosInstance";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ password: "", confirm: "", form: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
const base_url = import.meta.env.VITE_API_BASE_URL;


  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODUzZWEwODIzZDRkM2FjYmE1NWNiNWUiLCJpYXQiOjE3NTAzMzMzODEsImV4cCI6MTc1MjkyNTM4MSwidHlwZSI6InJlZnJlc2gifQ.iO4-H75ErytHBTtOSMMBpBvKMiACwxv8sV6rafadpI4";
//   const apiUrl = `${{base_url}}/v1/auth/reset-password`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ password: "", confirm: "", form: "" });
    setMessage("");

    if (newPassword.length < 8) {
      setErrors((prev) => ({ ...prev, password: "Minimum 8 characters required." }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirm: "Passwords do not match." }));
      return;
    }

    setIsLoading(true);
    try {
        
  const pathObject = { pathname: "/auth/reset-password" };
const fullUrl = `${base_url}${pathObject.pathname}?token=${token}`;

      await api.post(`${fullUrl}`, {
        password: newPassword,
      });
      setMessage("✅ Password successfully reset! Redirecting...");
      setTimeout(() => navigate("/login"), 2000);
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
          <h2 className="text-xl font-semibold text-[#334E41]">
            Reset Your Password
          </h2>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-6"
        >
          {/* New Password Field */}
          <div className="w-full px-2">
            <div
              className={`relative flex items-center h-14 px-4 rounded-xl transition-all duration-300 
                ${
                  errors.password
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
                      d="M7.8125 8.75C7.8125 4.78045 11.0304 1.5625 15 1.5625C18.9695 1.5625 22.1875 4.78045 22.1875 8.75V10.1422C22.1875 10.2257 22.1766 10.3066 22.1561 10.3837C23.9512 11.0433 25.3504 12.4915 25.9441 14.3186C26.25 15.2601 26.25 16.4234 26.25 18.75C26.25 21.0766 26.25 22.2399 25.9441 23.1814C25.3259 25.0841 23.8341 26.5759 21.9314 27.1941C20.9899 27.5 19.8266 27.5 17.5 27.5H12.5C10.1734 27.5 9.0101 27.5 8.06865 27.1941C6.16591 26.5759 4.67414 25.0841 4.0559 23.1814C3.75 22.2399 3.75 21.0766 3.75 18.75C3.75 16.4234 3.75 15.2601 4.0559 14.3186C4.64957 12.4915 6.04879 11.0433 7.8439 10.3837C7.82341 10.3066 7.8125 10.2257 7.8125 10.1422V8.75ZM9.6875 10.0427C10.3997 10 11.2934 10 12.5 10H17.5C18.7066 10 19.6004 10 20.3125 10.0427V8.75C20.3125 5.81599 17.934 3.4375 15 3.4375C12.066 3.4375 9.6875 5.81599 9.6875 8.75V10.0427ZM15 15.3125C15.5177 15.3125 15.9375 15.7323 15.9375 16.25V21.25C15.9375 21.7678 15.5177 22.1875 15 22.1875C14.4823 22.1875 14.0625 21.7678 14.0625 21.25V16.25C14.0625 15.7323 14.4823 15.3125 15 15.3125Z"
                      fill="#334E41"
                    />
                  </svg>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 ml-3 bg-transparent outline-none text-gray-900 placeholder-gray-500 text-sm h-full"
                disabled={isLoading}
              />
                 <span
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
      >
        {showPassword ? (
          <EyeIcon className="fill-gray-500 size-5" />
        ) : (
          <EyeCloseIcon className="fill-gray-500 size-5" />
        )}
      </span>
       </div>
          <p className="mt-1 text-sm text-gray-500">Your password must be 8 characters</p>
          </div>

          {/* Confirm Password Field */}
          <div className="w-full px-2">
            <div
              className={`relative flex items-center h-14 px-4 rounded-xl transition-all duration-300 
                ${
                  errors.confirm
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
                      d="M7.8125 8.75C7.8125 4.78045 11.0304 1.5625 15 1.5625C18.9695 1.5625 22.1875 4.78045 22.1875 8.75V10.1422C22.1875 10.2257 22.1766 10.3066 22.1561 10.3837C23.9512 11.0433 25.3504 12.4915 25.9441 14.3186C26.25 15.2601 26.25 16.4234 26.25 18.75C26.25 21.0766 26.25 22.2399 25.9441 23.1814C25.3259 25.0841 23.8341 26.5759 21.9314 27.1941C20.9899 27.5 19.8266 27.5 17.5 27.5H12.5C10.1734 27.5 9.0101 27.5 8.06865 27.1941C6.16591 26.5759 4.67414 25.0841 4.0559 23.1814C3.75 22.2399 3.75 21.0766 3.75 18.75C3.75 16.4234 3.75 15.2601 4.0559 14.3186C4.64957 12.4915 6.04879 11.0433 7.8439 10.3837C7.82341 10.3066 7.8125 10.2257 7.8125 10.1422V8.75ZM9.6875 10.0427C10.3997 10 11.2934 10 12.5 10H17.5C18.7066 10 19.6004 10 20.3125 10.0427V8.75C20.3125 5.81599 17.934 3.4375 15 3.4375C12.066 3.4375 9.6875 5.81599 9.6875 8.75V10.0427ZM15 15.3125C15.5177 15.3125 15.9375 15.7323 15.9375 16.25V21.25C15.9375 21.7678 15.5177 22.1875 15 22.1875C14.4823 22.1875 14.0625 21.7678 14.0625 21.25V16.25C14.0625 15.7323 14.4823 15.3125 15 15.3125Z"
                      fill="#334E41"
                    />
                  </svg>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex-1 ml-3 bg-transparent outline-none text-gray-900 placeholder-gray-500 text-sm h-full"
                disabled={isLoading}
              />
              <span
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
      >
        {showPassword ? (
          <EyeIcon className="fill-gray-500 size-5" />
        ) : (
          <EyeCloseIcon className="fill-gray-500 size-5" />
        )}
      </span>
            </div>
            {errors.confirm && (
              <p className="mt-1 text-sm text-error-500">{errors.confirm}</p>
            )}
          </div>

          {/* Error / Success */}
          {errors.form && (
            <p className="text-sm text-error-500 text-center">{errors.form}</p>
          )}
          {message && (
            <p className="text-sm text-green-600 text-center">{message}</p>
          )}

          {/* Submit Button */}
          <div className="px-4">
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button
        variant="portalv"
        className="w-full"
        size="md"
        disabled={isLoading}
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
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0..."
              ></path>
            </svg>
            Resetting...
          </div>
        ) : (
          "Reset Password"
        )}
      </Button>
    </motion.div>
  </div>
        </motion.form>
      </motion.div>
    </div>
  );
}
