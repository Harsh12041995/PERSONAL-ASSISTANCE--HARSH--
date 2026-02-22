import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Button from "../ui/button/Button";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setSuccess("Password reset link sent to your email.");
        setEmail("");

        setTimeout(() => {
          setSuccess("");
          onClose(); // Auto close modal
        }, 3500); // 2.5 seconds
      } else {
        setError(data.message || "❌ Failed to send reset link.");
      }
    } catch {
      setSuccess("Password reset link sent to your email.");
      setEmail("");

      setTimeout(() => {
        setSuccess("");
        onClose(); // Auto close modal
      }, 2500); // 2.5 seconds

      // setError("⚠️ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative"
            initial={{ y: 30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center mb-4">
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {/* <svg
                    width="50"
                    height="50"
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
                  </svg> */}
              </motion.div>
              <h2 className="text-2xl font-semibold text-gray-800 text-center">
                Forgot your password?
              </h2>
              <p className="text-sm text-gray-500 mt-1 text-center">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
  {!success && (
    <>
      <div
        className={`relative flex items-center h-14 px-4 rounded-xl transition-all duration-300 w-full
          ${
            error
              ? "bg-red-50 border border-error-500"
              : "bg-gray-100 border border-transparent hover:border-[#334E41]"
          }`}
      >
        <svg
                    width="30"
                    height="30"
                    viewBox="0 0 30 30"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.95289 9.71255C4.7179 10.6695 4.54627 11.9052 4.30751 13.6244C3.76229 17.5499 3.48969 19.5126 4.08909 21.0371C4.61531 22.3754 5.58692 23.4913 6.8401 24.1966C8.26756 25 10.2492 25 14.2124 25H16.2426C20.2059 25 22.1875 25 23.615 24.1966C24.8681 23.4913 25.8397 22.3754 26.366 21.0371C26.9654 19.5126 26.6927 17.5499 26.1476 13.6244C25.8882 11.7573 25.7081 10.4604 25.44 9.47159L24.527 10.3846C22.4866 12.425 20.8877 14.024 19.4724 15.1039C18.0237 16.2091 16.6579 16.8585 15.076 16.8585C13.4941 16.8585 12.1283 16.2091 10.6796 15.1039C9.26427 14.024 7.66531 12.425 5.62497 10.3846L4.95289 9.71255Z"
                      fill="#334E41"
                    />
                    <path
                      d="M5.71875 7.82637L6.90045 9.00807C9.00253 11.1101 10.5138 12.6186 11.8173 13.6131C13.0993 14.5912 14.0694 14.9835 15.0764 14.9835C16.0834 14.9835 17.0535 14.5912 18.3354 13.6131C19.639 12.6186 21.1503 11.1101 23.2523 9.00807L24.6144 7.64595C23.9795 6.7463 23.1169 6.02886 22.1128 5.56854C20.8725 5 19.3294 5 16.243 5H14.2127C11.1265 5 9.58333 5 8.34313 5.56854C7.27274 6.05924 6.3632 6.84209 5.71875 7.82637Z"
                      fill="#334E41"
                    />
                  </svg>
        <input
          type="email"
          placeholder="info@sorigin.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm h-full ml-4"
        />
      </div>

      {error && <p className="text-sm text-error-500 mt-1">{error}</p>}

      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          type="submit"
          variant="soriginv"
          className="w-full h-14"
          size="md"
        >
          {loading ? "Sending..." : "Send Link"}
        </Button>
      </motion.div>
    </>
  )}

  {success && (
    <motion.div
      className="flex flex-col items-center justify-center mt-2"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <motion.div
        className="rounded-full bg-green-100 p-3"
        initial={{ rotate: -15, scale: 0.5 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <svg
          className="text-green-600"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M9 12l2 2l4 -4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </motion.div>
      <p className="text-sm text-green-700 font-medium mt-2 text-center">
        {success}
      </p>
    </motion.div>
  )}
</form>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
