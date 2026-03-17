import { Link } from "react-router-dom";

import { motion } from "framer-motion";
import PageMeta from "../../shared/PageMeta";
import GridShape from "../../shared/GridShape";

export default function NotFound() {
  return (
    <>
      <PageMeta
        title="PERSONAL PORTAL | 404 Page Not Found"
        description="PERSONAL PORTAL - Clean 404 error page for your admin dashboard"
      />
      <div className="relative flex flex-col h-[100dvh] overflow-hidden bg-white dark:bg-gray-900 z-10 px-4">
        <GridShape />

        {/* Main content */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-[440px] w-full mx-auto text-center">
          {/* Title */}
          <motion.h4
            className="text-[22px] font-semibold text-[#334E41] dark:text-white mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Oops! Page not found
          </motion.h4>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <img
              src="/images/error/404.svg"
              alt="404 Not Found"
              className="w-[400px] max-w-full mx-auto dark:hidden"
            />
          </motion.div>

          {/* Description */}
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            We couldn’t find the page you were looking for.
          </p>

          {/* Button */}
          <motion.div
            className="mt-4"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              to="/"
              className="inline-block px-6 py-2 rounded-md bg-[#339274] text-white font-medium text-sm shadow hover:bg-[#2e7b64] transition"
            >
              ←  Back to Home
            </Link>
          </motion.div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 pb-2">
          &copy; {new Date().getFullYear()} — PERSONAL PORTAL
        </p>
      </div>
    </>
  );
}
