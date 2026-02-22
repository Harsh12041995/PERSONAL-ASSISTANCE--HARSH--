import React, { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

/**
 * ScrollToTopButton Component
 *
 * A floating button that appears when the user scrolls down
 * and allows them to quickly scroll back to the top of the page.
 *
 * Features:
 * - Appears after scrolling down 300px
 * - Smooth scroll animation to top
 * - Responsive design with hover effects
 * - Accessible with proper ARIA labels
 * - Modern design with Tailwind CSS
 */
const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled up to given distance
  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Set the scroll event listener
  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);

    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  // Scroll to top handler
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 group"
      aria-label="Scroll to top of page"
      title="Scroll to top"
    >
      {/* Main button with gradient background */}
      <div className="relative">
        {/* Background with gradient */}
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:from-green-600 group-hover:to-green-700">
          {/* Icon container */}
          <div className="flex items-center justify-center w-full h-full">
            <ChevronUp
              className="w-6 h-6 text-white transition-transform duration-300 group-hover:-translate-y-0.5"
              strokeWidth={2.5}
            />
          </div>
        </div>

        {/* Hover effect ring */}
        <div className="absolute inset-0 w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 scale-110 group-hover:scale-125"></div>

        {/* Pulse animation for attention */}
        <div className="absolute inset-0 w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-full animate-ping opacity-20"></div>
      </div>

      {/* Tooltip */}
      <div className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
        Scroll to top
        {/* Arrow pointing to button */}
        <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-800 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
      </div>
    </button>
  );
};

export default ScrollToTopButton;
